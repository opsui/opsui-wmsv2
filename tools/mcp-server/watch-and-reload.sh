#!/bin/bash
# MCP Server Auto-Reload Watcher
# This script monitors the MCP server and restarts it if it crashes

SERVER_PATH="C:/Users/Heinricht/Documents/Warehouse Management System/tools/mcp-server/dist/index.js"
LOG_PATH="$TEMP/erp-mcp-reload.log"

while true; do
    echo "[$(date)] Starting ERP MCP Server..." >> "$LOG_PATH"
    node "$SERVER_PATH"
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        echo "[$(date)] Server shut down gracefully" >> "$LOG_PATH"
        break
    else
        echo "[$(date)] Server crashed with exit code $EXIT_CODE, restarting in 3 seconds..." >> "$LOG_PATH"
        sleep 3
    fi
done

echo "[$(date)] Watcher terminated" >> "$LOG_PATH"
