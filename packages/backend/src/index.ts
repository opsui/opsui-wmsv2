/**
 * WMS Backend - Server Entry Point
 *
 * Warehouse Management System API Server
 * Production-ready with proper error handling, logging, and database transactions
 * Port-locked to prevent duplicate instances
 */

import 'dotenv/config';

// OpenTelemetry must be initialized FIRST, before any other imports
if (process.env.ENABLE_OPENTELEMETRY !== 'false') {
  // Initialize OpenTelemetry SDK for distributed tracing, metrics, and logging
  // This must happen before any other imports to ensure proper instrumentation
  import('./observability/telemetry')
    .then(({ initializeTelemetry }) => {
      initializeTelemetry();
    })
    .catch(err => {
      console.error('Failed to initialize OpenTelemetry:', err);
    });
}

import { createApp, startServer, waitForDrain } from './app';
import config from './config';
import { logger } from './config/logger';
import { closePool } from './db/client';
import { acquirePortLock, setupPortLockCleanup, SERVICE_PORTS } from './utils/portLock';
import {
  setupGracefulShutdown,
  isShuttingDown as checkIfShuttingDown,
} from './utils/gracefulShutdown';
import wsServer from './websocket';
import { recurringScheduleService } from './services/RecurringScheduleService';

// Export shutdown check for health endpoints
export const isShuttingDown = checkIfShuttingDown;

// ============================================================================
// PORT LOCKING - Prevent Duplicate Instances
// ============================================================================

const BACKEND_PORT = SERVICE_PORTS.BACKEND_API; // Always 3001

async function acquireServerPort(): Promise<boolean> {
  logger.info('Acquiring port lock...', { port: BACKEND_PORT });

  const result = await acquirePortLock(BACKEND_PORT, 'wms-backend-api', config.host);

  if (!result.acquired) {
    logger.error('Failed to acquire port lock - another instance may be running', {
      port: BACKEND_PORT,
      reason: result.reason,
    });

    console.error('\n' + '='.repeat(70));
    console.error('❌ PORT LOCK FAILED');
    console.error('='.repeat(70));
    console.error(`Port ${BACKEND_PORT} is already in use.`);
    console.error('\nPossible causes:');
    console.error('  1. Another backend instance is already running');
    console.error('  2. A different process is using this port');
    console.error('  3. A previous instance crashed without cleaning up');
    console.error('\nSolutions:');
    console.error('  1. Check running processes: netstat -ano | findstr :3001');
    console.error('  2. Kill the existing process');
    console.error('  3. Or wait a moment and try again');
    console.error('  4. Check port locks: type .port-locks\\port-3001.lock');
    console.error('='.repeat(70) + '\n');

    return false;
  }

  logger.info('Port lock acquired successfully', { port: BACKEND_PORT });
  return true;
}

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  try {
    // 1. Acquire port lock FIRST (before anything else)
    const portAcquired = await acquireServerPort();
    if (!portAcquired) {
      process.exit(1);
    }

    // 2. Setup cleanup for port lock on exit
    setupPortLockCleanup(BACKEND_PORT);

    // 3. Create Express app
    const app = createApp();

    // 4. Initialize services
    await startServer();

    // 5. Start HTTP server with keep-alive settings
    const server = app.listen(config.port, config.host, () => {
      logger.info(`Server listening on ${config.host}:${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Port Lock: ACTIVE (PID ${process.pid})`);
      logger.info(`API Documentation: http://${config.host}:${config.port}/`);
      logger.info(`Health Check: http://${config.host}:${config.port}/health`);
    });

    // Keep-alive settings to prevent connection drops
    server.keepAliveTimeout = 65000; // 65 seconds (higher than AWS ALB defaults)
    server.headersTimeout = 66000; // Slightly higher than keep-alive timeout

    // 6. Initialize WebSocket server with HTTP server
    wsServer.initialize(server);
    logger.info('WebSocket server initialized');

    // 7. Setup cron job for recurring count schedules
    // Run every hour to check for due schedules and generate cycle counts
    const RECURRING_SCHEDULE_INTERVAL = 60 * 60 * 1000; // 1 hour
    const scheduleInterval = setInterval(async () => {
      try {
        await recurringScheduleService.processDueSchedules();
      } catch (error) {
        logger.error('Error processing recurring schedules', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }, RECURRING_SCHEDULE_INTERVAL);

    logger.info('Recurring schedule processor initialized (runs every hour)');

    // --------------------------------------------------------------------------
    // COMPREHENSIVE GRACEFUL SHUTDOWN
    // --------------------------------------------------------------------------

    // Define cleanup tasks
    const cleanupTasks = [
      // 0. Clear recurring schedule interval
      async () => {
        clearInterval(scheduleInterval);
        logger.info('✅ Recurring schedule interval cleared');
      },

      // 1. Wait for active HTTP connections to drain
      async () => {
        logger.info('Waiting for active connections to drain...');
        const drained = await waitForDrain(30000);
        if (drained) {
          logger.info('✅ All connections drained gracefully');
        } else {
          logger.warn('⚠️ Connection drain timeout - proceeding with shutdown');
        }
      },

      // 2. Close WebSocket connections
      async () => {
        const wsCount = wsServer.getConnectedCount();
        if (wsCount > 0) {
          logger.info(`Closing ${wsCount} WebSocket connections...`);
        }
        wsServer.close();
        logger.info('✅ WebSocket server closed');
      },

      // 3. Close database connections
      async () => {
        await closePool();
        logger.info('✅ Database connections closed');
      },

      // 4. Flush any pending operations
      async () => {
        await new Promise<void>(resolve => setTimeout(resolve, 100));
        logger.info('✅ Pending operations flushed');
      },
    ];

    // Setup graceful shutdown handlers
    setupGracefulShutdown({
      server,
      port: BACKEND_PORT,
      logger,
      cleanupTasks,
      forceTimeout: 30000, // 30 second force timeout
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    await closePool();
    process.exit(1);
  }
}

// --------------------------------------------------------------------------
// UNHANDLED ERRORS - PREVENT CRASHES
// --------------------------------------------------------------------------

// Handle unhandled promise rejections without crashing
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection (caught, preventing crash)', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
  });

  // Don't exit - just log and continue
});

// Handle uncaught exceptions but try to recover
process.on('uncaughtException', error => {
  if (checkIfShuttingDown()) {
    return;
  }

  logger.error('Uncaught Exception (caught, preventing crash)', {
    error: error.message,
    stack: error.stack,
  });

  // Don't exit immediately - give the server a chance to continue
  // Only exit on fatal errors
  if (error.message.includes('EADDRINUSE')) {
    logger.error('Port already in use - exiting');
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
  // For other errors, log but don't crash
});

// Start the server
main();
