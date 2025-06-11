#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"


nvm use node || nvm install node && nvm use node

echo "NVM_DIR: $NVM_DIR"
echo "Current Node.js version: $(node -v)"
echo "Current npm version: $(npm -v)"


APP_ROOT_DIR="/root/deploy"       
NODEJS_APP_DIR="$APP_ROOT_DIR/nodejs" 

echo "Attempting to change directory to $NODEJS_APP_DIR"
cd "$NODEJS_APP_DIR" || { echo "ERROR: Could not change directory to $NODEJS_APP_DIR. Exiting."; exit 1; }

echo "Successfully changed directory to $(pwd)"

source ~/.bashrc || echo "WARNING: ~/.bashrc could not be sourced. Some environment variables might be missing."

echo "Installing npm dependencies..."
npm install || { echo "ERROR: npm install failed. Exiting."; exit 1; }
echo "npm install complete."

echo "Restarting PM2 processes using ecosystem file..."
pm2 startOrRestart ecosystem.config.js --env production
echo "PM2 command with ecosystem file issued."

echo "Deployment script finished successfully."