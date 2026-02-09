/**
 * Tool registry
 * Exports all available MCP tools
 */

import { codeAnalysisTools } from './code-analysis.js';
import { codeGenerationTools } from './code-generation.js';
import { projectTools } from './project.js';
import { erpDomainTools } from './erp-domain.js';
import { mlPredictionTools } from './ml-predictions.js';
import { patternExtractionTools } from './pattern-extraction.js';
import { testGenerationTools } from './test-generation.js';
import { contextCompressionTools } from './context-compression.js';
import { telemetryTools } from './telemetry.js';
import { multiAgentTools } from './multi-agent.js';

/**
 * All available tools
 * Tools are organized by category for better maintainability
 */
export const allTools = [
  // Context compression (highest priority - reduces all downstream token usage)
  ...contextCompressionTools,

  // Multi-agent orchestration (parallel execution)
  ...multiAgentTools,

  // Pattern extraction & semantic search
  ...patternExtractionTools,

  // Automated test generation
  ...testGenerationTools,

  // Performance telemetry
  ...telemetryTools,

  // Code analysis tools
  ...codeAnalysisTools,

  // Code generation tools
  ...codeGenerationTools,

  // Project management tools
  ...projectTools,

  // ERP domain-specific tools (Accounting, HR, Sales, Purchasing, Manufacturing, Projects, Inventory, E-commerce)
  ...erpDomainTools,

  // ML prediction tools
  ...mlPredictionTools,
];

/**
 * Get tool by name
 */
export function getTool(name: string) {
  return allTools.find(tool => tool.name === name);
}

/**
 * Get tools by category/prefix
 */
export function getToolsByCategory(category: string) {
  const prefix = `${category}_`;
  return allTools.filter(tool => tool.name.startsWith(prefix));
}

/**
 * List all tool categories
 */
export function listCategories(): string[] {
  const categories = new Set<string>();

  for (const tool of allTools) {
    const parts = tool.name.split('_');
    if (parts.length > 1) {
      categories.add(parts[0]);
    }
  }

  return Array.from(categories).sort();
}
