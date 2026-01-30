/**
 * Winston logger configuration
 *
 * Provides structured logging with different levels and transports
 */

import winston from 'winston';

// ============================================================================
// CONFIGURATION
// ============================================================================

const logLevel = (() => {
  const value = process.env.LOG_LEVEL;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (value !== undefined && value !== null) {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return 'info';
})();

const logFile = (() => {
  const value = process.env.LOG_FILE;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (value !== undefined && value !== null) {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return 'logs/wms.log';
})();

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const ts = String(timestamp);
    const lvl = String(level);
    const msg = String(message);
    let result = `${ts} [${lvl}]: ${msg}`;
    if (Object.keys(meta).length > 0) {
      result += ` ${JSON.stringify(meta)}`;
    }
    return result;
  })
);

// ============================================================================
// LOGGER INSTANCE
// ============================================================================

const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
  }),
];

// File transport (only in production)
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: logFile,
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exitOnError: false,
});

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

export default {
  debug: (message: string, meta?: object) => logger.debug(message, meta),
  info: (message: string, meta?: object) => logger.info(message, meta),
  warn: (message: string, meta?: object) => logger.warn(message, meta),
  error: (message: string, meta?: object) => logger.error(message, meta),
  logger,
};
