/**
 * Visual AI Regression Testing System
 *
 * Detects visual differences using AI analysis
 * Compares page states and identifies UI regressions
 */

import { Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { GLMClient } from './glm-client';

interface VisualSnapshot {
  route: string;
  timestamp: string;
  elements: Array<{
    selector: string;
    text: string;
    visible: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
  }>;
  layout: {
    viewport: { width: number; height: number };
    scrollPosition: { x: number; y: number };
  };
  description: string;
  screenshotHash?: string;
}

interface VisualRegressionResult {
  hasRegression: boolean;
  confidence: number;
  differences: Array<{
    type: 'layout' | 'content' | 'style' | 'missing' | 'unexpected';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    baselineElement: string;
    currentElement: string;
    screenshotDiff?: string;
  }>;
  baseline: VisualSnapshot;
  current: VisualSnapshot;
}

export class VisualAIRegression {
  private glm: GLMClient;
  private snapshotsPath: string;
  private snapshots = new Map<string, VisualSnapshot>();

  constructor(glm: GLMClient, snapshotsPath = './ai-loop/visual-snapshots') {
    this.glm = glm;
    this.snapshotsPath = snapshotsPath;
    this.ensureSnapshotsDir();
    this.loadSnapshots();
  }

  /**
   * Capture visual snapshot of current page
   */
  async captureSnapshot(page: Page, route: string): Promise<VisualSnapshot> {
    console.log(`  📸 Capturing visual snapshot for ${route}...`);

    // Get viewport info
    const viewportSize = page.viewportSize() || { width: 1280, height: 720 };

    // Get scroll position
    const scrollPosition = await page.evaluate(() => ({
      x: window.scrollX,
      y: window.scrollY,
    }));

    // Extract visible elements
    const elements = await page.evaluate(() => {
      // @ts-ignore - browser context
      const visible: any[] = [];
      // @ts-ignore
      const allElements = document.querySelectorAll('*');

      // @ts-ignore
      for (const el of allElements) {
        // @ts-ignore
        const rect = el.getBoundingClientRect();
        // @ts-ignore
        const style = window.getComputedStyle(el);

        // Only capture visible, significant elements
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          (el.tagName === 'BUTTON' ||
            el.tagName === 'A' ||
            el.tagName === 'INPUT' ||
            el.tagName === 'SELECT' ||
            el.tagName === 'H1' ||
            el.tagName === 'H2' ||
            el.tagName === 'H3' ||
            el.hasAttribute('role') ||
            el.hasAttribute('data-testid'))
        ) {
          visible.push({
            selector:
              el.tagName +
              (el.id ? `#${el.id}` : '') +
              (el.className ? `.${el.className.split(' ')[0]}` : ''),
            text: el.textContent?.slice(0, 50) || '',
            visible: true,
            position: { x: rect.x, y: rect.y },
            size: { width: rect.width, height: rect.height },
          });
        }

        if (visible.length > 100) break; // Limit elements
      }

      return visible;
    });

    // Generate text description
    const description = await this.generatePageDescription(page, route);

    // Create snapshot
    const snapshot: VisualSnapshot = {
      route,
      timestamp: new Date().toISOString(),
      elements,
      layout: {
        viewport: viewportSize,
        scrollPosition,
      },
      description,
    };

    // Save snapshot
    this.snapshots.set(route, snapshot);
    this.saveSnapshot(route, snapshot);

    console.log(`    ✅ Captured ${elements.length} elements`);

    return snapshot;
  }

  /**
   * Compare current state with baseline
   */
  async compareWithBaseline(page: Page, route: string): Promise<VisualRegressionResult> {
    const baseline = this.snapshots.get(route);

    if (!baseline) {
      console.log(`    ⚠️  No baseline found for ${route}, creating new baseline`);
      await this.captureSnapshot(page, route);
      return {
        hasRegression: false,
        confidence: 1,
        differences: [],
        baseline: await this.captureSnapshot(page, route),
        current: await this.captureSnapshot(page, route),
      };
    }

    console.log(`    🔍 Comparing with baseline...`);

    // Capture current state
    const current = await this.captureSnapshot(page, route);

    // Use AI to analyze differences
    const analysis = await this.glm.compareVisuals({
      baselineDescription: baseline.description,
      currentDescription: current.description,
      pageRoute: route,
    });

    console.log(`    📊 Analysis confidence: ${Math.round(analysis.confidence * 100)}%`);

    if (analysis.hasRegression) {
      console.log(`    ⚠️  Found ${analysis.differences.length} visual regressions`);
    }

    return {
      hasRegression: analysis.hasRegression,
      confidence: analysis.confidence,
      differences: analysis.differences,
      baseline,
      current,
    };
  }

  /**
   * Generate text description of page for AI analysis
   */
  private async generatePageDescription(page: Page, route: string): Promise<string> {
    try {
      const description = await page.evaluate(() => {
        // @ts-ignore - browser context
        const body = document.body;

        // Get key layout info
        // @ts-ignore
        const header = document.querySelector('header')?.textContent?.slice(0, 50) || '';
        // @ts-ignore
        const mainHeading = document.querySelector('h1')?.textContent?.slice(0, 50) || '';

        // Count visible elements by type
        // @ts-ignore
        const buttons = document.querySelectorAll('button').length;
        // @ts-ignore
        const inputs = document.querySelectorAll('input').length;
        // @ts-ignore
        const links = document.querySelectorAll('a').length;
        // @ts-ignore
        const tables = document.querySelectorAll('table').length;
        // @ts-ignore
        const forms = document.querySelectorAll('form').length;

        return (
          `Page has ${buttons} buttons, ${inputs} inputs, ${links} links, ${tables} tables, ${forms} forms. ` +
          `Header: "${header}". Main heading: "${mainHeading}".`
        );
      });

      return description;
    } catch (error) {
      return `Failed to generate description: ${(error as Error).message}`;
    }
  }

  /**
   * Save snapshot to disk
   */
  private saveSnapshot(route: string, snapshot: VisualSnapshot): void {
    const sanitizedRoute = route.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(this.snapshotsPath, `${sanitizedRoute}.json`);

    try {
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch (error) {
      console.log(`    ⚠️  Failed to save snapshot: ${(error as Error).message}`);
    }
  }

  /**
   * Load all snapshots from disk
   */
  private loadSnapshots(): void {
    try {
      if (!fs.existsSync(this.snapshotsPath)) {
        return;
      }

      const files = fs.readdirSync(this.snapshotsPath);
      const snapshotFiles = files.filter(f => f.endsWith('.json'));

      for (const file of snapshotFiles) {
        try {
          const filePath = path.join(this.snapshotsPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const snapshot: VisualSnapshot = JSON.parse(content);
          this.snapshots.set(snapshot.route, snapshot);
        } catch {}
      }

      console.log(`  📁 Loaded ${this.snapshots.size} visual snapshots`);
    } catch (error) {
      console.log(`  ⚠️  Failed to load snapshots: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all snapshots (for fresh baseline)
   */
  clearSnapshots(): void {
    this.snapshots.clear();
    try {
      if (fs.existsSync(this.snapshotsPath)) {
        const files = fs.readdirSync(this.snapshotsPath);
        for (const file of files) {
          fs.unlinkSync(path.join(this.snapshotsPath, file));
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Failed to clear snapshots: ${(error as Error).message}`);
    }
  }

  /**
   * Ensure snapshots directory exists
   */
  private ensureSnapshotsDir(): void {
    if (!fs.existsSync(this.snapshotsPath)) {
      fs.mkdirSync(this.snapshotsPath, { recursive: true });
    }
  }

  /**
   * Get snapshot statistics
   */
  getStats() {
    return {
      totalSnapshots: this.snapshots.size,
      routes: Array.from(this.snapshots.keys()),
      averageElementsPerSnapshot:
        Array.from(this.snapshots.values()).reduce((sum, s) => sum + s.elements.length, 0) /
        Math.max(this.snapshots.size, 1),
    };
  }
}

export default VisualAIRegression;
