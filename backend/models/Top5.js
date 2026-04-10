const mongoose = require('mongoose');

const Top5Schema = new mongoose.Schema({
  image: { type: String, required: true },       // Section image URL
  link: { type: String, required: true },        // e.g. /anime/tokyo-ghoul-ddwek or /watch/123
  title: { type: String, default: '' },          // Label
  order: { type: Number, default: 0 },           // Display order (0-4)
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Top5', Top5Schema);
