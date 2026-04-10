const { Telegraf } = require('telegraf');
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Anime = require('./models/Anime');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// GramJS Client for large file streaming via MTProto
const SESSION_FILE = path.join(__dirname, 'session.txt');
let sessionString = '';

if (fs.existsSync(SESSION_FILE)) {
    sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
}

const stringSession = new StringSession(sessionString);
const client = new TelegramClient(
    stringSession,
    parseInt(process.env.API_ID),
    process.env.API_HASH,
    {
        connectionRetries: 10,
        retryDelay: 2000,
        autoReconnect: true,
        floodSleepThreshold: 60,
    }
);

async function initTelegramClient() {
    try {
        console.log('Connecting GramJS client as bot...');
        await client.start({
            botAuthToken: process.env.BOT_TOKEN,
        });

        // Save session so we don't need to re-auth on every restart
        const savedSession = client.session.save();
        if (savedSession) {
            fs.writeFileSync(SESSION_FILE, savedSession);
        }

        console.log('✅ GramJS Client connected as Bot. Session saved.');
    } catch (err) {
        console.error('GramJS Init Error:', err.message);
        if (err.message && err.message.includes('FLOOD_WAIT')) {
            const waitSeconds = parseInt((err.message.match(/(\d+)/) || [0, 60])[1]);
            console.error(`⚠️ FLOOD_WAIT: Telegram blocked login. Wait ${waitSeconds}s before restarting.`);
        }
    }
}

initTelegramClient();

// Helper to get file path from Telegram Bot API (for small files < 20MB)
const getFilePath = async (file_id) => {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile`, {
        params: { file_id }
    });
    if (response.data.ok) {
      return response.data.result.file_path;
    }
    return null;
  } catch (err) {
    console.error('Error fetching file path:', err.response?.data || err.message);
    return null;
  }
};

// Auto-index forwarded media (works for PM, Groups, and Channels)
bot.on(['message', 'channel_post'], async (ctx) => {
  const message = ctx.message || ctx.channelPost;
  if (!message) return;

  const media = message.video || message.document;
  // Only process video files
  if (!media || !media.mime_type?.startsWith('video/')) return;

  const caption = message.caption || '';
  const fileName = media.file_name || '';
  let fullText = (caption + ' ' + fileName).trim();

  const file_id = media.file_id;

  // 1. Remove @mentions
  fullText = fullText.replace(/@\w+/g, '').trim();

  // 2. Extract Season/Episode numbers
  const seasonMatch = fullText.match(/S(\d+)|Season\s*(\d+)/i);
  const epMatch = fullText.match(/E(\d+)|Episode\s*(\d+)|Ep\s*(\d+)/i);

  let seasonNumber = 1;
  let epNumber = 1;

  if (seasonMatch) seasonNumber = parseInt(seasonMatch[1] || seasonMatch[2]);
  if (epMatch) epNumber = parseInt(epMatch[1] || epMatch[2] || epMatch[3]);

  // 3. Extract anime title (remove common tags)
  let animeTitle = fullText
    .split(/S\d+E\d+|S\d+|Season\s*\d+|Episode\s*\d+|Ep\s*\d+|1080p|720p|480p|HEVC|x265|WEBRip|Bluray|\.mkv|\.mp4|\.avi/i)[0]
    .replace(/[\[\]\-\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Uncategorized';

  animeTitle = animeTitle.split(/\.mkv|\.mp4/i)[0].trim();

  try {
    const slug = animeTitle.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const anime = await Anime.findOneAndUpdate(
        { title: new RegExp(`^${animeTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        {
            $setOnInsert: {
                title: animeTitle,
                slug: `${slug}-${Math.random().toString(36).substring(7)}`,
                description: `Stream the latest episodes of ${animeTitle}`,
                episodes: []
            }
        },
        { upsert: true, new: true }
    );

    const existingEp = anime.episodes.find(e => e.episode_number === epNumber);

    if (!existingEp) {
        await Anime.updateOne(
            { _id: anime._id },
            {
                $push: {
                    episodes: {
                        episode_number: epNumber,
                        title: fileName || `${animeTitle} Episode ${epNumber}`,
                        file_id: file_id,
                        message_id: message.message_id,
                        chat_id: ctx.chat.id.toString()
                    }
                },
                $set: { updated_at: new Date() }
            }
        );
        try {
            await ctx.reply(`✅ Indexed: ${animeTitle} - Episode ${epNumber}`);
        } catch (replyErr) {
            console.log('Indexed OK but could not reply:', replyErr.message);
        }
    } else {
        // Refresh metadata for existing episode
        await Anime.updateOne(
            { _id: anime._id, 'episodes.episode_number': epNumber },
            {
                $set: {
                    'episodes.$.file_id': file_id,
                    'episodes.$.message_id': message.message_id,
                    'episodes.$.chat_id': ctx.chat.id.toString(),
                    updated_at: new Date()
                }
            }
        );
        try {
            await ctx.reply(`🔄 Refreshed: ${animeTitle} - Episode ${epNumber}`);
        } catch (replyErr) {
            console.log('Refreshed OK but could not reply.');
        }
    }
  } catch (err) {
    console.error('Error indexing media:', err.message);
    try { await ctx.reply('❌ Error indexing media.'); } catch (ignore) {}
  }
});

// /total command - show stats
bot.command('total', async (ctx) => {
    try {
        const count = await Anime.countDocuments();
        const epData = await Anime.aggregate([
            { $unwind: '$episodes' },
            { $count: 'totalEpisodes' }
        ]);
        const totalEps = epData[0]?.totalEpisodes || 0;
        ctx.reply(`📊 Stats:\n- Anime: ${count}\n- Episodes: ${totalEps}`);
    } catch (err) {
        ctx.reply('❌ Error fetching stats.');
    }
});

// Launch bot
bot.launch({ dropPendingUpdates: true }).catch((err) => {
    if (err.response?.error_code === 409) {
        console.warn('⚠️ Another bot instance running. Indexing disabled on this instance.');
    } else {
        console.error('Bot launch error:', err.message);
    }
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { getFilePath, bot, client };
