/**
 * Configuration module
 *
 * Centralizes all configuration values from environment variables
 */

export default {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
    ssl: process.env.DB_SSL === 'true',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
    enabled: process.env.ENABLE_REDIS_CACHE !== 'false',
  },

  // JWT
  jwt: {
    get secret(): string {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
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
      if (process.env.NODE_ENV === 'test') {
        return process.env.JWT_EXPIRES_IN || '24h';
      }
      return process.env.JWT_EXPIRES_IN || '8h';
    },
    // Use 30-day refresh tokens for test environment
    get refreshExpiresIn(): string {
      if (process.env.NODE_ENV === 'test') {
        return process.env.JWT_REFRESH_EXPIRES_IN || '30d';
      }
      return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    },
  },

  // Bcrypt
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  // Application
  app: {
    defaultPickerCapacity: parseInt(process.env.DEFAULT_PICKER_CAPACITY || '5', 10),
    maxOrdersPerPicker: parseInt(process.env.MAX_ORDERS_PER_PICKER || '10', 10),
    pickTimeoutMinutes: parseInt(process.env.PICK_TIMEOUT_MINUTES || '30', 10),
  },

  // WebSocket
  websocket: {
    enabled: process.env.ENABLE_WEBSOCKET === 'true',
    port: parseInt(process.env.WS_PORT || '3002', 10),
  },

  // Health check
  health: {
    checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
  },

  // Feature flags
  features: {
    websocket: process.env.ENABLE_WEBSOCKET === 'true',
    redisCache: process.env.ENABLE_REDIS_CACHE !== 'false',
    auditLog: process.env.ENABLE_AUDIT_LOG !== 'false',
    openTelemetry: process.env.ENABLE_OPENTELEMETRY !== 'false',
    prometheus: process.env.ENABLE_PROMETHEUS === 'true',
  },

  // Test mode - disables authentication for automated testing
  testMode: process.env.TEST_MODE === 'true',

  // OpenTelemetry Configuration
  otel: {
    serviceName: process.env.OTEL_SERVICE_NAME || 'wms-backend',
    collectorUrl: process.env.OTEL_COLLECTOR_URL || 'http://localhost:4317',
    enabled: process.env.ENABLE_OPENTELEMETRY !== 'false',
  },

  // Prometheus Configuration
  prometheus: {
    enabled: process.env.ENABLE_PROMETHEUS === 'true',
    port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
    path: process.env.PROMETHEUS_PATH || '/metrics',
  },

  // NZC API Configuration
  nzc: {
    baseUrl: process.env.NZC_BASE_URL || 'https://api.gosweetspot.com',
    apiKey: process.env.NZC_API_KEY || '',
    siteId: process.env.NZC_SITE_ID || '',
    supportEmail: process.env.NZC_SUPPORT_EMAIL || '',
  },

  // Email Provider Configuration
  email: {
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
      from: process.env.SENDGRID_FROM_EMAIL,
      replyTo: process.env.SENDGRID_REPLY_TO_EMAIL,
    },
    postmark: {
      apiKey: process.env.POSTMARK_API_KEY || '',
      from: process.env.POSTMARK_FROM_EMAIL,
      replyTo: process.env.POSTMARK_REPLY_TO_EMAIL,
    },
    ses: {
      region: process.env.AWS_SES_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || '',
      from: process.env.AWS_SES_FROM_EMAIL,
    },
  },

  // SMS Provider Configuration
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    from: process.env.TWILIO_PHONE_NUMBER,
    rateLimitPerSecond: parseInt(process.env.TWILIO_RATE_LIMIT || '5', 10),
  },

  // Push Notification Configuration
  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@wms.local',
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
