@echo off
echo Installing MongoDB for Earnly Platform...
echo.

echo Step 1: Downloading MongoDB Community Server...
echo Please download MongoDB from: https://www.mongodb.com/try/download/community
echo Choose Windows x64 MSI installer
echo.

echo Step 2: After installation, create data directory...
if not exist "C:\data\db" (
    mkdir "C:\data\db"
    echo Created MongoDB data directory
)

echo Step 3: Starting MongoDB service...
net start MongoDB

echo Step 4: Installing Node.js dependencies...
npm install mongoose bcryptjs jsonwebtoken dotenv

echo.
echo MongoDB setup complete!
echo You can now run: node server-new.js
pause