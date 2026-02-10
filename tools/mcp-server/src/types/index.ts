/**
 * Type definitions for ERP MCP Dev Accelerator
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Base interface for all tool arguments
 */
export interface ToolArgs {
  [key: string]: unknown;
}

/**
 * Result type for tool operations
 */
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Common tool options
 */
export interface ToolOptions {
  timeout?: number;
  retries?: number;
  cacheable?: boolean;
  cacheTTL?: number; // milliseconds
}

/**
 * Context passed to tool handlers
 */
export interface ToolContext {
  workspaceRoot: string;
  sessionId?: string;
  timestamp: number;
}

/**
 * Validation schema for tool inputs
 */
export interface ValidationSchema {
  type: 'object';
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: string[];
      pattern?: string;
      minimum?: number;
      maximum?: number;
      required?: boolean;
      items?: {
        type: string;
        description?: string;
        enum?: string[];
        pattern?: string;
        properties?: Record<string, unknown>;
      };
    }
  >;
  required?: string[];
}

/**
 * Tool metadata
 */
export interface ToolMetadata {
  name: string;
  description: string;
  inputSchema: ValidationSchema;
  handler: (args: ToolArgs, context: ToolContext) => Promise<string | object>;
  options?: ToolOptions;
}

/**
 * Cache entry structure
 */
export interface CacheEntry {
  value: unknown;
  expiry: number;
  timestamp: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  toolName: string;
  executionTime: number;
  cacheHit: boolean;
  timestamp: number;
}

/**
 * Error types
 */
export class ToolError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

export class ValidationError extends ToolError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ToolError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} not found: ${id}` : `${resource} not found`, 'NOT_FOUND', {
      resource,
      id,
    });
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends ToolError {
  constructor(message: string, details?: unknown) {
    super(message, 'PERMISSION_ERROR', details);
    this.name = 'PermissionError';
  }
}

/**
 * Project structure types
 */
export interface ProjectStructure {
  root: string;
  packages: PackageInfo[];
  config: ProjectConfig;
}

export interface PackageInfo {
  name: string;
  path: string;
  type: 'backend' | 'frontend' | 'shared' | 'ml' | 'other';
  hasTests: boolean;
  mainFile: string;
}

export interface ProjectConfig {
  workspace: boolean;
  framework: string;
  testingFramework: string;
  buildTool: string;
  language: 'typescript' | 'javascript';
}
