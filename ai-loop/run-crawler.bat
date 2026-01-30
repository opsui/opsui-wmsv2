@echo off
setlocal enabledelayedexpansion

REM ╔════════════════════════════════════════════════════════════╗
REM ║     WMS PLAYWRIGHT CRAWLER v2.0 - RUN SCRIPT               ║
REM ║     Industry-standard pre-flight checks + execution         ║
REM ╚════════════════════════════════════════════════════════════╝

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     WMS ERROR CRAWLER v2.0 - Initializing                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Configuration
set BASE_DIR=%~dp0
set CRAWL_DIR=%BASE_DIR%ai-loop

REM Change to project root
cd /d "%BASE_DIR%"

REM Step 1: Health Check
echo ════════════════════════════════════════════════════════════
echo  Step 1: Running health check
echo ════════════════════════════════════════════════════════════
echo.

call npm run crawl:check
if %errorlevel% neq 0 (
    echo.
    echo ❌ Health check failed. Please fix the issues above.
    pause
    exit /b 1
)

echo.
echo ════════════════════════════════════════════════════════════
echo  Step 2: Checking dev server
echo ════════════════════════════════════════════════════════════
echo.

curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Dev server not detected at http://localhost:5173
    echo.
    echo Please start the dev server first:
    echo   npm run dev
    echo.
    echo Or run this in a separate terminal while dev server is running.
    echo.
    pause
    exit /b 1
)

echo ✓ Dev server detected
echo.

echo ════════════════════════════════════════════════════════════
echo  Step 3: Running Playwright Crawler
echo ════════════════════════════════════════════════════════════
echo.
echo This will test all routes, click buttons, fill forms, and detect errors.
echo Estimated time: 2-5 minutes
echo.

cd "%CRAWL_DIR%"

npx playwright test crawl.spec.ts --reporter=list

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Some tests may have failed, but error log should still be generated.
    echo.
)

REM Normalize errors
echo.
echo ════════════════════════════════════════════════════════════
echo  Step 4: Normalizing Errors and Coverage
echo ════════════════════════════════════════════════════════════
echo.

npx tsx normalize-errors.ts

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Error normalization failed. Check if error-log.json exists.
    echo.
)

REM Generate fix prompt
echo.
echo ════════════════════════════════════════════════════════════
echo  Step 5: Generating Fix Prompt
echo ════════════════════════════════════════════════════════════
echo.

npx tsx auto-fix.ts

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    CRAWL COMPLETE                          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 📁 Results:
echo.
echo   Raw errors:         ai-loop\error-log.json
echo   Normalized report:  ai-loop\normalized-errors.json
echo   Fix prompt:         ai-loop\fix-prompt.md
echo   Visual report:      ai-loop\playwright-report\index.html
echo.
echo ════════════════════════════════════════════════════════════
echo  NEXT STEPS
echo ════════════════════════════════════════════════════════════
echo.
echo 1. Review the normalized errors:
echo    type ai-loop\normalized-errors.json
echo.
echo 2. Open the fix prompt in your editor:
echo    code ai-loop\fix-prompt.md
echo.
echo 3. Copy the fix prompt and paste it into Claude Code
echo.
echo 4. After fixing, run again to verify:
echo    npm run crawl:all
echo.
echo ════════════════════════════════════════════════════════════
echo.

REM Optional: Open the visual report
echo Would you like to open the visual HTML report? (Y/N)
set /p OPEN_REPORT=

if /i "%OPEN_REPORT%"=="Y" (
    if exist "ai-loop\playwright-report\index.html" (
        start ai-loop\playwright-report\index.html
    ) else (
        echo Report not found. Run: npx playwright show-report ai-loop\playwright-report
    )
)

pause
