const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  denyReason: { type: String, default: null },
  processedDate: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);