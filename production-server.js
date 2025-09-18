require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// Subscription Schema
const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['basic', 'standard', 'premium'], required: true },
  price: { type: Number, required: true },
  selectedChannels: [{ type: Number }],
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED'], default: 'ACTIVE' },
  paymentReference: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email, isActive: true });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, email: user.email }, 
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Channel Routes
app.get('/api/channels', (req, res) => {
  const channels = require('./channels.json');
  res.json(channels);
});

app.get('/api/user/subscription', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      userId: req.user.userId, 
      status: 'ACTIVE',
      endDate: { $gt: new Date() }
    });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Payment verification
app.post('/api/payment/verify', authenticateToken, async (req, res) => {
  try {
    const { reference, gateway } = req.body;
    
    let verified = false;
    
    if (gateway === 'paystack') {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      });
      const data = await response.json();
      verified = data.status && data.data.status === 'success';
    }
    
    if (gateway === 'flutterwave') {
      const response = await fetch(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
        }
      });
      const data = await response.json();
      verified = data.status === 'success' && data.data.status === 'successful';
    }
    
    res.json({ verified });
  } catch (error) {
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Subscription Routes
app.post('/api/subscribe', authenticateToken, async (req, res) => {
  try {
    const { plan, selectedChannels, paymentReference } = req.body;
    
    const plans = {
      basic: { price: 1000, maxChannels: 2 },
      standard: { price: 3000, maxChannels: 10 },
      premium: { price: 6000, maxChannels: 200 }
    };
    
    const planInfo = plans[plan];
    if (!planInfo) return res.status(400).json({ error: 'Invalid plan' });
    
    if (selectedChannels && selectedChannels.length > planInfo.maxChannels) {
      return res.status(400).json({ error: 'Too many channels selected' });
    }
    
    // Deactivate existing subscriptions
    await Subscription.updateMany(
      { userId: req.user.userId },
      { status: 'EXPIRED' }
    );
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const subscription = new Subscription({
      userId: req.user.userId,
      plan,
      price: planInfo.price,
      selectedChannels: selectedChannels || [],
      endDate,
      paymentReference
    });
    
    await subscription.save();
    res.json({ message: 'Subscription created successfully', subscription });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/channel/:id/access', authenticateToken, async (req, res) => {
  try {
    const channelId = parseInt(req.params.id);
    const subscription = await Subscription.findOne({ 
      userId: req.user.userId, 
      status: 'ACTIVE',
      endDate: { $gt: new Date() }
    });
    
    if (!subscription) {
      return res.json({ hasAccess: false, message: 'No active subscription' });
    }
    
    let hasAccess = false;
    if (subscription.plan === 'premium') {
      hasAccess = true;
    } else if (subscription.selectedChannels.includes(channelId)) {
      hasAccess = true;
    }
    
    res.json({ hasAccess, subscription: subscription.plan });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Production server running on port ${PORT}`);
});