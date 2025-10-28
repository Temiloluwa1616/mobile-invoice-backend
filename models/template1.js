const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['invoice', 'receipt'] },
  layoutJSON: {
    name: String,
    color: { type: String, default: '#2563eb' },
    font: { type: String, default: 'Helvetica' },
    showLogo: { type: Boolean, default: true },
    logoPath: String
  },
  previewImage: { type: String }, // 👈 Add preview image path
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Template', TemplateSchema);
