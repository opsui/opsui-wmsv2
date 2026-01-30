# WMS Configuration Guide

This guide explains all configuration options for the Warehouse Management System.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Feature Flags](#feature-flags)
- [Service Configuration](#service-configuration)
- [Database Configuration](#database-configuration)
- [Security Configuration](#security-configuration)
- [Third-Party Integrations](#third-party-integrations)

---

## Environment Variables

### Required Variables

These variables must be set for the application to start:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development`, `staging`, `production` |
| `PORT` | Backend server port | `3001` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `wms_db` |
| `DB_USER` | Database user | `wms_user` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `JWT_SECRET` | Secret for JWT signing | `your-super-secret-jwt-key` |

### Optional Variables

#### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Server bind address | `0.0.0.0` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

#### Database Pool Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_POOL_MIN` | Minimum pool connections | `2` |
| `DB_POOL_MAX` | Maximum pool connections | `10` |
| `DB_SSL` | Enable SSL for database | `false` |

#### Redis Configuration (Optional)

The application degrades gracefully if Redis is not available.

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password | (empty) |
| `REDIS_DB` | Redis database number | `0` |
| `REDIS_TTL` | Cache TTL in seconds | `3600` |

#### JWT Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRES_IN` | Access token lifetime | `8h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |

#### Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Time window for rate limiting | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

#### Logging

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging verbosity | `debug` |
| `LOG_FILE` | Log file path | `logs/wms.log` |

#### WebSocket Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `WS_PORT` | WebSocket server port | `3002` |

#### Application Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DEFAULT_PICKER_CAPACITY` | Default orders per picker | `5` |
| `MAX_ORDERS_PER_PICKER` | Maximum orders per picker | `10` |
| `PICK_TIMEOUT_MINUTES` | Timeout for pick tasks | `30` |
| `HEALTH_CHECK_INTERVAL` | Health check frequency | `30000` (30 sec) |

---

## Feature Flags

Feature flags allow you to enable/disable functionality without code changes.

### Available Flags

| Flag | Description | Default |
|------|-------------|---------|
| `ENABLE_WEBSOCKET` | Enable real-time WebSocket updates | `true` |
| `ENABLE_REDIS_CACHE` | Enable Redis caching | `true` |
| `ENABLE_AUDIT_LOG` | Enable audit logging | `true` |

### Managing Feature Flags

Flags can be set via environment variables or managed through the database:

```sql
-- Check flag status
SELECT feature_key, is_enabled, description FROM feature_flags;

-- Enable a flag
UPDATE feature_flags SET is_enabled = true WHERE feature_key = 'ENABLE_WEBSOCKET';

-- Disable a flag
UPDATE feature_flags SET is_enabled = false WHERE feature_key = 'ENABLE_WEBSOCKET';
```

---

## Service Configuration

### Backend Service

The backend service (`packages/backend`) is configured via:

1. **Environment variables** - See `.env.example` for all options
2. **Database settings** - Stored in `settings` table
3. **Feature flags** - Stored in `feature_flags` table

### Frontend Service

The frontend service (`packages/frontend`) is configured via:

1. **Environment variables** - Create `.env` file in `packages/frontend/`
2. **API client** - `src/lib/api-client.ts`
3. **Runtime settings** - Fetched from `/api/settings` endpoint

#### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:3001` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:3002` |

---

## Database Configuration

### Connection Settings

Database connections are managed by a connection pool:

```typescript
// packages/backend/src/db/client.ts
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  min: parseInt(process.env.DB_POOL_MIN),
  max: parseInt(process.env.DB_POOL_MAX),
});
```

### Running Migrations

```bash
# From packages/backend directory
npm run db:migrate
```

### Seeding Data

```bash
# Seed initial data (roles, permissions, demo data)
npm run db:seed
```

---

## Security Configuration

### JWT Tokens

JWT tokens are configured with:

- **Access tokens**: Short-lived (default 8 hours)
- **Refresh tokens**: Long-lived (default 7 days)

```typescript
// packages/backend/src/config/index.ts
export const jwtConfig = {
  secret: process.env.JWT_SECRET,
  accessTokenExpiry: process.env.JWT_EXPIRES_IN || '8h',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};
```

### Password Hashing

Passwords are hashed using bcrypt:

```typescript
// packages/backend/src/config/index.ts
export const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
```

### CORS Configuration

Cross-Origin Resource Sharing is configured via:

```typescript
// packages/backend/src/app.ts
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));
```

### Rate Limiting

API rate limiting is configured per:

- **Time window**: 15 minutes by default
- **Max requests**: 100 per window

```typescript
// packages/backend/src/middleware/rateLimiter.ts
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
});
```

---

## Third-Party Integrations

### Email Providers

The system supports multiple email providers with automatic failover.

#### SendGrid (Primary)

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | Default sender email |
| `SENDGRID_REPLY_TO_EMAIL` | Reply-to address |

#### Postmark (Fallback)

| Variable | Description |
|----------|-------------|
| `POSTMARK_API_KEY` | Postmark API key |
| `POSTMARK_FROM_EMAIL` | Default sender email |
| `POSTMARK_REPLY_TO_EMAIL` | Reply-to address |

#### AWS SES (Backup)

| Variable | Description |
|----------|-------------|
| `AWS_SES_REGION` | AWS region |
| `AWS_SES_ACCESS_KEY_ID` | AWS access key |
| `AWS_SES_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_SES_FROM_EMAIL` | Default sender email |

### SMS Provider (Twilio)

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |
| `TWILIO_RATE_LIMIT` | Rate limit per hour |

### Push Notifications

#### Web Push (VAPID)

| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | VAPID subject (mailto) |

#### Firebase Cloud Messaging (Optional)

| Variable | Description |
|----------|-------------|
| `GCM_API_KEY` | Firebase API key |

---

## Configuration Best Practices

### Development

```bash
# .env for development
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_WEBSOCKET=true
ENABLE_REDIS_CACHE=false
```

### Staging

```bash
# .env for staging
NODE_ENV=staging
LOG_LEVEL=info
ENABLE_WEBSOCKET=true
ENABLE_REDIS_CACHE=true
```

### Production

```bash
# .env for production
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_WEBSOCKET=true
ENABLE_REDIS_CACHE=true
ENABLE_AUDIT_LOG=true
```

### Security Checklist

- [ ] Change `JWT_SECRET` in production
- [ ] Use strong database passwords
- [ ] Enable `DB_SSL` for remote databases
- [ ] Set appropriate `CORS_ORIGIN` (not `*`)
- [ ] Use environment-specific API keys
- [ ] Rotate secrets regularly
- [ ] Never commit `.env` files to version control

---

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -U wms_user -d wms_db
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Test connection
redis-cli -h localhost -p 6379 PING
```

### WebSocket Issues

1. Check `WS_PORT` is not blocked by firewall
2. Verify `ENABLE_WEBSOCKET` flag is true
3. Check browser console for connection errors

### Feature Flags Not Working

```sql
-- Verify flag exists
SELECT * FROM feature_flags WHERE feature_key = 'YOUR_FLAG';

-- Recreate flag if missing
INSERT INTO feature_flags (feature_key, is_enabled, description)
VALUES ('YOUR_FLAG', true, 'Description');
```

---

## Additional Resources

- [API Documentation](../packages/backend/docs/API.md)
- [Database Schema](../packages/backend/docs/DATABASE_SCHEMA.md)
- [Deployment Guide](./DEPLOYMENT.md)
