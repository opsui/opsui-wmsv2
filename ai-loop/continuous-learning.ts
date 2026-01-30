/**
 * Continuously Learning Model System
 *
 * Builds application-specific models that improve over time
 * Learns from test executions to generate better tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { GLMClient } from './glm-client';

interface ElementObservation {
  selector: string;
  type: string;
  text: string;
  attributes: Record<string, string>;
  behavior: string;
  interactionSuccess: boolean;
  timestamp: Date;
}

interface RouteObservation {
  route: string;
  routeName: string;
  elements: ElementObservation[];
  patterns: string[];
  antiPatterns: string[];
  accessRequirements: string[];
  loadTime: number;
  timestamp: Date;
}

interface ApplicationModel {
  routeSignatures: Map<string, string[]>;
  elementBehaviors: Map<string, string>;
  commonPatterns: string[];
  antiPatterns: string[];
  selectorReliability: Map<string, number>;
  testSuccessRates: Map<string, number>;
  lastUpdated: Date;
}

export class ContinuouslyLearningModel {
  private glm: GLMClient;
  private modelPath: string;
  private observations: RouteObservation[] = [];
  private model: ApplicationModel;

  constructor(glm: GLMClient, modelPath = './ai-loop/learned-model') {
    this.glm = glm;
    this.modelPath = modelPath;
    this.model = this.initializeModel();
    this.loadModel();
  }

  /**
   * Initialize empty model
   */
  private initializeModel(): ApplicationModel {
    return {
      routeSignatures: new Map(),
      elementBehaviors: new Map(),
      commonPatterns: [],
      antiPatterns: [],
      selectorReliability: new Map(),
      testSuccessRates: new Map(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Observe and learn from route exploration
   */
  async observeRoute(
    route: string,
    routeName: string,
    elements: Array<{
      selector: string;
      type: string;
      text: string;
      behavior: string;
      interactionSuccess: boolean;
      attributes?: Record<string, string>;
    }>,
    patterns: string[] = []
  ): Promise<void> {
    console.log(`  🧠 Learning from ${routeName} (${route})...`);

    const observation: RouteObservation = {
      route,
      routeName,
      elements: elements.map(e => ({
        selector: e.selector,
        type: e.type,
        text: e.text,
        attributes: e.attributes || {},
        behavior: e.behavior,
        interactionSuccess: e.interactionSuccess,
        timestamp: new Date(),
      })),
      patterns,
      antiPatterns: [],
      accessRequirements: [],
      loadTime: 0,
      timestamp: new Date(),
    };

    this.observations.push(observation);

    // Update model with AI analysis
    await this.updateModelFromObservation(observation);

    // Save updated model
    this.saveModel();

    console.log(`    ✅ Model updated with ${elements.length} element observations`);
  }

  /**
   * Update model from observation using AI
   */
  private async updateModelFromObservation(observation: RouteObservation): Promise<void> {
    try {
      const analysis = await this.glm.generateApplicationModel({
        route: observation.route,
        routeName: observation.routeName,
        elements: observation.elements.map(e => ({
          selector: e.selector,
          type: e.type,
          text: e.text,
          behavior: e.behavior,
          dependencies: [], // No dependency info available in ElementObservation
        })),
        patterns: observation.elements.map(e => ({
          pattern: e.selector,
          frequency: 1,
          reliability: e.interactionSuccess ? 1 : 0,
        })),
      });

      // Update route signatures
      if (!this.model.routeSignatures.has(observation.route)) {
        this.model.routeSignatures.set(observation.route, []);
      }
      const signatures = this.model.routeSignatures.get(observation.route)!;
      signatures.push(...observation.elements.map(e => e.text).slice(0, 5));

      // Update element behaviors
      for (const element of observation.elements) {
        this.model.elementBehaviors.set(element.selector, element.behavior);

        // Update selector reliability
        const currentReliability = this.model.selectorReliability.get(element.selector) || 0.5;
        const newReliability = element.interactionSuccess
          ? Math.min(1, currentReliability + 0.1)
          : Math.max(0, currentReliability - 0.2);
        this.model.selectorReliability.set(element.selector, newReliability);
      }

      // Add common patterns from AI
      for (const pattern of analysis.model.commonPatterns) {
        if (!this.model.commonPatterns.includes(pattern)) {
          this.model.commonPatterns.push(pattern);
        }
      }

      // Add anti-patterns from AI
      for (const antiPattern of analysis.model.antiPatterns) {
        if (!this.model.antiPatterns.includes(antiPattern)) {
          this.model.antiPatterns.push(antiPattern);
        }
      }

      this.model.lastUpdated = new Date();

    } catch (error) {
      console.log(`    ⚠️  AI model update failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get reliable selector for an element
   */
  getReliableSelector(elementText: string, elementType: string): string | null {
    const candidates: Array<{ selector: string; reliability: number }> = [];

    // Find matching elements from observations
    for (const obs of this.observations) {
      for (const element of obs.elements) {
        if (
          element.text.toLowerCase().includes(elementText.toLowerCase()) &&
          element.type === elementType
        ) {
          const reliability = this.model.selectorReliability.get(element.selector) || 0.5;
          candidates.push({ selector: element.selector, reliability });
        }
      }
    }

    // Sort by reliability and return best
    candidates.sort((a, b) => b.reliability - a.reliability);

    return candidates.length > 0 && candidates[0].reliability > 0.6
      ? candidates[0].selector
      : null;
  }

  /**
   * Get route signature for validation
   */
  getRouteSignature(route: string): string[] | null {
    return this.model.routeSignatures.get(route) || null;
  }

  /**
   * Check if selector matches known anti-pattern
   */
  isAntiPattern(selector: string): boolean {
    return this.model.antiPatterns.some(pattern =>
      selector.includes(pattern) || pattern.includes(selector)
    );
  }

  /**
   * Get recommended test patterns for this application
   */
  getRecommendedPatterns(): {
    use: string[];
    avoid: string[];
  } {
    return {
      use: this.model.commonPatterns,
      avoid: this.model.antiPatterns,
    };
  }

  /**
   * Record test execution result
   */
  recordTestResult(testName: string, passed: boolean): void {
    const currentRate = this.model.testSuccessRates.get(testName) || 0.5;

    // Exponential moving average
    const newRate = passed
      ? currentRate + (1 - currentRate) * 0.2
      : currentRate * 0.8;

    this.model.testSuccessRates.set(testName, newRate);
    this.saveModel();
  }

  /**
   * Get test stability score
   */
  getTestStability(testName: string): number {
    return this.model.testSuccessRates.get(testName) || 0.5;
  }

  /**
   * Get flaky tests (low stability)
   */
  getFlakyTests(threshold = 0.7): string[] {
    const flaky: string[] = [];

    for (const [testName, successRate] of this.model.testSuccessRates) {
      if (successRate < threshold) {
        flaky.push(testName);
      }
    }

    return flaky.sort((a, b) => {
      const rateA = this.model.testSuccessRates.get(a) || 0;
      const rateB = this.model.testSuccessRates.get(b) || 0;
      return rateA - rateB;
    });
  }

  /**
   * Generate insights from learned model
   */
  generateInsights(): {
    totalObservations: number;
    routesLearned: number;
    totalElements: number;
    averageSelectorReliability: number;
    topPatterns: string[];
    topAntiPatterns: string[];
    flakyTests: string[];
  } {
    const selectorReliabilities = Array.from(this.model.selectorReliability.values());
    const avgReliability = selectorReliabilities.length > 0
      ? selectorReliabilities.reduce((a, b) => a + b, 0) / selectorReliabilities.length
      : 0;

    return {
      totalObservations: this.observations.length,
      routesLearned: this.model.routeSignatures.size,
      totalElements: this.model.elementBehaviors.size,
      averageSelectorReliability: Math.round(avgReliability * 100) / 100,
      topPatterns: this.model.commonPatterns.slice(0, 10),
      topAntiPatterns: this.model.antiPatterns.slice(0, 10),
      flakyTests: this.getFlakyTests(),
    };
  }

  /**
   * Save model to disk
   */
  private saveModel(): void {
    try {
      const serializableModel = {
        routeSignatures: Object.fromEntries(this.model.routeSignatures),
        elementBehaviors: Object.fromEntries(this.model.elementBehaviors),
        commonPatterns: this.model.commonPatterns,
        antiPatterns: this.model.antiPatterns,
        selectorReliability: Object.fromEntries(this.model.selectorReliability),
        testSuccessRates: Object.fromEntries(this.model.testSuccessRates),
        lastUpdated: this.model.lastUpdated,
      };

      fs.mkdirSync(path.dirname(this.modelPath), { recursive: true });
      fs.writeFileSync(
        this.modelPath,
        JSON.stringify(serializableModel, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.log(`  ⚠️  Failed to save model: ${(error as Error).message}`);
    }
  }

  /**
   * Load model from disk
   */
  private loadModel(): void {
    try {
      if (fs.existsSync(this.modelPath)) {
        const content = fs.readFileSync(this.modelPath, 'utf-8');
        const loaded = JSON.parse(content);

        this.model = {
          routeSignatures: new Map(Object.entries(loaded.routeSignatures || {})),
          elementBehaviors: new Map(Object.entries(loaded.elementBehaviors || {})),
          commonPatterns: loaded.commonPatterns || [],
          antiPatterns: loaded.antiPatterns || [],
          selectorReliability: new Map(Object.entries(loaded.selectorReliability || {})),
          testSuccessRates: new Map(Object.entries(loaded.testSuccessRates || {})),
          lastUpdated: new Date(loaded.lastUpdated || Date.now()),
        };

        console.log(`  📦 Loaded learning model from ${new Date(this.model.lastUpdated).toLocaleString()}`);
      }
    } catch (error) {
      console.log(`  ⚠️  Failed to load model: ${(error as Error).message}`);
    }
  }

  /**
   * Clear model and start fresh
   */
  resetModel(): void {
    this.model = this.initializeModel();
    this.observations = [];
    this.saveModel();
    console.log(`  🔄 Model reset`);
  }

  /**
   * Export model as JSON
   */
  exportModel(): string {
    return JSON.stringify({
      ...this.model,
      routeSignatures: Object.fromEntries(this.model.routeSignatures),
      elementBehaviors: Object.fromEntries(this.model.elementBehaviors),
      selectorReliability: Object.fromEntries(this.model.selectorReliability),
      testSuccessRates: Object.fromEntries(this.model.testSuccessRates),
    }, null, 2);
  }
}

export default ContinuouslyLearningModel;
