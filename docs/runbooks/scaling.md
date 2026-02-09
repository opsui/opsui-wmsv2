# Scaling Runbook

## Overview

This runbook provides procedures for scaling the Warehouse Management System infrastructure to handle increased load.

**Scaling Triggers:**

- CPU usage > 70% for 10+ minutes
- Memory usage > 80% for 10+ minutes
- Response time P95 > 1s
- Queue depth > 100
- Seasonal traffic patterns

---

## Scaling Components

### Backend API (Horizontal Scaling)

**Current State:**

```bash
kubectl get deployment backend -n production
kubectl top pods -n production -l app=backend
```

**Manual Scale Up:**

```bash
# Scale to 5 replicas
kubectl scale deployment backend -n production --replicas=5

# Verify
kubectl rollout status deployment/backend -n production
kubectl get pods -n production -l app=backend
```

**Manual Scale Down:**

```bash
# Scale to 3 replicas
kubectl scale deployment backend -n production --replicas=3
```

**Configure HPA (Autoscaling):**

```bash
# Already configured in k8s/hpa.yaml
# Min replicas: 3, Max replicas: 10
# Target CPU: 70%, Target Memory: 80%

# Check HPA status
kubectl get hpa -n production
kubectl describe hpa backend-hpa -n production
```

### Frontend (Horizontal Scaling)

**Manual Scale:**

```bash
# Scale to 4 replicas
kubectl scale deployment frontend -n production --replicas=4

# Verify
kubectl get pods -n production -l app=frontend
```

**HPA Status:**

```bash
kubectl describe hpa frontend-hpa -n production
```

### Database (Vertical Scaling)

**Check Current Resources:**

```bash
kubectl get pod postgres-0 -n production -o jsonpath='{.spec.containers[0].resources}'
```

**Scale Up (requires restart):**

```bash
# Edit StatefulSet
kubectl edit statefulset postgres -n production

# Update resources:
# requests.cpu: 500m → 1000m
# requests.memory: 1Gi → 2Gi
# limits.cpu: 2000m → 4000m
# limits.memory: 4Gi → 8Gi

# Rolling restart
kubectl rollout restart statefulset postgres -n production
```

**Scale Up Storage:**

```bash
# Edit PVC
kubectl edit pvc postgres-pvc -n production

# Update storage request
# spec.resources.requests.storage: 100Gi → 200Gi

# Note: May require PVC expansion support from storage class
```

### Redis (Vertical Scaling)

```bash
# Edit deployment
kubectl edit deployment redis -n production

# Update resources and maxmemory
```

---

## Scaling Strategies

### Reactive Scaling (HPA)

**Already configured** in `k8s/hpa.yaml`:

- Backend: 3-10 replicas based on CPU/memory
- Frontend: 2-6 replicas based on CPU/memory

### Predictive Scaling

**For known traffic patterns:**

```bash
# Scale up before peak hours (8 AM Monday)
kubectl scale deployment backend -n production --replicas=8

# Scale down after peak (8 PM Monday)
kubectl scale deployment backend -n production --replicas=3
```

**Schedule with CronJobs:**

```yaml
# k8s/scale-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-morning
  namespace: production
spec:
  schedule: '0 8 * * 1-5' # 8 AM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - scale
                - deployment
                - backend
                - --replicas=8
```

### Event-Based Scaling

**Scale on queue depth:**

```bash
# Check queue depth
kubectl exec -it <backend-pod> -n production -- npm run queue:stats

# Scale if queue > 100
QUEUE_DEPTH=$(kubectl exec -it <backend-pod> -n production -- npm run queue:size)
if [ $QUEUE_DEPTH -gt 100 ]; then
  kubectl scale deployment backend -n production --replicas=10
fi
```

---

## Scaling Verification

### Health Checks

```bash
# 1. Check all pods are running
kubectl get pods -n production

# 2. Check pod resource usage
kubectl top pods -n production

# 3. Check service endpoints
kubectl get endpoints -n production

# 4. Run health check
curl https://api.wms.example.com/health

# 5. Check response time
time curl https://api.wms.example.com/api/v1/status
```

### Load Testing

```bash
# Install k6 or use existing load test tool
kubectl run -it --rm load-test --image=grafana/k6:latest --restart=Never -n production -- \
  k6 run - <<EOF
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
};

export default function () {
  let res = http.get('https://api.wms.example.com/api/v1/status');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF
```

---

## Scaling Limits

### Maximum Capacity

| Component | Min | Max | Notes                                      |
| --------- | --- | --- | ------------------------------------------ |
| Backend   | 3   | 10  | Limited by HPA                             |
| Frontend  | 2   | 6   | Limited by HPA                             |
| Database  | 1   | 1   | Single instance (requires HA for multi-AZ) |
| Redis     | 1   | 1   | Single instance (requires Redis Cluster)   |

### Resource Limits

**Per Pod:**

- Backend: 500m-2000m CPU, 512Mi-2Gi memory
- Frontend: 100m-500m CPU, 128Mi-512Mi memory
- Database: 500m-2000m CPU, 1Gi-4Gi memory

**Total Cluster:**

- Monitor cluster capacity
- Plan for node pool expansion

---

## Scaling Events

### Pre-Scale Checklist

- [ ] Sufficient cluster resources
- [ ] Database can handle connections
- [ ] Cache can handle increased load
- [ ] No ongoing maintenance
- [ ] Monitoring dashboards ready

### During Scale

- [ ] Monitor pod startup
- [ ] Check for errors in logs
- [ ] Verify service endpoints
- [ ] Run health checks

### Post-Scale Verification

- [ ] All pods Running
- [ ] Health checks passing
- [ ] Response times acceptable
- [ ] No errors in logs
- [ ] Database connections normal

---

## Rollback Scaling

### If Scaling Causes Issues

```bash
# Revert to previous replica count
kubectl scale deployment backend -n production --replicas=3

# Or use HPA to auto-adjust
kubectl autoscale deployment backend \
  --min=3 --max=10 \
  --cpu-percent=70 \
  --namespace=production
```

---

## Seasonal Scaling

### Peak Seasons

**Holiday Season (Nov-Dec):**

```bash
# Scale up 2 weeks before peak
kubectl scale deployment backend -n production --replicas=8
kubectl scale deployment frontend -n production --replicas=4

# Scale down after peak
kubectl scale deployment backend -n production --replicas=3
kubectl scale deployment frontend -n production --replicas=2
```

**End of Month:**

```bash
# Slightly increase capacity
kubectl scale deployment backend -n production --replicas=5
```

---

## Cost Optimization

### Scale Down During Low Traffic

```bash
# Off-hours (10 PM - 6 AM)
kubectl scale deployment backend -n production --replicas=2
kubectl scale deployment frontend -n production --replicas=1

# Weekends
kubectl scale deployment backend -n production --replicas=2
```

**Or use Cluster Autoscaler:**

```bash
# Scale down nodes
kubectl scale nodepool production-pool --replicas=2
```

---

## Monitoring Scaling Events

### Metrics to Watch

- Pod count over time
- CPU/Memory usage
- Response times
- Error rate
- Database connection count
- Queue depth

### Alerts

Configure alerts for:

- HPA at max replicas (need manual intervention)
- Scale failures (pods not starting)
- Resource exhaustion (cluster full)

---

## Related Runbooks

- [Deployment Runbook](./deployment.md)
- [Incident Response Runbook](./incident-response.md)
- [Database Maintenance Runbook](./database-maintenance.md)

---

**Last Updated**: 2024-01-09
**Version**: 1.0.0
