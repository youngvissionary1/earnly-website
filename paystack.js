const https = require('https');

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    this.baseURL = 'https://api.paystack.co';
  }

  async initializePayment(email, amount, reference) {
    const params = JSON.stringify({
      email,
      amount: amount * 100, // Convert to kobo
      reference,
      callback_url: `${process.env.BASE_URL}/payment/verify`
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(params)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(params);
      req.end();
    });
  }

  async verifyPayment(reference) {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${reference}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });
  }

  async createTransferRecipient(name, accountNumber, bankCode) {
    const params = JSON.stringify({
      type: 'nuban',
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN'
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transferrecipient',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(params)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(params);
      req.end();
    });
  }

  async initiateTransfer(amount, recipientCode, reason = 'Earnly withdrawal') {
    const params = JSON.stringify({
      source: 'balance',
      amount: amount * 100, // Convert to kobo
      recipient: recipientCode,
      reason
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transfer',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(params)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(params);
      req.end();
    });
  }

  async getBanks() {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/bank',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = PaystackService;