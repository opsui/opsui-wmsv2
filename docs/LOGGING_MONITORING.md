# Logging & Monitoring Standards

> **AI Context System - Observability & Monitoring Standards**
> 
> **Version:** 1.0.0 | **Last Updated:** 2026-03-12
> 
> **Purpose:** Define logging conventions, monitoring setup, and alerting standards

---

## Logging Architecture

### Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `ERROR` | Application errors, exceptions | Database connection failed |
| `WARN` | Potential issues, deprecations | Slow query detected |
| `INFO` | Business events, state changes | Order created, user logged in |
| `DEBUG` | Development details | Query parameters, variable values |
| `TRACE` | Detailed debugging | Full request/response data |

### Log Format (Structured JSON)

```typescript
interface LogEntry {
  timestamp: string;      // ISO 8601 format
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';
  message: string;
  service: string;        // 'wms-backend' | 'wms-frontend'
  requestId?: string;     // X-Request-ID header
  userId?: string;        // Authenticated user ID
  organizationId?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

### Example Log Entries

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Order status changed",
  "service": "wms-backend",
  "requestId": "req_abc123",
  "userId": "user_456",
  "organizationId": 1,
  "metadata": {
    "orderId": "order_789",
    "fromStatus": "PENDING",
    "toStatus": "PICKING"
  }
}
```

```json
{
  "timestamp": "2024-01-15T10:30:01.000Z",
  "level": "ERROR",
  "message": "Database query failed",
  "service": "wms-backend",
  "requestId": "req_abc123",
  "error": {
    "name": "DatabaseError",
    "message": "Connection timeout",
    "stack": "Error: Connection timeout\n    at ..."
  }
}
```

---

## Logging Implementation

### Backend Logger

```typescript
// packages/backend/src/utils/logger.ts
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'wms-backend',
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] ${level}: ${message} ${JSON.stringify(meta)}`;
        })
      ),
    }),
    // File output (production)
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: '/var/log/wms/error.log',
        level: 'error',
      }),
      new winston.transports.File({
        filename: '/var/log/wms/combined.log',
      }),
    ] : []),
  ],
});

// Request logger middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
    });
  });
  
  next();
}
```

### Frontend Logger

```typescript
// packages/frontend/src/utils/logger.ts

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  userId?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};
  
  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }
  
  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, { ...context, error: error?.message, stack: error?.stack });
  }
  
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }
  
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }
  
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }
  
  private log(level: LogLevel, message: string, context?: LogContext) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...context,
    };
    
    // Console output
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${level.toUpperCase()}]`, message, context || '');
    
    // Send to logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLogService(entry);
    }
  }
  
  private async sendToLogService(entry: Record<string, unknown>) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {
      // Silently fail - don't break the app for logging issues
    }
  }
}

export const logger = new Logger();
```

---

## What to Log

### Always Log

| Event | Level | Required Fields |
|-------|-------|-----------------|
| Request received | INFO | requestId, method, path |
| Request completed | INFO | requestId, statusCode, duration |
| Authentication attempt | INFO | requestId, email, success |
| Order state change | INFO | orderId, fromStatus, toStatus, userId |
| Inventory change | INFO | skuId, locationId, quantity, reason |
| Error occurred | ERROR | requestId, error details, stack |
| Slow query (>1s) | WARN | query, duration |

### Never Log

- Passwords or password hashes
- JWT tokens (full token)
- Credit card numbers
- Personal Identifiable Information (PII) without masking
- API keys or secrets
- Session tokens

### Sensitive Data Masking

```typescript
function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...data };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard'];
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***REDACTED***';
    }
  }
  
  return masked;
}
```

---

## Health Check Endpoints

### Basic Health Check

```typescript
// GET /api/health
router.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  });
});
```

### Detailed Health Check

```typescript
// GET /api/health/detailed
router.get('/health/detailed', async (req, res) => {
  const checks = {
    database: await checkDatabases(),
    redis: await checkRedis(),
    memory: getMemoryUsage(),
    uptime: process.uptime(),
  };
  
  const allHealthy = Object.values(checks.database).every(v => v === 'healthy');
  const status = allHealthy ? 'healthy' : 'degraded';
  
  res.status(allHealthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    checks,
  });
});

async function checkDatabases() {
  const results: Record<string, string> = {};
  
  try {
    await wmsDB.query('SELECT 1');
    results.wms_db = 'healthy';
  } catch {
    results.wms_db = 'unhealthy';
  }
  
  try {
    await aapDB.query('SELECT 1');
    results.aap_db = 'healthy';
  } catch {
    results.aap_db = 'unhealthy';
  }
  
  return results;
}
```

---

## Monitoring Setup

### Server Monitoring

```bash
# Check PM2 process status
pm2 status

# Check PM2 memory usage
pm2 monit

# Check PM2 logs
pm2 logs wms-backend --lines 100
```

### Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, query, state, query_start 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < NOW() - INTERVAL '5 seconds';

-- Table sizes
SELECT relname, n_live_tup 
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC 
LIMIT 10;
```

### Nginx Monitoring

```bash
# Active connections
nginx -s status

# Access log analysis
tail -f /var/log/nginx/access.log | grep -E ' 5[0-9]{2} '
```

---

## Alerting Rules

### Critical Alerts (Immediate Response)

| Condition | Alert | Response |
|-----------|-------|----------|
| Health check fails | Page on-call | Investigate immediately |
| Error rate > 5% | Page on-call | Check logs, deploy fix |
| Database connection lost | Page on-call | Restart services |
| Memory > 90% | Page on-call | Scale or restart |
| Disk > 90% | Page on-call | Clean up or expand |

### Warning Alerts (Same-Day Response)

| Condition | Alert | Response |
|-----------|-------|----------|
| Error rate > 1% | Slack notification | Review logs |
| Response time > 1s | Slack notification | Optimize queries |
| Memory > 75% | Slack notification | Monitor trend |
| Disk > 75% | Slack notification | Plan cleanup |

---

## Log Retention Policy

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Application logs | 30 days | /var/log/wms/ |
| Access logs | 7 days | /var/log/nginx/ |
| Error logs | 90 days | /var/log/wms/error.log |
| Audit logs | 1 year | Database (audit_log table) |

### Log Rotation

```bash
# /etc/logrotate.d/wms
/var/log/wms/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Performance Metrics

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (p50) | < 100ms | > 200ms |
| API Response Time (p95) | < 500ms | > 1s |
| API Response Time (p99) | < 1s | > 2s |
| Error Rate | < 0.1% | > 1% |
| Database Query Time | < 50ms | > 200ms |
| WebSocket Connections | - | - |
| Active Users | - | - |

### Custom Metrics

```typescript
// Track business metrics
metrics.increment('order.created', { organizationId });
metrics.increment('pick.completed', { pickerId });
metrics.histogram('pick.duration', duration, { zone });
metrics.gauge('inventory.low', lowStockCount, { warehouse });
```

---

## Audit Logging

### Events to Audit

- User authentication (success/failure)
- Permission changes
- Order state changes
- Inventory adjustments
- Configuration changes
- Data exports
- API key usage

### Audit Log Schema

```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id INTEGER,
  organization_id INTEGER,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100)
);

-- Index for querying by user
CREATE INDEX idx_audit_log_user ON audit_log(user_id, timestamp DESC);

-- Index for querying by entity
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id, timestamp DESC);
```

---

## Summary Checklist

Before deploying:

- [ ] Logging configured for all services
- [ ] Log levels set appropriately for environment
- [ ] Health check endpoints working
- [ ] Sensitive data is masked
- [ ] Log rotation configured
- [ ] Alerts configured for critical errors
- [ ] Audit logging enabled for sensitive operations
- [ ] Performance metrics being collected