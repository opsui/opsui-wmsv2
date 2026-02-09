# Database Maintenance Runbook

## Overview

This runbook provides procedures for maintaining the PostgreSQL database used by the Warehouse Management System.

**Maintenance Windows:**

- Daily backups: 2:00 AM UTC
- Weekly vacuum: Sunday 3:00 AM UTC
- Monthly reindex: First Sunday 4:00 AM UTC
- Quarterly statistics update

---

## Prerequisites

### Required Tools

```bash
# PostgreSQL client
psql --version

# kubectl (for Kubernetes)
kubectl version --client
```

### Access Requirements

- Database admin access
- kubectl cluster admin access
- Backup storage access

---

## Routine Maintenance Tasks

### Daily: Backup Verification

**Time:** Daily at 2:00 AM UTC (automated)
**Duration:** ~5 minutes

```bash
# Check last backup time
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT *
  FROM pg_stat_backup
  ORDER BY start_time DESC
  LIMIT 1;
"

# Verify backup size
kubectl get configmap -n production -l backup -o jsonpath='{.items[0].metadata.name}'
```

**Manual Verification:**

```bash
# Test restore to temporary database
kubectl exec postgres-0 -n production -- psql -U wms_user -d postgres -c "
  CREATE DATABASE test_restore;
"

kubectl exec postgres-0 -n production -- psql -U wms_user -d test_restore < backup.sql

# Verify table count
kubectl exec postgres-0 -n production -- psql -U wms_user -d test_restore -c "
  SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
"

# Cleanup
kubectl exec postgres-0 -n production -- psql -U wms_user -d postgres -c "
  DROP DATABASE test_restore;
"
```

### Weekly: Database Vacuum

**Time:** Sunday 3:00 AM UTC
**Duration:** ~30 minutes (varies by data size)

```bash
# Connect to database
kubectl exec -it postgres-0 -n production -- psql -U wms_user -d wms_db

# Run vacuum analyze
VACUUM ANALYZE;

# Vacuum specific tables if needed
VACUUM ANALYZE orders;
VACUUM ANALYZE inventory;
VACUUM ANALYZE audit_log;

# Check table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Weekly: Statistics Update

**Time:** Sunday 3:30 AM UTC (after vacuum)
**Duration:** ~10 minutes

```bash
# Update statistics
kubectl exec -it postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  ANALYZE;
"

# Check last statistics update
SELECT
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze,
  n_live_tup,
  n_dead_tup
FROM pg_stat_user_tables
ORDER BY last_autovacuum DESC;
```

### Monthly: Reindex

**Time:** First Sunday 4:00 AM UTC
**Duration:** ~1 hour (varies by data size)

```bash
# Check index fragmentation
kubectl exec -it postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
  AND idx_tup_read = 0
  AND idx_tup_fetch = 0
  ORDER BY schemaname, tablename, indexname;
"

# Reindex unused indexes (小心使用)
REINDEX INDEX CONCURRENTLY idx_orders_status;
REINDEX INDEX CONCURRENTLY idx_inventory_product;

# Reindex entire database (if needed, causes downtime)
# WARNING: Requires exclusive lock
# REINDEX DATABASE wms_db;
```

### Monthly: Statistics Cleanup

**Time:** First Sunday 5:00 AM UTC
**Duration:** ~5 minutes

```bash
# Cleanup old statistics
kubectl exec -it postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  DELETE FROM pg_stat_statements WHERE calls < 10;
"
```

---

## Monitoring and Health Checks

### Database Connection Pool

```bash
# Check current connections
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT
    state,
    count(*) AS connections
  FROM pg_stat_activity
  GROUP BY state;
"

# Check max connections
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SHOW max_connections;
"

# Alert if > 80% of max connections
```

### Long-Running Queries

```bash
# Find queries running > 5 minutes
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state,
    wait_event_type,
    wait_event
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  ORDER BY duration DESC;
"

# Kill long-running query if needed
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE pid = <pid-to-kill>;
"
```

### Table Size Growth

```bash
# Check table sizes
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Alert if table > 10GB
```

### Index Usage

```bash
# Find unused indexes
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
  AND idx_tup_read = 0
  AND idx_tup_fetch = 0
  AND schemaname NOT IN ('pg_catalog', 'pg_toast')
  ORDER BY pg_relation_size(indexrelid) DESC;
"

# Consider dropping unused indexes to save space
```

---

## Backup and Restore

### On-Demand Backup

```bash
# Create backup
kubectl exec postgres-0 -n production -- pg_dump -U wms_user -d wms_db \
  --clean --if-exists \
  --format=custom \
  --file=/tmp/wms-backup-$(date +%Y%m%d_%H%M%S).dump

# Copy backup locally
kubectl cp production/postgres-0:/tmp/wms-backup-*.dump ./backups/

# Save as Kubernetes ConfigMap
kubectl create configmap db-backup-$(date +%Y%m%d) \
  --from-file=backup=./backups/wms-backup-*.dump \
  --namespace=production
```

### Restore from Backup

```bash
# List available backups
kubectl get configmap -n production -l backup

# Copy backup to pod
kubectl cp ./backups/wms-backup-20240109.dump production/postgres-0:/tmp/restore.dump

# Restore database
kubectl exec postgres-0 -n production -- pg_restore -U wms_user -d wms_db \
  --clean --if-exists \
  /tmp/restore.dump

# Or restore to new database
kubectl exec postgres-0 -n production -- psql -U wms_user -d postgres -c "
  DROP DATABASE IF EXISTS wms_restore;
  CREATE DATABASE wms_restore;
"

kubectl exec postgres-0 -n production -- pg_restore -U wms_user -d wms_restore \
  /tmp/restore.dump
```

---

## Performance Tuning

### Update PostgreSQL Configuration

```bash
# Edit configuration
kubectl edit statefulset postgres -n production

# Or create custom ConfigMap
kubectl create configmap postgres-config \
  --from-file=./postgres.conf \
  --namespace=production

# Update StatefulSet to use custom config
```

**Key Parameters:**

```ini
# postgres.conf
shared_buffers = 2GB              # 25% of RAM
effective_cache_size = 6GB        # 75% of RAM
work_mem = 64MB                    # per operation
maintenance_work_mem = 512MB
max_connections = 200
random_page_cost = 1.1             # For SSD
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100    # For large tables
```

### Restart PostgreSQL

```bash
# Graceful restart (causes brief downtime)
kubectl rollout restart statefulset postgres -n production

# Wait for restart
kubectl wait --for=condition=ready pod -l app=postgres -n production --timeout=300s
```

---

## Migration Management

### Run New Migrations

```bash
# Get backend pod
BACKEND_POD=$(kubectl get pod -n production -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec ${BACKEND_POD} -n production -- npm run db:migrate:all

# Check migration status
kubectl exec ${BACKEND_POD} -n production -- npm run db:migrate:status
```

### Rollback Migration

```bash
# Rollback last migration
kubectl exec ${BACKEND_POD} -n production -- npm run db:migrate:rollback

# Rollback to specific version
kubectl exec ${BACKEND_POD} -n production -- npm run db:migrate:rollback -- --to=20240101000000
```

---

## Troubleshooting

### Issue: Database Connection Pool Exhausted

**Symptoms:**

- API timeouts
- "Connection refused" errors
- High connection count

**Diagnosis:**

```bash
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT
    count(*) AS total_connections,
    count(*) FILTER (WHERE state = 'active') AS active,
    count(*) FILTER (WHERE state = 'idle') AS idle
  FROM pg_stat_activity;
"
```

**Solutions:**

```bash
# 1. Kill idle connections
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND state_change < now() - interval '10 minutes';
"

# 2. Increase max_connections (requires restart)
# Edit config and restart postgres

# 3. Scale up backend to reduce connection pressure
kubectl scale deployment backend -n production --replicas=5
```

### Issue: Slow Query Performance

**Symptoms:**

- API latency increase
- Database CPU high
- Long-running queries

**Diagnosis:**

```bash
# Enable query logging temporarily
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  ALTER DATABASE wms_db SET log_min_duration_statement = 1000;
"

# Check pg_stat_statements
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"
```

**Solutions:**

```bash
# 1. Run VACUUM ANALYZE
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "VACUUM ANALYZE;"

# 2. Reindex problematic tables
REINDEX INDEX CONCURRENTLY idx_<index_name>;

# 3. Add missing indexes
CREATE INDEX CONCURRENTLY idx_<table>_<column> ON <table>(<column>);
```

### Issue: Disk Space Full

**Symptoms:**

- Pod failures
- Unable to write data
- Database crashes

**Diagnosis:**

```bash
# Check disk usage
kubectl exec postgres-0 -n production -- df -h /var/lib/postgresql/data

# Check database size
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT pg_size_pretty(pg_database_size('wms_db'));
"
```

**Solutions:**

```bash
# 1. Clean old backups
kubectl get configmap -n production -l backup --no-headers | \
  awk '{print $1}' | \
  tail -n +10 | \
  xargs -I {} kubectl delete configmap {} -n production

# 2. VACUUM FULL (requires exclusive lock)
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  VACUUM FULL;
"

# 3. Expand PVC (if using dynamic provisioning)
kubectl edit pvc postgres-pvc -n production
# Change spec.resources.requests.storage
```

---

## Emergency Procedures

### Database Crash Recovery

```bash
# 1. Check pod status
kubectl get pods -n production -l app=postgres

# 2. Check logs
kubectl logs postgres-0 -n production

# 3. If pod is crash-looping:
kubectl delete pod postgres-0 -n production

# 4. If data corruption:
# Restore from backup (see Backup and Restore section)
```

### Data Corruption Recovery

```bash
# 1. Stop all writes
kubectl scale deployment backend -n production --replicas=0

# 2. Identify corruption
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT * FROM pg_stat_database_conflicts;
"

# 3. Restore from backup
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db < /tmp/clean-backup.sql

# 4. Restart applications
kubectl scale deployment backend -n production --replicas=3
```

---

## Maintenance Schedule

| Task                | Frequency | Time                   | Duration | Owner     |
| ------------------- | --------- | ---------------------- | -------- | --------- |
| Backup Verification | Daily     | 2:00 AM UTC            | 5 min    | Automated |
| Vacuum Analyze      | Weekly    | Sunday 3:00 AM UTC     | 30 min   | DBA       |
| Statistics Update   | Weekly    | Sunday 3:30 AM UTC     | 10 min   | DBA       |
| Reindex             | Monthly   | 1st Sunday 4:00 AM UTC | 1 hour   | DBA       |
| Statistics Cleanup  | Monthly   | 1st Sunday 5:00 AM UTC | 5 min    | DBA       |
| Password Rotation   | Quarterly | TBD                    | 30 min   | DBA       |

---

## Related Runbooks

- [Deployment Runbook](./deployment.md)
- [Rollback Runbook](./rollback.md)
- [Incident Response Runbook](./incident-response.md)

---

**Last Updated**: 2024-01-09
**Version**: 1.0.0
