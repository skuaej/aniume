const { client } = require('./telegram');
const Anime = require('./models/Anime');
const { Api } = require('telegram');
const mongoose = require('mongoose');
const bigInt = require('big-integer');

const streamFile = async (req, res, episode_id) => {
  try {
    // Validate episode_id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(episode_id)) {
        return res.status(400).send('Invalid Episode ID format.');
    }
    const anime = await Anime.findOne({ 'episodes._id': episode_id }, { 'episodes.$': 1 });
    if (!anime || !anime.episodes[0]) {
      return res.status(404).send('Episode not found');
    }

    const episode = anime.episodes[0];
    const { chat_id, message_id } = episode;

    if (!chat_id || !message_id) {
        return res.status(400).send('Old episodes without MTProto metadata cannot be streamed. Please re-index.');
    }

    // Fetch message to get media details
    const messages = await client.getMessages(chat_id, { ids: [parseInt(message_id)] });
    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).send('Media not found on Telegram');
    }

    const media = messages[0].media;
    const document = media.document;
    if (!document) return res.status(404).send('No document found in message');

    const totalSize = Number(document.size);
    let mimeType = document.mimeType || 'video/mp4';
    
    // MKV is often not supported, mapping to video/webm can help browsers that support WebM
    if (mimeType === 'video/x-matroska') {
        mimeType = 'video/webm';
    }

    const range = req.headers.range;
    res.setHeader('Accept-Ranges', 'bytes');

    // --- FALLBACK LOGIC ---
    // If GramJS is not connected OR the file is small, we can use the standard Bot API (20MB limit)
    const canUseGramJS = client && client.connected;
    
    if (!canUseGramJS && totalSize < 20 * 1024 * 1024) {
        console.log(`Using Bot API Fallback for small file: ${totalSize / 1024 / 1024}MB`);
        const { getFilePath } = require('./telegram');
        const filePath = await getFilePath(episode.file_id);
        if (filePath) {
            const botApiUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
            const axios = require('axios');
            const botRes = await axios.get(botApiUrl, { responseType: 'stream', headers: { range: req.headers.range } });
            res.writeHead(botRes.status, botRes.headers);
            return botRes.data.pipe(res);
        }
    }

    if (!canUseGramJS) {
        return res.status(503).send('High-capacity streaming is temporarily unavailable due to Telegram FloodWait. Please try a smaller file or wait 30 minutes.');
    }

    // --- GramJS STREAMING ---
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunksize = (end - start) + 1;

      const chunkSize = 512 * 1024; // 512KB
      const alignedOffset = start - (start % chunkSize);
      const firstPartCut = start - alignedOffset;
      
      console.log(`Streaming Range: ${start}-${end}/${totalSize} (Aligned: ${alignedOffset}) | ${episode.title}`);

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": mimeType,
      });

      // Stream chunks from GramJS
      let bytesSent = 0;
      let isFirstChunk = true;

      for await (const chunk of client.iterDownload({
        file: new Api.InputDocumentFileLocation({
            id: document.id,
            accessHash: document.accessHash,
            fileReference: document.fileReference,
            thumbSize: ""
        }),
        offset: bigInt(alignedOffset),
        requestSize: chunkSize,
      })) {
        let currentChunk = chunk;
        
        // Trim the beginning of the first chunk if necessary
        if (isFirstChunk && firstPartCut > 0) {
            currentChunk = currentChunk.slice(firstPartCut);
        }
        isFirstChunk = false;

        const bytesToTake = Math.min(currentChunk.length, chunksize - bytesSent);
        const data = currentChunk.slice(0, bytesToTake);

        if (!res.write(data)) {
            await new Promise((resolve) => res.once('drain', resolve));
        }

        bytesSent += bytesToTake;
        if (bytesSent >= chunksize) break;
      }
      res.end();
    } else {
      console.log(`Streaming Full: ${totalSize} bytes | ${episode.title}`);

      res.writeHead(200, {
        "Content-Length": totalSize,
        "Content-Type": mimeType,
      });

      for await (const chunk of client.iterDownload({
        file: new Api.InputDocumentFileLocation({
            id: document.id,
            accessHash: document.accessHash,
            fileReference: document.fileReference,
            thumbSize: ""
        }),
        requestSize: 512 * 1024,
      })) {
        if (!res.write(chunk)) {
            await new Promise((resolve) => res.once('drain', resolve));
        }
      }
      res.end();
    }
  } catch (err) {
    console.error('GramJS Streaming error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Error streaming file via MTProto');
    }
  }
};

module.exports = { streamFile };
