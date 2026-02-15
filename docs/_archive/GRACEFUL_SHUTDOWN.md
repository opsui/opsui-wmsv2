# Graceful Shutdown - Complete Implementation

## Overview

Both backend and frontend now have **comprehensive graceful shutdown** handling to ensure clean termination of all services and resources.

## What It Does

### Backend (Port 3001)

**7-Step Shutdown Process:**

1. 🔒 Stop accepting new HTTP connections
2. 🔓 Release port lock (allows new instances to start)
3. 🧹 Run cleanup tasks:
   - Close database connections (gracefully)
   - Flush pending operations
   - Close WebSocket connections
4. 🔌 Close all WebSocket connections
5. 📝 Flush buffered logs
6. ⏱️ Clear all timers/intervals
7. 🧼 Final cleanup + port lock release

**Triggers:**

- `Ctrl+C` (SIGINT)
- Terminate signals (SIGTERM)
- Process manager commands (PM2, Docker, etc.)
- Windows shutdown messages

**Timeout:**

- 30 second force timeout
- If shutdown takes longer, process exits with code 1
- Prevents zombie processes

### Frontend (Port 5173)

**4-Step Shutdown Process:**

1. 🔒 Stop accepting new HMR connections
2. 🔌 Close all WebSocket connections
3. 🧹 Run custom cleanup tasks
4. 🚪 Close HTTP server

**Triggers:**

- `Ctrl+C` (SIGINT)
- Terminate signals (SIGTERM)
- Process manager commands

**Timeout:**

- 10 second force timeout
- Faster than backend (no database to close)

## How to Use

### Normal Shutdown (Recommended)

**Backend:**

```bash
# Press Ctrl+C in the terminal running the server
# Server will:
# 1. Log shutdown initiation
# 2. Close connections gracefully
# 3. Clean up resources
# 4. Exit with code 0
```

**Frontend:**

```bash
# Press Ctrl+C in the terminal running Vite
# Vite will:
# 1. Log shutdown steps
# 2. Close connections
# 3. Clean up
# 4. Exit
```

### Scripted Shutdown

**Shutdown All Services:**

```bash
# Run the shutdown script
shutdown-all.bat

# This will:
# 1. Shutdown frontend (gracefully, 5s timeout)
# 2. Shutdown ML API (gracefully, 2s timeout)
# 3. Shutdown backend (gracefully, 10s timeout)
# 4. Clean up port locks
# 5. Verify all ports are free
# 6. Report success/failure
```

### Force Quit (If Needed)

**Backend:**

```bash
# Find PID
netstat -ano | findstr :3001

# Force kill
taskkill /F /PID <PID>
```

**Frontend:**

```bash
# Vite will force quit after 10s timeout
# Or force kill:
taskkill /F /PID <PID>
```

## What Gets Cleaned Up

### Backend Cleanup

| Resource    | Method                | Fallback         |
| ----------- | --------------------- | ---------------- |
| HTTP Server | `server.close()`      | Wait + force     |
| Port Lock   | Delete lock file      | Auto on restart  |
| Database    | `closePool()`         | Force close      |
| WebSockets  | Close all connections | Drop connections |
| Logs        | Flush buffers         | Auto on exit     |
| Timers      | Clear intervals       | Process exit     |
| Cache       | No persistence needed | N/A              |

### Frontend Cleanup

| Resource    | Method              | Fallback     |
| ----------- | ------------------- | ------------ |
| HMR Socket  | Close all clients   | Force close  |
| HTTP Server | `server.close()`    | Wait + force |
| Build Cache | No cleanup needed   | N/A          |
| Watchers    | Close file watchers | Process exit |

## Health Check During Shutdown

Backend health endpoint returns `503 Service Unavailable` during shutdown:

```typescript
GET / health;
// Normal: { status: 'healthy', uptime: 123 }
// Shutdown: { status: 'shutting_down', uptime: 123 }
```

This allows load balancers to:

- Stop sending new requests
- Wait for existing requests to complete
- Remove instance from rotation

## Logs During Shutdown

### Backend Example

```
2025-01-13 14:30:45 [warn] === INITIATING GRACEFUL SHUTDOWN ===
2025-01-13 14:30:45 [info] 📊 Received SIGTERM, shutting down gracefully...
2025-01-13 14:30:45 [info] 🔒 Step 1/7: Stopping new connections...
2025-01-13 14:30:45 [info] ✅ Server closed - no new connections accepted
2025-01-13 14:30:45 [info] 🔓 Step 2/7: Releasing port lock...
2025-01-13 14:30:45 [info] ✅ Port lock released
2025-01-13 14:30:46 [info] 🧹 Step 3/7: Running cleanup tasks...
2025-01-13 14:30:46 [info] ✅ Database connections closed
2025-01-13 14:30:46 [info] ✅ Pending operations flushed
2025-01-13 14:30:46 [info] 🔌 Step 4/7: Closing WebSocket connections...
2025-01-13 14:30:46 [info] ✅ WebSocket connections closed
2025-01-13 14:30:46 [info] 📝 Step 5/7: Flushing logs...
2025-01-13 14:30:46 [info] ✅ Logs flushed
2025-01-13 14:30:46 [info] ⏱️  Step 6/7: Clearing timers...
2025-01-13 14:30:46 [info] ✅ Timers cleared
2025-01-13 14:30:46 [info] 🧼 Step 7/7: Final cleanup...
2025-01-13 14:30:46 [info] ✅ Final cleanup complete
2025-01-13 14:30:46 [warn] === GRACEFUL SHUTDOWN COMPLETE ===
2025-01-13 14:30:46 [info] duration: 1200ms, success: true

✅ Server shut down cleanly
```

### Frontend Example

```
======================================================================
🛑 SIGINT received - shutting down gracefully...
======================================================================
🔒 Step 1/4: Stopping new HMR connections...
🔌 Step 2/4: Closing WebSocket connections...
🧹 Step 3/4: Running cleanup tasks...
  ✅ Task 1/1 complete
✅ Step 3/4: No cleanup tasks
🔌 Step 4/4: Closing HTTP server...
======================================================================
✅ Frontend shut down cleanly (took 450ms)
======================================================================
```

## Best Practices

### ✅ DO

1. **Use Ctrl+C** - Triggers graceful shutdown
2. **Use shutdown-all.bat** - Clean shutdown of all services
3. **Wait for completion** - Let cleanup finish
4. **Check logs** - Ensure no errors during shutdown
5. **Verify ports free** - Before starting new instances

### ❌ DON'T

1. **Force kill immediately** - Unless absolutely necessary
2. **Kill parent process** - May leave child processes running
3. **Ignore shutdown errors** - They indicate incomplete cleanup
4. **Start new instances immediately** - Wait for old one to fully close
5. **Close terminal directly** - Use Ctrl+C first

## Troubleshooting

### "Process won't shut down"

**Backend stuck:**

```bash
# Check what it's waiting for
netstat -ano | findstr :3001

# View logs for stuck step
type packages\backend\logs\wms.log

# Force kill after 30s timeout (automatic)
```

**Frontend stuck:**

```bash
# Check HMR connections
netstat -ano | findstr :5173

# Force kill after 10s timeout (automatic)
```

### "Port still in use after shutdown"

**Stale port lock:**

```bash
# Remove lock files
rmdir packages\backend\.port-locks

# Or wait ~1 minute for automatic cleanup
```

**Process still running:**

```bash
# Find and kill
netstat -ano | findstr :3001
taskkill /F /PID <PID>
```

### "Database connection errors during shutdown"

**Normal if:**

- Database is down
- Network issue exists
- Connection was already stale

**Not normal if:**

- Happens every time
- See timeout errors
- See "connection lost" errors

**Solution:**

```bash
# Check database status
# Increase shutdown timeout
# Check network connectivity
```

## Implementation Details

### Backend Files

- **[src/index.ts](packages/backend/src/index.ts)** - Main shutdown setup
- **[src/utils/gracefulShutdown.ts](packages/backend/src/utils/gracefulShutdown.ts)** - Shutdown manager
- **[src/utils/portLock.ts](packages/backend/src/utils/portLock.ts)** - Port lock management

### Frontend Files

- **[vite.config.ts](packages/frontend/vite.config.ts)** - Shutdown plugin integration
- **[shutdown-plugin.ts](packages/frontend/shutdown-plugin.ts)** - Vite shutdown plugin

### Scripts

- **[shutdown-all.bat](shutdown-all.bat)** - Shutdown all WMS services
- **[kill-frontend.bat](packages/frontend/kill-frontend.bat)** - Frontend-specific shutdown

## Integration with Process Managers

### PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'wms-backend',
      script: './dist/index.js',
      shutdown_with_message: true, // Enable graceful shutdown
      wait_ready: true,
      autorestart: false, // Don't auto-restart on shutdown
    },
  ],
};
```

### Docker

```yaml
# docker-compose.yml
services:
  backend:
    stop_grace_period: 30s # Time for graceful shutdown
    stop_signal: SIGTERM
    ports:
      - '3001:3001'
```

### Kubernetes

```yaml
# deployment.yaml
spec:
  terminationGracePeriodSeconds: 30 # 30s for graceful shutdown
  containers:
    - name: backend
      lifecycle:
        preStop:
          exec:
            command: ['/bin/sh', '-c', 'curl http://localhost:3001/health']
```

## Summary

✅ **Complete graceful shutdown implemented**

- Backend: 7-step cleanup with 30s timeout
- Frontend: 4-step cleanup with 10s timeout
- Port locks automatically released
- Database connections properly closed
- Logs flushed before exit
- All resources cleaned up

**No more zombie processes, no more stuck ports, no more data loss!**
