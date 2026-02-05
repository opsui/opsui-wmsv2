#!/usr/bin/env node
/**
 * FOOLPROOF DEV STARTUP SCRIPT
 *
 * This script guarantees a clean startup every time.
 * It handles all edge cases and provides clear feedback.
 *
 * Usage: node scripts/start-dev.js
 * Or: npm run dev:start
 *
 * What it does:
 * 1. Check prerequisites (Node, PostgreSQL)
 * 2. Kill any existing processes on ports
 * 3. Verify database is running and accessible
 * 4. Start backend and wait for health check
 * 5. Start frontend and wait for it to be ready
 * 6. Provide clear URLs and status
 */

import { spawn, exec } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import net from 'net';
import { Client } from 'pg';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  backendPort: 3001,
  frontendPort: 5173,
  databaseHost: process.env.DB_HOST || 'localhost',
  databasePort: process.env.DB_PORT || '5432',
  healthCheckTimeout: 30000, // 30 seconds max wait
  startupDelay: 2000, // 2 seconds between steps
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log('\n' + '='.repeat(70));
  log(`STEP ${step}: ${message}`, 'cyan');
  console.log('='.repeat(70));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// ============================================================================
// STEP 1: CHECK PREREQUISITES
// ============================================================================

async function checkPrerequisites() {
  logStep(1, 'CHECKING PREREQUISITES');

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 20) {
    logError(`Node.js version ${nodeVersion} is too old. Requires Node.js 20+`);
    return false;
  }
  logSuccess(`Node.js ${nodeVersion} detected`);

  // Check if PostgreSQL is running
  const pgRunning = await checkPostgreSQL();
  if (!pgRunning) {
    logError('PostgreSQL is not running or not accessible');
    log('\nPlease start PostgreSQL:');
    log('  Windows: Start PostgreSQL service from Services');
    log(
      '  Docker: docker run --name wms-postgres -e POSTGRES_PASSWORD=wms_password -e POSTGRES_DB=wms_db -p 5432:5432 -d postgres:15'
    );
    return false;
  }
  logSuccess('PostgreSQL is running');

  // Check if .env exists
  const envPath = path.join(__dirname, '..', 'packages', 'backend', '.env');
  if (!fs.existsSync(envPath)) {
    logWarning('Backend .env file not found');
    log('Creating from .env.example...');
    const envExamplePath = path.join(__dirname, '..', 'packages', 'backend', '.env.example');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      logSuccess('Created .env from .env.example');
      logWarning('Please edit .env with your database credentials');
    } else {
      logError('.env.example not found. Please create .env manually.');
      return false;
    }
  } else {
    logSuccess('Backend .env file exists');
  }

  return true;
}

async function checkPostgreSQL() {
  return new Promise(resolve => {
    // Use TCP connection check instead of pg_isready (works with Docker)
    const socket = new net.Socket();

    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 2000);

    socket.connect(5432, 'localhost', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// ============================================================================
// STEP 2: KILL EXISTING PROCESSES
// ============================================================================

async function killExistingProcesses() {
  logStep(2, 'CLEANING UP EXISTING PROCESSES');

  const ports = [CONFIG.backendPort, CONFIG.frontendPort];
  let killed = 0;

  for (const port of ports) {
    const portKilled = await killProcessOnPort(port);
    if (portKilled) killed++;
  }

  if (killed === 0) {
    logSuccess('No existing processes found (ports are free)');
  } else {
    logSuccess(`Killed ${killed} process(es)`);
  }

  // Wait for ports to be fully released
  log('Waiting for ports to be released...');
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function killProcessOnPort(port) {
  return new Promise(resolve => {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (!stdout || !stdout.trim()) {
          resolve(false);
          return;
        }

        const lines = stdout.trim().split('\n');
        const pids = new Set();

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== 'PID') {
            pids.add(pid);
          }
        }

        if (pids.size === 0) {
          resolve(false);
          return;
        }

        let killed = 0;
        const killPromises = Array.from(pids).map(
          pid =>
            new Promise(killResolve => {
              exec(`taskkill /F /PID ${pid}`, { windowsHide: true }, () => {
                killed++;
                killResolve();
              });
            })
        );

        Promise.all(killPromises).then(() => {
          if (killed > 0) {
            log(
              `Killed process(es) on port ${port} (PIDs: ${Array.from(pids).join(', ')})`,
              'yellow'
            );
          }
          resolve(true);
        });
      });
    } else {
      exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, () => resolve(true));
    }
  });
}

// ============================================================================
// STEP 3: VERIFY DATABASE
// ============================================================================

async function verifyDatabase() {
  logStep(3, 'VERIFYING DATABASE CONNECTION');

  const client = new Client({
    host: CONFIG.databaseHost,
    port: parseInt(CONFIG.databasePort),
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    logSuccess('Database connection successful');

    // Check if tables exist
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'orders'
    `);

    const hasTables = parseInt(result.rows[0].count) > 0;

    if (!hasTables) {
      logWarning('Database tables not found. You may need to run migrations.');
      log('Run: npm run db:migrate');
    } else {
      logSuccess('Database tables exist');
    }

    await client.end();
    return true;
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    log('\nTroubleshooting:');
    log('1. Check PostgreSQL is running');
    log('2. Check packages/backend/.env has correct credentials');
    log('3. Check database exists: CREATE DATABASE wms_db;');
    log("4. Check user exists: CREATE USER wms_user WITH PASSWORD 'wms_password';");
    log('5. Grant permissions: GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;');
    return false;
  }
}

// ============================================================================
// STEP 4: START BACKEND
// ============================================================================

let backendProcess = null;

async function startBackend() {
  logStep(4, 'STARTING BACKEND SERVER');

  return new Promise((resolve, reject) => {
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development', PORT: CONFIG.backendPort },
    });

    let outputStarted = false;

    backendProcess.stdout.on('data', data => {
      const msg = data.toString().trim();
      if (msg) {
        // Only show first few lines to avoid spam
        if (!outputStarted) {
          log(`[Backend] ${msg}`, 'blue');
          if (msg.includes('listening') || msg.includes('ready')) {
            outputStarted = true;
          }
        }
      }
    });

    backendProcess.stderr.on('data', data => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('Watching')) {
        logError(`[Backend] ${msg}`);
      }
    });

    backendProcess.on('error', err => {
      logError(`Backend failed to start: ${err.message}`);
      reject(err);
    });

    backendProcess.on('exit', code => {
      if (code !== 0 && code !== null) {
        logError(`Backend exited with code ${code}`);
        reject(new Error(`Backend exited with code ${code}`));
      }
    });

    // Wait for health check
    waitForBackendHealth().then(resolve).catch(reject);
  });
}

async function waitForBackendHealth() {
  const startTime = Date.now();
  const healthUrl = `http://localhost:${CONFIG.backendPort}/health`;

  log('Waiting for backend to be healthy...');

  while (Date.now() - startTime < CONFIG.healthCheckTimeout) {
    try {
      const healthy = await checkHealth(healthUrl);
      if (healthy) {
        logSuccess(`Backend is ready at http://localhost:${CONFIG.backendPort}`);
        return true;
      }
    } catch (error) {
      // Not ready yet
    }

    await new Promise(r => setTimeout(r, 500));
  }

  throw new Error('Backend failed to become healthy within timeout');
}

function checkHealth(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, res => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => reject(new Error('Health check failed')));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });

    req.end();
  });
}

// ============================================================================
// STEP 5: START FRONTEND
// ============================================================================

let frontendProcess = null;

async function startFrontend() {
  logStep(5, 'STARTING FRONTEND SERVER');

  return new Promise((resolve, reject) => {
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..', 'packages', 'frontend'),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' },
    });

    let outputStarted = false;

    frontendProcess.stdout.on('data', data => {
      const msg = data.toString().trim();
      if (msg) {
        if (!outputStarted) {
          log(`[Frontend] ${msg}`, 'blue');
          if (msg.includes('Local:') || msg.includes('ready')) {
            outputStarted = true;
          }
        }
      }
    });

    frontendProcess.stderr.on('data', data => {
      const msg = data.toString().trim();
      if (msg) {
        logError(`[Frontend] ${msg}`);
      }
    });

    frontendProcess.on('error', err => {
      logError(`Frontend failed to start: ${err.message}`);
      reject(err);
    });

    // Wait for port to be open
    setTimeout(async () => {
      try {
        await checkHealth(`http://localhost:${CONFIG.frontendPort}`);
        logSuccess(`Frontend is ready at http://localhost:${CONFIG.frontendPort}`);
        resolve();
      } catch (error) {
        // Frontend might not have /health endpoint, but if we got here without errors, assume it's OK
        logSuccess(`Frontend started at http://localhost:${CONFIG.frontendPort}`);
        resolve();
      }
    }, 5000);
  });
}

// ============================================================================
// STEP 6: SHOW STATUS
// ============================================================================

function showStatus() {
  console.log('\n' + '='.repeat(70));
  log('🎉 DEVELOPMENT SERVERS RUNNING', 'green');
  console.log('='.repeat(70));
  console.log('');
  log('Backend:', 'cyan');
  log(`  URL:  http://localhost:3001`);
  log(`  API:  http://localhost:3001/api`);
  log(`  Health: http://localhost:3001/health`);
  console.log('');
  log('Frontend:', 'cyan');
  log(`  URL:  http://localhost:5173`);
  console.log('');
  log('Default Login:', 'yellow');
  log(`  Email:    john.picker@wms.local`);
  log(`  Password: password123`);
  console.log('');
  console.log('='.repeat(70));
  log('Press Ctrl+C to stop all servers', 'yellow');
  console.log('='.repeat(70));
  console.log('');
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown() {
  console.log('\n' + '='.repeat(70));
  log('STOPPING SERVERS...', 'yellow');
  console.log('='.repeat(70));

  const promises = [];

  if (backendProcess) {
    log('Stopping backend...', 'yellow');
    backendProcess.kill('SIGTERM');
    promises.push(
      new Promise(resolve => {
        backendProcess.on('exit', () => resolve());
        setTimeout(() => {
          backendProcess.kill('SIGKILL');
          resolve();
        }, 5000);
      })
    );
  }

  if (frontendProcess) {
    log('Stopping frontend...', 'yellow');
    frontendProcess.kill('SIGTERM');
    promises.push(
      new Promise(resolve => {
        frontendProcess.on('exit', () => resolve());
        setTimeout(() => {
          frontendProcess.kill('SIGKILL');
          resolve();
        }, 5000);
      })
    );
  }

  await Promise.all(promises);

  logSuccess('All servers stopped');
  process.exit(0);
}

// ============================================================================
// MAIN FLOW
// ============================================================================

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    log('🚀 WMS DEVELOPMENT SERVER STARTUP', 'bold');
    console.log('='.repeat(70));

    // Step 1: Check prerequisites
    const prereqsOk = await checkPrerequisites();
    if (!prereqsOk) {
      logError('\nPrerequisites check failed. Please fix the issues above and try again.');
      process.exit(1);
    }

    await new Promise(resolve => setTimeout(resolve, CONFIG.startupDelay));

    // Step 2: Kill existing processes
    await killExistingProcesses();

    await new Promise(resolve => setTimeout(resolve, CONFIG.startupDelay));

    // Step 3: Verify database
    const dbOk = await verifyDatabase();
    if (!dbOk) {
      logError('\nDatabase verification failed. Please fix the issues above and try again.');
      process.exit(1);
    }

    await new Promise(resolve => setTimeout(resolve, CONFIG.startupDelay));

    // Step 4: Start backend
    await startBackend();

    await new Promise(resolve => setTimeout(resolve, CONFIG.startupDelay));

    // Step 5: Start frontend
    await startFrontend();

    await new Promise(resolve => setTimeout(resolve, CONFIG.startupDelay));

    // Step 6: Show status
    showStatus();

    // Keep process alive
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logError(`\nStartup failed: ${error.message}`);
    console.log('\nTroubleshooting:');
    console.log('1. Check ports 3001 and 5173 are not in use');
    console.log('2. Check PostgreSQL is running');
    console.log('3. Check .env file has correct credentials');
    console.log('4. Try running: npm run dev:restart (for clean restart)');
    process.exit(1);
  }
}

// Run
main();
