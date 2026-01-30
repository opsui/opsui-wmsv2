/**
 * Testing Tools Tab
 *
 * Developer panel tab for testing and debugging
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  ConfirmDialog,
} from '@/components/shared';
import { JwtDecoder, JwtPermissionMatrix, type JwtPayload } from '@/components/shared/JwtDecoder';
import { apiClient } from '@/lib/api-client';
import {
  BeakerIcon,
  KeyIcon,
  UserIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BeakerIcon as FlaskIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

export interface TestPreset {
  id: string;
  name: string;
  description: string;
  orderCount: number;
}

export interface SessionInfo {
  userId: string;
  email: string;
  baseRole: string;
  effectiveRole: string;
  isLoggedIn: boolean;
  timestamp: string;
}

export interface E2ETestResults {
  success: boolean;
  exitCode: number;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: string;
  output: string;
}

export function TestingToolsTab() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [jwtPayload, setJwtPayload] = useState<JwtPayload | null>(null);
  const [presets, setPresets] = useState<TestPreset[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ type: 'success' | 'error'; text: string }>>([]);
  const [activeTab, setActiveTab] = useState<'auth' | 'presets' | 'session' | 'e2e' | 'workflows'>(
    'auth'
  );
  const [e2eResults, setE2eResults] = useState<E2ETestResults | null>(null);
  const [e2eRunning, setE2eRunning] = useState(false);
  const [workflowResults, setWorkflowResults] = useState<E2ETestResults | null>(null);
  const [workflowRunning, setWorkflowRunning] = useState(false);

  // Confirm dialog states
  const [loadPresetConfirm, setLoadPresetConfirm] = useState<{
    isOpen: boolean;
    presetId: string;
    presetName: string;
  }>({ isOpen: false, presetId: '', presetName: '' });
  const [clearStorageConfirm, setClearStorageConfirm] = useState(false);

  useEffect(() => {
    loadSessionInfo();
    loadPresets();
    loadPermissions();
    loadJwtFromStorage();
    loadE2EResults(true); // Auto-run if no results
    loadWorkflowResults(true); // Auto-run if no results
  }, []);

  const addMessage = (type: 'success' | 'error', text: string) => {
    setMessages(prev => [...prev, { type, text }]);
    setTimeout(() => {
      setMessages(prev => prev.slice(1));
    }, 5000);
  };

  const loadSessionInfo = async () => {
    try {
      const response = await apiClient.get('/developer/testing/session');
      setSessionInfo(response.data);
      setJwtPayload(response.data);
    } catch (error) {
      console.error('Failed to load session info:', error);
    }
  };

  const loadPresets = async () => {
    try {
      const response = await apiClient.get('/developer/testing/presets');
      setPresets(response.data.presets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await apiClient.get('/developer/testing/permissions');
      setPermissionMatrix(response.data);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const loadJwtFromStorage = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Parse JWT payload (base64 encoded middle part)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setJwtPayload(payload);
        }
      }
    } catch (error) {
      console.error('Failed to parse JWT from storage:', error);
    }
  };

  const loadPreset = async (presetId: string, presetName: string) => {
    setLoadPresetConfirm({ isOpen: true, presetId, presetName });
  };

  const confirmLoadPreset = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/developer/testing/load-preset', {
        presetId: loadPresetConfirm.presetId,
      });
      addMessage('success', response.data.message);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to load preset';
      addMessage('error', errorMsg);
    } finally {
      setLoading(false);
      setLoadPresetConfirm({ isOpen: false, presetId: '', presetName: '' });
    }
  };

  const clearStorage = () => {
    setClearStorageConfirm(true);
  };

  const confirmClearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    addMessage('success', 'Browser storage cleared');
    setClearStorageConfirm(false);
    setTimeout(() => window.location.reload(), 500);
  };

  const refreshToken = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    addMessage('success', 'Token cleared. Refreshing...');
    setTimeout(() => window.location.reload(), 500);
  };

  const runE2ETests = async () => {
    try {
      setE2eRunning(true);
      addMessage('success', 'Starting E2E tests...');

      const response = await apiClient.post('/developer/e2e/start');
      addMessage('success', response.data.message);

      // Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const resultsRes = await apiClient.get('/developer/e2e/results');
          setE2eResults(resultsRes.data);
          setE2eRunning(false);
          clearInterval(pollInterval);

          if (resultsRes.data.success) {
            addMessage(
              'success',
              `E2E tests completed: ${resultsRes.data.passed} passed, ${resultsRes.data.failed} failed`
            );
          } else {
            addMessage('error', `E2E tests failed: ${resultsRes.data.failed} failures`);
          }
        } catch (error) {
          // Results not ready yet, keep polling
        }
      }, 3000);
    } catch (error: any) {
      setE2eRunning(false);
      const errorMsg = error.response?.data?.error || 'Failed to start E2E tests';
      addMessage('error', errorMsg);
    }
  };

  const loadE2EResults = async (autoRunIfMissing = false) => {
    try {
      const response = await apiClient.get('/developer/e2e/results');
      setE2eResults(response.data);
    } catch (error: any) {
      // 404 is expected when no tests have been run yet - silently ignore
      if (error.response?.status === 404 && autoRunIfMissing && !e2eRunning) {
        // Auto-run tests if no results exist
        runE2ETests();
      } else if (error.response?.status !== 404) {
        console.error('Failed to load E2E results:', error);
      }
    }
  };

  const runWorkflowTests = async () => {
    try {
      setWorkflowRunning(true);
      addMessage('success', 'Starting workflow tests...');

      const response = await apiClient.post('/developer/workflows/start');
      addMessage('success', response.data.message);

      // Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const resultsRes = await apiClient.get('/developer/workflows/results');
          setWorkflowResults(resultsRes.data);
          setWorkflowRunning(false);
          clearInterval(pollInterval);

          if (resultsRes.data.success) {
            addMessage(
              'success',
              `Workflow tests completed: ${resultsRes.data.passed} passed, ${resultsRes.data.failed} failed`
            );
          } else {
            addMessage('error', `Workflow tests failed: ${resultsRes.data.failed} failures`);
          }
        } catch (error) {
          // Results not ready yet, keep polling
        }
      }, 3000);
    } catch (error: any) {
      setWorkflowRunning(false);
      const errorMsg = error.response?.data?.error || 'Failed to start workflow tests';
      addMessage('error', errorMsg);
    }
  };

  const loadWorkflowResults = async (autoRunIfMissing = false) => {
    try {
      const response = await apiClient.get('/developer/workflows/results');
      setWorkflowResults(response.data);
    } catch (error: any) {
      // 404 is expected when no tests have been run yet - silently ignore
      if (error.response?.status === 404 && autoRunIfMissing && !workflowRunning) {
        // Auto-run tests if no results exist
        runWorkflowTests();
      } else if (error.response?.status !== 404) {
        console.error('Failed to load workflow results:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 p-3 rounded-lg shadow-lg ${
              msg.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5" />
            )}
            <span className="text-sm">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Testing Tools</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Debug authentication, permissions, and load test data
          </p>
        </div>
        <Button onClick={loadSessionInfo} variant="secondary">
          <ClockIcon className="h-4 w-4 inline mr-1" />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b dark:border-gray-700">
        {[
          { id: 'auth', label: 'Auth Debugger', icon: KeyIcon },
          { id: 'presets', label: 'Test Data Presets', icon: BeakerIcon },
          { id: 'e2e', label: 'E2E Tests', icon: FlaskIcon },
          { id: 'workflows', label: 'Workflows', icon: CpuChipIcon },
          { id: 'session', label: 'Session Inspector', icon: UserIcon },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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

      {/* Auth Debugger */}
      {activeTab === 'auth' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <JwtDecoder payload={jwtPayload} />
          <JwtPermissionMatrix payload={jwtPayload} />
        </div>
      )}

      {/* Test Data Presets */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map(preset => (
            <Card key={preset.id}>
              <CardHeader>
                <CardTitle className="text-base">{preset.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {preset.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{preset.orderCount} orders</span>
                  <Button
                    size="sm"
                    onClick={() => loadPreset(preset.id, preset.name)}
                    disabled={loading}
                  >
                    <PlayIcon className="h-3 w-3 inline mr-1" />
                    Load
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* E2E Tests */}
      {activeTab === 'e2e' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FlaskIcon className="h-5 w-5" />
                End-to-End Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Run E2E tests with assertions to verify critical user workflows and business logic.
              </p>
              <Button onClick={runE2ETests} disabled={e2eRunning} className="w-full">
                <PlayIcon className="h-4 w-4 inline mr-2" />
                {e2eRunning ? 'Running E2E Tests...' : 'Run E2E Tests'}
              </Button>

              {e2eRunning && (
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin">
                      <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      Running tests... This may take a minute.
                    </p>
                  </div>
                </div>
              )}

              {e2eResults && (
                <div className="space-y-4">
                  <h3 className="font-medium dark:text-white">Results</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-green-500">{e2eResults.passed}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Passed</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-red-500">{e2eResults.failed}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Failed</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-gray-500">{e2eResults.skipped}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Skipped</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold dark:text-white">{e2eResults.duration}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Duration</p>
                    </div>
                  </div>
                  {e2eResults.output && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium dark:text-white mb-2">Output</h4>
                      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-64">
                        {e2eResults.output}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workflow Tests */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CpuChipIcon className="h-5 w-5" />
                Business Workflow Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deep workflow testing that validates complete business processes (picking, packing,
                stock control, etc.). These tests verify actual business logic, not just page
                rendering.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <h4 className="text-sm font-medium dark:text-white mb-2">Workflows Tested:</h4>
                <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• Order Picking: Claim → Pick Items → Complete</li>
                  <li>• Packing: View Picked → Pack → Ship</li>
                  <li>• Stock Control: View Inventory → Adjust → Verify</li>
                  <li>• Dashboard: Metrics Display → Navigation</li>
                  <li>• User Roles: View Users → Manage Assignments</li>
                  <li>• Cross-Workflow Integration</li>
                </ul>
              </div>
              <Button onClick={runWorkflowTests} disabled={workflowRunning} className="w-full">
                <PlayIcon className="h-4 w-4 inline mr-2" />
                {workflowRunning ? 'Running Workflow Tests...' : 'Run Workflow Tests'}
              </Button>

              {workflowRunning && (
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin">
                      <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      Running workflow tests... This may take a few minutes.
                    </p>
                  </div>
                </div>
              )}

              {workflowResults && (
                <div className="space-y-4">
                  <h3 className="font-medium dark:text-white">Results</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-green-500">{workflowResults.passed}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Passed</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-red-500">{workflowResults.failed}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Failed</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-gray-500">{workflowResults.skipped}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Skipped</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold dark:text-white">
                        {workflowResults.duration}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Duration</p>
                    </div>
                  </div>
                  {workflowResults.output && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium dark:text-white mb-2">Output</h4>
                      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-64">
                        {workflowResults.output}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session Inspector */}
      {activeTab === 'session' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Current Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionInfo ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">User ID</span>
                    <span className="font-mono dark:text-white">{sessionInfo.userId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Email</span>
                    <span className="dark:text-white">{sessionInfo.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Base Role</span>
                    <span className="dark:text-white">{sessionInfo.baseRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Effective Role</span>
                    <span className="dark:text-white">{sessionInfo.effectiveRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Logged In</span>
                    <span className={sessionInfo.isLoggedIn ? 'text-green-500' : 'text-red-500'}>
                      {sessionInfo.isLoggedIn ? 'Yes' : 'No'}
                    </span>
                  </div>
                </dl>
              ) : (
                <p className="text-gray-500">No session info available</p>
              )}
            </CardContent>
          </Card>

          {/* Storage Inspector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DocumentDuplicateIcon className="h-5 w-5" />
                Browser Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">localStorage items</span>
                <p className="text-2xl font-bold dark:text-white">{localStorage.length}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  sessionStorage items
                </span>
                <p className="text-2xl font-bold dark:text-white">{sessionStorage.length}</p>
              </div>

              <div className="pt-4 border-t dark:border-gray-700 space-y-2">
                <Button variant="secondary" className="w-full text-sm" onClick={loadJwtFromStorage}>
                  Reload JWT from Storage
                </Button>
                <Button variant="secondary" className="w-full text-sm" onClick={refreshToken}>
                  Clear Token
                </Button>
                <Button
                  variant="secondary"
                  className="w-full text-sm text-red-600 hover:text-red-700"
                  onClick={clearStorage}
                >
                  <TrashIcon className="h-4 w-4 inline mr-1" />
                  Clear All Storage
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Permission Matrix */}
          {permissionMatrix && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Permission Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left p-2 dark:text-gray-300">Role</th>
                        {permissionMatrix.allRoles.map((role: string) => (
                          <th key={role} className="text-center p-2 dark:text-gray-300">
                            {role}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(permissionMatrix.matrix).map(
                        ([role, perms]: [string, any]) => (
                          <tr key={role} className="border-b dark:border-gray-800">
                            <td className="p-2 dark:text-white">{role}</td>
                            {permissionMatrix.allRoles.map((r: string) => {
                              const hasAccess = r === 'ADMIN' || role === r;
                              return (
                                <td key={r} className="text-center p-2">
                                  {hasAccess ? (
                                    <CheckCircleIcon className="h-4 w-4 text-green-500 inline" />
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={loadPresetConfirm.isOpen}
        onClose={() => setLoadPresetConfirm({ isOpen: false, presetId: '', presetName: '' })}
        onConfirm={confirmLoadPreset}
        title="Load Test Preset"
        message={`Load preset '${loadPresetConfirm.presetName}'? This will reset and replace current data.`}
        confirmText="Load"
        cancelText="Cancel"
        variant="warning"
        isLoading={loading}
      />

      <ConfirmDialog
        isOpen={clearStorageConfirm}
        onClose={() => setClearStorageConfirm(false)}
        onConfirm={confirmClearStorage}
        title="Clear Browser Storage"
        message="Clear all browser storage? This will log you out."
        confirmText="Clear"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
