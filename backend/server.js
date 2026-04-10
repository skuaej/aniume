const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const connectDB = require('./db');
const Anime = require('./models/Anime');
const { streamFile } = require('./stream');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

app.use(cors({
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length']
}));
app.use(express.json());
app.use(express.static('public')); // Serve frontend

// Helper to generate hash for watch links
const generateHash = (episodeId) => {
  return crypto.createHmac('sha256', process.env.STREAM_SECRET)
    .update(episodeId)
    .digest('hex');
};

// --- API ROUTES ---

// Health check - useful for debugging streaming issues
app.get('/api/health', (req, res) => {
  const { client } = require('./telegram');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    gramjs_connected: client?.connected || false,
  });
});

// Search Anime
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  try {
    const results = await Anime.find(
      q ? { title: { $regex: q, $options: 'i' } } : {}
    ).limit(20);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Server search error' });
  }
});

// Get Anime Details by Slug
app.get('/api/anime/:slug', async (req, res) => {
  try {
    const anime = await Anime.findOne({ slug: req.params.slug });
    if (!anime) return res.status(404).json({ error: 'Anime not found' });
    
    // Add temporary watch hashes to episodes
    const animeObj = anime.toObject();
    animeObj.episodes = animeObj.episodes.map(ep => ({
      ...ep,
      watch_url: `/api/watch/${ep._id}?hash=${generateHash(ep._id.toString())}`
    }));

    res.json(animeObj);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Anime by Episode ID (for Player context)
app.get('/api/anime-by-ep/:id', async (req, res) => {
    try {
      const anime = await Anime.findOne({ 'episodes._id': req.params.id });
      if (!anime) return res.status(404).json({ error: 'Anime not found' });
      
      const animeObj = anime.toObject();
      animeObj.episodes = animeObj.episodes.map(ep => ({
        ...ep,
        watch_url: `/api/watch/${ep._id}?hash=${generateHash(ep._id.toString())}`
      }));
  
      res.json(animeObj);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

// Watch Episode (Streaming)
app.get('/api/watch/:id', async (req, res) => {
  const { id } = req.params;
  const { hash } = req.query;

  // Security check: Validate hash
  const expectedHash = generateHash(id);
  if (hash !== expectedHash) {
    return res.status(403).send('Link expired or invalid');
  }

  try {
    const anime = await Anime.findOne({ 'episodes._id': id }, { 'episodes.$': 1 });
    if (!anime || !anime.episodes[0]) {
      return res.status(404).send('Episode not found');
    }

    const episode = anime.episodes[0];
    await streamFile(req, res, id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Streaming server error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
