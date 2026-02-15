/**
 * Overview Tab
 *
 * Contains all existing DeveloperPanel features:
 * - Stats Overview
 * - System Health
 * - Quick Actions
 * - Test User Management
 * - Table Browser
 * - SQL Query
 */

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
} from '@/components/shared';
import { apiClient } from '@/lib/api-client';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  PencilIcon,
  PlusIcon,
  ServerIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface DatabaseStats {
  orders: number;
  users: number;
  skus: number;
  auditLogs: number;
  pickTasks: number;
  binLocations: number;
  customRoles: number;
}

interface TableData {
  data: any[];
  total: number;
  limit: number;
  offset: number;
}

interface HealthInfo {
  database: {
    connected: boolean;
    latency: string;
    size: string;
    activeConnections: number;
  };
  environment: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
}

interface OverviewTabProps {
  onAddMessage?: (type: 'success' | 'error', text: string) => void;
}

export function OverviewTab({ onAddMessage }: OverviewTabProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [selectedTable, setSelectedTable] = useState('orders');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM orders LIMIT 10');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [testUserEmail, setTestUserEmail] = useState('test@example.com');
  const [testUserName, setTestUserName] = useState('Test User');
  const [testUserRole, setTestUserRole] = useState('PICKER');
  const [orderCount, setOrderCount] = useState(10);
  const [testUsers, setTestUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editUserRole, setEditUserRole] = useState('');

  // Confirm dialog states
  const [clearAuditConfirm, setClearAuditConfirm] = useState(false);
  const [resetOrdersConfirm, setResetOrdersConfirm] = useState(false);
  const [cancelAllOrdersConfirm, setCancelAllOrdersConfirm] = useState(false);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<{
    isOpen: boolean;
    userId: string;
    userEmail: string;
  }>({ isOpen: false, userId: '', userEmail: '' });

  const tables = [
    'orders',
    'users',
    'skus',
    'audit_logs',
    'pick_tasks',
    'bin_locations',
    'custom_roles',
    'user_role_assignments',
    'order_items',
    'carriers',
    'zones',
  ];

  useEffect(() => {
    loadStats();
    loadHealth();
    loadTestUsers();
  }, []);

  const addMessage = (type: 'success' | 'error', text: string) => {
    onAddMessage?.(type, text);
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/developer/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadHealth = async () => {
    try {
      const response = await apiClient.get('/developer/health');
      setHealth(response.data);
    } catch (error) {
      console.error('Failed to load health:', error);
    }
  };

  const loadTableData = async (table: string) => {
    setSelectedTable(table);
    try {
      const response = await apiClient.get(`/developer/tables/${table}`, { params: { limit: 20 } });
      setTableData(response.data);
    } catch (error) {
      addMessage('error', `Failed to load ${table} data`);
    }
  };

  const generateOrders = async () => {
    try {
      const response = await apiClient.post('/developer/generate-orders', { count: orderCount });
      addMessage('success', response.data.message);
      loadStats();
      if (selectedTable === 'orders') loadTableData('orders');
    } catch (error) {
      addMessage('error', 'Failed to generate orders');
    }
  };

  const clearAuditLogs = async () => {
    setClearAuditConfirm(true);
  };

  const confirmClearAuditLogs = async () => {
    try {
      const response = await apiClient.delete('/developer/clear-audit-logs');
      addMessage('success', response.data.message);
      loadStats();
      setClearAuditConfirm(false);
    } catch (error) {
      addMessage('error', 'Failed to clear audit logs');
    }
  };

  const resetOrders = async () => {
    setResetOrdersConfirm(true);
  };

  const confirmResetOrders = async () => {
    try {
      const response = await apiClient.post('/developer/reset-orders');
      addMessage('success', response.data.message);
      loadStats();
      if (selectedTable === 'orders') loadTableData('orders');
      setResetOrdersConfirm(false);
    } catch (error) {
      addMessage('error', 'Failed to reset orders');
    }
  };

  const cancelAllOrders = async () => {
    setCancelAllOrdersConfirm(true);
  };

  const confirmCancelAllOrders = async () => {
    try {
      const response = await apiClient.delete('/developer/cancel-all-orders');
      addMessage('success', response.data.message);
      loadStats();
      if (selectedTable === 'orders') loadTableData('orders');
      setCancelAllOrdersConfirm(false);
    } catch (error) {
      addMessage('error', 'Failed to cancel orders');
    }
  };

  const executeSql = async () => {
    try {
      const response = await apiClient.post('/developer/sql-query', { query: sqlQuery });
      setSqlResult(response.data);
      addMessage('success', `Query returned ${response.data.rowCount} rows`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message;
      setSqlResult({ error: errorMsg });
      addMessage('error', errorMsg);
    }
  };

  const createTestUser = async () => {
    try {
      const response = await apiClient.post('/developer/create-test-user', {
        email: testUserEmail,
        name: testUserName,
        role: testUserRole,
      });
      addMessage('success', `${response.data.message} - Password: ${response.data.password}`);
      setTestUserEmail('test@example.com');
      setTestUserName('Test User');
      setTestUserRole('PICKER');
      loadStats();
      loadTestUsers();
      if (selectedTable === 'users') loadTableData('users');
    } catch (error) {
      addMessage('error', 'Failed to create test user');
    }
  };

  const loadTestUsers = async () => {
    try {
      const response = await apiClient.get('/developer/test-users');
      setTestUsers(response.data.users);
    } catch (error) {
      addMessage('error', 'Failed to load test users');
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    setDeleteUserConfirm({ isOpen: true, userId, userEmail });
  };

  const confirmDeleteUser = async () => {
    try {
      const response = await apiClient.delete(`/developer/test-users/${deleteUserConfirm.userId}`);
      addMessage('success', response.data.message);
      loadTestUsers();
      loadStats();
      setDeleteUserConfirm({ isOpen: false, userId: '', userEmail: '' });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to delete user';
      addMessage('error', errorMsg);
    }
  };

  const updateUserRole = async (userId: string) => {
    try {
      const response = await apiClient.patch(`/developer/test-users/${userId}`, {
        baseRole: editUserRole,
      });
      addMessage('success', response.data.message);
      setEditingUser(null);
      setEditUserRole('');
      loadTestUsers();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to update user';
      addMessage('error', errorMsg);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await apiClient.patch(`/developer/test-users/${userId}`, {
        isActive: !currentStatus,
      });
      addMessage('success', response.data.message);
      loadTestUsers();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to update user status';
      addMessage('error', errorMsg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard key="orders" label="Orders" value={stats.orders} color="purple" />
          <StatCard key="users" label="Users" value={stats.users} color="blue" />
          <StatCard key="skus" label="SKUs" value={stats.skus} color="green" />
          <StatCard key="audit-logs" label="Audit Logs" value={stats.auditLogs} color="amber" />
          <StatCard key="pick-tasks" label="Pick Tasks" value={stats.pickTasks} color="red" />
          <StatCard
            key="bin-locations"
            label="Bin Locations"
            value={stats.binLocations}
            color="pink"
          />
          <StatCard
            key="custom-roles"
            label="Custom Roles"
            value={stats.customRoles}
            color="indigo"
          />
        </div>
      )}

      {/* Health Info */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Database</span>
                <p className="font-medium dark:text-white">
                  {health.database.connected ? (
                    <span className="text-green-500">Connected</span>
                  ) : (
                    <span className="text-red-500">Disconnected</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">DB Latency</span>
                <p className="font-medium dark:text-white">{health.database.latency}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">DB Size</span>
                <p className="font-medium dark:text-white">{health.database.size}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Active Connections</span>
                <p className="font-medium dark:text-white">{health.database.activeConnections}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Uptime</span>
                <p className="font-medium dark:text-white">{Math.floor(health.uptime / 60)}m</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium dark:text-gray-300">Generate Mock Orders</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={orderCount}
                  onChange={e => setOrderCount(parseInt(e.target.value) || 1)}
                  className="flex-1"
                />
                <Button onClick={generateOrders}>Generate</Button>
              </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-4">
              <label className="text-sm font-medium dark:text-gray-300">Order Management</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button variant="secondary" onClick={resetOrders}>
                  <ArrowPathIcon className="h-4 w-4 inline mr-1" />
                  Reset Orders
                </Button>
                <Button variant="secondary" onClick={cancelAllOrders}>
                  <XCircleIcon className="h-4 w-4 inline mr-1" />
                  Cancel All
                </Button>
              </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-4">
              <Button
                variant="secondary"
                onClick={clearAuditLogs}
                className="w-full text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4 inline mr-1" />
                Clear Audit Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Test User */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ServerIcon className="h-5 w-5" />
              Create Test User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Email (e.g., test@example.com)"
              value={testUserEmail}
              onChange={e => setTestUserEmail(e.target.value)}
            />
            <Input
              placeholder="Name (e.g., Test User)"
              value={testUserName}
              onChange={e => setTestUserName(e.target.value)}
            />
            <select
              value={testUserRole}
              onChange={e => setTestUserRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="PICKER">Picker</option>
              <option value="PACKER">Packer</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Admin</option>
              <option value="STOCK_CONTROLLER">Stock Controller</option>
            </select>
            <Button onClick={createTestUser} className="w-full">
              <PlusIcon className="h-4 w-4 inline mr-1" />
              Create Test User
            </Button>
          </CardContent>
        </Card>

        {/* Manage Test Users */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ServerIcon className="h-5 w-5" />
              Manage Test Users ({testUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testUsers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No test users found</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testUsers.map((user, index) => (
                  <div
                    key={user.user_id || `test-user-${index}`}
                    className={`flex items-center justify-between p-3 rounded-lg border dark:border-gray-700 ${
                      !user.is_active ? 'opacity-60 bg-gray-50 dark:bg-gray-800/50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium dark:text-white truncate">{user.name}</span>
                        {!user.is_active && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </div>
                      {editingUser === user.user_id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <select
                            value={editUserRole}
                            onChange={e => setEditUserRole(e.target.value)}
                            className="px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                          >
                            <option value="PICKER">Picker</option>
                            <option value="PACKER">Packer</option>
                            <option value="SUPERVISOR">Supervisor</option>
                            <option value="ADMIN">Admin</option>
                            <option value="STOCK_CONTROLLER">Stock Controller</option>
                          </select>
                          <Button
                            size="sm"
                            onClick={() => updateUserRole(user.user_id)}
                            className="px-2 py-1 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingUser(null);
                              setEditUserRole('');
                            }}
                            className="px-2 py-1 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Role: {user.base_role} • ID: {user.user_id}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                        className="p-1.5"
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {user.is_active ? (
                          <XCircleIcon className="h-4 w-4" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user.user_id);
                          setEditUserRole(user.base_role);
                        }}
                        className="p-1.5"
                        title="Edit role"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => deleteUser(user.user_id, user.email)}
                        className="p-1.5 text-red-600 hover:text-red-700"
                        title="Delete user"
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

        {/* Table Browser */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ServerIcon className="h-5 w-5" />
              Table Browser
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {tables.map(table => (
                <button
                  key={table}
                  onClick={() => loadTableData(table)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedTable === table
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {table}
                </button>
              ))}
            </div>

            {tableData && (
              <div className="overflow-x-auto">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Showing {tableData.data.length} of {tableData.total} records
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      {Object.keys(tableData.data[0] || {}).map(key => (
                        <th key={key} className="text-left p-2 dark:text-gray-300">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.data.slice(0, 10).map((row, i) => (
                      <tr key={`${selectedTable}-${i}`} className="border-b dark:border-gray-800">
                        {Object.values(row).map((val: any, j) => (
                          <td
                            key={`${selectedTable}-${i}-${j}`}
                            className="p-2 dark:text-gray-300 max-w-xs truncate"
                          >
                            {val === null ? (
                              <span className="text-gray-400">null</span>
                            ) : typeof val === 'object' ? (
                              JSON.stringify(val)
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SQL Query */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              SQL Query (SELECT only)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                className="flex-1 font-mono text-sm"
                onKeyDown={e => e.key === 'Enter' && executeSql()}
              />
              <Button onClick={executeSql}>Execute</Button>
            </div>

            {sqlResult && (
              <div className="mt-4">
                {sqlResult.error ? (
                  <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-300">
                    {sqlResult.error}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          {sqlResult.columns.map((col: string) => (
                            <th key={col} className="text-left p-2 dark:text-gray-300">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sqlResult.rows.map((row: any, i: number) => (
                          <tr key={`sql-result-${i}`} className="border-b dark:border-gray-800">
                            {sqlResult.columns.map((col: string) => (
                              <td
                                key={`${i}-${col}`}
                                className="p-2 dark:text-gray-300 max-w-xs truncate"
                              >
                                {row[col] === null ? (
                                  <span className="text-gray-400">null</span>
                                ) : (
                                  String(row[col])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {sqlResult.rowCount} rows returned
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={clearAuditConfirm}
        onClose={() => setClearAuditConfirm(false)}
        onConfirm={confirmClearAuditLogs}
        title="Clear Audit Logs"
        message="Are you sure you want to clear all audit logs?"
        confirmText="Clear"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={resetOrdersConfirm}
        onClose={() => setResetOrdersConfirm(false)}
        onConfirm={confirmResetOrders}
        title="Reset Orders"
        message="Reset all orders to pending status?"
        confirmText="Reset"
        cancelText="Cancel"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={cancelAllOrdersConfirm}
        onClose={() => setCancelAllOrdersConfirm(false)}
        onConfirm={confirmCancelAllOrders}
        title="Cancel All Orders"
        message="Cancel all orders?"
        confirmText="Cancel All"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={deleteUserConfirm.isOpen}
        onClose={() => setDeleteUserConfirm({ isOpen: false, userId: '', userEmail: '' })}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Delete user ${deleteUserConfirm.userEmail}?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
    blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    green: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    red: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
    pink: 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300',
    indigo: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
  };

  return (
    <Card className={colors[color]}>
      <CardContent className="pt-4">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm opacity-75">{label}</div>
      </CardContent>
    </Card>
  );
}
