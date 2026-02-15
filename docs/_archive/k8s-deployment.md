# Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying the Warehouse Management System to production.

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

## Automated Deployment (GitHub Actions)

### Step 1: Trigger Deployment

1. Merge PR to `main` branch
2. Navigate to [GitHub Actions](https://github.com/your-org/wms/actions)
3. Find the "CD" workflow run
4. Monitor deployment progress

### Step 2: Approve Production Deployment

1. Staging deployment runs automatically
2. Wait for staging smoke tests to pass
3. Click "Approve" button for production deployment
4. Monitor production deployment logs

### Step 3: Verify Deployment

See [Post-Deployment Verification](#post-deployment-verification) below

---

## Manual Deployment (Kubernetes)

### Step 1: Prepare Environment

```bash
# Set environment
export ENVIRONMENT=production
export VERSION=$(git rev-parse --short HEAD)
export NAMESPACE=wms-${ENVIRONMENT}

# Verify kubectl context
kubectl config current-context
kubectl cluster-info
```

### Step 2: Build and Push Images

```bash
# Set registry
export REGISTRY=ghcr.io/your-org
export IMAGE_NAME=wms

# Build backend image
docker build -f packages/backend/Dockerfile -t ${REGISTRY}/${IMAGE_NAME}-backend:${VERSION} .
docker push ${REGISTRY}/${IMAGE_NAME}-backend:${VERSION}

# Build frontend image
docker build -f packages/frontend/Dockerfile -t ${REGISTRY}/${IMAGE_NAME}-frontend:${VERSION} .
docker push ${REGISTRY}/${IMAGE_NAME}-frontend:${VERSION}
```

### Step 3: Create Database Backup

```bash
# Get current pod
PG_POD=$(kubectl get pod -n ${NAMESPACE} -l app=postgres -o jsonpath='{.items[0].metadata.name}')

# Create backup
kubectl exec ${PG_POD} -n ${NAMESPACE} -- pg_dump -U wms_user wms_db > backup-pre-deploy-${VERSION}.sql

# Store backup safely
kubectl create configmap db-backup-${VERSION} --from-file=backup=backup-pre-deploy-${VERSION}.sql -n ${NAMESPACE}
```

### Step 4: Deploy Database Migrations

```bash
# Get backend pod (before deployment)
BACKEND_POD=$(kubectl get pod -n ${NAMESPACE} -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec ${BACKEND_POD} -n ${NAMESPACE} -- npm run db:migrate:all
```

### Step 5: Update Deployment Manifests

```bash
# Update image tags
sed -i "s|ghcr.io/your-org/wms-backend:.*|ghcr.io/your-org/wms-backend:${VERSION}|g" k8s/backend-deployment.yaml
sed -i "s|ghcr.io/your-org/wms-frontend:.*|ghcr.io/your-org/wms-frontend:${VERSION}|g" k8s/frontend-deployment.yaml

# Or for Helm:
helm upgrade wms helm/wms \
  --namespace ${NAMESPACE} \
  --set image.backend.tag=${VERSION} \
  --set image.frontend.tag=${VERSION}
```

### Step 6: Apply Deployments

```bash
# Apply ConfigMaps and Secrets
kubectl apply -f k8s/configmap.yaml -n ${NAMESPACE}
kubectl apply -f k8s/secrets.yaml -n ${NAMESPACE}

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml -n ${NAMESPACE}
kubectl rollout status deployment/backend -n ${NAMESPACE} --timeout=600s

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml -n ${NAMESPACE}
kubectl rollout status deployment/frontend -n ${NAMESPACE} --timeout=600s
```

### Step 7: Verify Deployment

```bash
# Check pods
kubectl get pods -n ${NAMESPACE}

# Check logs
kubectl logs -n ${NAMESPACE} -l app=backend --tail=50
```

---

## Post-Deployment Verification

### Health Checks

```bash
# Backend health
curl https://api.wms.example.com/health

# Expected output:
# {"status":"healthy","timestamp":"2024-01-01T00:00:00.000Z"}

# API status
curl https://api.wms.example.com/api/v1/status

# Frontend
curl https://wms.example.com

# Should return HTML page
```

### Smoke Tests

```bash
# Test authentication
curl -X POST https://api.wms.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'

# Test API endpoint
curl https://api.wms.example.com/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test WebSocket
wscat -c wss://api.wms.example.com/socket.io
```

### Monitoring Checks

```bash
# Check error rate (should be < 1%)
# Check response time (P95 < 1s)
# Check database connections
# Check Redis cache hit rate

# View logs for errors
kubectl logs -n ${NAMESPACE} -l app=backend --tail=100 | grep -i error
```

---

## Deployment Success Criteria

Deployment is considered successful when:

- [ ] All pods are in Running state
- [ ] Health endpoint returns 200 OK
- [ ] All smoke tests pass
- [ ] Error rate < 1%
- [ ] P95 latency < 1s
- [ ] No errors in logs
- [ ] Database metrics normal
- [ ] Cache metrics normal

---

## Common Issues and Solutions

### Issue: Pods Not Starting

**Symptoms:**

- Pods stuck in Pending/CrashLoopBackOff
- Images not pulling

**Solutions:**

```bash
# Describe pod for details
kubectl describe pod <pod-name> -n ${NAMESPACE}

# Check image pull secret
kubectl get secret ghcr-pull-secret -n ${NAMESPACE}

# Check logs
kubectl logs <pod-name> -n ${NAMESPACE}
```

### Issue: Database Migration Fails

**Symptoms:**

- Migration errors in logs
- API returns 500 errors

**Solutions:**

```bash
# Check migration status
kubectl exec <backend-pod> -n ${NAMESPACE} -- npm run db:migrate:status

# Manual rollback
kubectl exec <backend-pod> -n ${NAMESPACE} -- npm run db:migrate:rollback

# Restore from backup
kubectl exec <pg-pod> -n ${NAMESPACE} -- psql -U wms_user wms_db < backup.sql
```

### Issue: High Memory/CPU Usage

**Symptoms:**

- Pods being OOMKilled
- High CPU usage alerts

**Solutions:**

```bash
# Check resource usage
kubectl top pods -n ${NAMESPACE}

# Increase resources if needed
kubectl edit deployment backend -n ${NAMESPACE}

# Or scale up
kubectl scale deployment backend -n ${NAMESPACE} --replicas=5
```

---

## Escalation

### Level 1: On-Call Engineer

- First 15 minutes
- Check logs, metrics, health
- Attempt basic troubleshooting

### Level 2: Senior Engineer

- If issue persists > 15 minutes
- Consider rollback
- Involve database team if needed

### Level 3: Engineering Manager

- If rollback needed
- Production incident declared
- Stakeholder communication

---

## Rollback

If deployment fails, see [Rollback Runbook](./rollback.md)

Quick rollback:

```bash
kubectl rollout undo deployment/backend -n ${NAMESPACE}
kubectl rollout undo deployment/frontend -n ${NAMESPACE}
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

**Last Updated**: 2024-01-09
**Version**: 1.0.0
