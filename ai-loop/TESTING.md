# WMS Test Configuration

## Environment Variables

Configure test behavior with these environment variables:

### Required

None - all tests use sensible defaults

### Optional

| Variable             | Description                       | Default                 | Example                                   |
| -------------------- | --------------------------------- | ----------------------- | ----------------------------------------- |
| `BASE_URL`           | Frontend URL for tests            | `http://localhost:5173` | `http://localhost:3000`                   |
| `TEST_USER`          | Admin user email for login tests  | `admin@wms.local`       | `test-admin@example.com`                  |
| `TEST_PASS`          | Admin user password               | `admin123`              | `SecurePassword123!`                      |
| `CRAWLER_AUTH_TOKEN` | JWT token for authenticated tests | (auto-generated)        | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `CRAWLER_USER_ID`    | User ID for authenticated tests   | (auto-generated)        | `admin`                                   |

## Running Tests

```bash
# Run all tests
npm run test

# Run specific test suites
npx playwright test e2e.spec.ts
npx playwright test workflows.spec.ts
npx playwright test crawl.spec.ts

# Run with visual output
npx playwright test --ui

# Run with debug mode
npx playwright test --debug
```

## Test Data Management

Generate test data:

```bash
# Via Developer panel UI → Test Data Presets → Load preset
# Or via API:
curl -X POST http://localhost:3001/api/developer/test-data/with-orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Clean up test data:

```bash
# Via Developer panel UI → Crawler → Clear Results
# Or via API:
curl -X DELETE http://localhost:3001/api/developer/clear-audit-logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## CI/CD Configuration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      - postgres: latest
        env:
          POSTGRES_DB: wms_db
          POSTGRES_USER: wms_user
          POSTGRES_PASSWORD: wms_password

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm ci
          npx playwright install --with-deps

      - name: Start services
        run: npm run dev &
        sleep 30

      - name: Run E2E tests
        env:
          BASE_URL: http://localhost:5173
          TEST_USER: admin@wms.local
          TEST_PASS: admin123
        run: npx playwright test e2e.spec.ts workflows.spec.ts

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: ai-loop/playwright-report/
```

## Troubleshooting

### Tests timeout

- Increase timeout in playwright.config.ts
- Check if frontend/backend services are running
- Verify database connection

### "No orders available" skips

- Generate test data first via Developer panel
- Use "with-orders" preset in Test Data Presets

### Auth tests fail

- Verify JWT_SECRET is set in backend
- Check frontend/backend CORS configuration
- Ensure admin user exists in database

### 401 Unauthorized errors during tests

- **Expected behavior**: Tests may log 401 errors to console when:
  - Accessing protected routes without authentication
  - Auth tokens expire during test runs
  - Navigating to pages before login completes
- **Error handling**: The application now suppresses 401 console logs during automated testing (Playwright/Cypress) to reduce noise
- **To fix 401 errors in tests**:
  1. Ensure login completes before navigating to protected routes:
     ```typescript
     await page.waitForLoadState('networkidle');
     await page.waitForTimeout(2000); // Allow JWT to be stored
     const authStored = await page.evaluate(
       () => !!localStorage.getItem('wms-auth-storage')
     );
     if (!authStored) {
       console.warn('Auth not stored - login may have failed');
     }
     ```
  2. Use `page.context().storageState()` to persist auth between tests
  3. Generate fresh tokens for long-running tests using `generateFreshToken()`

### API response not detected

- Some tests use optional API waits - these are fine
- "No API response matching pattern" debug messages are informational
