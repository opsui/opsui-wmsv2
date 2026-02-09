/**
 * ERP MCP Dev Accelerator Server - v3.0
 *
 * Production-ready MCP server with:
 * - TypeScript for type safety
 * - Input validation with Zod
 * - Performance monitoring
 * - Response caching
 * - Comprehensive error handling
 * - Security hardening
 * - Full ERP domain support (Accounting, HR, Sales, Purchasing, Manufacturing, Projects, Inventory, E-commerce)
 *
 * @version 3.0.0
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { allTools } from './tools/index.js';
import { cache } from './utils/cache.js';
import { perfMonitor } from './utils/performance.js';
import { validateCommand } from './utils/validator.js';
import type { ToolArgs, ToolContext } from './types/index.js';

// Create MCP server instance
const server = new Server(
  {
    name: 'erp-dev-accelerator',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Extract workspace root from environment or current directory
 */
function getWorkspaceRoot(): string {
  return process.env.ERP_WORKSPACE_ROOT || process.cwd();
}

/**
 * Heartbeat interval reference for cleanup
 */
let heartbeatInterval: NodeJS.Timeout | null = null;

/**
 * Create tool execution context
 */
function createContext(): ToolContext {
  return {
    workspaceRoot: getWorkspaceRoot(),
    sessionId: process.env.SESSION_ID,
    timestamp: Date.now(),
  };
}

/**
 * List all available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

/**
 * Handle tool execution with performance monitoring and caching
 */
server.setRequestHandler(CallToolRequestSchema, async request => {
  const startTime = performance.now();
  const tool = allTools.find(t => t.name === request.params.name);

  if (!tool) {
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${request.params.name}`,
        },
      ],
      isError: true,
    };
  }

  // Check cache if tool is cacheable
  const cacheKey = tool.options?.cacheable
    ? `${tool.name}:${JSON.stringify(request.params.arguments)}`
    : null;

  if (cacheKey && cache.has(cacheKey)) {
    const cachedResult = cache.get<string>(cacheKey);
    const executionTime = performance.now() - startTime;

    perfMonitor.record(tool.name, executionTime, true);

    return {
      content: [
        {
          type: 'text',
          text: cachedResult!,
        },
      ],
    };
  }

  // Execute tool with timeout protection
  try {
    const context = createContext();
    const timeout = tool.options?.timeout || 30000; // 30 second default

    // Ensure arguments are never undefined
    const args: ToolArgs = request.params.arguments || {};

    const result = await withTimeout(tool.handler(args, context), timeout);

    const response = {
      content: [
        {
          type: 'text' as const,
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };

    // Cache result if applicable
    if (cacheKey && tool.options?.cacheable) {
      cache.set(cacheKey, JSON.stringify(result), tool.options.cacheTTL || 5000);
    }

    // Record metrics
    const executionTime = performance.now() - startTime;
    perfMonitor.record(tool.name, executionTime, false);

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error executing ${request.params.name}: ${errorMessage}${
            errorStack ? `\n\nStack: ${errorStack}` : ''
          }`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Execute with timeout protection
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Tool execution timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  console.error(`[ERP-MCP] Received ${signal}, shutting down gracefully...`);

  // Clear heartbeat interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Print performance metrics
  const stats = perfMonitor.getAllStats();
  if (Object.keys(stats).length > 0) {
    console.error('[ERP-MCP] Performance Metrics:');
    for (const [tool, toolStats] of Object.entries(stats)) {
      if (toolStats) {
        console.error(
          `  ${tool}: avg=${toolStats.avgExecutionTime.toFixed(2)}ms, ` +
            `cache=${toolStats.cacheHitRate.toFixed(1)}%, ` +
            `calls=${toolStats.totalExecutions}`
        );
      }
    }
  }

  // Print cache metrics
  const cacheMetrics = cache.getMetrics();
  console.error(
    `[ERP-MCP] Cache Metrics: ` +
      `hits=${cacheMetrics.hits}, ` +
      `misses=${cacheMetrics.misses}, ` +
      `hitRate=${cacheMetrics.hitRate}%, ` +
      `size=${cacheMetrics.size}`
  );

  process.exit(0);
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.error('[ERP-MCP] Starting ERP MCP Dev Accelerator v3.0.0...');
    console.error(`[ERP-MCP] Workspace: ${getWorkspaceRoot()}`);
    console.error(`[ERP-MCP] Tools registered: ${allTools.length}`);
    console.error('[ERP-MCP] Build timestamp:', new Date().toISOString());

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('[ERP-MCP] Server running on stdio');
    console.error('[ERP-MCP] Ready to accept requests');

    // Graceful shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle stdio close events (disconnection detection)
    process.stdin.on('close', () => {
      console.error('[ERP-MCP] Stdio closed, connection lost - exiting for restart...');
      process.exit(1); // Exit with error code to trigger auto-restart
    });

    // Send heartbeat every 5 seconds to show we're alive
    heartbeatInterval = setInterval(() => {
      console.error(`[ERP-MCP] Heartbeat: ${new Date().toISOString()} - PID:${process.pid}`);
    }, 5000);

    process.on('exit', code => {
      console.error(`[ERP-MCP] Exiting with code ${code}`);
    });

    // Handle uncaught errors
    process.on('uncaughtException', error => {
      console.error('[ERP-MCP] Uncaught exception, restarting...');
      console.error(error);
      process.exit(1);
    });

    process.on('unhandledRejection', reason => {
      console.error('[ERP-MCP] Unhandled rejection, restarting...');
      console.error(reason);
      process.exit(1);
    });
  } catch (error) {
    console.error('[ERP-MCP] Fatal error:', error);
    process.exit(1); // Exit with error code to trigger auto-restart
  }
}

main();
