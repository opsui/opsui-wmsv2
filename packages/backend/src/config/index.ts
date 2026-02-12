/**
 * Configuration module
 *
 * Centralizes all configuration values from environment variables
 */

// Whitelist of allowed environment variable keys to prevent object injection
const ALLOWED_ENV_KEYS = new Set([
  'PORT',
  'HOST',
  'NODE_ENV',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DB_SSL',
  'DB_POOL_MIN',
  'DB_POOL_MAX',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'REDIS_DB',
  'REDIS_TTL',
  'ENABLE_REDIS_CACHE',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'BCRYPT_ROUNDS',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'CORS_ORIGIN',
  'DEFAULT_PICKER_CAPACITY',
  'MAX_ORDERS_PER_PICKER',
  'PICK_TIMEOUT_MINUTES',
  'ENABLE_WEBSOCKET',
  'WS_PORT',
  'HEALTH_CHECK_INTERVAL',
  'ENABLE_AUDIT_LOG',
  'ENABLE_OPENTELEMETRY',
  'ENABLE_PROMETHEUS',
  'TEST_MODE',
  'OTEL_SERVICE_NAME',
  'OTEL_COLLECTOR_URL',
  'PROMETHEUS_PORT',
  'PROMETHEUS_PATH',
  'NZC_BASE_URL',
  'NZC_API_KEY',
  'NZC_SITE_ID',
  'NZC_SUPPORT_EMAIL',
  'SENDGRID_API_KEY',
  'SENDGRID_FROM_EMAIL',
  'SENDGRID_REPLY_TO_EMAIL',
  'POSTMARK_API_KEY',
  'POSTMARK_FROM_EMAIL',
  'POSTMARK_REPLY_TO_EMAIL',
  'AWS_SES_REGION',
  'AWS_SES_ACCESS_KEY_ID',
  'AWS_SES_SECRET_ACCESS_KEY',
  'AWS_SES_FROM_EMAIL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_RATE_LIMIT',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
]);

/**
 * Safely gets an environment variable with a default value
 * Handles undefined, null, and empty string cases
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
function getEnv(key: string, defaultValue: string): string {
  if (!ALLOWED_ENV_KEYS.has(key)) {
    throw new Error(`Unknown environment variable key: ${key}`);
  }
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[key];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (value !== undefined && value !== null) {
    return value.trim() || defaultValue;
  }
  return defaultValue;
}

/**
 * Safely gets a numeric environment variable with a default value
 */
function getEnvNumber(key: string, defaultValue: number): number {
  if (!ALLOWED_ENV_KEYS.has(key)) {
    throw new Error(`Unknown environment variable key: ${key}`);
  }
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[key];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (value !== undefined && value !== null) {
    const trimmed = value.trim();
    if (trimmed) {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return defaultValue;
}

/**
 * Safely gets a boolean environment variable based on 'true'/'false' string
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  if (!ALLOWED_ENV_KEYS.has(key)) {
    throw new Error(`Unknown environment variable key: ${key}`);
  }
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[key];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (value !== undefined && value !== null) {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed.toLowerCase() === 'true';
    }
  }
  return defaultValue;
}

export default {
  // Server
  port: getEnvNumber('PORT', 3001),
  host: getEnv('HOST', '0.0.0.0'),
  nodeEnv: getEnv('NODE_ENV', 'development'),

  // Database
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: getEnvNumber('DB_PORT', 5432),
    name: getEnv('DB_NAME', 'wms_db'),
    user: getEnv('DB_USER', 'wms_user'),
    password: getEnv('DB_PASSWORD', 'wms_password'),
    ssl: getEnvBoolean('DB_SSL', false),
    poolMin: getEnvNumber('DB_POOL_MIN', 2),
    poolMax: getEnvNumber('DB_POOL_MAX', 10),
  },

  // Redis
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', ''),
    db: getEnvNumber('REDIS_DB', 0),
    ttl: getEnvNumber('REDIS_TTL', 3600),
    enabled: getEnvBoolean('ENABLE_REDIS_CACHE', true),
  },

  // JWT
  jwt: {
    get secret(): string {
      const secret = process.env.JWT_SECRET;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (secret === undefined || secret === null || !secret.trim()) {
        throw new Error(
          'JWT_SECRET environment variable must be set. This is required for security.'
        );
      }
      // Validate minimum secret length
      if (secret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
      }
      return secret;
    },
    // Use 24-hour tokens for test environment to prevent mid-run expiration
    get expiresIn(): string {
      const nodeEnv = getEnv('NODE_ENV', 'development');
      if (nodeEnv === 'test') {
        return getEnv('JWT_EXPIRES_IN', '24h');
      }
      return getEnv('JWT_EXPIRES_IN', '8h');
    },
    // Use 30-day refresh tokens for test environment
    get refreshExpiresIn(): string {
      const nodeEnv = getEnv('NODE_ENV', 'development');
      if (nodeEnv === 'test') {
        return getEnv('JWT_REFRESH_EXPIRES_IN', '30d');
      }
      return getEnv('JWT_REFRESH_EXPIRES_IN', '7d');
    },
  },

  // Bcrypt
  bcrypt: {
    rounds: getEnvNumber('BCRYPT_ROUNDS', 10),
  },

  // Rate limiting
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  // CORS - Allow both localhost and production domain
  cors: {
    origin: (process.env.CORS_ORIGIN || 'https://opsui.app,http://localhost:5173,http://localhost:3000,http://localhost:5174').split(',').map(String).filter(Boolean),
  },

  // Application
  app: {
    defaultPickerCapacity: getEnvNumber('DEFAULT_PICKER_CAPACITY', 5),
    maxOrdersPerPicker: getEnvNumber('MAX_ORDERS_PER_PICKER', 10),
    pickTimeoutMinutes: getEnvNumber('PICK_TIMEOUT_MINUTES', 30),
  },

  // WebSocket
  websocket: {
    enabled: getEnvBoolean('ENABLE_WEBSOCKET', false),
    port: getEnvNumber('WS_PORT', 3002),
  },

  // Health check
  health: {
    checkInterval: getEnvNumber('HEALTH_CHECK_INTERVAL', 30000),
  },

  // Feature flags
  features: {
    websocket: getEnvBoolean('ENABLE_WEBSOCKET', false),
    redisCache: getEnvBoolean('ENABLE_REDIS_CACHE', true),
    auditLog: getEnvBoolean('ENABLE_AUDIT_LOG', true),
    openTelemetry: getEnvBoolean('ENABLE_OPENTELEMETRY', true),
    prometheus: getEnvBoolean('ENABLE_PROMETHEUS', false),
  },

  // Test mode - disables authentication for automated testing
  testMode: getEnvBoolean('TEST_MODE', false),

  // OpenTelemetry Configuration
  otel: {
    serviceName: getEnv('OTEL_SERVICE_NAME', 'wms-backend'),
    collectorUrl: getEnv('OTEL_COLLECTOR_URL', 'http://localhost:4317'),
    enabled: getEnvBoolean('ENABLE_OPENTELEMETRY', true),
  },

  // Prometheus Configuration
  prometheus: {
    enabled: getEnvBoolean('ENABLE_PROMETHEUS', false),
    port: getEnvNumber('PROMETHEUS_PORT', 9090),
    path: getEnv('PROMETHEUS_PATH', '/metrics'),
  },

  // NZC API Configuration
  nzc: {
    baseUrl: getEnv('NZC_BASE_URL', 'https://api.gosweetspot.com'),
    apiKey: getEnv('NZC_API_KEY', ''),
    siteId: getEnv('NZC_SITE_ID', ''),
    supportEmail: getEnv('NZC_SUPPORT_EMAIL', ''),
  },

  // Email Provider Configuration
  email: {
    sendgrid: {
      apiKey: getEnv('SENDGRID_API_KEY', ''),
      from: process.env.SENDGRID_FROM_EMAIL ?? undefined,
      replyTo: process.env.SENDGRID_REPLY_TO_EMAIL ?? undefined,
    },
    postmark: {
      apiKey: getEnv('POSTMARK_API_KEY', ''),
      from: process.env.POSTMARK_FROM_EMAIL ?? undefined,
      replyTo: process.env.POSTMARK_REPLY_TO_EMAIL ?? undefined,
    },
    ses: {
      region: getEnv('AWS_SES_REGION', 'us-east-1'),
      accessKeyId: getEnv('AWS_SES_ACCESS_KEY_ID', ''),
      secretAccessKey: getEnv('AWS_SES_SECRET_ACCESS_KEY', ''),
      from: process.env.AWS_SES_FROM_EMAIL ?? undefined,
    },
  },

  // SMS Provider Configuration
  sms: {
    accountSid: getEnv('TWILIO_ACCOUNT_SID', ''),
    authToken: getEnv('TWILIO_AUTH_TOKEN', ''),
    from: process.env.TWILIO_PHONE_NUMBER ?? undefined,
    rateLimitPerSecond: getEnvNumber('TWILIO_RATE_LIMIT', 5),
  },

  // Push Notification Configuration
  push: {
    vapidPublicKey: getEnv('VAPID_PUBLIC_KEY', ''),
    vapidPrivateKey: getEnv('VAPID_PRIVATE_KEY', ''),
    vapidSubject: getEnv('VAPID_SUBJECT', 'mailto:admin@wms.local'),
  },

  // Check if all required env vars are set
  isProduction(): boolean {
    return this.nodeEnv === 'production';
  },

  isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },

  isTest(): boolean {
    return this.nodeEnv === 'test';
  },
};
