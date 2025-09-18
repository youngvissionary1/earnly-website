# Ey-TV - Premium Streaming Platform

A DSTV-like streaming platform with Google Drive storage, Firebase backend, and Paystack payments.

## 🔹 Setup Configuration

### Default Admin Credentials
- Email: `admin@eytv.com`
- Password: `password123`

### Google Drive API Setup
1. Create Google Cloud Project
2. Enable Drive API
3. Create Service Account
4. Create folders and get IDs:
   - Comedy: `GOOGLE_DRIVE_COMEDY_FOLDER`
   - Music: `GOOGLE_DRIVE_MUSIC_FOLDER`
   - Yoruba: `GOOGLE_DRIVE_YORUBA_FOLDER`
   - Nollywood: `GOOGLE_DRIVE_NOLLYWOOD_FOLDER`
   - Action: `GOOGLE_DRIVE_ACTION_FOLDER`
   - Cartoons: `GOOGLE_DRIVE_CARTOON_FOLDER`

### Firebase Setup
1. Create Firebase project
2. Enable Firestore
3. Get config from Project Settings
4. Update firebaseConfig in Et-TV.html and admin.html

### Paystack Setup
1. Get API keys from Paystack dashboard
2. Update PAYSTACK_PUBLIC_KEY in .env

## Features

### User Features
- **Authentication System**: Secure login/signup with JWT tokens
- **Dashboard**: Real-time balance tracking and earnings overview
- **Daily Bonus**: Claim $0.003 daily rewards
- **Task Completion**: Integrated AdGem offerwall for earning through tasks
- **Mobile Services**: Purchase airtime and data bundles
- **Withdrawal System**: Cash out earnings to Nigerian bank accounts
- **Theme Customization**: Multiple color themes available
- **Emergency Notifications**: Receive important announcements

### Admin Features
- **User Management**: View, activate/deactivate users
- **Withdrawal Requests**: Approve/deny user withdrawal requests
- **Emergency Messages**: Send platform-wide notifications
- **Activity Logs**: Monitor all platform activities
- **Statistics Dashboard**: Real-time platform metrics
- **Data Export**: Export user data and reports

### Technical Features
- **Responsive Design**: Mobile-first approach
- **Real-time Updates**: Live balance and status updates
- **Secure Transactions**: Password confirmation for purchases
- **Receipt System**: Detailed transaction receipts
- **Withdrawal Scheduling**: Time-based withdrawal windows
- **Mock API Integration**: Ready for production API integration

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd earnly-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5500
   - API: http://localhost:5500/api

## Project Structure

```
earnly-web/
├── index.html              # Landing page
├── dashboard.html          # User dashboard
├── auth.html              # Login/signup page
├── tasks.html             # Task completion (AdGem integration)
├── airtime.html           # Airtime purchase
├── data.html              # Data bundle purchase
├── withdraw.html          # Withdrawal interface
├── settings.html          # User settings
├── admin.html             # Admin dashboard
├── withdrawal-requests.html # Admin withdrawal management
├── video.html             # Coming soon page
├── js/
│   ├── api.js             # API service layer
│   └── themes.js          # Theme management
├── server.js              # Express.js backend
├── package.json           # Dependencies
└── README.md              # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### User Operations
- `GET /api/user/profile` - Get user profile
- `GET /api/user/balance` - Get user balance
- `POST /api/user/claim-bonus` - Claim daily bonus
- `POST /api/user/purchase` - Make purchases
- `POST /api/user/withdraw` - Submit withdrawal request

### Admin Operations
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/logs` - Activity logs
- `GET /api/admin/withdrawal-requests` - Withdrawal requests
- `POST /api/admin/withdrawal/:id/approve` - Approve withdrawal
- `POST /api/admin/withdrawal/:id/deny` - Deny withdrawal
- `POST /api/admin/emergency-message` - Send emergency message

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
PORT=5500
JWT_SECRET=your_jwt_secret_here
DB_CONNECTION_STRING=your_database_url
ADGEM_APP_ID=31127
```

### AdGem Integration
The platform integrates with AdGem offerwall for task completion:
- App ID: 31127
- Player ID: User's email address
- URL: https://api.adgem.com/v1/wall

### Withdrawal Schedule
- **Monday-Thursday**: Withdrawals closed
- **Thursday 5pm-Friday 12am**: Withdrawals opening soon
- **Friday 12am-Sunday 12am**: Withdrawals open

## Usage

### For Users
1. **Sign up** for a new account or **login** with existing credentials
2. **Claim daily bonus** of $0.003 every day
3. **Complete tasks** through the integrated offerwall
4. **Purchase airtime/data** using earned balance
5. **Withdraw earnings** to your Nigerian bank account (during open hours)
6. **Customize themes** in settings

### For Administrators
1. Access admin dashboard at `/admin.html`
2. **Monitor users** and platform statistics
3. **Manage withdrawal requests** - approve or deny
4. **Send emergency messages** to all users
5. **View activity logs** and export data
6. **Toggle user accounts** active/inactive

## Security Features

- Password confirmation for all purchases
- Withdrawal time restrictions
- Admin-only access to sensitive operations
- Activity logging for all actions
- Secure token-based authentication
- Input validation and sanitization

## Mobile Networks Supported

### Airtime & Data
- MTN Nigeria
- Airtel Nigeria
- Glo Nigeria
- 9mobile Nigeria

### Banks Supported
- Access Bank, Zenith Bank, GTBank
- First Bank, UBA, Fidelity Bank
- Union Bank, Sterling Bank, Stanbic IBTC
- Ecobank, FCMB, Heritage Bank
- And more Nigerian banks

## Development

### Adding New Features
1. Create frontend components in respective HTML files
2. Add API endpoints in `server.js`
3. Update `api.js` for frontend-backend communication
4. Test thoroughly before deployment

### Database Integration
Replace in-memory storage in `server.js` with:
- MongoDB with Mongoose
- PostgreSQL with Sequelize
- MySQL with Sequelize

### Production Deployment
1. Set up proper database
2. Configure environment variables
3. Implement proper JWT authentication
4. Add rate limiting and security middleware
5. Set up SSL certificates
6. Configure domain and hosting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@earnly.com
- Documentation: Check this README
- Issues: Create GitHub issues for bugs

## Changelog

### Version 1.0.0
- Initial release with all core features
- User authentication and dashboard
- Task completion integration
- Mobile services (airtime/data)
- Withdrawal system
- Admin dashboard
- Theme customization
- Emergency messaging system