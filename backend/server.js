const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const Anime = require('./models/Anime');
const Slider = require('./models/Slider');
const Top5 = require('./models/Top5');
const Social = require('./models/Social');
const { streamFile } = require('./stream');
require('dotenv').config();
const { sendEpisodeLog } = require('./telegram');

const app = express();
const PORT = process.env.PORT || 5000;

// Admin credentials (from env or hardcoded defaults)
const ADMIN_USER = process.env.ADMIN_USER || 'suma123';
const ADMIN_PASS = process.env.ADMIN_PASS || 'suMA@123';
const JWT_ADMIN_SECRET = process.env.JWT_SECRET || 'streaming_key_778899';

connectDB();

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(cors({ exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
const generateHash = (episodeId) =>
  crypto.createHmac('sha256', process.env.STREAM_SECRET || 'streaming_secret_v1')
    .update(episodeId)
    .digest('hex');

const addWatchUrls = (animeObj) => ({
  ...animeObj,
  episodes: animeObj.episodes.map(ep => ({
    ...ep,
    watch_url: `/api/watch/${ep._id}?hash=${generateHash(ep._id.toString())}`
  }))
});

// ------------------------------------------------------------------
// JWT ADMIN MIDDLEWARE
// ------------------------------------------------------------------
const adminAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_ADMIN_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ------------------------------------------------------------------
// PUBLIC API ROUTES
// ------------------------------------------------------------------

// Koyeb Health Check
app.get('/ping', (req, res) => res.send('pong'));

// Health check
app.get('/api/health', (req, res) => {
  const { client } = require('./telegram');
  res.json({ status: 'ok', timestamp: new Date().toISOString(), gramjs_connected: client?.connected || false });
});

// Public sliders (for Home page carousel)
app.get('/api/sliders', async (req, res) => {
  try {
    const sliders = await Slider.find({ active: true }).sort({ order: 1 }).limit(5);
    res.json(sliders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sliders' });
  }
});

// Public Top 5
app.get('/api/top5', async (req, res) => {
  try {
    const top5 = await Top5.find({ active: true }).sort({ order: 1 }).limit(5);
    res.json(top5);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top 5' });
  }
});

// Search Anime
app.get('/api/search', async (req, res) => {
  const { q, category } = req.query;
  try {
    const filter = {};
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (category && category !== 'All') filter.category = category;
    const results = await Anime.find(filter).sort({ updated_at: -1 }).limit(40);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Server search error' });
  }
});

// Get distinct categories
app.get('/api/categories', async (req, res) => {
  try {
    const cats = await Anime.distinct('category');
    res.json(cats.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get Anime Details by Slug
app.get('/api/anime/:slug', async (req, res) => {
  try {
    const anime = await Anime.findOne({ slug: req.params.slug });
    if (!anime) return res.status(404).json({ error: 'Anime not found' });
    res.json(addWatchUrls(anime.toObject()));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Anime by Episode ID (for Watch page context)
app.get('/api/anime-by-ep/:id', async (req, res) => {
  try {
    const anime = await Anime.findOne({ 'episodes._id': req.params.id });
    if (!anime) return res.status(404).json({ error: 'Anime not found' });
    res.json(addWatchUrls(anime.toObject()));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Watch Episode (Streaming)
app.get('/api/watch/:id', async (req, res) => {
  const { id } = req.params;
  const { hash } = req.query;
  if (hash !== generateHash(id)) {
    return res.status(403).send('Link expired or invalid');
  }
  try {
    const anime = await Anime.findOne({ 'episodes._id': id }, { 'episodes.$': 1 });
    if (!anime || !anime.episodes[0]) return res.status(404).send('Episode not found');
    await streamFile(req, res, id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Streaming server error');
  }
});

// ------------------------------------------------------------------
// ADMIN AUTH
// ------------------------------------------------------------------

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ role: 'admin', sub: username }, JWT_ADMIN_SECRET, { expiresIn: '24h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

// ------------------------------------------------------------------
// ADMIN: SLIDER MANAGEMENT
// ------------------------------------------------------------------

app.get('/api/admin/sliders', adminAuth, async (req, res) => {
  try {
    const sliders = await Slider.find().sort({ order: 1 });
    res.json(sliders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sliders' });
  }
});

app.post('/api/admin/sliders', adminAuth, async (req, res) => {
  try {
    const count = await Slider.countDocuments();
    if (count >= 5) return res.status(400).json({ error: 'Maximum 5 sliders allowed' });
    const slider = new Slider({ ...req.body, order: req.body.order ?? count });
    await slider.save();
    res.status(201).json(slider);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/sliders/:id', adminAuth, async (req, res) => {
  try {
    const slider = await Slider.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slider) return res.status(404).json({ error: 'Slider not found' });
    res.json(slider);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/sliders/:id', adminAuth, async (req, res) => {
  try {
    await Slider.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// ADMIN: TOP 5 MANAGEMENT
// ------------------------------------------------------------------

app.get('/api/admin/top5', adminAuth, async (req, res) => {
  try {
    const top5 = await Top5.find().sort({ order: 1 });
    res.json(top5);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top 5' });
  }
});

app.post('/api/admin/top5', adminAuth, async (req, res) => {
  try {
    const count = await Top5.countDocuments();
    if (count >= 5) return res.status(400).json({ error: 'Maximum 5 Top 5 items allowed' });
    const item = new Top5({ ...req.body, order: req.body.order ?? count });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/top5/:id', adminAuth, async (req, res) => {
  try {
    const item = await Top5.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/top5/:id', adminAuth, async (req, res) => {
  try {
    await Top5.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// ADMIN: SOCIAL LINKS MANAGEMENT
// ------------------------------------------------------------------

app.get('/api/socials', async (req, res) => {
  try {
    const socials = await Social.find({ active: true });
    res.json(socials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch social links' });
  }
});

app.get('/api/admin/socials', adminAuth, async (req, res) => {
  try {
    const socials = await Social.find().sort({ created_at: -1 });
    res.json(socials);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/admin/socials', adminAuth, async (req, res) => {
  try {
    const item = new Social(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/socials/:id', adminAuth, async (req, res) => {
  try {
    const item = await Social.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/socials/:id', adminAuth, async (req, res) => {
  try {
    await Social.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// ADMIN: ANIME MANAGEMENT
// ------------------------------------------------------------------

// List all anime (admin view, no watch URL needed)
app.get('/api/admin/anime', adminAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { title: { $regex: q, $options: 'i' } } : {};
    const animes = await Anime.find(filter).sort({ updated_at: -1 }).limit(50);
    res.json(animes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch anime' });
  }
});

// Create new anime manually
app.post('/api/admin/anime', adminAuth, async (req, res) => {
  try {
    const { title, description, poster, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const slug = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${Math.random().toString(36).substring(7)}`;
    const anime = new Anime({ title, slug, description, poster, category: category || 'Uncategorized', episodes: [] });
    await anime.save();
    res.status(201).json(anime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update anime poster/thumbnail
app.put('/api/admin/anime/:id/poster', adminAuth, async (req, res) => {
  try {
    const { poster } = req.body;
    const anime = await Anime.findByIdAndUpdate(req.params.id, { poster, updated_at: new Date() }, { new: true });
    if (!anime) return res.status(404).json({ error: 'Anime not found' });
    res.json({ success: true, poster: anime.poster });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update anime category
app.put('/api/admin/anime/:id/category', adminAuth, async (req, res) => {
  try {
    const { category } = req.body;
    const anime = await Anime.findByIdAndUpdate(req.params.id, { category, updated_at: new Date() }, { new: true });
    if (!anime) return res.status(404).json({ error: 'Anime not found' });
    res.json({ success: true, category: anime.category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update anime info (title, description, etc.)
app.put('/api/admin/anime/:id', adminAuth, async (req, res) => {
  try {
    const { title, description, poster, category } = req.body;
    const update = { updated_at: new Date() };
    if (title) update.title = title;
    if (description !== undefined) update.description = description;
    if (poster !== undefined) update.poster = poster;
    if (category) update.category = category;
    const anime = await Anime.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!anime) return res.status(404).json({ error: 'Anime not found' });
    res.json(anime);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete entire anime
app.delete('/api/admin/anime/:id', adminAuth, async (req, res) => {
  try {
    const result = await Anime.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Anime not found' });
    res.json({ success: true, deleted: result.title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single episode
app.delete('/api/admin/anime/:id/episode/:epId', adminAuth, async (req, res) => {
  try {
    const anime = await Anime.findByIdAndUpdate(
      req.params.id,
      { $pull: { episodes: { _id: req.params.epId } }, $set: { updated_at: new Date() } },
      { new: true }
    );
    if (!anime) return res.status(404).json({ error: 'Anime not found' });
    res.json({ success: true, remaining: anime.episodes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new episode (via external URL or Telegram message_id)
app.post('/api/admin/anime/:id/episode', adminAuth, async (req, res) => {
  try {
    const { episode_number, title, file_id, message_id, chat_id, media_url } = req.body;
    if (!episode_number) return res.status(400).json({ error: 'episode_number is required' });

    const anime = await Anime.findById(req.params.id);
    if (!anime) return res.status(404).json({ error: 'Anime not found' });

    const epData = {
      episode_number: Number(episode_number),
      title: title || `${anime.title} Episode ${episode_number}`,
      file_id: file_id || media_url || 'url_episode',
      message_id: message_id ? Number(message_id) : null,
      chat_id: chat_id || null,
      media_url: media_url || null
    };

    const existingIndex = anime.episodes.findIndex(e => e.episode_number === Number(episode_number));
    let finalEp;
    let status = 'New';

    if (existingIndex !== -1) {
      // UPATE EXISTING (Same logic as slider update)
      anime.episodes[existingIndex] = { ...anime.episodes[existingIndex].toObject(), ...epData };
      finalEp = anime.episodes[existingIndex];
      status = 'Updated';
    } else {
      // ADD NEW
      anime.episodes.push(epData);
      finalEp = anime.episodes[anime.episodes.length - 1];
      status = 'New';
    }

    anime.updated_at = new Date();
    await anime.save();

    // Backup to Telegram
    sendEpisodeLog(anime.title, finalEp, status);

    res.status(201).json({ success: true, episode: finalEp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an existing episode
app.put('/api/admin/anime/:id/episode/:epId', adminAuth, async (req, res) => {
  try {
    const { episode_number, title, file_id, message_id, chat_id, media_url } = req.body;
    const anime = await Anime.findById(req.params.id);
    if (!anime) return res.status(404).json({ error: 'Anime not found' });

    const ep = anime.episodes.id(req.params.epId);
    if (!ep) return res.status(404).json({ error: 'Episode not found' });

    if (episode_number) ep.episode_number = Number(episode_number);
    if (title) ep.title = title;
    if (file_id !== undefined) ep.file_id = file_id;
    if (message_id !== undefined) ep.message_id = Number(message_id);
    if (chat_id !== undefined) ep.chat_id = chat_id;
    if (media_url !== undefined) ep.media_url = media_url;

    anime.updated_at = new Date();
    await anime.save();

    // Backup update to Telegram
    sendEpisodeLog(anime.title, ep, 'Updated');

    res.json({ success: true, episode: ep });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all route to serve the React frontend (RegExp for max Express 5 compatibility)
app.get(/.*$/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
