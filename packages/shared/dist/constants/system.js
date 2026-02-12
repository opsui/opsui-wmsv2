/**
 * System Constants for Warehouse Management System
 *
 * This file contains all system-wide constants including:
 * - API endpoints and ports
 * - Environment configuration
 * - Business rule limits
 * - Timeouts and thresholds
 *
 * All constants should be defined here to avoid magic numbers.
 * Values should match environment variables where applicable.
 */
// ============================================================================
// API & SERVER CONFIGURATION
// ============================================================================
/**
 * Backend server configuration
 */
export const BACKEND_CONFIG = {
    /** Default port for backend API server */
    DEFAULT_PORT: 3001,
    /** Default host for backend API server */
    DEFAULT_HOST: '0.0.0.0',
    /** API base path */
    API_BASE_PATH: '/api',
    /** API version */
    API_VERSION: 'v1',
    /** Full API base URL (constructed from host, port, base path, version) */
    getApiBaseUrl(host = '0.0.0.0', port = 3001) {
        return `http://${host}:${port}${this.API_BASE_PATH}/${this.API_VERSION}`;
    },
};
/**
 * Frontend server configuration
 */
export const FRONTEND_CONFIG = {
    /** Default port for frontend dev server */
    DEFAULT_PORT: 5173,
    /** Default host for frontend dev server */
    DEFAULT_HOST: 'localhost',
    /** Default CORS origin (must match backend CORS_ORIGIN env var) */
    DEFAULT_CORS_ORIGIN: 'http://localhost:5173',
};
/**
 * WebSocket server configuration
 */
export const WEBSOCKET_CONFIG = {
    /** Default port for WebSocket server */
    DEFAULT_PORT: 3002,
    /** WebSocket path */
    WS_PATH: '/ws',
};
// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================
/**
 * PostgreSQL database configuration
 */
export const DATABASE_CONFIG = {
    /** Default database host */
    DEFAULT_HOST: 'localhost',
    /** Default database port */
    DEFAULT_PORT: 5432,
    /** Default database name */
    DEFAULT_NAME: 'wms_db',
    /** Default database user */
    DEFAULT_USER: 'wms_user',
    /** Minimum connection pool size */
    POOL_MIN: 2,
    /** Maximum connection pool size */
    POOL_MAX: 10,
    /** Connection timeout in milliseconds */
    CONNECTION_TIMEOUT_MS: 10000,
    /** Idle timeout in milliseconds */
    IDLE_TIMEOUT_MS: 30000,
    /** Statement timeout in milliseconds (prevents long-running queries) */
    STATEMENT_TIMEOUT_MS: 30000,
};
// ============================================================================
// REDIS CONFIGURATION
// ============================================================================
/**
 * Redis cache configuration (optional - degrades gracefully if unavailable)
 */
export const REDIS_CONFIG = {
    /** Default Redis host */
    DEFAULT_HOST: 'localhost',
    /** Default Redis port */
    DEFAULT_PORT: 6379,
    /** Default Redis database */
    DEFAULT_DB: 0,
    /** Default TTL for cached entries (seconds) */
    DEFAULT_TTL: 3600,
    /** Connection timeout in milliseconds */
    CONNECTION_TIMEOUT_MS: 5000,
};
// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================
/**
 * JWT configuration
 */
export const JWT_CONFIG = {
    /** Default token expiration time */
    DEFAULT_EXPIRES_IN: '8h',
    /** Refresh token expiration time */
    REFRESH_EXPIRES_IN: '7d',
};
/**
 * Bcrypt configuration
 */
export const BCRYPT_CONFIG = {
    /** Default number of hashing rounds */
    DEFAULT_ROUNDS: 10,
};
/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
    /** Time window in milliseconds */
    WINDOW_MS: 900000, // 15 minutes
    /** Max requests per window */
    MAX_REQUESTS: 100,
};
// ============================================================================
// BUSINESS RULE CONSTANTS
// ============================================================================
/**
 * Picker capacity limits
 */
export const PICKER_CONFIG = {
    /** Maximum number of orders a picker can claim at once */
    MAX_ORDERS_PER_PICKER: 10,
    /** Default picker capacity (concurrent orders) */
    DEFAULT_PICKER_CAPACITY: 5,
    /** Time before a pick task times out (minutes) */
    PICK_TIMEOUT_MINUTES: 30,
    /** Maximum pick tasks per order */
    MAX_PICK_TASKS_PER_ORDER: 100,
};
/**
 * Packer capacity limits
 */
export const PACKER_CONFIG = {
    /** Maximum number of orders a packer can handle at once */
    MAX_ORDERS_PER_PACKER: 5,
    /** Default packer capacity (concurrent orders) */
    DEFAULT_PACKER_CAPACITY: 3,
};
/**
 * Order configuration
 */
export const ORDER_CONFIG = {
    /** Maximum items per order */
    MAX_ITEMS_PER_ORDER: 100,
    /** Maximum quantity per item */
    MAX_QUANTITY_PER_ITEM: 1000,
    /** Order ID prefix */
    ORDER_ID_PREFIX: 'ORD',
    /** Order ID format pattern (for validation) */
    ORDER_ID_PATTERN: /^ORD-\d{8}-\d{6}$/, // ORD-YYYYMMDD-SSSSSS
};
/**
 * SKU/Product configuration
 */
export const SKU_CONFIG = {
    /** Maximum length of SKU code */
    MAX_SKU_LENGTH: 50,
    /** Maximum length of product name */
    MAX_NAME_LENGTH: 255,
    /** Maximum length of category name */
    MAX_CATEGORY_LENGTH: 100,
};
/**
 * Bin location configuration
 */
export const BIN_LOCATION_CONFIG = {
    /** Bin ID format pattern (for validation) */
    BIN_ID_PATTERN: /^[A-Z]-\d{1,3}-\d{2}$/, // Z-A-S format (Zone-Aisle-Shelf)
    /** Maximum length of bin ID */
    MAX_BIN_ID_LENGTH: 20,
    /** Valid zone letters */
    VALID_ZONES: [
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
        'L',
        'M',
        'N',
        'O',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
    ],
};
/**
 * Inventory configuration
 */
export const INVENTORY_CONFIG = {
    /** Minimum low stock threshold */
    LOW_STOCK_THRESHOLD: 10,
    /** Maximum quantity per bin location */
    MAX_QUANTITY_PER_BIN: 10000,
    /** Reserved inventory cannot exceed this percentage of total */
    MAX_RESERVED_PERCENTAGE: 0.9, // 90%
};
// ============================================================================
// HEALTH CHECK & MONITORING
// ============================================================================
/**
 * Health check configuration
 */
export const HEALTH_CHECK_CONFIG = {
    /** Interval between health checks (milliseconds) */
    INTERVAL_MS: 30000, // 30 seconds
    /** Timeout for health check requests (milliseconds) */
    TIMEOUT_MS: 5000,
};
// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================
/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
    /** Default log level */
    DEFAULT_LEVEL: 'info',
    /** Valid log levels */
    VALID_LEVELS: ['error', 'warn', 'info', 'http', 'debug'],
    /** Maximum log file size (bytes) */
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    /** Maximum number of log files to keep */
    MAX_FILES: 14,
};
// ============================================================================
// ID GENERATION PATTERNS
// ============================================================================
/**
 * ID generation patterns (for validation and generation)
 */
export const ID_PATTERNS = {
    /** Order ID pattern */
    ORDER: /^ORD-\d{8}-\d{6}$/,
    /** User ID pattern */
    USER: /^USR-[A-Z0-9]{8}$/,
    /** Pick task ID pattern */
    PICK_TASK: /^TSK-\d{8}-\d{6}$/,
    /** Inventory transaction ID pattern */
    INVENTORY_TRANSACTION: /^TXN-\d{8}-\d{8}$/,
    /** Order state change ID pattern */
    ORDER_STATE_CHANGE: /^OSC-\d{8}-\d{8}$/,
    /** Order item ID pattern */
    ORDER_ITEM: /^ITM-\d{8}-\d{6}$/,
};
// ============================================================================
// FEATURE FLAGS
// ============================================================================
/**
 * Feature flags (should match environment variables)
 */
export const FEATURE_FLAGS = {
    /** Enable WebSocket for real-time updates */
    ENABLE_WEBSOCKET: true,
    /** Enable Redis caching */
    ENABLE_REDIS_CACHE: true,
    /** Enable audit logging */
    ENABLE_AUDIT_LOG: true,
    /** Enable ML predictions */
    ENABLE_ML_PREDICTIONS: false, // Default off, enable via env var
};
// ============================================================================
// ERROR CODES
// ============================================================================
/**
 * Application-specific error codes
 */
export const ERROR_CODES = {
    /** Inventory-related errors */
    INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
    INVENTORY_RESERVED: 'INVENTORY_RESERVED',
    BIN_LOCATION_FULL: 'BIN_LOCATION_FULL',
    /** Order-related errors */
    INVALID_ORDER_STATE: 'INVALID_ORDER_STATE',
    ORDER_ALREADY_CLAIMED: 'ORDER_ALREADY_CLAIMED',
    PICKER_AT_CAPACITY: 'PICKER_AT_CAPACITY',
    ORDER_NOT_CANCELLABLE: 'ORDER_NOT_CANCELLABLE',
    /** Authentication errors */
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    /** Authorization errors */
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
    /** Validation errors */
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    /** Not found errors */
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    SKU_NOT_FOUND: 'SKU_NOT_FOUND',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    BIN_LOCATION_NOT_FOUND: 'BIN_LOCATION_NOT_FOUND',
    /** Conflict errors */
    RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
    DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
};
// ============================================================================
// TIME CONSTANTS
// ============================================================================
/**
 * Time constants (in milliseconds)
 */
export const TIME = {
    MILLISECOND: 1,
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
};
// ============================================================================
// REGEX VALIDATION PATTERNS
// ============================================================================
/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
    /** Email validation */
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    /** URL validation */
    URL: /^https?:\/\/.+/,
    /** UUID v4 validation */
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};
// ============================================================================
// EXPORTS
// ============================================================================
/**
 * Get all configuration values that should be overridden by environment variables.
 * This helper maps env var names to constant values.
 */
export function getEnvVarMappings() {
    return {
        // Server
        PORT: BACKEND_CONFIG.DEFAULT_PORT,
        HOST: BACKEND_CONFIG.DEFAULT_HOST,
        CORS_ORIGIN: FRONTEND_CONFIG.DEFAULT_CORS_ORIGIN,
        WS_PORT: WEBSOCKET_CONFIG.DEFAULT_PORT,
        // Database
        DB_HOST: DATABASE_CONFIG.DEFAULT_HOST,
        DB_PORT: DATABASE_CONFIG.DEFAULT_PORT,
        DB_NAME: DATABASE_CONFIG.DEFAULT_NAME,
        DB_USER: DATABASE_CONFIG.DEFAULT_USER,
        DB_POOL_MIN: DATABASE_CONFIG.POOL_MIN,
        DB_POOL_MAX: DATABASE_CONFIG.POOL_MAX,
        // Redis
        REDIS_HOST: REDIS_CONFIG.DEFAULT_HOST,
        REDIS_PORT: REDIS_CONFIG.DEFAULT_PORT,
        REDIS_DB: REDIS_CONFIG.DEFAULT_DB,
        REDIS_TTL: REDIS_CONFIG.DEFAULT_TTL,
        // Application
        DEFAULT_PICKER_CAPACITY: PICKER_CONFIG.DEFAULT_PICKER_CAPACITY,
        MAX_ORDERS_PER_PICKER: PICKER_CONFIG.MAX_ORDERS_PER_PICKER,
        PICK_TIMEOUT_MINUTES: PICKER_CONFIG.PICK_TIMEOUT_MINUTES,
        // Feature flags
        ENABLE_WEBSOCKET: FEATURE_FLAGS.ENABLE_WEBSOCKET,
        ENABLE_REDIS_CACHE: FEATURE_FLAGS.ENABLE_REDIS_CACHE,
        ENABLE_AUDIT_LOG: FEATURE_FLAGS.ENABLE_AUDIT_LOG,
    };
}
