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
/**
 * Backend server configuration
 */
export declare const BACKEND_CONFIG: {
    /** Default port for backend API server */
    readonly DEFAULT_PORT: 3001;
    /** Default host for backend API server */
    readonly DEFAULT_HOST: "0.0.0.0";
    /** API base path */
    readonly API_BASE_PATH: "/api";
    /** API version */
    readonly API_VERSION: "v1";
    /** Full API base URL (constructed from host, port, base path, version) */
    readonly getApiBaseUrl: (host?: string, port?: number) => string;
};
/**
 * Frontend server configuration
 */
export declare const FRONTEND_CONFIG: {
    /** Default port for frontend dev server */
    readonly DEFAULT_PORT: 5173;
    /** Default host for frontend dev server */
    readonly DEFAULT_HOST: "localhost";
    /** Default CORS origin (must match backend CORS_ORIGIN env var) */
    readonly DEFAULT_CORS_ORIGIN: "http://localhost:5173";
};
/**
 * WebSocket server configuration
 */
export declare const WEBSOCKET_CONFIG: {
    /** Default port for WebSocket server */
    readonly DEFAULT_PORT: 3002;
    /** WebSocket path */
    readonly WS_PATH: "/ws";
};
/**
 * PostgreSQL database configuration
 */
export declare const DATABASE_CONFIG: {
    /** Default database host */
    readonly DEFAULT_HOST: "localhost";
    /** Default database port */
    readonly DEFAULT_PORT: 5432;
    /** Default database name */
    readonly DEFAULT_NAME: "wms_db";
    /** Default database user */
    readonly DEFAULT_USER: "wms_user";
    /** Minimum connection pool size */
    readonly POOL_MIN: 2;
    /** Maximum connection pool size */
    readonly POOL_MAX: 10;
    /** Connection timeout in milliseconds */
    readonly CONNECTION_TIMEOUT_MS: 10000;
    /** Idle timeout in milliseconds */
    readonly IDLE_TIMEOUT_MS: 30000;
    /** Statement timeout in milliseconds (prevents long-running queries) */
    readonly STATEMENT_TIMEOUT_MS: 30000;
};
/**
 * Redis cache configuration (optional - degrades gracefully if unavailable)
 */
export declare const REDIS_CONFIG: {
    /** Default Redis host */
    readonly DEFAULT_HOST: "localhost";
    /** Default Redis port */
    readonly DEFAULT_PORT: 6379;
    /** Default Redis database */
    readonly DEFAULT_DB: 0;
    /** Default TTL for cached entries (seconds) */
    readonly DEFAULT_TTL: 3600;
    /** Connection timeout in milliseconds */
    readonly CONNECTION_TIMEOUT_MS: 5000;
};
/**
 * JWT configuration
 */
export declare const JWT_CONFIG: {
    /** Default token expiration time */
    readonly DEFAULT_EXPIRES_IN: "8h";
    /** Refresh token expiration time */
    readonly REFRESH_EXPIRES_IN: "7d";
};
/**
 * Bcrypt configuration
 */
export declare const BCRYPT_CONFIG: {
    /** Default number of hashing rounds */
    readonly DEFAULT_ROUNDS: 10;
};
/**
 * Rate limiting configuration
 */
export declare const RATE_LIMIT_CONFIG: {
    /** Time window in milliseconds */
    readonly WINDOW_MS: 900000;
    /** Max requests per window */
    readonly MAX_REQUESTS: 100;
};
/**
 * Picker capacity limits
 */
export declare const PICKER_CONFIG: {
    /** Maximum number of orders a picker can claim at once */
    readonly MAX_ORDERS_PER_PICKER: 10;
    /** Default picker capacity (concurrent orders) */
    readonly DEFAULT_PICKER_CAPACITY: 5;
    /** Time before a pick task times out (minutes) */
    readonly PICK_TIMEOUT_MINUTES: 30;
    /** Maximum pick tasks per order */
    readonly MAX_PICK_TASKS_PER_ORDER: 100;
};
/**
 * Packer capacity limits
 */
export declare const PACKER_CONFIG: {
    /** Maximum number of orders a packer can handle at once */
    readonly MAX_ORDERS_PER_PACKER: 5;
    /** Default packer capacity (concurrent orders) */
    readonly DEFAULT_PACKER_CAPACITY: 3;
};
/**
 * Order configuration
 */
export declare const ORDER_CONFIG: {
    /** Maximum items per order */
    readonly MAX_ITEMS_PER_ORDER: 100;
    /** Maximum quantity per item */
    readonly MAX_QUANTITY_PER_ITEM: 1000;
    /** Order ID prefix */
    readonly ORDER_ID_PREFIX: "ORD";
    /** Order ID format pattern (for validation) */
    readonly ORDER_ID_PATTERN: RegExp;
};
/**
 * SKU/Product configuration
 */
export declare const SKU_CONFIG: {
    /** Maximum length of SKU code */
    readonly MAX_SKU_LENGTH: 50;
    /** Maximum length of product name */
    readonly MAX_NAME_LENGTH: 255;
    /** Maximum length of category name */
    readonly MAX_CATEGORY_LENGTH: 100;
};
/**
 * Bin location configuration
 */
export declare const BIN_LOCATION_CONFIG: {
    /** Bin ID format pattern (for validation) */
    readonly BIN_ID_PATTERN: RegExp;
    /** Maximum length of bin ID */
    readonly MAX_BIN_ID_LENGTH: 20;
    /** Valid zone letters */
    readonly VALID_ZONES: readonly ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
};
/**
 * Inventory configuration
 */
export declare const INVENTORY_CONFIG: {
    /** Minimum low stock threshold */
    readonly LOW_STOCK_THRESHOLD: 10;
    /** Maximum quantity per bin location */
    readonly MAX_QUANTITY_PER_BIN: 10000;
    /** Reserved inventory cannot exceed this percentage of total */
    readonly MAX_RESERVED_PERCENTAGE: 0.9;
};
/**
 * Health check configuration
 */
export declare const HEALTH_CHECK_CONFIG: {
    /** Interval between health checks (milliseconds) */
    readonly INTERVAL_MS: 30000;
    /** Timeout for health check requests (milliseconds) */
    readonly TIMEOUT_MS: 5000;
};
/**
 * Logging configuration
 */
export declare const LOGGING_CONFIG: {
    /** Default log level */
    readonly DEFAULT_LEVEL: "info";
    /** Valid log levels */
    readonly VALID_LEVELS: readonly ["error", "warn", "info", "http", "debug"];
    /** Maximum log file size (bytes) */
    readonly MAX_FILE_SIZE: number;
    /** Maximum number of log files to keep */
    readonly MAX_FILES: 14;
};
/**
 * ID generation patterns (for validation and generation)
 */
export declare const ID_PATTERNS: {
    /** Order ID pattern */
    readonly ORDER: RegExp;
    /** User ID pattern */
    readonly USER: RegExp;
    /** Pick task ID pattern */
    readonly PICK_TASK: RegExp;
    /** Inventory transaction ID pattern */
    readonly INVENTORY_TRANSACTION: RegExp;
    /** Order state change ID pattern */
    readonly ORDER_STATE_CHANGE: RegExp;
    /** Order item ID pattern */
    readonly ORDER_ITEM: RegExp;
};
/**
 * Feature flags (should match environment variables)
 */
export declare const FEATURE_FLAGS: {
    /** Enable WebSocket for real-time updates */
    readonly ENABLE_WEBSOCKET: true;
    /** Enable Redis caching */
    readonly ENABLE_REDIS_CACHE: true;
    /** Enable audit logging */
    readonly ENABLE_AUDIT_LOG: true;
    /** Enable ML predictions */
    readonly ENABLE_ML_PREDICTIONS: false;
};
/**
 * Application-specific error codes
 */
export declare const ERROR_CODES: {
    /** Inventory-related errors */
    readonly INSUFFICIENT_INVENTORY: "INSUFFICIENT_INVENTORY";
    readonly INVENTORY_RESERVED: "INVENTORY_RESERVED";
    readonly BIN_LOCATION_FULL: "BIN_LOCATION_FULL";
    /** Order-related errors */
    readonly INVALID_ORDER_STATE: "INVALID_ORDER_STATE";
    readonly ORDER_ALREADY_CLAIMED: "ORDER_ALREADY_CLAIMED";
    readonly PICKER_AT_CAPACITY: "PICKER_AT_CAPACITY";
    readonly ORDER_NOT_CANCELLABLE: "ORDER_NOT_CANCELLABLE";
    /** Authentication errors */
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly TOKEN_EXPIRED: "TOKEN_EXPIRED";
    readonly TOKEN_INVALID: "TOKEN_INVALID";
    /** Authorization errors */
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly INSUFFICIENT_ROLE: "INSUFFICIENT_ROLE";
    /** Validation errors */
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD";
    /** Not found errors */
    readonly ORDER_NOT_FOUND: "ORDER_NOT_FOUND";
    readonly SKU_NOT_FOUND: "SKU_NOT_FOUND";
    readonly USER_NOT_FOUND: "USER_NOT_FOUND";
    readonly BIN_LOCATION_NOT_FOUND: "BIN_LOCATION_NOT_FOUND";
    /** Conflict errors */
    readonly RESOURCE_CONFLICT: "RESOURCE_CONFLICT";
    readonly DUPLICATE_RESOURCE: "DUPLICATE_RESOURCE";
};
/**
 * Time constants (in milliseconds)
 */
export declare const TIME: {
    readonly MILLISECOND: 1;
    readonly SECOND: 1000;
    readonly MINUTE: number;
    readonly HOUR: number;
    readonly DAY: number;
    readonly WEEK: number;
};
/**
 * Common validation patterns
 */
export declare const VALIDATION_PATTERNS: {
    /** Email validation */
    readonly EMAIL: RegExp;
    /** URL validation */
    readonly URL: RegExp;
    /** UUID v4 validation */
    readonly UUID: RegExp;
};
/**
 * Get all configuration values that should be overridden by environment variables.
 * This helper maps env var names to constant values.
 */
export declare function getEnvVarMappings(): Record<string, string | number | boolean>;
//# sourceMappingURL=system.d.ts.map