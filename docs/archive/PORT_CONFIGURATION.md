# WMS Port Configuration - Locked & Documented

## 🔒 LOCKED PORTS - DO NOT CHANGE

These ports are **hard-coded** across the entire system to prevent duplicate processes and conflicts.

### Application Servers

| Service          | Port   | Protocol | Purpose               | Lock File                    |
| ---------------- | ------ | -------- | --------------------- | ---------------------------- |
| **Backend API**  | `3001` | HTTP     | Main REST API server  | `.port-locks/port-3001.lock` |
| **Frontend Dev** | `5173` | HTTP     | Vite dev server       | N/A (Vite strictPort)        |
| **WebSocket**    | `3002` | WS       | Real-time updates     | `.port-locks/port-3002.lock` |
| **ML API**       | `8001` | HTTP     | ML prediction service | `.port-locks/port-8001.lock` |

### Databases

| Service        | Port   | Protocol | Purpose        |
| -------------- | ------ | -------- | -------------- |
| **PostgreSQL** | `5432` | TCP      | Main database  |
| **Redis**      | `6379` | TCP      | Cache/sessions |

### Development Tools

| Service       | Port   | Protocol | Purpose                 |
| ------------- | ------ | -------- | ----------------------- |
| **MLflow**    | `5000` | HTTP     | ML experiment tracking  |
| **Storybook** | `6006` | HTTP     | Component documentation |
| **Cypress**   | `8080` | HTTP     | E2E testing             |

## How Port Locking Works

### Backend (Port 3001)

1. **Startup Process**:

   ```typescript
   // 1. Check if port is locked
   const result = await acquirePortLock(3001, 'wms-backend-api');

   // 2. If locked, EXIT with error
   if (!result.acquired) {
     console.error('Port 3001 already in use!');
     process.exit(1);
   }

   // 3. Create lock file
   // .port-locks/port-3001.lock contains:
   // {
   //   "port": 3001,
   //   "pid": 12345,
   //   "host": "0.0.0.0",
   //   "serviceName": "wms-backend-api",
   //   "acquiredAt": "2025-01-13T..."
   // }

   // 4. Start server
   server.listen(3001);

   // 5. On exit, automatically release lock
   ```

2. **Duplicate Prevention**:
   - First instance creates lock file
   - Second instance checks lock, finds existing PID, exits with error
   - Clear error message explains what to do

3. **Stale Lock Cleanup**:
   - If process dies, lock is automatically cleaned on next start
   - Uses `process.kill(pid, 0)` to verify process is alive

### Frontend (Port 5173)

```typescript
// vite.config.ts
server: {
  port: 5173,
  strictPort: true,  // ✅ Exit if port in use instead of trying next port
  host: true
}
```

- **No lock file needed** - Vite handles it via `strictPort`
- If port 5173 is busy, Vite exits with clear error
- Prevents accidental multiple dev servers

## Checking Port Status

### See What's Locked

```bash
# List all active port locks
cd packages/backend
dir .port-locks\*.lock

# Or check lock file contents
type .port-locks\port-3001.lock
```

### See What's Running

```bash
# Check all WMS ports
netstat -ano | findstr "3001 5173 3002 8001 5432 6379"

# Or use PowerShell
Get-NetTCPConnection -LocalPort 3001,5173,3002,8001 | Select-Object LocalPort,State,OwningProcess
```

## Troubleshooting

### "Port already in use" Error

**Backend (3001):**

```bash
# 1. Check what's using the port
netstat -ano | findstr :3001

# 2. If it's an old instance, kill it
taskkill /PID <PID> /F

# 3. Or remove stale lock
del packages\backend\.port-locks\port-3001.lock
```

**Frontend (5173):**

```bash
# Vite will show clear error with PID
# Kill the process and retry
taskkill /PID <PID> /F
```

### Stale Lock Files

Lock files are automatically cleaned, but if manual cleanup needed:

```bash
# Remove all port locks
cd packages/backend
rmdir /s .port-locks
```

## Configuration Files

### Files Using Port 3001 (Backend)

- `packages/backend/.env` → `PORT=3001`
- `packages/backend/src/utils/portLock.ts` → `SERVICE_PORTS.BACKEND_API`
- `packages/backend/src/index.ts` → Port lock acquisition
- `packages/frontend/vite.config.ts` → Proxy target

### Files Using Port 5173 (Frontend)

- `packages/frontend/vite.config.ts` → `port: 5173, strictPort: true`
- `packages/backend/.env` → `CORS_ORIGIN=http://localhost:5173`
- MCP configurations (API calls)

### Files Using Port 8001 (ML API)

- `packages/ml/.env` → `ML_API_PORT=8001`
- `packages/backend/src/services/MLPredictionService.ts` → `mlApiUrl`
- MCP tools (fallback)

### Files Using Port 3002 (WebSocket)

- `packages/backend/.env` → `WS_PORT=3002`
- `packages/backend/src/websocket/` → WebSocket server

## Before Changing Ports

If you MUST change a port (not recommended):

1. **Update ALL references**:
   - `.env` files (both backend and frontend)
   - `vite.config.ts`
   - `portLock.ts` (SERVICE_PORTS constant)
   - Docker Compose files
   - CI/CD pipelines
   - MCP configurations
   - Documentation (this file)
   - Load balancer configs
   - Any proxy configs

2. **Test thoroughly**:

   ```bash
   # Stop all services
   # Update configs
   # Start one at a time
   # Verify no conflicts
   ```

3. **Update team**:
   - Notify all developers
   - Update onboarding docs
   - Update deployment guides

## Best Practices

✅ **DO:**

- Use the port lock utilities
- Check port status before starting services
- Use `npm start` scripts (they handle locking)
- Read error messages carefully

❌ **DON'T:**

- Manually change ports in `.env` without system-wide update
- Run multiple dev servers simultaneously
- Ignore "port in use" errors
- Kill processes without checking what they are

## Quick Reference

```bash
# Start backend (with port lock)
cd packages/backend && npm start

# Start frontend (with strict port)
cd packages/frontend && npm run dev

# Check locks
type packages\backend\.port-locks\port-3001.lock

# Clean stale locks
rmdir packages\backend\.port-locks

# Full restart
# 1. Stop all services
# 2. Clean locks
# 3. Start backend
# 4. Start frontend
```
