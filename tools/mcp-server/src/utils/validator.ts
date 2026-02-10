/**
 * Input validation utilities using Zod
 * Provides schema validation for all tool inputs
 */

import { z } from 'zod';
import type { ValidationError } from '../types/index.js';

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Path validation
  filePath: z.string().min(1).max(500),
  relativePath: z.string().regex(/^(\.\.\/|\.\/|[a-zA-Z0-9_\-\.\/]+)$/),

  // Identifiers
  entityName: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      'Must start with letter and contain only letters, numbers, and underscores'
    ),

  // Numbers
  positiveInteger: z.number().int().positive(),
  nonNegativeInteger: z.number().int().nonnegative(),
  port: z.number().int().min(1).max(65535),

  // Booleans
  boolean: z.boolean(),

  // Arrays
  stringArray: z.array(z.string()).min(1),

  // URLs
  url: z.string().url(),

  // Email
  email: z.string().email(),
};

/**
 * Tool-specific validation schemas
 */
export const toolSchemas = {
  // Code generation schemas
  generateEntity: z.object({
    entityName: commonSchemas.entityName,
    fields: z
      .array(
        z.object({
          name: z.string().min(1).max(100),
          type: z.enum(['String', 'Number', 'Boolean', 'Date', 'Json', 'Int', 'Float', 'DateTime']),
          isRequired: z.boolean().optional().default(false),
          isUnique: z.boolean().optional().default(false),
          isId: z.boolean().optional().default(false),
          hasDefault: z.boolean().optional().default(false),
          default: z.any().optional(),
        })
      )
      .min(1),
    outputPath: commonSchemas.relativePath.optional(),
  }),

  // Database schemas
  createMigration: z.object({
    name: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
    projectPath: commonSchemas.filePath.optional(),
  }),

  // Query schemas
  queryDatabase: z.object({
    query: z.string().min(1).max(10000),
    params: z.array(z.any()).optional(),
    projectPath: commonSchemas.filePath.optional(),
  }),

  // File operations
  readFile: z.object({
    path: commonSchemas.filePath,
    encoding: z.enum(['utf-8', 'ascii', 'base64']).optional().default('utf-8'),
  }),

  writeFile: z.object({
    path: commonSchemas.filePath,
    content: z.string().min(0),
    encoding: z.enum(['utf-8', 'ascii', 'base64']).optional().default('utf-8'),
  }),

  // Project analysis
  analyzeProject: z.object({
    projectPath: commonSchemas.filePath.optional(),
    includeTests: z.boolean().optional().default(true),
    includeDependencies: z.boolean().optional().default(true),
  }),

  // ERP-specific schemas
  createOrder: z.object({
    customerId: z.string().min(1),
    customerName: z.string().min(1).max(200),
    items: z
      .array(
        z.object({
          sku: z.string().min(1).max(50),
          quantity: commonSchemas.positiveInteger,
        })
      )
      .min(1),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  }),

  generatePickList: z.object({
    batchSize: commonSchemas.positiveInteger.max(100).optional().default(10),
    maxItemsPerBatch: commonSchemas.positiveInteger.max(500).optional().default(100),
    groupByZone: z.boolean().optional().default(true),
    optimizePath: z.boolean().optional().default(true),
  }),

  inventoryCheck: z.object({
    sku: z.string().min(1).max(50),
    quantity: commonSchemas.positiveInteger,
    binLocation: z
      .string()
      .regex(/^[A-Z]-\d{1,3}-\d{2}$/)
      .optional(),
  }),
};

/**
 * Validate input against schema
 * @throws {ValidationError} If validation fails
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  fieldName: string = 'input'
): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));

      throw new Error(
        `Validation failed for ${fieldName}:\n${details.map(d => `  - ${d.path}: ${d.message}`).join('\n')}`
      );
    }
    throw error;
  }
}

/**
 * Safe validation - returns result instead of throwing
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: message };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

/**
 * Sanitize file paths to prevent directory traversal
 */
export function sanitizePath(path: string, allowedBase: string): string {
  // Remove any null bytes
  const sanitized = path.replace(/\0/g, '');

  // Prevent directory traversal
  if (sanitized.includes('..')) {
    throw new Error('Path traversal detected');
  }

  // Resolve relative to base path
  const resolved = new URL(sanitized, `file://${allowedBase}/`).pathname;

  return resolved;
}

/**
 * Validate shell command to prevent command injection
 */
export function validateCommand(command: string): boolean {
  // Allow only safe characters
  const safePattern = /^[a-zA-Z0-9_\s\-\/@:=.,]+$/;

  // Block dangerous commands
  const dangerous = [
    'rm -rf',
    'rm -r /',
    'mkfs',
    'dd if=',
    'chmod 000',
    'chown -R',
    '> /',
    'curl',
    'wget',
    'nc -l',
    'netcat',
  ];

  if (!safePattern.test(command)) {
    return false;
  }

  const lowerCommand = command.toLowerCase();
  for (const bad of dangerous) {
    if (lowerCommand.includes(bad)) {
      return false;
    }
  }

  return true;
}
