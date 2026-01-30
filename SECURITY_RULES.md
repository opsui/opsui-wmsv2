# Security Rules for Warehouse Management System

**Purpose**: Comprehensive security guidelines for AI agents and developers.

**Version**: 1.1.0
**Last Updated**: 2026-01-30

---

## Security First Mindset

> **"Security is not a feature, it's a foundation."**

Every line of code must be written with security in mind. Assumptions about user input are security vulnerabilities waiting to happen.

---

## Core Security Principles

### 1. Never Trust Client Input

**Rule**: All client input is malicious until proven otherwise.

```typescript
// ❌ WRONG - Trusts client
app.post('/orders', async (req, res) => {
  const { quantity } = req.body;
  await createOrder(quantity); // What if quantity is -1000?
});

// ✅ CORRECT - Validates input
app.post('/orders', async (req, res) => {
  const { quantity } = orderCreateSchema.validate(req.body);
  if (quantity <= 0) throw new ValidationError('Quantity must be positive');
  await createOrder(quantity);
});
```

### 2. Principle of Least Privilege

**Rule**: Users should have the minimum permissions necessary to do their job.

```typescript
// ❌ WRONG - Admin checks role
if (user.role === 'ADMIN') {
  deleteOrder(orderId); // What if picker finds a way to call this?
}

// ✅ CORRECT - Middleware enforces permissions
router.delete(
  '/orders/:id',
  authenticate,
  authorize([UserRole.ADMIN]),
  deleteOrderHandler
);
```

### 3. Defense in Depth

**Rule**: Multiple layers of security. If one fails, others protect you.

```typescript
// Layer 1: Input validation
const validated = await schema.validate(input);

// Layer 2: Type checking
const typed: Order = validated;

// Layer 3: Business logic validation
await validateBusinessRules(typed);

// Layer 4: Database constraints
await db('orders').insert(typed); // CHECK constraints enforce rules
```

### 4. Fail Securely

**Rule**: When something goes wrong, default to denying access.

```typescript
// ❌ WRONG - Fail open
try {
  const user = await getUser(userId);
  if (user.role === 'ADMIN') {
    return sensitiveData;
  }
} catch (error) {
  return sensitiveData; // ERROR: Returns data on error!
}

// ✅ CORRECT - Fail closed
try {
  const user = await getUser(userId);
  if (user.role === 'ADMIN') {
    return sensitiveData;
  }
  throw new ForbiddenError('Insufficient permissions');
} catch (error) {
  logger.error('Access denied', { userId, error });
  throw new ForbiddenError('Access denied');
}
```

---

## Input Validation

### Joi Schema Validation

All API endpoints must validate input using Joi schemas.

```typescript
import Joi from 'joi';

// Define schemas
export const createOrderSchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  customerName: Joi.string().max(255).required(),
  items: Joi.array()
    .items(
      Joi.object({
        sku: Joi.string().max(50).required(),
        quantity: Joi.number().integer().positive().required(),
        binLocation: Joi.string()
          .pattern(/^[A-Z]-\d{1,3}-\d{2}$/)
          .required(),
      })
    )
    .min(1)
    .max(100)
    .required(),
  priority: Joi.string()
    .valid(...Object.values(OrderPriority))
    .default(OrderPriority.NORMAL),
  notes: Joi.string().max(1000).optional(),
});

// Use in middleware
export const validateCreateOrder = async (req, res, next) => {
  try {
    req.body = await createOrderSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    next();
  } catch (error) {
    next(new ValidationError('Invalid input', error.details));
  }
};

// Apply to route
router.post('/orders', validateCreateOrder, createOrderHandler);
```

### Validation Rules

| Input Type | Validation Rule              | Why                |
| ---------- | ---------------------------- | ------------------ |
| UUIDs      | Must be valid UUID v4        | Prevents injection |
| Strings    | Max length, no special chars | Prevents DoS       |
| Numbers    | Positive, max value          | Prevents overflow  |
| Emails     | Email format                 | Prevents injection |
| Dates      | ISO 8601 format              | Prevents injection |
| Arrays     | Min/max length               | Prevents DoS       |

---

## Authentication & Authorization

### JWT Token Validation

```typescript
import jwt from 'jsonwebtoken';
import { passport } from './passport';

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Attach user to request
    req.user = await getUserById(decoded.userId);
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
};
```

### Role-Based Access Control (RBAC)

```typescript
import { UserRole } from '@wms/shared/types';

// Authorization middleware
export const authorize = (allowedRoles: UserRole[]) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.path,
      });
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

// Usage
router.get(
  '/admin/users',
  authenticate,
  authorize([UserRole.ADMIN]),
  listUsersHandler
);

router.post(
  '/orders/:id/cancel',
  authenticate,
  authorize([UserRole.SUPERVISOR, UserRole.ADMIN]),
  cancelOrderHandler
);
```

### Resource-Level Authorization

```typescript
// Check if user owns the resource
export const authorizeResource = async (req, res, next) => {
  const { orderId } = req.params;
  const order = await getOrder(orderId);

  // Admins can access everything
  if (req.user.role === UserRole.ADMIN) {
    return next();
  }

  // Pickers can only access their own orders
  if (req.user.role === UserRole.PICKER) {
    if (order.pickerId !== req.user.id) {
      throw new ForbiddenError('You can only access your own orders');
    }
    return next();
  }

  throw new ForbiddenError('Insufficient permissions');
};

// Usage
router.get('/orders/:id', authenticate, authorizeResource, getOrderHandler);
```

---

## SQL Injection Prevention

### Always Use Parameterized Queries

```typescript
// ❌ WRONG - SQL injection vulnerability
async function getOrdersByEmail(email: string) {
  const query = `SELECT * FROM orders WHERE customer_email = '${email}'`;
  return await db.raw(query); // What if email is "' OR '1'='1"?
}

// ✅ CORRECT - Parameterized query
async function getOrdersByEmail(email: string) {
  return await db('orders').where({ customer_email: email }).select('*');
}

// ✅ CORRECT - Query builder
async function getOrdersByStatus(statuses: string[]) {
  return await db('orders').whereIn('status', statuses).select('*');
}
```

### Query Builder Safety

```typescript
// ❌ WRONG - Unsafe interpolation
async function searchOrders(searchTerm: string) {
  return await db('orders').whereRaw(`name LIKE '%${searchTerm}%'`); // SQL injection!
}

// ✅ CORRECT - Safe binding
async function searchOrders(searchTerm: string) {
  return await db('orders').where('name', 'like', `%${searchTerm}%`);
}

// ✅ CORRECT - Named bindings
async function getOrdersInDateRange(start: Date, end: Date) {
  return await db('orders')
    .whereBetween('created_at', [start, end])
    .select('*');
}
```

---

## Cross-Site Scripting (XSS) Prevention

### Sanitize User-Generated Content

```typescript
import DOMPurify from 'dompurify';
import validator from 'validator';

// ❌ WRONG - Renders unsanitized HTML
function OrderNotes({ notes }) {
  return <div dangerouslySetInnerHTML={{ __html: notes }} />;
}

// ✅ CORRECT - Sanitizes HTML
function OrderNotes({ notes }) {
  const sanitized = DOMPurify.sanitize(notes);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ✅ BETTER - Escape all output
function OrderNotes({ notes }) {
  return <div>{validator.escape(notes)}</div>;
}
```

### Content Security Policy (CSP)

```typescript
// CSP middleware
export const contentSecurityPolicy = (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  next();
};

// Apply to all routes
app.use(contentSecurityPolicy);
```

---

## Cross-Site Request Forgery (CSRF) Prevention

### CSRF Tokens

```typescript
import csrf from 'csurf';

// CSRF protection
const csrfProtection = csrf({ cookie: true });

// Apply to state-changing routes
app.post('/orders',
  csrfProtection,
  authenticate,
  createOrderHandler
);

// Include token in forms
function OrderForm() {
  return (
    <form method="POST" action="/orders">
      <input type="hidden" name="_csrf" value={csrfToken} />
      {/* Form fields */}
    </form>
  );
}
```

### SameSite Cookies

```typescript
// Cookie configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    },
  })
);
```

---

## Password Security

### Hashing with Bcrypt

```typescript
import bcrypt from 'bcrypt';

// Hash password on create
async function createUser(userData: CreateUserDTO) {
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  return await db('users').insert({
    email: userData.email,
    password_hash: hashedPassword,
    // ... other fields
  });
}

// Verify password on login
async function loginUser(email: string, password: string) {
  const user = await getUserByEmail(email);

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  return user;
}
```

### Password Requirements

```typescript
export const passwordSchema = Joi.string()
  .min(12)
  .max(128)
  .pattern(/[a-z]/, 'must contain a lowercase letter')
  .pattern(/[A-Z]/, 'must contain an uppercase letter')
  .pattern(/[0-9]/, 'must contain a number')
  .pattern(/[^a-zA-Z0-9]/, 'must contain a special character')
  .required();
```

---

## Rate Limiting

### Prevent Brute Force Attacks

```typescript
import rateLimit from 'express-rate-limit';

// General rate limiting
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for auth
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later',
});

// Apply to routes
app.use('/api/', generalLimiter);
app.post('/api/auth/login', authLimiter, loginHandler);
app.post('/api/auth/reset-password', authLimiter, resetPasswordHandler);
```

---

## Data Encryption

### Encrypt Sensitive Data at Rest

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts.slice(1).join(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Usage
const encryptedSSN = encrypt(customer.ssn);
await db('customers').insert({ ssn_encrypted: encryptedSSN });
```

### TLS/SSL for Data in Transit

```typescript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// HSTS header
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  next();
});
```

---

## Audit Logging

### Log All Security Events

```typescript
import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'security.log' })],
});

export function logSecurityEvent(event: {
  type:
    | 'auth_success'
    | 'auth_failure'
    | 'unauthorized_access'
    | 'privilege_escalation';
  userId?: string;
  ip: string;
  userAgent: string;
  details?: any;
}) {
  securityLogger.info({
    ...event,
    timestamp: new Date().toISOString(),
  });
}

// Usage
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await loginUser(email, password);

    logSecurityEvent({
      type: 'auth_success',
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ token: generateToken(user) });
  } catch (error) {
    logSecurityEvent({
      type: 'auth_failure',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      details: { email },
    });

    throw error;
  }
});
```

---

## Secrets Management

### Never Commit Secrets

```typescript
// ❌ WRONG - Hardcoded secrets
const API_KEY = 'sk_live_abc123...';

// ✅ CORRECT - Environment variables
const API_KEY = process.env.STRIPE_SECRET_KEY;

if (!API_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}
```

### Environment Variable Validation

```typescript
// Validate required environment variables on startup
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'ENCRYPTION_KEY',
  'REDIS_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}

// Type-safe environment variables
export const env = {
  jwtSecret: process.env.JWT_SECRET!,
  databaseUrl: process.env.DATABASE_URL!,
  encryptionKey: process.env.ENCRYPTION_KEY!,
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
} as const;
```

---

## File Upload Security

### Validate File Uploads

```typescript
import multer from 'multer';
import path from 'path';

// Allowed file types
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

// File filter
const fileFilter = (req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Invalid file type'), false);
  }

  // Check MIME type
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Invalid MIME type'), false);
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  dest: 'uploads/',
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// Use in route
app.post(
  '/api/documents',
  authenticate,
  upload.single('document'),
  handleDocumentUpload
);
```

---

## API Security Headers

### Set Security Headers

```typescript
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent referrer leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');

  next();
};

app.use(securityHeaders);
```

---

## Dependency Security

### Regular Security Audits

```bash
# Run npm audit
npm audit

# Fix vulnerabilities
npm audit fix

# Automated security scanning
npm install -g npm-check-updates
ncu
```

### Package.json Scripts

```json
{
  "scripts": {
    "audit": "npm audit --audit-level=high",
    "audit:fix": "npm audit fix",
    "check-updates": "npm-check-updates -u",
    "outdated": "npm outdated"
  }
}
```

---

## Security Checklist for AI Agents

Before completing any feature, verify:

### Authentication & Authorization

- [ ] Does endpoint require authentication?
- [ ] Are roles checked properly?
- [ ] Can users only access their own resources?
- [ ] Are admin actions protected?

### Input Validation

- [ ] Is all input validated with Joi?
- [ ] Are numbers bounded (min/max)?
- [ ] Are strings length-limited?
- [ ] Are UUIDs validated?
- [ ] Are regex patterns safe?

### SQL Injection

- [ ] Are all queries parameterized?
- [ ] No raw SQL with user input?
- [ ] No string concatenation in queries?

### XSS Prevention

- [ ] Is user output escaped?
- [ ] Are CSP headers set?
- [ ] Is dangerous HTML sanitized?

### Data Protection

- [ ] Are passwords hashed with bcrypt?
- [ ] Is sensitive data encrypted?
- [ ] Are secrets in environment variables?
- [ ] Are secrets never committed?

### Rate Limiting

- [ ] Are auth endpoints rate-limited?
- [ ] Are API endpoints rate-limited?
- [ ] Can brute force attacks be prevented?

### Audit Logging

- [ ] Are auth attempts logged?
- [ ] Are unauthorized attempts logged?
- [ ] Are privilege escalations logged?

---

## Common Security Mistakes to Avoid

### 1. Hardcoded Secrets

```typescript
// ❌ WRONG
const API_KEY = 'sk_live_abc123...';

// ✅ CORRECT
const API_KEY = process.env.API_KEY!;
```

### 2. SQL Injection

```typescript
// ❌ WRONG
db.raw(`SELECT * FROM users WHERE id = '${userId}'`);

// ✅ CORRECT
db('users').where({ id: userId });
```

### 3. XSS Vulnerability

```typescript
// ❌ WRONG
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ CORRECT
<div>{DOMPurify.sanitize(userInput)}</div>
```

### 4. Weak Passwords

```typescript
// ❌ WRONG
const hashed = await hash(password, 5); // Too few rounds

// ✅ CORRECT
const hashed = await bcrypt.hash(password, 10); // At least 10 rounds
```

### 5. Missing Authorization

```typescript
// ❌ WRONG
app.delete('/orders/:id', deleteOrderHandler);

// ✅ CORRECT
app.delete(
  '/orders/:id',
  authenticate,
  authorize([UserRole.ADMIN]),
  deleteOrderHandler
);
```

---

## Security Testing

### Automated Security Tests

```typescript
describe('Security', () => {
  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE orders; --";

      await expect(
        createOrder({ customerName: maliciousInput })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject XSS attempts', async () => {
      const xssInput = '<script>alert("XSS")</script>';

      const response = await createOrder({ notes: xssInput });

      expect(response.notes).not.toContain('<script>');
    });
  });

  describe('Authorization', () => {
    it('should prevent picker from accessing admin endpoints', async () => {
      const picker = await createTestUser({ role: UserRole.PICKER });

      await expect(adminEndpoint(picker.token)).rejects.toThrow(ForbiddenError);
    });
  });
});
```

---

## Security Tools

### Recommended Security Tools

1. **npm audit** - Check for vulnerable dependencies
2. **Snyk** - Dependency vulnerability scanning
3. **OWASP ZAP** - Web application security scanner
4. **Helmet** - Security headers for Express
5. **Joi** - Input validation
6. **Bcrypt** - Password hashing
7. **DOMPurify** - XSS prevention

---

## Incident Response

### Security Incident Plan

1. **Detect** - Monitor security logs
2. **Contain** - Isolate affected systems
3. **Eradicate** - Remove vulnerabilities
4. **Recover** - Restore from backups
5. **Post-Mortem** - Document and learn

### Emergency Contacts

- Security Team: security@company.com
- CTO: cto@company.com
- Incident Response: incidents@company.com

---

## Summary

### Security Commandments

1. **Never trust client input** - Always validate
2. **Always use parameterized queries** - Prevent SQL injection
3. **Always hash passwords** - Use bcrypt with 10+ rounds
4. **Always enforce authorization** - Check roles and ownership
5. **Always log security events** - Audit trail is essential
6. **Never commit secrets** - Use environment variables
7. **Always use HTTPS** - Encrypt data in transit
8. **Always rate limit** - Prevent brute force
9. **Always escape output** - Prevent XSS
10. **Always assume compromise** - Defense in depth

---

**Remember**: Security is not a feature, it's a foundation. Every line of code must be written with security in mind.

**When in doubt**: Ask yourself "How could this be abused?" and "What's the worst that could happen?"

**Security is everyone's responsibility.**
