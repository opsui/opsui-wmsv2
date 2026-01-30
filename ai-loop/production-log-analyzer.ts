/**
 * Production Log Analysis for Test Generation
 *
 * Analyzes production logs to generate real-world test scenarios
 * Identifies edge cases, errors, and usage patterns
 */

import * as fs from 'fs';
import { GLMClient } from './glm-client';

interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  userId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  error?: string;
  stack?: string;
  metadata?: Record<string, any>;
}

interface GeneratedTestFromLogs {
  name: string;
  description: string;
  sourceLogs: string[];
  steps: Array<{
    action: string;
    target: string;
    value?: any;
  }>;
  expectedBehavior: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'error-reproduction' | 'edge-case' | 'load-pattern' | 'security';
}

export class ProductionLogAnalyzer {
  private glm: GLMClient;
  private logCache = new Map<string, LogEntry[]>();

  constructor(glm: GLMClient) {
    this.glm = glm;
  }

  /**
   * Parse log file
   */
  parseLogFile(filePath: string, format: 'json' | 'apache' | 'nginx' | 'custom' = 'json'): LogEntry[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Log file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const entries: LogEntry[] = [];

    if (format === 'json') {
      const lines = content.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          entries.push({
            timestamp: parsed.timestamp || parsed.time || new Date().toISOString(),
            level: parsed.level || parsed.severity || 'info',
            message: parsed.message || parsed.msg || '',
            userId: parsed.userId || parsed.user?.id,
            route: parsed.route || parsed.path || parsed.url,
            method: parsed.method,
            statusCode: parsed.status || parsed.statusCode,
            error: parsed.error,
            stack: parsed.stack,
            metadata: parsed,
          });
        } catch {}
      }
    } else if (format === 'apache' || format === 'nginx') {
      // Common Log Format / Combined Log Format
      const logPattern = /^(\S+) \S+ \S+ \[([\w:\/]+\s[+\-]\d{4})\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+|-) "([^"]*)" "([^"]*)"/;
      const lines = content.split('\n').filter(Boolean);

      for (const line of lines) {
        const match = line.match(logPattern);
        if (match) {
          entries.push({
            timestamp: match[2],
            level: parseInt(match[6]) >= 500 ? 'error' : parseInt(match[6]) >= 400 ? 'warn' : 'info',
            message: `${match[3]} ${match[4]}`,
            route: match[4],
            method: match[3],
            statusCode: parseInt(match[6]),
          });
        }
      }
    }

    return entries;
  }

  /**
   * Analyze logs and generate test scenarios
   */
  async analyzeAndGenerateTests(
    logEntries: LogEntry[],
    options: {
      timeframe?: string;
      minOccurrences?: number;
      focusCategories?: Array<'error' | 'performance' | 'security' | 'edge-case'>;
    } = {}
  ): Promise<{
    summary: string;
    criticalIssues: number;
    generatedTests: GeneratedTestFromLogs[];
    recommendations: string[];
  }> {
    console.log(`  📊 Analyzing ${logEntries.length} log entries...`);

    const { minOccurrences = 3, focusCategories = ['error', 'security', 'edge-case'] } = options;

    // Group logs by pattern
    const errorPatterns = this.extractErrorPatterns(logEntries);
    const edgeCases = this.extractEdgeCases(logEntries);
    const securityEvents = this.extractSecurityEvents(logEntries);
    const performanceIssues = this.extractPerformanceIssues(logEntries);

    // Filter by occurrence threshold
    const frequentErrors = errorPatterns.filter(e => e.count >= minOccurrences);
    const frequentEdgeCases = edgeCases.filter(e => e.count >= minOccurrences);

    console.log(`    🐛 Errors: ${frequentErrors.length}`);
    console.log(`    🔀 Edge cases: ${frequentEdgeCases.length}`);
    console.log(`    🔒 Security events: ${securityEvents.length}`);

    // Use AI to generate tests
    const analysisResult = await this.glm.analyzeProductionLogs({
      logEntries: logEntries.slice(0, 100), // Limit for API
      timeframe: options.timeframe || 'last 24 hours',
    });

    // Build generated tests
    const generatedTests: GeneratedTestFromLogs[] = [];

    // From AI analysis
    for (const criticalIssue of analysisResult.criticalIssues) {
      for (const testSpec of criticalIssue.suggestedTests) {
        generatedTests.push({
          name: testSpec.name,
          description: `Test for: ${criticalIssue.issue}`,
          sourceLogs: [criticalIssue.issue],
          steps: testSpec.steps.map(s => ({
            action: s.split(':')[0] || 'click',
            target: s.split(':').slice(1).join(':') || s,
          })),
          expectedBehavior: testSpec.expectedBehavior,
          priority: criticalIssue.frequency > 10 ? 'critical' : 'high',
          category: 'error-reproduction',
        });
      }
    }

    // From edge cases
    for (const edgeCase of analysisResult.edgeCases) {
      generatedTests.push({
        name: `Edge case: ${edgeCase.scenario}`,
        description: edgeCase.testDescription,
        sourceLogs: edgeCases.slice(0, 3).map(e => e.message),
        steps: [],
        expectedBehavior: 'Should handle edge case gracefully',
        priority: 'medium',
        category: 'edge-case',
      });
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      frequentErrors,
      securityEvents,
      performanceIssues
    );

    return {
      summary: `Analyzed ${logEntries.length} logs, found ${analysisResult.criticalIssues.length} critical issues`,
      criticalIssues: analysisResult.criticalIssues.length,
      generatedTests,
      recommendations,
    };
  }

  /**
   * Extract error patterns from logs
   */
  private extractErrorPatterns(logEntries: LogEntry[]): Array<{
    pattern: string;
    message: string;
    count: number;
    affectedUsers: number;
    sampleLogs: string[];
  }> {
    const errorMap = new Map<string, {
      count: number;
      users: Set<string>;
      samples: string[];
    }>();

    for (const entry of logEntries) {
      if (entry.level === 'error') {
        // Create pattern key from error message
        const pattern = this.createErrorPattern(entry.message || entry.error || '');

        if (!errorMap.has(pattern)) {
          errorMap.set(pattern, {
            count: 0,
            users: new Set(),
            samples: [],
          });
        }

        const data = errorMap.get(pattern)!;
        data.count++;
        if (entry.userId) data.users.add(entry.userId);
        if (data.samples.length < 3) {
          data.samples.push(entry.message || entry.error || '');
        }
      }
    }

    return Array.from(errorMap.entries()).map(([pattern, data]) => ({
      pattern,
      message: data.samples[0] || '',
      count: data.count,
      affectedUsers: data.users.size,
      sampleLogs: data.samples,
    }));
  }

  /**
   * Extract edge cases from logs
   */
  private extractEdgeCases(logEntries: LogEntry[]): Array<{
    scenario: string;
    message: string;
    count: number;
    samples: string[];
  }> {
    const edgeCases: Array<{
      scenario: string;
      message: string;
      count: number;
      samples: string[];
    }> = [];

    // Look for specific patterns
    const patterns = [
      { name: 'Null/undefined values', regex: /null|undefined|cannot read/i },
      { name: 'Empty data', regex: /empty array|no results|not found/i },
      { name: 'Boundary values', regex: /overflow|underflow|maximum|minimum/i },
      { name: 'Encoding issues', regex: /encoding|utf-8|character|unicode/i },
      { name: 'Timeout issues', regex: /timeout|timed out|deadline/i },
    ];

    for (const pattern of patterns) {
      const matching = logEntries.filter(e =>
        pattern.regex.test(e.message) || pattern.regex.test(e.error || '')
      );

      if (matching.length > 0) {
        edgeCases.push({
          scenario: pattern.name,
          message: matching[0].message,
          count: matching.length,
          samples: matching.slice(0, 3).map(e => e.message),
        });
      }
    }

    return edgeCases;
  }

  /**
   * Extract security events from logs
   */
  private extractSecurityEvents(logEntries: LogEntry[]): Array<{
    type: string;
    count: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }> {
    const securityEvents: Array<{
      type: string;
      count: number;
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
    }> = [];

    // Security patterns
    const patterns = [
      { name: 'SQL Injection attempts', regex: /sql injection|\' OR \'\'/i, severity: 'critical' as const },
      { name: 'XSS attempts', regex: /<script>|javascript:|onerror=/i, severity: 'critical' as const },
      { name: 'Authentication failures', regex: /authentication failed|invalid token|unauthorized/i, severity: 'high' as const },
      { name: 'Authorization failures', regex: /access denied|forbidden|not authorized/i, severity: 'high' as const },
      { name: 'Rate limiting', regex: /rate limit|too many requests/i, severity: 'medium' as const },
    ];

    for (const pattern of patterns) {
      const matching = logEntries.filter(e =>
        pattern.regex.test(e.message) || pattern.regex.test(e.error || '')
      );

      if (matching.length > 0) {
        securityEvents.push({
          type: pattern.name,
          count: matching.length,
          severity: pattern.severity,
          description: `Detected ${matching.length} potential ${pattern.name}`,
        });
      }
    }

    return securityEvents;
  }

  /**
   * Extract performance issues from logs
   */
  private extractPerformanceIssues(logEntries: LogEntry[]): Array<{
    type: string;
    count: number;
    averageDuration?: number;
    description: string;
  }> {
    const issues: Array<{
      type: string;
      count: number;
      averageDuration?: number;
      description: string;
    }> = [];

    // Slow request patterns
    const slowRequests = logEntries.filter(e => {
      const durationMatch = e.message.match(/duration[:\s]+(\d+)ms/i);
      return durationMatch && parseInt(durationMatch[1]) > 3000;
    });

    if (slowRequests.length > 0) {
      issues.push({
        type: 'Slow requests',
        count: slowRequests.length,
        description: `Found ${slowRequests.length} requests taking >3s`,
      });
    }

    // High memory usage
    const highMemory = logEntries.filter(e =>
      /memory|heap|allocation/i.test(e.message) &&
      (/high|large|exceed/i.test(e.message) || /error/i.test(e.level))
    );

    if (highMemory.length > 0) {
      issues.push({
        type: 'Memory issues',
        count: highMemory.length,
        description: `Found ${highMemory.length} memory-related issues`,
      });
    }

    return issues;
  }

  /**
   * Create error pattern key
   */
  private createErrorPattern(message: string): string {
    // Remove variable parts to create pattern
    return message
      .replace(/\d+/g, 'N')
      .replace(/['"][^'"]*['"]/g, '""')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, 'IP')
      .slice(0, 100);
  }

  /**
   * Generate recommendations from analysis
   */
  private generateRecommendations(
    errors: Array<{ pattern: string; count: number; affectedUsers: number }>,
    security: Array<{ type: string; severity: string }>,
    performance: Array<{ type: string }>
  ): string[] {
    const recommendations: string[] = [];

    if (errors.length > 0) {
      const topError = errors.sort((a, b) => b.count - a.count)[0];
      recommendations.push(`Focus on "${topError.pattern}" - occurred ${topError.count} times affecting ${topError.affectedUsers} users`);
    }

    const criticalSecurity = security.filter(s => s.severity === 'critical');
    if (criticalSecurity.length > 0) {
      recommendations.push(`URGENT: Address ${criticalSecurity.length} critical security issues: ${criticalSecurity.map(s => s.type).join(', ')}`);
    }

    if (performance.length > 0) {
      recommendations.push(`Investigate performance issues: ${performance.map(p => p.type).join(', ')}`);
    }

    return recommendations;
  }
}

export default ProductionLogAnalyzer;
