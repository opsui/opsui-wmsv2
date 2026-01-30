/**
 * Crawler Tab
 *
 * Developer panel tab for running and managing the error crawler
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/shared';
import { apiClient } from '@/lib/api-client';
import {
  PlayIcon,
  StopIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ChartBarIcon,
  BugAntIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClockIcon,
  GlobeAltIcon,
  ClipboardIcon,
} from '@heroicons/react/24/outline';

interface CrawlerStats {
  duration: number;
  totalErrors: number;
  totalAPIFailures: number;
  routesCovered: number;
  totalRoutes: number;
  totalElements: number;
  interactedElements: number;
  coverage: number;
  tabsTested: number;
  byType: Record<string, number>;
}

interface CrawlerStatus {
  isRunning: boolean;
  lastRun: string | null;
  lastResults: CrawlerStats | null;
  log: Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }>;
}

interface ErrorEntry {
  id: string;
  type: string;
  count: number;
  routes: string[];
  message: string;
  priority: string;
  suggestedFix?: string;
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
    searches: { total: number; tested: number; failed: number };
  };
}

export function CrawlerTab() {
  const [status, setStatus] = useState<CrawlerStatus>({
    isRunning: false,
    lastRun: null,
    lastResults: null,
    log: [],
  });
  const [activeView, setActiveView] = useState<'dashboard' | 'errors' | 'coverage'>('dashboard');
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [coverage, setCoverage] = useState<CoverageEntry[]>([]);

  useEffect(() => {
    loadCrawlerStatus();
  }, []);

  // Auto-poll when crawler is running, and load results when completed
  useEffect(() => {
    if (status.isRunning) {
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await apiClient.get('/developer/crawler/status');
          setStatus(prev => ({ ...prev, ...statusRes.data }));

          // When crawler completes, load full results
          if (!statusRes.data.isRunning) {
            await loadCrawlerStatus();
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [status.isRunning]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setStatus(prev => ({
      ...prev,
      log: [...prev.log, { timestamp: new Date().toISOString(), message, type }].slice(-50),
    }));
  };

  const loadCrawlerStatus = async () => {
    try {
      const response = await apiClient.get('/developer/crawler/status');
      setStatus(prev => ({ ...prev, ...response.data }));
      if (response.data.lastResults) {
        setErrors(response.data.lastResults.errors || []);
        // Coverage array is now in coverageArray field
        setCoverage((response.data.lastResults.coverageArray || []) as CoverageEntry[]);
      }
    } catch (error) {
      console.error('Failed to load crawler status:', error);
      addLog('Failed to load crawler status', 'error');
    }
  };

  const startCrawler = async () => {
    try {
      addLog('Starting crawler...', 'info');
      const response = await apiClient.post('/developer/crawler/start');
      addLog(response.data.message, 'success');

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await apiClient.get('/developer/crawler/status');
          setStatus(prev => ({ ...prev, ...statusRes.data }));

          if (!statusRes.data.isRunning) {
            clearInterval(pollInterval);
            addLog('Crawler completed!', 'success');
            await loadCrawlerStatus();
          }
        } catch (error) {
          clearInterval(pollInterval);
          addLog('Error checking crawler status', 'error');
        }
      }, 2000);

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to start crawler';
      addLog(errorMsg, 'error');
    }
  };

  const stopCrawler = async () => {
    try {
      addLog('Stopping crawler...', 'warning');
      await apiClient.post('/developer/crawler/stop');
      addLog('Crawler stopped', 'info');
      await loadCrawlerStatus();
    } catch (error: any) {
      addLog('Failed to stop crawler', 'error');
    }
  };

  const downloadResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      status,
      errors,
      coverage,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crawler-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addLog('Results downloaded', 'success');
  };

  const copyErrorsForClaude = () => {
    // Format errors into an optimized prompt for Claude Code
    // Following industry best practices for AI-assisted development workflows
    const errorGroups = errors.reduce((acc, error) => {
      if (!acc[error.type]) {
        acc[error.type] = [];
      }
      acc[error.type].push(error);
      return acc;
    }, {} as Record<string, typeof errors>);

    // Get critical/high priority errors for focus
    const criticalErrors = errors.filter(e => e.priority === 'critical' || e.priority === 'high');
    const affectedRoutes = [...new Set(errors.flatMap(e => e.routes))];

    const timestamp = new Date().toISOString();
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });

    let prompt = `# 🐛 WMS Error Analysis & Fix Request

**Generated**: ${currentDate} (${timestamp})
**Total Errors**: ${errors.length} across ${Object.keys(errorGroups).length} categories
**Critical/High Priority**: ${criticalErrors.length} errors

---

## 📋 Executive Summary

I ran a comprehensive Playwright crawler on my Warehouse Management System. The crawler tested ${
      status.lastResults?.routesCovered || 'N/A'
    } routes, interacted with ${status.lastResults?.interactedElements || 'N/A'} elements, and found **${errors.length} distinct errors**.

**Affected Routes**: ${affectedRoutes.length} routes impacted
**Coverage**: ${status.lastResults?.coverage || 'N/A'}% of application tested

---

## 🏗️ Technical Context

### Architecture Overview
\`\`\`
packages/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components (routing)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities (api-client, etc.)
│   │   └── services/     # API service layer
│   └── package.json
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── repositories/ # Data access layer
│   │   ├── middleware/   # Auth, validation, etc.
│   │   └── db/           # Database client
│   └── package.json
├── shared/            # Shared TypeScript types
└── ai-loop/           # E2E tests with Playwright
\`\`\`

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Heroicons, React Router
- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **Auth**: JWT (wms-auth-storage in localStorage)
- **State**: Zustand with persist middleware
- **Testing**: Playwright, Vitest
- **Build**: Vite (frontend), tsc (backend)

### Key Patterns Used
- **Authentication**: JWT stored in \`localStorage['wms-auth-storage']\` with Zustand persist
- **API Client**: Centralized in \`packages/frontend/src/lib/api-client.ts\`
- **Routing**: React Router v6 with ProtectedRoute wrapper
- **Error Handling**: Try-catch with toast notifications
- **Component Structure**: Atomic design with shared components folder

---

## 🚨 Critical Errors (Immediate Action Required)

`;

    // Add critical/high priority errors first
    if (criticalErrors.length > 0) {
      criticalErrors.slice(0, 5).forEach((error, idx) => {
        prompt += `### ${idx + 1}. ${error.message}\n\n`;
        prompt += `**Priority**: 🔴 ${error.priority.toUpperCase()}\n`;
        prompt += `**Type**: \`${error.type}\`\n`;
        prompt += `**Occurrences**: ${error.count}x\n`;
        prompt += `**Affected Routes**:\n`;
        error.routes.slice(0, 3).forEach(route => {
          prompt += `  - \`${route}\`\n`;
        });
        if (error.routes.length > 3) {
          prompt += `  - ... and ${error.routes.length - 3} more\n`;
        }
        if (error.suggestedFix) {
          prompt += `**💡 Suggested Fix**: ${error.suggestedFix}\n`;
        }
        prompt += `**Error ID**: \`${error.id}\`\n\n`;
      });
      if (criticalErrors.length > 5) {
        prompt += `*... and ${criticalErrors.length - 5} more critical/high priority errors*\n\n`;
      }
    } else {
      prompt += `✅ No critical or high priority errors found!\n\n`;
    }

    prompt += `---

## 📊 Complete Error Breakdown

`;

    // Add error breakdown by type
    Object.entries(errorGroups).forEach(([type, typeErrors]) => {
      const icon = type.includes('auth') ? '🔐' :
                   type.includes('api') ? '🌐' :
                   type.includes('route') ? '🛣️' :
                   type.includes('element') ? '🖱️' :
                   type.includes('console') ? '💻' :
                   type.includes('page') ? '📄' : '⚠️';

      prompt += `${icon} **${type.toUpperCase()}** (${typeErrors.length} errors)\n\n`;

      // Show all errors of this type (not just top 5)
      typeErrors.forEach((error, idx) => {
        const priorityIcon = error.priority === 'critical' ? '🔴' :
                            error.priority === 'high' ? '🟠' :
                            error.priority === 'medium' ? '🟡' : '⚪';
        prompt += `#### ${priorityIcon} ${idx + 1}. ${error.message}\n\n`;
        prompt += `- **Priority**: ${error.priority}\n`;
        prompt += `- **Occurrences**: ${error.count}x\n`;
        prompt += `- **Affected Routes**: ${error.routes.slice(0, 5).join(', ')}`;
        if (error.routes.length > 5) {
          prompt += ` (+${error.routes.length - 5} more)`;
        }
        prompt += `\n`;
        if (error.suggestedFix) {
          prompt += `- **Suggested Fix**: ${error.suggestedFix}\n`;
        }
        prompt += `- **Error ID**: \`${error.id}\`\n\n`;
      });
    });

    // Add coverage summary
    if (status.lastResults) {
      prompt += `---

## 📈 Test Coverage Summary

| Metric | Value |
|--------|-------|
| Routes Tested | ${status.lastResults.routesCovered}/${status.lastResults.totalRoutes} |
| Coverage Percentage | ${status.lastResults.coverage}% |
| Total Elements Found | ${status.lastResults.totalElements} |
| Elements Interacted With | ${status.lastResults.interactedElements} |
| Unique Errors | ${errors.length} |

`;
    }

    prompt += `---

## 🎯 Success Criteria

Please ensure your fixes meet these criteria:

1. ✅ **Functional**: The feature works as expected in all affected routes
2. ✅ **No Regressions**: Existing functionality remains intact
3. ✅ **Type-Safe**: All TypeScript types are correct (no \`any\` unless necessary)
4. ✅ **Error Handling**: Proper try-catch with user-friendly error messages
5. ✅ **Accessibility**: WCAG AA compliant (ARIA labels, keyboard navigation)
6. ✅ **Responsive**: Works on mobile, tablet, and desktop viewports
7. ✅ **Performance**: No significant performance degradation
8. ✅ **Test Coverage**: Include tests for fixed functionality

---

## 📝 Expected Output Format

For each fix, please provide:

\`\`\`
## Fix: [Error Title]

### 📁 Files Modified
- \`path/to/file.ts\` (lines X-Y: description)

### 🔄 Changes Made
\`\`\`typescript
// Show the exact code change
\`\`\`

### ✅ Verification Steps
1. Step to verify the fix works
2. Another step
3. Edge case to test

### 🔗 Related Issues Fixed
- Mention if this fix resolves other related errors

### ⚠️ Notes
- Any caveats, trade-offs, or follow-up work needed
\`\`\`

---

## 🚦 Workflow Instructions

1. **Start with Critical/High priority** errors (listed above)
2. **Group related fixes** - fix multiple errors in one PR if they're related
3. **Test each fix** - verify locally before marking complete
4. **Document changes** - include clear commit messages
5. **Re-run crawler** - verify no regressions after each fix

---

## 📚 Additional Context

- **Base URL**: \`http://localhost:5173\` (frontend), \`http://localhost:3001\` (backend)
- **Default Admin**: \`admin@wms.local\` / \`admin123\`
- **Auth Storage**: \`localStorage['wms-auth-storage']\`
- **Test Files**: \`ai-loop/crawl.spec.ts\` (crawler), \`ai-loop/e2e.spec.ts\` (E2E tests)

---

## ⚡ Quick Reference

- API endpoints: \`packages/backend/src/routes/\`
- Components: \`packages/frontend/src/components/\`
- Pages: \`packages/frontend/src/pages/\`
- Types: \`packages/shared/src/types/\`
- Tests: \`ai-loop/\`

---

*This prompt was generated by the WMS Error Crawler. For questions about the error detection methodology, see \`ai-loop/crawl.spec.ts\`.*
`;

    // Copy to clipboard
    navigator.clipboard.writeText(prompt).then(() => {
      addLog(`Copied ${errors.length} errors to clipboard for Claude`, 'success');
    }).catch(() => {
      addLog('Failed to copy errors to clipboard', 'error');
    });
  };

  const clearResults = async () => {
    try {
      // Clear local state
      setStatus(prev => ({ ...prev, log: [] }));

      // Clear backend results
      await apiClient.delete('/developer/crawler/results');
      addLog('Results cleared', 'success');

      // Reload to verify clear
      await loadCrawlerStatus();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to clear results';
      addLog(errorMsg, 'error');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <GlobeAltIcon className="h-6 w-6" />
            Error Crawler
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Automated site testing and error detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadCrawlerStatus}
            variant="secondary"
            disabled={status.isRunning}
          >
            <ArrowPathIcon className="h-4 w-4 inline mr-1" />
            Refresh
          </Button>
          {status.isRunning ? (
            <Button
              onClick={stopCrawler}
              variant="secondary"
              className="bg-red-600 hover:bg-red-700"
              data-skip-crawler="true"
            >
              <StopIcon className="h-4 w-4 inline mr-1" />
              Stop
            </Button>
          ) : (
            <Button
              onClick={startCrawler}
              disabled={status.isRunning}
            >
              <PlayIcon className="h-4 w-4 inline mr-1" />
              Run Crawler
            </Button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {status.isRunning && (
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin">
              <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Crawler is running...</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">This may take several minutes</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {status.lastResults && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Coverage</p>
                  <p className="text-2xl font-bold dark:text-white">{status.lastResults.coverage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Routes</p>
                  <p className="text-2xl font-bold dark:text-white">
                    {status.lastResults.routesCovered}/{status.lastResults.totalRoutes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BugAntIcon className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Errors</p>
                  <p className="text-2xl font-bold dark:text-white">{status.lastResults.totalErrors}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">API Failures</p>
                  <p className="text-2xl font-bold dark:text-white">{status.lastResults.totalAPIFailures}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Elements</p>
                  <p className="text-2xl font-bold dark:text-white">{status.lastResults.interactedElements}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Duration</p>
                  <p className="text-2xl font-bold dark:text-white">
                    {Math.round(status.lastResults.duration / 1000)}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Tabs */}
      <div className="border-b dark:border-gray-700">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
          { id: 'errors', label: 'Errors', icon: BugAntIcon },
          { id: 'coverage', label: 'Coverage', icon: GlobeAltIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          {/* Last Run Info */}
          {status.lastRun && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Last Run</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(status.lastRun).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => setActiveView('errors')}
                disabled={!status.lastResults || status.lastResults.totalErrors === 0}
                className="w-full"
              >
                <BugAntIcon className="h-4 w-4 inline mr-2" />
                View {status.lastResults?.totalErrors || 0} Errors
              </Button>
              <Button
                onClick={() => setActiveView('coverage')}
                disabled={!status.lastResults}
                className="w-full"
              >
                <GlobeAltIcon className="h-4 w-4 inline mr-2" />
                View Coverage Report
              </Button>
              <Button
                onClick={downloadResults}
                disabled={!status.lastResults}
                variant="secondary"
                className="w-full"
              >
                <ArrowDownTrayIcon className="h-4 w-4 inline mr-2" />
                Download Results
              </Button>
              <Button
                onClick={startCrawler}
                disabled={status.isRunning}
                className="w-full"
              >
                <PlayIcon className="h-4 w-4 inline mr-2" />
                Run New Crawl
              </Button>
            </CardContent>
          </Card>

          {/* Error Types */}
          {status.lastResults?.byType && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Error Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(status.lastResults.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
                      <span className="text-sm font-medium dark:text-white capitalize">{type}</span>
                      <span className="text-sm font-bold dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Activity Log</span>
                <Button size="sm" variant="secondary" onClick={clearResults}>
                  Clear
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {status.log.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
                ) : (
                  status.log.map((entry, i) => {
                    const isError = entry.type === 'error';
                    const isSuccess = entry.type === 'success';
                    return (
                      <div key={i} className={`flex items-start gap-2 text-sm py-1 ${
                        isError ? 'text-red-600' : isSuccess ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        <span className="font-mono text-xs flex-shrink-0">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="flex-1">{entry.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Errors View */}
      {activeView === 'errors' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Error Details</span>
              {errors.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={copyErrorsForClaude}
                  className="flex items-center gap-1"
                >
                  <ClipboardIcon className="h-4 w-4" />
                  Copy for Claude
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {errors.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No errors found!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {errors.slice(0, 50).map((error) => (
                  <div key={error.id} className="border dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {error.id}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${getPriorityColor(error.priority)}`}>
                          {error.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {error.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {error.count}x
                      </span>
                    </div>

                    <div className="mb-2">
                      <p className="text-sm dark:text-white font-medium">{error.message}</p>
                      {error.suggestedFix && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          💡 {error.suggestedFix}
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Routes: {error.routes.join(', ')}
                    </div>
                  </div>
                ))}
                {errors.length > 50 && (
                  <p className="text-center text-sm text-gray-500 py-4">
                    Showing 50 of {errors.length} errors
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Coverage View */}
      {activeView === 'coverage' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Route Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            {coverage.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No coverage data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left p-2 dark:text-gray-300">Route</th>
                      <th className="text-left p-2 dark:text-gray-300">Status</th>
                      <th className="text-center p-2 dark:text-gray-300">Load Time</th>
                      <th className="text-center p-2 dark:text-gray-300">Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.map((route, idx) => {
                      const totalElements = route.elements.buttons.total + route.elements.links.total +
                                           route.elements.inputs.total + route.elements.searches.total;
                      const interacted = route.elements.buttons.clicked + route.elements.links.clicked +
                                        route.elements.inputs.filled + route.elements.searches.tested;
                      const coveragePct = totalElements > 0 ? Math.round((interacted / totalElements) * 100) : 0;

                      return (
                        <tr key={`${route.route}-${idx}`} className="border-b dark:border-gray-800">
                          <td className="p-2 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{route.routeName}</span>
                              <span className="text-xs text-gray-500">{route.route}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            {!route.visited && (
                              <span className="text-xs text-gray-500">Not visited</span>
                            )}
                            {!route.accessible && route.visited && (
                              <span className="text-xs text-orange-500">Not accessible</span>
                            )}
                            {route.accessible && (
                              <span className="text-xs text-green-500">OK</span>
                            )}
                          </td>
                          <td className="p-2 text-center dark:text-white">{route.loadTime}ms</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getCoverageColor(coveragePct)}`}>
                              {coveragePct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
