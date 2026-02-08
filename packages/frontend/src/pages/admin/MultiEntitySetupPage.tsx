/**
 * Multi-Entity Setup Page
 *
 * Admin interface for managing multi-company, multi-subsidiary ERP structure.
 * Includes entity hierarchy, inter-company transactions, consolidation rules, and entity user assignments.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Badge,
  Breadcrumb,
  Modal,
  Form,
  Input,
  Select,
  LoadingSpinner,
} from '@/components/shared';
import {
  BuildingOffice2Icon,
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  ArrowPathIcon,
  UsersIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

// Types
interface Entity {
  entity_id: string;
  entity_code: string;
  entity_name: string;
  entity_type: 'HEAD_OFFICE' | 'SUBSIDIARY' | 'BRANCH' | 'DIVISION';
  entity_status: 'ACTIVE' | 'INACTIVE' | 'PENDING_SETUP' | 'CLOSED';
  base_currency: string;
  hierarchy_level: number;
  parent_entity_id: string | null;
  is_active: boolean;
}

interface IntercompanyTransaction {
  transaction_id: string;
  transaction_number: string;
  from_entity_id: string;
  to_entity_id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  currency: string;
  transaction_status: string;
}

interface ConsolidationRule {
  rule_id: string;
  parent_entity_id: string;
  subsidiary_entity_id: string;
  consolidation_method: string;
  ownership_percentage: number;
  is_active: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MultiEntitySetupPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'entities' | 'transactions' | 'consolidation' | 'users'
  >('entities');

  // Entities state
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityHierarchy, setEntityHierarchy] = useState<any>(null);
  const [isLoadingEntities, setIsLoadingEntities] = useState(true);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  // Transactions state
  const [transactions, setTransactions] = useState<IntercompanyTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Consolidation state
  const [consolidationRules, setConsolidationRules] = useState<ConsolidationRule[]>([]);
  const [isLoadingConsolidation, setIsLoadingConsolidation] = useState(false);

  // Load entities on mount
  useEffect(() => {
    loadEntities();
    loadEntityHierarchy();
  }, []);

  const loadEntities = async () => {
    setIsLoadingEntities(true);
    try {
      const response = await fetch('/api/v1/multi-entity/entities', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEntities(data);
      }
    } catch (error) {
      console.error('Failed to load entities:', error);
    } finally {
      setIsLoadingEntities(false);
    }
  };

  const loadEntityHierarchy = async () => {
    try {
      const response = await fetch('/api/v1/multi-entity/entities/hierarchy', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEntityHierarchy(data);
      }
    } catch (error) {
      console.error('Failed to load entity hierarchy:', error);
    }
  };

  const loadTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const response = await fetch('/api/v1/multi-entity/transactions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const loadConsolidationRules = async () => {
    setIsLoadingConsolidation(true);
    try {
      const response = await fetch('/api/v1/multi-entity/consolidation-rules', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setConsolidationRules(data);
      }
    } catch (error) {
      console.error('Failed to load consolidation rules:', error);
    } finally {
      setIsLoadingConsolidation(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'transactions' && transactions.length === 0) {
      loadTransactions();
    } else if (activeTab === 'consolidation' && consolidationRules.length === 0) {
      loadConsolidationRules();
    }
  }, [activeTab]);

  // Entity type badge color
  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'HEAD_OFFICE':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'SUBSIDIARY':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'BRANCH':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'DIVISION':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Entity status badge color
  const getEntityStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'INACTIVE':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'PENDING_SETUP':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'CLOSED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Render hierarchy tree
  const renderHierarchyNode = (node: any, level = 0) => {
    const indent = level * 24;
    return (
      <div key={node.entity_id} className="select-none">
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
          style={{ marginLeft: `${indent}px` }}
          onClick={() =>
            setSelectedEntity(entities.find(e => e.entity_id === node.entity_id) || null)
          }
        >
          {node.children && node.children.length > 0 ? (
            <BuildingOffice2Icon className="h-5 w-5 text-blue-400" />
          ) : (
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
          )}
          <span className="text-sm font-medium text-white">{node.entity_name}</span>
          <Badge className={getEntityTypeColor(node.entity_type)} size="sm">
            {node.entity_type.replace('_', ' ')}
          </Badge>
          <span className="text-xs text-gray-500 ml-auto">{node.entity_code}</span>
        </div>
        {node.children && node.children.map((child: any) => renderHierarchyNode(child, level + 1))}
      </div>
    );
  };

  // ============================================================================
  // TABS
  // ============================================================================

  const tabs = [
    { id: 'entities', label: 'Entities', icon: BuildingOffice2Icon },
    { id: 'transactions', label: 'Inter-Company Transactions', icon: ArrowPathIcon },
    { id: 'consolidation', label: 'Consolidation Rules', icon: ChartBarIcon },
    { id: 'users', label: 'Entity Users', icon: UsersIcon },
  ];

  // ============================================================================
  // ENTITIES TAB
  // ============================================================================

  const renderEntitiesTab = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BuildingOffice2Icon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{entities.length}</p>
                <p className="text-xs text-gray-400">Total Entities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <BuildingOfficeIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {entities.filter(e => e.is_active).length}
                </p>
                <p className="text-xs text-gray-400">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <BuildingOffice2Icon className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {entities.filter(e => e.entity_type === 'SUBSIDIARY').length}
                </p>
                <p className="text-xs text-gray-400">Subsidiaries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <BuildingOfficeIcon className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {entities.filter(e => e.entity_type === 'BRANCH').length}
                </p>
                <p className="text-xs text-gray-400">Branches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entity Hierarchy */}
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Entity Hierarchy</CardTitle>
            <Button size="sm" onClick={() => setShowEntityModal(true)}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Entity
            </Button>
          </CardHeader>
          <CardContent>
            {entityHierarchy ? (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {entityHierarchy.map((node: any) => renderHierarchyNode(node))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">No entity hierarchy found</div>
            )}
          </CardContent>
        </Card>

        {/* Entity List */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>All Entities</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingEntities ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {entities.map(entity => (
                  <div
                    key={entity.entity_id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                    onClick={() => setSelectedEntity(entity)}
                  >
                    <div className="flex items-center gap-3">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-white">{entity.entity_name}</p>
                        <p className="text-xs text-gray-500">
                          {entity.entity_code} • {entity.base_currency}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getEntityTypeColor(entity.entity_type)} size="sm">
                        {entity.entity_type.replace('_', ' ')}
                      </Badge>
                      <Badge className={getEntityStatusColor(entity.entity_status)} size="sm">
                        {entity.entity_status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // ============================================================================
  // TRANSACTIONS TAB
  // ============================================================================

  const renderTransactionsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Inter-Company Transactions</h3>
          <p className="text-sm text-gray-400">Track transactions between entities</p>
        </div>
        <Button onClick={() => setShowTransactionModal(true)}>
          <PlusIcon className="h-4 w-4 mr-1" />
          New Transaction
        </Button>
      </div>

      <Card variant="glass">
        <CardContent className="p-0">
          {isLoadingTransactions ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : transactions.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Transaction #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {transactions.map(tx => (
                  <tr key={tx.transaction_id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {tx.transaction_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {tx.transaction_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {tx.currency} {Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={
                          tx.transaction_status === 'POSTED'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : tx.transaction_status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }
                        size="sm"
                      >
                        {tx.transaction_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button size="sm" variant="ghost">
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-400">
              No inter-company transactions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // CONSOLIDATION TAB
  // ============================================================================

  const renderConsolidationTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Consolidation Rules</h3>
          <p className="text-sm text-gray-400">Configure financial consolidation rules</p>
        </div>
        <Button>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Rule
        </Button>
      </div>

      <Card variant="glass">
        <CardContent className="p-0">
          {isLoadingConsolidation ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : consolidationRules.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Parent Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Subsidiary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Ownership
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {consolidationRules.map(rule => {
                  const parent = entities.find(e => e.entity_id === rule.parent_entity_id);
                  const subsidiary = entities.find(e => e.entity_id === rule.subsidiary_entity_id);
                  return (
                    <tr key={rule.rule_id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {parent?.entity_name || rule.parent_entity_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {subsidiary?.entity_name || rule.subsidiary_entity_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {rule.consolidation_method.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {rule.ownership_percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          className={
                            rule.is_active
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }
                          size="sm"
                        >
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button size="sm" variant="ghost">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-400">No consolidation rules found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // USERS TAB
  // ============================================================================

  const renderUsersTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Entity User Assignments</h3>
          <p className="text-sm text-gray-400">Manage which users can access which entities</p>
        </div>
        <Button>
          <PlusIcon className="h-4 w-4 mr-1" />
          Assign User
        </Button>
      </div>

      <Card variant="glass">
        <CardContent className="p-12 text-center text-gray-400">
          <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Entity user assignments coming soon</p>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Multi-Entity Setup' }]} />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Multi-Entity Setup</h1>
            <p className="text-gray-400 mt-1">Manage your multi-company ERP structure</p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'entities' && renderEntitiesTab()}
        {activeTab === 'transactions' && renderTransactionsTab()}
        {activeTab === 'consolidation' && renderConsolidationTab()}
        {activeTab === 'users' && renderUsersTab()}
      </div>

      {/* Entity Modal Placeholder */}
      <Modal
        isOpen={showEntityModal}
        onClose={() => setShowEntityModal(false)}
        title={selectedEntity ? 'Edit Entity' : 'Add Entity'}
      >
        <div className="p-6">
          <p className="text-gray-400">Entity form coming soon...</p>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEntityModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowEntityModal(false)}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
