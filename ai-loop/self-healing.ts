/**
 * Self-Healing Test System
 *
 * Automatically fixes broken selectors when UI changes
 * Uses AI to find alternative selectors and recover from failures
 */

import { Page, Locator } from '@playwright/test';
import { GLMClient } from './glm-client';

interface SelectorHealingResult {
  success: boolean;
  originalSelector: string;
  healedSelector?: string;
  healingMethod: string;
  confidence: number;
  alternatives: string[];
}

interface ElementSignature {
  text: string;
  type: string;
  attributes: Record<string, string>;
  position: { x: number; y: number };
  nearbyElements: string[];
}

/**
 * Self-healing selector system
 */
export class SelfHealingSelectors {
  private page: Page;
  private glm: GLMClient;
  private healingCache = new Map<string, SelectorHealingResult>();
  private elementSignatures = new Map<string, ElementSignature>();

  constructor(page: Page, glm: GLMClient) {
    this.page = page;
    this.glm = glm;
  }

  /**
   * Attempt to interact with an element with self-healing
   */
  async clickWithHealing(
    selector: string,
    context?: string
  ): Promise<{ success: boolean; healedSelector?: string; error?: string }> {
    // First try original selector
    try {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        await element.click({ timeout: 5000 });
        return { success: true, healedSelector: selector };
      }
    } catch (error) {
      // Original selector failed, try healing
    }

    // Attempt self-healing
    const healResult = await this.healSelector(selector, context);

    if (healResult.success && healResult.healedSelector) {
      try {
        const element = this.page.locator(healResult.healedSelector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          await element.click({ timeout: 5000 });
          return { success: true, healedSelector: healResult.healedSelector };
        }
      } catch {}
    }

    return {
      success: false,
      error: `Could not find or click element: ${selector}`,
    };
  }

  /**
   * Fill an input with self-healing
   */
  async fillWithHealing(
    selector: string,
    value: string,
    context?: string
  ): Promise<{ success: boolean; healedSelector?: string; error?: string }> {
    // Try original selector
    try {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        await element.fill(value);
        return { success: true, healedSelector: selector };
      }
    } catch {}

    // Attempt healing
    const healResult = await this.healSelector(selector, context);

    if (healResult.success && healResult.healedSelector) {
      try {
        const element = this.page.locator(healResult.healedSelector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          await element.fill(value);
          return { success: true, healedSelector: healResult.healedSelector };
        }
      } catch {}
    }

    return {
      success: false,
      error: `Could not find or fill element: ${selector}`,
    };
  }

  /**
   * Heal a broken selector using multiple strategies
   */
  private async healSelector(
    brokenSelector: string,
    context?: string
  ): Promise<SelectorHealingResult> {
    // Check cache first
    const cached = this.healingCache.get(brokenSelector);
    if (cached) {
      return cached;
    }

    const result: SelectorHealingResult = {
      success: false,
      originalSelector: brokenSelector,
      healingMethod: 'none',
      confidence: 0,
      alternatives: [],
    };

    // Strategy 1: Text-based healing (find by text content)
    const textResult = await this.healByTextContent(brokenSelector, context);
    if (textResult.success) {
      Object.assign(result, textResult);
      this.healingCache.set(brokenSelector, result);
      return result;
    }

    // Strategy 2: Attribute-based healing
    const attrResult = await this.healByAttributes(brokenSelector, context);
    if (attrResult.success) {
      Object.assign(result, attrResult);
      this.healingCache.set(brokenSelector, result);
      return result;
    }

    // Strategy 3: Position-based healing
    const posResult = await this.healByPosition(brokenSelector, context);
    if (posResult.success) {
      Object.assign(result, posResult);
      this.healingCache.set(brokenSelector, result);
      return result;
    }

    // Strategy 4: AI-powered healing
    const aiResult = await this.healWithAI(brokenSelector, context);
    if (aiResult.success) {
      Object.assign(result, aiResult);
      this.healingCache.set(brokenSelector, result);
      return result;
    }

    this.healingCache.set(brokenSelector, result);
    return result;
  }

  /**
   * Strategy 1: Heal by text content
   */
  private async healByTextContent(
    selector: string,
    context?: string
  ): Promise<Partial<SelectorHealingResult>> {
    try {
      // Extract text or class from original selector
      const textMatch = selector.match(/text=['"]([^'"]+)['"i]/);
      const classMatch = selector.match(/\.([a-zA-Z][\w-]+)/);
      const idMatch = selector.match(/#([a-zA-Z][\w-]+)/);

      // Try text-based selector
      if (textMatch) {
        const text = textMatch[1];
        const textSelector = `:has-text("${text}")`;
        const element = this.page.locator(textSelector).first();
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          return {
            success: true,
            healedSelector: textSelector,
            healingMethod: 'text-content',
            confidence: 0.8,
            alternatives: [textSelector],
          };
        }
      }

      // Try class-based
      if (classMatch) {
        const className = classMatch[1];
        const classSelector = `.${className}`;
        const element = this.page.locator(classSelector).first();
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          return {
            success: true,
            healedSelector: classSelector,
            healingMethod: 'class-name',
            confidence: 0.7,
            alternatives: [classSelector],
          };
        }
      }

      // Try ID-based
      if (idMatch) {
        const id = idMatch[1];
        const idSelector = `#${id}`;
        const element = this.page.locator(idSelector).first();
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          return {
            success: true,
            healedSelector: idSelector,
            healingMethod: 'id',
            confidence: 0.9,
            alternatives: [idSelector],
          };
        }
      }

      // Try aria-label
      const ariaLabel = selector.match(/aria-label=['"]([^'"]+)['"i]/);
      if (ariaLabel) {
        const label = ariaLabel[1];
        const ariaSelector = `[aria-label="${label}"]`;
        const element = this.page.locator(ariaSelector).first();
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          return {
            success: true,
            healedSelector: ariaSelector,
            healingMethod: 'aria-label',
            confidence: 0.85,
            alternatives: [ariaSelector],
          };
        }
      }
    } catch {}

    return { success: false, healingMethod: 'text-content', confidence: 0 };
  }

  /**
   * Strategy 2: Heal by attributes
   */
  private async healByAttributes(
    selector: string,
    context?: string
  ): Promise<Partial<SelectorHealingResult>> {
    try {
      // Get all similar elements on page
      const elements = await this.page.evaluate((sel) => {
        // @ts-ignore - browser context
        const all = document.querySelectorAll('button, input, a, [role="button"]');
        return Array.from(all).map((el: any) => ({
          tag: el.tagName,
          type: el.type || '',
          name: el.name || '',
          className: el.className || '',
          id: el.id || '',
          textContent: el.textContent?.slice(0, 50) || '',
          dataTestId: el.getAttribute('data-testid') || '',
          role: el.getAttribute('role') || '',
        }));
      });

      // Extract key info from broken selector
      const buttonMatch = selector.match(/button/i);
      const inputMatch = selector.match(/input/i);

      // Find matching elements
      for (const el of elements) {
        if (buttonMatch && el.tag === 'BUTTON') {
          const healed = `button${el.dataTestId ? `[data-testid="${el.dataTestId}"]` : ''}`;
          const locator = this.page.locator(healed).first();
          if (await locator.isVisible({ timeout: 500 }).catch(() => false)) {
            return {
              success: true,
              healedSelector: healed,
              healingMethod: 'attribute-matching',
              confidence: 0.7,
              alternatives: [healed],
            };
          }
        }

        if (inputMatch && el.tag === 'INPUT') {
          const healed = `input${el.name ? `[name="${el.name}"]` : ''}${el.type ? `[type="${el.type}"]` : ''}`;
          const locator = this.page.locator(healed).first();
          if (await locator.isVisible({ timeout: 500 }).catch(() => false)) {
            return {
              success: true,
              healedSelector: healed,
              healingMethod: 'attribute-matching',
              confidence: 0.75,
              alternatives: [healed],
            };
          }
        }
      }
    } catch {}

    return { success: false, healingMethod: 'attributes', confidence: 0 };
  }

  /**
   * Strategy 3: Heal by position
   */
  private async healByPosition(
    selector: string,
    context?: string
  ): Promise<Partial<SelectorHealingResult>> {
    try {
      // If selector has :nth-child(), try nearby indices
      const nthMatch = selector.match(/:nth-child\((\d+)\)/);
      if (nthMatch) {
        const index = parseInt(nthMatch[1]);
        const alternatives: string[] = [];

        // Try nearby indices
        for (const offset of [-2, -1, 1, 2]) {
          const newIndex = index + offset;
          if (newIndex > 0) {
            const newSelector = selector.replace(/:nth-child\(\d+\)/, `:nth-child(${newIndex})`);
            const element = this.page.locator(newSelector).first();
            if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
              alternatives.push(newSelector);
            }
          }
        }

        if (alternatives.length > 0) {
          return {
            success: true,
            healedSelector: alternatives[0],
            healingMethod: 'position-adjustment',
            confidence: 0.6,
            alternatives,
          };
        }
      }

      // Try first/last modifiers
      for (const modifier of ['first', 'last']) {
        const newSelector = selector.replace(/\.(first|last)\(\)/, `.${modifier}()`);
        const element = this.page.locator(newSelector).first();
        if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
          return {
            success: true,
            healedSelector: newSelector,
            healingMethod: 'position-modifier',
            confidence: 0.65,
            alternatives: [newSelector],
          };
        }
      }
    } catch {}

    return { success: false, healingMethod: 'position', confidence: 0 };
  }

  /**
   * Strategy 4: AI-powered healing
   */
  private async healWithAI(
    selector: string,
    context?: string
  ): Promise<Partial<SelectorHealingResult>> {
    try {
      // Gather page context
      const pageElements = await this.page.evaluate(() => {
        // @ts-ignore - browser context
        const interactive = document.querySelectorAll('button, input, a, select, [role="button"], [tabindex]');
        return Array.from(interactive).slice(0, 20).map((el: any) => ({
          tag: el.tagName,
          text: el.textContent?.slice(0, 30) || '',
          id: el.id || '',
          className: el.className?.slice(0, 50) || '',
          role: el.getAttribute('role') || '',
          dataTest: el.getAttribute('data-testid') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
        }));
      });

      const analysis = await this.glm.healSelectorWithAI({
        brokenSelector: selector,
        context: context || 'general page interaction',
        availableElements: pageElements,
        currentPage: new URL(this.page.url()).pathname,
      });

      if (analysis.suggestedSelector) {
        // Test the AI-suggested selector
        const element = this.page.locator(analysis.suggestedSelector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          return {
            success: true,
            healedSelector: analysis.suggestedSelector,
            healingMethod: 'ai-powered',
            confidence: analysis.confidence,
            alternatives: analysis.alternatives || [],
          };
        }

        // Try alternatives
        for (const alt of analysis.alternatives || []) {
          const altElement = this.page.locator(alt).first();
          if (await altElement.isVisible({ timeout: 1000 }).catch(() => false)) {
            return {
              success: true,
              healedSelector: alt,
              healingMethod: 'ai-powered-alternative',
              confidence: analysis.confidence * 0.9,
              alternatives: analysis.alternatives || [],
            };
          }
        }
      }
    } catch (error) {
      console.log('    ⚠️  AI healing failed:', (error as Error).message);
    }

    return { success: false, healingMethod: 'ai-powered', confidence: 0 };
  }

  /**
   * Get healing statistics
   */
  getHealingStats() {
    const healed = Array.from(this.healingCache.values()).filter(h => h.success);
    return {
      totalAttempts: this.healingCache.size,
      successfulHealings: healed.length,
      healingRate: this.healingCache.size > 0
        ? Math.round((healed.length / this.healingCache.size) * 100)
        : 0,
      byMethod: healed.reduce((acc, h) => {
        acc[h.healingMethod] = (acc[h.healingMethod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Clear healing cache
   */
  clearCache() {
    this.healingCache.clear();
  }
}

export default SelfHealingSelectors;
