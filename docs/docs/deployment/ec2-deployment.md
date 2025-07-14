# EC2 Deployment Guide

This guide covers deploying the ZuriHealth HMS API with integrated documentation on an Amazon EC2 instance.

## Prerequisites

- AWS Account with EC2 access
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt or commercial)
- Basic Linux administration knowledge

## EC2 Instance Setup

### 1. Launch EC2 Instance

#### Recommended Instance Configuration
```
Instance Type: t3.large (2 vCPU, 8 GB RAM)
AMI: Ubuntu 22.04 LTS
Storage: 50 GB GP3 SSD
Security Group: Custom (see below)
Key Pair: Create or use existing
```

#### Security Group Configuration
```
Inbound Rules:
- SSH (22): Your IP address
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- Custom TCP (3000): Your IP (for testing)

Outbound Rules:
- All traffic: 0.0.0.0/0
```

### 2. Connect to Instance

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update system packages
sudo apt update && sudo apt upgrade -y
```

## System Dependencies Installation

### 1. Install Node.js

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### 2. Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE zurihealth_hms;
CREATE USER zurihealth WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE zurihealth_hms TO zurihealth;
ALTER USER zurihealth CREATEDB;
\q
EOF
```

### 3. Install Additional Tools

```bash
# Install Git, Nginx, and other tools
sudo apt install git nginx certbot python3-certbot-nginx htop curl wget unzip -y

# Install PM2 for process management
sudo npm install -g pm2
```

## Application Deployment

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www/zurihealth-hms
sudo chown ubuntu:ubuntu /var/www/zurihealth-hms

# Clone repository
cd /var/www/zurihealth-hms
git clone https://github.com/your-org/zuri-backend.git .

# Or upload your code via SCP/SFTP
```

### 2. Install Dependencies

```bash
# Install main application dependencies
npm install

# Install documentation dependencies
cd docs
npm install
cd ..
```

### 3. Environment Configuration

```bash
# Create environment file
cp .env.example .env

# Edit environment variables
nano .env
```

#### Environment Variables (.env)
```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zurihealth_hms
DB_USER=zurihealth
DB_PASSWORD=your_secure_password
DATABASE_URL=postgresql://zurihealth:your_secure_password@localhost:5432/zurihealth_hms

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRE=24h

# Email Configuration (using Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Configuration
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# Video Conferencing
ZOOM_API_KEY=your_zoom_api_key
ZOOM_API_SECRET=your_zoom_api_secret
WHEREBY_API_KEY=your_whereby_api_key

# File Upload
UPLOAD_PATH=/var/www/zurihealth-hms/public/uploads

# Security
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Database Setup

```bash
# Run database migrations
npm run migrate

# Seed initial data (if available)
npm run seed
```

### 5. Build Documentation

```bash
# Build documentation for production
./scripts/build-docs.sh

# Verify documentation build
ls -la docs/build/
```

### 6. Test Application

```bash
# Test the application
npm start

# In another terminal, test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/docs-health
```

## Process Management with PM2

### 1. PM2 Configuration

Create PM2 ecosystem file:

```bash
# Create PM2 configuration
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'zurihealth-hms',
    script: 'server.js',
    cwd: '/var/www/zurihealth-hms',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/zurihealth-hms/error.log',
    out_file: '/var/log/zurihealth-hms/access.log',
    log_file: '/var/log/zurihealth-hms/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
```

### 2. Create Log Directory

```bash
# Create log directory
sudo mkdir -p /var/log/zurihealth-hms
sudo chown ubuntu:ubuntu /var/log/zurihealth-hms
```

### 3. Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by the command above

# Check application status
pm2 status
pm2 logs zurihealth-hms
```

## Nginx Configuration

### 1. Create Nginx Configuration

```bash
# Create Nginx site configuration
sudo tee /etc/nginx/sites-available/zurihealth-hms << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (will be configured by Certbot)
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
    
    # Main API and Documentation
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Rate limiting for API endpoints
        limit_req zone=api burst=20 nodelay;
    }
    
    # Authentication endpoints with stricter rate limiting
    location /api/v1/auth/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Stricter rate limiting for auth
        limit_req zone=auth burst=10 nodelay;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        access_log off;
    }
    
    # Documentation health check
    location /docs-health {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        access_log off;
    }
    
    # Access and Error Logs
    access_log /var/log/nginx/zurihealth-hms.access.log;
    error_log /var/log/nginx/zurihealth-hms.error.log;
}
EOF
```

### 2. Enable Site and Test Configuration

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/zurihealth-hms /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## SSL Certificate Setup

### 1. Install SSL Certificate with Certbot

```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 2. Setup Automatic Renewal

```bash
# Add cron job for automatic renewal
sudo crontab -e

# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Check firewall status
sudo ufw status
```

## Monitoring and Logging

### 1. Setup Log Rotation

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/zurihealth-hms << 'EOF'
/var/log/zurihealth-hms/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 2. Setup System Monitoring

```bash
# Install htop for system monitoring
sudo apt install htop iotop nethogs -y

# Create monitoring script
cat > /home/ubuntu/monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Status ==="
date
echo ""
echo "=== CPU and Memory ==="
free -h
echo ""
echo "=== Disk Usage ==="
df -h
echo ""
echo "=== PM2 Status ==="
pm2 status
echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager -l
echo ""
echo "=== PostgreSQL Status ==="
sudo systemctl status postgresql --no-pager -l
EOF

chmod +x /home/ubuntu/monitor.sh
```

## Backup Strategy

### 1. Database Backup Script

```bash
# Create backup script
cat > /home/ubuntu/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="zurihealth_hms"

mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U zurihealth -d $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 30 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Database backup completed: db_backup_$DATE.sql.gz"
EOF

chmod +x /home/ubuntu/backup-db.sh

# Setup daily backup cron job
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

### 2. Application Backup

```bash
# Create application backup script
cat > /home/ubuntu/backup-app.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/zurihealth-hms"

mkdir -p $BACKUP_DIR

# Backup application files (excluding node_modules)
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='docs/node_modules' \
    --exclude='docs/build' \
    --exclude='.git' \
    -C /var/www zurihealth-hms

# Keep only last 7 days of app backups
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "Application backup completed: app_backup_$DATE.tar.gz"
EOF

chmod +x /home/ubuntu/backup-app.sh
```

## Deployment Verification

### 1. Test All Endpoints

```bash
# Test health endpoints
curl https://your-domain.com/health
curl https://your-domain.com/docs-health

# Test documentation
curl https://your-domain.com/docs

# Test API documentation
curl https://your-domain.com/api-docs

# Test API endpoint
curl https://your-domain.com/api/v1/health
```

### 2. Performance Testing

```bash
# Install Apache Bench for basic load testing
sudo apt install apache2-utils -y

# Test API performance
ab -n 100 -c 10 https://your-domain.com/api/v1/health

# Test documentation performance
ab -n 100 -c 10 https://your-domain.com/docs
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check PM2 logs
pm2 logs zurihealth-hms

# Check system logs
sudo journalctl -u nginx -f
sudo tail -f /var/log/zurihealth-hms/error.log
```

#### 2. Database Connection Issues
```bash
# Test database connection
sudo -u postgres psql -d zurihealth_hms -c "SELECT version();"

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### 3. Documentation Not Loading
```bash
# Check if documentation is built
ls -la /var/www/zurihealth-hms/docs/build/

# Rebuild documentation
cd /var/www/zurihealth-hms
./scripts/build-docs.sh

# Restart application
pm2 restart zurihealth-hms
```

#### 4. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx configuration
sudo nginx -t
```

## Maintenance Tasks

### Daily Tasks
- Monitor system resources
- Check application logs
- Verify backup completion

### Weekly Tasks
- Update system packages
- Review security logs
- Test backup restoration

### Monthly Tasks
- Update application dependencies
- Review and rotate logs
- Performance optimization review

## Next Steps

After successful deployment:

1. **[Monitoring Setup](./monitoring.md)** - Comprehensive monitoring
2. **[SSL Configuration](./ssl-setup.md)** - Advanced SSL setup
3. **[Backup Strategy](./backup-strategy.md)** - Detailed backup procedures
4. **[Scaling Guide](./scaling.md)** - Horizontal and vertical scaling
5. **[Maintenance Guide](./maintenance.md)** - Ongoing maintenance tasks