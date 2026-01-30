# WMS Deployment Guide

This guide covers deploying the Warehouse Management System to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Software

- **Node.js**: v18.x or later
- **PostgreSQL**: v14.x or later
- **Redis**: v6.x or later (optional, for caching)
- **Docker**: v20.x or later (for containerized deployment)
- **Git**: For cloning the repository

### System Requirements

| Component | Minimum                    | Recommended      |
| --------- | -------------------------- | ---------------- |
| CPU       | 2 cores                    | 4+ cores         |
| RAM       | 4 GB                       | 8+ GB            |
| Disk      | 20 GB                      | 50+ GB SSD       |
| Database  | 100 concurrent connections | 500+ connections |

---

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/wms.git
cd wms
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Install package-specific dependencies
npm install --workspace=packages/backend
npm install --workspace=packages/frontend
npm install --workspace=packages/shared
```

### 3. Configure Environment Variables

```bash
# Copy example environment files
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# Edit with your values
nano packages/backend/.env
```

### 4. Initialize Database

```bash
# Create database
createdb wms_dev

# Run migrations
cd packages/backend
npm run db:migrate

# Seed data
npm run db:seed
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd packages/backend
npm run dev

# Terminal 2: Frontend
cd packages/frontend
npm run dev

# Terminal 3: WebSocket (optional, auto-started by backend)
# WebSocket server starts on WS_PORT (default 3002)
```

### 6. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3002
- Admin credentials: `admin` / `admin123` (change after first login)

---

## Staging Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Application Setup

```bash
# Clone repository
sudo mkdir -p /var/www/wms
sudo chown $USER:$USER /var/www/wms
git clone https://github.com/your-org/wms.git /var/www/wms
cd /var/www/wms

# Install dependencies
npm install --workspace=packages/backend
npm install --workspace=packages/frontend
npm install --workspace=packages/shared

# Build frontend
cd packages/frontend
npm run build
```

### 3. Database Configuration

```bash
# Create database
sudo -u postgres createdb wms_staging

# Create user
sudo -u postgres createuser --pwprompt wms_staging

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wms_staging TO wms_staging;"

# Run migrations
cd /var/www/wms/packages/backend
npm run db:migrate

# Seed data
npm run db:seed
```

### 4. Environment Configuration

```bash
# Create staging environment
cat > /var/www/wms/packages/backend/.env << EOF
NODE_ENV=staging
PORT=3001
HOST=0.0.0.0
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wms_staging
DB_USER=wms_staging
DB_PASSWORD=your_secure_password
JWT_SECRET=$(openssl rand -hex 32)
LOG_LEVEL=info
EOF

# Secure the file
chmod 600 /var/www/wms/packages/backend/.env
```

### 5. Process Management with PM2

```bash
# Create ecosystem file
cat > /var/www/wms/ecosystem.config.cjs << EOF
module.exports = {
  apps: [
    {
      name: 'wms-backend',
      script: './packages/backend/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env_file: './packages/backend/.env',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

# Start application
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 6. Nginx Configuration

```bash
# Create Nginx config
sudo cat > /etc/nginx/sites-available/wms-staging << EOF
server {
    listen 80;
    server_name staging.wms.example.com;

    # Frontend static files
    location / {
        root /var/www/wms/packages/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/wms-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Production Deployment

### Security Hardening

```bash
# Set up firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Install fail2ban
sudo apt install -y fail2ban
```

### SSL Certificate Setup

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d wms.example.com

# Auto-renewal (configured by certbot)
sudo certbot renew --dry-run
```

### Production Nginx Configuration

```bash
sudo cat > /etc/nginx/sites-available/wms-production << EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name wms.example.com;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name wms.example.com;

    ssl_certificate /etc/letsencrypt/live/wms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wms.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend static files
    location / {
        root /var/www/wms/packages/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/wms-production /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Database Backup Setup

```bash
# Create backup script
cat > /home/wms/backup-db.sh << EOF
#!/bin/bash
BACKUP_DIR="/backups/wms"
DATE=\$(date +%Y%m%d_%H%M%S)
mkdir -p \$BACKUP_DIR

pg_dump -U wms_production -h localhost wms_production | gzip > \$BACKUP_DIR/wms_\$DATE.sql.gz

# Keep only last 7 days of backups
find \$BACKUP_DIR -name "wms_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /home/wms/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/wms/backup-db.sh") | crontab -
```

---

## Docker Deployment

### Docker Compose Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: wms-postgres
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./packages/backend/src/db/migrations:/docker-entrypoint-initdb.d
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER}']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:6-alpine
    container_name: wms-redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./packages/backend
      dockerfile: Dockerfile
    container_name: wms-backend
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    env_file:
      - ./packages/backend/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - '3001:3001'
    restart: unless-stopped

  frontend:
    build:
      context: ./packages/frontend
      dockerfile: Dockerfile
    container_name: wms-frontend
    environment:
      - VITE_API_BASE_URL=http://localhost:3001
    ports:
      - '80:80'
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Building and Running

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run db:migrate

# Seed data
docker-compose exec backend npm run db:seed

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Health Checks

### Application Health Endpoint

```bash
curl https://wms.example.com/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "websocket": "ok"
  }
}
```

### Database Health Check

```bash
# Check PostgreSQL
pg_isready -h localhost -p 5432

# Check connection count
psql -U wms_production -c "SELECT count(*) FROM pg_stat_activity;"
```

### Redis Health Check

```bash
# Check Redis
redis-cli ping

# Check memory usage
redis-cli INFO memory
```

### PM2 Process Health

```bash
# Check status
pm2 status

# View logs
pm2 logs wms-backend

# Restart if needed
pm2 restart wms-backend
```

---

## Monitoring

### Application Metrics

Monitor these key metrics:

| Metric         | Tool             | Threshold     |
| -------------- | ---------------- | ------------- |
| Response time  | APM / Nginx logs | < 500ms (p95) |
| Error rate     | Application logs | < 1%          |
| CPU usage      | top / htop       | < 80%         |
| Memory usage   | free / top       | < 80%         |
| Disk usage     | df -h            | < 90%         |
| DB connections | pg_stat_activity | < 80% of max  |
| Redis memory   | redis-cli INFO   | < 80% of max  |

### Log Monitoring

```bash
# Application logs
tail -f /var/www/wms/logs/combined.log

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log

# PM2 logs
pm2 logs --lines 100
```

### Setting Up Alerts

Consider using monitoring tools:

- **Prometheus + Grafana**: Metrics and dashboards
- **ELK Stack**: Log aggregation and analysis
- **Sentry**: Error tracking
- **Uptime Robot**: External uptime monitoring

---

## Rollback Procedures

### Database Rollback

```bash
# List migrations
npm run db:migrate:status

# Rollback last migration
npm run db:migrate:rollback

# Rollback to specific version
npm run db:migrate:rollback -- --to=20240101000000
```

### Application Rollback

```bash
# With Git
git log --oneline -10
git checkout <previous-commit>
npm install
npm run build
pm2 restart wms-backend

# With PM2 (if previous version is saved)
pm2 restart wms-backend --update-env
```

### Emergency Rollback

```bash
# Stop current services
pm2 stop wms-backend

# Restore from backup
gunzip -c /backups/wms/wms_YYYYMMDD_HHMMSS.sql.gz | psql -U wms_production wms_production

# Restart with previous version
cd /var/www/wms
git checkout <previous-tag>
npm install
npm run build
pm2 start wms-backend
```

---

## Post-Deployment Checklist

- [ ] All services running (backend, frontend, websocket)
- [ ] Health check endpoint returns OK
- [ ] Database migrations applied
- [ ] SSL certificate valid
- [ ] Environment variables set correctly
- [ ] Logs showing no errors
- [ ] User can login successfully
- [ ] Real-time features working
- [ ] Backups configured
- [ ] Monitoring configured
- [ ] Rate limiting active
- [ ] CORS configured correctly

---

## Troubleshooting

### Common Issues

**Service won't start:**

```bash
# Check logs
pm2 logs wms-backend --lines 50

# Check port availability
sudo lsof -i :3001
```

**Database connection failed:**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U wms_production -h localhost -d wms_production
```

**WebSocket not connecting:**

```bash
# Check WebSocket process
pm2 status

# Check port
sudo lsof -i :3002

# Verify configuration
grep WS_PORT /var/www/wms/packages/backend/.env
```

### Getting Help

- Check logs: `/var/www/wms/logs/`
- Review documentation: [docs/](../)
- Check issues: [GitHub Issues](https://github.com/your-org/wms/issues)

---

## Additional Resources

- [Configuration Guide](./CONFIGURATION.md)
- [API Documentation](../packages/backend/docs/API.md)
- [Database Schema](../packages/backend/docs/DATABASE_SCHEMA.md)
