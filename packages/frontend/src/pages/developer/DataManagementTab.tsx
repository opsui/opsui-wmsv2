/**
 * Data Management Tab
 *
 * Developer panel tab for database data management
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, ConfirmDialog } from '@/components/shared';
import { apiClient } from '@/lib/api-client';
import {
  CircleStackIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export interface SeedScenario {
  scenario_id: string;
  name: string;
  description: string | null;
  data: any;
  created_at: string;
  created_by: string | null;
}

export interface ExportData {
  timestamp: string;
  tables: Record<string, any[]>;
}

export function DataManagementTab() {
  const [scenarios, setScenarios] = useState<SeedScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [messages, setMessages] = useState<Array<{ type: 'success' | 'error'; text: string }>>([]);

  // Confirm dialog states
  const [applyScenarioConfirm, setApplyScenarioConfirm] = useState<{ isOpen: boolean; scenarioId: string; scenarioName: string }>({ isOpen: false, scenarioId: '', scenarioName: '' });
  const [deleteScenarioConfirm, setDeleteScenarioConfirm] = useState<{ isOpen: boolean; scenarioId: string; scenarioName: string }>({ isOpen: false, scenarioId: '', scenarioName: '' });
  const [importDataConfirm, setImportDataConfirm] = useState<{ isOpen: boolean; fileName: string; data: any }>({ isOpen: false, fileName: '', data: null });
  const [resetDatabaseConfirm, setResetDatabaseConfirm] = useState<{ isOpen: boolean; type: 'fresh' | 'with-orders' | 'full'; typeName: string }>({ isOpen: false, type: 'fresh', typeName: '' });

  useEffect(() => {
    loadScenarios();
  }, []);

  const addMessage = (type: 'success' | 'error', text: string) => {
    setMessages(prev => [...prev, { type, text }]);
    setTimeout(() => {
      setMessages(prev => prev.slice(1));
    }, 5000);
  };

  const loadScenarios = async () => {
    try {
      const response = await apiClient.get('/developer/data/scenarios');
      setScenarios(response.data.scenarios);
    } catch (error) {
      addMessage('error', 'Failed to load scenarios');
    }
  };

  const saveScenario = async () => {
    if (!createForm.name) {
      addMessage('error', 'Name is required');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post('/developer/data/scenarios', createForm);
      addMessage('success', `Scenario '${createForm.name}' saved successfully`);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });
      loadScenarios();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to save scenario';
      addMessage('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const applyScenario = async (scenarioId: string, scenarioName: string) => {
    setApplyScenarioConfirm({ isOpen: true, scenarioId, scenarioName });
  };

  const confirmApplyScenario = async () => {
    try {
      setLoading(true);
      await apiClient.post(`/developer/data/scenarios/${applyScenarioConfirm.scenarioId}/apply`);
      addMessage('success', `Scenario '${applyScenarioConfirm.scenarioName}' applied successfully`);
      setApplyScenarioConfirm({ isOpen: false, scenarioId: '', scenarioName: '' });
      window.location.reload();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to apply scenario';
      addMessage('error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const deleteScenario = async (scenarioId: string, scenarioName: string) => {
    setDeleteScenarioConfirm({ isOpen: true, scenarioId, scenarioName });
  };

  const confirmDeleteScenario = async () => {
    try {
      await apiClient.delete(`/developer/data/scenarios/${deleteScenarioConfirm.scenarioId}`);
      addMessage('success', `Scenario '${deleteScenarioConfirm.scenarioName}' deleted`);
      loadScenarios();
      setDeleteScenarioConfirm({ isOpen: false, scenarioId: '', scenarioName: '' });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to delete scenario';
      addMessage('error', errorMsg);
    }
  };

  const exportData = async () => {
    try {
      const response = await apiClient.get('/developer/data/export');
      const data: ExportData = response.data;

      // Create a blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wms-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addMessage('success', 'Data exported successfully');
    } catch (error) {
      addMessage('error', 'Failed to export data');
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: ExportData = JSON.parse(text);

      if (!data.tables) {
        addMessage('error', 'Invalid import file format');
        return;
      }

      setImportDataConfirm({ isOpen: true, fileName: file.name, data });
    } catch (error) {
      addMessage('error', 'Failed to parse import file');
    }
  };

  const confirmImportData = async () => {
    if (!importDataConfirm.data) return;

    try {
      setLoading(true);
      await apiClient.post('/developer/data/import', importDataConfirm.data);
      addMessage('success', 'Data imported successfully');
      setImportDataConfirm({ isOpen: false, fileName: '', data: null });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to import data';
      addMessage('error', errorMsg);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const resetDatabase = async (type: 'fresh' | 'with-orders' | 'full') => {
    const typeNames = {
      fresh: 'Fresh (clean with users)',
      'with-orders': 'With Orders (includes sample data)',
      full: 'Full Reset (completely empty)',
    };

    setResetDatabaseConfirm({ isOpen: true, type, typeName: typeNames[type] });
  };

  const confirmResetDatabase = async () => {
    try {
      setLoading(true);
      await apiClient.post('/developer/data/reset', { type: resetDatabaseConfirm.type });
      addMessage('success', `Database reset to ${resetDatabaseConfirm.typeName}`);
      setResetDatabaseConfirm({ isOpen: false, type: 'fresh', typeName: '' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to reset database';
      addMessage('error', errorMsg);
    } finally {
      setLoading(false);
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
              msg.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
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
          <h2 className="text-2xl font-bold dark:text-white">Data Management</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage database snapshots and data imports/exports
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 inline mr-1" />
          Save Scenario
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownTrayIcon className="h-5 w-5" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Download all database data as a JSON file
            </p>
            <Button onClick={exportData} className="w-full">
              <ArrowDownTrayIcon className="h-4 w-4 inline mr-1" />
              Export
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpTrayIcon className="h-5 w-5" />
              Import Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Import database data from a JSON file
            </p>
            <label className="block">
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
                disabled={loading}
              />
              <Button className="w-full" disabled={loading} as="span">
                <ArrowUpTrayIcon className="h-4 w-4 inline mr-1" />
                Import
              </Button>
            </label>
          </CardContent>
        </Card>

        {/* Reset */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <TrashIcon className="h-5 w-5" />
              Reset Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Reset database to a clean state
            </p>
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => resetDatabase('fresh')}
                className="w-full"
                disabled={loading}
              >
                Fresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => resetDatabase('with-orders')}
                className="w-full"
                disabled={loading}
              >
                With Orders
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => resetDatabase('full')}
                className="w-full text-red-600 hover:text-red-700"
                disabled={loading}
              >
                Full Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CircleStackIcon className="h-5 w-5" />
            Saved Scenarios ({scenarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scenarios.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <DocumentDuplicateIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No saved scenarios</p>
              <p className="text-sm mt-2">Save a scenario to quickly restore database states</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.scenario_id}
                  className="flex items-start gap-4 p-4 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium dark:text-white">{scenario.name}</h3>
                    {scenario.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {scenario.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Created {new Date(scenario.created_at).toLocaleString()}
                      {scenario.created_by && ` • by ${scenario.created_by}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => applyScenario(scenario.scenario_id, scenario.name)}
                      disabled={loading}
                    >
                      Apply
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => deleteScenario(scenario.scenario_id, scenario.name)}
                      className="p-2 text-red-600 hover:text-red-700"
                      disabled={loading}
                      title="Delete scenario"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Scenario Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-lg">Save Current State as Scenario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Name
                </label>
                <Input
                  placeholder="e.g., Clean State with 5 Orders"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Description
                </label>
                <Input
                  placeholder="What's in this scenario?"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                  This will save a snapshot of all current database data. Large datasets may take time to save.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({ name: '', description: '' });
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={saveScenario} disabled={loading || !createForm.name}>
                  {loading ? 'Saving...' : 'Save Scenario'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={applyScenarioConfirm.isOpen}
        onClose={() => setApplyScenarioConfirm({ isOpen: false, scenarioId: '', scenarioName: '' })}
        onConfirm={confirmApplyScenario}
        title="Apply Scenario"
        message={`Apply scenario '${applyScenarioConfirm.scenarioName}'? This will replace all current data.`}
        confirmText="Apply"
        cancelText="Cancel"
        variant="warning"
        isLoading={loading}
      />

      <ConfirmDialog
        isOpen={deleteScenarioConfirm.isOpen}
        onClose={() => setDeleteScenarioConfirm({ isOpen: false, scenarioId: '', scenarioName: '' })}
        onConfirm={confirmDeleteScenario}
        title="Delete Scenario"
        message={`Delete scenario '${deleteScenarioConfirm.scenarioName}'?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={importDataConfirm.isOpen}
        onClose={() => setImportDataConfirm({ isOpen: false, fileName: '', data: null })}
        onConfirm={confirmImportData}
        title="Import Data"
        message={`Import data from ${importDataConfirm.fileName}? This will replace all current data.`}
        confirmText="Import"
        cancelText="Cancel"
        variant="warning"
        isLoading={loading}
      />

      <ConfirmDialog
        isOpen={resetDatabaseConfirm.isOpen}
        onClose={() => setResetDatabaseConfirm({ isOpen: false, type: 'fresh', typeName: '' })}
        onConfirm={confirmResetDatabase}
        title="Reset Database"
        message={`Reset database to ${resetDatabaseConfirm.typeName}? This cannot be undone.`}
        confirmText="Reset"
        cancelText="Cancel"
        variant="danger"
        isLoading={loading}
      />
    </div>
  );
}
