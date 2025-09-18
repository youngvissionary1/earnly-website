@echo off
echo 🚀 Earnly Quick Deploy Script
echo.

echo Step 1: Checking if .env file exists...
if not exist ".env" (
    echo ❌ .env file not found!
    echo Please create .env file with your API keys first.
    echo See API-KEYS-GUIDE.md for instructions.
    pause
    exit /b 1
)

echo ✅ .env file found

echo Step 2: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed

echo Step 3: Creating logs directory...
if not exist "logs" mkdir logs

echo Step 4: Starting MongoDB (if installed)...
net start MongoDB 2>nul
if %errorlevel% equ 0 (
    echo ✅ MongoDB started
) else (
    echo ⚠️ MongoDB not running - install MongoDB first
    echo Run install-mongodb.bat to install MongoDB
)

echo Step 5: Starting Earnly production server...
echo.
echo 🎉 Earnly is starting...
echo 📱 Access your app at: http://localhost:5500
echo 🛑 Press Ctrl+C to stop the server
echo.

node production-server.js

pause