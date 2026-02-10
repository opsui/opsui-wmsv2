/**
 * Performance Telemetry System
 *
 * Tracks GLM interactions to identify what works and what doesn't.
 * Data-driven optimization of prompts, patterns, and approaches.
 *
 * Features:
 * - Interaction logging
 * - Success/failure tracking
 * - Token usage analytics
 * - Pattern effectiveness
 * - User satisfaction signals
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { ToolMetadata, ToolContext, ToolArgs } from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

interface InteractionLog {
  id: string;
  timestamp: string;
  session: string;

  // Task info
  taskType: TaskType;
  taskCategory: string;
  complexity: 'simple' | 'medium' | 'complex';

  // Performance
  duration: number; // milliseconds
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;

  // Outcome
  success: boolean;
  satisfaction: 'good' | 'neutral' | 'bad' | null;
  revisionCount: number; // How many times GLM corrected itself
  toolUsage: string[]; // Which tools were used

  // Patterns
  patternsUsed: string[]; // IDs of patterns applied
  patternsEffective: string[]; // Patterns that worked

  // Context
  filesTouched: string[];
  linesChanged: number;
}

type TaskType =
  | 'bugfix'
  | 'feature'
  | 'refactor'
  | 'documentation'
  | 'testing'
  | 'debugging'
  | 'optimization'
  | 'other';

interface TelemetryStats {
  totalInteractions: number;
  successRate: number;
  avgDuration: number;
  avgTokens: number;
  avgRevisions: number;
  taskTypeBreakdown: Record<TaskType, number>;
  topTools: Array<{ tool: string; usage: number }>;
  topPatterns: Array<{ patternId: string; success: number }>;
  satisfactionRate: number;
}

interface TelemetryInsights {
  highSuccessPatterns: string[];
  problematicPatterns: string[];
  optimalPromptLength: { min: number; max: number };
  bestTaskTimes: string[];
  recommendations: string[];
}

// ============================================================================
// STORAGE
// ============================================================================

const getTelemetryDir = (workspaceRoot: string) =>
  path.join(workspaceRoot, '.erp-cache', 'telemetry');
const getLogsPath = (workspaceRoot: string) =>
  path.join(getTelemetryDir(workspaceRoot), 'logs.jsonl');
const getSessionPath = (workspaceRoot: string, session: string) =>
  path.join(getTelemetryDir(workspaceRoot), `session-${session}.json`);

/**
 * Ensure telemetry directory exists
 */
async function ensureTelemetryDir(workspaceRoot: string): Promise<void> {
  await fs.mkdir(getTelemetryDir(workspaceRoot), { recursive: true });
}

/**
 * Get or create session ID
 */
async function getSession(workspaceRoot: string): Promise<string> {
  const sessionFile = path.join(getTelemetryDir(workspaceRoot), 'current-session.txt');

  try {
    const session = await fs.readFile(sessionFile, 'utf-8');
    return session.trim();
  } catch {
    const newSession = crypto.randomBytes(16).toString('hex');
    await ensureTelemetryDir(workspaceRoot);
    await fs.writeFile(sessionFile, newSession, 'utf-8');
    return newSession;
  }
}

/**
 * Log an interaction
 */
async function logInteraction(log: InteractionLog, workspaceRoot: string): Promise<void> {
  await ensureTelemetryDir(workspaceRoot);

  // Append to main log file
  const logLine = JSON.stringify(log) + '\n';
  await fs.appendFile(getLogsPath(workspaceRoot), logLine, 'utf-8');

  // Also write to session file
  const sessionPath = getSessionPath(workspaceRoot, log.session);
  await fs.writeFile(sessionPath, JSON.stringify(log, null, 2), 'utf-8');
}

/**
 * Load all interactions
 */
async function loadInteractions(workspaceRoot: string): Promise<InteractionLog[]> {
  try {
    const logsPath = getLogsPath(workspaceRoot);
    const content = await fs.readFile(logsPath, 'utf-8');
    const lines = content.trim().split('\n');

    return lines.filter(line => line.trim()).map(line => JSON.parse(line) as InteractionLog);
  } catch {
    return [];
  }
}

/**
 * Calculate statistics from logs
 */
async function calculateStats(workspaceRoot: string): Promise<TelemetryStats> {
  const logs = await loadInteractions(workspaceRoot);

  if (logs.length === 0) {
    return {
      totalInteractions: 0,
      successRate: 0,
      avgDuration: 0,
      avgTokens: 0,
      avgRevisions: 0,
      taskTypeBreakdown: {} as Record<TaskType, number>,
      topTools: [],
      topPatterns: [],
      satisfactionRate: 0,
    };
  }

  const successful = logs.filter(l => l.success);
  const totalDuration = logs.reduce((sum, l) => sum + l.duration, 0);
  const totalTokens = logs.reduce((sum, l) => sum + l.totalTokens, 0);
  const totalRevisions = logs.reduce((sum, l) => sum + l.revisionCount, 0);

  // Task type breakdown
  const taskTypeBreakdown = {} as Record<TaskType, number>;
  for (const log of logs) {
    taskTypeBreakdown[log.taskType] = (taskTypeBreakdown[log.taskType] || 0) + 1;
  }

  // Top tools
  const toolUsage = new Map<string, number>();
  for (const log of logs) {
    for (const tool of log.toolUsage) {
      toolUsage.set(tool, (toolUsage.get(tool) || 0) + 1);
    }
  }
  const topTools = Array.from(toolUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tool, usage]) => ({ tool, usage }));

  // Top patterns
  const patternSuccess = new Map<string, { success: number; total: number }>();
  for (const log of logs) {
    for (const pattern of log.patternsUsed) {
      const stats = patternSuccess.get(pattern) || { success: 0, total: 0 };
      stats.total++;
      if (log.success) stats.success++;
      patternSuccess.set(pattern, stats);
    }
  }
  const topPatterns = Array.from(patternSuccess.entries())
    .map(([patternId, stats]) => ({ patternId, success: stats.success / stats.total }))
    .sort((a, b) => b.success - a.success)
    .slice(0, 10);

  // Satisfaction rate
  const withSatisfaction = logs.filter(l => l.satisfaction);
  const satisfied = withSatisfaction.filter(l => l.satisfaction === 'good').length;

  return {
    totalInteractions: logs.length,
    successRate: successful.length / logs.length,
    avgDuration: totalDuration / logs.length,
    avgTokens: totalTokens / logs.length,
    avgRevisions: totalRevisions / logs.length,
    taskTypeBreakdown,
    topTools,
    topPatterns,
    satisfactionRate: withSatisfaction.length > 0 ? satisfied / withSatisfaction.length : 0,
  };
}

/**
 * Generate insights from telemetry
 */
async function generateInsights(workspaceRoot: string): Promise<TelemetryInsights> {
  const logs = await loadInteractions(workspaceRoot);
  const insights: TelemetryInsights = {
    highSuccessPatterns: [],
    problematicPatterns: [],
    optimalPromptLength: { min: 0, max: 0 },
    bestTaskTimes: [],
    recommendations: [],
  };

  if (logs.length === 0) {
    return insights;
  }

  // Analyze pattern effectiveness
  const patternStats = new Map<string, { success: number; total: number }>();
  for (const log of logs) {
    for (const pattern of log.patternsUsed) {
      const stats = patternStats.get(pattern) || { success: 0, total: 0 };
      stats.total++;
      if (log.success) stats.success++;
      patternStats.set(pattern, stats);
    }
  }

  insights.highSuccessPatterns = Array.from(patternStats.entries())
    .filter(([_, stats]) => stats.success / stats.total >= 0.8 && stats.total >= 3)
    .map(([patternId]) => patternId);

  insights.problematicPatterns = Array.from(patternStats.entries())
    .filter(([_, stats]) => stats.success / stats.total < 0.5 && stats.total >= 3)
    .map(([patternId]) => patternId);

  // Optimal prompt length (token range with highest success rate)
  const promptRanges = new Map<string, { success: number; total: number }>();
  for (const log of logs) {
    const range = getPromptRange(log.promptTokens);
    const stats = promptRanges.get(range) || { success: 0, total: 0 };
    stats.total++;
    if (log.success) stats.success++;
    promptRanges.set(range, stats);
  }

  let bestRange = '';
  let bestSuccessRate = 0;
  for (const [range, stats] of promptRanges.entries()) {
    if (stats.total >= 5) {
      const rate = stats.success / stats.total;
      if (rate > bestSuccessRate) {
        bestSuccessRate = rate;
        bestRange = range;
      }
    }
  }

  if (bestRange) {
    const [min, max] = bestRange.split('-').map(Number);
    insights.optimalPromptLength = { min, max };
  }

  // Best task times (hour of day with highest success)
  const hourStats = new Map<number, { success: number; total: number }>();
  for (const log of logs) {
    const hour = new Date(log.timestamp).getHours();
    const stats = hourStats.get(hour) || { success: 0, total: 0 };
    stats.total++;
    if (log.success) stats.success++;
    hourStats.set(hour, stats);
  }

  insights.bestTaskTimes = Array.from(hourStats.entries())
    .filter(([_, stats]) => stats.total >= 5 && stats.success / stats.total >= 0.8)
    .sort((a, b) => b[1].success / b[1].total - a[1].success / a[1].total)
    .slice(0, 3)
    .map(([hour]) => `${hour}:00`); // Placeholder for session analysis

  // Generate recommendations
  if (insights.problematicPatterns.length > 0) {
    insights.recommendations.push(
      `Review ${insights.problematicPatterns.length} underperforming pattern(s)`
    );
  }

  if (insights.optimalPromptLength.min > 0) {
    insights.recommendations.push(
      `Optimal prompt length: ${insights.optimalPromptLength.min}-${insights.optimalPromptLength.max} tokens`
    );
  }

  const stats = await calculateStats(workspaceRoot);
  if (stats.successRate < 0.7) {
    insights.recommendations.push('Success rate below 70% - consider prompt optimization');
  }

  if (stats.avgRevisions > 2) {
    insights.recommendations.push('High revision count - improve initial task clarity');
  }

  return insights;
}

function getPromptRange(tokens: number): string {
  if (tokens < 500) return '0-500';
  if (tokens < 1000) return '500-1000';
  if (tokens < 2000) return '1000-2000';
  if (tokens < 4000) return '2000-4000';
  return '4000+';
}

// ============================================================================
// MCP TOOLS
// ============================================================================

export const telemetryTools: ToolMetadata[] = [
  /**
   * Log an interaction
   */
  {
    name: 'telemetry_log',
    description: 'Log a GLM interaction for telemetry tracking',
    inputSchema: {
      type: 'object',
      properties: {
        taskType: {
          type: 'string',
          description: 'Type of task',
          enum: [
            'bugfix',
            'feature',
            'refactor',
            'documentation',
            'testing',
            'debugging',
            'optimization',
            'other',
          ],
        },
        taskCategory: {
          type: 'string',
          description: 'Category (e.g., "backend", "frontend", "infrastructure")',
        },
        complexity: {
          type: 'string',
          description: 'Task complexity',
          enum: ['simple', 'medium', 'complex'],
        },
        duration: {
          type: 'number',
          description: 'Task duration in milliseconds',
        },
        promptTokens: {
          type: 'number',
          description: 'Prompt token count',
        },
        responseTokens: {
          type: 'number',
          description: 'Response token count',
        },
        success: {
          type: 'boolean',
          description: 'Was the task completed successfully?',
        },
        satisfaction: {
          type: 'string',
          description: 'User satisfaction (optional)',
          enum: ['good', 'neutral', 'bad'],
        },
        revisionCount: {
          type: 'number',
          description: 'How many times GLM corrected itself',
        },
        toolUsage: {
          type: 'array',
          description: 'Tools used during task',
          items: { type: 'string' },
        },
        patternsUsed: {
          type: 'array',
          description: 'Pattern IDs that were applied',
          items: { type: 'string' },
        },
        patternsEffective: {
          type: 'array',
          description: 'Pattern IDs that worked well',
          items: { type: 'string' },
        },
        filesTouched: {
          type: 'array',
          description: 'Files that were modified',
          items: { type: 'string' },
        },
        linesChanged: {
          type: 'number',
          description: 'Total lines changed',
        },
      },
      required: ['taskType', 'complexity', 'duration', 'success'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const session = await getSession(context.workspaceRoot);

      const log: InteractionLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        session,
        taskType: args.taskType as TaskType,
        taskCategory: (args.taskCategory as string) || 'general',
        complexity: args.complexity as 'simple' | 'medium' | 'complex',
        duration: args.duration as number,
        promptTokens: (args.promptTokens as number) || 0,
        responseTokens: (args.responseTokens as number) || 0,
        totalTokens: ((args.promptTokens as number) || 0) + ((args.responseTokens as number) || 0),
        success: args.success as boolean,
        satisfaction: (args.satisfaction as 'good' | 'neutral' | 'bad' | null) || null,
        revisionCount: (args.revisionCount as number) || 0,
        toolUsage: (args.toolUsage as string[]) || [],
        patternsUsed: (args.patternsUsed as string[]) || [],
        patternsEffective: (args.patternsEffective as string[]) || [],
        filesTouched: (args.filesTouched as string[]) || [],
        linesChanged: (args.linesChanged as number) || 0,
      };

      await logInteraction(log, context.workspaceRoot);

      return {
        success: true,
        logId: log.id,
        session: log.session,
        message: 'Interaction logged successfully',
      };
    },
    options: {
      timeout: 5000,
    },
  },

  /**
   * Get telemetry statistics
   */
  {
    name: 'telemetry_stats',
    description: 'Get overall telemetry statistics',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const stats = await calculateStats(context.workspaceRoot);

      return {
        ...stats,
        message: `Telemetry: ${stats.totalInteractions} interaction(s) tracked`,
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 30000,
    },
  },

  /**
   * Get insights and recommendations
   */
  {
    name: 'telemetry_insights',
    description: 'Get insights and recommendations based on telemetry data',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const insights = await generateInsights(context.workspaceRoot);
      const stats = await calculateStats(context.workspaceRoot);

      return {
        ...insights,
        stats: {
          totalInteractions: stats.totalInteractions,
          successRate: Math.round(stats.successRate * 100) + '%',
          avgRevisions: Math.round(stats.avgRevisions * 10) / 10,
        },
        message:
          insights.recommendations.length > 0
            ? `Found ${insights.recommendations.length} recommendation(s)`
            : 'No recommendations yet - more data needed',
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 60000,
    },
  },

  /**
   * Get recent interactions
   */
  {
    name: 'telemetry_recent',
    description: 'Get recent interaction logs',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of recent interactions to return',
          minimum: 1,
          maximum: 100,
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const limit = (args.limit as number) || 20;
      const logs = await loadInteractions(context.workspaceRoot);

      const recent = logs
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit)
        .map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          taskType: log.taskType,
          complexity: log.complexity,
          duration: log.duration,
          success: log.success,
          satisfaction: log.satisfaction,
          toolUsage: log.toolUsage.length,
          patternsUsed: log.patternsUsed.length,
        }));

      return {
        total: logs.length,
        recent,
        message: `Retrieved ${recent.length} recent interaction(s)`,
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 10000,
    },
  },

  /**
   * Analyze task performance
   */
  {
    name: 'telemetry_analyze_task',
    description: 'Analyze performance for a specific task type',
    inputSchema: {
      type: 'object',
      properties: {
        taskType: {
          type: 'string',
          description: 'Task type to analyze',
          enum: [
            'bugfix',
            'feature',
            'refactor',
            'documentation',
            'testing',
            'debugging',
            'optimization',
            'other',
          ],
        },
      },
      required: ['taskType'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const taskType = args.taskType as TaskType;
      const logs = await loadInteractions(context.workspaceRoot);

      const taskLogs = logs.filter(l => l.taskType === taskType);

      if (taskLogs.length === 0) {
        return {
          taskType,
          total: 0,
          message: `No interactions found for task type: ${taskType}`,
        };
      }

      const successful = taskLogs.filter(l => l.success);
      const avgDuration = taskLogs.reduce((sum, l) => sum + l.duration, 0) / taskLogs.length;
      const avgTokens = taskLogs.reduce((sum, l) => sum + l.totalTokens, 0) / taskLogs.length;
      const avgRevisions = taskLogs.reduce((sum, l) => sum + l.revisionCount, 0) / taskLogs.length;

      // Most used tools for this task
      const toolUsage = new Map<string, number>();
      for (const log of taskLogs) {
        for (const tool of log.toolUsage) {
          toolUsage.set(tool, (toolUsage.get(tool) || 0) + 1);
        }
      }
      const topTools = Array.from(toolUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tool, usage]) => ({ tool, usage }));

      return {
        taskType,
        total: taskLogs.length,
        successRate: successful.length / taskLogs.length,
        avgDuration,
        avgTokens,
        avgRevisions,
        topTools,
        message: `Analyzed ${taskLogs.length} interaction(s) for ${taskType}`,
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 30000,
    },
  },

  /**
   * Export telemetry data
   */
  {
    name: 'telemetry_export',
    description: 'Export telemetry data as JSON',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'Export format',
          enum: ['json', 'csv'],
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const logs = await loadInteractions(context.workspaceRoot);
      const format = (args.format as string) || 'json';

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `telemetry-export-${timestamp}.${format}`;
      const exportPath = path.join(context.workspaceRoot, filename);

      if (format === 'json') {
        await fs.writeFile(exportPath, JSON.stringify(logs, null, 2), 'utf-8');
      } else {
        // CSV export
        if (logs.length > 0) {
          const headers = Object.keys(logs[0]).join(',');
          const rows = logs.map(log =>
            Object.values(log)
              .map(v => (typeof v === 'object' ? JSON.stringify(v) : v))
              .join(',')
          );
          const csv = [headers, ...rows].join('\n');
          await fs.writeFile(exportPath, csv, 'utf-8');
        } else {
          await fs.writeFile(exportPath, '', 'utf-8');
        }
      }

      return {
        success: true,
        filename,
        totalRecords: logs.length,
        message: `Exported ${logs.length} interaction(s) to ${filename}`,
      };
    },
    options: {
      timeout: 10000,
    },
  },

  /**
   * Clear telemetry data
   */
  {
    name: 'telemetry_clear',
    description: 'Clear all telemetry data',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description: 'Must be "DELETE" to confirm',
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      if (args.confirm !== 'DELETE') {
        return {
          success: false,
          message: 'Must confirm with confirm="DELETE" to clear telemetry',
        };
      }

      const telemetryDir = getTelemetryDir(context.workspaceRoot);

      try {
        await fs.rm(telemetryDir, { recursive: true, force: true });
        await ensureTelemetryDir(context.workspaceRoot);

        return {
          success: true,
          message: 'Telemetry data cleared',
        };
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          message: 'Failed to clear telemetry',
        };
      }
    },
    options: {
      timeout: 10000,
    },
  },
];
