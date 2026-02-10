/**
 * Context Compression System
 *
 * Reduces token waste by compressing repetitive patterns into references.
 * Caches commonly used code snippets and references them by ID.
 *
 * Features:
 * - Automatic pattern detection
 * - Reference-based compression
 * - Cache management
 * - Token savings tracking
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ToolMetadata, ToolContext, ToolArgs } from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

interface CompressionRule {
  id: string;
  name: string;
  pattern: RegExp;
  category: 'import' | 'boilerplate' | 'type-def' | 'test-setup' | 'config';
  reference: string;
  compressed: string;
  tokenSavings: number;
  usageCount: number;
}

interface CompressionStats {
  totalCompressions: number;
  totalTokenSavings: number;
  compressionRatio: number;
  topRules: Array<{ id: string; name: string; usageCount: number }>;
}

interface CompressedContent {
  original: string;
  compressed: string;
  references: string[];
  tokenSavings: number;
  compressionRatio: number;
}

// ============================================================================
// COMPRESSION RULES
// ============================================================================

const DEFAULT_RULES: CompressionRule[] = [
  {
    id: 'react-imports',
    name: 'React Standard Imports',
    pattern:
      /import React(?:[, ]{[^}]*})? from ['"]react['"];?\s*import { useState, useEffect } from ['"]react['"];?/g,
    category: 'import',
    reference: '@imports:react-standard',
    compressed: '// @imports:react-standard',
    tokenSavings: 30,
    usageCount: 0,
  },
  {
    id: 'vitest-setup',
    name: 'Vitest Test Setup',
    pattern:
      /import { describe, it, expect, beforeEach, afterEach, vi } from ['"]vitest['"];?\s*import { render, screen, waitFor } from ['"]@testing-library\/react['"];?/g,
    category: 'test-setup',
    reference: '@test-setup:vitest-standard',
    compressed: '// @test-setup:vitest-standard',
    tokenSavings: 45,
    usageCount: 0,
  },
  {
    id: 'express-route',
    name: 'Express Route Boilerplate',
    pattern:
      /router\.(get|post|put|delete|patch)\(['"`][^'"`]+['"`], async \(req, res, next\) => \{\s*try \{[\s\S]{100,500}?\} catch \(error\) \{\s*next\(error\);\s*\}\s*\}\);/g,
    category: 'boilerplate',
    reference: '@boilerplate:express-route',
    compressed: '// @boilerplate:express-route',
    tokenSavings: 80,
    usageCount: 0,
  },
  {
    id: 'service-transaction',
    name: 'Service Transaction Pattern',
    pattern: /return await db\.transaction\(async \(trx\) => \{[\s\S]{50,300}?\}\);/g,
    category: 'boilerplate',
    reference: '@boilerplate:service-transaction',
    compressed: '// @boilerplate:service-transaction',
    tokenSavings: 60,
    usageCount: 0,
  },
  {
    id: 'zod-validation',
    name: 'Zod Validation Schema',
    pattern:
      /import { z } from ['"]zod['"];\s*const \w+Schema = z\.object\(\{[\s\S]{50,400}?\}\);/g,
    category: 'boilerplate',
    reference: '@boilerplate:zod-schema',
    compressed: '// @boilerplate:zod-schema',
    tokenSavings: 70,
    usageCount: 0,
  },
  {
    id: 'api-client',
    name: 'API Client Setup',
    pattern:
      /const api = axios\.create\(\{\s*baseURL: ['"][^'"]+['"],\s*timeout: \d+,\s*headers:\s*\{[^}]*\}\s*\}\);/g,
    category: 'config',
    reference: '@config:api-client',
    compressed: '// @config:api-client',
    tokenSavings: 40,
    usageCount: 0,
  },
];

// ============================================================================
// STORAGE
// ============================================================================

const getCacheDir = (workspaceRoot: string) =>
  path.join(workspaceRoot, '.erp-cache', 'compression');
const getRulesPath = (workspaceRoot: string) => path.join(getCacheDir(workspaceRoot), 'rules.json');
const getStatsPath = (workspaceRoot: string) => path.join(getCacheDir(workspaceRoot), 'stats.json');

/**
 * Load compression rules
 */
async function loadRules(workspaceRoot: string): Promise<CompressionRule[]> {
  try {
    const rulesPath = getRulesPath(workspaceRoot);
    const content = await fs.readFile(rulesPath, 'utf-8');
    const rules = JSON.parse(content) as CompressionRule[];

    // Rehydrate RegExp patterns
    return rules.map(rule => ({
      ...rule,
      pattern: new RegExp(rule.pattern.source, rule.pattern.flags),
    }));
  } catch {
    // Initialize with default rules
    await ensureCacheDir(workspaceRoot);
    await saveRules(DEFAULT_RULES, workspaceRoot);
    return DEFAULT_RULES;
  }
}

/**
 * Save compression rules
 */
async function saveRules(rules: CompressionRule[], workspaceRoot: string): Promise<void> {
  const rulesPath = getRulesPath(workspaceRoot);

  // Stringify RegExp for storage
  const serialized = rules.map(rule => ({
    ...rule,
    pattern: {
      source: rule.pattern.source,
      flags: rule.pattern.flags,
    },
  }));

  await fs.writeFile(rulesPath, JSON.stringify(serialized, null, 2), 'utf-8');
}

/**
 * Load stats
 */
async function loadStats(workspaceRoot: string): Promise<CompressionStats> {
  try {
    const statsPath = getStatsPath(workspaceRoot);
    const content = await fs.readFile(statsPath, 'utf-8');
    return JSON.parse(content) as CompressionStats;
  } catch {
    return {
      totalCompressions: 0,
      totalTokenSavings: 0,
      compressionRatio: 0,
      topRules: [],
    };
  }
}

/**
 * Save stats
 */
async function saveStats(stats: CompressionStats, workspaceRoot: string): Promise<void> {
  const statsPath = getStatsPath(workspaceRoot);
  await fs.writeFile(statsPath, JSON.stringify(stats, null, 2), 'utf-8');
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(workspaceRoot: string): Promise<void> {
  await fs.mkdir(getCacheDir(workspaceRoot), { recursive: true });
}

// ============================================================================
// COMPRESSION ENGINE
// ============================================================================

/**
 * Compress content by applying rules
 */
async function compressContent(content: string, workspaceRoot: string): Promise<CompressedContent> {
  const rules = await loadRules(workspaceRoot);
  let compressed = content;
  const references: string[] = [];
  let totalSavings = 0;

  for (const rule of rules) {
    const matches = compressed.match(rule.pattern);
    if (matches) {
      for (const match of matches) {
        compressed = compressed.replace(match, rule.compressed);
        references.push(rule.reference);
        totalSavings += rule.tokenSavings;

        // Update rule usage
        rule.usageCount++;
      }
    }
  }

  // Save updated rules
  await saveRules(rules, workspaceRoot);

  // Update stats
  const stats = await loadStats(workspaceRoot);
  stats.totalCompressions++;
  stats.totalTokenSavings += totalSavings;
  stats.compressionRatio = totalSavings / content.length;
  stats.topRules = rules
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5)
    .map(r => ({ id: r.id, name: r.name, usageCount: r.usageCount }));
  await saveStats(stats, workspaceRoot);

  return {
    original: content,
    compressed,
    references,
    tokenSavings: totalSavings,
    compressionRatio: totalSavings / content.length,
  };
}

/**
 * Decompress content by expanding references
 */
async function decompressContent(content: string, workspaceRoot: string): Promise<string> {
  const rules = await loadRules(workspaceRoot);
  let decompressed = content;

  for (const rule of rules) {
    const referenceRegex = new RegExp(
      `// ${rule.reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
      'g'
    );
    decompressed = decompressed.replace(referenceRegex, rule.reference);
  }

  return decompressed;
}

/**
 * Add custom compression rule
 */
async function addRule(
  name: string,
  pattern: string,
  category: CompressionRule['category'],
  reference: string,
  workspaceRoot: string
): Promise<CompressionRule> {
  const rules = await loadRules(workspaceRoot);

  const newRule: CompressionRule = {
    id: crypto.randomUUID(),
    name,
    pattern: new RegExp(pattern, 'g'),
    category,
    reference,
    compressed: `// ${reference}`,
    tokenSavings: Math.floor(pattern.length / 3), // Rough estimate
    usageCount: 0,
  };

  rules.push(newRule);
  await saveRules(rules, workspaceRoot);

  return newRule;
}

// ============================================================================
// MCP TOOLS
// ============================================================================

export const contextCompressionTools: ToolMetadata[] = [
  /**
   * Compress content
   */
  {
    name: 'context_compress',
    description: 'Compress code content by replacing repetitive patterns with references',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content to compress',
        },
      },
      required: ['content'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const content = args.content as string;

      const result = await compressContent(content, context.workspaceRoot);

      return {
        success: true,
        compressed: result.compressed,
        original: result.original,
        tokenSavings: result.tokenSavings,
        compressionRatio: result.compressionRatio,
        references: result.references,
        message: `Compressed content, saved ~${result.tokenSavings} tokens (${Math.round(result.compressionRatio * 100)}% reduction)`,
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 300000,
    },
  },

  /**
   * Decompress content
   */
  {
    name: 'context_decompress',
    description: 'Decompress content by expanding references back to original code',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content to decompress',
        },
      },
      required: ['content'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const content = args.content as string;

      const decompressed = await decompressContent(content, context.workspaceRoot);

      return {
        success: true,
        decompressed,
        original: content,
        message: 'Content decompressed',
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 300000,
    },
  },

  /**
   * Add compression rule
   */
  {
    name: 'context_add_rule',
    description: 'Add a custom compression rule for a repetitive pattern',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Rule name',
        },
        pattern: {
          type: 'string',
          description: 'Regex pattern to match',
        },
        category: {
          type: 'string',
          description: 'Pattern category',
          enum: ['import', 'boilerplate', 'type-def', 'test-setup', 'config'],
        },
        reference: {
          type: 'string',
          description: 'Reference name (e.g., @boilerplate:my-pattern)',
        },
      },
      required: ['name', 'pattern', 'category', 'reference'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const rule = await addRule(
        args.name as string,
        args.pattern as string,
        args.category as CompressionRule['category'],
        args.reference as string,
        context.workspaceRoot
      );

      return {
        success: true,
        rule: {
          id: rule.id,
          name: rule.name,
          category: rule.category,
          reference: rule.reference,
        },
        message: `Compression rule '${rule.name}' added`,
      };
    },
    options: {
      timeout: 10000,
    },
  },

  /**
   * List compression rules
   */
  {
    name: 'context_list_rules',
    description: 'List all compression rules with usage statistics',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category',
          enum: ['import', 'boilerplate', 'type-def', 'test-setup', 'config'],
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const rules = await loadRules(context.workspaceRoot);

      let filtered = rules;
      if (args.category) {
        filtered = rules.filter(r => r.category === args.category);
      }

      return {
        total: filtered.length,
        rules: filtered.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          reference: r.reference,
          usageCount: r.usageCount,
          tokenSavings: r.tokenSavings,
          totalSavings: r.usageCount * r.tokenSavings,
        })),
        message: `Found ${filtered.length} rule(s)`,
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 60000,
    },
  },

  /**
   * Get compression statistics
   */
  {
    name: 'context_stats',
    description: 'Get compression statistics and savings',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const stats = await loadStats(context.workspaceRoot);

      return {
        ...stats,
        message: `Total savings: ${stats.totalTokenSavings} tokens across ${stats.totalCompressions} compressions`,
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 30000,
    },
  },

  /**
   * Detect compression opportunities
   */
  {
    name: 'context_detect',
    description: 'Analyze content to detect patterns that could be compressed',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: 'Files to analyze',
          items: { type: 'string' },
        },
      },
      required: ['files'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const files = args.files as string[];
      const opportunities: Array<{
        file: string;
        pattern: string;
        occurrences: number;
        estimatedSavings: number;
      }> = [];

      for (const file of files) {
        const filePath = path.join(context.workspaceRoot, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Check against existing rules
        const rules = await loadRules(context.workspaceRoot);

        for (const rule of rules) {
          const matches = content.match(rule.pattern);
          if (matches && matches.length > 0) {
            opportunities.push({
              file,
              pattern: rule.name,
              occurrences: matches.length,
              estimatedSavings: matches.length * rule.tokenSavings,
            });
          }
        }
      }

      const totalSavings = opportunities.reduce((sum, opp) => sum + opp.estimatedSavings, 0);

      return {
        opportunities,
        totalOpportunities: opportunities.length,
        totalEstimatedSavings: totalSavings,
        message: `Found ${opportunities.length} compression opportunity(ies) with estimated ${totalSavings} token savings`,
      };
    },
    options: {
      timeout: 30000,
    },
  },

  /**
   * Clear compression cache
   */
  {
    name: 'context_clear',
    description: 'Clear compression cache and reset statistics',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const cacheDir = getCacheDir(context.workspaceRoot);

      try {
        await fs.rm(cacheDir, { recursive: true, force: true });
        await ensureCacheDir(context.workspaceRoot);

        return {
          success: true,
          message: 'Compression cache cleared',
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          message: 'Failed to clear cache',
        };
      }
    },
    options: {
      timeout: 10000,
    },
  },
];
