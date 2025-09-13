const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  size: { type: Number, default: 0 },
  mimeType: { type: String },
  cloudinaryPublicId: { type: String },
  cloudinaryResourceType: { type: String }, // 'image'|'video'|'raw' etc.
  cloudinaryVersion: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);
