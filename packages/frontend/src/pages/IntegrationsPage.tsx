/**
 * Integrations Page
 *
 * Manages external system integrations (ERP, e-commerce, carriers)
 * Provides interface for configuring, testing, and monitoring integrations
 */

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ServerIcon,
  ShoppingBagIcon,
  TruckIcon,
  SignalIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  Integration,
  IntegrationType,
  IntegrationStatus,
  IntegrationProvider,
  ApiAuthType,
  SyncDirection,
  SyncFrequency,
  WebhookEventType,
} from '@opsui/shared';
import { Header, Pagination, useToast, ConfirmDialog } from '@/components/shared';
import {
  useIntegrations,
  useCreateIntegration,
  useUpdateIntegration,
  useDeleteIntegration,
  useTestConnection,
  useToggleIntegration,
  useWebhookEvents,
} from '@/services/api';
import { cn } from '@/lib/utils';
import { useFormValidation, commonValidations } from '@/hooks/useFormValidation';

// ============================================================================
// TYPES
// ============================================================================

interface IntegrationFormData {
  name: string;
  description: string;
  type: IntegrationType;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  configuration: {
    auth: {
      type: ApiAuthType;
      apiKey?: string;
      clientId?: string;
      clientSecret?: string;
      username?: string;
      password?: string;
    };
    baseUrl?: string;
    apiVersion?: string;
  };
  syncSettings: {
    direction: SyncDirection;
    frequency: SyncFrequency;
    syncInventory: boolean;
    syncOrders: boolean;
    syncProducts: boolean;
    syncShipments: boolean;
    syncTracking: boolean;
    fieldMappings: Array<{
      wmsField: string;
      externalField: string;
      required: boolean;
    }>;
  };
  webhookSettings?: {
    enabled: boolean;
    endpointUrl?: string;
    secretKey?: string;
    subscribedEvents: WebhookEventType[];
  };
  enabled: boolean;
}

// ============================================================================
// COMPONENTS
// ============================================================================

export function IntegrationsPage() {
    const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'integrations' | 'sync-jobs' | 'webhooks'>('integrations');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | IntegrationStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; integrationId: string }>({
    isOpen: false,
    integrationId: '',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch integrations
  const { data: integrationsData, isLoading: integrationsLoading, error: integrationsError, refetch } = useIntegrations();
  const integrations = integrationsData?.integrations || [];

  const filteredIntegrations = integrations.filter((integration) => {
    // Status filter
    if (filter !== 'ALL' && integration.status !== filter) return false;

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      return (
        integration.integrationId?.toLowerCase().includes(query) ||
        integration.name?.toLowerCase().includes(query) ||
        integration.description?.toLowerCase().includes(query) ||
        integration.provider?.toLowerCase().includes(query) ||
        integration.type?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredIntegrations.length / itemsPerPage);
  const paginatedIntegrations = filteredIntegrations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Integrations</h1>
          <p className="mt-2 text-gray-400">
            Connect and manage external systems (ERP, e-commerce, carriers)
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('integrations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'integrations'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Integrations
            </button>
            <button
              onClick={() => setActiveTab('sync-jobs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sync-jobs'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Sync Jobs
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'webhooks'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Webhooks
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'integrations' && (
          <IntegrationsTab
            integrations={paginatedIntegrations}
            isLoading={integrationsLoading}
            error={integrationsError}
            filter={filter}
            setFilter={setFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            refetch={refetch}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onSelectIntegration={integration => {
              setSelectedIntegration(integration);
              setModalOpen(true);
            }}
            onCreateIntegration={() => {
              setSelectedIntegration(undefined);
              setModalOpen(true);
            }}
          />
        )}

        {activeTab === 'sync-jobs' && <SyncJobsTab />}

        {activeTab === 'webhooks' && <WebhooksTab />}

        {/* Integration Modal */}
        {modalOpen && (
          <IntegrationModal
            integration={selectedIntegration}
            onClose={() => setModalOpen(false)}
            onSave={() => {
              setModalOpen(false);
              refetch();
            }}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// INTEGRATIONS TAB
// ============================================================================

interface IntegrationsTabProps {
  integrations: Integration[];
  isLoading: boolean;
  error: unknown;
  filter: 'ALL' | IntegrationStatus;
  setFilter: (filter: 'ALL' | IntegrationStatus) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  refetch: () => void;
  onSelectIntegration: (integration: Integration) => void;
  onCreateIntegration: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function IntegrationsTab({
  integrations,
  isLoading,
  error,
  filter,
  setFilter,
  searchTerm,
  setSearchTerm,
  refetch,
  onSelectIntegration,
  onCreateIntegration,
  currentPage,
  totalPages,
  onPageChange,
}: IntegrationsTabProps) {
  const deleteIntegration = useDeleteIntegration();

  const handleDeleteIntegration = (integrationId: string) => {
    setDeleteConfirm({ isOpen: true, integrationId });
  };

  const confirmDeleteIntegration = () => {
    const { integrationId } = deleteConfirm;
    deleteIntegration.mutate(integrationId, {
      onSuccess: () => {
        refetch();
        setDeleteConfirm({ isOpen: false, integrationId: '' });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-600 animate-spin" />
        <p className="mt-2 text-gray-400">Loading integrations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircleIcon className="mx-auto h-12 w-12 text-red-600" />
        <p className="mt-2 text-gray-400">Error loading integrations</p>
        <button onClick={() => refetch()} className="mt-4 text-blue-400 hover:text-blue-300">
          Retry
        </button>
      </div>
    );
  }

  const getProviderIcon = (type: IntegrationType) => {
    switch (type) {
      case IntegrationType.ERP:
        return ServerIcon;
      case IntegrationType.ECOMMERCE:
        return ShoppingBagIcon;
      case IntegrationType.CARRIER:
        return TruckIcon;
      default:
        return SignalIcon;
    }
  };

  return (
    <div>
      {/* Actions Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-md font-medium ${
                filter === 'ALL'
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter(IntegrationStatus.CONNECTED)}
              className={`px-4 py-2 rounded-md font-medium ${
                filter === IntegrationStatus.CONNECTED
                  ? 'bg-green-900/50 text-green-300 border border-green-700'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              Connected
            </button>
            <button
              onClick={() => setFilter(IntegrationStatus.DISCONNECTED)}
              className={`px-4 py-2 rounded-md font-medium ${
                filter === IntegrationStatus.DISCONNECTED
                  ? 'bg-gray-700 text-gray-300 border border-gray-600'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              Disconnected
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <button
          onClick={onCreateIntegration}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Integration
        </button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map(integration => {
          const ProviderIcon = getProviderIcon(integration.type);

          return (
            <IntegrationCard
              key={integration.integrationId}
              integration={integration}
              ProviderIcon={ProviderIcon}
              onSelect={onSelectIntegration}
              onDelete={handleDeleteIntegration}
            />
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {integrations.length === 0 && (
        <div className="text-center py-12">
          <ServerIcon className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-2 text-gray-400">No integrations configured</p>
          <button onClick={onCreateIntegration} className="mt-4 text-blue-400 hover:text-blue-300">
            Add your first integration
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, integrationId: '' })}
        onConfirm={confirmDeleteIntegration}
        title="Delete Integration"
        message="Are you sure you want to delete this integration? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteIntegration.isPending}
      />
    </div>
  );
}

// ============================================================================
// INTEGRATION CARD
// ============================================================================

interface IntegrationCardProps {
  integration: Integration;
  ProviderIcon: React.ComponentType<{ className?: string }>;
  onSelect: (integration: Integration) => void;
  onDelete: (integrationId: string) => void;
}

function IntegrationCard({ integration, ProviderIcon, onSelect, onDelete }: IntegrationCardProps) {
  const testConnection = useTestConnection();
  const toggleIntegration = useToggleIntegration();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection.mutateAsync(integration.integrationId);
      setTestResult({
        success: result.success,
        message: result.success
          ? `Connection successful (${result.latency}ms)`
          : result.message || 'Connection failed',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleToggleEnabled = () => {
    toggleIntegration.mutate(
      { integrationId: integration.integrationId, enabled: !integration.enabled },
      {
        onSuccess: () => {
          // Refetch will be handled by parent
        },
      }
    );
  };

  return (
    <div className="glass-card rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="p-2 bg-blue-900/50 rounded-lg border border-blue-700">
            <ProviderIcon className="h-6 w-6 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
            <p className="text-sm text-gray-400">{integration.provider}</p>
          </div>
        </div>
        <StatusBadge status={integration.status} enabled={integration.enabled} />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Type:</span>
          <span className="font-medium text-white">{integration.type}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Last Sync:</span>
          <span className="font-medium text-white">
            {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : 'Never'}
          </span>
        </div>
        {integration.lastError && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Last Error:</span>
            <span className="font-medium text-red-400">{integration.lastError}</span>
          </div>
        )}
      </div>

      {testResult && (
        <div
          className={`mb-4 p-2 rounded text-sm ${
            testResult.success
              ? 'bg-green-900/30 text-green-400'
              : 'bg-red-900/30 text-red-400'
          }`}
        >
          {testResult.message}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
        <div className="flex space-x-2">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="p-2 text-green-400 hover:text-green-300 rounded hover:bg-green-900/30"
            title="Test Connection"
          >
            {testing ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => onSelect(integration)}
            className="p-2 text-blue-400 hover:text-blue-300 rounded hover:bg-blue-900/30"
            title="Edit Integration"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(integration.integrationId)}
            className="p-2 text-red-400 hover:text-red-300 rounded hover:bg-red-900/30"
            title="Delete Integration"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={handleToggleEnabled}
          className={cn(
            'px-3 py-1 rounded text-sm font-medium',
            integration.enabled
              ? 'bg-green-900/50 text-green-300 border border-green-700'
              : 'bg-gray-800 text-gray-400 border border-gray-700'
          )}
        >
          {integration.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

interface StatusBadgeProps {
  status: IntegrationStatus;
  enabled: boolean;
}

function StatusBadge({ status, enabled }: StatusBadgeProps) {
  if (!enabled) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <XCircleIcon className="h-4 w-4 inline mr-1" />
        Disabled
      </span>
    );
  }

  const styles: Record<IntegrationStatus, string> = {
    [IntegrationStatus.CONNECTED]: 'bg-green-100 text-green-800',
    [IntegrationStatus.DISCONNECTED]: 'bg-gray-100 text-gray-800',
    [IntegrationStatus.ERROR]: 'bg-red-100 text-red-800',
    [IntegrationStatus.CONNECTING]: 'bg-yellow-100 text-yellow-800',
    [IntegrationStatus.PAUSED]: 'bg-orange-100 text-orange-800',
  };

  const icons: Record<IntegrationStatus, React.ReactNode> = {
    [IntegrationStatus.CONNECTED]: <CheckCircleIcon className="h-4 w-4 inline mr-1" />,
    [IntegrationStatus.DISCONNECTED]: <XCircleIcon className="h-4 w-4 inline mr-1" />,
    [IntegrationStatus.ERROR]: <XCircleIcon className="h-4 w-4 inline mr-1" />,
    [IntegrationStatus.CONNECTING]: <ClockIcon className="h-4 w-4 inline mr-1" />,
    [IntegrationStatus.PAUSED]: <ClockIcon className="h-4 w-4 inline mr-1" />,
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
}

// ============================================================================
// SYNC JOBS TAB
// ============================================================================

function SyncJobsTab() {
  return (
    <div className="glass-card rounded-lg p-6">
      <div className="text-center py-12">
        <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-600" />
        <p className="mt-2 text-gray-400">Select an integration to view sync history</p>
        <p className="text-sm text-gray-500">Sync jobs will appear here when integrations run</p>
      </div>
    </div>
  );
}

// ============================================================================
// WEBHOOKS TAB
// ============================================================================

function WebhooksTab() {
  const { data: webhookEventsData, isLoading } = useWebhookEvents();
  const webhookEvents = webhookEventsData?.events || [];

  if (isLoading) {
    return (
      <div className="glass-card rounded-lg p-6">
        <div className="text-center py-12">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-600 animate-spin" />
          <p className="mt-2 text-gray-400">Loading webhook events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-lg p-6">
      {webhookEvents.length === 0 ? (
        <div className="text-center py-12">
          <ServerIcon className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-2 text-gray-400">No webhook events found</p>
          <p className="text-sm text-gray-500">Webhook events will appear here when received</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhookEvents.map(event => (
            <div key={event.eventId} className="p-4 bg-black/20 rounded-lg border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{event.eventType}</span>
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    event.status === 'PROCESSED'
                      ? 'bg-green-900/30 text-green-400'
                      : event.status === 'FAILED'
                        ? 'bg-red-900/30 text-red-400'
                        : 'bg-yellow-900/30 text-yellow-400'
                  )}
                >
                  {event.status}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Received: {new Date(event.receivedAt).toLocaleString()}
              </p>
              {event.errorMessage && (
                <p className="text-xs text-red-400 mt-1">{event.errorMessage}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INTEGRATION MODAL
// ============================================================================

interface IntegrationModalProps {
  integration?: Integration;
  onClose: () => void;
  onSave: () => void;
}

function IntegrationModal({ integration, onClose, onSave }: IntegrationModalProps) {
  const isEdit = !!integration;
  const createIntegration = useCreateIntegration();
  const updateIntegration = useUpdateIntegration();
  const [formData, setFormData] = useState<IntegrationFormData>({
    name: integration?.name || '',
    description: integration?.description || '',
    type: integration?.type || IntegrationType.ERP,
    provider: integration?.provider || IntegrationProvider.SAP,
    status: integration?.status || IntegrationStatus.DISCONNECTED,
    configuration: {
      auth: {
        type: ApiAuthType.API_KEY,
        apiKey: '',
      },
      baseUrl: '',
      apiVersion: '',
    },
    syncSettings: {
      direction: SyncDirection.INBOUND,
      frequency: SyncFrequency.HOURLY,
      syncInventory: true,
      syncOrders: true,
      syncProducts: false,
      syncShipments: false,
      syncTracking: false,
      fieldMappings: [],
    },
    webhookSettings: integration?.webhookSettings,
    enabled: integration?.enabled ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEdit && integration) {
        await updateIntegration.mutateAsync({
          integrationId: integration.integrationId,
          updates: formData,
        });
      } else {
        await createIntegration.mutateAsync(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save integration:', error);
    }
  };

  const getProvidersForType = (type: IntegrationType): IntegrationProvider[] => {
    switch (type) {
      case IntegrationType.ERP:
        return [IntegrationProvider.SAP, IntegrationProvider.ORACLE, IntegrationProvider.NETSUITE];
      case IntegrationType.ECOMMERCE:
        return [
          IntegrationProvider.SHOPIFY,
          IntegrationProvider.WOOCOMMERCE,
          IntegrationProvider.MAGENTO,
          IntegrationProvider.BIGCOMMERCE,
        ];
      case IntegrationType.CARRIER:
        return [IntegrationProvider.FEDEX, IntegrationProvider.UPS, IntegrationProvider.DHL, IntegrationProvider.USPS];
      default:
        return [IntegrationProvider.CUSTOM];
    }
  };

  const availableProviders = getProvidersForType(formData.type);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto border border-gray-800">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-white">
            {isEdit ? 'Edit Integration' : 'Add Integration'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Integration Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={e => {
                      const newType = e.target.value as IntegrationType;
                      const providers = getProvidersForType(newType);
                      setFormData({
                        ...formData,
                        type: newType,
                        provider: providers[0],
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={IntegrationType.ERP}>ERP System</option>
                    <option value={IntegrationType.ECOMMERCE}>E-commerce Platform</option>
                    <option value={IntegrationType.CARRIER}>Shipping Carrier</option>
                    <option value={IntegrationType.PAYMENT}>Payment Provider</option>
                    <option value={IntegrationType.WAREHOUSE}>Warehouse System</option>
                    <option value={IntegrationType.CUSTOM}>Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Provider *</label>
                  <select
                    value={formData.provider}
                    onChange={e => setFormData({ ...formData, provider: e.target.value as IntegrationProvider })}
                    className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableProviders.map(provider => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Base URL
                </label>
                <input
                  type="text"
                  value={formData.configuration.baseUrl || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      configuration: { ...formData.configuration, baseUrl: e.target.value },
                    })
                  }
                  placeholder="https://api.example.com"
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  API Key / Access Token
                </label>
                <input
                  type="password"
                  value={formData.configuration.auth.apiKey || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      configuration: {
                        ...formData.configuration,
                        auth: { ...formData.configuration.auth, apiKey: e.target.value },
                      },
                    })
                  }
                  placeholder="Enter API key"
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="enabled" className="text-sm text-gray-300">
                  Enable this integration
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createIntegration.isPending || updateIntegration.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-700"
              >
                {isEdit ? 'Update Integration' : 'Add Integration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
