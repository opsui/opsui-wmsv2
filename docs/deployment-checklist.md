# Deployment Checklist

## Pre-Deployment

### Environment Validation

- [ ] Confirm target server: `ssh root@103.208.85.233`
- [ ] Verify environment: production/staging
- [ ] Check disk space: `df -h`
- [ ] Check memory: `free -m`
- [ ] Verify PostgreSQL running: `systemctl status postgresql`

### Database Validation

- [ ] Print target database:
  ```
  TARGET DATABASE: 103.208.85.233:5432/wms_db
  ENVIRONMENT: production
  ```
- [ ] Verify NOT localhost/127.0.0.1/::1
- [ ] Create database backup:
  ```bash
  pg_dump -h 103.208.85.233 -U wms_user wms_db > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup integrity
- [ ] Check schema drift: `npm run db:validate`
- [ ] Review pending migrations: `npm run db:status`

### Code Validation

- [ ] All tests passing: `npm test`
- [ ] TypeScript compiles: `npm run build`
- [ ] No console.log left in code
- [ ] No hardcoded credentials
- [ ] Environment variables documented
- [ ] Changelog updated

### PM2 Validation

- [ ] Check current PM2 status: `pm2 status`
- [ ] Note current process IDs
- [ ] Verify ecosystem.config.js port matches expected (3001)

## Deployment Steps

### 1. Pull Latest Code

```bash
ssh root@103.208.85.233
cd /path/to/wms
git fetch origin
git checkout main
git pull origin main
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Run Database Migrations (if any)

```bash
# Validate target
echo "TARGET DATABASE: 103.208.85.233:5432/wms_db"
echo "ENVIRONMENT: production"

# Check pending migrations
npm run db:status

# Run migrations
npm run db:migrate
```

**CRITICAL:** PM2 restarts must NEVER run migrations automatically.

### 4. Build Application

```bash
npm run build
```

### 5. Restart PM2

```bash
pm2 restart wms-backend
pm2 save
```

### 6. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs wms-backend --lines 50

# Health check
curl http://localhost:3001/health

# Check database connection
curl http://localhost:3001/api/health/db
```

## Post-Deployment

### Immediate Checks

- [ ] PM2 status shows "online"
- [ ] No errors in PM2 logs
- [ ] Health endpoint returns 200
- [ ] Database connection successful
- [ ] API responds to test request

### Monitoring (First 5 Minutes)

- [ ] Monitor PM2 logs: `pm2 logs wms-backend`
- [ ] Check memory usage: `pm2 monit`
- [ ] Verify WebSocket connections (if applicable)
- [ ] Test critical API endpoints

### Monitoring (First Hour)

- [ ] Check error rates
- [ ] Verify background jobs running
- [ ] Monitor database connections
- [ ] Check response times

## Rollback Procedure

If deployment fails:

### 1. Stop Current Version

```bash
pm2 stop wms-backend
```

### 2. Restore Database (if migrations ran)

```bash
# Drop and restore from backup
psql -h 103.208.85.233 -U wms_user wms_db < backup_YYYYMMDD_HHMMSS.sql
```

### 3. Revert Code

```bash
git checkout <previous-commit>
npm install --production
npm run build
```

### 4. Restart

```bash
pm2 restart wms-backend
```

### 5. Document

- Record rollback reason
- Document what failed
- Create incident report

## Forbidden During Deployment

- DO NOT run destructive migrations without backup
- DO NOT skip pre-deployment validation
- DO NOT deploy without rollback plan
- DO NOT let PM2 auto-run migrations
- DO NOT change ports during deployment
- DO NOT modify database directly

## Emergency Contacts

- Server Access: `ssh root@103.208.85.233`
- Database Admin: [Contact info]
- DevOps Lead: [Contact info]

## Server Transfer Procedure

For migrating to new server:

```bash
# On new server
ssh root@<new-server>

# Restore backup OR run migrations + seed
psql -U wms_user wms_db < backup_YYYYMMDD.sql
# OR
npm run db:migrate
npm run db:seed

# Validate schema sync
npm run db:validate

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```
