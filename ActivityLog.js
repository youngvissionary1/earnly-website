const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  userId: { type: String, required: true },
  details: { type: Object, default: {} },
  ip: { type: String, default: '127.0.0.1' }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);