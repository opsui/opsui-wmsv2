@echo off
REM MCP Server Auto-Reload Watcher
REM This script monitors the MCP server and restarts it if it crashes

SET "SERVER_PATH=C:\Users\Heinricht\Documents\Warehouse Management System\tools\mcp-server\dist\index.js"
SET "LOG_PATH=%TEMP%\erp-mcp-reload.log"

:LOOP
echo [%DATE% %TIME%] Starting ERP MCP Server... >> "%LOG_PATH%"
node "%SERVER_PATH%"

REM Server exited - check exit code
IF %ERRORLEVEL% EQU 0 (
    echo [%DATE% %TIME%] Server shut down gracefully >> "%LOG_PATH%"
    goto :END
) ELSE (
    echo [%DATE% %TIME%] Server crashed with exit code %ERRORLEVEL%, restarting in 3 seconds... >> "%LOG_PATH%"
    timeout /t 3 /nobreak >nul
    goto :LOOP
)

:END
echo [%DATE% %TIME%] Watcher terminated >> "%LOG_PATH%"
