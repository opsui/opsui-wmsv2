# CI/CD Pipeline Documentation

> **AI Context System - Deployment & Pipeline Standards**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **Purpose:** Document deployment processes, pipelines, and environments

---

## Deployment Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│   │  Local   │───►│   Test   │───►│    Prod  │                 │
│   │   Dev    │    │  Server  │    │  Server  │                 │
│   └──────────┘    └──────────┘    └──────────┘                 │
│        │               │               │                        │
│        ▼               ▼               ▼                        │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│   │ Localhost│    │  Remote  │    │  Remote  │                 │
│   │   :5173  │    │SSH Server│    │   SSH    │                 │
│   └──────────┘    └──────────┘    └──────────┘                 │
│                                                                 │
│   Frontend:    Frontend:        Frontend:                       │
│   Localhost    Cloudflare       Cloudflare                      │
│                 Pages            Pages                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Environment Separation

| Environment | Frontend URL | Backend URL | Database |
|-------------|--------------|-------------|----------|
| Development | `http://localhost:5173` | `http://localhost:3001` | `wms_db` (local tunnel) |
| Staging | `https://staging.wms.example.com` | `http://103.208.85.233:3001` | `wms_db` (test data) |
| Production | `https://wms.example.com` | `http://103.208.85.233:3001` | `wms_db` + `aap_db` |

---

## Frontend Deployment (Cloudflare Pages)

### Deployment Trigger

Frontend deploys automatically on:
- Push to `main` branch
- Manual trigger via Cloudflare dashboard

### Build Configuration

```yaml
# Cloudflare Pages Settings
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: packages/frontend
Node.js version: 20.x
```

### Environment Variables (Cloudflare)

```
VITE_API_URL=https://api.wms.example.com
VITE_WS_URL=wss://api.wms.example.com/ws
```

### Deployment Process

```bash
# Automatic deployment
git push origin main

# Manual deployment (if needed)
cd packages/frontend
npm run build
# Cloudflare automatically detects and deploys
```

### Cloudflare Pages Configuration

```toml
# packages/frontend/wrangler.toml
name = "wms-frontend"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

---

## Backend Deployment (Remote SSH Server)

### Server Information

| Property | Value |
|----------|-------|
| Host | `103.208.85.233` |
| User | `root` |
| Process Manager | PM2 |
| API Port | 3001 |
| WebSocket Port | 3002 |

### Deployment Process

```bash
# 1. Build locally
cd packages/backend
npm run build

# 2. Create deployment archive
tar -czvf backend-dist.tar.gz dist/ node_modules/ package.json .env

# 3. Transfer to server
scp backend-dist.tar.gz root@103.208.85.233:/root/opsui/

# 4. SSH to server and deploy
ssh root@103.208.85.233

# On server:
cd /root/opsui
tar -xzvf backend-dist.tar.gz
pm2 restart wms-backend
pm2 logs wms-backend
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'wms-backend',
    script: 'dist/index.js',
    cwd: '/root/opsui/packages/backend',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      WS_PORT: 3002
    },
    error_file: '/var/log/wms/error.log',
    out_file: '/var/log/wms/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
  }]
};
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/wms
server {
    listen 80;
    server_name api.wms.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.wms.example.com;

    ssl_certificate /etc/letsencrypt/live/api.wms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.wms.example.com/privkey.pem;

    # API Proxy
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Proxy
    location /ws {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## Database Migration Process

### Development Migrations

```bash
# Create migration
cd packages/backend
npm run migration:create -- --name add_new_table

# Run migrations (local)
npm run migration:up

# Rollback last migration
npm run migration:down
```

### Production Migrations

```bash
# 1. Backup database
ssh root@103.208.85.233
pg_dump -U wms_user wms_db > /backup/wms_db_$(date +%Y%m%d).sql

# 2. Run migrations on server
cd /root/opsui/packages/backend
npm run migration:up

# 3. Verify migration
psql -U wms_user -d wms_db -c "SELECT * FROM schema_migrations;"

# 4. If rollback needed
npm run migration:down
```

### Migration Safety Rules

1. **Always backup** before production migrations
2. **Test migrations** on a staging environment first
3. **Use transactions** for data modifications
4. **Provide rollback scripts** for all migrations
5. **Never modify existing columns** without backup

---

## Rollback Procedures

### Frontend Rollback

```bash
# Cloudflare Pages - Rollback via Dashboard
# 1. Go to Cloudflare Pages → wms-frontend → Deployments
# 2. Find previous working deployment
# 3. Click "Rollback to this deployment"
```

### Backend Rollback

```bash
# 1. SSH to server
ssh root@103.208.85.233

# 2. Stop current version
pm2 stop wms-backend

# 3. Restore previous version
cd /root/opsui/backups
tar -xzvf backend-backup-TIMESTAMP.tar.gz -C /root/opsui/

# 4. Restart
pm2 start wms-backend

# 5. Verify
curl http://localhost:3001/api/health
```

### Database Rollback

```bash
# Restore from backup
psql -U wms_user -d wms_db < /backup/wms_db_20240115.sql

# Or rollback specific migration
cd /root/opsui/packages/backend
npm run migration:down -- --to 20240101000000
```

---

## Health Checks & Monitoring

### Application Health

```bash
# Check backend health
curl http://103.208.85.233:3001/api/health

# Check detailed health
curl http://103.208.85.233:3001/api/health/detailed
```

### Process Monitoring

```bash
# PM2 status
pm2 status

# PM2 logs
pm2 logs wms-backend --lines 100

# PM2 memory usage
pm2 monit
```

### System Monitoring

```bash
# Server resources
htop

# Disk space
df -h

# Memory
free -m

# Network connections
netstat -tulpn | grep -E '3001|3002|5432'
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass locally
- [ ] Build succeeds without errors
- [ ] Environment variables are set
- [ ] Database migrations are ready
- [ ] Rollback plan is documented

### Frontend Deployment

- [ ] Push to `main` branch
- [ ] Cloudflare Pages build succeeds
- [ ] Frontend loads correctly
- [ ] API calls work
- [ ] WebSocket connections work

### Backend Deployment

- [ ] Build backend locally
- [ ] Create deployment archive
- [ ] Transfer to server
- [ ] Backup current version
- [ ] Deploy new version
- [ ] Restart PM2 process
- [ ] Verify health check returns 200
- [ ] Check logs for errors
- [ ] Test critical API endpoints

### Post-Deployment

- [ ] Monitor logs for 15 minutes
- [ ] Test critical user flows
- [ ] Verify database connections
- [ ] Check external integrations
- [ ] Update deployment documentation

---

## CI/CD Pipeline (Recommended)

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run build

  deploy-frontend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build --workspace=packages/frontend
      # Cloudflare Pages deploys automatically on push to main
      # No additional steps needed

  deploy-backend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build --workspace=packages/backend
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /root/opsui
            git pull origin main
            npm ci
            npm run build --workspace=packages/backend
            pm2 restart wms-backend
            pm2 save
```

---

## Security Considerations

### SSH Access

- Use SSH keys, not passwords
- Restrict access by IP if possible
- Use non-root user for deployments
- Audit SSH access logs

### Environment Secrets

- Never commit secrets to repository
- Use GitHub Secrets for CI/CD
- Rotate credentials regularly
- Use different credentials per environment

### Database Access

- Restrict database access to application server
- Use strong passwords
- Enable SSL for connections
- Regular backups with encryption

---

## Summary

| Component | Deployment Method | Frequency |
|-----------|-------------------|-----------|
| Frontend | Cloudflare Pages (auto) | Every push to main |
| Backend | SSH + PM2 | Manual |
| Database | Manual migrations | As needed |
| Config | Environment variables | Manual |

**Key Points:**
1. Frontend and backend deploy **independently**
2. Frontend is **NOT** deployed to the backend server
3. Database migrations require **manual execution**
4. Always have a **rollback plan**