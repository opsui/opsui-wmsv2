/**
 * Wave Picking Page
 *
 * Create and manage picking waves for batch order processing.
 * Design direction: WAVE FLOW - Dynamic, flowing aesthetic with movement.
 */

import { useState, useEffect, useRef } from 'react';
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
import { useFeedbackSounds } from '@/hooks/useSoundEffects';
import { usePageTracking, PageViews } from '@/hooks/usePageTracking';
import {
  Squares2X2Icon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  SparklesIcon,
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
// CUSTOM HOOKS
// ============================================================================

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

function useAnimatedCounter(end: number, duration: number = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (end === 0) {
      setValue(0);
      return;
    }

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(end * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return value;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Animated wave progress bar
function WaveProgress({ value, className = '' }: { value: number; className?: string }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 1000, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(value * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div className={`relative h-3 bg-slate-800/50 rounded-full overflow-hidden ${className}`}>
      {/* Animated wave background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.3), transparent)`,
          animation: 'wave-shimmer 2s infinite linear',
        }}
      />

      {/* Progress fill with gradient */}
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500"
        style={{ width: `${animatedValue}%` }}
      >
        {/* Wave effect on the edge */}
        <div className="absolute right-0 inset-y-0 w-8 overflow-hidden">
          <div
            className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent to-white/30"
            style={{
              animation: 'wave-edge 1s infinite ease-in-out',
            }}
          />
        </div>
      </div>

      {/* Glow effect */}
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-teal-300 rounded-full blur-sm opacity-50"
        style={{ width: `${animatedValue}%` }}
      />
    </div>
  );
}

// Strategy card with wave styling
function StrategyCard({
  strategy,
  isSelected,
  onClick,
  index,
}: {
  strategy: any;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  const { ref, isInView } = useInView(0.1);

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="group relative cursor-pointer"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(20px)',
        transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 50}ms`,
      }}
    >
      {/* Selection indicator */}
      <div
        className={`absolute -inset-px rounded-xl transition-all duration-300 ${
          isSelected
            ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-400/40'
            : 'border border-transparent group-hover:border-cyan-500/20'
        }`}
      />

      <div className="relative p-4 rounded-xl bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
            {strategy.name}
          </h3>
          {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
        </div>
        <p className="text-sm text-slate-400 mb-3">{strategy.description}</p>
        <div
          className="inline-flex px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: strategy.color || 'rgba(34, 211, 238, 0.2)',
            color: 'white',
          }}
        >
          {strategy.id}
        </div>
      </div>
    </div>
  );
}

// Stat display with icon
function WaveStat({
  icon: Icon,
  label,
  value,
  suffix = '',
  color = 'cyan',
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  color?: 'cyan' | 'teal' | 'amber' | 'slate';
}) {
  const animatedValue = useAnimatedCounter(typeof value === 'number' ? value : 0);

  const colorClasses = {
    cyan: 'text-cyan-400',
    teal: 'text-teal-400',
    amber: 'text-amber-400',
    slate: 'text-slate-300',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
        <Icon className={`h-5 w-5 ${colorClasses[color]}`} />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-light text-white">
          {typeof value === 'number' ? animatedValue : value}
          {suffix}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WavePickingPage() {
  const { showToast } = useToast();
  const { playSuccess, playError } = useFeedbackSounds();
  const navigate = useNavigate();
  usePageTracking({ view: PageViews.WAVE_PICKING });

  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const canManage = isAdmin || getEffectiveRole() === 'SUPERVISOR';

  const { data: strategiesData } = useWaveStrategies();

  const [selectedWave, setSelectedWave] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [strategiesPage, setStrategiesPage] = useState(1);
  const strategiesPageSize = 10;

  const createWaveMutation = useCreateWave();
  const releaseWaveMutation = useReleaseWave();
  const completeWaveMutation = useCompleteWave();

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
      strategy: { required: true },
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
        playSuccess();
        showToast('Wave created successfully', 'success');
        setFieldValue('strategy', 'BALANCED');
        setFieldValue('maxOrders', 50);
      } catch (error: any) {
        playError();
        showToast(error?.message || 'Failed to create wave', 'error');
        throw error;
      }
    },
  });

  const { data: waveStatus } = useWaveStatus(selectedWave || '', !!selectedWave);

  const handleReleaseWave = async (waveId: string) => {
    try {
      await releaseWaveMutation.mutateAsync(waveId);
      playSuccess();
      showToast('Wave released successfully', 'success');
    } catch (error) {}
  };

  const handleCompleteWave = async (waveId: string) => {
    try {
      await completeWaveMutation.mutateAsync(waveId);
      playSuccess();
      showToast('Wave completed successfully', 'success');
      setSelectedWave(null);
    } catch (error) {}
  };

  const strategies = strategiesData?.data?.strategies || [];

  const filteredStrategies = strategies.filter((strategy: any) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      strategy.id?.toLowerCase().includes(query) ||
      strategy.name?.toLowerCase().includes(query) ||
      strategy.description?.toLowerCase().includes(query)
    );
  });

  const strategiesTotalPages = Math.ceil(filteredStrategies.length / strategiesPageSize);
  const paginatedStrategies = filteredStrategies.slice(
    (strategiesPage - 1) * strategiesPageSize,
    strategiesPage * strategiesPageSize
  );

  const progress = waveStatus
    ? ((waveStatus.data?.completedOrders || 0) / (waveStatus.data?.totalOrders || 1)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Wave flow ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Flowing wave gradients */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-cyan-500/5 to-transparent" />
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[120px]" />

        {/* Wave pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" preserveAspectRatio="none">
          <defs>
            <pattern
              id="wave-pattern"
              x="0"
              y="0"
              width="100"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path d="M0 10 Q 25 0, 50 10 T 100 10" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wave-pattern)" />
        </svg>

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <Header />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />

        {/* Page Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 shadow-lg shadow-cyan-500/30">
              <ArrowPathIcon className="h-6 w-6 text-slate-900" />
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-400/80">
              Batch Processing
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extralight text-white tracking-tight mb-3">
            Wave Picking
          </h1>
          <p className="text-lg text-slate-400 font-light max-w-xl">
            Create and manage picking waves for efficient batch order processing.
          </p>
        </header>

        <div className="space-y-8">
          {/* Create Wave Form */}
          {canManage && (
            <div className="relative">
              <div className="absolute -inset-px bg-gradient-to-r from-cyan-500/10 via-transparent to-teal-500/10 rounded-2xl" />
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Squares2X2Icon className="h-4 w-4 text-cyan-400" />
                  </div>
                  <h2 className="text-lg font-light text-white">Create New Wave</h2>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                        Strategy *
                      </label>
                      <Select
                        id="strategy"
                        name="strategy"
                        value={formData.strategy}
                        onChange={handleChange}
                        options={strategies.map((s: any) => ({ value: s.id, label: s.name }))}
                        className="bg-slate-800/50 border-slate-700"
                      />
                      {errors.strategy && (
                        <p className="mt-2 text-sm text-rose-400">{errors.strategy}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
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
                        className="bg-slate-800/50 border-slate-700"
                      />
                      {errors.maxOrders && (
                        <p className="mt-2 text-sm text-rose-400">{errors.maxOrders}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
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
                        className="bg-slate-800/50 border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button
                      type="submit"
                      disabled={isSubmitting || createWaveMutation.isPending}
                      className="h-12 px-8 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-900 font-medium shadow-lg shadow-cyan-500/25 transition-all duration-300"
                    >
                      {isSubmitting || createWaveMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-4 w-4 mr-2" />
                          Create Wave
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Active Waves */}
          {selectedWave && waveStatus && (
            <div className="relative">
              <div
                className={`absolute -inset-px rounded-2xl ${
                  waveStatus.data?.status === 'RELEASED'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20'
                    : 'bg-gradient-to-r from-amber-500/10 to-amber-500/5'
                }`}
              />
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <ArrowPathIcon
                        className={`h-5 w-5 text-cyan-400 ${
                          waveStatus.data?.status === 'RELEASED' ? 'animate-spin' : ''
                        }`}
                        style={{ animationDuration: '3s' }}
                      />
                    </div>
                    <div>
                      <h2 className="text-lg font-light text-white">Wave Status</h2>
                      <p className="text-xs text-slate-500">{waveStatus.data?.waveId}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      waveStatus.data?.status === 'PLANNED'
                        ? 'info'
                        : waveStatus.data?.status === 'RELEASED'
                          ? 'primary'
                          : 'success'
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      waveStatus.data?.status === 'PLANNED'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : waveStatus.data?.status === 'RELEASED'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {waveStatus.data?.status}
                  </Badge>
                </div>

                <div className="space-y-6">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-500 uppercase tracking-wider">
                        Progress
                      </span>
                      <span className="text-sm text-white font-light">
                        {waveStatus.data?.completedOrders || 0} /{' '}
                        {waveStatus.data?.totalOrders || 0} orders
                      </span>
                    </div>
                    <WaveProgress value={progress} />
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <WaveStat
                      icon={UsersIcon}
                      label="Pickers"
                      value={waveStatus.data?.assignedPickers || 0}
                      color="cyan"
                    />
                    <WaveStat
                      icon={CubeIcon}
                      label="Items"
                      value={waveStatus.data?.totalItems || 0}
                      color="teal"
                    />
                    <WaveStat
                      icon={ClockIcon}
                      label="Est. Time"
                      value={waveStatus.data?.estimatedTime || 0}
                      suffix="m"
                      color="amber"
                    />
                    <WaveStat
                      icon={CheckCircleIcon}
                      label="Completed"
                      value={waveStatus.data?.completedOrders || 0}
                      color="teal"
                    />
                  </div>

                  {/* Actions */}
                  {canManage && waveStatus.data?.status === 'PLANNED' && (
                    <div className="flex gap-3 pt-4 border-t border-slate-700/30">
                      <Button
                        onClick={() => handleReleaseWave(selectedWave)}
                        disabled={releaseWaveMutation.isPending}
                        className="flex items-center gap-2 h-11 px-6 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-900 font-medium shadow-lg shadow-cyan-500/25"
                      >
                        <PlayIcon className="h-4 w-4" />
                        Release Wave
                      </Button>
                    </div>
                  )}

                  {canManage && waveStatus.data?.status === 'RELEASED' && (
                    <div className="flex gap-3 pt-4 border-t border-slate-700/30">
                      <Button
                        onClick={() => handleCompleteWave(selectedWave)}
                        disabled={completeWaveMutation.isPending}
                        className="flex items-center gap-2 h-11 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 font-medium shadow-lg shadow-emerald-500/25"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Complete Wave
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Wave Strategies */}
          <div className="relative">
            <div className="absolute -inset-px bg-gradient-to-r from-teal-500/5 via-transparent to-cyan-500/5 rounded-2xl" />
            <div className="relative rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-white/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <Squares2X2Icon className="h-4 w-4 text-teal-400" />
                  </div>
                  <h2 className="text-lg font-light text-white">Wave Strategies</h2>
                </div>

                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search strategies..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-48 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedStrategies.map((strategy: any, index: number) => (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    isSelected={formData.strategy === strategy.id}
                    onClick={() => setFieldValue('strategy', strategy.id)}
                    index={index}
                  />
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
            </div>
          </div>
        </div>
      </main>

      {/* CSS for wave animations */}
      <style>{`
        @keyframes wave-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes wave-edge {
          0%, 100% { opacity: 0.3; transform: translateX(0); }
          50% { opacity: 0.6; transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

export default WavePickingPage;
