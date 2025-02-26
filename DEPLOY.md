# Zuri Backend Deployment Guide

This comprehensive guide walks through the process of deploying the Zuri backend application to a Google Cloud Platform (GCP) instance. It covers everything from initial setup to automated deployments using GitHub Actions.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial GCP Instance Setup](#initial-gcp-instance-setup)
3. [SSH Key Configuration](#ssh-key-configuration)
4. [Environment Configuration](#environment-configuration)
5. [Manual Deployment](#manual-deployment)
6. [Automated Deployment with GitHub Actions](#automated-deployment-with-github-actions)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting the deployment process, ensure you have:

- A GCP instance with the IP address: `34.1.218.136`
- The GCP shared key file (located in your downloads folder)
- Access to the Zuri backend GitHub repository: [https://github.com/Zuri-One/zuri-backend](https://github.com/Zuri-One/zuri-backend)
- Git installed on your local machine
- Basic knowledge of terminal/command line operations

## Initial GCP Instance Setup

These steps prepare your GCP instance with the necessary software to run the Node.js application:

### 1. Connect to your GCP instance

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136
```

### 2. Update package repositories

```bash
sudo apt update
sudo apt upgrade -y
```

### 3. Install Node.js (version 20)

```bash
# Install curl if not already installed
sudo apt install -y curl

# Add NodeSource repository for Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node -v
npm -v
```

### 4. Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions provided by the above command
```

### 5. Create application directory

```bash
sudo mkdir -p /var/www/zuri-backend
sudo chown -R ubuntu:ubuntu /var/www/zuri-backend
```

### 6. Configure firewall (if needed)

```bash
sudo apt install -y ufw
sudo ufw allow ssh
sudo ufw allow 8000/tcp  # Adjust port number as needed for your application
sudo ufw enable
```

## SSH Key Configuration

The SSH key allows secure communication between your local machine, GitHub, and the GCP instance.

### 1. Set proper permissions for the GCP shared key

```bash
chmod 600 ~/downloads/GCP_shared_key
```

If you have an alternative file:

```bash
chmod 600 ~/downloads/GCP_shared_key\ \(1\)
```

### 2. Test the SSH connection

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "echo Connection successful"
```

### 3. Getting the key content for GitHub Actions

To view the content of your GCP key (needed for GitHub Actions):

```bash
cat ~/downloads/GCP_shared_key
```

Copy the entire output, including the BEGIN and END lines.

## Environment Configuration

The environment file contains configuration variables for your application.

### 1. Create a local environment template

```bash
cat > .env.template << EOF
PORT=8000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
API_VERSION=v1
# Add other required environment variables
EOF
```

### 2. Create a production environment file

```bash
# Create a temporary directory
TEMP_DIR=$(mktemp -d)
ENV_FILE="$TEMP_DIR/.env"

# Create environment file with secure random values
cat > "$ENV_FILE" << EOF
PORT=8000
NODE_ENV=production
MONGODB_URI=mongodb+srv://your_actual_username:your_actual_password@your_actual_cluster.mongodb.net/your_actual_database
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
API_VERSION=v1
# Add other necessary environment variables with actual values
EOF

# Edit the file to add your actual database credentials
nano "$ENV_FILE"
```

### 3. Transfer environment file to GCP

```bash
# Transfer the environment file to GCP
scp -i ~/downloads/GCP_shared_key "$ENV_FILE" ubuntu@34.1.218.136:/tmp/.env

# SSH into GCP and move the file to the application directory
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "sudo mv /tmp/.env /var/www/zuri-backend/.env && sudo chown ubuntu:ubuntu /var/www/zuri-backend/.env"

# Clean up the temporary directory
rm -rf "$TEMP_DIR"
```

## Manual Deployment

For manual deployments, use this script to deploy your application to GCP.

### 1. Create the deployment script

Create a file named `zuri-deploy.sh` in your home directory:

```bash
cat > ~/zuri-deploy.sh << 'EOF'
#!/bin/bash

# Zuri Backend Deployment Script
KEY_PATH="$HOME/downloads/GCP_shared_key"
if [ ! -f "$KEY_PATH" ] && [ -f "$HOME/downloads/GCP_shared_key (1)" ]; then
    KEY_PATH="$HOME/downloads/GCP_shared_key (1)"
fi

GCP_IP="34.1.218.136"
GCP_USER="ubuntu"
APP_DIR="/var/www/zuri-backend"
REPO_URL="https://github.com/Zuri-One/zuri-backend.git"
BRANCH="main"

echo "===== Deploying Zuri Backend ====="
echo

# Create a temporary directory for the repository
TEMP_DIR=$(mktemp -d)
echo "Cloning repository to temporary directory..."

# Clone the repository
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TEMP_DIR"
cd "$TEMP_DIR"

echo "Deploying to GCP instance at $GCP_IP..."

# Copy files to the GCP instance using SSH
echo "Transferring files to GCP instance..."
rsync -avz -e "ssh -i $KEY_PATH -o StrictHostKeyChecking=no" \
    --exclude ".git" \
    --exclude "node_modules" \
    --exclude ".env*" \
    . "$GCP_USER@$GCP_IP:$APP_DIR"

# SSH into GCP to run installation and restart services
echo "Running installation on GCP instance..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no "$GCP_USER@$GCP_IP" << 'ENDSSH'
    cd /var/www/zuri-backend
    
    # Install dependencies
    echo "Installing Node.js dependencies..."
    npm install --production
    
    # Restart application with PM2
    echo "Starting/restarting application with PM2..."
    pm2 restart zuri-backend || pm2 start server.js --name zuri-backend
    
    # Save PM2 configuration to restart on reboot
    pm2 save
ENDSSH

# Clean up the temporary directory
rm -rf "$TEMP_DIR"

echo "Deployment process completed successfully!"
EOF

# Make the script executable
chmod +x ~/zuri-deploy.sh
```

### 2. Run the deployment script

```bash
~/zuri-deploy.sh
```

## Automated Deployment with GitHub Actions

Set up GitHub Actions to automatically deploy your application whenever changes are pushed to the main branch.

### 1. Create the GitHub workflow file

In your local repository, create the GitHub Actions workflow file:

```bash
# Navigate to your local repository
cd /path/to/your/local/zuri-backend

# Create GitHub workflows directory
mkdir -p .github/workflows

# Create the deployment workflow file
cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy Zuri Backend to GCP

on:
  push:
    branches: [ main ]  # Adjust branch name if needed
  workflow_dispatch:    # Allow manual triggering

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test || true  # Continue even if tests fail, remove '|| true' if you want to enforce passing tests
      
    - name: Set up SSH key
      uses: webfactory/ssh-agent@v0.7.0
      with:
        ssh-private-key: ${{ secrets.GCP_SSH_PRIVATE_KEY }}
        
    - name: Setup known hosts
      run: |
        mkdir -p ~/.ssh
        ssh-keyscan -H 34.1.218.136 >> ~/.ssh/known_hosts
        
    - name: Deploy to GCP
      run: |
        # Install rsync
        sudo apt-get update && sudo apt-get install -y rsync
        
        # Sync repository to GCP
        rsync -avz --exclude '.git' --exclude 'node_modules' --exclude '.env*' ./ ubuntu@34.1.218.136:/var/www/zuri-backend/
        
        # Execute remote commands
        ssh ubuntu@34.1.218.136 << 'EOF'
          cd /var/www/zuri-backend
          
          # Install Node.js dependencies
          npm install --production
          
          # Restart application with PM2
          pm2 restart zuri-backend || pm2 start server.js --name zuri-backend
          
          # Save PM2 configuration to restart on reboot
          pm2 save
          
          # Log the deployment
          echo "Deployment completed at $(date)" >> /var/www/zuri-backend/deploy.log
EOF
EOF

# Commit the workflow file to your repository
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deployment workflow"
git push origin main
```

### 2. Add GitHub repository secret

1. Go to your GitHub repository in a web browser
2. Click on "Settings" tab (near the top right)
3. In the left sidebar, click on "Secrets and variables" → "Actions"
4. Click on "New repository secret"
5. Use these details:
   - Name: `GCP_SSH_PRIVATE_KEY`
   - Secret: Paste the entire content of your GCP private key (from `cat ~/downloads/GCP_shared_key`)
6. Click "Add secret"

## Monitoring and Maintenance

### Checking application status

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "cd /var/www/zuri-backend && pm2 status"
```

### Viewing application logs

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "cd /var/www/zuri-backend && pm2 logs zuri-backend"
```

To see a limited number of log lines:

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "cd /var/www/zuri-backend && pm2 logs zuri-backend --lines 100"
```

### Restarting the application

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "cd /var/www/zuri-backend && pm2 restart zuri-backend"
```

### Server maintenance

Monitor disk space:

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "df -h"
```

Check memory usage:

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "free -m"
```

View system logs:

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "sudo journalctl -xe"
```

## Troubleshooting

### Application won't start

1. Check if Node.js is installed correctly:

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "node -v && npm -v"
```

2. Check for errors in application logs:

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "cd /var/www/zuri-backend && pm2 logs zuri-backend --lines 100"
```

3. Verify the server.js file exists:

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "ls -la /var/www/zuri-backend/server.js"
```

### Database connection issues

1. Verify environment variables:

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "cd /var/www/zuri-backend && grep MONGODB_URI .env"
```

2. Test database connectivity:

```bash
ssh -i ~/downloads/GCP_shared_key ubuntu@34.1.218.136 "cd /var/www/zuri-backend && node -e \"const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB connected')).catch(err => console.error('MongoDB connection error:', err))\""
```

### SSH connection issues

1. Check key permissions:

```bash
chmod 600 ~/downloads/GCP_shared_key
```

2. Verify GCP instance is running:

```bash
ping 34.1.218.136
```

3. Check if SSH port is open:

```bash
nc -zv 34.1.218.136 22
```

### Deployment fails

1. Check if rsync is installed:

```bash
which rsync || sudo apt-get install -y rsync
```

2. Verify GitHub Action logs by going to your repository's Actions tab

3. Test manual deployment with verbose output:

```bash
bash -x ~/zuri-deploy.sh
```

## Conclusion

This guide has walked you through setting up and deploying the Zuri backend application to a GCP instance. By following these steps, you've:

1. Set up a GCP instance with Node.js and PM2
2. Configured SSH keys for secure deployment
3. Created and transferred environment configuration
4. Set up both manual and automated deployment processes
5. Learned how to monitor and maintain your application

For additional help or questions, refer to the repository documentation or contact the development team.