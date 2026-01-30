/**
 * Intelligent Test Orchestration System
 *
 * Optimizes test execution order, parallelization, and resource allocation
 * Uses AI to make smart decisions about test scheduling
 */

import { GLMClient } from './glm-client';

interface TestSpec {
  name: string;
  path: string;
  duration: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
  stability: number; // 0-1 pass rate
  category: string;
  requiresAuth: boolean;
  requiresData: boolean;
}

interface ExecutionPlan {
  sequential: Array<{ test: string; order: number; estimatedDuration: number }>;
  parallel: Array<{
    shard: number;
    tests: string[];
    order: number;
    estimatedDuration: number;
  }>;
  skipped: string[];
  totalEstimatedDuration: number;
  parallelizationFactor: number;
  reasoning: string;
}

interface TestSuiteMetrics {
  totalTests: number;
  averageDuration: number;
  passRate: number;
  flakyTests: string[];
  slowTests: string[];
}

export class IntelligentTestOrchestrator {
  private glm: GLMClient;
  private testHistory = new Map<
    string,
    {
      executions: number;
      failures: number;
      averageDuration: number;
      lastExecuted: Date;
    }
  >();

  constructor(glm: GLMClient) {
    this.glm = glm;
  }

  /**
   * Create optimal execution plan for test suite
   */
  async createExecutionPlan(
    tests: TestSpec[],
    constraints: {
      availableTime?: number;
      parallelCapacity?: number;
      priorityThreshold?: 'critical' | 'high' | 'medium' | 'low';
      skipFlaky?: boolean;
    } = {}
  ): Promise<ExecutionPlan> {
    const {
      availableTime = Infinity,
      parallelCapacity = 4,
      priorityThreshold = 'low',
      skipFlaky = false,
    } = constraints;

    console.log(`\n  🎯 Creating optimal execution plan for ${tests.length} tests...`);
    console.log(`     Time limit: ${availableTime === Infinity ? 'none' : availableTime + 's'}`);
    console.log(`     Parallel capacity: ${parallelCapacity} workers`);
    console.log(`     Priority threshold: ${priorityThreshold}`);

    // Filter tests by priority
    const priorityLevels = ['critical', 'high', 'medium', 'low'];
    const thresholdIndex = priorityLevels.indexOf(priorityThreshold);
    const eligibleTests = tests.filter(t => priorityLevels.indexOf(t.priority) <= thresholdIndex);

    console.log(`     Eligible tests: ${eligibleTests.length}`);

    // Skip flaky tests if requested
    const stableTests = skipFlaky ? eligibleTests.filter(t => t.stability > 0.7) : eligibleTests;

    if (skipFlaky && stableTests.length < eligibleTests.length) {
      console.log(`     Skipped ${eligibleTests.length - stableTests.length} unstable tests`);
    }

    // Use AI to optimize execution
    const optimizationResult = await this.glm.optimizeTestExecution({
      tests: stableTests.map(t => ({
        name: t.name,
        duration: t.duration,
        dependencies: t.dependencies,
        priority: t.priority,
        stability: t.stability,
      })),
      availableTime: availableTime === Infinity ? undefined : availableTime,
      parallelCapacity,
    });

    // Build execution plan
    const executionPlan: ExecutionPlan = {
      sequential: optimizationResult.executionPlan.sequential.map(s => ({
        test: s.test,
        order: s.order,
        estimatedDuration: tests.find(t => t.name === s.test)?.duration || 0,
      })),
      parallel: optimizationResult.executionPlan.parallel.map(p => ({
        shard: p.order,
        tests: p.tests,
        order: p.order,
        estimatedDuration: Math.max(
          ...p.tests.map(testName => tests.find(t => t.name === testName)?.duration || 0)
        ),
      })),
      skipped: optimizationResult.executionPlan.skipped,
      totalEstimatedDuration: optimizationResult.estimatedDuration,
      parallelizationFactor:
        optimizationResult.executionPlan.parallel.length /
        Math.max(
          optimizationResult.executionPlan.parallel.length +
            optimizationResult.executionPlan.sequential.length,
          1
        ),
      reasoning: optimizationResult.reasoning,
    };

    console.log(`    ✅ Plan created:`);
    console.log(`       Sequential: ${executionPlan.sequential.length} tests`);
    console.log(`       Parallel shards: ${executionPlan.parallel.length}`);
    console.log(`       Skipped: ${executionPlan.skipped.length}`);
    console.log(`       Estimated duration: ${executionPlan.totalEstimatedDuration}s`);
    console.log(
      `       Parallelization: ${Math.round(executionPlan.parallelizationFactor * 100)}%`
    );

    return executionPlan;
  }

  /**
   * Calculate test suite metrics
   */
  calculateMetrics(tests: TestSpec[]): TestSuiteMetrics {
    const totalTests = tests.length;
    const averageDuration = tests.reduce((sum, t) => sum + t.duration, 0) / totalTests;

    const flakyTests = tests.filter(t => t.stability < 0.8).map(t => t.name);

    const slowTests = tests
      .filter(t => t.duration > averageDuration * 2)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(t => t.name);

    const totalFailures = tests.reduce(
      (sum, t) => sum + (1 - t.stability) * (this.testHistory.get(t.name)?.executions || 10),
      0
    );
    const passRate = totalTests > 0 ? 1 - totalFailures / totalTests : 1;

    return {
      totalTests,
      averageDuration,
      passRate,
      flakyTests,
      slowTests,
    };
  }

  /**
   * Update test history for better planning
   */
  recordTestExecution(testName: string, duration: number, passed: boolean): void {
    const history = this.testHistory.get(testName) || {
      executions: 0,
      failures: 0,
      averageDuration: 0,
      lastExecuted: new Date(),
    };

    history.executions++;
    history.averageDuration =
      (history.averageDuration * (history.executions - 1) + duration) / history.executions;
    history.lastExecuted = new Date();

    if (!passed) {
      history.failures++;
    }

    this.testHistory.set(testName, history);
  }

  /**
   * Get test recommendations based on history
   */
  getRecommendations(tests: TestSpec[]): string[] {
    const recommendations: string[] = [];
    const metrics = this.calculateMetrics(tests);

    // Flaky test recommendations
    if (metrics.flakyTests.length > 0) {
      recommendations.push(
        `Consider running these tests separately: ${metrics.flakyTests.slice(0, 5).join(', ')}`
      );
    }

    // Slow test recommendations
    if (metrics.slowTests.length > 0) {
      recommendations.push(
        `These tests take >2x average time, consider optimization: ${metrics.slowTests.slice(0, 3).join(', ')}`
      );
    }

    // Pass rate recommendations
    if (metrics.passRate < 0.9) {
      recommendations.push(
        `Suite pass rate is ${Math.round(metrics.passRate * 100)}%, focus on failing tests first`
      );
    }

    // Parallelization recommendations
    const independentTests = tests.filter(t => t.dependencies.length === 0);
    if (independentTests.length > tests.length * 0.5) {
      recommendations.push(
        `${independentTests.length} tests have no dependencies, can run in parallel`
      );
    }

    return recommendations;
  }

  /**
   * Generate Playwright shard configuration
   */
  generateShardConfig(plan: ExecutionPlan): string {
    const config: any = {
      projects: [],
    };

    for (const shard of plan.parallel) {
      config.projects.push({
        name: `shard-${shard.shard}`,
        testMatch: shard.tests.map(t => `**/${t}.spec.ts`),
      });
    }

    return JSON.stringify(config, null, 2);
  }

  /**
   * Export execution plan as JSON
   */
  exportPlan(plan: ExecutionPlan): string {
    return JSON.stringify(plan, null, 2);
  }

  /**
   * Import execution plan from JSON
   */
  importPlan(json: string): ExecutionPlan {
    return JSON.parse(json);
  }
}

export default IntelligentTestOrchestrator;
