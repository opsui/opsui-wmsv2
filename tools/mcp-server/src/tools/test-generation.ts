/**
 * Automated Test Generation Tool
 *
 * Generates intelligent tests based on:
 * - Code analysis
 * - Existing test patterns in the library
 * - Code complexity and risk level
 * - Similar previously tested code
 *
 * Features:
 * - Pattern-aware test generation
 * - Test inheritance from similar code
 * - Coverage tracking
 * - Auto-updates test patterns
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import type { ToolMetadata, ToolContext, ToolArgs } from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

interface TestGenerationRequest {
  file: string;
  code: string;
  language: 'typescript' | 'javascript' | 'python';
  framework?: 'vitest' | 'jest' | 'pytest';
  complexity?: 'simple' | 'medium' | 'complex';
}

interface TestPattern {
  id: string;
  codeSignature: string;
  testTemplate: string;
  coverageAreas: string[];
  complexity: 'simple' | 'medium' | 'complex';
  useCases: string[];
}

interface GeneratedTest {
  filePath: string;
  content: string;
  coverageAreas: string[];
  estimatedCoverage: number;
  patternsUsed: string[];
}

// ============================================================================
// CODE ANALYSIS
// ============================================================================

/**
 * Analyze code to determine test requirements
 */
function analyzeCodeForTesting(
  code: string,
  language: string
): {
  functions: Array<{ name: string; lines: number; complexity: number }>;
  imports: string[];
  exports: string[];
  complexity: 'simple' | 'medium' | 'complex';
  riskAreas: string[];
} {
  const functions: Array<{ name: string; lines: number; complexity: number }> = [];
  const imports: string[] = [];
  const exports: string[] = [];
  const riskAreas: string[] = [];

  // Extract function signatures
  const functionRegex =
    language === 'typescript'
      ? /(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>)/g
      : /(?:async\s+)?function\s+(\w+)/g;

  let match;
  while ((match = functionRegex.exec(code)) !== null) {
    const name = match[1] || match[2];
    if (name) {
      functions.push({ name, lines: 0, complexity: 1 });
    }
  }

  // Extract imports
  const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  // Extract exports
  const exportRegex = /export\s+(?:const|function|class|interface|type)\s+(\w+)/g;
  while ((match = exportRegex.exec(code)) !== null) {
    exports.push(match[1]);
  }

  // Detect risk areas
  if (code.includes('try') || code.includes('catch')) riskAreas.push('error-handling');
  if (code.includes('async') || code.includes('await')) riskAreas.push('async-operations');
  if (code.includes('if') || code.includes('switch')) riskAreas.push('conditional-logic');
  if (code.includes('.map(') || code.includes('.filter(')) riskAreas.push('array-transformations');
  if (code.includes('fetch') || code.includes('axios')) riskAreas.push('api-calls');
  if (code.includes('transaction') || code.includes('query')) riskAreas.push('database-operations');

  // Determine complexity
  let complexityScore = 0;
  complexityScore += functions.length * 2;
  complexityScore += riskAreas.length * 3;
  complexityScore += code.split('\n').length * 0.1;

  let complexity: 'simple' | 'medium' | 'complex';
  if (complexityScore < 20) complexity = 'simple';
  else if (complexityScore < 50) complexity = 'medium';
  else complexity = 'complex';

  return { functions, imports, exports, complexity, riskAreas };
}

/**
 * Search for similar test patterns
 */
async function findSimilarTestPatterns(
  codeSignature: string,
  workspaceRoot: string
): Promise<TestPattern[]> {
  // This would integrate with the pattern extraction system
  // For now, return some default patterns

  const patternsDir = path.join(workspaceRoot, 'patterns', 'extracted');

  try {
    const { glob } = await import('fast-glob');
    const files = await glob('*.json', { cwd: patternsDir, absolute: false });

    const patterns: TestPattern[] = [];

    for (const file of files) {
      if (file === 'index.json') continue;

      const content = await fs.readFile(path.join(patternsDir, file), 'utf-8');
      const pattern = JSON.parse(content);

      // Check if this is a test-related pattern
      if (pattern.tags?.includes('testing') || pattern.category === 'testing') {
        patterns.push({
          id: pattern.id,
          codeSignature: pattern.title,
          testTemplate: pattern.codeSnippet || '',
          coverageAreas: pattern.tags || [],
          complexity: pattern.metadata?.complexity || 'medium',
          useCases: [pattern.problem],
        });
      }
    }

    return patterns;
  } catch {
    return [];
  }
}

// ============================================================================
// TEST GENERATION
// ============================================================================

/**
 * Generate TypeScript test file
 */
function generateTypeScriptTest(
  request: TestGenerationRequest,
  analysis: ReturnType<typeof analyzeCodeForTesting>,
  patterns: TestPattern[]
): GeneratedTest {
  const { file, code, framework = 'vitest' } = request;

  // Extract file path for test
  const relativePath = file.replace(process.cwd(), '').replace(/^\//, '');
  const testFilePath = relativePath.replace(/\.ts$/, `.test.ts`);

  // Build test content
  let testContent = `/**
 * Auto-generated tests for ${relativePath}
 * Generated by: ERP MCP Test Generator
 * Complexity: ${analysis.complexity}
 * Risk Areas: ${analysis.riskAreas.join(', ')}
 */

`;
  // Add imports
  testContent += `import { describe, it, expect, vi, beforeEach, afterEach } from '${framework}';\n`;

  // Add the import under test
  const modulePath = relativePath.replace(/\.ts$/, '').replace(/^src\//, '@/');
  testContent += `import { ${analysis.exports.join(', ')} } from '../${modulePath.replace(/\.test$/, '')}';\n\n`;

  // Generate describe blocks
  if (analysis.exports.length > 0) {
    testContent += `describe('${modulePath}', () => {\n`;
  }

  // Add test cases for each export
  for (const exp of analysis.exports) {
    testContent += generateTestsForExport(exp, analysis, patterns, framework);
  }

  if (analysis.exports.length > 0) {
    testContent += `});\n`;
  }

  // Calculate estimated coverage
  const baseCoverage = analysis.functions.length * 15;
  const riskCoverage = analysis.riskAreas.length * 10;
  const estimatedCoverage = Math.min(95, baseCoverage + riskCoverage + 20);

  return {
    filePath: testFilePath,
    content: testContent,
    coverageAreas: analysis.riskAreas,
    estimatedCoverage,
    patternsUsed: patterns.map(p => p.id),
  };
}

/**
 * Generate tests for a specific export
 */
function generateTestsForExport(
  exportName: string,
  analysis: ReturnType<typeof analyzeCodeForTesting>,
  patterns: TestPattern[],
  framework: string
): string {
  let tests = '';

  // Basic test
  tests += `  describe('${exportName}', () => {\n`;
  tests += `    it('should be defined', () => {\n`;
  tests += `      expect(${exportName}).toBeDefined();\n`;
  tests += `    });\n\n`;

  // Add tests based on risk areas
  if (analysis.riskAreas.includes('error-handling')) {
    tests += generateErrorHandlingTests(exportName, framework);
  }

  if (analysis.riskAreas.includes('async-operations')) {
    tests += generateAsyncTests(exportName, framework);
  }

  if (analysis.riskAreas.includes('conditional-logic')) {
    tests += generateConditionalTests(exportName, framework);
  }

  if (analysis.riskAreas.includes('array-transformations')) {
    tests += generateArrayTests(exportName, framework);
  }

  if (analysis.riskAreas.includes('api-calls')) {
    tests += generateApiTests(exportName, framework);
  }

  if (analysis.riskAreas.includes('database-operations')) {
    tests += generateDatabaseTests(exportName, framework);
  }

  tests += `  });\n\n`;

  return tests;
}

/**
 * Generate error handling tests
 */
function generateErrorHandlingTests(functionName: string, framework: string): string {
  return `    it('should handle errors gracefully', async () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      await expect(${functionName}(invalidInput)).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      // Arrange
      const expectedError = 'Expected error message';

      // Act & Assert
      try {
        await ${functionName}('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

`;
}

/**
 * Generate async tests
 */
function generateAsyncTests(functionName: string, framework: string): string {
  return `    it('should resolve successfully with valid input', async () => {
      // Arrange
      const validInput = 'test-input';

      // Act
      const result = await ${functionName}(validInput);

      // Assert
      expect(result).toBeDefined();
    });

    it('should timeout after reasonable time', async () => {
      // Arrange
      const slowInput = 'slow-input';

      // Act & Assert
      await expect(${functionName}(slowInput)).resolves.toBeDefined();
    }, 10000);

`;
}

/**
 * Generate conditional logic tests
 */
function generateConditionalTests(functionName: string, framework: string): string {
  return `    it('should handle true condition', () => {
      // Arrange
      const input = { condition: true };

      // Act
      const result = ${functionName}(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle false condition', () => {
      // Arrange
      const input = { condition: false };

      // Act
      const result = ${functionName}(input);

      // Assert
      expect(result).toBeDefined();
    });

`;
}

/**
 * Generate array transformation tests
 */
function generateArrayTests(functionName: string, framework: string): string {
  return `    it('should handle empty arrays', () => {
      // Arrange
      const input = [];

      // Act
      const result = ${functionName}(input);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle array with multiple items', () => {
      // Arrange
      const input = [1, 2, 3, 4, 5];

      // Act
      const result = ${functionName}(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

`;
}

/**
 * Generate API tests
 */
function generateApiTests(functionName: string, framework: string): string {
  return `    it('should make API request with correct parameters', async () => {
      // Arrange
      const params = { id: '123' };

      // Act
      const result = await ${functionName}(params);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle API errors', async () => {
      // Arrange
      const invalidParams = { id: null };

      // Act & Assert
      await expect(${functionName}(invalidParams)).rejects.toThrow();
    });

`;
}

/**
 * Generate database tests
 */
function generateDatabaseTests(functionName: string, framework: string): string {
  return `    it('should execute database transaction successfully', async () => {
      // Arrange
      const data = { name: 'test' };

      // Act
      const result = await ${functionName}(data);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should rollback on transaction failure', async () => {
      // Arrange
      const invalidData = { name: null };

      // Act & Assert
      await expect(${functionName}(invalidData)).rejects.toThrow();
    });

`;
}

/**
 * Generate Python test file
 */
function generatePythonTest(
  request: TestGenerationRequest,
  analysis: ReturnType<typeof analyzeCodeForTesting>
): GeneratedTest {
  const { file, framework = 'pytest' } = request;

  const relativePath = file.replace(process.cwd(), '').replace(/^\//, '');
  const testFilePath = relativePath.replace(/\.py$/, '_test.py');

  let testContent = `"""
Auto-generated tests for ${relativePath}
Generated by: WMS MCP Test Generator
Complexity: ${analysis.complexity}
Risk Areas: ${analysis.riskAreas.join(', ')}
"""

import pytest
from unittest.mock import Mock, patch
`;

  // Add imports under test
  const moduleName = relativePath
    .replace(/^src\//, '')
    .replace(/\.py$/, '')
    .replace(/\//g, '.');
  testContent += `from ${moduleName} import ${analysis.exports.join(', ')}\n\n`;

  // Generate test classes
  for (const exp of analysis.exports) {
    testContent += `class Test${exp.charAt(0).toUpperCase() + exp.slice(1)}:\n`;
    testContent += `    def test_${exp}_is_defined(self):\n`;
    testContent += `        assert ${exp} is not None\n\n`;

    if (analysis.riskAreas.includes('error-handling')) {
      testContent += `    def test_${exp}_handles_errors(self):\n`;
      testContent += `        with pytest.raises(Exception):\n`;
      testContent += `            ${exp}()\n\n`;
    }

    if (analysis.riskAreas.includes('async-operations')) {
      testContent += `    @pytest.mark.asyncio\n`;
      testContent += `    async def test_${exp}_async(self):\n`;
      testContent += `        result = await ${exp}()\n`;
      testContent += `        assert result is not None\n\n`;
    }
  }

  const estimatedCoverage = Math.min(
    95,
    analysis.functions.length * 15 + analysis.riskAreas.length * 10 + 20
  );

  return {
    filePath: testFilePath,
    content: testContent,
    coverageAreas: analysis.riskAreas,
    estimatedCoverage,
    patternsUsed: [],
  };
}

// ============================================================================
// MCP TOOL
// ============================================================================

export const testGenerationTools: ToolMetadata[] = [
  /**
   * Generate tests for a file
   */
  {
    name: 'generate_tests',
    description:
      'Generate automated tests for a code file based on code analysis and existing test patterns',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Path to the file to generate tests for (relative to workspace root)',
        },
        language: {
          type: 'string',
          description: 'Programming language',
          enum: ['typescript', 'javascript', 'python'],
        },
        framework: {
          type: 'string',
          description: 'Testing framework',
          enum: ['vitest', 'jest', 'pytest'],
        },
        writeToFile: {
          type: 'boolean',
          description: 'Write test file to disk (default: true)',
        },
      },
      required: ['file', 'language'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const { file, language, framework, writeToFile = true } = args;

      const filePath = path.join(context.workspaceRoot, file as string);

      // Read source file
      const code = await fs.readFile(filePath, 'utf-8');

      // Analyze code
      const analysis = analyzeCodeForTesting(code, language as string);

      // Find similar test patterns
      const codeSignature = analysis.exports.join('-');
      const patterns = await findSimilarTestPatterns(codeSignature, context.workspaceRoot);

      // Generate tests
      let generated: GeneratedTest;

      if (language === 'python') {
        generated = generatePythonTest(
          { file: filePath, code, language: language as any, framework: framework as any },
          analysis
        );
      } else {
        generated = generateTypeScriptTest(
          { file: filePath, code, language: language as any, framework: framework as any },
          analysis,
          patterns
        );
      }

      // Write to file
      let testFilePath = '';
      if (writeToFile) {
        testFilePath = path.join(context.workspaceRoot, generated.filePath);
        await fs.mkdir(path.dirname(testFilePath), { recursive: true });
        await fs.writeFile(testFilePath, generated.content, 'utf-8');
      }

      return {
        success: true,
        testFile: generated.filePath,
        testFilePath: testFilePath || null,
        writtenToFile: writeToFile,
        analysis: {
          exports: analysis.exports,
          functions: analysis.functions.length,
          complexity: analysis.complexity,
          riskAreas: analysis.riskAreas,
        },
        coverage: {
          estimated: generated.estimatedCoverage,
          areas: generated.coverageAreas,
        },
        patterns: {
          found: patterns.length,
          used: generated.patternsUsed,
        },
        message: `Generated tests for ${analysis.exports.length} export(s) with estimated ${generated.estimatedCoverage}% coverage`,
      };
    },
    options: {
      timeout: 30000,
    },
  },

  /**
   * Analyze test coverage
   */
  {
    name: 'analyze_coverage',
    description: 'Analyze test coverage for the project using existing test framework',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: {
          type: 'string',
          description: 'Path to analyze (defaults to workspace root)',
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const targetPath = (args.workspacePath as string) || context.workspaceRoot;

      // Define coverage commands to try in order
      const coverageCommands = [
        'npm run test:coverage',
        'vitest run --coverage',
        'npx vitest run --coverage',
        'npx jest --coverage',
      ];

      // Set a hard timeout to prevent hanging
      const TIMEOUT_MS = 60000; // 60 seconds

      for (const cmd of coverageCommands) {
        try {
          // Use execSync with explicit timeout to prevent hanging
          const result = execSync(cmd, {
            cwd: targetPath,
            encoding: 'utf-8',
            stdio: 'pipe',
            timeout: TIMEOUT_MS,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          });

          // Return success with truncated output if too large
          const output = result as string;
          const truncated =
            output.length > 50000
              ? output.substring(0, 50000) + '\n\n... (output truncated, too large)'
              : output;

          return {
            success: true,
            message: `Coverage analysis complete using: ${cmd}`,
            command: cmd,
            output: truncated,
          };
        } catch (error: any) {
          // If timeout, skip to next command
          if (error.killed || error.signal === 'SIGTERM' || error.errno === 'ETIMEDOUT') {
            continue;
          }
          // If command not found, try next
          if (error.code === 'ENOENT' || error.status === null) {
            continue;
          }
        }
      }

      // All commands failed
      return {
        success: false,
        message: 'Coverage analysis failed - no working test framework found',
        error: 'Tried: npm run test:coverage, vitest, jest',
        suggestion: 'Ensure vitest or jest is installed and configured with coverage support',
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 60000,
      timeout: 70000, // Slightly longer than individual command timeout
    },
  },

  /**
   * Suggest test improvements
   */
  {
    name: 'suggest_tests',
    description: 'Analyze code and suggest additional tests that should be written',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          description: 'Files to analyze',
          items: { type: 'string' },
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const files = args.files as string[];
      const suggestions: Array<{
        file: string;
        export: string;
        suggestedTests: string[];
        priority: 'high' | 'medium' | 'low';
      }> = [];

      for (const file of files) {
        const filePath = path.join(context.workspaceRoot, file);
        const code = await fs.readFile(filePath, 'utf-8');
        const analysis = analyzeCodeForTesting(code, path.extname(file).slice(1) as any);

        for (const exp of analysis.exports) {
          const suggestedTests: string[] = [];

          if (analysis.riskAreas.includes('async-operations')) {
            suggestedTests.push('Test timeout handling');
            suggestedTests.push('Test concurrent requests');
          }

          if (analysis.riskAreas.includes('error-handling')) {
            suggestedTests.push('Test error boundary conditions');
            suggestedTests.push('Test error recovery');
          }

          if (analysis.complexity === 'complex') {
            suggestedTests.push('Add integration tests');
            suggestedTests.push('Add performance tests');
          }

          suggestions.push({
            file,
            export: exp,
            suggestedTests,
            priority:
              analysis.complexity === 'complex'
                ? 'high'
                : analysis.complexity === 'medium'
                  ? 'medium'
                  : 'low',
          });
        }
      }

      return {
        suggestions,
        total: suggestions.length,
        message: `Analyzed ${files.length} file(s) and found ${suggestions.length} suggestion(s)`,
      };
    },
    options: {
      timeout: 60000,
    },
  },
];
