require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const connectDB = require('./database/config');

// Models
const User = require('./database/models/User');
const WithdrawalRequest = require('./database/models/WithdrawalRequest');
const ActivityLog = require('./database/models/ActivityLog');
const Admin = require('./database/models/Admin');
const EmergencyMessage = require('./database/models/EmergencyMessage');

const app = express();
const PORT = process.env.PORT || 5500;

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Helper function to log activities
async function logActivity(action, userId, details = {}) {
  try {
    await ActivityLog.create({
      action,
      userId,
      details: { ip: '127.0.0.1', ...details }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ status: false, msg: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ status: false, msg: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Authentication Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, phone, country, state } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ status: false, msg: 'User already exists' });
    }
    
    const user = new User({
      username,
      email,
      password,
      phone: phone || '',
      country: country || 'Nigeria',
      state: state || '',
      referralCode: Date.now().toString()
    });
    
    await user.save();
    await logActivity('USER_SIGNUP', user._id, { username, email, phone });
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      status: true,
      msg: 'Account created successfully',
      user: { ...user.toObject(), password: undefined },
      token
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      await logActivity('LOGIN_FAILED', email, { reason: 'Invalid credentials' });
      return res.status(401).json({ status: false, msg: 'Invalid credentials' });
    }
    
    user.lastLogin = new Date();
    await user.save();
    await logActivity('LOGIN_SUCCESS', user._id, { username: user.username });
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      status: true,
      msg: 'Login successful',
      user: { ...user.toObject(), password: undefined },
      token
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// User Routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ status: false, msg: 'User not found' });
    }
    res.json({ status: true, user });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.get('/api/user/balance', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ status: false, msg: 'User not found' });
    }
    res.json({ status: true, balances: user.balance });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/user/claim-bonus', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ status: false, msg: 'User not found' });
    }
    
    const today = new Date().toDateString();
    if (user.lastBonusClaim === today) {
      return res.status(400).json({ status: false, msg: 'Daily bonus already claimed' });
    }
    
    user.balance.dailyBonus += 0.003;
    user.balance.today += 0.003;
    user.balance.lifetime += 0.003;
    user.lastBonusClaim = today;
    
    await user.save();
    await logActivity('DAILY_BONUS_CLAIMED', user._id, { amount: 0.003 });
    
    res.json({
      status: true,
      msg: 'Daily bonus claimed successfully',
      amount: 0.003,
      newBalance: user.balance.task + user.balance.dailyBonus + user.balance.referral
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Emergency Messages
app.get('/api/emergency-message', async (req, res) => {
  try {
    const activeMessage = await EmergencyMessage.findOne({ status: 'sent' }).sort({ createdAt: -1 });
    res.json({ status: true, message: activeMessage?.message || null });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Admin middleware
async function requireAdmin(req, res, next) {
  const adminEmail = req.headers['admin-email'];
  
  if (!adminEmail) {
    return res.status(401).json({ status: false, msg: 'Admin email required' });
  }
  
  const admin = await Admin.findOne({ email: adminEmail, status: 'active' });
  
  if (!admin) {
    return res.status(403).json({ status: false, msg: 'Admin access denied' });
  }
  
  req.admin = admin;
  next();
}

// Admin Routes
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const today = new Date().toDateString();
    const newToday = await User.countDocuments({
      createdAt: { $gte: new Date(today) }
    });
    
    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday,
        growthRate: 12.5
      },
      activity: {
        successfulLoginsToday: await ActivityLog.countDocuments({
          action: 'LOGIN_SUCCESS',
          createdAt: { $gte: new Date(today) }
        }),
        loginSuccessRate: 94.2,
        totalLogs: await ActivityLog.countDocuments()
      },
      systemHealth: {
        uptime: process.uptime()
      }
    };
    
    res.json({ status: true, stats });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/admin/emergency-message', requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    
    // Dismiss previous messages
    await EmergencyMessage.updateMany({ status: 'sent' }, { status: 'dismissed' });
    
    const emergencyMessage = new EmergencyMessage({ message });
    await emergencyMessage.save();
    
    await logActivity('EMERGENCY_MESSAGE_SENT', 'admin', { message });
    
    res.json({ status: true, msg: 'Emergency message sent successfully' });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Initialize default admin
async function initializeData() {
  try {
    const adminExists = await Admin.findOne({ email: 'tunerise18@gmail.com' });
    if (!adminExists) {
      await Admin.create({
        email: 'tunerise18@gmail.com',
        status: 'active'
      });
      console.log('Default admin created');
    }
  } catch (error) {
    console.error('Failed to initialize data:', error);
  }
}

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Earnly server running on http://localhost:${PORT}`);
  initializeData();
});

module.exports = app;