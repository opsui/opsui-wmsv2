/**
 * ERROR NORMALIZER v2.0
 *
 * Enhanced normalizer with:
 * - Coverage analysis
 * - API failure grouping
 * - Actionable error reports
 * - Fix suggestions
 */

import * as fs from 'fs';
import * as path from 'path';

interface ErrorEntry {
  type: string;
  route: string;
  routeName: string;
  element?: string;
  elementType?: string;
  message: string;
  stack?: string;
  url?: string;
  timestamp: string;
}

interface APIFailure {
  method: string;
  url: string;
  status: number;
  statusText: string;
  route: string;
  timestamp: string;
}

interface CoverageEntry {
  route: string;
  routeName: string;
  visited: boolean;
  accessible: boolean;
  loadTime: number;
  elements: {
    buttons: { total: number; clicked: number; failed: number };
    links: { total: number; clicked: number; failed: number };
    inputs: { total: number; filled: number; failed: number };
    forms: { total: number; submitted: number; failed: number };
    selects: { total: number; changed: number; failed: number };
    checkboxes: { total: number; checked: number; failed: number };
  };
}

interface NormalizedError {
  id: string;
  type: string;
  count: number;
  routes: string[];
  firstSeen: string;
  message: string;
  stack?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedFix?: string;
}

interface APIIssue {
  endpoint: string;
  status: number;
  count: number;
  routes: string[];
  methods: string[];
  priority: 'critical' | 'high' | 'medium';
}

interface ErrorReport {
  timestamp: string;
  duration: number;
  summary: {
    totalUniqueErrors: number;
    totalRawErrors: number;
    totalAPIIssues: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byRoute: Record<string, number>;
  };
  coverage: {
    routesVisited: number;
    totalRoutes: number;
    routeCoverage: number;
    elementStats: {
      totalElements: number;
      interactedElements: number;
      interactionCoverage: number;
    };
    uncoveredRoutes: string[];
    lowCoverageRoutes: Array<{ route: string; name: string; coverage: number }>;
  };
  errors: NormalizedError[];
  apiIssues: APIIssue[];
  quickFix: {
    file?: string;
    line?: number;
    error: string;
    suggestion: string;
  }[];
}

/**
 * Normalize errors
 */
function normalizeErrors(rawLog: any): ErrorReport {
  const errors = rawLog.errors || [];
  const apiFailures = rawLog.apiFailures || [];
  const coverage = rawLog.coverage || [];

  // Group errors by signature
  const errorGroups = new Map<string, {
    entries: ErrorEntry[];
    routes: Set<string>;
  }>();

  for (const err of errors) {
    const signature = `${err.type}:${err.message?.slice(0, 150) || 'unknown'}`;

    if (!errorGroups.has(signature)) {
      errorGroups.set(signature, {
        entries: [],
        routes: new Set(),
      });
    }

    const group = errorGroups.get(signature)!;
    group.entries.push(err);
    if (err.route) {
      group.routes.add(err.route);
    }
  }

  // Convert to normalized errors
  const normalizedErrors: NormalizedError[] = [];
  const byRoute: Record<string, number> = {};
  const byType: Record<string, number> = {};

  let id = 1;
  for (const [, group] of Array.from(errorGroups.entries())) {
    const firstEntry = group.entries[0];
    const routes = Array.from(group.routes) as string[];

    for (const route of routes) {
      byRoute[route] = (byRoute[route] || 0) + 1;
    }

    byType[firstEntry.type] = (byType[firstEntry.type] || 0) + 1;

    let priority: NormalizedError['priority'] = 'low';
    if (firstEntry.type === 'pageerror') {
      priority = 'critical';
    } else if (firstEntry.type === 'console-error') {
      priority = firstEntry.message?.includes('TypeError') ? 'high' : 'medium';
    } else if (firstEntry.type === 'route-failure') {
      priority = 'high';
    }

    normalizedErrors.push({
      id: `ERR-${String(id++).padStart(3, '0')}`,
      type: firstEntry.type,
      count: group.entries.length,
      routes: routes.sort(),
      firstSeen: rawLog.timestamp || new Date().toISOString(),
      message: firstEntry.message || 'No message',
      stack: firstEntry.stack,
      priority,
      suggestedFix: generateSuggestion(firstEntry),
    });
  }

  // Sort by priority and count
  normalizedErrors.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.count - a.count;
  });

  // Group API failures
  const apiGroups = new Map<string, APIIssue>();
  for (const failure of apiFailures) {
    const key = `${failure.url}:${failure.status}`;
    if (!apiGroups.has(key)) {
      apiGroups.set(key, {
        endpoint: failure.url,
        status: failure.status,
        count: 0,
        routes: [],
        methods: [],
        priority: failure.status >= 500 ? 'critical' : failure.status >= 400 ? 'high' : 'medium',
      });
    }
    const issue = apiGroups.get(key)!;
    issue.count++;
    if (!issue.routes.includes(failure.route)) {
      issue.routes.push(failure.route);
    }
    if (!issue.methods.includes(failure.method)) {
      issue.methods.push(failure.method);
    }
  }

  // Count by priority
  const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const err of normalizedErrors) {
    byPriority[err.priority]++;
  }

  // Analyze coverage
  const coverageAnalysis = analyzeCoverage(coverage);

  // Generate quick fix suggestions
  const quickFix = generateQuickFix(normalizedErrors, Array.from(apiGroups.values()));

  return {
    timestamp: new Date().toISOString(),
    duration: rawLog.duration || 0,
    summary: {
      totalUniqueErrors: normalizedErrors.length,
      totalRawErrors: errors.length,
      totalAPIIssues: apiGroups.size,
      byType,
      byPriority,
      byRoute,
    },
    coverage: coverageAnalysis,
    errors: normalizedErrors,
    apiIssues: Array.from(apiGroups.values()).sort((a, b) => b.count - a.count),
    quickFix,
  };
}

/**
 * Analyze coverage data
 */
function analyzeCoverage(coverage: CoverageEntry[]): ErrorReport['coverage'] {
  const visited = coverage.filter(c => c.visited);
  const accessible = coverage.filter(c => c.accessible);

  let totalElements = 0;
  let interactedElements = 0;
  const lowCoverageRoutes: Array<{ route: string; name: string; coverage: number }> = [];
  const uncoveredRoutes: string[] = [];

  for (const c of coverage) {
    if (!c.accessible) {
      uncoveredRoutes.push(`${c.routeName} (${c.route})`);
      continue;
    }

    const els = c.elements;
    const routeTotal = els.buttons.total + els.links.total + els.inputs.total +
                       els.selects.total + els.checkboxes.total;
    const routeInteracted = els.buttons.clicked + els.links.clicked + els.inputs.filled +
                            els.selects.changed + els.checkboxes.checked;

    totalElements += routeTotal;
    interactedElements += routeInteracted;

    const routeCoverage = routeTotal > 0 ? (routeInteracted / routeTotal) * 100 : 0;
    if (routeCoverage < 50 && routeTotal > 5) {
      lowCoverageRoutes.push({
        route: c.route,
        name: c.routeName,
        coverage: Math.round(routeCoverage),
      });
    }
  }

  return {
    routesVisited: visited.length,
    totalRoutes: coverage.length,
    routeCoverage: Math.round((visited.length / coverage.length) * 100),
    elementStats: {
      totalElements,
      interactedElements,
      interactionCoverage: totalElements > 0 ? Math.round((interactedElements / totalElements) * 100) : 0,
    },
    uncoveredRoutes,
    lowCoverageRoutes: lowCoverageRoutes.sort((a, b) => a.coverage - b.coverage),
  };
}

/**
 * Generate fix suggestion for an error
 */
function generateSuggestion(err: ErrorEntry): string | undefined {
  const msg = err.message;

  if (msg.includes('Cannot read') || msg.includes('undefined')) {
    return 'Add null check or optional chaining (?.)';
  }
  if (msg.includes('is not a function')) {
    return 'Check if function is imported/defined correctly';
  }
  if (msg.includes('404')) {
    return 'API endpoint not found - check route exists';
  }
  if (msg.includes('401') || msg.includes('403')) {
    return 'Authentication/authorization issue - check permissions';
  }
  if (msg.includes('500')) {
    return 'Server error - check backend logs';
  }
  if (msg.includes('Network error') || msg.includes('fetch')) {
    return 'Network failure - check backend is running';
  }

  return undefined;
}

/**
 * Generate quick fix suggestions
 */
function generateQuickFix(
  errors: NormalizedError[],
  apiIssues: APIIssue[]
): ErrorReport['quickFix'] {
  const suggestions: ErrorReport['quickFix'] = [];

  for (const err of errors) {
    const msg = err.message.slice(0, 100);

    if (err.type === 'pageerror' || err.type === 'console-error') {
      if (msg.includes('Cannot read') || msg.includes('undefined')) {
        suggestions.push({
          error: msg,
          suggestion: 'Null/undefined access. Add null check or optional chaining (?.)',
        });
      } else if (msg.includes('is not defined') || msg.includes('is not a function')) {
        suggestions.push({
          error: msg,
          suggestion: 'Undefined variable/function. Check import/definition.',
        });
      }
    } else if (err.type === 'click-failure') {
      suggestions.push({
        error: msg,
        suggestion: 'Element not clickable. Check if it\'s disabled, hidden, or needs user interaction.',
      });
    } else if (err.type === 'input-failure') {
      suggestions.push({
        error: msg,
        suggestion: 'Input field issue. Check if readonly, disabled, or has validation constraints.',
      });
    }
  }

  for (const api of apiIssues) {
    if (api.status >= 500) {
      suggestions.push({
        error: `API ${api.status}: ${api.endpoint}`,
        suggestion: 'Server error. Check backend logs and exception handling.',
      });
    } else if (api.status === 404) {
      suggestions.push({
        error: `API 404: ${api.endpoint}`,
        suggestion: 'Endpoint not found. Verify route is registered in backend.',
      });
    } else if (api.status === 401 || api.status === 403) {
      suggestions.push({
        error: `API ${api.status}: ${api.endpoint}`,
        suggestion: 'Auth issue. Check JWT token and user permissions.',
      });
    }
  }

  return suggestions;
}

/**
 * Main
 */
function main() {
  const errorLogPath = path.join(__dirname, 'error-log.json');

  if (!fs.existsSync(errorLogPath)) {
    console.error('❌ No error-log.json found. Run the crawler first.');
    console.error('   Run: npm run crawl');
    process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           ERROR NORMALIZATION v2.0                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Read raw error log
  const rawLog = JSON.parse(fs.readFileSync(errorLogPath, 'utf-8'));

  // Normalize
  const report = normalizeErrors(rawLog);

  // Write normalized report
  const reportPath = path.join(__dirname, 'normalized-errors.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('📊 SUMMARY:');
  console.log(`   Duration:         ${Math.round(report.duration / 1000)}s`);
  console.log(`   Raw Errors:       ${report.summary.totalRawErrors}`);
  console.log(`   Unique Errors:    ${report.summary.totalUniqueErrors}`);
  console.log(`   API Issues:       ${report.summary.totalAPIIssues}`);
  console.log(`   Routes Affected:  ${Object.keys(report.summary.byRoute).length}\n`);

  console.log('📍 COVERAGE:');
  console.log(`   Routes Visited:   ${report.coverage.routesVisited}/${report.coverage.totalRoutes} (${report.coverage.routeCoverage}%)`);
  console.log(`   Elements Found:   ${report.coverage.elementStats.totalElements}`);
  console.log(`   Elements Tested:  ${report.coverage.elementStats.interactedElements}`);
  console.log(`   Test Coverage:    ${report.coverage.elementStats.interactionCoverage}%\n`);

  if (report.coverage.uncoveredRoutes.length > 0) {
    console.log('⚠️  INACCESSIBLE ROUTES:');
    for (const route of report.coverage.uncoveredRoutes) {
      console.log(`   - ${route}`);
    }
    console.log('');
  }

  if (report.coverage.lowCoverageRoutes.length > 0) {
    console.log('📉 LOW COVERAGE ROUTES (<50%):');
    for (const route of report.coverage.lowCoverageRoutes.slice(0, 5)) {
      console.log(`   - ${route.name}: ${route.coverage}%`);
    }
    console.log('');
  }

  console.log('🐛 ERRORS BY TYPE:');
  for (const [type, count] of Object.entries(report.summary.byType)) {
    console.log(`   ${type.padEnd(20)} ${count}`);
  }

  console.log('\n🚨 ERRORS BY PRIORITY:');
  console.log(`   Critical: ${report.summary.byPriority.critical}`);
  console.log(`   High:     ${report.summary.byPriority.high}`);
  console.log(`   Medium:   ${report.summary.byPriority.medium}`);
  console.log(`   Low:      ${report.summary.byPriority.low}`);

  if (report.apiIssues.length > 0) {
    console.log('\n🌐 API ISSUES:');
    for (const api of report.apiIssues.slice(0, 5)) {
      console.log(`   [${api.status}] ${api.endpoint} (${api.count}x)`);
    }
  }

  if (report.errors.length > 0) {
    console.log('\n🔝 TOP ERRORS:');
    for (const err of report.errors.slice(0, 5)) {
      const routes = err.routes.slice(0, 2).join(', ');
      const more = err.routes.length > 2 ? ` +${err.routes.length - 2}` : '';
      console.log(`\n   [${err.id}] ${err.type.toUpperCase()} (${err.priority})`);
      console.log(`   Routes: ${routes}${more}`);
      console.log(`   Count: ${err.count}`);
      console.log(`   Message: ${err.message.slice(0, 80)}...`);
      if (err.suggestedFix) {
        console.log(`   Fix: ${err.suggestedFix}`);
      }
    }
  }

  console.log(`\n✅ Report saved to: ${reportPath}\n`);

  // Check if any critical errors
  if (report.summary.byPriority.critical > 0) {
    console.log('🔥 CRITICAL ERRORS FOUND - Immediate attention required!\n');
  } else if (report.summary.totalUniqueErrors === 0) {
    console.log('🎉 NO ERRORS FOUND - All systems operational!\n');
  }
}

// Run
main();
