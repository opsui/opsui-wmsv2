# Keep-Alive and Auto-Restart Configuration

## Overview

This document explains the keep-alive and auto-restart mechanisms that prevent your development servers from stopping when your laptop goes to sleep or is inactive.

## Changes Made

### 1. Backend Keep-Alive (packages/backend/src/index.ts)

```typescript
// Keep-alive settings to prevent connection drops
server.keepAliveTimeout = 65000; // 65 seconds (higher than AWS ALB defaults)
server.headersTimeout = 66000; // Slightly higher than keep-alive timeout
```

**Benefits:**

- Prevents connection timeouts after inactivity
- Keeps database connections alive
- Higher timeout values work better with load balancers

### 2. Frontend Keep-Alive (packages/frontend/vite.config.ts)

```typescript
watch: {
  usePolling: true, // Use polling instead of file system events (more reliable)
  interval: 1000, // Poll every 1 second
},
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    timeout: 60000, // 60 second timeout
    proxyTimeout: 60000, // 60 second proxy timeout
  },
}
```

**Benefits:**

- Polling is more reliable than file system events
- Prevents HMR (Hot Module Replacement) failures after sleep
- Longer proxy timeouts prevent API call failures

### 3. Keep-Alive Monitor Script (scripts/keep-alive.js)

A standalone script that:

- Monitors both servers every 10 seconds
- Automatically restarts servers if they stop
- Keeps a count of restart attempts
- Has a safety limit (10 restarts) to prevent infinite loops

### 4. New npm Scripts (package.json)

```json
"dev:monitor": "node scripts/keep-alive.js",
"dev:all": "concurrently \"npm run dev\" \"npm run dev:monitor\""
```

## How to Use

### Option 1: Standard Development (Recommended)

Start servers with monitoring in one command:

```bash
npm run dev:all
```

This will:

1. Start the backend server
2. Start the frontend server
3. Start the keep-alive monitor
4. Keep everything running even after sleep

### Option 2: Separate Monitor (Advanced)

If you want to monitor in a separate terminal:

```bash
# Terminal 1: Start servers
npm run dev

# Terminal 2: Start monitor
npm run dev:monitor
```

### Option 3: Standard Development (No Monitor)

If you don't want automatic restarts:

```bash
npm run dev
```

## What the Monitor Does

The keep-alive monitor:

1. **Checks every 10 seconds**: Pings both backend (port 3001) and frontend (port 5173)
2. **Detects failures**: If either server fails to respond twice in a row
3. **Auto-restarts**: Kills old processes and starts fresh ones
4. **Tracks restarts**: Counts how many times it's restarted
5. **Safety limit**: Stops after 10 restarts to prevent issues

## Monitor Output Examples

### Normal Operation

```
🔍 Keep-Alive Monitor Started
   Checking servers every 10 seconds
   Backend: http://localhost:3001/health
   Frontend: http://localhost:5173
   Press Ctrl+C to stop monitor
```

### Server Failure Detected

```
======================================
🔄 RESTARTING SERVERS
======================================
✓ Old processes terminated

🚀 Starting new server instances...

✓ Servers restarted
```

### Recovery

```
✅ Servers are back online
```

### Safety Limit Reached

```
⚠️  MAX RESTART LIMIT REACHED. Stopping monitor.
```

## Troubleshooting

### Q: I see "DEPRECATION WARNING" about util.\_extend

**A:** This is a warning from a dependency, not an error. It doesn't affect functionality.

### Q: Servers still stop after sleep

**A:**

1. Make sure you're using `npm run dev:all` (includes monitor)
2. Check that the monitor terminal is still open
3. The monitor will auto-restart servers within 20 seconds of wake-up

### Q: Monitor keeps restarting servers repeatedly

**A:** This usually means:

1. Database is not running
2. Port conflicts with another application
3. Application code has errors

The monitor will stop after 10 restart attempts to prevent issues.

### Q: How do I stop the monitor?

**A:** Press `Ctrl+C` in the terminal running `npm run dev:all` or `npm run dev:monitor`

## Best Practices

1. **Always use `npm run dev:all`** - This ensures monitoring is active
2. **Keep the terminal window open** - The monitor needs to keep running
3. **Check terminal for errors** - If monitor shows issues, investigate
4. **Manual restart if needed** - Sometimes a clean restart is better than auto-restart
5. **Use Ctrl+C to stop** - Always stop gracefully to close database connections

## How It Works After Sleep

### Before This Setup

```
1. Laptop goes to sleep
2. Development servers pause/stop
3. You wake up laptop
4. Try to access localhost:5173
5. ❌ "localhost refused to connect"
```

### With This Setup

```
1. Laptop goes to sleep
2. Development servers pause/stop
3. You wake up laptop
4. Monitor detects servers are down (within 10 seconds)
5. Monitor automatically restarts servers
6. ✅ Servers are back online automatically
7. You can continue working seamlessly
```

## Configuration Options

You can customize the monitor by editing `scripts/keep-alive.js`:

```javascript
const CHECK_INTERVAL = 10000; // How often to check (ms)
const MAX_RESTARTS = 10; // Max auto-restarts
const RESTART_DELAY = 5000; // Delay before restart (ms)
```

## Next Steps

1. Use `npm run dev:all` for normal development
2. Let the monitor handle any server issues
3. Check the terminal if you notice problems
4. The monitor will keep servers alive automatically

## Support

If you encounter issues:

1. Check the terminal output for errors
2. Verify ports 3001 and 5173 are not in use by other apps
3. Ensure database is running (PostgreSQL)
4. Try a manual restart: `npm run dev`

The keep-alive system is designed to be "set and forget" - it should handle most issues automatically!
