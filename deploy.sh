#!/bin/bash

echo "🚀 Deploying Earnly to Production..."

# Step 1: Install dependencies
echo "📦 Installing production dependencies..."
npm install --production

# Step 2: Create logs directory
mkdir -p logs

# Step 3: Set up environment
echo "⚙️ Setting up environment..."
if [ ! -f .env ]; then
    echo "❌ .env file not found! Please create it first."
    exit 1
fi

# Step 4: Start MongoDB
echo "🗄️ Starting MongoDB..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Step 5: Install PM2 for process management
echo "🔧 Installing PM2..."
npm install -g pm2

# Step 6: Start application with PM2
echo "🚀 Starting Earnly with PM2..."
pm2 start production-server.js --name "earnly-api"
pm2 startup
pm2 save

# Step 7: Set up Nginx (optional)
echo "🌐 Setting up Nginx reverse proxy..."
sudo apt update
sudo apt install nginx -y

# Create Nginx config
sudo tee /etc/nginx/sites-available/earnly << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/earnly /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Earnly deployed successfully!"
echo "🌐 Access your app at: http://your-domain.com"
echo "📊 Monitor with: pm2 monit"