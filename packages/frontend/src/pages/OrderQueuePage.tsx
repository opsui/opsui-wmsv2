/**
 * Order Queue Page (Picking & Packing)
 *
 * Unified queue page used for both picking (/orders) and packing (/packing).
 * Mode is determined by the `mode` prop passed from App.tsx routes.
 */

import {
  Breadcrumb,
  Button,
  Card,
  CardContent,
  Header,
  OrderPriorityBadge,
  OrderStatusBadge,
  Pagination,
  useToast,
} from '@/components/shared';
import { PageViews, usePageTracking } from '@/hooks/usePageTracking';
import { useOrderUpdates } from '@/hooks/useWebSocket';
import {
  useClaimOrder,
  useContinueOrder,
  useOrderQueue,
  useClaimOrderForPacking,
} from '@/services/api';
import { useAuthStore } from '@/stores';
import {
  ArrowPathIcon,
  BoltIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
  ShoppingBagIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { OrderPriority, OrderStatus } from '@opsui/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// TYPES
// ============================================================================

export type QueueMode = 'picking' | 'packing';

// Per-mode configuration
const MODE_CONFIG = {
  picking: {
    title: 'Picking Queue',
    pageView: PageViews.ORDER_QUEUE,
    idleStatus: OrderStatus.PENDING,
    activeStatus: OrderStatus.PICKING,
    idleLabel: 'Pending',
    activeLabel: 'Tote',
    idleIcon: ShoppingBagIcon,
    activeIcon: ClipboardDocumentListIcon,
    emptyIcon: ShoppingBagIcon,
    emptyText: 'No orders available',
    progressLabel: 'Progress',
    claimButtonIcon: BoltIcon,
    claimButtonLabel: 'Claim',
    continueButtonLabel: 'Continue',
    queryKey: 'picking-queue',
    usePickingApi: true,
  },
  packing: {
    title: 'Packing Queue',
    pageView: 'Packing Queue' as any,
    idleStatus: OrderStatus.PICKED,
    activeStatus: OrderStatus.PACKING,
    idleLabel: 'Ready',
    activeLabel: 'My Orders',
    idleIcon: CubeIcon,
    activeIcon: TruckIcon,
    emptyIcon: CubeIcon,
    emptyText: 'No orders to pack',
    progressLabel: 'Verified',
    claimButtonIcon: TruckIcon,
    claimButtonLabel: 'Start Packing',
    continueButtonLabel: 'Continue',
    queryKey: 'packing-queue',
    usePickingApi: false,
  },
} as const;

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ============================================================================
// FILTER DROPDOWNS
// ============================================================================

function StatusFilterDropdown({
  value,
  onChange,
  mode,
}: {
  value: OrderStatus;
  onChange: (s: OrderStatus) => void;
  mode: QueueMode;
}) {
  const cfg = MODE_CONFIG[mode];
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: cfg.idleStatus, label: cfg.idleLabel, icon: cfg.idleIcon },
    { value: cfg.activeStatus, label: cfg.activeLabel, icon: cfg.activeIcon },
  ];

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-40" ref={dropdownRef}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 min-h-touch border-2 ${
          isOpen
            ? 'bg-purple-400 text-slate-900 border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.4)]'
            : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-purple-500/50 hover:text-purple-400'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedOption && <selectedOption.icon className="h-4 w-4" />}
        <span className="uppercase">{selectedOption?.label}</span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-52 bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl overflow-hidden"
            role="listbox"
          >
            <div className="py-2">
              {options.map(option => {
                const Icon = option.icon;
                const isActive = option.value === value;
                return (
                  <motion.button
                    key={option.value}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all duration-200 ${
                      isActive
                        ? 'bg-purple-400 text-slate-900'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-purple-400'
                    }`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {option.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="ml-auto w-2 h-2 rounded-full bg-slate-900"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriorityFilterDropdown({
  value,
  onChange,
}: {
  value: OrderPriority | undefined;
  onChange: (p: OrderPriority | undefined) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: undefined as OrderPriority | undefined, label: 'All Priority', icon: QueueListIcon },
    { value: 'URGENT' as OrderPriority, label: 'Urgent', icon: ExclamationTriangleIcon },
    { value: 'HIGH' as OrderPriority, label: 'High', icon: BoltIcon },
    { value: 'NORMAL' as OrderPriority, label: 'Normal', icon: ChartBarIcon },
    { value: 'LOW' as OrderPriority, label: 'Low', icon: ArrowPathIcon },
  ];

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-40" ref={dropdownRef}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 min-h-touch border-2 ${
          isOpen
            ? 'bg-purple-400 text-slate-900 border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.4)]'
            : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-purple-500/50 hover:text-purple-400'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedOption && <selectedOption.icon className="h-4 w-4" />}
        <span className="uppercase">{selectedOption?.label}</span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-52 bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl overflow-hidden"
            role="listbox"
          >
            <div className="py-2">
              {options.map(option => {
                const Icon = option.icon;
                const isActive = option.value === value;
                return (
                  <motion.button
                    key={option.label}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all duration-200 ${
                      isActive
                        ? 'bg-purple-400 text-slate-900'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-purple-400'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {option.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// ORDER CARD
// ============================================================================

function OrderCard({
  order,
  onClaim,
  isClaiming,
  claimingOrderId,
  mode,
}: {
  order: any;
  onClaim: (orderId: string, status: OrderStatus) => void;
  isClaiming: boolean;
  claimingOrderId: string | null;
  mode: QueueMode;
}) {
  const cfg = MODE_CONFIG[mode];
  const isUrgent = order.priority === 'URGENT' || order.priority === 'HIGH';
  const isActive = order.status === cfg.activeStatus;

  const items: any[] = order.items || [];

  return (
    <motion.div
      variants={cardVariants}
      layout
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative group"
    >
      {isUrgent && (
        <motion.div
          variants={pulseVariants}
          animate="animate"
          className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 rounded-2xl blur-lg"
        />
      )}

      <Card
        variant="glass"
        className={`relative flex flex-col h-full bg-slate-900/95 border-2 transition-all duration-300 ${
          isUrgent
            ? 'border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)]'
            : 'border-slate-700/50 hover:border-purple-500/30'
        }`}
      >
        <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(192,132,252,0.02)_10px,rgba(192,132,252,0.02)_20px)]" />
        </div>

        <CardContent className="p-5 flex-1 flex flex-col relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white tracking-tight truncate uppercase">
                  {order.orderId}
                </h3>
                {isUrgent && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <BoltIcon className="h-5 w-5 text-orange-400" />
                  </motion.div>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1 truncate">{order.customerName}</p>
            </div>
            <div className="flex flex-col gap-2 ml-2">
              <OrderPriorityBadge priority={order.priority} />
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/50">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Items</p>
              <p className="text-xl font-black text-white">{items.length}</p>
            </div>
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/50">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Total</p>
              <p className="text-xl font-black text-purple-400">
                ${Number(order.totalAmount || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                {cfg.progressLabel}
              </span>
              <span className="text-sm font-black text-purple-400">{order.progress || 0}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${order.progress || 0}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-400 relative"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
              </motion.div>
            </div>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-48">
              {items.map((item: any, idx: number) => {
                const qty =
                  mode === 'packing' ? item.verifiedQuantity || 0 : item.pickedQuantity || 0;
                const isCompleted =
                  item.status === 'COMPLETED' ||
                  item.status === 'FULLY_PICKED' ||
                  qty >= item.quantity;
                const isSkipped = item.status === 'SKIPPED';
                const isPartial = !isCompleted && !isSkipped && qty > 0 && qty < item.quantity;

                const statusStyles = isCompleted
                  ? 'border-purple-500/50 bg-purple-500/10'
                  : isSkipped
                    ? 'border-orange-500/50 bg-orange-500/10'
                    : isPartial
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-slate-700/50 bg-slate-800/50';

                return (
                  <motion.div
                    key={`${order.orderId}-item-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`text-xs p-3 rounded-lg border-l-4 ${statusStyles}`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span className="font-bold text-slate-200 text-xs">{item.sku}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400 flex-1 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px]">
                        LOC: <span className="text-slate-300 font-bold">{item.binLocation}</span>
                      </span>
                      <span
                        className={`font-bold text-sm ${isCompleted ? 'text-purple-400' : isSkipped ? 'text-orange-400' : 'text-slate-300'}`}
                      >
                        {isSkipped ? 'SKIPPED' : `${qty}/${item.quantity}`}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Action button */}
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              fullWidth
              size="lg"
              variant="primary"
              onClick={() => onClaim(order.orderId, order.status)}
              disabled={
                isClaiming ||
                (order.status !== cfg.idleStatus && order.status !== cfg.activeStatus) ||
                (order.status === cfg.idleStatus && claimingOrderId === order.orderId)
              }
              isLoading={order.status === cfg.idleStatus && claimingOrderId === order.orderId}
              className="font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 text-slate-900 border-0 shadow-[0_0_20px_rgba(192,132,252,0.3)] hover:shadow-[0_0_30px_rgba(192,132,252,0.5)] transition-all duration-300"
            >
              {isActive ? (
                cfg.continueButtonLabel
              ) : (
                <span className="flex items-center gap-2">
                  <cfg.claimButtonIcon className="h-5 w-5" />
                  {cfg.claimButtonLabel}
                </span>
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OrderQueuePage({ mode: modeProp = 'picking' }: { mode?: QueueMode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const canPick = useAuthStore(state => state.canPick);
  const canPack = useAuthStore(state => state.canPack);
  const userId = useAuthStore(state => state.user?.userId);
  const currentUser = useAuthStore(state => state.user);
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const { showToast } = useToast();

  // Admins arriving via ?queue= param (e.g. from the dashboard) can switch modes
  const queueParam = searchParams.get('queue') as QueueMode | null;
  const [adminMode, setAdminMode] = useState<QueueMode | null>(
    isAdmin && queueParam && (queueParam === 'picking' || queueParam === 'packing')
      ? queueParam
      : null
  );
  const mode: QueueMode = adminMode ?? modeProp;
  const cfg = MODE_CONFIG[mode];

  const [statusFilter, setStatusFilter] = useState<OrderStatus>(cfg.idleStatus);
  const [priorityFilter, setPriorityFilter] = useState<OrderPriority | undefined>();
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);

  const isClaimingRef = useRef(false);
  const lastClaimedOrderIdRef = useRef<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Auto-detect active tab on mount - must be before handleAdminModeSwitch
  const hasAutoDetectedRef = useRef(false);

  const handleAdminModeSwitch = (newMode: QueueMode) => {
    setAdminMode(newMode);
    setSearchParams(params => {
      params.set('queue', newMode);
      params.delete('status');
      return params;
    });
    setStatusFilter(MODE_CONFIG[newMode].idleStatus);
    setPriorityFilter(undefined);
    setPage(1);
    hasAutoDetectedRef.current = false;
  };

  // --- Data fetching ---
  // Picking mode uses useOrderQueue; packing mode uses a direct apiClient call (different endpoint)
  const pickingQueueResult = useOrderQueue(
    mode === 'picking'
      ? {
          status: statusFilter,
          priority: priorityFilter,
          pickerId:
            statusFilter === 'PICKING' && !(isAdmin && !getEffectiveRole()) ? userId : undefined,
          page,
          limit: pageSize,
        }
      : { status: 'PENDING' as OrderStatus, page: 1, limit: 1 }, // dummy — disabled below
    { enabled: mode === 'picking' } as any
  );

  const packingQueueResult = useQuery({
    queryKey: ['orders', cfg.queryKey, statusFilter, priorityFilter, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (statusFilter === cfg.activeStatus && !(isAdmin && !getEffectiveRole())) {
        params.append('packerId', currentUser?.userId || '');
      }
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      const response = await apiClient.get(`/orders/full?${params.toString()}`);
      return response.data;
    },
    enabled: mode === 'packing',
    refetchInterval: 5000,
  });

  const queueData = mode === 'picking' ? pickingQueueResult.data : packingQueueResult.data;
  const isLoading =
    mode === 'picking' ? pickingQueueResult.isLoading : packingQueueResult.isLoading;

  const pickingAllOrders = useOrderQueue(
    mode === 'picking'
      ? {
          status: undefined as any,
          pickerId: userId,
          page: 1,
          limit: 100,
          refetchOnMount: 'always',
        }
      : { status: 'PENDING' as OrderStatus, page: 1, limit: 1 },
    { enabled: mode === 'picking' } as any
  );

  const packingAllOrders = useQuery({
    queryKey: ['orders', 'all-packing', currentUser?.userId],
    queryFn: async () => {
      if (!currentUser?.userId) return { orders: [] };
      const response = await apiClient.get(
        `/orders/full?status=${OrderStatus.PACKING}&packerId=${currentUser.userId}`
      );
      return response.data;
    },
    enabled: mode === 'packing',
    refetchOnMount: 'always',
  });

  const allOrdersData = mode === 'picking' ? pickingAllOrders.data : packingAllOrders.data;

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter]);

  const orders = queueData?.orders || [];

  // Use orders directly without client-side filtering
  const filteredOrders = orders;

  const handleStatusFilterChange = (status: OrderStatus) => {
    setStatusFilter(status);
    setSearchParams({ status });
    hasAutoDetectedRef.current = true;
  };

  // Auto-detect active/idle tab on mount
  useEffect(() => {
    if (hasAutoDetectedRef.current) return;
    const urlStatus = searchParams.get('status') as OrderStatus | null;
    const hasExplicitUrlStatus = urlStatus && Object.values(OrderStatus).includes(urlStatus);
    if (allOrdersData?.orders) {
      if (hasExplicitUrlStatus) {
        setStatusFilter(urlStatus!);
        hasAutoDetectedRef.current = true;
        return;
      }
      const active = allOrdersData.orders.filter((o: any) => o.status === cfg.activeStatus);
      if (active.length > 0) {
        setStatusFilter(cfg.activeStatus);
        setSearchParams({ status: cfg.activeStatus }, { replace: true });
      } else {
        setStatusFilter(cfg.idleStatus);
      }
      hasAutoDetectedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrdersData]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient, statusFilter, priorityFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        queryClient.invalidateQueries({ queryKey: ['orders', cfg.queryKey] });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [queryClient, cfg.queryKey]);

  // WebSocket updates (picking only — packing uses polling)
  useOrderUpdates((data: { orderId: string; pickerId?: string; pickerName?: string }) => {
    if (mode !== 'picking') return;
    queryClient.invalidateQueries({ queryKey: ['orders', 'queue'] });
    if (data.orderId === lastClaimedOrderIdRef.current) return;
    if (data.pickerId && data.pickerId !== userId) {
      showToast(
        `Order ${data.orderId} claimed by ${data.pickerName || data.pickerId}`,
        'success',
        3000
      );
    }
  });

  // --- Mutations ---
  const claimPickingMutation = useClaimOrder();
  const continuePickingMutation = useContinueOrder();
  const claimPackingMutation = useClaimOrderForPacking();

  const handleClaim = async (orderId: string, orderStatus: OrderStatus) => {
    if (!userId) {
      showToast('You must be logged in', 'error');
      return;
    }

    // Packing: continue active order
    if (mode === 'packing' && orderStatus === OrderStatus.PACKING) {
      navigate(`/packing/${orderId}/pack`);
      return;
    }

    // Picking: continue active order
    if (mode === 'picking' && orderStatus === OrderStatus.PICKING) {
      try {
        await continuePickingMutation.mutateAsync({ orderId });
      } catch {
        /* silent */
      }
      queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
      navigate(`/orders/${orderId}/pick`);
      return;
    }

    if (isClaimingRef.current || claimingOrderId === orderId) return;

    isClaimingRef.current = true;
    setClaimingOrderId(orderId);
    if (mode === 'picking') lastClaimedOrderIdRef.current = orderId;

    try {
      await queryClient.invalidateQueries({ queryKey: ['orders', cfg.queryKey] });

      if (mode === 'picking') {
        await claimPickingMutation.mutateAsync({ orderId, dto: { pickerId: userId } });
        showToast(`Order ${orderId} claimed successfully`, 'success');
        navigate(`/orders/${orderId}/pick`);
      } else {
        await claimPackingMutation.mutateAsync(
          { orderId, packerId: userId },
          {
            onSuccess: () => {
              showToast(`Order ${orderId} claimed successfully`, 'success');
              navigate(`/packing/${orderId}/pack`);
            },
          }
        );
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        (error instanceof Error ? error.message : 'Failed to claim order');
      if (msg.includes('already claimed')) {
        showToast(
          `Order is already claimed by another ${mode === 'picking' ? 'picker' : 'packer'}`,
          'error'
        );
        queryClient.invalidateQueries({ queryKey: ['orders', cfg.queryKey] });
      } else {
        showToast(msg, 'error');
      }
    } finally {
      isClaimingRef.current = false;
      setClaimingOrderId(null);
    }
  };

  // Guard: picking page requires canPick
  if (mode === 'picking' && !canPick) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card variant="glass" className="max-w-md bg-slate-900 border-2 border-slate-700">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
              <ShoppingBagIcon className="h-8 w-8 text-slate-500" />
            </div>
            <p className="text-slate-400 font-medium">Picker privileges required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-slate-800" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-purple-400"
            />
          </div>
          <p className="text-slate-500 font-bold uppercase tracking-wider text-sm">Loading Queue</p>
        </motion.div>
      </div>
    );
  }

  const isClaiming =
    mode === 'picking' ? claimPickingMutation.isPending : claimPackingMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900/20 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_100px,rgba(192,132,252,0.015)_100px,rgba(192,132,252,0.015)_200px)]" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <Header />

      <main
        id="main-content"
        className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        tabIndex={-1}
      >
        <Breadcrumb />

        <motion.div
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="text-center relative"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent max-w-xs"
          />
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight uppercase">
            {cfg.title}
          </h1>
          <p className="mt-4 text-slate-400 text-sm font-medium uppercase tracking-widest">
            {queueData?.total || 0} orders available
          </p>
        </motion.div>

        {/* Mode Switcher - Visible for admins OR users with both picker AND packer roles */}
        {(isAdmin || (canPick() && canPack())) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center"
          >
            <div className="inline-flex rounded-xl bg-slate-800/80 p-1.5 border-2 border-slate-700">
              <button
                onClick={() => handleAdminModeSwitch('picking')}
                className={`px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 min-h-touch flex items-center gap-2 ${
                  mode === 'picking'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'text-slate-400 hover:text-purple-400 hover:bg-slate-700/50'
                }`}
              >
                <ShoppingBagIcon className="h-5 w-5" />
                Picking Queue
              </button>
              <button
                onClick={() => handleAdminModeSwitch('packing')}
                className={`px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 min-h-touch flex items-center gap-2 ${
                  mode === 'packing'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'text-slate-400 hover:text-purple-400 hover:bg-slate-700/50'
                }`}
              >
                <CubeIcon className="h-5 w-5" />
                Packing Queue
              </button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <StatusFilterDropdown
            value={statusFilter}
            onChange={handleStatusFilterChange}
            mode={mode}
          />
          <PriorityFilterDropdown value={priorityFilter} onChange={setPriorityFilter} />
        </motion.div>

        <AnimatePresence mode="wait">
          {filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card variant="glass" className="bg-slate-900/50 border-2 border-slate-700">
                <CardContent className="p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
                    <cfg.emptyIcon className="h-10 w-10 text-slate-600" />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-wider">
                    {cfg.emptyText}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filteredOrders.map((order: any) => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  onClaim={handleClaim}
                  isClaiming={isClaiming}
                  claimingOrderId={claimingOrderId}
                  mode={mode}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {queueData?.total && queueData.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Pagination
              currentPage={page}
              totalItems={queueData.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </motion.div>
        )}
      </main>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
