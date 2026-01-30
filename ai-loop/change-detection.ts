/**
 * Change Detection and Test Prioritization System
 *
 * Detects code changes and prioritizes affected tests
 * Reduces test execution time by running only relevant tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { GLMClient } from './glm-client';

interface FileChange {
  file: string;
  type: 'added' | 'modified' | 'deleted';
  language: string;
  features: string[];
}

interface TestImpact {
  testPath: string;
  testName: string;
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  affectedFeatures: string[];
  reason: string;
}

interface ChangeAnalysis {
  summary: string;
  totalFilesChanged: number;
  languagesAffected: string[];
  featuresImpacted: string[];
  riskScore: number;
  recommendedTests: TestImpact[];
}

export class ChangeDetectionSystem {
  private glm: GLMClient;
  private cachePath: string;
  private lastCommitHash: string = '';
  private mtimeCache = new Map<string, { mtime: number }>();

  constructor(glm: GLMClient, cachePath = './ai-loop/.change-cache') {
    this.glm = glm;
    this.cachePath = cachePath;
    this.loadCache();
    this.loadModificationCache();
  }

  /**
   * Detect changes since last run
   */
  detectChanges(): FileChange[] {
    const changes: FileChange[] = [];

    try {
      // Get current commit hash
      const currentHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

      // If same as last run, no changes
      if (currentHash === this.lastCommitHash) {
        return [];
      }

      // Get changed files since last commit (or last 24 hours if first run)
      const baseCommit = this.lastCommitHash || 'HEAD@{1.day.ago}';
      const gitDiff = execSync(`git diff --name-status ${baseCommit} HEAD`, {
        encoding: 'utf8',
      }).trim();

      if (!gitDiff) {
        return [];
      }

      // Parse git diff output
      const lines = gitDiff.split('\n');
      for (const line of lines) {
        const match = line.match(/^([AMD])\s+(.+)$/);
        if (match) {
          const [, status, filePath] = match;
          const language = this.detectLanguage(filePath);

          changes.push({
            file: filePath,
            type: status === 'A' ? 'added' : status === 'D' ? 'deleted' : 'modified',
            language,
            features: this.extractFeatures(filePath, language),
          });
        }
      }

      // Update cache
      this.lastCommitHash = currentHash;
      this.saveCache();
    } catch (error) {
      console.log('  ⚠️  Git change detection failed:', (error as Error).message);
    }

    return changes;
  }

  /**
   * Detect changes from file system (no git required)
   */
  detectFilesystemChanges(scanPaths: string[]): FileChange[] {
    const changes: FileChange[] = [];

    for (const scanPath of scanPaths) {
      if (!fs.existsSync(scanPath)) continue;

      const stat = fs.statSync(scanPath);
      const cacheKey = scanPath;
      const cacheEntry = this.mtimeCache.get(cacheKey);

      if (!cacheEntry) {
        // New file
        changes.push({
          file: scanPath,
          type: 'added',
          language: this.detectLanguage(scanPath),
          features: this.extractFeatures(scanPath, this.detectLanguage(scanPath)),
        });
      } else if (stat.mtimeMs > cacheEntry.mtime) {
        // Modified file
        changes.push({
          file: scanPath,
          type: 'modified',
          language: this.detectLanguage(scanPath),
          features: this.extractFeatures(scanPath, this.detectLanguage(scanPath)),
        });
      }

      // Update cache
      this.mtimeCache.set(cacheKey, { mtime: stat.mtimeMs });
    }

    this.saveModificationCache();

    return changes;
  }

  /**
   * Analyze changes and prioritize tests
   */
  async analyzeChangesAndPrioritize(
    changes: FileChange[],
    availableTests: Array<{ path: string; name: string; coverage: string[] }>
  ): Promise<ChangeAnalysis> {
    if (changes.length === 0) {
      return {
        summary: 'No changes detected',
        totalFilesChanged: 0,
        languagesAffected: [],
        featuresImpacted: [],
        riskScore: 0,
        recommendedTests: [],
      };
    }

    console.log(`  📊 Analyzing ${changes.length} changed files...`);

    // Group changes by language and feature
    const languages = new Set<string>();
    const features = new Set<string>();
    const changeDetails: string[] = [];

    for (const change of changes) {
      languages.add(change.language);
      change.features.forEach(f => features.add(f));
      changeDetails.push(`${change.type}: ${change.file} (${change.language})`);
    }

    // Use AI to determine impact
    const impactAnalysis = await this.glm.analyzeChangeImpact({
      changes: changeDetails,
      languages: Array.from(languages),
      features: Array.from(features),
      availableTests: availableTests.map(t => ({ name: t.name, coverage: t.coverage })),
    });

    return {
      summary: `Detected ${changes.length} file changes affecting ${features.size} features`,
      totalFilesChanged: changes.length,
      languagesAffected: Array.from(languages),
      featuresImpacted: Array.from(features),
      riskScore: impactAnalysis.riskScore,
      recommendedTests: impactAnalysis.impactedTests.map(t => ({
        testPath: availableTests.find(at => at.name === t.testName)?.path || t.testName,
        testName: t.testName,
        impactLevel: t.impactLevel,
        affectedFeatures: t.affectedFeatures,
        reason: t.reason,
      })),
    };
  }

  /**
   * Get prioritized test list
   */
  getPrioritizedTests(
    analysis: ChangeAnalysis,
    availableTests: Array<{ path: string; name: string; coverage: string[] }>
  ): Array<{ test: { path: string; name: string; coverage: string[] }; priority: number }> {
    // If we have AI recommendations, use them
    if (analysis.recommendedTests.length > 0) {
      const result: Array<{
        test: { path: string; name: string; coverage: string[] };
        priority: number;
      }> = [];

      for (const rec of analysis.recommendedTests) {
        const test = availableTests.find(t => t.name === rec.testName);
        if (test) {
          const priority =
            rec.impactLevel === 'critical'
              ? 100
              : rec.impactLevel === 'high'
                ? 75
                : rec.impactLevel === 'medium'
                  ? 50
                  : 25;
          result.push({ test, priority });
        }
      }

      return result.sort((a, b) => b.priority - a.priority);
    }

    // Fallback: use feature matching
    return availableTests
      .map(test => {
        const intersection = test.coverage.filter(f => analysis.featuresImpacted.includes(f));
        const priority = intersection.length * 10;
        return { test, priority };
      })
      .filter(t => t.priority > 0)
      .sort((a, b) => b.priority - a.priority);
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
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.sql': 'sql',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Extract features from file path and content
   */
  private extractFeatures(filePath: string, language: string): string[] {
    const features: string[] = [];

    // Extract from path
    const pathParts = filePath.split(path.sep);
    for (const part of pathParts) {
      if (
        [
          'orders',
          'stock',
          'inventory',
          'users',
          'auth',
          'shipping',
          'picking',
          'packing',
          'dashboard',
          'reports',
        ].includes(part.toLowerCase())
      ) {
        features.push(part.toLowerCase());
      }
    }

    // Extract from filename
    const filename = path.basename(filePath).toLowerCase();
    if (filename.includes('order')) features.push('orders');
    if (filename.includes('user')) features.push('users');
    if (filename.includes('auth')) features.push('authentication');
    if (filename.includes('stock') || filename.includes('inventory')) features.push('inventory');
    if (filename.includes('pick')) features.push('picking');
    if (filename.includes('pack')) features.push('packing');

    // For source files, try to extract from content
    if (['typescript', 'javascript', 'python', 'java'].includes(language)) {
      try {
        const fullPath = path.resolve(filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const keywords = [
            'order',
            'sku',
            'user',
            'auth',
            'role',
            'permission',
            'stock',
            'inventory',
            'location',
            'bin',
            'warehouse',
            'pick',
            'pack',
            'ship',
            'receive',
            'return',
          ];

          for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
            if (regex.test(content)) {
              features.push(keyword);
            }
          }
        }
      } catch {}
    }

    return [...new Set(features)];
  }

  /**
   * Load modification time cache into class member
   */
  private loadModificationCache(): void {
    try {
      if (fs.existsSync(this.cachePath + '.mtime')) {
        const data = fs.readFileSync(this.cachePath + '.mtime', 'utf-8');
        const obj = JSON.parse(data);
        this.mtimeCache = new Map(Object.entries(obj).map(([k, v]) => [k, v as { mtime: number }]));
      }
    } catch {}
  }

  /**
   * Save modification time cache from class member
   */
  private saveModificationCache(): void {
    try {
      const obj = Object.fromEntries(this.mtimeCache);
      fs.writeFileSync(this.cachePath + '.mtime', JSON.stringify(obj, null, 2));
    } catch {}
  }

  /**
   * Load change cache
   */
  private loadCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, 'utf-8');
        const parsed = JSON.parse(data);
        this.lastCommitHash = parsed.lastCommitHash || '';
      }
    } catch {}
  }

  /**
   * Save change cache
   */
  private saveCache() {
    try {
      const data = JSON.stringify({ lastCommitHash: this.lastCommitHash });
      fs.writeFileSync(this.cachePath, data);
    } catch {}
  }
}

export default ChangeDetectionSystem;
