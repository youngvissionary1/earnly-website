const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'suspended', 'removed'], default: 'active' },
  suspendUntil: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);