# WMS Playwright Crawler v2.0

Enhanced automated error detection system for the Warehouse Management System.

## 🚀 What's New in v2.0

- ✅ **Form Filling** - Automatically fills all input fields with realistic test data
- ✅ **API Failure Detection** - Tracks all 4xx/5xx API responses
- ✅ **Coverage Tracking** - Shows exactly what was clicked and tested
- ✅ **Auto-Fix Prompts** - Generates ready-to-use prompts for Claude Code
- ✅ **CI/CD Ready** - Includes GitHub Actions workflow
- ✅ **Enhanced Reports** - Detailed error categorization with fix suggestions

## Quick Start

### 0. Verify Setup (Recommended First Time)

```bash
npm run crawl:check
```

This runs a health check to ensure everything is properly configured.

### 1. Start Your Dev Server

```bash
npm run dev
```

### 2. Run the Crawler

```bash
npm run crawl:all
```

This runs the crawler and normalizes errors in one go.

### 3. Review Results

```bash
npm run crawl:fix
```

This generates a fix prompt you can paste into Claude Code.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run crawl:check` | **Run health check first** (verifies setup) |
| `npm run crawl` | Run Playwright crawler only |
| `npm run crawl:normalize` | Normalize errors and generate report |
| `npm run crawl:all` | Run crawler + normalize (recommended) |
| `npm run crawl:fix` | Generate fix prompt for Claude Code |

Or use the Windows batch script:

```bash
ai-loop\run-crawler.bat
```

## Output Files

| File | Description |
|------|-------------|
| `error-log.json` | Raw error data from Playwright |
| `normalized-errors.json` | Cleaned, deduplicated error report |
| `fix-prompt.md` | Ready-to-paste prompt for Claude Code |
| `playwright-report/index.html` | Visual HTML report with screenshots |

## Test Credentials

The crawler uses these test credentials (update in [crawl.spec.ts:77-82](crawl.spec.ts#L77-L82)):

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Picker | picker | picker123 |
| Packer | packer | packer123 |
| Stock Controller | stock | stock123 |

## What the Crawler Tests

### Routes (25+ total)

- `/login` - Public login page
- `/orders` - Order queue (picker)
- `/packing` - Packing queue (packer)
- `/dashboard` - Admin dashboard
- `/exceptions` - Exception handling
- `/stock-control` - Stock control
- `/inwards` - Inwards goods
- `/production` - Production management
- `/maintenance` - Maintenance requests
- `/rma` - Returns management
- `/sales` - Sales dashboard
- `/cycle-counting` - Cycle counting
- `/location-capacity` - Location capacity
- `/bin-locations` - Bin locations
- `/quality-control` - Quality control
- `/business-rules` - Business rules
- `/reports` - Reports
- `/integrations` - Third-party integrations
- `/search` - Item search
- `/waves` - Wave picking
- `/zones` - Zone picking
- `/slotting` - Slotting optimization
- `/user-roles` - User role management
- `/roles-management` - Custom roles
- `/role-settings` - Role settings
- `/developer` - Developer tools (dev only)

### Actions Per Route

For each route, the crawler:

1. **Navigates** to the route
2. **Fills all forms** with realistic test data:
   - Text inputs (emails, phones, etc.)
   - Number inputs
   - Select dropdowns (selects first option)
   - Checkboxes (checks all)
   - Radio buttons (selects first)
   - Textareas
3. **Clicks all interactive elements**:
   - Buttons (with deduplication)
   - Internal links
   - Closes modals/alerts automatically
4. **Tracks**:
   - Page errors (uncaught exceptions)
   - Console errors
   - API failures (4xx/5xx)
   - Click failures
   - Input failures

## Error Report Format

```json
{
  "timestamp": "2025-01-23T...",
  "duration": 12345,
  "summary": {
    "totalUniqueErrors": 5,
    "totalRawErrors": 23,
    "totalAPIIssues": 3,
    "byType": {
      "pageerror": 2,
      "console-error": 15,
      "api-failure": 3,
      "click-failure": 3
    },
    "byPriority": {
      "critical": 2,
      "high": 1,
      "medium": 2,
      "low": 0
    }
  },
  "coverage": {
    "routesVisited": 24,
    "totalRoutes": 25,
    "routeCoverage": 96,
    "elementStats": {
      "totalElements": 450,
      "interactedElements": 380,
      "interactionCoverage": 84
    },
    "uncoveredRoutes": [],
    "lowCoverageRoutes": []
  },
  "errors": [
    {
      "id": "ERR-001",
      "type": "pageerror",
      "count": 5,
      "routes": ["/orders", "/packing"],
      "message": "Cannot read properties of undefined...",
      "priority": "critical",
      "suggestedFix": "Add null check or optional chaining (?.)"
    }
  ],
  "apiIssues": [
    {
      "endpoint": "/api/orders",
      "status": 500,
      "count": 3,
      "routes": ["/orders"],
      "methods": ["GET"],
      "priority": "critical"
    }
  ],
  "quickFix": [...]
}
```

## Coverage Metrics

The crawler tracks:

- **Route Coverage** - % of routes visited
- **Element Coverage** - % of buttons/links/inputs interacted with
- **Low Coverage Routes** - Routes with <50% element interaction
- **Inaccessible Routes** - Routes that redirected to login

## Fixing Errors

### Option 1: Using Claude Code

1. Run the crawler: `npm run crawl:all`
2. Generate fix prompt: `npm run crawl:fix`
3. Open the prompt: `code ai-loop/fix-prompt.md`
4. Copy contents and paste into Claude Code
5. Apply the fixes

### Option 2: Manual Review

1. Open `ai-loop/normalized-errors.json`
2. Review each error
3. Fix manually in your code
4. Run crawler again to verify

### Option 3: Visual Report

```bash
npx playwright show-report
```

This opens an HTML report with screenshots and videos of failed actions.

## CI/CD Integration

The crawler includes a GitHub Actions workflow (`.github/workflows/crawler.yml`):

- Runs on every push/PR
- Runs daily at 2 AM UTC
- Can be triggered manually
- Comments on PRs with results
- Uploads artifacts (error logs, screenshots)

### To enable:

1. Ensure GitHub Actions is enabled for your repo
2. The workflow file is already in `.github/workflows/crawler.yml`
3. Push to trigger

## What This Catches

✅ **Runtime JavaScript errors** - Uncaught exceptions, type errors
✅ **Console errors** - Errors logged to console
✅ **API failures** - 4xx/5xx responses from backend
✅ **Broken navigation** - Routes that fail to load
✅ **Click failures** - Buttons/elements that can't be clicked
✅ **Input failures** - Fields that can't be filled
✅ **Auth redirects** - Pages redirecting to login unexpectedly

## What This Does NOT Catch

❌ Business logic errors (e.g., wrong calculations)
❌ UI/UX issues (e.g., styling problems)
❌ API contract violations (e.g., wrong response format)
❌ Security issues (e.g., XSS, SQL injection)
❌ Performance issues (e.g., slow loading)

## Configuration

### Change Base URL

Set `BASE_URL` environment variable:

```bash
BASE_URL=http://localhost:3000 npm run crawl
```

### Change Timeout

Edit [playwright.config.ts:16](playwright.config.ts#L16):

```ts
use: {
  actionTimeout: 10000,  // Change action timeout
  navigationTimeout: 30000,  // Change nav timeout
}
```

### Test with Different Users

Edit [crawl.spec.ts:77-82](crawl.spec.ts#L77-L82) to change credentials.

## Troubleshooting

### "Dev server not detected"

Make sure your frontend is running:
```bash
npm run dev
```

### "Login failed"

Check that the test users exist in your database, or update credentials in `crawl.spec.ts`.

### Crawler is too slow

Reduce timeouts in `crawl.spec.ts`:
- `page.waitForTimeout(500)` → `page.waitForTimeout(100)`
- `actionTimeout: 10000` → `actionTimeout: 3000`

### TypeScript errors

Ensure you're using Node.js 20+ and TypeScript 5.3+.

## Advanced Usage

### Run specific test

```bash
# Only the main crawl test
npx playwright test crawl.spec.ts -g "full scan"
```

### Run with UI (headed mode)

Edit `playwright.config.ts`:
```ts
use: {
  headless: false,
}
```

### Debug mode

```bash
npx playwright test crawl.spec.ts --debug
```

This opens Playwright Inspector to step through the test.

## Architecture

```
ai-loop/
├── crawl.spec.ts         # Main crawler test
├── normalize-errors.ts   # Error normalizer
├── auto-fix.ts           # Fix prompt generator
├── playwright.config.ts  # Playwright config
├── run-crawler.bat       # Windows batch script
├── error-log.json        # Raw errors (generated)
├── normalized-errors.json # Normalized report (generated)
└── fix-prompt.md         # Fix prompt (generated)
```

## Contributing

To add new routes to test, edit the `ROUTES` array in [crawl.spec.ts:20-74](crawl.spec.ts#L20-L74).

## License

MIT
