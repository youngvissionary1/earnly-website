const mongoose = require('mongoose');

const emergencyMessageSchema = new mongoose.Schema({
  message: { type: String, required: true },
  status: { type: String, enum: ['sent', 'dismissed'], default: 'sent' }
}, { timestamps: true });

module.exports = mongoose.model('EmergencyMessage', emergencyMessageSchema);