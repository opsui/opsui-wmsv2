# Incident Response Runbook

## Overview

This runbook provides procedures for responding to production incidents affecting the Warehouse Management System.

**Severity Levels:**

- **P1 - Critical**: System down, complete outage
- **P2 - High**: Major functionality broken, significant impact
- **P3 - Medium**: Partial degradation, some users affected
- **P4 - Low**: Minor issues, limited impact

**Response Time Objectives:**

- P1: 5 minutes initial response, 1 hour resolution
- P2: 15 minutes initial response, 4 hours resolution
- P3: 30 minutes initial response, 24 hours resolution
- P4: 1 day initial response, 1 week resolution

---

## Incident Declaration

### When to Declare an Incident

An incident should be declared when:

- System is down or severely degraded
- Critical functionality is broken
- Data loss or corruption suspected
- Security breach detected
- Performance significantly degraded
- Customer impact confirmed

### How to Declare an Incident

1. **Post in #incident-response channel:**

```
INCIDENT DECLARED - P{severity}
━━━━━━━━━━━━━━━━━━━━━━
Issue: [brief description]
Impact: [affected users/systems]
Severity: P1/P2/P3/P4
Commander: [your name]
Started: [timestamp]
```

2. **Create incident ticket** in issue tracker with template:

- Title: [P{X}] Incident: {brief description}
- Severity: P{X}
- Status: Investigating
- Assign: Incident commander

3. **Notify stakeholders:**

- Engineering team
- Product manager
- Customer support (if customer-facing)
- Management (for P1/P2)

---

## Incident Roles

### Incident Commander (IC)

- Leads incident response
- Makes final decisions
- Coordinates communication
- Escalates as needed

### Technical Lead (TL)

- Investigates technical issues
- Implements fixes
- Documents root cause

### Communications Lead (CL)

- Manages stakeholder communication
- Posts updates
- Handles customer messaging

### Scribe

- Documents all actions
- Records timeline
- Captures lessons learned

---

## Incident Response Process

## Phase 1: Detection & Assessment (T+0 to T+15min)

### Initial Assessment

```bash
# Check system status
kubectl get pods -n production
kubectl top pods -n production
kubectl get events -n production --sort-by='.lastTimestamp'

# Check health endpoints
curl https://api.wms.example.com/health
curl https://wms.example.com

# Check error rates
kubectl logs -n production -l app=backend --tail=100 | grep -i error | wc -l

# Check database
kubectl exec postgres-0 -n production -- pg_isready
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis
kubectl exec -n production $(kubectl get pod -n production -l app=redis -o jsonpath='{.items[0].metadata.name}') -- redis-cli INFO stats
```

### Determine Severity

Use severity matrix:

| Severity | Condition                  | Example                      |
| -------- | -------------------------- | ---------------------------- |
| P1       | Complete outage            | API down, all users affected |
| P2       | Major functionality broken | Orders cannot be created     |
| P3       | Partial degradation        | Slow response times          |
| P4       | Minor issue                | Non-critical feature broken  |

### Initial Communication

Post update in #incident-response:

```
Incident Update - Investigating
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assessment: [what we know so far]
Impact: [users/systems affected]
Next Steps: [what we're doing next]
Next Update: [time, usually 15 min]
```

---

## Phase 2: Investigation (T+15min to T+1hour)

### Gather Diagnostics

```bash
# Application logs
kubectl logs -n production -l app=backend --tail=500 --since=1h > backend-logs.txt
kubectl logs -n production -l app=frontend --tail=500 --since=1h > frontend-logs.txt

# Database logs
kubectl logs postgres-0 -n production --tail=500 > postgres-logs.txt

# System metrics
kubectl top nodes
kubectl top pods -n production

# Network checks
kubectl exec <pod> -n production -- curl -v http://localhost:3001/health

# Database performance
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
"

# Check for locks
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock';
"
```

### Identify Root Cause

Common causes:

1. **Deployment issue** - Recent changes
2. **Database issue** - Locks, connections, performance
3. **Resource exhaustion** - CPU, memory, disk
4. **External dependency** - Third-party APIs
5. **Configuration error** - Environment variables
6. **Security incident** - Attack, breach

### Implement Temporary Mitigation

```bash
# If deployment issue: Rollback
kubectl rollout undo deployment/backend -n production

# If resource issue: Scale up
kubectl scale deployment backend -n production --replicas=5

# If database issue: Restart connections
kubectl rollout restart deployment/backend -n production

# If external dependency: Enable circuit breaker
kubectl annotate deployment/backend -n production circuit-breaker=open
```

---

## Phase 3: Resolution (T+1hour onwards)

### Implement Fix

1. **Code fix** for software issues
2. **Configuration fix** for config issues
3. **Scaling fix** for resource issues
4. **Data fix** for corruption issues
5. **Security fix** for vulnerabilities

### Deploy Fix

```bash
# Deploy hotfix
kubectl set image deployment/backend backend=ghcr.io/your-org/wms-backend:hotfix-v1 -n production
kubectl rollout status deployment/backend -n production

# Or use CD pipeline for tested fix
```

### Verify Resolution

```bash
# Health checks
curl https://api.wms.example.com/health

# Smoke tests
npm run test:smoke -- --env=production

# Monitor for 30 minutes
watch -n 30 'kubectl top pods -n production'
```

---

## Phase 4: Post-Incident (After Resolution)

### Resolution Communication

```
Incident Update - Resolved
━━━━━━━━━━━━━━━━━━━━━━
Resolution Time: [timestamp]
Downtime: [duration]
Root Cause: [brief description]
Fix Applied: [what was done]
Monitoring: [what we're watching]
Post-Mortem: Scheduled for [date/time]
```

### Create Post-Mortem

Include:

1. **Timeline** of incident
2. **Root cause analysis**
3. **Impact assessment**
4. **What went well**
5. **What went wrong**
6. **Action items**
7. **Prevention measures**

### Follow-Up Actions

- [ ] Post-mortem meeting scheduled
- [ ] Action items assigned
- [ ] Monitoring updated
- [ ] Runbooks updated
- [ ] Tests added
- [ ] Documentation updated

---

## Common Incident Scenarios

### Scenario 1: Complete Outage

**Symptoms:**

- All services down
- No API response
- Health check failing

**Actions:**

1. Check cluster health
2. Check load balancer
3. Check DNS
4. Restart services if needed
5. Rollback if recent deployment

```bash
kubectl cluster-info
kubectl get nodes
kubectl get pods -n production -o wide
kubectl rollout restart deployment/backend -n production
```

### Scenario 2: Database Connection Pool Exhausted

**Symptoms:**

- API timeouts
- "Connection refused" errors
- High database connection count

**Actions:**

1. Check connection count
2. Identify long-running queries
3. Kill blocking queries
4. Increase pool size
5. Restart application

```bash
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT pid, state, query_start, state_change, wait_event_type, wait_event, query
  FROM pg_stat_activity
  WHERE state != 'idle'
  ORDER BY query_start;
"

# Kill long-running query
kubectl exec postgres-0 -n production -- psql -U wms_user -d wms_db -c "
  SELECT pg_terminate_backend(pid);
"
```

### Scenario 3: High Memory Usage

**Symptoms:**

- Pods being OOMKilled
- CrashLoopBackOff
- Memory alerts

**Actions:**

1. Check memory usage
2. Identify memory leaks
3. Increase memory limits
4. Restart pods

```bash
kubectl top pods -n production
kubectl describe pod <pod-name> -n production | grep -i memory

# Increase limits
kubectl edit deployment backend -n production
```

### Scenario 4: High CPU Usage

**Symptoms:**

- Slow response times
- CPU alerts
- Throttling

**Actions:**

1. Check CPU usage
2. Identify high CPU processes
3. Scale horizontally
4. Optimize queries/code

```bash
kubectl top pods -n production
kubectl exec <pod> -n production -- top

# Scale up
kubectl scale deployment backend -n production --replicas=5
```

### Scenario 5: Data Inconsistency

**Symptoms:**

- Wrong data displayed
- Calculations incorrect
- Missing records

**Actions:**

1. Stop writes (scale to 0)
2. Identify affected data
3. Restore from backup
4. Verify fix
5. Resume operations

```bash
kubectl scale deployment backend -n production --replicas=0
# Restore backup...
kubectl scale deployment backend -n production --replicas=3
```

---

## Communication Templates

### Initial Incident Declaration

```
🚨 INCIDENT DECLARED 🚨

Severity: P{X}
Issue: [one-line description]
Commander: @name
Started: [time]

Next Update: 15 minutes
Channel: #incident-response
```

### Update Template

```
Incident Update - {Status}
━━━━━━━━━━━━━━━━━━━━━━
Status: {Investigating|Identified|Monitoring|Resolved}

What's Happening: {brief update}
Impact: {current impact}
Next Steps: {what's next}
Next Update: {time}

Timeline:
- {time}: {update 1}
- {time}: {update 2}
```

### Resolution Template

```
✅ INCIDENT RESOLVED ✅

Resolution Time: {time}
Total Duration: {hours/minutes}

Root Cause: {cause}
Fix Applied: {fix}

Impact Summary:
- Users Affected: {number}
- Downtime: {duration}
- Data Loss: {yes/no}

Next Steps:
- Post-mortem scheduled: {date/time}
- Action items assigned

Monitoring: We'll monitor the system for {hours} hours.
```

---

## Escalation Matrix

### Level 1: On-Call Engineer

- Time: 0-30 minutes
- Actions: Initial assessment, basic troubleshooting

### Level 2: Senior Engineer

- Time: 30-60 minutes
- Actions: Deep investigation, complex fixes

### Level 3: Engineering Manager

- Time: 60+ minutes
- Actions: Coordination, stakeholder management

### Level 4: CTO/VP Engineering

- Time: Critical incidents
- Actions: Major decisions, customer communication

---

## Incident Command Checklist

- [ ] Incident declared
- [ ] Severity assigned
- [ ] Roles assigned
- [ ] Initial assessment complete
- [ ] Stakeholders notified
- [ ] Mitigation implemented
- [ ] Fix implemented
- [ ] Resolution verified
- [ ] Communication sent
- [ ] Post-mortem scheduled
- [ ] Action items assigned
- [ ] Documentation updated

---

## Related Runbooks

- [Rollback Runbook](./rollback.md)
- [Deployment Runbook](./deployment.md)
- [Database Maintenance Runbook](./database-maintenance.md)

---

**Last Updated**: 2024-01-09
**Version**: 1.0.0

**Remember**: Communication is key during incidents. Keep stakeholders informed regularly, even if there's no new update.
