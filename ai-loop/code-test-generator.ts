/**
 * AI-Powered Test Generation from Source Code
 *
 * Reads production code and generates comprehensive tests automatically
 * Supports TypeScript, JavaScript, Python, and Java
 */

import * as fs from 'fs';
import * as path from 'path';
import { GLMClient } from './glm-client';

interface GeneratedTest {
  name: string;
  description: string;
  testCode: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

interface CodeAnalysis {
  functions: Array<{
    name: string;
    parameters: string[];
    complexity: number;
    sideEffects: boolean;
  }>;
  imports: string[];
  exports: string[];
  complexity: number;
}

export class CodeBasedTestGenerator {
  private glm: GLMClient;
  private generatedTestsPath: string;

  constructor(glm: GLMClient, outputDir = './ai-loop/generated-tests') {
    this.glm = glm;
    this.generatedTestsPath = outputDir;
    this.ensureOutputDir();
  }

  /**
   * Generate tests from a source file
   */
  async generateTestsFromFile(
    sourceFilePath: string,
    language?: string
  ): Promise<GeneratedTest[]> {
    const fullPath = path.resolve(sourceFilePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Source file not found: ${sourceFilePath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const detectedLanguage = language || this.detectLanguage(fullPath);

    console.log(`  📄 Analyzing ${path.basename(sourceFilePath)} (${detectedLanguage})...`);

    // Analyze code structure
    const analysis = this.analyzeCode(content, detectedLanguage);

    // Generate tests using AI
    const result = await this.glm.generateTestsFromCode({
      filePath: sourceFilePath,
      codeContent: content,
      language: detectedLanguage,
    });

    console.log(`  ✅ Generated ${result.tests.length} tests`);
    console.log(`  📊 Coverage: ${result.coverage.join(', ')}`);

    // Add category to each test (required by GeneratedTest interface)
    return result.tests.map(t => ({
      ...t,
      category: detectedLanguage,
    }));
  }

  /**
   * Generate tests from entire directory
   */
  async generateTestsFromDirectory(
    sourceDir: string,
    options: {
      filePattern?: RegExp;
      maxFiles?: number;
      language?: string;
    } = {}
  ): Promise<Map<string, GeneratedTest[]>> {
    const results = new Map<string, GeneratedTest[]>();
    const { filePattern = /\.(ts|js|tsx|jsx|py|java)$/, maxFiles = 20 } = options;

    console.log(`\n  🔍 Scanning directory: ${sourceDir}`);

    const files = this.getSourceFiles(sourceDir, filePattern);
    const filesToProcess = files.slice(0, maxFiles);

    console.log(`  📁 Found ${files.length} files, processing ${filesToProcess.length}`);

    for (const file of filesToProcess) {
      try {
        const tests = await this.generateTestsFromFile(file, options.language);
        results.set(file, tests);

        // Save generated tests
        this.saveGeneratedTests(file, tests);
      } catch (error) {
        console.log(`    ⚠️  Failed to generate tests for ${file}: ${(error as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Analyze code structure
   */
  private analyzeCode(code: string, language: string): CodeAnalysis {
    const analysis: CodeAnalysis = {
      functions: [],
      imports: [],
      exports: [],
      complexity: 0,
    };

    if (language === 'typescript' || language === 'javascript') {
      // Extract function declarations
      const functionRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/g;
      let match;

      while ((match = functionRegex.exec(code)) !== null) {
        const name = match[1] || match[2];
        if (name) {
          analysis.functions.push({
            name,
            parameters: [],
            complexity: this.estimateFunctionComplexity(code, name),
            sideEffects: this.hasSideEffects(code, name),
          });
        }
      }

      // Extract imports
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      while ((match = importRegex.exec(code)) !== null) {
        analysis.imports.push(match[1]);
      }

      // Extract exports
      const exportRegex = /export\s+(?:const|function|class)\s+(\w+)/g;
      while ((match = exportRegex.exec(code)) !== null) {
        analysis.exports.push(match[1]);
      }
    } else if (language === 'python') {
      // Extract function definitions
      const functionRegex = /def\s+(\w+)\s*\(([^)]*)\)/g;
      let match;

      while ((match = functionRegex.exec(code)) !== null) {
        analysis.functions.push({
          name: match[1],
          parameters: match[2].split(',').map(p => p.trim()).filter(Boolean),
          complexity: this.estimateFunctionComplexity(code, match[1]),
          sideEffects: this.hasSideEffects(code, match[1]),
        });
      }

      // Extract imports
      const importRegex = /(?:from\s+(\S+)\s+)?import\s+(.+)/g;
      while ((match = importRegex.exec(code)) !== null) {
        const module = match[1] || match[2].split(',')[0];
        analysis.imports.push(module.trim());
      }
    }

    analysis.complexity = this.calculateOverallComplexity(analysis);

    return analysis;
  }

  /**
   * Estimate function complexity
   */
  private estimateFunctionComplexity(code: string, functionName: string): number {
    // Simple heuristic: count branches, loops, and returns
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try'];
    let complexity = 1;

    // Find function body (simplified)
    const functionRegex = new RegExp(`(?:function|def)\\s+${functionName}\\s*\\([^)]*\\)\\s*[{\\n]([\\s\\S]*?)(?:\\n\\s*[}\\n]|$)`, 'gm');
    const match = functionRegex.exec(code);

    if (match && match[1]) {
      const body = match[1];
      for (const keyword of complexityKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        const count = (body.match(regex) || []).length;
        complexity += count;
      }
    }

    return complexity;
  }

  /**
   * Check if function has side effects
   */
  private hasSideEffects(code: string, functionName: string): boolean {
    const sideEffectIndicators = [
      /console\./,
      /localStorage/,
      /sessionStorage/,
      /fetch\(/,
      /\.push\(/,
      /\.pop\(/,
      /\.delete\(/,
      /\.set\(/,
      /\.update\(/,
      /\.insert\(/,
      /\.remove\(/,
    ];

    const functionRegex = new RegExp(`(?:function|def)\\s+${functionName}\\s*\\([^)]*\\)\\s*[{\\n]([\\s\\S]*?)(?:\\n\\s*[}\\n]|$)`, 'gm');
    const match = functionRegex.exec(code);

    if (match && match[1]) {
      const body = match[1];
      return sideEffectIndicators.some(regex => regex.test(body));
    }

    return false;
  }

  /**
   * Calculate overall complexity
   */
  private calculateOverallComplexity(analysis: CodeAnalysis): number {
    const avgFunctionComplexity = analysis.functions.length > 0
      ? analysis.functions.reduce((sum, f) => sum + f.complexity, 0) / analysis.functions.length
      : 0;

    return Math.round(avgFunctionComplexity + (analysis.imports.length * 0.1));
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
    };

    return languageMap[ext] || 'typescript';
  }

  /**
   * Get all source files in directory
   */
  private getSourceFiles(dir: string, pattern: RegExp): string[] {
    const files: string[] = [];

    const scan = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and similar
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
            scan(fullPath);
          }
        } else if (pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }

  /**
   * Save generated tests to file
   */
  private saveGeneratedTests(sourceFile: string, tests: GeneratedTest[]): void {
    const testName = path.basename(sourceFile, path.extname(sourceFile));
    const outputPath = path.join(this.generatedTestsPath, `${testName}.generated.spec.ts`);

    const testContent = this.generateTestFileContent(tests, testName);

    fs.writeFileSync(outputPath, testContent, 'utf-8');
    console.log(`    💾 Saved to: ${outputPath}`);
  }

  /**
   * Generate test file content
   */
  private generateTestFileContent(tests: GeneratedTest[], testName: string): string {
    const imports = `import { test, expect } from '@playwright/test';\n\n`;

    const describeBlock = `test.describe('AI-Generated: ${testName}', () => {\n`;

    const testBlocks = tests.map(t => {
      return `  test('${t.description.replace(/'/g, "\\'")}', async ({ page }) => {
    // AI-generated test code
${this.indentCode(t.testCode, 4)}
  });`;
    }).join('\n\n');

    return `${imports}${describeBlock}\n${testBlocks}\n});`;
  }

  /**
   * Indent code lines
   */
  private indentCode(code: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return code.split('\n').map(line => indent + line).join('\n');
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.generatedTestsPath)) {
      fs.mkdirSync(this.generatedTestsPath, { recursive: true });
    }
  }
}

export default CodeBasedTestGenerator;
