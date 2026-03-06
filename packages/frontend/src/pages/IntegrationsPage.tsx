/**
 * Integrations Page
 *
 * Manages external system integrations (ERP, e-commerce, carriers)
 * Provides interface for configuring, testing, and monitoring integrations
 *
 * ============================================================================
 * AESTHETIC DIRECTION: CONNECTION HUB
 * ============================================================================
 * A tech-focused command center for system integrations:
 * - Blue/purple gradient accents for connectivity theme
 * - Connection status indicators with pulse animations
 * - Staggered card entrance animations
 * - Provider icons with subtle glow effects
 * - Monospace timestamps for sync data
 * - Visual hierarchy showing connection health
 * ============================================================================
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
  ChevronLeftIcon,
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
import { Header, Pagination, ConfirmDialog, Button, Breadcrumb } from '@/components/shared';
import { useNavigate } from 'react-router-dom';
import {
  useIntegrations,
  useCreateIntegration,
  useUpdateIntegration,
  useDeleteIntegration,
  useTestConnection,
  useToggleIntegration,
  useWebhookEvents,
} from '@/services/api';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'integrations' | 'sync-jobs' | 'webhooks'>(
    'integrations'
  );
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | IntegrationStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch integrations
  const {
    data: integrationsData,
    isLoading: integrationsLoading,
    error: integrationsError,
    refetch,
  } = useIntegrations();
  const integrations = integrationsData?.integrations || [];

  const filteredIntegrations = integrations.filter(integration => {
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
    <div className="min-h-screen relative">
      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <Header />
      {/* Breadcrumb Navigation */}
      <Breadcrumb />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header with distinctive styling */}
        <div className="mb-8" style={{ animation: 'integration-stagger-in 0.4s ease-out' }}>
          <div className="flex items-center gap-4 mb-4">
            {/* Connection accent */}
            <div className="flex items-center gap-1">
              <div className="w-1 h-8 bg-purple-500 rounded-full" />
              <div className="w-1 h-8 bg-violet-500 rounded-full" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-['Space_Grotesk',sans-serif]">
            Integrations
          </h1>
          <p className="mt-2 text-gray-400 font-medium">
            Connect and manage external systems (ERP, e-commerce, carriers)
          </p>
        </div>

        {/* Tabs with enhanced styling */}
        <div
          className="mb-6 border-b border-white/[0.08]"
          style={{ animation: 'integration-stagger-in 0.5s ease-out 0.1s backwards' }}
        >
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('integrations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                activeTab === 'integrations'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Integrations
            </button>
            <button
              onClick={() => setActiveTab('sync-jobs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                activeTab === 'sync-jobs'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              Sync Jobs
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                activeTab === 'webhooks'
                  ? 'border-purple-500 text-purple-400'
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; integrationId: string }>({
    isOpen: false,
    integrationId: '',
  });

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
        <button onClick={() => refetch()} className="mt-4 text-purple-400 hover:text-purple-300">
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
                  ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
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
                  ? 'bg-red-900/50 text-red-300 border border-red-700'
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
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        <button
          onClick={onCreateIntegration}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Integration
        </button>
      </div>

      {/* Integrations Grid with staggered animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration, index) => {
          const ProviderIcon = getProviderIcon(integration.type);

          return (
            <div
              key={integration.integrationId}
              style={{
                animation: `integration-stagger-in 0.4s ease-out ${0.1 + index * 0.05}s backwards`,
              }}
            >
              <IntegrationCard
                integration={integration}
                ProviderIcon={ProviderIcon}
                onSelect={onSelectIntegration}
                onDelete={handleDeleteIntegration}
              />
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            currentPage={currentPage}
            totalItems={integrations.length}
            pageSize={10}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {integrations.length === 0 && (
        <div className="text-center py-12">
          <ServerIcon className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-2 text-gray-400">No integrations configured</p>
          <button
            onClick={onCreateIntegration}
            className="mt-4 text-purple-400 hover:text-purple-300"
          >
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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

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

  const handleSyncOrders = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await apiClient.post(
        `/integrations/${integration.integrationId}/netsuite/sync-orders`
      );
      setSyncResult({
        success: true,
        message: response.data.message || 'Sync completed',
        count: response.data.imported,
      });
    } catch (error) {
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setSyncing(false);
    }
  };

  const isNetSuite = integration.provider === IntegrationProvider.NETSUITE;

  // Determine connection status class
  const getConnectionStatusClass = () => {
    if (!integration.enabled) return 'disconnected';
    switch (integration.status) {
      case IntegrationStatus.CONNECTED:
        return 'connected';
      case IntegrationStatus.CONNECTING:
        return 'connecting';
      default:
        return 'disconnected';
    }
  };

  return (
    <div className="integration-card-enhanced rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="provider-icon-container p-3 rounded-xl">
            <ProviderIcon className="h-6 w-6 text-purple-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-white font-['Space_Grotesk',sans-serif]">
              {integration.name}
            </h3>
            <p className="text-sm text-gray-400">{integration.provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`connection-status ${getConnectionStatusClass()} w-2 h-2 rounded-full`} />
          <StatusBadge status={integration.status} enabled={integration.enabled} />
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Type:</span>
          <span className="font-medium text-white">{integration.type}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Last Sync:</span>
          <span className="font-medium text-white font-['JetBrains_Mono',monospace] text-xs">
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
          className={`mb-4 p-3 rounded-lg text-sm ${
            testResult.success
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {testResult.message}
        </div>
      )}

      {syncResult && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            syncResult.success
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {syncResult.message}
          {syncResult.count !== undefined ? ` (${syncResult.count} orders imported)` : ''}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
        <div className="flex space-x-2">
          {isNetSuite && (
            <button
              onClick={handleSyncOrders}
              disabled={syncing || !integration.enabled}
              className="p-2 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-blue-500/10 transition-all disabled:opacity-50"
              title="Sync Orders from NetSuite"
            >
              {syncing ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowPathIcon className="h-5 w-5" />
              )}
            </button>
          )}
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="p-2 text-green-400 hover:text-green-300 rounded-lg hover:bg-green-500/10 transition-all"
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
            className="p-2 text-purple-400 hover:text-purple-300 rounded-lg hover:bg-purple-500/10 transition-all"
            title="Edit Integration"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(integration.integrationId)}
            className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-all"
            title="Delete Integration"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={handleToggleEnabled}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            integration.enabled
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
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
  // Webhook events endpoint not implemented yet - showing placeholder
  return (
    <div className="glass-card rounded-lg p-6">
      <div className="text-center py-12">
        <ServerIcon className="mx-auto h-12 w-12 text-gray-600" />
        <p className="mt-2 text-gray-400">Webhook events</p>
        <p className="text-sm text-gray-500">Webhook events will appear here when received</p>
      </div>
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
  // Get auth config from either configuration.auth or configuration directly
  const existingConfig = integration?.configuration as any;
  const existingAuth = existingConfig?.auth || existingConfig || {};

  const [formData, setFormData] = useState<IntegrationFormData>({
    name: integration?.name || '',
    description: integration?.description || '',
    type: integration?.type || IntegrationType.ERP,
    provider: integration?.provider || IntegrationProvider.SAP,
    status: integration?.status || IntegrationStatus.DISCONNECTED,
    configuration: {
      auth: {
        type: ApiAuthType.API_KEY,
        apiKey: existingAuth.apiKey || '',
        accountId: existingAuth.accountId || '',
        tokenId: existingAuth.tokenId || '',
        tokenSecret: existingAuth.tokenSecret || '',
        consumerKey: existingAuth.consumerKey || '',
        consumerSecret: existingAuth.consumerSecret || '',
      },
      baseUrl: existingConfig?.baseUrl || '',
      apiVersion: existingConfig?.apiVersion || '',
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
      // For NetSuite, flatten the auth config to top level
      const submitData = { ...formData };
      if (formData.provider === IntegrationProvider.NETSUITE) {
        submitData.configuration = {
          ...formData.configuration,
          accountId: formData.configuration.auth.accountId,
          tokenId: formData.configuration.auth.tokenId,
          tokenSecret: formData.configuration.auth.tokenSecret,
          consumerKey: formData.configuration.auth.consumerKey,
          consumerSecret: formData.configuration.auth.consumerSecret,
        };
      }

      if (isEdit && integration) {
        await updateIntegration.mutateAsync({
          integrationId: integration.integrationId,
          updates: submitData,
        });
      } else {
        await createIntegration.mutateAsync(submitData);
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
        return [
          IntegrationProvider.FEDEX,
          IntegrationProvider.UPS,
          IntegrationProvider.DHL,
          IntegrationProvider.USPS,
        ];
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
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    onChange={e =>
                      setFormData({ ...formData, provider: e.target.value as IntegrationProvider })
                    }
                    className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                <label className="block text-sm font-medium text-gray-300 mb-1">Base URL</label>
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
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* NetSuite TBA Fields */}
              {formData.provider === IntegrationProvider.NETSUITE && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Account ID *
                    </label>
                    <input
                      type="text"
                      value={formData.configuration.auth.accountId || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          configuration: {
                            ...formData.configuration,
                            auth: { ...formData.configuration.auth, accountId: e.target.value },
                          },
                        })
                      }
                      placeholder="TSTDRV1234567"
                      className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Token ID *
                    </label>
                    <input
                      type="password"
                      value={formData.configuration.auth.tokenId || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          configuration: {
                            ...formData.configuration,
                            auth: { ...formData.configuration.auth, tokenId: e.target.value },
                          },
                        })
                      }
                      placeholder="Enter Token ID"
                      className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Token Secret *
                    </label>
                    <input
                      type="password"
                      value={formData.configuration.auth.tokenSecret || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          configuration: {
                            ...formData.configuration,
                            auth: { ...formData.configuration.auth, tokenSecret: e.target.value },
                          },
                        })
                      }
                      placeholder="Enter Token Secret"
                      className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Consumer Key *
                    </label>
                    <input
                      type="password"
                      value={formData.configuration.auth.consumerKey || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          configuration: {
                            ...formData.configuration,
                            auth: { ...formData.configuration.auth, consumerKey: e.target.value },
                          },
                        })
                      }
                      placeholder="Enter Consumer Key"
                      className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Consumer Secret *
                    </label>
                    <input
                      type="password"
                      value={formData.configuration.auth.consumerSecret || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          configuration: {
                            ...formData.configuration,
                            auth: {
                              ...formData.configuration.auth,
                              consumerSecret: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="Enter Consumer Secret"
                      className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </>
              )}

              {/* Generic API Key for other providers */}
              {formData.provider !== IntegrationProvider.NETSUITE && (
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
                    className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

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
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-700"
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
