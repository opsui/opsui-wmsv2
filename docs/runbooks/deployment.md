# Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying the Warehouse Management System to production.

**Production Server:** `ssh root@103.208.85.233`

**Before starting deployment:**

- Ensure all pre-deployment checks have passed
- Notify stakeholders of planned deployment
- Have rollback plan ready
- Schedule during low-traffic window if applicable

---

## Pre-Deployment Checklist

- [ ] All CI/CD checks passed (tests, lint, security scan)
- [ ] Code review approved
- [ ] Database migrations reviewed
- [ ] Environment variables prepared
- [ ] Backup of current deployment taken
- [ ] Rollback plan documented
- [ ] Monitoring dashboards ready
- [ ] Team available for support

---

## Manual Deployment (PM2)

### Step 1: SSH to Production Server

```bash
ssh root@103.208.85.233
cd /var/www/wms
```

### Step 2: Create Database Backup

```bash
# Create backup
pg_dump -U wms_user -h localhost wms_db | gzip > /backups/wms/pre-deploy-$(date +%Y%m%d-%H%M%S).sql.gz

# Verify backup
ls -la /backups/wms/
```

### Step 3: Pull Latest Code

```bash
# Fetch and pull
git fetch origin
git checkout main
git pull origin main

# Verify version
git log --oneline -1
```

### Step 4: Install Dependencies and Build

```bash
# Install dependencies
npm ci

# Build shared package first
npm run build --workspace=packages/shared

# Build backend
npm run build --workspace=packages/backend

# Build frontend
npm run build --workspace=packages/frontend
```

### Step 5: Run Database Migrations

```bash
cd packages/backend

# Check migration status
npm run db:migrate:status

# Run pending migrations
npm run db:migrate

# Verify migrations
npm run db:migrate:status
```

### Step 6: Restart PM2

```bash
# Restart backend
pm2 restart wms-backend

# Check status
pm2 status

# Check logs
pm2 logs wms-backend --lines 50
```

### Step 7: Verify Deployment

```bash
# Health check
curl http://localhost:3001/health

# Check logs for errors
pm2 logs wms-backend --lines 100 | grep -i error
```

---

## Post-Deployment Verification

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Expected output:
# {"status":"healthy","timestamp":"2024-01-01T00:00:00.000Z"}

# Check PM2 status
pm2 status
```

### Smoke Tests

```bash
# Test authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wms.local","password":"admin123"}'

# Test API endpoint (with token)
curl http://localhost:3001/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Deployment Success Criteria

Deployment is considered successful when:

- [ ] PM2 shows "online" status
- [ ] Health endpoint returns 200 OK
- [ ] All smoke tests pass
- [ ] Error rate < 1%
- [ ] No errors in logs
- [ ] Database metrics normal

---

## Common Issues and Solutions

### Issue: Backend Won't Start

**Symptoms:**

- PM2 shows "errored" status
- Port already in use

**Solutions:**

```bash
# Check logs
pm2 logs wms-backend --lines 100

# Check port
lsof -i :3001

# Kill process if needed
kill -9 <PID>

# Restart
pm2 restart wms-backend
```

### Issue: Database Migration Fails

**Symptoms:**

- Migration errors in logs
- API returns 500 errors

**Solutions:**

```bash
# Check migration status
npm run db:migrate:status

# Manual rollback
npm run db:migrate:rollback

# Restore from backup
gunzip -c /backups/wms/pre-deploy-*.sql.gz | psql -U wms_user wms_db
```

### Issue: High Memory/CPU Usage

**Symptoms:**

- Server slow
- Out of memory errors

**Solutions:**

```bash
# Check resource usage
top
free -m

# Restart PM2
pm2 restart wms-backend

# Check PM2 memory
pm2 monit
```

---

## Rollback

If deployment fails:

```bash
# Stop current version
pm2 stop wms-backend

# Restore database (if migrations ran)
gunzip -c /backups/wms/pre-deploy-*.sql.gz | psql -U wms_user wms_db

# Revert code
git checkout <previous-commit>
npm ci
npm run build

# Restart
pm2 restart wms-backend
```

---

## Communication

### Pre-Deployment

- Notify: #engineering channel
- Message: "Deploying v{VERSION} to production in 10 minutes"

### Post-Deployment Success

- Notify: #engineering channel
- Message: "Deployment v{VERSION} successful. All systems operational."

### Post-Deployment Failure

- Notify: #engineering, #incident-response
- Message: "Deployment v{VERSION} failed. Rolling back. Estimating ETA: 5 minutes"

---

**Last Updated**: 2024-02-14
**Version**: 2.0.0
