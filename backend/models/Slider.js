const mongoose = require('mongoose');

const SliderSchema = new mongoose.Schema({
  image: { type: String, required: true },       // Banner image URL
  link: { type: String, required: true },         // e.g. /anime/tokyo-ghoul-ddwek
  title: { type: String, default: '' },           // Overlay text
  subtitle: { type: String, default: '' },        // Small subtitle text
  order: { type: Number, default: 0 },            // Display order (0-4)
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Slider', SliderSchema);
