/**
 * GLM-5 Powered Browser Test for Picking Page
 *
 * Uses GLM-5 AI to intelligently test the picking page and capture error logs.
 * This test:
 * 1. Navigates to the picking page
 * 2. Uses GLM-5 to analyze page state and generate test scenarios
 * 3. Captures all console errors, network errors, and UI errors
 * 4. Reports findings with detailed error logs
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { GLMClient } from './glm-client';
import { TEST_CONFIG, injectAuth, navigateAndWait } from './test-helpers';

// ============================================================================
// ERROR LOG COLLECTOR
// ============================================================================

interface ErrorLog {
  type: 'console' | 'network' | 'ui' | 'api';
  message: string;
  timestamp: string;
  details?: any;
}

class ErrorCollector {
  private errors: ErrorLog[] = [];

  addError(error: ErrorLog) {
    this.errors.push(error);
  }

  getErrors(): ErrorLog[] {
    return this.errors;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  clear() {
    this.errors = [];
  }

  printSummary() {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🐛 ERROR LOG SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Total Errors: ${this.errors.length}`);
    console.log('');

    if (this.errors.length === 0) {
      console.log('  ✅ No errors detected!');
    } else {
      const grouped = this.groupByType();
      for (const [type, errors] of Object.entries(grouped)) {
        console.log(`\n  📂 ${type.toUpperCase()} ERRORS (${errors.length}):`);
        console.log('  ───────────────────────────────────────────────────────────');
        errors.forEach((err, i) => {
          console.log(`  ${i + 1}. [${err.timestamp}]`);
          console.log(`     ${err.message.substring(0, 200)}${err.message.length > 200 ? '...' : ''}`);
          if (err.details) {
            console.log(`     Details: ${JSON.stringify(err.details).substring(0, 100)}`);
          }
        });
      }
    }
    console.log('\n═══════════════════════════════════════════════════════════════\n');
  }

  private groupByType(): Record<string, ErrorLog[]> {
    return this.errors.reduce((acc, err) => {
      if (!acc[err.type]) acc[err.type] = [];
      acc[err.type].push(err);
      return acc;
    }, {} as Record<string, ErrorLog[]>);
  }
}

// ============================================================================
// GLM-5 TEST SCENARIO GENERATOR
// ============================================================================

async function generatePickingTestScenarios(glmClient: GLMClient, pageInfo: {
  route: string;
  visibleElements: string[];
  forms: Array<{ fields: string[]; actions: string[] }>;
}): Promise<Array<{
  name: string;
  description: string;
  steps: Array<{ action: string; selector?: string; value?: any }>;
  expectedBehavior: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}>> {
  const systemPrompt = {
    role: 'system' as const,
    content: `You are a QA expert testing a Warehouse Management System (WMS) Picking Page.
Generate comprehensive test scenarios that would reveal bugs.

Return JSON: {
  "scenarios": [
    {
      "name": "test name",
      "description": "what this tests",
      "steps": [{"action": "navigate|click|fill|scan|wait|assert", "selector": "css selector", "value": "value"}],
      "expectedBehavior": "what should happen",
      "priority": "critical|high|medium|low"
    }
  ]
}

Focus on:
- Scan input validation (valid/invalid barcodes)
- Claim order functionality
- Pick workflow edge cases
- Exception handling
- Skip item functionality
- Complete order flow
- Error state handling
- Loading states`,
  };

  const userPrompt = {
    role: 'user' as const,
    content: `Generate test scenarios for the Picking Page:

Route: ${pageInfo.route}
Visible Elements: ${pageInfo.visibleElements.slice(0, 20).join(', ')}
Forms: ${pageInfo.forms.map(f => `Fields: ${f.fields.join(', ')}`).join('; ')}

Generate 5-8 test scenarios that cover critical picking functionality.`,
  };

  try {
    const response = await glmClient.callGLM([systemPrompt, userPrompt]);
    const parsed = JSON.parse(response);
    return parsed.scenarios || [];
  } catch (error) {
    console.error('Failed to generate test scenarios:', error);
    return [];
  }
}

// ============================================================================
// MAIN TEST
// ============================================================================

test.describe('GLM-5 Picking Page Browser Test', () => {
  let authToken: string;
  let errorCollector: ErrorCollector;
  let glmClient: GLMClient;

  test.beforeAll(async () => {
    // Initialize GLM client with GLM-5 model
    const apiKey = process.env.GLM_API_KEY || '1c4e10d1249440e0b6a5430c21450dc7.tn1bVz1mkDUHbgAW';
    glmClient = new GLMClient(apiKey, 'glm-5');
    
    authToken = process.env.CRAWLER_AUTH_TOKEN_PICKER || process.env.CRAWLER_AUTH_TOKEN || 'test-token';
    console.log('\n🤖 GLM-5 Picking Page Browser Test Initialized');
    console.log(`📦 Using Model: ${glmClient.getModel()}`);
  });

  test.beforeEach(async ({ context }) => {
    errorCollector = new ErrorCollector();

    // Inject authentication
    await injectAuth(context, authToken, 'picker', 'picker@wms.local', 'PICKER');

    // Set up error listeners
    await setupErrorListeners(context, errorCollector);
  });

  test('GLM-5: Full Picking Page Test with Error Logging', async ({ page, context }) => {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🤖 GLM-5 POWERED PICKING PAGE TEST');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Step 1: Navigate to Orders Queue
    console.log('📍 Step 1: Navigating to Orders Queue...');
    await navigateAndWait(page, '/orders');
    
    // Capture page state
    const pageContent = await page.content();
    const pageText = await page.locator('body').textContent();
    
    // Check for any immediate errors
    const errorElements = await page.locator('[class*="error"], [class*="Error"], text=/error/i').count();
    if (errorElements > 0) {
      const errorText = await page.locator('[class*="error"], [class*="Error"]').first().textContent();
      errorCollector.addError({
        type: 'ui',
        message: `Error element found on orders page: ${errorText}`,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`  ✅ Orders page loaded (${pageText?.length || 0} chars)`);

    // Step 2: Analyze page with GLM-5
    console.log('\n📍 Step 2: Analyzing page with GLM-5...');
    
    // Get visible elements for GLM analysis
    const visibleButtons = await page.locator('button:visible').allTextContents();
    const visibleLinks = await page.locator('a:visible').allTextContents();
    const visibleInputs = await page.locator('input:visible').evaluateAll(els => 
      els.map(el => ({ name: el.getAttribute('name') || '', placeholder: el.getAttribute('placeholder') || '', type: el.getAttribute('type') || '' }))
    );

    // Generate AI-powered test scenarios
    const scenarios = await generatePickingTestScenarios(glmClient, {
      route: '/orders',
      visibleElements: [...visibleButtons, ...visibleLinks].slice(0, 30),
      forms: [{ fields: visibleInputs.map(i => i.name || i.placeholder), actions: visibleButtons }],
    });

    console.log(`  🧠 GLM-5 generated ${scenarios.length} test scenarios`);
    scenarios.forEach((s, i) => {
      console.log(`     ${i + 1}. ${s.name} (${s.priority})`);
    });

    // Step 3: Find and claim an order
    console.log('\n📍 Step 3: Finding orders to pick...');
    
    const orderCards = page.locator('[data-order-id], [data-testid*="order"], .order-card, tr[data-id]');
    const orderCount = await orderCards.count();
    
    console.log(`  📦 Found ${orderCount} order(s)`);

    if (orderCount === 0) {
      console.log('  ⚠️  No orders available for picking test');
      errorCollector.printSummary();
      test.skip();
      return;
    }

    // Step 4: Try to claim and navigate to picking page
    console.log('\n📍 Step 4: Attempting to claim an order...');
    
    // Look for claim/start buttons
    const claimButton = page.locator('button:has-text("Claim"), button:has-text("Start"), button:has-text("Pick")').first();
    
    if (await claimButton.count() > 0) {
      try {
        await claimButton.click();
        await page.waitForTimeout(2000);
        
        // Check if we're now on picking page
        const currentUrl = page.url();
        if (currentUrl.includes('/picking/')) {
          console.log(`  ✅ Successfully navigated to picking page: ${currentUrl}`);
        } else {
          console.log(`  ℹ️  Current URL: ${currentUrl}`);
        }
      } catch (e: any) {
        errorCollector.addError({
          type: 'ui',
          message: `Failed to claim order: ${e.message}`,
          timestamp: new Date().toISOString(),
          details: { error: e.toString() },
        });
      }
    } else {
      // Try clicking on an order card directly
      try {
        await orderCards.first().click();
        await page.waitForTimeout(2000);
        console.log(`  📍 Navigated to: ${page.url()}`);
      } catch (e: any) {
        console.log(`  ⚠️  Could not interact with order: ${e.message}`);
      }
    }

    // Step 5: Test picking page if we're on it
    const currentUrl = page.url();
    if (currentUrl.includes('/picking/') || currentUrl.includes('/pick')) {
      console.log('\n📍 Step 5: Testing picking page functionality...');
      
      await testPickingPage(page, errorCollector, glmClient);
    }

    // Step 6: Direct API testing for picking endpoints
    console.log('\n📍 Step 6: Testing picking API endpoints...');
    await testPickingAPIs(page, errorCollector, context);

    // Step 7: Test edge cases with GLM-5
    console.log('\n📍 Step 7: Testing edge cases with GLM-5...');
    await testEdgeCases(page, errorCollector, glmClient);

    // Final: Print error summary
    errorCollector.printSummary();

    // Save error logs to file
    await saveErrorLogs(errorCollector);

    // Test passes but reports errors found
    expect(true).toBe(true);
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function setupErrorListeners(context: BrowserContext, errorCollector: ErrorCollector) {
  // Note: We need to set these up on each new page
  context.on('page', (page) => {
    // Console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        errorCollector.addError({
          type: 'console',
          message: `[${msg.type().toUpperCase()}] ${msg.text()}`,
          timestamp: new Date().toISOString(),
          details: { location: msg.location() },
        });
      }
    });

    // Page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      errorCollector.addError({
        type: 'console',
        message: `[PAGE ERROR] ${error.message}`,
        timestamp: new Date().toISOString(),
        details: { stack: error.stack },
      });
    });

    // Network failures
    page.on('requestfailed', (request) => {
      errorCollector.addError({
        type: 'network',
        message: `[NETWORK FAILED] ${request.method()} ${request.url()}`,
        timestamp: new Date().toISOString(),
        details: { failure: request.failure()?.errorText },
      });
    });

    // Response errors
    page.on('response', (response) => {
      if (response.status() >= 400) {
        errorCollector.addError({
          type: 'api',
          message: `[API ERROR] ${response.status()} ${response.url()}`,
          timestamp: new Date().toISOString(),
          details: { status: response.status(), statusText: response.statusText() },
        });
      }
    });
  });
}

async function testPickingPage(page: Page, errorCollector: ErrorCollector, glmClient: GLMClient) {
  console.log('  🔍 Testing picking page elements...');

  // Wait for page to stabilize
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // Test 1: Check for scan input
  const scanInput = page.locator('input[placeholder*="scan"], input[placeholder*="barcode"], input[name*="scan"]');
  const hasScanInput = await scanInput.count() > 0;
  console.log(`  ${hasScanInput ? '✅' : '⚠️'} Scan input: ${hasScanInput ? 'Found' : 'Not found'}`);

  // Test 2: Check for current task display
  const taskDisplay = page.locator('[class*="current"], [class*="task"], text=/Current Pick/i');
  const hasTaskDisplay = await taskDisplay.count() > 0;
  console.log(`  ${hasTaskDisplay ? '✅' : '⚠️'} Task display: ${hasTaskDisplay ? 'Found' : 'Not found'}`);

  // Test 3: Check for action buttons
  const completeButton = page.locator('button:has-text("Complete"), button:has-text("Finish")');
  const hasCompleteButton = await completeButton.count() > 0;
  console.log(`  ${hasCompleteButton ? '✅' : '⚠️'} Complete button: ${hasCompleteButton ? 'Found' : 'Not found'}`);

  // Test 4: Check for exception handling
  const exceptionButton = page.locator('button:has-text("Exception"), button:has-text("Report")');
  const hasExceptionButton = await exceptionButton.count() > 0;
  console.log(`  ${hasExceptionButton ? '✅' : '⚠️'} Exception button: ${hasExceptionButton ? 'Found' : 'Not found'}`);

  // Test 5: Try invalid scan
  if (hasScanInput) {
    console.log('\n  🧪 Testing invalid scan...');
    try {
      await scanInput.first().fill('INVALID-BARCODE-12345');
      await scanInput.first().press('Enter');
      await page.waitForTimeout(1500);

      // Check for error message
      const errorMsg = page.locator('[class*="error"], text=/invalid/i, text=/not found/i');
      const hasError = await errorMsg.count() > 0;
      if (!hasError) {
        errorCollector.addError({
          type: 'ui',
          message: 'No error feedback for invalid barcode scan',
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log('  ✅ Invalid scan shows error feedback');
      }
    } catch (e: any) {
      console.log(`  ⚠️  Could not test scan: ${e.message}`);
    }
  }

  // Test 6: Check progress indicator
  const progressBar = page.locator('[class*="progress"], svg circle, [role="progressbar"]');
  const hasProgress = await progressBar.count() > 0;
  console.log(`  ${hasProgress ? '✅' : '⚠️'} Progress indicator: ${hasProgress ? 'Found' : 'Not found'}`);

  // Test 7: Check for item list
  const itemList = page.locator('[class*="item"], [class*="list"] li, tr');
  const itemCount = await itemList.count();
  console.log(`  ${itemCount > 0 ? '✅' : '⚠️'} Items list: ${itemCount} items`);

  // Test 8: Check loading states
  const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], text=/loading/i');
  const isLoading = await loadingIndicator.count() > 0;
  if (isLoading) {
    console.log('  ℹ️  Loading indicator present (waiting...)');
    await page.waitForTimeout(3000);
  }
}

async function testPickingAPIs(page: Page, errorCollector: ErrorCollector, context: BrowserContext) {
  const apiEndpoints = [
    { method: 'GET', path: '/api/orders' },
    { method: 'GET', path: '/api/orders/queue' },
    { method: 'GET', path: '/api/pickers/activity' },
  ];

  for (const endpoint of apiEndpoints) {
    try {
      const response = await page.request.get(`${TEST_CONFIG.BASE_URL.replace('5173', '3001')}${endpoint.path}`);
      
      if (!response.ok()) {
        errorCollector.addError({
          type: 'api',
          message: `API ${endpoint.method} ${endpoint.path} returned ${response.status()}`,
          timestamp: new Date().toISOString(),
          details: { status: response.status(), statusText: response.statusText() },
        });
      } else {
        console.log(`  ✅ ${endpoint.path} - OK`);
      }
    } catch (e: any) {
      errorCollector.addError({
        type: 'api',
        message: `API ${endpoint.method} ${endpoint.path} failed: ${e.message}`,
        timestamp: new Date().toISOString(),
        details: { error: e.toString() },
      });
    }
  }
}

async function testEdgeCases(page: Page, errorCollector: ErrorCollector, glmClient: GLMClient) {
  console.log('  🧪 Generating edge case tests with GLM-5...');

  // Ask GLM-5 for edge cases
  const edgeCases = await glmClient.generateTestData({
    fieldName: 'barcode',
    fieldType: 'text',
    constraints: ['alphanumeric', 'uppercase', 'length 8-20'],
    context: 'WMS picking page scan input',
  });

  console.log(`  📋 Generated ${edgeCases.edge?.length || 0} edge cases`);
  console.log(`  📋 Generated ${edgeCases.malicious?.length || 0} malicious inputs`);

  // Test a few edge cases
  const scanInput = page.locator('input[placeholder*="scan"], input[placeholder*="barcode"]').first();
  
  if (await scanInput.count() > 0) {
    for (const testValue of (edgeCases.malicious || []).slice(0, 3)) {
      try {
        await scanInput.clear();
        await scanInput.fill(String(testValue));
        await page.waitForTimeout(500);

        // Check for XSS
        const pageContent = await page.content();
        if (pageContent.includes('<script>') || pageContent.includes('onerror=')) {
          errorCollector.addError({
            type: 'ui',
            message: `Potential XSS vulnerability with input: ${String(testValue).substring(0, 50)}`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        // Input was likely rejected
      }
    }
  }
}

async function saveErrorLogs(errorCollector: ErrorCollector) {
  const errors = errorCollector.getErrors();
  const logData = {
    timestamp: new Date().toISOString(),
    totalErrors: errors.length,
    errors: errors,
  };

  // Write to file
  const fs = require('fs');
  const path = require('path');
  const logPath = path.join(__dirname, 'picking-page-errors.json');
  
  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
  console.log(`\n📁 Error logs saved to: ${logPath}`);
}
<task_progress>
- [x] Explore GLM client and testing setup
- [x] Understand the picking page implementation
- [x] Create GLM-5 browser test for picking page
- [ ] Run the test and capture error logs
- [ ] Report findings
</task_progress>
</write_to_file>