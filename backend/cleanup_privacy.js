/**
 * Mizofy Database Privacy Cleanup Script
 * Run this to strip technical information from existing episode titles.
 */
const mongoose = require('mongoose');
const Anime = require('./models/Anime');
const { sanitizeName } = require('./utils');
require('dotenv').config();

async function cleanup() {
    try {
        console.log('🔄 Starting Privacy Cleanup...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const animes = await Anime.find();
        let updatedCount = 0;

        for (const anime of animes) {
            let changed = false;
            for (const ep of anime.episodes) {
                const oldTitle = ep.title;
                const newTitle = sanitizeName(oldTitle);
                
                if (oldTitle !== newTitle) {
                    ep.title = newTitle;
                    changed = true;
                }
            }
            
            if (changed) {
                await anime.save();
                updatedCount++;
                console.log(`✨ Cleaned: ${anime.title}`);
            }
        }

        console.log(`\n✅ Finished! Cleaned metadata for ${updatedCount} anime series.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup failed:', err.message);
        process.exit(1);
    }
}

cleanup();
