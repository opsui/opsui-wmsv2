#!/usr/bin/env node
/**
 * Clean Restart Script
 *
 * Kills all existing dev processes and starts fresh.
 * Use this when you want to guarantee a clean slate.
 *
 * Usage: node scripts/restart-dev.js
 */

const { spawn, exec } = require('child_process');
const path = require('path');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// PROCESS KILLING
// ============================================================================

/**
 * Kill all Node processes on the dev ports
 */
async function killDevProcesses() {
  log('\n' + '='.repeat(70), 'blue');
  log('🔪 KILLING ALL DEV PROCESSES', 'red');
  log('='.repeat(70), 'blue');

  const ports = [3001, 5173, 5174]; // Backend, Vite, fallback

  for (const port of ports) {
    await killProcessOnPort(port);
  }

  // Also kill any nodemon/tsx processes that might be hanging
  await killByName('node.exe', 'wms-backend');
  await killByName('node.exe', 'warehouse');

  log('✅ All dev processes terminated\n', 'green');
}

/**
 * Kill process using a specific port
 */
function killProcessOnPort(port) {
  return new Promise(resolve => {
    log(`Checking port ${port}...`, 'yellow');

    // Windows: use netstat and taskkill
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (!stdout || !stdout.trim()) {
          log(`  Port ${port}: free`, 'green');
          resolve();
          return;
        }

        // Extract PID from netstat output
        const lines = stdout.trim().split('\n');
        const pids = new Set();

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== 'PID') {
            pids.add(pid);
          }
        }

        // Kill each PID
        const killPromises = Array.from(pids).map(
          pid =>
            new Promise(killResolve => {
              exec(`taskkill /F /PID ${pid}`, killError => {
                if (!killError) {
                  log(`  Port ${port}: killed PID ${pid}`, 'green');
                }
                killResolve();
              });
            })
        );

        Promise.all(killPromises).then(() => resolve());
      });
    } else {
      // Unix-like systems
      exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, () => {
        log(`  Port ${port}: cleared`, 'green');
        resolve();
      });
    }
  });
}

/**
 * Kill processes by name pattern
 */
function killByName(processName, pattern) {
  return new Promise(resolve => {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      exec(`tasklist /FI "IMAGENAME eq ${processName}" /FO CSV`, (error, stdout) => {
        if (error || !stdout) {
          resolve();
          return;
        }

        const lines = stdout.trim().split('\n');
        const pids = [];

        for (const line of lines) {
          if (line.toLowerCase().includes(pattern)) {
            const parts = line.split(',');
            if (parts[1]) {
              const pid = parts[1].replace(/"/g, '').trim();
              if (pid && pid !== 'PID') {
                pids.push(pid);
              }
            }
          }
        }

        if (pids.length === 0) {
          resolve();
          return;
        }

        Promise.all(
          pids.map(
            pid =>
              new Promise(killResolve => {
                exec(`taskkill /F /PID ${pid}`, () => killResolve());
              })
          )
        ).then(() => resolve());
      });
    } else {
      exec(`pkill -f "${pattern}"`, () => resolve());
    }
  });
}

// ============================================================================
// SMART DEV STARTUP
// ============================================================================

function startSmartDev() {
  log('='.repeat(70), 'blue');
  log('🚀 STARTING SMART DEV MODE', 'green');
  log('='.repeat(70), 'blue');
  log('\nFeatures:', 'yellow');
  log('  ✓ Connection draining (no dropped requests)', 'reset');
  log('  ✓ Health-check aware restarts', 'reset');
  log('  ✓ File change classification', 'reset');
  log('  ✓ Graceful shutdown', 'reset');
  log('  ✓ Automatic crash recovery', 'reset');
  log('\nPress Ctrl+C to shutdown\n', 'yellow');

  const smartDev = spawn('node', ['scripts/smart-dev.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });

  smartDev.on('error', err => {
    log(`Failed to start: ${err.message}`, 'red');
    process.exit(1);
  });

  smartDev.on('exit', code => {
    process.exit(code || 0);
  });
}

// ============================================================================
// MAIN FLOW
// ============================================================================

async function main() {
  try {
    // Step 1: Kill everything
    await killDevProcesses();

    // Step 2: Small delay to ensure ports are freed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Start smart dev
    startSmartDev();
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle interrupts
process.on('SIGINT', () => {
  log('\n\n👋 Exiting restart script...', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n\n👋 Exiting restart script...', 'yellow');
  process.exit(0);
});

// Run
main();
