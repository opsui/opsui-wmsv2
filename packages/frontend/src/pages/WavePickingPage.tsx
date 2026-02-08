/**
 * Wave Picking Page
 *
 * Create and manage picking waves for batch order processing
 */

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Select,
  Input,
  Progress,
  Pagination,
  Breadcrumb,
  useToast,
  Header,
} from '@/components/shared';
import {
  useWaveStrategies,
  useCreateWave,
  useReleaseWave,
  useCompleteWave,
  useWaveStatus,
} from '@/services/api';
import { useAuthStore } from '@/stores';
import { useFormValidation } from '@/hooks/useFormValidation';

import { usePageTracking, PageViews } from '@/hooks/usePageTracking';
import {
  Squares2X2Icon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// TYPES
// ============================================================================

interface WaveFormData {
  strategy: string;
  priority?: string;
  maxOrders?: number;
  carrier?: string;
  zone?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WavePickingPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  usePageTracking({ view: PageViews.WAVE_PICKING });

  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const canManage = isAdmin || getEffectiveRole() === 'SUPERVISOR';

  const { data: strategiesData } = useWaveStrategies();

  const [selectedWave, setSelectedWave] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state for strategies
  const [strategiesPage, setStrategiesPage] = useState(1);
  const strategiesPageSize = 10;

  const createWaveMutation = useCreateWave();
  const releaseWaveMutation = useReleaseWave();
  const completeWaveMutation = useCompleteWave();

  // Form validation
  const {
    values: formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    setFieldValue,
  } = useFormValidation<WaveFormData>({
    initialValues: {
      strategy: 'BALANCED',
      maxOrders: 50,
    },
    validationRules: {
      strategy: {
        required: true,
      },
      maxOrders: {
        required: true,
        custom: value => {
          const num = Number(value);
          if (isNaN(num) || num < 1 || num > 100) {
            return 'Max orders must be between 1 and 100';
          }
          return null;
        },
      },
    },
    onSubmit: async values => {
      try {
        await createWaveMutation.mutateAsync(values);
        showToast('Wave created successfully', 'success');
        setFieldValue('strategy', 'BALANCED');
        setFieldValue('maxOrders', 50);
      } catch (error: any) {
        showToast(error?.message || 'Failed to create wave', 'error');
        throw error;
      }
    },
  });

  // Fetch wave status if a wave is selected
  const { data: waveStatus } = useWaveStatus(selectedWave || '', !!selectedWave);

  const handleReleaseWave = async (waveId: string) => {
    try {
      await releaseWaveMutation.mutateAsync(waveId);
      showToast('Wave released successfully', 'success');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCompleteWave = async (waveId: string) => {
    try {
      await completeWaveMutation.mutateAsync(waveId);
      showToast('Wave completed successfully', 'success');
      setSelectedWave(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const strategies = strategiesData?.data?.strategies || [];

  // Filter strategies by search
  const filteredStrategies = strategies.filter((strategy: any) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      strategy.id?.toLowerCase().includes(query) ||
      strategy.name?.toLowerCase().includes(query) ||
      strategy.description?.toLowerCase().includes(query)
    );
  });

  // Calculate pagination for strategies
  const strategiesTotalPages = Math.ceil(filteredStrategies.length / strategiesPageSize);
  const paginatedStrategies = filteredStrategies.slice(
    (strategiesPage - 1) * strategiesPageSize,
    strategiesPage * strategiesPageSize
  );

  const progress = waveStatus
    ? ((waveStatus.data?.completedOrders || 0) / (waveStatus.data?.totalOrders || 1)) * 100
    : 0;

  return (
    <div className="min-h-screen">
      <Header />
      {/* Breadcrumb Navigation */}
      <Breadcrumb />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wave Picking</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Create and manage picking waves for efficient batch processing
                </p>
              </div>
            </div>
            <Squares2X2Icon className="h-8 w-8 text-gray-400" />
          </div>

          {/* Create Wave Form */}
          {canManage && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle>Create New Wave</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="strategy"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Strategy *
                      </label>
                      <Select
                        id="strategy"
                        name="strategy"
                        value={formData.strategy}
                        onChange={handleChange}
                        options={strategies.map((s: any) => ({ value: s.id, label: s.name }))}
                      />
                      {errors.strategy && (
                        <p className="mt-1 text-sm text-red-400">{errors.strategy}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="maxOrders"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Max Orders *
                      </label>
                      <Input
                        id="maxOrders"
                        name="maxOrders"
                        type="number"
                        value={formData.maxOrders}
                        onChange={handleChange}
                        min={1}
                        max={100}
                      />
                      {errors.maxOrders && (
                        <p className="mt-1 text-sm text-red-400">{errors.maxOrders}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="priority"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Priority (optional)
                      </label>
                      <Select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        options={[
                          { value: '', label: 'All' },
                          { value: '1', label: 'Priority 1' },
                          { value: '2', label: 'Priority 2' },
                          { value: '3', label: 'Priority 3' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting || createWaveMutation.isPending}
                      className="w-full md:w-auto"
                    >
                      {isSubmitting || createWaveMutation.isPending ? 'Creating...' : 'Create Wave'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Active Waves */}
          {selectedWave && waveStatus && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Wave Status: {waveStatus.data?.waveId}</span>
                  <Badge
                    variant={
                      waveStatus.data?.status === 'PLANNED'
                        ? 'info'
                        : waveStatus.data?.status === 'RELEASED'
                          ? 'primary'
                          : 'success'
                    }
                  >
                    {waveStatus.data?.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {waveStatus.data?.completedOrders || 0} /{' '}
                        {waveStatus.data?.totalOrders || 0} orders
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pickers</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {waveStatus.data?.assignedPickers || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CubeIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Items</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {waveStatus.data?.totalItems || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Est. Time</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {waveStatus.data?.estimatedTime || 0}m
                        </p>
                      </div>
                    </div>
                  </div>

                  {canManage && waveStatus.data?.status === 'PLANNED' && (
                    <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
                      <Button
                        onClick={() => handleReleaseWave(selectedWave)}
                        disabled={releaseWaveMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <PlayIcon className="h-4 w-4" />
                        Release Wave
                      </Button>
                    </div>
                  )}

                  {canManage && waveStatus.data?.status === 'RELEASED' && (
                    <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
                      <Button
                        onClick={() => handleCompleteWave(selectedWave)}
                        disabled={completeWaveMutation.isPending}
                        variant="success"
                        className="flex items-center gap-2"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Complete Wave
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wave Strategy Info */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Wave Strategies</span>
                {/* Search Input */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search strategies..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 w-48 bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedStrategies.map((strategy: any) => (
                  <div
                    key={strategy.id}
                    className="p-4 border dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => setFieldValue('strategy', strategy.id)}
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                      {strategy.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {strategy.description}
                    </p>
                    <div
                      className="mt-2 text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: strategy.color,
                        color: 'white',
                      }}
                    >
                      {strategy.id}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {strategiesTotalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination
                    currentPage={strategiesPage}
                    totalItems={filteredStrategies.length}
                    pageSize={strategiesPageSize}
                    onPageChange={setStrategiesPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default WavePickingPage;
