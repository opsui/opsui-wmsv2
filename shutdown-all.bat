@echo off
REM =============================================================================
REM ERP Services - Graceful Shutdown Script
REM =============================================================================
REM This script properly shuts down all ERP services in the correct order
REM ensuring clean termination of all resources
REM =============================================================================

SETLOCAL EnableDelayedExpansion
SET "PROJECT_ROOT=C:\Users\Heinricht\Documents\Warehouse Management System"
SET "LOG_FILE=%TEMP%\erp-shutdown.log"

echo.
echo ==============================================================================
echo ERP Services - Graceful Shutdown
echo ==============================================================================
echo.
echo Log: %LOG_FILE%
echo [%DATE% %TIME%] Starting graceful shutdown... >> "%LOG_FILE%"

REM Define service ports
SET FRONTEND_PORT=5173
SET BACKEND_PORT=3001
SET ML_API_PORT=8001

REM =============================================================================
REM STEP 1: Shutdown Frontend (Vite)
REM =============================================================================

echo.
echo [1/3] Shutting down Frontend (port %FRONTEND_PORT%)...

REM Find Vite process
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%FRONTEND_PORT% 2^>nul') do (
    set "VITE_PID=%%a"
    goto :found_frontend
)

echo [INFO] No frontend process found on port %FRONTEND_PORT%
goto :skip_frontend

:found_frontend
echo Found Vite process: !VITE_PID!
echo Sending SIGTERM...

REM Try graceful shutdown first
taskkill /PID !VITE_PID! /SIGTERM >nul 2>&1

REM Wait for graceful shutdown (up to 5 seconds)
set /a COUNT=0
:wait_frontend
timeout /t 1 /nobreak >nul
set /a COUNT+=1

REM Check if still running
tasklist /FI "PID eq !VITE_PID!" 2>nul | find !VITE_PID! >nul
if errorlevel 1 (
    echo [OK] Frontend shut down gracefully
    [%DATE% %TIME%] Frontend shut down gracefully (PID !VITE_PID!) >> "%LOG_FILE%"
    goto :skip_frontend
)

if !COUNT! LSS 5 (
    echo Waiting for frontend to close... !COUNT!/5
    goto :wait_frontend
)

REM Force kill if still running
echo [WARN] Frontend did not shut down gracefully, forcing...
taskkill /F /PID !VITE_PID! >nul 2>&1
echo [WARN] Frontend force quit
[%DATE% %TIME%] Frontend force quit (PID !VITE_PID!) >> "%LOG_FILE%"

:skip_frontend

REM =============================================================================
REM STEP 2: Shutdown ML API (if running)
REM =============================================================================

echo.
echo [2/3] Checking ML API (port %ML_API_PORT%)...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%ML_API_PORT% 2^>nul') do (
    set "ML_PID=%%a"
    goto :found_ml
)

echo [INFO] No ML API process found on port %ML_API_PORT%
goto :skip_ml

:found_ml
echo Found ML API process: !ML_PID!
echo Sending SIGTERM...

taskkill /PID !ML_PID! /SIGTERM >nul 2>&1

REM Wait for graceful shutdown
timeout /t 2 /nobreak >nul

REM Check if still running
tasklist /FI "PID eq !ML_PID!" 2>nul | find !ML_PID! >nul
if errorlevel 1 (
    echo [OK] ML API shut down gracefully
    [%DATE% %TIME%] ML API shut down gracefully (PID !ML_PID!) >> "%LOG_FILE%"
    goto :skip_ml
)

REM Force kill if needed
echo [WARN] ML API did not shut down gracefully, forcing...
taskkill /F /PID !ML_PID! >nul 2>&1
echo [WARN] ML API force quit
[%DATE% %TIME%] ML API force quit (PID !ML_PID!) >> "%LOG_FILE%"

:skip_ml

REM =============================================================================
REM STEP 3: Shutdown Backend (Express)
REM =============================================================================

echo.
echo [3/3] Shutting down Backend (port %BACKEND_PORT%)...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%BACKEND_PORT% 2^>nul') do (
    set "BACKEND_PID=%%a"
    goto :found_backend
)

echo [INFO] No backend process found on port %BACKEND_PORT%
goto :skip_backend

:found_backend
echo Found Backend process: !BACKEND_PID!
echo Sending SIGTERM...

REM Try graceful shutdown first (this triggers the gracefulShutdown handlers)
taskkill /PID !BACKEND_PID! /SIGTERM >nul 2>&1

REM Wait longer for backend (it needs to close DB connections)
set /a COUNT=0
:wait_backend
timeout /t 1 /nobreak >nul
set /a COUNT+=1

REM Check if still running
tasklist /FI "PID eq !BACKEND_PID!" 2>nul | find !BACKEND_PID! >nul
if errorlevel 1 (
    echo [OK] Backend shut down gracefully
    [%DATE% %TIME%] Backend shut down gracefully (PID !BACKEND_PID!) >> "%LOG_FILE%"
    goto :skip_backend
)

if !COUNT! LSS 10 (
    echo Waiting for backend to close... !COUNT!/10
    goto :wait_backend
)

REM Force kill if still running
echo [WARN] Backend did not shut down gracefully, forcing...
taskkill /F /PID !BACKEND_PID! >nul 2>&1
echo [WARN] Backend force quit (database connections may be left open)
[%DATE% %TIME%] Backend force quit (PID !BACKEND_PID!) >> "%LOG_FILE%"

:skip_backend

REM =============================================================================
REM STEP 4: Cleanup Port Locks
REM =============================================================================

echo.
echo [4/4] Cleaning up port locks...

if exist "%PROJECT_ROOT%\packages\backend\.port-locks" (
    echo Removing port lock files...
    rmdir /s /q "%PROJECT_ROOT%\packages\backend\.port-locks" 2>nul
    echo [OK] Port locks cleaned up
    [%DATE% %TIME%] Port locks removed >> "%LOG_FILE%"
) else (
    echo [INFO] No port locks found
)

REM =============================================================================
REM STEP 5: Verify All Services Stopped
REM =============================================================================

echo.
echo Verifying all services are stopped...

SET "REMAINING=0"

REM Check frontend
netstat -ano | findstr :%FRONTEND_PORT% >nul 2>&1
if errorlevel 1 (
    echo [OK] Port %FRONTEND_PORT% is free
) else (
    echo [WARN] Port %FRONTEND_PORT% still in use
    SET /a REMAINING+=1
)

REM Check backend
netstat -ano | findstr :%BACKEND_PORT% >nul 2>&1
if errorlevel 1 (
    echo [OK] Port %BACKEND_PORT% is free
) else (
    echo [WARN] Port %BACKEND_PORT% still in use
    SET /a REMAINING+=1
)

REM Check ML API
netstat -ano | findstr :%ML_API_PORT% >nul 2>&1
if errorlevel 1 (
    echo [OK] Port %ML_API_PORT% is free
) else (
    echo [WARN] Port %ML_API_PORT% still in use
    SET /a REMAINING+=1
)

REM =============================================================================
REM FINAL SUMMARY
REM =============================================================================

echo.
echo ==============================================================================
if !REMAINING! EQU 0 (
    echo [SUCCESS] All ERP services shut down cleanly
    echo ==============================================================================
    echo.
    [%DATE% %TIME%] All services shut down successfully >> "%LOG_FILE%"
) else (
    echo [WARNING] Some services may still be running
    echo ==============================================================================
    echo.
    echo To see what's still running:
    echo   netstat -ano ^| findstr ":%FRONTEND_PORT% %BACKEND_PORT% %ML_API_PORT%"
    echo.
    [%DATE% %TIME%] Some services still running >> "%LOG_FILE%"
)

echo Full shutdown log: %LOG_FILE%
echo.
pause
