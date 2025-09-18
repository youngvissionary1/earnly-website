require('dotenv').config();
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const PaystackService = require('./payment/paystack.js

const app = express();
const PORT = process.env.PORT || 5500;
const ADMIN_PASSKEY = process.env.ADMIN_PASSKEY || 'eytv2024admin';
const paystack = new PaystackService();

// Videos database file
const VIDEOS_DB = path.join(__dirname, 'videos.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// In-memory storage for verification codes
let emergencyMessages = [];
let admins = [];

// Helper function to log activities
let activityLogs = [];
function logActivity(action, userId, details = {}) {
  activityLogs.push({
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    action,
    userId,
    details: {
      ip: '127.0.0.1',
      ...details
    }
  });
}

// Initialize storage arrays
let users = [];
let withdrawalRequests = [];
let subscriptions = [];

// Authentication Routes
app.post('/api/auth/signup', (req, res) => {
  try {
    const { username, email, password, phone, country, state, gender } = req.body;
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ status: false, msg: 'User already exists' });
    }
    
    const newUser = {
      id: Date.now().toString(),
      username: username, // This is actually the user's full name
      email,
      password, // In production, hash this password
      phone: phone || '',
      country: country || 'Nigeria',
      state: state || '',
      gender: gender || '',
      registeredAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: true,
      isVerified: false,
      balance: { task: 0.000, dailyBonus: 0.000, referral: 0.000, today: 0.000, lifetime: 0.000 },
      referralCode: Date.now().toString()
    };
    
    users.push(newUser);
    logActivity('USER_SIGNUP', newUser.id, { username, email, phone });
    
    const token = 'token_' + Date.now();
    res.json({ 
      status: true, 
      msg: 'Account created successfully',
      user: { ...newUser, password: undefined },
      token 
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      logActivity('LOGIN_FAILED', email, { reason: 'Invalid credentials' });
      return res.status(401).json({ status: false, msg: 'Invalid credentials' });
    }
    
    user.lastLogin = new Date().toISOString();
    logActivity('LOGIN_SUCCESS', user.id, { username: user.username });
    
    const token = 'token_' + Date.now();
    res.json({ 
      status: true, 
      msg: 'Login successful',
      user: { ...user, password: undefined },
      token 
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// User Routes
app.get('/api/user/profile', (req, res) => {
  // Mock authentication - in production, verify JWT token
  const userId = req.headers.authorization?.split(' ')[1] || '1';
  const user = users.find(u => u.id === userId) || users[0];
  
  if (!user) {
    return res.status(404).json({ status: false, msg: 'User not found' });
  }
  
  res.json({ status: true, user: { ...user, password: undefined } });
});

app.get('/api/user/balance', (req, res) => {
  const userId = req.headers.authorization?.split(' ')[1] || '1';
  const user = users.find(u => u.id === userId) || { balance: { total: 0.000, today: 0.000, lifetime: 0.000 } };
  
  res.json({ status: true, balances: user.balance });
});

app.post('/api/user/claim-bonus', (req, res) => {
  try {
    const userId = req.headers.authorization?.split(' ')[1] || '1';
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ status: false, msg: 'User not found' });
    }
    
    // Check if already claimed today (simplified)
    const today = new Date().toDateString();
    if (user.lastBonusClaim === today) {
      return res.status(400).json({ status: false, msg: 'Daily bonus already claimed' });
    }
    
    user.balance.dailyBonus += 0.003;
    user.balance.today += 0.003;
    user.balance.lifetime += 0.003;
    user.lastBonusClaim = today;
    
    logActivity('DAILY_BONUS_CLAIMED', userId, { amount: 0.003 });
    
    res.json({ 
      status: true, 
      msg: 'Daily bonus claimed successfully',
      amount: 0.003,
      newBalance: user.balance.total 
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/user/purchase', (req, res) => {
  try {
    const userId = req.headers.authorization?.split(' ')[1] || '1';
    const user = users.find(u => u.id === userId);
    const { type, amount, network, phone, plan } = req.body;
    
    if (!user) {
      return res.status(404).json({ status: false, msg: 'User not found' });
    }
    
    const totalBalance = user.balance.task + user.balance.dailyBonus + user.balance.referral;
    if (totalBalance < amount) {
      return res.status(400).json({ status: false, msg: 'Insufficient balance' });
    }
    
    // Deduct from balances proportionally
    const ratio = amount / totalBalance;
    user.balance.task -= user.balance.task * ratio;
    user.balance.dailyBonus -= user.balance.dailyBonus * ratio;
    user.balance.referral -= user.balance.referral * ratio;
    
    logActivity('PURCHASE_COMPLETED', userId, { type, amount, network, phone, plan });
    
    res.json({ 
      status: true, 
      msg: `${type} purchase successful`,
      transactionId: 'TXN' + Date.now()
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/user/withdraw', async (req, res) => {
  try {
    const userId = req.headers.authorization?.split(' ')[1] || '1';
    const user = users.find(u => u.id === userId);
    const { amount, bankCode, accountNumber, accountName } = req.body;
    
    if (!user) {
      return res.status(404).json({ status: false, msg: 'User not found' });
    }
    
    const totalBalance = user.balance.task + user.balance.dailyBonus + user.balance.referral;
    if (totalBalance < amount) {
      return res.status(400).json({ status: false, msg: 'Insufficient balance' });
    }
    
    if (amount < 0.010) {
      return res.status(400).json({ status: false, msg: 'Minimum withdrawal is $0.010' });
    }
    
    try {
      // Create Paystack transfer recipient
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN'
        })
      });
      
      const recipientData = await recipientResponse.json();
      
      if (!recipientData.status) {
        return res.status(400).json({ status: false, msg: 'Invalid bank details' });
      }
      
      // Initiate transfer
      const nairaAmount = Math.floor(amount * 1500 * 100); // Convert to kobo
      const transferResponse = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'balance',
          amount: nairaAmount,
          recipient: recipientData.data.recipient_code,
          reason: 'Earnly withdrawal'
        })
      });
      
      const transferData = await transferResponse.json();
      
      if (transferData.status) {
        // Deduct from user balance
        const ratio = amount / totalBalance;
        user.balance.task -= user.balance.task * ratio;
        user.balance.dailyBonus -= user.balance.dailyBonus * ratio;
        user.balance.referral -= user.balance.referral * ratio;
        
        logActivity('WITHDRAWAL_COMPLETED', userId, { amount, reference: transferData.data.reference });
        
        res.json({ 
          status: true, 
          msg: 'Withdrawal successful',
          reference: transferData.data.reference
        });
      } else {
        res.status(400).json({ status: false, msg: transferData.message || 'Transfer failed' });
      }
    } catch (paystackError) {
      console.error('Paystack error:', paystackError);
      res.status(400).json({ status: false, msg: 'Payment service temporarily unavailable' });
    }
    
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Admin Routes
// Middleware to check admin access
function requireAdmin(req, res, next) {
  const adminEmail = req.headers['admin-email'];
  
  if (!adminEmail) {
    return res.status(401).json({ status: false, msg: 'Admin email required' });
  }
  
  const admin = admins.find(a => a.email === adminEmail && a.status === 'active');
  
  if (!admin) {
    return res.status(403).json({ status: false, msg: 'Admin access denied' });
  }
  
  req.admin = admin;
  next();
}

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const stats = {
    users: {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      newToday: users.filter(u => {
        const today = new Date().toDateString();
        return new Date(u.registeredAt).toDateString() === today;
      }).length,
      growthRate: 12.5
    },
    activity: {
      successfulLoginsToday: activityLogs.filter(log => 
        log.action === 'LOGIN_SUCCESS' && 
        new Date(log.timestamp).toDateString() === new Date().toDateString()
      ).length,
      loginSuccessRate: 94.2,
      totalLogs: activityLogs.length
    },
    systemHealth: {
      uptime: process.uptime()
    }
  };
  
  res.json({ status: true, stats });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const safeUsers = users.map(user => ({ ...user, password: undefined }));
  res.json({ status: true, users: safeUsers });
});

app.get('/api/admin/logs', requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedLogs = activityLogs.slice(startIndex, endIndex);
  
  res.json({ 
    status: true, 
    logs: paginatedLogs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(activityLogs.length / limit),
      hasPrev: page > 1,
      hasNext: endIndex < activityLogs.length
    }
  });
});

app.get('/api/admin/withdrawal-requests', requireAdmin, (req, res) => {
  res.json({ status: true, requests: withdrawalRequests });
});

app.post('/api/admin/withdrawal/:id/approve', (req, res) => {
  try {
    const requestId = req.params.id;
    const request = withdrawalRequests.find(r => r.id === requestId);
    
    if (!request) {
      return res.status(404).json({ status: false, msg: 'Request not found' });
    }
    
    request.status = 'approved';
    request.processedDate = new Date().toISOString();
    
    // Deduct from user balance
    const user = users.find(u => u.id === request.userId);
    if (user) {
      const totalBalance = user.balance.task + user.balance.dailyBonus + user.balance.referral;
      const ratio = request.amount / totalBalance;
      user.balance.task -= user.balance.task * ratio;
      user.balance.dailyBonus -= user.balance.dailyBonus * ratio;
      user.balance.referral -= user.balance.referral * ratio;
    }
    
    logActivity('WITHDRAWAL_APPROVED', request.userId, { amount: request.amount, requestId });
    
    res.json({ status: true, msg: 'Withdrawal approved successfully' });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/admin/withdrawal/:id/deny', (req, res) => {
  try {
    const requestId = req.params.id;
    const request = withdrawalRequests.find(r => r.id === requestId);
    
    if (!request) {
      return res.status(404).json({ status: false, msg: 'Request not found' });
    }
    
    request.status = 'denied';
    request.processedDate = new Date().toISOString();
    request.denyReason = req.body.reason || 'No reason provided';
    
    logActivity('WITHDRAWAL_DENIED', request.userId, { amount: request.amount, requestId, reason: request.denyReason });
    
    res.json({ status: true, msg: 'Withdrawal denied successfully' });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/admin/user/:email/toggle', (req, res) => {
  try {
    const email = req.params.email;
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({ status: false, msg: 'User not found' });
    }
    
    user.isActive = !user.isActive;
    logActivity('USER_STATUS_CHANGED', user.id, { newStatus: user.isActive ? 'active' : 'inactive' });
    
    res.json({ 
      status: true, 
      msg: `User ${user.isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.delete('/api/admin/logs/clear', (req, res) => {
  try {
    activityLogs.length = 0;
    logActivity('LOGS_CLEARED', 'admin', {});
    
    res.json({ status: true, msg: 'Logs cleared successfully' });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Emergency Messages
app.post('/api/admin/emergency-message', (req, res) => {
  try {
    const { message } = req.body;
    
    const emergencyMessage = {
      id: Date.now().toString(),
      message,
      sentDate: new Date().toISOString(),
      status: 'sent'
    };
    
    emergencyMessages.push(emergencyMessage);
    logActivity('EMERGENCY_MESSAGE_SENT', 'admin', { message });
    
    res.json({ status: true, msg: 'Emergency message sent successfully' });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.get('/api/emergency-message', (req, res) => {
  const activeMessage = emergencyMessages.find(m => m.status === 'sent');
  res.json({ status: true, message: activeMessage?.message || null });
});

// Admin Access Verification
app.post('/api/admin/verify-access', (req, res) => {
  try {
    const { passkey } = req.body;
    const ADMIN_PASSKEY = '141612';
    
    if (passkey === ADMIN_PASSKEY) {
      logActivity('ADMIN_ACCESS_GRANTED', 'admin', { timestamp: new Date().toISOString() });
      res.json({ 
        status: true, 
        msg: 'Admin access granted',
        accessToken: 'admin_token_' + Date.now()
      });
    } else {
      logActivity('ADMIN_ACCESS_DENIED', 'unknown', { 
        attemptedPasskey: passkey,
        timestamp: new Date().toISOString() 
      });
      res.status(401).json({ 
        status: false, 
        msg: 'Invalid admin passkey' 
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Check if user is admin by email
app.post('/api/admin/check-admin', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ status: false, msg: 'Email is required' });
    }
    
    const isAdmin = admins.find(admin => 
      admin.email === email && admin.status === 'active'
    );
    
    if (isAdmin) {
      logActivity('ADMIN_LOGIN_ATTEMPT', email, { success: true });
      res.json({ 
        status: true, 
        msg: 'Admin access granted',
        isAdmin: true,
        adminData: isAdmin
      });
    } else {
      logActivity('ADMIN_LOGIN_ATTEMPT', email, { success: false, reason: 'Not an admin or inactive' });
      res.status(403).json({ 
        status: false, 
        msg: 'Access denied. Not an authorized admin.',
        isAdmin: false
      });
    }
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Verification Code System
let verificationCodes = {};

function generateVerificationCode(phoneNumber) {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length < 9) return '0000';
  
  const code = digits[1] + digits[4] + digits[8] + digits[6];
  return code;
}

app.post('/api/send-verification', (req, res) => {
  try {
    const { phoneNumber, email, method } = req.body;
    
    if (!phoneNumber || !email) {
      return res.status(400).json({ status: false, msg: 'Phone number and email are required' });
    }
    
    const code = generateVerificationCode(phoneNumber);
    const codeId = Date.now().toString();
    
    verificationCodes[codeId] = {
      code,
      phoneNumber,
      email,
      method,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    
    logActivity('VERIFICATION_CODE_SENT', email, { method, phoneNumber, codeId });
    
    // Simulate sending code
    if (method === 'email') {
      console.log(`📧 Verification code ${code} sent to ${email}`);
    } else {
      console.log(`📱 Verification code ${code} sent to ${phoneNumber}`);
    }
    
    res.json({ 
      status: true, 
      msg: `Verification code sent to your ${method}`,
      codeId,
      // For demo purposes, include the code in response
      code: code
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/verify-code', (req, res) => {
  try {
    const { codeId, code } = req.body;
    
    const storedCode = verificationCodes[codeId];
    if (!storedCode) {
      return res.status(400).json({ status: false, msg: 'Invalid or expired verification code' });
    }
    
    if (new Date() > storedCode.expiresAt) {
      delete verificationCodes[codeId];
      return res.status(400).json({ status: false, msg: 'Verification code has expired' });
    }
    
    if (storedCode.code !== code) {
      logActivity('VERIFICATION_FAILED', storedCode.email, { providedCode: code, expectedCode: storedCode.code });
      return res.status(400).json({ status: false, msg: 'Invalid verification code' });
    }
    
    logActivity('VERIFICATION_SUCCESS', storedCode.email, { method: storedCode.method });
    delete verificationCodes[codeId];
    
    res.json({ 
      status: true, 
      msg: 'Verification successful'
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Admin Management Routes
app.get('/api/admin/admins', requireAdmin, (req, res) => {
  res.json({ status: true, admins });
});

app.post('/api/admin/add-admin', requireAdmin, (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ status: false, msg: 'Email is required' });
    }
    
    // Check if admin already exists
    const existingAdmin = admins.find(a => a.email === email);
    if (existingAdmin) {
      return res.status(400).json({ status: false, msg: 'Admin with this email already exists' });
    }
    
    const newAdmin = {
      id: Date.now().toString(),
      email,
      status: 'active',
      addedDate: new Date().toISOString()
    };
    
    admins.push(newAdmin);
    logActivity('ADMIN_ADDED', 'admin', { email });
    
    res.json({ status: true, msg: 'Admin added successfully', admin: newAdmin });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/admin/remove-admin/:id', (req, res) => {
  try {
    const adminId = req.params.id;
    const admin = admins.find(a => a.id === adminId);
    
    if (!admin) {
      return res.status(404).json({ status: false, msg: 'Admin not found' });
    }
    
    admin.status = 'removed';
    logActivity('ADMIN_REMOVED', 'admin', { email: admin.email });
    
    res.json({ status: true, msg: 'Admin removed successfully' });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/admin/suspend-admin/:id', (req, res) => {
  try {
    const adminId = req.params.id;
    const { duration, amount } = req.body;
    const admin = admins.find(a => a.id === adminId);
    
    if (!admin) {
      return res.status(404).json({ status: false, msg: 'Admin not found' });
    }
    
    const now = new Date();
    let suspendUntil = new Date(now);
    
    switch (duration) {
      case 'minutes':
        suspendUntil.setMinutes(now.getMinutes() + amount);
        break;
      case 'hours':
        suspendUntil.setHours(now.getHours() + amount);
        break;
      case 'days':
        suspendUntil.setDate(now.getDate() + amount);
        break;
      case 'weeks':
        suspendUntil.setDate(now.getDate() + (amount * 7));
        break;
      case 'months':
        suspendUntil.setMonth(now.getMonth() + amount);
        break;
      case 'years':
        suspendUntil.setFullYear(now.getFullYear() + amount);
        break;
    }
    
    admin.status = 'suspended';
    admin.suspendUntil = suspendUntil.toISOString();
    
    logActivity('ADMIN_SUSPENDED', 'admin', { email: admin.email, duration: `${amount} ${duration}` });
    
    res.json({ status: true, msg: `Admin suspended for ${amount} ${duration}` });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.delete('/api/admin/delete-admin/:id', (req, res) => {
  try {
    const adminId = req.params.id;
    const adminIndex = admins.findIndex(a => a.id === adminId);
    
    if (adminIndex === -1) {
      return res.status(404).json({ status: false, msg: 'Admin not found' });
    }
    
    const deletedAdmin = admins[adminIndex];
    admins.splice(adminIndex, 1);
    
    logActivity('ADMIN_DELETED', 'admin', { email: deletedAdmin.email });
    
    res.json({ status: true, msg: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

app.post('/api/admin/restore-admin/:id', (req, res) => {
  try {
    const adminId = req.params.id;
    const admin = admins.find(a => a.id === adminId);
    
    if (!admin) {
      return res.status(404).json({ status: false, msg: 'Admin not found' });
    }
    
    admin.status = 'active';
    delete admin.suspendUntil;
    
    logActivity('ADMIN_RESTORED', 'admin', { email: admin.email });
    
    res.json({ status: true, msg: 'Admin restored successfully' });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Payment initialization for subscriptions
app.post('/api/payment/initialize', async (req, res) => {
  try {
    const { email, amount, plan, reference } = req.body;
    
    if (!email || !amount || !reference) {
      return res.status(400).json({ status: false, msg: 'Missing required fields' });
    }
    
    const paymentData = await paystack.initializePayment(email, amount, reference);
    
    if (paymentData.status) {
      logActivity('PAYMENT_INITIALIZED', email, { amount, plan, reference });
      res.json({ 
        status: true, 
        data: paymentData.data,
        msg: 'Payment initialized successfully'
      });
    } else {
      res.status(400).json({ status: false, msg: paymentData.message || 'Payment initialization failed' });
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ status: false, msg: 'Payment service error' });
  }
});

// Payment verification
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { reference } = req.body;
    
    if (!reference) {
      return res.status(400).json({ status: false, msg: 'Reference is required' });
    }
    
    const verificationData = await paystack.verifyPayment(reference);
    
    if (verificationData.status && verificationData.data.status === 'success') {
      logActivity('PAYMENT_VERIFIED', 'system', { reference, amount: verificationData.data.amount / 100 });
      res.json({ 
        status: true, 
        data: verificationData.data,
        msg: 'Payment verified successfully'
      });
    } else {
      res.status(400).json({ status: false, msg: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ status: false, msg: 'Payment verification error' });
  }
});

// Get banks list
app.get('/api/banks', async (req, res) => {
  try {
    const banksData = await paystack.getBanks();
    
    if (banksData.status) {
      res.json({ status: true, banks: banksData.data });
    } else {
      res.status(400).json({ status: false, msg: 'Failed to fetch banks' });
    }
  } catch (error) {
    console.error('Banks fetch error:', error);
    res.status(500).json({ status: false, msg: 'Service error' });
  }
});

// Paystack webhook for payment verification
app.post('/api/paystack/webhook', (req, res) => {
  try {
    const event = req.body;
    
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const amount = event.data.amount / 100; // Convert from kobo
      
      if (reference.startsWith('SUB_')) {
        // Handle subscription payment
        logActivity('SUBSCRIPTION_PAYMENT', 'system', { reference, amount });
      } else if (reference.startsWith('WTH_')) {
        // Handle withdrawal (reverse transaction)
        logActivity('WITHDRAWAL_PAYMENT', 'system', { reference, amount });
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Webhook error' });
  }
});

// Task completion with 80/20 split
app.post('/api/user/complete-task', (req, res) => {
  try {
    const userId = req.headers.authorization?.split(' ')[1] || '1';
    const user = users.find(u => u.id === userId);
    const { taskReward } = req.body;
    
    if (!user) {
      return res.status(404).json({ status: false, msg: 'User not found' });
    }
    
    const userReward = taskReward * 0.8; // 80% for user
    const adminReward = taskReward * 0.2; // 20% for admin
    
    user.balance.task += userReward;
    user.balance.today += userReward;
    user.balance.lifetime += userReward;
    
    // Store admin reward
    const adminRewards = JSON.parse(process.env.ADMIN_REWARDS || '0');
    process.env.ADMIN_REWARDS = (parseFloat(adminRewards) + adminReward).toString();
    
    logActivity('TASK_COMPLETED', userId, { userReward, adminReward, taskReward });
    
    res.json({ 
      status: true, 
      msg: 'Task completed successfully',
      userReward,
      newBalance: user.balance.task + user.balance.dailyBonus + user.balance.referral
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Referral signup
app.post('/api/auth/signup-with-referral', (req, res) => {
  try {
    const { username, email, password, phone, country, state, referralCode } = req.body;
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ status: false, msg: 'User already exists' });
    }
    
    const newUser = {
      id: Date.now().toString(),
      username: username, // This is actually the user's full name
      email,
      password,
      phone: phone || '',
      country: country || 'Nigeria',
      state: state || '',
      registeredAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: true,
      isVerified: false,
      balance: { task: 0.000, dailyBonus: 0.000, referral: 0.000, today: 0.000, lifetime: 0.000 },
      referralCode: Date.now().toString(),
      referredBy: referralCode
    };
    
    users.push(newUser);
    
    // Give referral bonus to referrer
    if (referralCode) {
      const referrer = users.find(u => u.id === referralCode);
      if (referrer) {
        referrer.balance.referral += 0.03;
        referrer.balance.lifetime += 0.03;
        logActivity('REFERRAL_BONUS', referrer.id, { referredUser: email, bonus: 0.03 });
      }
    }
    
    logActivity('USER_SIGNUP', newUser.id, { username, email, phone, referredBy: referralCode });
    
    const token = 'token_' + Date.now();
    res.json({ 
      status: true, 
      msg: 'Account created successfully',
      user: { ...newUser, password: undefined },
      token 
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: 'Server error' });
  }
});

// Get admin rewards
app.get('/api/admin/rewards', requireAdmin, (req, res) => {
  const adminRewards = parseFloat(process.env.ADMIN_REWARDS || '0');
  res.json({ status: true, adminRewards });
});

// Get subscription balance
app.get('/api/admin/subscription-balance', requireAdmin, (req, res) => {
  const totalRevenue = subscriptions.reduce((sum, sub) => {
    if (sub.status === 'ACTIVE') {
      return sum + sub.price;
    }
    return sum;
  }, 0);
  
  res.json({ status: true, totalRevenue, totalSubscriptions: subscriptions.length });
});

// Ey-TV API Routes
const channels = require('./channels.json');

// Ey-TV Authentication Routes
app.post('/api/eytv/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const newUser = {
      id: Date.now().toString(),
      email,
      password, // In production, hash this
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/eytv/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id, email: user.email }, 'eytv_secret_key');
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/eytv/channels', (req, res) => {
  res.json(channels);
});

app.get('/api/eytv/user/subscription', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    
    const decoded = jwt.verify(token, 'eytv_secret_key');
    const subscription = subscriptions.find(s => 
      s.userId === decoded.userId && 
      s.status === 'ACTIVE' && 
      new Date(s.endDate) > new Date()
    );
    
    res.json(subscription);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/eytv/subscribe', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    
    const decoded = jwt.verify(token, 'eytv_secret_key');
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
    subscriptions.forEach(s => {
      if (s.userId === decoded.userId) s.status = 'EXPIRED';
    });
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const subscription = {
      id: Date.now().toString(),
      userId: decoded.userId,
      plan,
      price: planInfo.price,
      selectedChannels: selectedChannels || [],
      startDate: new Date().toISOString(),
      endDate: endDate.toISOString(),
      status: 'ACTIVE',
      paymentReference
    };
    
    subscriptions.push(subscription);
    res.json({ message: 'Subscription created successfully', subscription });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/eytv/channel/:id/access', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    
    const decoded = jwt.verify(token, 'eytv_secret_key');
    const channelId = parseInt(req.params.id);
    
    const subscription = subscriptions.find(s => 
      s.userId === decoded.userId && 
      s.status === 'ACTIVE' && 
      new Date(s.endDate) > new Date()
    );
    
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
    res.status(400).json({ error: error.message });
  }
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize with sample data
function initializeData() {
  // Add sample user
  users.push({
    id: '1',
    username: 'John Doe',
    email: 'test@earnly.com',
    password: 'password123',
    country: 'Nigeria',
    phone: '+2348012345678',
    registeredAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    isActive: true,
    balance: { task: 0.000, dailyBonus: 0.000, referral: 0.000, today: 0.000, lifetime: 0.000 },
    referralCode: '1'
  });
  
  // Add default admin
  admins.push({
    id: '1',
    email: 'tunerise18@gmail.com',
    status: 'active',
    addedDate: new Date().toISOString()
  });
  
  // Add sample logs
  logActivity('USER_SIGNUP', '1', { username: 'testuser', email: 'test@earnly.com' });
  logActivity('LOGIN_SUCCESS', '1', { username: 'testuser' });
}

// Start server
app.listen(PORT, () => {
  console.log(`Earnly server running on http://localhost:${PORT}`);
  initializeData();
});

module.exports = app;