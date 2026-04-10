const mongoose = require('mongoose');

const SocialSchema = new mongoose.Schema({
  platform: { type: String, required: true }, // e.g. 'Telegram', 'Instagram'
  url: { type: String, required: true },
  icon: { type: String }, // Optional icon name or URL
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Social', SocialSchema);
