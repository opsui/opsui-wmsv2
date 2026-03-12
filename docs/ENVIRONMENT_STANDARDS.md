# Environment Standards

> **AI Context System - Environment Variable Standards**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **Purpose:** Define environment variable conventions and validation

---

## Environment Variable Hierarchy

### Priority Order (Highest to Lowest)

1. **Process Environment** - Set directly in the runtime environment
2. **`.env.local`** - Local overrides (git-ignored)
3. **`.env.{NODE_ENV}`** - Environment-specific (`.env.development`, `.env.production`)
4. **`.env`** - Default values (committed to repo)
5. **Code Defaults** - Hardcoded fallback values

---

## Required Environment Variables

### Backend Core

```bash
# Node Environment
NODE_ENV=development|test|production

# Server Configuration
PORT=3001                    # 🔒 LOCKED - Never change
HOST=0.0.0.0

# Database - WMS (TEST)
WMS_DB_HOST=localhost
WMS_DB_PORT=5433             # SSH tunnel port (maps to remote:5432)
WMS_DB_NAME=wms_db
WMS_DB_USER=wms_user
WMS_DB_PASSWORD=<secret>

# Database - AAP (CUSTOMER)
AAP_DB_HOST=localhost
AAP_DB_PORT=5433             # SSH tunnel port (maps to remote:5432)
AAP_DB_NAME=aap_db
AAP_DB_USER=aap_user
AAP_DB_PASSWORD=<secret>

# JWT Configuration
JWT_SECRET=<secret>          # Minimum 32 characters
JWT_EXPIRES_IN=8h

# WebSocket
WS_PORT=3002                 # 🔒 LOCKED - Never change

# CORS (comma-separated origins)
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Integration Services

```bash
# NetSuite Configuration
NETSUITE_CONSUMER_KEY=<secret>
NETSUITE_CONSUMER_SECRET=<secret>
NETSUITE_TOKEN_ID=<secret>
NETSUITE_TOKEN_SECRET=<secret>
NETSUITE_ACCOUNT_ID=<account_id>
NETSUITE_REALM=<realm>

# Shopify Configuration
SHOPIFY_API_KEY=<secret>
SHOPIFY_API_SECRET=<secret>
SHOPIFY_SHOP_DOMAIN=<shop>.myshopify.com

# Carrier APIs
FEDEX_API_KEY=<secret>
FEDEX_PASSWORD=<secret>
UPS_API_KEY=<secret>
DHL_API_KEY=<secret>
```

### Frontend

```bash
# API Configuration
VITE_API_PROXY_TARGET=http://localhost:3001
VITE_WS_URL=ws://localhost:3002
```

---

## Environment Variable Validation

### Validation Pattern

```typescript
// packages/backend/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Required
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  
  // Database
  WMS_DB_HOST: z.string().min(1),
  WMS_DB_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  WMS_DB_NAME: z.string().min(1),
  WMS_DB_USER: z.string().min(1),
  WMS_DB_PASSWORD: z.string().min(1),
  
  AAP_DB_HOST: z.string().min(1),
  AAP_DB_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  AAP_DB_NAME: z.string().min(1),
  AAP_DB_USER: z.string().min(1),
  AAP_DB_PASSWORD: z.string().min(1),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  
  // CORS
  CORS_ORIGIN: z.string().transform(val => val.split(',').map(s => s.trim())),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  
  return result.data;
}

export const env = validateEnv();
```

---

## Secrets Management

### Development

- Use `.env.local` for local secrets (git-ignored)
- Never commit secrets to repository
- Use different credentials for development and production

### Production

- Use environment variables set via deployment platform
- Consider using a secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly
- Use different secrets per environment

### Secret Detection

Add to `.gitignore`:

```gitignore
# Environment files with secrets
.env.local
.env.*.local
.env.production
.env.production.local

# Secret files
*.pem
*.key
secrets/
```

---

## Environment-Specific Configuration

### Development

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug

# Local database via SSH tunnel
WMS_DB_HOST=localhost
WMS_DB_PORT=5433

AAP_DB_HOST=localhost
AAP_DB_PORT=5433

# Verbose error messages
SHOW_ERROR_DETAILS=true
```

### Test

```bash
# .env.test
NODE_ENV=test
LOG_LEVEL=warn

# Test database
WMS_DB_NAME=wms_db_test
AAP_DB_NAME=aap_db_test
```

### Production

```bash
# .env.production (NOT committed)
NODE_ENV=production
LOG_LEVEL=info

# Direct database connection (on server)
WMS_DB_HOST=localhost
WMS_DB_PORT=5432

AAP_DB_HOST=localhost
AAP_DB_PORT=5432

# Minimal error exposure
SHOW_ERROR_DETAILS=false
```

---

## Environment Variable Documentation Template

Every `.env.example` should include:

```bash
# ===========================================
# ENVIRONMENT CONFIGURATION
# ===========================================
# 
# Copy this file to .env.local and fill in values
# Required values are marked with [REQUIRED]
# Optional values have defaults shown
#
# SECURITY:
# - Never commit .env files with real secrets
# - Use different credentials per environment
# - Rotate secrets regularly
# ===========================================

# -------------------------------------------
# SERVER CONFIGURATION
# -------------------------------------------
NODE_ENV=development        # development|test|production
PORT=3001                   # 🔒 LOCKED - Backend API port
HOST=0.0.0.0                # Server bind address

# -------------------------------------------
# DATABASE - WMS (TEST/DEV)
# -------------------------------------------
WMS_DB_HOST=localhost       # Database host
WMS_DB_PORT=5433            # Local: SSH tunnel, Server: 5432
WMS_DB_NAME=wms_db          # Database name
WMS_DB_USER=wms_user        # [REQUIRED] Database user
WMS_DB_PASSWORD=            # [REQUIRED] Database password

# -------------------------------------------
# DATABASE - AAP (CUSTOMER/PRODUCTION)
# -------------------------------------------
AAP_DB_HOST=localhost       # Database host
AAP_DB_PORT=5433            # Local: SSH tunnel, Server: 5432
AAP_DB_NAME=aap_db          # Database name
AAP_DB_USER=aap_user        # [REQUIRED] Database user
AAP_DB_PASSWORD=            # [REQUIRED] Database password

# ... continue for all sections
```

---

## Validation Checklist

Before deploying to any environment:

- [ ] All required environment variables are set
- [ ] Database credentials are correct
- [ ] JWT_SECRET is at least 32 characters
- [ ] CORS_ORIGIN includes all allowed origins
- [ ] Secrets are not committed to repository
- [ ] Different secrets used per environment
- [ ] Log level is appropriate for environment