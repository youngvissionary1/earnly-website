// API Configuration
const API_BASE_URL = 'http://localhost:5500';

class EarnlyAPI {
  constructor() {
    this.token = localStorage.getItem('earnly_token');
    this.user = JSON.parse(localStorage.getItem('earnly_user') || 'null');
  }

  // Authentication methods
  async login(credentials) {
    try {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: credentials
      });
      
      if (response.status) {
        this.token = response.token;
        this.user = response.user;
        
        localStorage.setItem('earnly_token', response.token);
        localStorage.setItem('earnly_user', JSON.stringify(response.user));
        
        // Initialize user balance if not exists
        if (!localStorage.getItem('earnly_balance')) {
          localStorage.setItem('earnly_balance', JSON.stringify({
            total: 5.000,
            today: 0.000,
            lifetime: 5.000
          }));
        }
        
        return response;
      } else {
        throw new Error(response.msg || 'Login failed');
      }
    } catch (error) {
      // Fallback to mock for demo
      const mockUser = {
        id: '1',
        username: credentials.email.split('@')[0],
        email: credentials.email,
        country: 'Nigeria',
        phone: '',
        registeredAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isActive: true
      };

      const mockToken = 'mock_token_' + Date.now();
      
      this.token = mockToken;
      this.user = mockUser;
      
      localStorage.setItem('earnly_token', mockToken);
      localStorage.setItem('earnly_user', JSON.stringify(mockUser));
      
      if (!localStorage.getItem('earnly_balance')) {
        localStorage.setItem('earnly_balance', JSON.stringify({
          task: 5.000,
          dailyBonus: 0.000,
          referral: 0.000
        }));
      }
      
      return { status: true, user: mockUser, token: mockToken };
    }
  }

  async signup(userData) {
    try {
      const response = await this.makeRequest('/api/auth/signup', {
        method: 'POST',
        body: userData
      });
      
      if (response.status) {
        this.token = response.token;
        this.user = response.user;
        
        localStorage.setItem('earnly_token', response.token);
        localStorage.setItem('earnly_user', JSON.stringify(response.user));
        
        // Initialize user balance
        localStorage.setItem('earnly_balance', JSON.stringify({
          task: 0.000,
          dailyBonus: 0.000,
          referral: 0.000
        }));
        
        return response;
      } else {
        throw new Error(response.msg || 'Signup failed');
      }
    } catch (error) {
      throw new Error(error.message || 'Signup failed. Please try again.');
    }
  }

  async sendVerificationCode(phoneNumber, email, method) {
    try {
      const response = await this.makeRequest('/api/send-verification', {
        method: 'POST',
        body: { phoneNumber, email, method }
      });
      return response;
    } catch (error) {
      throw new Error(error.message || 'Failed to send verification code');
    }
  }

  async verifyCode(codeId, code) {
    try {
      const response = await this.makeRequest('/api/verify-code', {
        method: 'POST',
        body: { codeId, code }
      });
      return response;
    } catch (error) {
      throw new Error(error.message || 'Verification failed');
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('earnly_token');
    localStorage.removeItem('earnly_user');
    localStorage.removeItem('earnly_balance');
    localStorage.removeItem('earnly_pending_withdrawal');
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  // User methods
  async getProfile() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    return { status: true, user: this.user };
  }

  async getBalance() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const balance = JSON.parse(localStorage.getItem('earnly_balance') || '{"task":0,"dailyBonus":0,"referral":0}');
    return { status: true, balances: balance };
  }

  async claimDailyBonus() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const lastClaim = localStorage.getItem('earnly_last_daily_claim');
    const today = new Date().toDateString();
    
    if (lastClaim === today) {
      throw new Error('Daily bonus already claimed today');
    }
    
    const balance = JSON.parse(localStorage.getItem('earnly_balance') || '{"task":0,"dailyBonus":0,"referral":0}');
    balance.dailyBonus += 0.003;
    
    localStorage.setItem('earnly_balance', JSON.stringify(balance));
    localStorage.setItem('earnly_last_daily_claim', today);
    
    return { status: true, amount: 0.003, newBalance: balance.dailyBonus + balance.task + balance.referral };
  }

  async purchase(purchaseData) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const balance = JSON.parse(localStorage.getItem('earnly_balance') || '{"task":0,"dailyBonus":0,"referral":0}');
    const totalBalance = balance.task + balance.dailyBonus + balance.referral;
    
    if (totalBalance < purchaseData.amount) {
      throw new Error('Insufficient balance');
    }
    
    // Deduct proportionally
    const ratio = purchaseData.amount / totalBalance;
    balance.task -= balance.task * ratio;
    balance.dailyBonus -= balance.dailyBonus * ratio;
    balance.referral -= balance.referral * ratio;
    
    localStorage.setItem('earnly_balance', JSON.stringify(balance));
    
    return { status: true, message: 'Purchase successful' };
  }

  async withdraw(withdrawalData) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const balance = JSON.parse(localStorage.getItem('earnly_balance') || '{"total":0,"today":0,"lifetime":0}');
    
    if (balance.total < withdrawalData.amount) {
      throw new Error('Insufficient balance');
    }
    
    if (withdrawalData.amount < 0.010) {
      throw new Error('Minimum withdrawal amount is $0.010');
    }
    
    return { status: true, message: 'Withdrawal request submitted' };
  }

  // Admin methods
  async getAdminStats() {
    return {
      status: true,
      stats: {
        users: {
          total: 1250,
          active: 890,
          newToday: 45,
          growthRate: 12.5
        },
        activity: {
          successfulLoginsToday: 234,
          loginSuccessRate: 94.2,
          totalLogs: 15678
        },
        systemHealth: {
          uptime: 86400 * 7 // 7 days in seconds
        }
      }
    };
  }

  // Helper method to make HTTP requests
  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        // Network error - use mock data for demo
        console.warn('API not available, using mock data');
        return this.getMockResponse(endpoint, options);
      }
      
      if (!response.ok && data.status === false) {
        throw new Error(data.msg || 'Request failed');
      }
      
      throw error;
    }
  }

  getMockResponse(endpoint, options) {
    // Return mock responses for demo purposes
    if (endpoint.includes('/admin/stats')) {
      return this.getAdminStats();
    }
    
    if (endpoint.includes('/send-verification')) {
      const { phoneNumber } = JSON.parse(options.body || '{}');
      const digits = phoneNumber.replace(/\D/g, '');
      const code = digits.length >= 9 ? digits[1] + digits[4] + digits[8] + digits[6] : '0000';
      return {
        status: true,
        msg: 'Verification code sent',
        codeId: Date.now().toString(),
        code: code
      };
    }
    
    if (endpoint.includes('/verify-code')) {
      return { status: true, msg: 'Verification successful' };
    }
    
    return { status: false, message: 'Service temporarily unavailable' };
  }
}

// Create global API instance
const api = new EarnlyAPI();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EarnlyAPI;
}