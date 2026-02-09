# Rollback Runbook

## Overview

This runbook provides procedures for rolling back the Warehouse Management System to a previous version.

**When to use this runbook:**

- Deployment fails health checks
- Critical bugs discovered post-deployment
- Performance degradation
- Data corruption issues
- Security vulnerability detected

**Rollback Time Objective (RTO):** 5 minutes
**Rollback Point Objective (RPO):** Minimal data loss

---

## Pre-Rollback Checklist

- [ ] Confirm rollback is necessary
- [ ] Identify previous stable version
- [ ] Notify stakeholders of rollback
- [ ] Check database backup availability
- [ ] Prepare rollback commands
- [ ] Assign rollback commander

---

## Quick Rollback (Kubernetes)

### Automatic Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/backend -n production
kubectl rollout undo deployment/frontend -n production

# Watch rollback progress
kubectl rollout status deployment/backend -n production
kubectl rollout status deployment/frontend -n production
```

### Rollback to Specific Version

```bash
# View rollout history
kubectl rollout history deployment/backend -n production

# Rollback to specific revision
kubectl rollout undo deployment/backend -n production --to-revision=3
kubectl rollout undo deployment/frontend -n production --to-revision=3
```

### Verify Rollback

```bash
# Check pods
kubectl get pods -n production

# Check logs
kubectl logs -n production -l app=backend --tail=50

# Run health check
curl https://api.wms.example.com/health
```

---

## Full Rollback Procedure

### Step 1: Assess Current State

```bash
# Check deployment status
kubectl get deployments -n production
kubectl get pods -n production

# Check current version
kubectl describe deployment backend -n production | grep Image

# Check for errors
kubectl logs -n production -l app=backend --tail=100 | grep -i error
```

### Step 2: Identify Stable Version

```bash
# View rollout history
kubectl rollout history deployment/backend -n production

# Recent versions:
# REVISION  STATUS  DESCRIPTION
# 5         Running  Deployed version abc1234
# 4         Complete Deployed version def5678 (stable)
# 3         Complete Deployed version ghi9012 (stable)
```

### Step 3: Create Backup Before Rollback

```bash
# Backup current state
export BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
PG_POD=$(kubectl get pod -n production -l app=postgres -o jsonpath='{.items[0].metadata.name}')
kubectl exec ${PG_POD} -n production -- pg_dump -U wms_user wms_db > rollback-backup-${BACKUP_DATE}.sql

# Backup ConfigMaps
kubectl get configmap -n production -o yaml > configmap-backup-${BACKUP_DATE}.yaml

# Backup Secrets
kubectl get secret -n production -o yaml > secret-backup-${BACKUP_DATE}.yaml
```

### Step 4: Rollback Application

```bash
# Rollback backend
kubectl rollout undo deployment/backend -n production --to-revision=4

# Rollback frontend
kubectl rollout undo deployment/frontend -n production --to-revision=4

# Wait for rollback
kubectl rollout status deployment/backend -n production --timeout=300s
kubectl rollout status deployment/frontend -n production --timeout=300s
```

### Step 5: Rollback Database (If Needed)

```bash
# Check if data migration needs rollback
kubectl exec <backend-pod> -n production -- npm run db:migrate:status

# Rollback last migration
kubectl exec <backend-pod> -n production -- npm run db:migrate:rollback

# Or restore from backup
kubectl exec ${PG_POD} -n production -- psql -U wms_user wms_db < backup-stable-version.sql
```

### Step 6: Verify Rollback

```bash
# Health check
curl https://api.wms.example.com/health

# Smoke tests
npm run test:smoke -- --env=production

# Check logs
kubectl logs -n production -l app=backend --tail=100

# Verify no errors
kubectl logs -n production -l app=backend --tail=100 | grep -i error || echo "No errors found"
```

---

## Emergency Rollback

### If Automatic Rollback Fails

```bash
# 1. Scale down to zero
kubectl scale deployment backend -n production --replicas=0
kubectl scale deployment frontend -n production --replicas=0

# 2. Update deployment with previous image
kubectl set image deployment/backend backend=ghcr.io/your-org/wms-backend:stable-version -n production
kubectl set image deployment/frontend frontend=ghcr.io/your-org/wms-frontend:stable-version -n production

# 3. Scale back up
kubectl scale deployment backend -n production --replicas=3
kubectl scale deployment frontend -n production --replicas=2

# 4. Wait for rollout
kubectl rollout status deployment/backend -n production
kubectl rollout status deployment/frontend -n production
```

### Complete System Revert

```bash
# 1. Delete current resources
kubectl delete deployment backend -n production
kubectl delete deployment frontend -n production

# 2. Apply previous version manifests
kubectl apply -f k8s/backend-deployment-stable.yaml -n production
kubectl apply -f k8s/frontend-deployment-stable.yaml -n production

# 3. Restore database from backup
kubectl exec ${PG_POD} -n production -- psql -U wms_user wms_db < backup-stable.sql

# 4. Verify
kubectl get pods -n production
curl https://api.wms.example.com/health
```

---

## Post-Rollback Verification

### System Health

- [ ] All pods running
- [ ] Health endpoint OK
- [ ] No errors in logs
- [ ] Metrics normal

### Functionality

- [ ] Users can login
- [ ] Orders can be created
- [ ] Inventory updates work
- [ ] Real-time features work

### Data Integrity

- [ ] Database consistent
- [ ] No missing transactions
- [ ] Cache populated

---

## Rollback Communication

### During Rollback

**Notify:**

- #engineering
- #incident-response
- Stakeholders (via email/Slack)

**Message:**

```
ROLLBACK IN PROGRESS
━━━━━━━━━━━━━━━━━━
Environment: Production
Previous Version: abc1234
Rolling Back To: def5678
Reason: [brief reason]
Started: [timestamp]
ETA: 5 minutes
```

### Post-Rollback Success

**Message:**

```
ROLLBACK COMPLETE
━━━━━━━━━━━━━━━━
Environment: Production
Current Version: def5678
Status: Operational
All health checks passing
```

### Post-Rollback Issues

**Message:**

```
ROLLBACK ISSUES DETECTED
━━━━━━━━━━━━━━━━━━━━━
Environment: Production
Current Version: def5678
Issues: [describe issues]
Actions: [being taken]
Next Update: [time]
```

---

## Common Rollback Scenarios

### Scenario 1: Application Error

**Symptoms:**

- API returning 500 errors
- Application crash loops

**Actions:**

```bash
# Quick rollback
kubectl rollout undo deployment/backend -n production

# Check logs
kubectl logs -n production -l app=backend --tail=100

# Verify
curl https://api.wms.example.com/health
```

### Scenario 2: Database Migration Failure

**Symptoms:**

- Migration errors
- Data inconsistency

**Actions:**

```bash
# Rollback migration
kubectl exec <pod> -n production -- npm run db:migrate:rollback

# Or restore from backup
kubectl exec ${PG_POD} -n production -- psql -U wms_user wms_db < backup-pre-migration.sql
```

### Scenario 3: Performance Degradation

**Symptoms:**

- High latency
- Timeout errors
- High CPU/memory

**Actions:**

```bash
# Rollback application
kubectl rollout undo deployment/backend -n production

# If persists, scale resources
kubectl scale deployment backend -n production --replicas=5

# Or adjust resource limits
kubectl edit deployment backend -n production
```

### Scenario 4: Data Corruption

**Symptoms:**

- Missing data
- Incorrect calculations
- Validation errors

**Actions:**

```bash
# IMMEDIATE: Stop all writes
kubectl scale deployment backend -n production --replicas=0

# Restore database from backup
kubectl exec ${PG_POD} -n production -- psql -U wms_user wms_db < backup-before-issue.sql

# Start application
kubectl scale deployment backend -n production --replicas=3

# Verify data integrity
npm run test:data-integrity
```

---

## Rollback Decision Tree

```
Is system operational?
│
├─ No → Is health check failing?
│   │
│   ├─ Yes → Quick rollback (kubectl rollout undo)
│   │
│   └─ No → Are there API errors?
│       │
│       ├─ Yes → Check logs → Identify issue → Rollback if needed
│       │
│       └─ No → Is performance degraded?
│           │
│           ├─ Yes → Rollback or scale resources
│           │
│           └─ No → Monitor closely
│
└─ Yes → Are there data issues?
    │
    ├─ Yes → Stop writes → Restore backup
    │
    └─ No → Continue monitoring
```

---

## Post-Rollback Actions

### Document Incident

1. Create incident report
2. Document root cause
3. Record rollback actions
4. Note successful actions
5. Identify improvements needed

### Prevent Recurrence

1. Add test for issue
2. Update deployment checklist
3. Improve monitoring
4. Update runbook
5. Team retro

### Follow Up

1. Monitor system stability
2. Check data consistency
3. Verify all features working
4. Communicate resolution
5. Schedule fix deployment

---

## Escalation During Rollback

### Immediate (< 5 min)

- On-call engineer leads rollback
- #incident-response channel active

### Extended (> 15 min)

- Senior engineer assists
- Engineering manager notified
- Stakeholder updates

### Critical (> 30 min)

- CTO notified
- Incident declared
- Customer communication if needed

---

## Related Runbooks

- [Deployment Runbook](./deployment.md)
- [Incident Response Runbook](./incident-response.md)
- [Database Maintenance Runbook](./database-maintenance.md)

---

**Last Updated**: 2024-01-09
**Version**: 1.0.0

**Remember:** Speed is critical during rollback. When in doubt, rollback first, investigate later.
