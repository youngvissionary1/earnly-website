const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendWelcomeEmail(email, username) {
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: 'Welcome to Earnly!',
      html: `
        <h2>Welcome to Earnly, ${username}!</h2>
        <p>Your account has been created successfully.</p>
        <p>Start earning money by:</p>
        <ul>
          <li>Claiming your daily bonus</li>
          <li>Completing tasks</li>
          <li>Referring friends</li>
        </ul>
        <p>Happy earning!</p>
      `
    };
    return sgMail.send(msg);
  }

  async sendWithdrawalNotification(email, amount, status) {
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: `Withdrawal ${status}`,
      html: `
        <h2>Withdrawal Update</h2>
        <p>Your withdrawal request of $${amount} has been ${status}.</p>
        ${status === 'approved' ? '<p>Funds will be transferred within 24 hours.</p>' : ''}
      `
    };
    return sgMail.send(msg);
  }

  async sendVerificationCode(email, code) {
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: 'Earnly Verification Code',
      html: `
        <h2>Your Verification Code</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code expires in 10 minutes.</p>
      `
    };
    return sgMail.send(msg);
  }
}

module.exports = EmailService;