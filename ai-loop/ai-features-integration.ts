/**
 * AI Features Integration - All 10 Advanced AI Testing Features
 *
 * This module integrates all 10 advanced AI testing capabilities into a unified system:
 * 1. Self-healing tests (auto-fix broken selectors)
 * 2. Change-based test prioritization (run only affected tests)
 * 3. AI-generated tests from production code
 * 4. Root cause analysis with suggested fixes
 * 5. Production log analysis for test generation
 * 6. Natural language to test conversion
 * 7. Visual AI regression testing
 * 8. Intelligent test orchestration
 * 9. Continuously learning models
 * 10. Smart test data factories
 *
 * Usage:
 *   import { AIFeatures } from './ai-features-integration';
 *   const ai = new AIFeatures(apiKey);
 *   await ai.initialize();
 */

import { Page } from '@playwright/test';
import { GLMClient } from './glm-client';
import { SelfHealingSelectors } from './self-healing';
import { ChangeDetectionSystem } from './change-detection';
import { CodeBasedTestGenerator } from './code-test-generator';
import { ProductionLogAnalyzer } from './production-log-analyzer';
import { NaturalLanguageTestConverter } from './natural-language-tests';
import { VisualAIRegression } from './visual-regression';
import { IntelligentTestOrchestrator } from './test-orchestration';
import { ContinuouslyLearningModel } from './continuous-learning';
import { SmartTestDataFactory } from './smart-data-factory';

export interface AIFeaturesConfig {
  apiKey: string;
  cacheDir?: string;
  enableSelfHealing?: boolean;
  enableChangeDetection?: boolean;
  enableVisualRegression?: boolean;
  enableContinuousLearning?: boolean;
}

/**
 * Main AIFeatures class that provides access to all 10 advanced features
 */
export class AIFeatures {
  private glm: GLMClient;
  private config: AIFeaturesConfig;

  // Feature instances
  public selfHealing?: SelfHealingSelectors;
  public changeDetection?: ChangeDetectionSystem;
  public codeTestGenerator?: CodeBasedTestGenerator;
  public productionLogAnalyzer?: ProductionLogAnalyzer;
  public naturalLanguageConverter?: NaturalLanguageTestConverter;
  public visualRegression?: VisualAIRegression;
  public testOrchestrator?: IntelligentTestOrchestrator;
  public learningModel?: ContinuouslyLearningModel;
  public dataFactory?: SmartTestDataFactory;

  constructor(config: AIFeaturesConfig) {
    this.glm = new GLMClient(config.apiKey);
    this.config = config;
  }

  /**
   * Initialize all AI features
   */
  async initialize(routes: string[] = []): Promise<void> {
    console.log('\n  🤖 Initializing AI Features...');

    // 1. Self-healing selectors
    if (this.config.enableSelfHealing !== false) {
      console.log('  ✓ Self-healing selectors');
    }

    // 2. Change detection
    if (this.config.enableChangeDetection !== false) {
      this.changeDetection = new ChangeDetectionSystem(
        this.glm,
        this.config.cacheDir + '/change-cache'
      );
      console.log('  ✓ Change detection system');
    }

    // 3. Code-based test generator
    this.codeTestGenerator = new CodeBasedTestGenerator(
      this.glm,
      this.config.cacheDir + '/generated-tests'
    );
    console.log('  ✓ Code-based test generator');

    // 4. Production log analyzer
    this.productionLogAnalyzer = new ProductionLogAnalyzer(this.glm);
    console.log('  ✓ Production log analyzer');

    // 5. Natural language converter
    this.naturalLanguageConverter = new NaturalLanguageTestConverter(
      this.glm,
      routes
    );
    console.log('  ✓ Natural language test converter');

    // 6. Visual regression
    if (this.config.enableVisualRegression !== false) {
      this.visualRegression = new VisualAIRegression(
        this.glm,
        this.config.cacheDir + '/visual-snapshots'
      );
      console.log('  ✓ Visual AI regression');
    }

    // 7. Test orchestrator
    this.testOrchestrator = new IntelligentTestOrchestrator(this.glm);
    console.log('  ✓ Intelligent test orchestration');

    // 8. Continuous learning
    if (this.config.enableContinuousLearning !== false) {
      this.learningModel = new ContinuouslyLearningModel(
        this.glm,
        this.config.cacheDir + '/learned-model'
      );
      console.log('  ✓ Continuously learning model');
    }

    // 9. Smart data factory
    this.dataFactory = new SmartTestDataFactory(this.glm);
    console.log('  ✓ Smart test data factory');

    console.log('  ✅ All AI features initialized\n');
  }

  /**
   * FEATURE 1: Create self-healing selector system for a page
   */
  createSelfHealing(page: Page): SelfHealingSelectors {
    return new SelfHealingSelectors(page, this.glm);
  }

  /**
   * FEATURE 2: Detect changes and prioritize tests
   */
  async detectChangesAndPrioritize(availableTests: Array<{
    path: string;
    name: string;
    coverage: string[];
  }>) {
    if (!this.changeDetection) {
      throw new Error('Change detection not enabled');
    }

    const changes = this.changeDetection.detectChanges();
    const analysis = await this.changeDetection.analyzeChangesAndPrioritize(
      changes,
      availableTests
    );

    return {
      changes,
      analysis,
      prioritizedTests: this.changeDetection.getPrioritizedTests(analysis, availableTests),
    };
  }

  /**
   * FEATURE 3: Generate tests from source code
   */
  async generateTestsFromCode(sourcePath: string) {
    if (!this.codeTestGenerator) {
      throw new Error('Code test generator not enabled');
    }

    return this.codeTestGenerator.generateTestsFromFile(sourcePath);
  }

  /**
   * FEATURE 4: Analyze test failure root cause
   */
  async analyzeRootCause(failure: {
    testName: string;
    errorMessage: string;
    stackTrace?: string;
    testCode?: string;
  }) {
    return this.glm.analyzeRootCause(failure);
  }

  /**
   * FEATURE 5: Analyze production logs
   */
  async analyzeProductionLogs(logFilePath: string) {
    if (!this.productionLogAnalyzer) {
      throw new Error('Production log analyzer not enabled');
    }

    const entries = this.productionLogAnalyzer.parseLogFile(logFilePath);
    return this.productionLogAnalyzer.analyzeAndGenerateTests(entries);
  }

  /**
   * FEATURE 6: Convert natural language to test
   */
  async naturalLanguageToTest(description: string) {
    if (!this.naturalLanguageConverter) {
      throw new Error('Natural language converter not enabled');
    }

    return this.naturalLanguageConverter.convertToTest(description);
  }

  /**
   * FEATURE 7: Capture and compare visual snapshots
   */
  async compareVisuals(page: Page, route: string) {
    if (!this.visualRegression) {
      throw new Error('Visual regression not enabled');
    }

    return this.visualRegression.compareWithBaseline(page, route);
  }

  /**
   * FEATURE 8: Optimize test execution plan
   */
  async optimizeExecution(tests: Array<{
    name: string;
    path: string;
    duration: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    dependencies: string[];
    stability: number;
  }>, constraints?: {
    availableTime?: number;
    parallelCapacity?: number;
  }) {
    if (!this.testOrchestrator) {
      throw new Error('Test orchestrator not enabled');
    }

    // Transform input tests to TestSpec format
    const testSpecs: Array<{
      name: string;
      path: string;
      duration: number;
      priority: 'critical' | 'high' | 'medium' | 'low';
      dependencies: string[];
      stability: number;
      category: string;
      requiresAuth: boolean;
      requiresData: boolean;
    }> = tests.map(t => ({
      ...t,
      category: 'general',
      requiresAuth: true,
      requiresData: false,
    }));

    return this.testOrchestrator.createExecutionPlan(testSpecs, constraints);
  }

  /**
   * FEATURE 9: Learn from route exploration
   */
  async learnFromRoute(
    route: string,
    routeName: string,
    elements: Array<{
      selector: string;
      type: string;
      text: string;
      behavior: string;
      interactionSuccess: boolean;
    }>
  ) {
    if (!this.learningModel) {
      throw new Error('Learning model not enabled');
    }

    return this.learningModel.observeRoute(route, routeName, elements);
  }

  /**
   * FEATURE 10: Generate smart test data
   */
  async generateTestData(
    entityType: string,
    fieldSpecs: Array<{
      name: string;
      type: string;
      constraints?: string[];
      required: boolean;
    }>,
    options?: {
      count?: number;
      scenario?: 'happy' | 'edge' | 'stress' | 'security';
    }
  ) {
    if (!this.dataFactory) {
      throw new Error('Data factory not enabled');
    }

    return this.dataFactory.generateTestData(entityType, fieldSpecs, options);
  }

  /**
   * Get comprehensive AI insights
   */
  async getInsights() {
    const insights: any = {};

    if (this.learningModel) {
      insights.learning = this.learningModel.generateInsights();
    }

    if (this.visualRegression) {
      insights.visual = this.visualRegression.getStats();
    }

    if (this.testOrchestrator) {
      insights.orchestration = {
        available: true,
        description: 'Use optimizeExecution() for test planning',
      };
    }

    return insights;
  }

  /**
   * Export learned model
   */
  exportModel() {
    if (!this.learningModel) {
      throw new Error('Learning model not enabled');
    }

    return this.learningModel.exportModel();
  }
}

/**
 * Convenience function to create AI features instance
 */
export function createAIFeatures(config: AIFeaturesConfig): AIFeatures {
  return new AIFeatures(config);
}

/**
 * All 10 AI Features Summary:
 *
 * 1. ✅ Self-healing tests (auto-fix broken selectors)
 *    - Automatically finds alternative selectors when UI changes
 *    - Uses 4 strategies: text-content, attributes, position, AI-powered
 *
 * 2. ✅ Change-based test prioritization (run only affected tests)
 *    - Detects code changes via git or filesystem
 *    - Analyzes impact and prioritizes affected tests
 *    - Reduces test execution time significantly
 *
 * 3. ✅ AI-generated tests from production code
 *    - Reads source code and generates comprehensive tests
 *    - Supports TypeScript, JavaScript, Python, Java
 *    - Analyzes code structure and complexity
 *
 * 4. ✅ Root cause analysis with suggested fixes
 *    - Analyzes test failures and identifies root causes
 *    - Suggests specific fixes and provides corrected code
 *    - Helps prevent similar failures
 *
 * 5. ✅ Production log analysis for test generation
 *    - Parses production logs (JSON, Apache, Nginx)
 *    - Generates tests from real-world errors and edge cases
 *    - Identifies security events and performance issues
 *
 * 6. ✅ Natural language to test conversion
 *    - Converts plain English descriptions to executable tests
 *    - Enables non-technical users to create tests
 *    - Generates full Playwright test code
 *
 * 7. ✅ Visual AI regression testing
 *    - Captures and compares visual page states
 *    - Detects layout shifts, content changes, style changes
 *    - Uses AI to analyze visual differences
 *
 * 8. ✅ Intelligent test orchestration
 *    - Optimizes test execution order and parallelization
 *    - Considers dependencies, priority, stability
 *    - Generates shard configurations
 *
 * 9. ✅ Continuously learning models
 *   - Learns from test executions and explorations
 *   - Builds application-specific models
 *   - Improves selector reliability and test stability
 *
 * 10. ✅ Smart test data factories
 *    - Generates realistic production-like test data
 *    - Respects constraints and relationships
 *    - Creates edge cases and security test data
 */

export default AIFeatures;
