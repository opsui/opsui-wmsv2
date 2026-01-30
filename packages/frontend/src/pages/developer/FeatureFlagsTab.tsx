/**
 * Feature Flags Tab
 *
 * Developer panel tab for managing feature flags
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  ConfirmDialog,
} from '@/components/shared';
import { ToggleSwitch, ToggleGroup } from '@/components/shared/ToggleSwitch';
import { apiClient } from '@/lib/api-client';
import {
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  InboxIcon,
  CubeIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

export interface FeatureFlag {
  flag_id: string;
  flag_key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  category: 'picking' | 'packing' | 'inventory' | 'shipping' | 'experimental';
  created_at: string;
  updated_at: string;
}

interface CategorySummary {
  category: string;
  count: number;
  enabled: number;
}

const categories = [
  { id: 'picking', name: 'Picking', icon: ClipboardDocumentListIcon, color: 'blue' },
  { id: 'packing', name: 'Packing', icon: CubeIcon, color: 'green' },
  { id: 'inventory', name: 'Inventory', icon: InboxIcon, color: 'purple' },
  { id: 'shipping', name: 'Shipping', icon: TruckIcon, color: 'amber' },
  { id: 'experimental', name: 'Experimental', icon: CogIcon, color: 'red' },
];

export function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [summary, setSummary] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    flag_key: '',
    name: '',
    description: '',
    category: 'experimental' as const,
  });
  const [messages, setMessages] = useState<Array<{ type: 'success' | 'error'; text: string }>>([]);

  // Confirm dialog states
  const [deleteFlagConfirm, setDeleteFlagConfirm] = useState<{ isOpen: boolean; flagKey: string }>({
    isOpen: false,
    flagKey: '',
  });

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/developer/feature-flags/categories');
      setSummary(response.data.summary);
      // Flatten all flags into a single array
      const allFlags = Object.values(response.data.flagsByCategory).flat() as FeatureFlag[];
      setFlags(allFlags);
    } catch (error) {
      addMessage('error', 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const addMessage = (type: 'success' | 'error', text: string) => {
    setMessages(prev => [...prev, { type, text }]);
    setTimeout(() => {
      setMessages(prev => prev.slice(1));
    }, 5000);
  };

  const handleToggleFlag = async (flagKey: string, currentState: boolean) => {
    try {
      const response = await apiClient.patch(`/developer/feature-flags/${flagKey}`, {
        isEnabled: !currentState,
      });

      setFlags(prev => prev.map(flag => (flag.flag_key === flagKey ? response.data.flag : flag)));
      addMessage('success', `Flag '${flagKey}' ${!currentState ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to update flag';
      addMessage('error', errorMsg);
    }
  };

  const handleCreateFlag = async () => {
    if (!createForm.flag_key || !createForm.name) {
      addMessage('error', 'Flag key and name are required');
      return;
    }

    try {
      const response = await apiClient.post('/developer/feature-flags', createForm);
      setFlags(prev => [...prev, response.data.flag]);
      setShowCreateModal(false);
      setCreateForm({ flag_key: '', name: '', description: '', category: 'experimental' });
      addMessage('success', `Flag '${createForm.name}' created successfully`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to create flag';
      addMessage('error', errorMsg);
    }
  };

  const handleDeleteFlag = async (flagKey: string) => {
    setDeleteFlagConfirm({ isOpen: true, flagKey });
  };

  const confirmDeleteFlag = async () => {
    try {
      await apiClient.delete(`/developer/feature-flags/${deleteFlagConfirm.flagKey}`);
      setFlags(prev => prev.filter(flag => flag.flag_key !== deleteFlagConfirm.flagKey));
      addMessage('success', `Flag '${deleteFlagConfirm.flagKey}' deleted`);
      setDeleteFlagConfirm({ isOpen: false, flagKey: '' });
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to delete flag';
      addMessage('error', errorMsg);
    }
  };

  const filteredFlags = flags.filter(flag => {
    const matchesSearch =
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.flag_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flag.description && flag.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || flag.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const groupedFlags = filteredFlags.reduce(
    (acc, flag) => {
      if (!acc[flag.category]) {
        acc[flag.category] = [];
      }
      acc[flag.category].push(flag);
      return acc;
    },
    {} as Record<string, FeatureFlag[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
              <XMarkIcon className="h-5 w-5" />
            )}
            <span className="text-sm">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Feature Flags</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage feature flags across the application
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 inline mr-1" />
          Create Flag
        </Button>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.map(cat => {
          const Icon = cat.icon;
          const catSummary = summary.find(s => s.category === cat.id);
          const count = catSummary?.count || 0;
          const enabled = catSummary?.enabled || 0;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${
                  selectedCategory === cat.id
                    ? `border-${cat.color}-500 bg-${cat.color}-50 dark:bg-${cat.color}-900/20`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-5 w-5 text-${cat.color}-500`} />
                <span className="font-medium dark:text-white">{cat.name}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {enabled} / {count} enabled
              </div>
              <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-${cat.color}-500`}
                  style={{ width: count > 0 ? `${(enabled / count) * 100}%` : '0%' }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search flags by name, key, or description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Flags by Category */}
      {Object.entries(groupedFlags).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
            <TagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No feature flags found</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedFlags).map(([category, categoryFlags]) => {
          const catInfo = categories.find(c => c.id === category);
          const Icon = catInfo?.icon || TagIcon;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 text-${catInfo?.color || 'gray'}-500`} />
                  {catInfo?.name || category}
                  <span className="text-sm font-normal text-gray-500">
                    ({categoryFlags.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryFlags.map(flag => (
                  <div
                    key={flag.flag_id}
                    className="flex items-start gap-4 p-4 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium dark:text-white">{flag.name}</h3>
                        {flag.is_enabled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Enabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {flag.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                          {flag.flag_key}
                        </code>
                        {' • '}
                        Updated {new Date(flag.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={flag.is_enabled}
                        onChange={() => handleToggleFlag(flag.flag_key, flag.is_enabled)}
                        id={`flag-${flag.flag_id}`}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeleteFlag(flag.flag_key)}
                        className="p-2 text-red-600 hover:text-red-700"
                        title="Delete flag"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Create Flag Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Create Feature Flag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Flag Key
                </label>
                <Input
                  placeholder="e.g., my_feature_flag"
                  value={createForm.flag_key}
                  onChange={e =>
                    setCreateForm({
                      ...createForm,
                      flag_key: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">Use lowercase with underscores</p>
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">Name</label>
                <Input
                  placeholder="e.g., My Feature Flag"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Description
                </label>
                <Input
                  placeholder="What does this flag control?"
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={createForm.category}
                  onChange={e => setCreateForm({ ...createForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFlag}>Create</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Flag Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteFlagConfirm.isOpen}
        onClose={() => setDeleteFlagConfirm({ isOpen: false, flagKey: '' })}
        onConfirm={confirmDeleteFlag}
        title="Delete Feature Flag"
        message={`Delete flag '${deleteFlagConfirm.flagKey}'?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
