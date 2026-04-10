const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
  episode_number: { type: Number, required: true },
  title: { type: String, required: true },
  file_id: { type: String },           // Telegram file_id (may be empty for URL episodes)
  message_id: { type: Number },
  chat_id: { type: String },
  file_path: { type: String },         // Cached from Telegram
  file_size: { type: Number },
  mime_type: { type: String },
  media_url: { type: String },         // External URL (for admin-added episodes)
});

const AnimeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  poster: { type: String },
  category: { type: String, default: 'Uncategorized' }, // e.g. Action, Romance, etc.
  episodes: [EpisodeSchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Case-insensitive search index on title
AnimeSchema.index({ title: 'text' });

module.exports = mongoose.model('Anime', AnimeSchema);
