const mongoose = require('mongoose');
require('dotenv').config();
const Anime = require('./models/Anime');
const Top5 = require('./models/Top5');

async function checkDB() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('--- TOP 5 ITEMS ---');
    const tops = await Top5.find();
    console.log(`Count: ${tops.length}`);
    tops.forEach(t => console.log(`- ${t.title} (${t._id})`));

    console.log('\n--- ANIME EPISODES ---');
    const animes = await Anime.find();
    animes.forEach(a => {
        console.log(`Anime: ${a.title}`);
        a.episodes.forEach(e => console.log(`  Ep ${e.episode_number}: ${e.title}`));
    });

    await mongoose.disconnect();
}

checkDB().catch(console.error);
