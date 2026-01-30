/**
 * Natural Language to Test Converter
 *
 * Converts plain English descriptions into executable Playwright tests
 * Enables non-technical users to create tests through natural language
 */

import { GLMClient } from './glm-client';

interface NaturalLanguageTest {
  name: string;
  description: string;
  steps: Array<{
    action: string;
    target?: string;
    value?: any;
    description: string;
  }>;
  expectedResult: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface GeneratedTestFile {
  fileName: string;
  content: string;
  dependencies: string[];
}

export class NaturalLanguageTestConverter {
  private glm: GLMClient;
  private applicationRoutes: string[];

  constructor(glm: GLMClient, routes: string[] = []) {
    this.glm = glm;
    this.applicationRoutes = routes;
  }

  /**
   * Convert natural language description to test
   */
  async convertToTest(
    description: string,
    applicationType: string = 'WMS'
  ): Promise<NaturalLanguageTest> {
    console.log(`  📝 Converting: "${description.substring(0, 60)}..."`);

    const result = await this.glm.convertNaturalLanguageToTest({
      description,
      applicationType,
      availableRoutes: this.applicationRoutes,
    });

    if (result.testCases.length > 0) {
      const testCase = result.testCases[0];
      console.log(`    ✅ Generated: ${testCase.name}`);
      return {
        name: testCase.name,
        description: testCase.description,
        steps: testCase.steps,
        expectedResult: testCase.expectedResult,
        priority: testCase.priority,
      };
    }

    throw new Error('Failed to generate test from description');
  }

  /**
   * Convert multiple descriptions to test suite
   */
  async convertToTestSuite(
    descriptions: string[],
    suiteName: string,
    applicationType: string = 'WMS'
  ): Promise<GeneratedTestFile> {
    console.log(`\n  📋 Creating test suite: ${suiteName}`);
    console.log(`  📝 Converting ${descriptions.length} descriptions...\n`);

    const tests: NaturalLanguageTest[] = [];

    for (const description of descriptions) {
      try {
        const test = await this.convertToTest(description, applicationType);
        tests.push(test);
      } catch (error) {
        console.log(`    ⚠️  Skipped: ${(error as Error).message}`);
      }
    }

    return this.generateTestFile(suiteName, tests);
  }

  /**
   * Generate executable Playwright test file
   */
  private generateTestFile(suiteName: string, tests: NaturalLanguageTest[]): GeneratedTestFile {
    const sanitizedSuiteName = suiteName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${sanitizedSuiteName}.spec.ts`;

    // Imports
    let content = `import { test, expect } from '@playwright/test';\n\n`;

    // Test describe block
    content += `test.describe('Natural Language: ${suiteName}', () => {\n`;

    // Generate each test
    for (const test of tests) {
      content += `  test('${test.description.replace(/'/g, "\\'")}', async ({ page }) => {\n`;
      content += `    // Priority: ${test.priority}\n`;

      // Generate test steps
      for (const step of test.steps) {
        content += this.generateStepCode(step);
      }

      // Generate assertion
      content += this.generateAssertion(test);

      content += `  });\n\n`;
    }

    content += `});\n`;

    return {
      fileName,
      content,
      dependencies: ['@playwright/test'],
    };
  }

  /**
   * Generate code for a single step
   */
  private generateStepCode(step: {
    action: string;
    target?: string;
    value?: any;
    description: string;
  }): string {
    const { action, target, value } = step;
    let code = `    // ${step.description}\n`;

    switch (action.toLowerCase()) {
      case 'navigate':
        code += `    await page.goto('${target || '/'}');\n`;
        code += `    await page.waitForLoadState('domcontentloaded');\n`;
        break;

      case 'click':
        code += `    await page.click('${target || 'button'}');\n`;
        break;

      case 'fill':
        code += `    await page.fill('${target || 'input'}', '${value || ''}');\n`;
        break;

      case 'select':
        code += `    await page.selectOption('${target || 'select'}', '${value || ''}');\n`;
        break;

      case 'wait':
        code += `    await page.waitForTimeout(${value || 1000});\n`;
        break;

      case 'assert':
        // Handled in generateAssertion
        break;

      case 'hover':
        code += `    await page.hover('${target || 'element'}');\n`;
        break;

      case 'check':
        code += `    await page.check('${target || 'input'}');\n`;
        break;

      case 'uncheck':
        code += `    await page.uncheck('${target || 'input'}');\n`;
        break;

      case 'type':
        code += `    await page.type('${target || 'input'}', '${value || ''}');\n`;
        break;

      default:
        code += `    // TODO: Implement ${action} action\n`;
    }

    return code;
  }

  /**
   * Generate assertion code
   */
  private generateAssertion(test: NaturalLanguageTest): string {
    const expectedResult = test.expectedResult.toLowerCase();

    let code = `    // Expected: ${test.expectedResult}\n`;

    if (expectedResult.includes('visible') || expectedResult.includes('displayed')) {
      code += `    await expect(page.locator('${test.steps[test.steps.length - 1].target || 'body'}')).toBeVisible();\n`;
    } else if (expectedResult.includes('hidden') || expectedResult.includes('not visible')) {
      code += `    await expect(page.locator('${test.steps[test.steps.length - 1].target || 'body'}')).toBeHidden();\n`;
    } else if (expectedResult.includes('error') || expectedResult.includes('invalid')) {
      code += `    await expect(page.locator('text=/error|invalid/i')).toBeVisible();\n`;
    } else if (expectedResult.includes('success') || expectedResult.includes('message')) {
      code += `    await expect(page.locator('text=/success|complete|done/i')).toBeVisible();\n`;
    } else if (expectedResult.includes('navigate') || expectedResult.includes('redirect')) {
      const targetUrl = test.steps.find(s => s.action === 'navigate')?.target || '/next';
      code += `    await expect(page).toHaveURL(/${targetUrl.replace(/\//g, '\\/')}/);\n`;
    } else {
      code += `    // TODO: Verify: ${test.expectedResult}\n`;
    }

    return code;
  }

  /**
   * Extract test descriptions from text (e.g., from requirements doc)
   */
  extractTestDescriptions(text: string): string[] {
    const descriptions: string[] = [];

    // Pattern: "Test that...", "Verify that...", "Ensure that...", "Should..."
    const patterns = [
      /(?:test|verify|ensure|check|validate)\s+that\s+([^.\n]+)/gi,
      /should\s+([^.\n]+)/gi,
      /must\s+([^.\n]+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const description = match[0].trim();
        if (description.length > 10 && description.length < 200) {
          descriptions.push(description);
        }
      }
    }

    // Remove duplicates
    return [...new Set(descriptions)];
  }

  /**
   * Generate tests from requirements document
   */
  async generateTestsFromRequirements(
    requirementsText: string,
    suiteName: string = 'Requirements Tests',
    applicationType: string = 'WMS'
  ): Promise<GeneratedTestFile> {
    console.log(`\n  📄 Extracting test descriptions from requirements...`);

    const descriptions = this.extractTestDescriptions(requirementsText);

    console.log(`  ✅ Found ${descriptions.length} testable requirements`);

    return this.convertToTestSuite(descriptions, suiteName, applicationType);
  }

  /**
   * Update available routes for better test generation
   */
  updateRoutes(routes: string[]): void {
    this.applicationRoutes = routes;
  }
}

export default NaturalLanguageTestConverter;
