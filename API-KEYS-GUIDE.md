# Get API Keys & Deploy Guide

## 🔑 Getting Paystack API Keys

### Step 1: Create Paystack Account
1. Go to https://paystack.com
2. Click "Get Started" 
3. Sign up with your email
4. Verify your email address

### Step 2: Get Test Keys
1. Login to Paystack Dashboard
2. Go to Settings → API Keys & Webhooks
3. Copy your keys:
   - **Public Key**: `pk_test_xxxxxxxxxx`
   - **Secret Key**: `sk_test_xxxxxxxxxx`

### Step 3: For Live Keys (After Testing)
1. Complete business verification
2. Submit required documents
3. Get live keys: `pk_live_xxx` and `sk_live_xxx`

## 📧 Getting SendGrid API Key

### Step 1: Create SendGrid Account
1. Go to https://sendgrid.com
2. Click "Start for Free"
3. Sign up and verify email

### Step 2: Get API Key
1. Login to SendGrid Dashboard
2. Go to Settings → API Keys
3. Click "Create API Key"
4. Choose "Full Access"
5. Copy the key: `SG.xxxxxxxxxx`

### Step 3: Verify Sender Email
1. Go to Settings → Sender Authentication
2. Add your email (e.g., noreply@yourdomain.com)
3. Verify the email

## 🚀 Deploy to Production

### Option 1: Local Server (Testing)
```bash
# 1. Update .env file
PAYSTACK_SECRET_KEY=sk_test_your_actual_key
SENDGRID_API_KEY=SG.your_actual_key
FROM_EMAIL=your_verified_email@domain.com

# 2. Install dependencies
npm install

# 3. Start production server
node production-server.js
```

### Option 2: Cloud Deployment (DigitalOcean)

#### Step 1: Create DigitalOcean Droplet
1. Go to https://digitalocean.com
2. Create account and add payment method
3. Create Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic $6/month (1GB RAM)
   - **Region**: Choose closest to Nigeria
   - **Authentication**: SSH Key or Password

#### Step 2: Connect to Server
```bash
# Connect via SSH
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y
```

#### Step 3: Install Requirements
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Install PM2
npm install -g pm2
```

#### Step 4: Deploy Your Code
```bash
# Upload your code (use FileZilla or git)
git clone your_repository_url
cd earnly-web

# Install dependencies
npm install --production

# Create .env file
nano .env
# Add your API keys here

# Start with PM2
pm2 start production-server.js --name earnly
pm2 startup
pm2 save
```

#### Step 5: Set up Domain (Optional)
```bash
# Install Nginx
apt install nginx -y

# Create config
nano /etc/nginx/sites-available/earnly

# Add this config:
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5500;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable site
ln -s /etc/nginx/sites-available/earnly /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Option 3: Heroku (Easiest)

#### Step 1: Install Heroku CLI
1. Download from https://devcenter.heroku.com/articles/heroku-cli
2. Login: `heroku login`

#### Step 2: Deploy
```bash
# In your project folder
git init
git add .
git commit -m "Initial commit"

# Create Heroku app
heroku create your-app-name

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set PAYSTACK_SECRET_KEY=sk_test_your_key
heroku config:set SENDGRID_API_KEY=SG.your_key
heroku config:set FROM_EMAIL=your_email@domain.com

# Deploy
git push heroku main
```

## 🔧 Quick Setup Commands

### Update .env File:
```bash
# Copy this to your .env file
PORT=5500
MONGODB_URI=mongodb://localhost:27017/earnly
JWT_SECRET=earnly_jwt_secret_key_2024
ADMIN_PASSKEY=141612

# Add your actual keys here
PAYSTACK_SECRET_KEY=sk_test_your_actual_paystack_key
PAYSTACK_PUBLIC_KEY=pk_test_your_actual_paystack_key
SENDGRID_API_KEY=SG.your_actual_sendgrid_key
FROM_EMAIL=noreply@yourdomain.com

BASE_URL=http://localhost:5500
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### Start Production:
```bash
npm install
node production-server.js
```

Your Earnly platform will be live! 🎉