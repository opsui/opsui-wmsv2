# MCP Auto-Restart Configuration

All MCP servers are now configured with automatic restart capabilities. If any server crashes or disconnects, it will automatically restart within 3 seconds.

## What Was Implemented

### 1. ERP Dev Accelerator (Custom Server)

- **File**: `tools/mcp-server/watch-and-reload.bat`
- **Features**:
  - Monitors the ERP MCP server process
  - Auto-restart on crash (exit code != 0)
  - Logs all restarts to `%TEMP%\erp-mcp-reload.log`
  - Built-in connection loss detection via stdin close events

### 2. Universal Auto-Restart Wrapper

- **File**: `tools/mcp-server/mcp-autorestart.bat`
- **Purpose**: Works with ANY MCP server (npx, python, custom)
- **Features**:
  - Generic wrapper that accepts any command + args
  - Auto-restart on crash
  - Per-server log files in `%TEMP%`
  - 3-second delay between restart attempts

### 3. Server-Side Improvements (ERP MCP v2.0)

Updated `tools/mcp-server/src/index.ts` with:

- **Stdio close detection**: Detects when Cline disconnects
- **Uncaught exception handler**: Catches unexpected errors and restarts
- **Unhandled rejection handler**: Catches promise rejections and restarts
- **Graceful shutdown**: Only exits cleanly (code 0) on intentional shutdown
- **Build timestamp**: Helps identify which version is running

## How It Works

```
┌─────────────────┐
│  Cline Client   │
└────────┬────────┘
         │ stdio
         ▼
┌─────────────────┐
│ Auto-Restart    │ ← Monitors process, restarts on crash
│   Wrapper       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MCP Server     │ ← Detects disconnection, exits with code 1
└─────────────────┘
```

### Restart Flow

1. **Server Crashes** → Wrapper detects exit code != 0
2. **Wait 3 seconds** → Prevents rapid restart loops
3. **Restart Server** → Wrapper spawns new process
4. **Log Event** → Timestamp and exit code logged

### Disconnection Detection

The ERP MCP server monitors:

- `process.stdin.on('close')` → Stdio pipe closed (Cline disconnected)
- `uncaughtException` → Unexpected errors
- `unhandledRejection` → Unhandled promise rejections

All trigger exit code 1 → Auto-restart

## Configured Servers

| Server              | Wrapper                | Status                  |
| ------------------- | ---------------------- | ----------------------- |
| ERP Dev Accelerator | `watch-and-reload.bat` | ✅ Auto-restart enabled |
| Upstash Context7    | `mcp-autorestart.bat`  | ✅ Auto-restart enabled |
| Firecrawl           | `mcp-autorestart.bat`  | ✅ Auto-restart enabled |
| Sequential Thinking | `mcp-autorestart.bat`  | ✅ Auto-restart enabled |
| Browserbase         | `mcp-autorestart.bat`  | ✅ Auto-restart enabled |
| Filesystem          | `mcp-autorestart.bat`  | ✅ Auto-restart enabled |
| Git Repo Research   | `mcp-autorestart.bat`  | ✅ Auto-restart enabled |

## Logs

View restart logs:

```bash
# ERP MCP server
type %TEMP%\erp-mcp-reload.log

# Other servers
dir %TEMP%\mcp-autorestart-*.log
```

## Troubleshooting

### Server Won't Start

1. Check the log file for errors
2. Verify the MCP server path is correct
3. Ensure dependencies are installed

### Server Keeps Restarting

1. **Immediate restart** (no 3s delay) = Not using wrapper
2. **Continuous restart loop** = Server crash on startup
   - Check logs for error messages
   - May have dependency or configuration issues

### Server Shows Red Icon in Cline

1. Wait 3-5 seconds for auto-restart
2. If still red, check Cline's developer console
3. Verify server is running in Task Manager

## Benefits

- **Zero downtime**: Servers automatically recover from crashes
- **No manual intervention**: No need to manually restart disconnected servers
- **Production-ready**: Handles edge cases and unexpected errors
- **Logging**: All restarts logged for debugging
- **Universal**: Works with any MCP server, not just ERP
