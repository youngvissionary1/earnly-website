const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  country: { type: String, default: 'Nigeria' },
  state: { type: String, default: '' },
  gender: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  balance: {
    task: { type: Number, default: 0 },
    dailyBonus: { type: Number, default: 0 },
    referral: { type: Number, default: 0 },
    today: { type: Number, default: 0 },
    lifetime: { type: Number, default: 0 }
  },
  referralCode: { type: String, unique: true },
  referredBy: { type: String, default: null },
  lastBonusClaim: { type: String, default: null },
  lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);