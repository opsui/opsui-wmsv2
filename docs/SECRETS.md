# Secrets Management Guide

## Overview

This document outlines the secrets management strategy for the Warehouse Management System (WMS) across all environments.

**Security Principle**: Never commit secrets to version control. Always use environment-specific secret management.

---

## Required Secrets

### Database Secrets

| Secret        | Description       | Required | Example Format                          |
| ------------- | ----------------- | -------- | --------------------------------------- |
| `DB_USER`     | Database username | Yes      | `wms_user`                              |
| `DB_PASSWORD` | Database password | Yes      | 32+ character random string             |
| `DB_HOST`     | Database host     | Yes      | `postgres.production.svc.cluster.local` |
| `DB_PORT`     | Database port     | Yes      | `5432`                                  |
| `DB_NAME`     | Database name     | Yes      | `wms_db`                                |

### Redis Secrets

| Secret           | Description           | Required | Example Format                       |
| ---------------- | --------------------- | -------- | ------------------------------------ |
| `REDIS_HOST`     | Redis host            | Yes      | `redis.production.svc.cluster.local` |
| `REDIS_PORT`     | Redis port            | Yes      | `6379`                               |
| `REDIS_PASSWORD` | Redis password        | Yes      | 32+ character random string          |
| `REDIS_DB`       | Redis database number | No       | `0`                                  |

### Authentication Secrets

| Secret                   | Description              | Required | Example Format              |
| ------------------------ | ------------------------ | -------- | --------------------------- |
| `JWT_SECRET`             | JWT signing secret       | Yes      | 64+ character random string |
| `JWT_EXPIRES_IN`         | Token expiration         | No       | `8h`                        |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | No       | `7d`                        |
| `BCRYPT_ROUNDS`          | Password hashing rounds  | No       | `10`                        |

### Email Provider Secrets

#### SendGrid (Primary)

| Secret                    | Description            | Required |
| ------------------------- | ---------------------- | -------- |
| `SENDGRID_API_KEY`        | SendGrid API key       | Yes      |
| `SENDGRID_FROM_EMAIL`     | From email address     | Yes      |
| `SENDGRID_REPLY_TO_EMAIL` | Reply-to email address | No       |

#### Postmark (Fallback)

| Secret                    | Description            | Required |
| ------------------------- | ---------------------- | -------- |
| `POSTMARK_API_KEY`        | Postmark API key       | Yes      |
| `POSTMARK_FROM_EMAIL`     | From email address     | Yes      |
| `POSTMARK_REPLY_TO_EMAIL` | Reply-to email address | No       |

#### AWS SES (Backup)

| Secret                      | Description        | Required |
| --------------------------- | ------------------ | -------- |
| `AWS_SES_REGION`            | AWS region         | Yes      |
| `AWS_SES_ACCESS_KEY_ID`     | AWS access key     | Yes      |
| `AWS_SES_SECRET_ACCESS_KEY` | AWS secret key     | Yes      |
| `AWS_SES_FROM_EMAIL`        | From email address | Yes      |

### SMS Provider Secrets (Twilio)

| Secret                | Description           | Required |
| --------------------- | --------------------- | -------- |
| `TWILIO_ACCOUNT_SID`  | Twilio account SID    | Yes      |
| `TWILIO_AUTH_TOKEN`   | Twilio auth token     | Yes      |
| `TWILIO_PHONE_NUMBER` | Twilio phone number   | Yes      |
| `TWILIO_RATE_LIMIT`   | Rate limit per second | No       |

### Web Push Secrets

| Secret              | Description             | Required |
| ------------------- | ----------------------- | -------- |
| `VAPID_PUBLIC_KEY`  | VAPID public key        | Yes      |
| `VAPID_PRIVATE_KEY` | VAPID private key       | Yes      |
| `VAPID_SUBJECT`     | VAPID subject (mailto:) | Yes      |

### External API Secrets

| Secret              | Description       | Required |
| ------------------- | ----------------- | -------- |
| `NZC_API_KEY`       | NZC API key       | No       |
| `NZC_SITE_ID`       | NZC site ID       | No       |
| `NZC_SUPPORT_EMAIL` | NZC support email | No       |

---

## Environment-Specific Secrets

### Development

```bash
# .env for local development
NODE_ENV=development
DB_HOST=localhost
DB_PASSWORD=dev-password-not-secure
JWT_SECRET=dev-jwt-secret-not-secure
```

### Staging

```bash
# Kubernetes secrets
kubectl create secret generic wms-secrets \
  --from-literal=DB_PASSWORD='staging-secure-password' \
  --from-literal=JWT_SECRET='staging-jwt-secret-32-chars-min' \
  --namespace=staging
```

### Production

```bash
# Kubernetes secrets (never commit)
kubectl create secret generic wms-secrets \
  --from-literal=DB_PASSWORD='production-secure-password' \
  --from-literal=JWT_SECRET='production-jwt-secret-64-chars-min' \
  --from-literal=SENDGRID_API_KEY='SG.xxxxx' \
  --namespace=production
```

---

## Secret Generation

### Generate Secure Passwords

```bash
# 32-character password for database
openssl rand -base64 32

# 64-character JWT secret
openssl rand -base64 64

# Or use /dev/urandom
head -c 32 /dev/urandom | base64
```

### Generate VAPID Keys

```bash
# Install web-push
npm install -g web-push

# Generate keys
web-push generate-vapid-keys
```

---

## Secret Rotation

### Rotation Schedule

| Secret            | Rotation Frequency | Method                              |
| ----------------- | ------------------ | ----------------------------------- |
| Database Password | Quarterly          | Manual with scheduled maintenance   |
| JWT Secret        | Quarterly          | Manual, requires token invalidation |
| API Keys          | As needed          | Manual, when compromised or expired |
| Certificates      | Auto               | Let's Encrypt auto-renews           |

### Rotation Procedure

1. **Generate new secret** (see above)
2. **Update secret store** (Kubernetes secrets)
3. **Rolling restart** of affected services
4. **Verify functionality** (health checks, smoke tests)
5. **Invalidate old secret** (if applicable)
6. **Document rotation** in change log

#### Database Password Rotation

```bash
# 1. Connect to database
kubectl exec -it postgres-0 -n production -- psql -U wms_user -d wms_db

# 2. Change password
ALTER USER wms_user WITH PASSWORD 'new-secure-password';

# 3. Update Kubernetes secret
kubectl create secret generic wms-secrets \
  --from-literal=DB_PASSWORD='new-secure-password' \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. Rolling restart
kubectl rollout restart deployment/backend -n production

# 5. Verify
kubectl logs -n production -l app=backend --tail=50
```

#### JWT Secret Rotation

```bash
# WARNING: Requires all users to re-authenticate

# 1. Update secret
kubectl create secret generic wms-secrets \
  --from-literal=JWT_SECRET='new-jwt-secret-64-chars-min' \
  --dry-run=client -o yaml | kubectl apply -f -

# 2. Clear token blacklist (if using)
kubectl exec -it redis-0 -n production -- redis-cli FLUSHDB

# 3. Rolling restart
kubectl rollout restart deployment/backend -n production

# 4. Notify users: "All sessions have been invalidated, please login again"
```

---

## Secret Storage Options

### Kubernetes Secrets (Current)

**Pros:**

- Native to Kubernetes
- Easy to use
- Supports RBAC

**Cons:**

- Base64 encoded (not encrypted by default in older versions)
- No audit trail
- No automatic rotation

**Usage:**

```bash
kubectl create secret generic wms-secrets \
  --from-literal=SECRET_NAME='secret-value' \
  --namespace=production
```

### AWS Secrets Manager (Recommended for Production)

**Pros:**

- Encrypted at rest
- Automatic rotation
- Audit logging
- IAM integration

**Cons:**

- AWS vendor lock-in
- Additional cost

**Setup:**

```bash
# Store secret
aws secretsmanager create-secret \
  --name prod/wms/db-password \
  --secret-string "secure-password" \
  --description "WMS Production Database Password"

# Rotate secret
aws secretsmanager rotate-secret \
  --secret-id prod/wms/db-password \
  --rotation-lambda-arn arn:aws:lambda:region:account:function:RotationFunction
```

### HashiCorp Vault (Enterprise Option)

**Pros:**

- Strong encryption
- Dynamic secrets
- Audit logging
- Multi-cloud support

**Cons:**

- Complex setup
- Additional infrastructure

**Setup:**

```bash
# Enable KV secrets engine
vault secrets enable -path=wms kv

# Store secret
vault kv put wms/production/db password="secure-password"

# Read secret
vault kv get wms/production/db
```

---

## Secret Access Control

### RBAC for Kubernetes Secrets

```yaml
# Role: read-only access to secrets
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]

# Role: full access to secrets (admin only)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-admin
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "create", "update", "delete"]
```

### Audit Logging

```bash
# Enable audit logging for secrets access
kubectl audit log \
  --namespace=production \
  --resource=secrets \
  --verbs=get,list,create,update,delete
```

---

## Secret Backup

### Backup Kubernetes Secrets

```bash
# Backup all secrets
kubectl get secrets -n production -o yaml > secrets-backup-$(date +%Y%m%d).yaml

# WARNING: This file contains sensitive data
# Encrypt immediately
gpg --encrypt --recipient admin@company.com secrets-backup-$(date +%Y%m%d).yaml

# Or use Kubernetes etcd backup
etcdctl snapshot save etcd-backup-$(date +%Y%m%d).db
```

### Restore Secrets

```bash
# Decrypt and restore
gpg --decrypt secrets-backup-20240109.yaml.gpg | kubectl apply -f -

# Or restore single secret
kubectl create secret generic wms-secrets \
  --from-literal=DB_PASSWORD='backup-password' \
  --namespace=production
```

---

## Security Best Practices

1. **Never commit secrets to version control**
   - Use `.gitignore` to exclude `.env` files
   - Use `git-secrets` or similar to prevent accidental commits

2. **Use different secrets per environment**
   - Development secrets should NEVER work in production
   - Rotate secrets when developers leave

3. **Principle of least privilege**
   - Only grant secret access to those who need it
   - Use RBAC to enforce access control

4. **Audit secret access**
   - Log all secret access
   - Review logs regularly for suspicious activity

5. **Rotate secrets regularly**
   - Database passwords: quarterly
   - JWT secrets: quarterly
   - API keys: as needed

6. **Use strong, random secrets**
   - Minimum 32 characters for passwords
   - Minimum 64 characters for JWT secrets
   - Use cryptographically secure random generation

7. **Encrypt secrets at rest**
   - Use Kubernetes encryption at rest
   - Consider external secret management (AWS, Vault)

8. **Secure secret transmission**
   - Use TLS for all secret transmission
   - Never log secrets
   - Sanitize logs for accidental secret leakage

---

## Troubleshooting

### Issue: Pods Can't Start Due to Missing Secret

**Symptoms:**

- Pod stuck in `ContainerCreating` state
- Events show `Failed to pull image` or `MountVolume.SetUp failed`

**Solutions:**

```bash
# Check if secret exists
kubectl get secret wms-secrets -n production

# Check secret contents
kubectl get secret wms-secrets -n production -o yaml

# Recreate secret if missing
kubectl create secret generic wms-secrets \
  --from-literal=SECRET_NAME='secret-value' \
  --namespace=production
```

### Issue: Application Can't Read Secret

**Symptoms:**

- Application logs show "undefined" for secret values
- Environment variables not set

**Solutions:**

```bash
# Check pod environment
kubectl exec <pod-name> -n production -- env | grep SECRET

# Check deployment env mapping
kubectl get deployment backend -n production -o yaml | grep -A 5 envFrom

# Verify secret keys
kubectl get secret wms-secrets -n production --output=jsonpath='{.data}'
```

---

## Related Documentation

- [Deployment Runbook](./runbooks/deployment.md)
- [Security Rules](../SECURITY_RULES.md)
- [Configuration Guide](./CONFIGURATION.md)

---

**Last Updated**: 2024-01-09
**Version**: 1.0.0
