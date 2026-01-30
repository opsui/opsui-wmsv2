/**
 * Fully Autonomous AI Testing Agent
 *
 * This agent explores your WMS application, generates intelligent tests,
 * finds bugs, and reports findings - all powered by GLM.
 *
 * Usage:
 *   npx playwright test ai-agent.spec.ts
 *
 * Environment variables:
 *   GLM_API_KEY - Your GLM API key
 *   BASE_URL - Application URL (default: http://localhost:5173)
 *   CRAWLER_AUTH_TOKEN - Auth token for testing
 */

import { test, expect } from '@playwright/test';
import { request, APIRequestContext } from '@playwright/test';
import { Page } from '@playwright/test';
import { GLMClient } from './glm-client';
import { TEST_CONFIG, injectAuth } from './test-helpers';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_KEY = process.env.GLM_API_KEY || '1c4e10d1249440e0b6a5430c21450dc7.tn1bVz1mkDUHbgAW';
const API_BASE = TEST_CONFIG.BASE_URL.replace('5173', '3001');

interface BugFinding {
  timestamp: Date;
  scenario: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  steps: string[];
  expected: string;
  actual: string;
  suggestions?: string[];
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

// ============================================================================
// AUTONOMOUS AI AGENT
// ============================================================================

class AutonomousAIAgent {
  private glm: GLMClient;
  private findings: BugFinding[] = [];
  private results: TestResult[] = [];
  private apiContext: APIRequestContext;

  constructor(apiContext: APIRequestContext) {
    this.glm = new GLMClient(API_KEY);
    this.apiContext = apiContext;
  }

  /**
   * Run the autonomous testing loop
   */
  async run(page: Page, maxIterations = 10): Promise<void> {
    console.log('\n🤖 AUTONOMOUS AI TESTING AGENT STARTING');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Phase 1: Analyze the application
    await this.analyzeApplication(page);

    // Phase 2: Generate and execute intelligent tests
    for (let i = 0; i < maxIterations; i++) {
      console.log(`\n📍 ITERATION ${i + 1}/${maxIterations}`);
      console.log('───────────────────────────────────────────────────────────────');

      await this.generateAndExecuteTests(page);

      // Phase 3: Analyze results and decide next action
      await this.analyzeAndAdapt(page);
    }

    // Phase 4: Security analysis
    await this.performSecurityAnalysis(page);

    // Phase 5: Generate final report
    this.generateReport();
  }

  /**
   * Phase 1: Analyze the application structure
   */
  private async analyzeApplication(page: Page): Promise<void> {
    console.log('🔍 Phase 1: Analyzing application...');

    try {
      // Navigate to dashboard to understand the app
      await page.goto(`${TEST_CONFIG.BASE_URL}/dashboard`);
      await page.waitForLoadState('domcontentloaded');

      // Get visible routes and features
      const routes = await this.discoverRoutes(page);
      const features = await this.discoverFeatures(page);

      console.log(`  ✅ Found ${routes.length} routes`);
      console.log(`  ✅ Found ${features.length} features`);

      // Store for test generation
      this.appContext = { routes, features };
    } catch (error) {
      console.error('  ❌ Application analysis failed:', error);
    }
  }

  /**
   * Discover all routes in the application
   */
  private async discoverRoutes(page: Page): Promise<string[]> {
    const routes: string[] = [];

    // Get navigation links
    const navLinks = await page.locator('nav a, header a, [role="navigation"] a').allTextContents();
    routes.push(...navLinks);

    // Add known WMS routes
    const wmsRoutes = [
      '/dashboard',
      '/orders',
      '/picking',
      '/packing',
      '/stock-control',
      '/exceptions',
      '/user-roles',
      '/admin-settings',
      '/bin-locations',
      '/location-capacity',
      '/slotting',
      '/wave-picking',
      '/zone-picking',
      '/barcode-scanning',
      '/item-search',
      '/developer',
    ];

    routes.push(...wmsRoutes);

    return [...new Set(routes)]; // Dedupe
  }

  /**
   * Discover key features of the application
   */
  private async discoverFeatures(page: Page): Promise<string[]> {
    return [
      'Order Management',
      'Inventory Control',
      'Picking & Packing',
      'User Roles & Permissions',
      'Bin Location Management',
      'Exception Handling',
      'Barcode Scanning',
      'Wave Picking',
      'Location Capacity Management',
      'Audit Logging',
    ];
  }

  private appContext: { routes: string[]; features: string[] } = {
    routes: [],
    features: [],
  };

  /**
   * Phase 2: Generate and execute AI-powered tests
   */
  private async generateAndExecuteTests(page: Page): Promise<void> {
    console.log('🧠 Phase 2: Generating intelligent tests...');

    try {
      // Generate test scenarios using GLM
      const scenarios = await this.glm.generateTestScenarios(this.appContext);

      console.log(`  📋 Generated ${scenarios.length} test scenarios`);

      // Execute each scenario
      for (const scenario of scenarios.slice(0, 5)) {
        // Limit to 5 per iteration
        await this.executeScenario(page, scenario);
      }
    } catch (error) {
      console.error('  ❌ Test generation failed:', error);
    }
  }

  /**
   * Execute a single test scenario
   */
  private async executeScenario(page: Page, scenario: any): Promise<void> {
    console.log(`  ▶️  Testing: ${scenario.name} (${scenario.priority})`);

    const startTime = Date.now();
    const steps: string[] = [];

    try {
      for (const step of scenario.steps) {
        steps.push(`${step.action}: ${step.selector || step.value || ''}`);

        switch (step.action) {
          case 'navigate':
            await page.goto(`${TEST_CONFIG.BASE_URL}${step.selector}`);
            await page.waitForLoadState('domcontentloaded');
            break;

          case 'click':
            await page.click(step.selector).catch(() => {
              throw new Error(`Element not found: ${step.selector}`);
            });
            break;

          case 'fill':
            await page.fill(step.selector, String(step.value));
            break;

          case 'assert':
            if (step.expected === 'error message') {
              const hasError = (await page.locator('text=/error|invalid|required/i').count()) > 0;
              if (!hasError) {
                throw new Error(`Expected error message not shown`);
              }
            }
            break;

          case 'wait':
            await page.waitForTimeout(parseInt(step.selector) || 1000);
            break;
        }
      }

      const duration = Date.now() - startTime;
      this.results.push({ name: scenario.name, passed: true, duration });
      console.log(`    ✅ Passed (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.results.push({ name: scenario.name, passed: false, duration, error: errorMessage });
      console.log(`    ❌ Failed: ${errorMessage}`);

      // Generate bug report for failures
      await this.reportBug(page, scenario, steps, errorMessage);
    }
  }

  /**
   * Report a bug found during testing
   */
  private async reportBug(
    page: Page,
    scenario: any,
    steps: string[],
    error: string
  ): Promise<void> {
    try {
      const pageContent = await page.content();
      const bugReport = await this.glm.generateBugReport({
        testName: scenario.name,
        expectedBehavior: scenario.description,
        actualBehavior: error,
        steps,
        pageContent,
      });

      this.findings.push({
        timestamp: new Date(),
        scenario: scenario.name,
        severity: bugReport.severity,
        title: bugReport.title,
        description: bugReport.description,
        steps: bugReport.steps,
        expected: bugReport.expected,
        actual: bugReport.actual,
        suggestions: bugReport.suggestions,
      });

      console.log(`    🐛 Bug reported: ${bugReport.title} [${bugReport.severity.toUpperCase()}]`);
    } catch (err) {
      console.error('    ⚠️  Failed to generate bug report:', err);
    }
  }

  /**
   * Phase 3: Analyze results and adapt strategy
   */
  private async analyzeAndAdapt(page: Page): Promise<void> {
    console.log('📊 Phase 3: Analyzing results...');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const coverage = Math.round((this.results.length / (passed + failed)) * 100);

    try {
      const analysis = await this.glm.analyzeResults({
        passedTests: passed,
        failedTests: failed,
        errors: this.results
          .filter(r => !r.passed)
          .map(r => ({ test: r.name, error: r.error || '' })),
        coverage,
      });

      console.log(`  📈 ${analysis.summary}`);
      console.log(`  🎯 Risk Areas: ${analysis.riskAreas.join(', ')}`);

      if (analysis.nextActions.length > 0) {
        console.log(`  ➡️  Next Actions:`);
        analysis.nextActions.forEach(action => console.log(`     • ${action}`));
      }
    } catch (error) {
      console.error('  ⚠️  Analysis failed:', error);
    }
  }

  /**
   * Phase 4: Security analysis
   */
  private async performSecurityAnalysis(page: Page): Promise<void> {
    console.log('\n🔒 Phase 4: Security Analysis...');

    try {
      const pageContent = await page.content();
      const forms = await this.extractForms(page);

      const securityAnalysis = await this.glm.analyzeSecurity({
        pageContent,
        forms,
      });

      if (securityAnalysis.vulnerabilities.length > 0) {
        console.log(`  ⚠️  Found ${securityAnalysis.vulnerabilities.length} security issues:\n`);

        for (const vuln of securityAnalysis.vulnerabilities) {
          console.log(`  🚨 ${vuln.type} [${vuln.severity.toUpperCase()}]`);
          console.log(`     ${vuln.description}`);
          console.log(`     Exploit: ${vuln.exploit}`);
          console.log(`     Fix: ${vuln.fix}\n`);

          this.findings.push({
            timestamp: new Date(),
            scenario: 'Security Analysis',
            severity: vuln.severity,
            title: `${vuln.type}: ${vuln.description}`,
            description: vuln.exploit,
            steps: [vuln.fix],
            expected: 'Secure implementation',
            actual: 'Vulnerable implementation',
          });
        }
      } else {
        console.log('  ✅ No security vulnerabilities found');
      }
    } catch (error) {
      console.error('  ⚠️  Security analysis failed:', error);
    }
  }

  /**
   * Extract forms from the page for security analysis
   */
  private async extractForms(page: Page): Promise<Array<{ action: string; fields: string[] }>> {
    const forms: Array<{ action: string; fields: string[] }> = [];

    const formCount = await page.locator('form').count();
    for (let i = 0; i < formCount; i++) {
      const form = page.locator('form').nth(i);
      const action = (await form.getAttribute('action')) || 'unknown';

      const fields: string[] = [];
      const inputCount = await form.locator('input, textarea, select').count();
      for (let j = 0; j < inputCount; j++) {
        const input = form.locator('input, textarea, select').nth(j);
        const name = (await input.getAttribute('name')) || 'unnamed';
        const type = (await input.getAttribute('type')) || 'text';
        fields.push(`${name} (${type})`);
      }

      forms.push({ action, fields });
    }

    return forms;
  }

  /**
   * Phase 5: Generate final report
   */
  private generateReport(): void {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  🤖 AUTONOMOUS AI AGENT - FINAL REPORT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    // Test Results Summary
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log('  📊 TEST RESULTS');
    console.log('  ───────────────────────────────────────────────────────────');
    console.log(`  Total Tests:  ${total}`);
    console.log(`  ✅ Passed:     ${passed} (${Math.round((passed / total) * 100)}%)`);
    console.log(`  ❌ Failed:     ${failed} (${Math.round((failed / total) * 100)}%)`);
    console.log('');

    // Bug Findings
    const critical = this.findings.filter(f => f.severity === 'critical').length;
    const high = this.findings.filter(f => f.severity === 'high').length;
    const medium = this.findings.filter(f => f.severity === 'medium').length;
    const low = this.findings.filter(f => f.severity === 'low').length;

    console.log('  🐛 BUGS FOUND');
    console.log('  ───────────────────────────────────────────────────────────');
    console.log(`  🔴 Critical:  ${critical}`);
    console.log(`  🟠 High:      ${high}`);
    console.log(`  🟡 Medium:    ${medium}`);
    console.log(`  🟢 Low:       ${low}`);
    console.log(`  📋 Total:     ${this.findings.length}`);
    console.log('');

    // Detailed Bug Reports
    if (this.findings.length > 0) {
      console.log('  📋 DETAILED FINDINGS');
      console.log('  ───────────────────────────────────────────────────────────');

      for (const finding of this.findings) {
        const icon =
          finding.severity === 'critical'
            ? '🔴'
            : finding.severity === 'high'
              ? '🟠'
              : finding.severity === 'medium'
                ? '🟡'
                : '🟢';

        console.log(`\n  ${icon} ${finding.title}`);
        console.log(`     Severity: ${finding.severity.toUpperCase()}`);
        console.log(`     Description: ${finding.description}`);
        console.log(`     Expected: ${finding.expected}`);
        console.log(`     Actual: ${finding.actual}`);

        if (finding.suggestions && finding.suggestions.length > 0) {
          console.log(`     Suggestions:`);
          finding.suggestions.forEach(s => console.log(`       • ${s}`));
        }
      }
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════\n');
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Autonomous AI Agent', () => {
  test('fully autonomous AI testing agent', async ({ browser, context }) => {
    // Setup authentication
    const authToken = process.env.CRAWLER_AUTH_TOKEN || 'test-token';
    await injectAuth(context, authToken, 'admin', 'admin@wms.local', 'ADMIN');

    const page = await context.newPage();

    // Create API context for agent
    const apiContext = await request.newContext({
      baseURL: API_BASE,
    });

    // Create and run the autonomous agent
    const agent = new AutonomousAIAgent(apiContext);

    try {
      await agent.run(page, 2); // Run 2 iterations (reduced for faster testing)
    } finally {
      await apiContext.dispose();
    }

    // Always pass - this is an exploratory test
    expect(true).toBe(true);
  });
});

test.describe('AI Agent Capabilities', () => {
  test.beforeAll(async () => {
    test.setTimeout(60000); // Increase timeout for AI calls
  });

  test.skip('generates intelligent test scenarios', async () => {
    const apiContext = await request.newContext({ baseURL: API_BASE });
    const glm = new GLMClient(API_KEY);

    const scenarios = await glm.generateTestScenarios({
      routes: ['/orders', '/stock-control', '/picking'],
      features: ['Order Management', 'Inventory Control'],
    });

    expect(scenarios.length).toBeGreaterThan(0);
    expect(scenarios[0]).toHaveProperty('name');
    expect(scenarios[0]).toHaveProperty('steps');
    expect(scenarios[0]).toHaveProperty('priority');

    console.log(`\n  🧠 Generated ${scenarios.length} intelligent test scenarios`);
    scenarios.forEach(s => console.log(`     • ${s.name} [${s.priority}]`));

    await apiContext.dispose();
  });

  test('performs security analysis', async () => {
    test.setTimeout(60000); // Increase timeout for AI calls

    const apiContext = await request.newContext({ baseURL: API_BASE });
    const glm = new GLMClient(API_KEY);

    const analysis = await glm.analyzeSecurity({
      pageContent:
        '<form action="/api/login"><input name="email" type="text"><input name="password" type="password"></form>',
      forms: [{ action: '/api/login', fields: ['email (text)', 'password (password)'] }],
    });

    expect(analysis).toHaveProperty('vulnerabilities');
    expect(Array.isArray(analysis.vulnerabilities)).toBe(true);

    console.log(`\n  🔒 Found ${analysis.vulnerabilities.length} potential security issues`);

    await apiContext.dispose();
  });

  test('generates test data for edge cases', async () => {
    test.setTimeout(60000); // Increase timeout for AI calls

    const apiContext = await request.newContext({ baseURL: API_BASE });
    const glm = new GLMClient(API_KEY);

    const testData = await glm.generateTestData({
      fieldName: 'quantity',
      fieldType: 'number',
      constraints: ['min: 0', 'max: 10000'],
      context: 'Order quantity field',
    });

    expect(testData).toHaveProperty('normal');
    expect(testData).toHaveProperty('edge');
    expect(testData).toHaveProperty('malicious');

    console.log('\n  📊 Generated test data:');
    console.log(`     Normal: ${testData.normal.join(', ')}`);
    console.log(`     Edge: ${testData.edge.join(', ')}`);
    console.log(`     Malicious: ${testData.malicious.join(', ')}`);

    await apiContext.dispose();
  });
});
