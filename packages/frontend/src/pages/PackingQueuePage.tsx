/**
 * Packing queue page - "Industrial Velocity" Design
 *
 * A high-energy, industrial aesthetic for warehouse operations
 * Features: Diagonal scan lines, electric accents, momentum animations
 *
 * Design Direction: Industrial/Utilitarian with high-energy twist
 * Typography: Bold condensed headers, refined body
 * Color: Deep slate base with electric lime/emerald accents
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
import { usePageTracking } from '@/hooks/usePageTracking';
import { useClaimOrderForPacking } from '@/services/api';
import { useAuthStore } from '@/stores';
import {
  ArrowPathIcon,
  BoltIcon,
  ChartBarIcon,
  ChevronDownIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { OrderPriority, OrderStatus, type Order } from '@opsui/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
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
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ============================================================================
// FILTER DROPDOWN COMPONENTS
// ============================================================================

interface StatusFilterDropdownProps {
  value: OrderStatus;
  onChange: (status: OrderStatus) => void;
}

function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: 'PICKED' as OrderStatus, label: 'Ready', icon: CubeIcon, color: 'emerald' },
    {
      value: 'PACKING' as OrderStatus,
      label: 'My Orders',
      icon: TruckIcon,
      color: 'lime',
    },
  ];

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
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
        aria-label={`Status filter: ${selectedOption?.label}`}
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
                const OptionIcon = option.icon;
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
                    <OptionIcon className="h-4 w-4 flex-shrink-0" />
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

interface PriorityFilterDropdownProps {
  value: OrderPriority | undefined;
  onChange: (priority: OrderPriority | undefined) => void;
}

function PriorityFilterDropdown({ value, onChange }: PriorityFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { value: undefined as OrderPriority | undefined, label: 'All Priority', icon: QueueListIcon },
    {
      value: 'URGENT' as OrderPriority,
      label: 'Urgent',
      icon: ExclamationTriangleIcon,
      color: 'red',
    },
    { value: 'HIGH' as OrderPriority, label: 'High', icon: BoltIcon, color: 'orange' },
    { value: 'NORMAL' as OrderPriority, label: 'Normal', icon: ChartBarIcon, color: 'blue' },
    { value: 'LOW' as OrderPriority, label: 'Low', icon: ArrowPathIcon, color: 'gray' },
  ];

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
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
        aria-label={`Priority filter: ${selectedOption?.label}`}
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
                const OptionIcon = option.icon;
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
                    <OptionIcon className="h-4 w-4 flex-shrink-0" />
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
// ORDER CARD COMPONENT
// ============================================================================

interface OrderCardProps {
  order: any;
  onClaim: (orderId: string) => void;
  isClaiming: boolean;
  claimingOrderId: string | null;
}

function OrderCard({ order, onClaim, isClaiming, claimingOrderId }: OrderCardProps) {
  const isUrgent = order.priority === 'URGENT' || order.priority === 'HIGH';

  return (
    <motion.div
      variants={cardVariants}
      layout
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative group"
    >
      {/* Urgent glow effect */}
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
        {/* Scan line effect */}
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

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/50">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Items</p>
              <p className="text-xl font-black text-white">{order.items?.length || 0}</p>
            </div>
            <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/50">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Total</p>
              <p className="text-xl font-black text-purple-400">
                ${Number(order.totalAmount || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Verified
              </span>
              <span className="text-sm font-black text-purple-400">{order.progress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${order.progress}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-400 relative"
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-[shimmer_2s_infinite]" />
              </motion.div>
            </div>
          </div>

          {/* Items List */}
          {order.items && order.items.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-48">
              {order.items.map((item: any, itemIdx: number) => {
                const isCompleted =
                  item.status === 'COMPLETED' ||
                  item.status === 'FULLY_PICKED' ||
                  (item.verifiedQuantity || 0) >= item.quantity;
                const isSkipped = item.status === 'SKIPPED';
                const isPartial =
                  !isCompleted &&
                  !isSkipped &&
                  (item.verifiedQuantity || 0) > 0 &&
                  (item.verifiedQuantity || 0) < item.quantity;

                const statusStyles = isCompleted
                  ? 'border-purple-500/50 bg-purple-500/10'
                  : isSkipped
                    ? 'border-orange-500/50 bg-orange-500/10'
                    : isPartial
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-slate-700/50 bg-slate-800/50';

                return (
                  <motion.div
                    key={`${order.orderId}-item-${itemIdx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: itemIdx * 0.05 }}
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
                        className={`font-bold text-sm ${
                          isCompleted
                            ? 'text-purple-400'
                            : isSkipped
                              ? 'text-orange-400'
                              : 'text-slate-300'
                        }`}
                      >
                        {isSkipped ? 'SKIPPED' : `${item.verifiedQuantity || 0}/${item.quantity}`}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Claim Button */}
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              fullWidth
              size="lg"
              variant="primary"
              onClick={() => onClaim(order.orderId)}
              disabled={
                isClaiming ||
                (order.status !== 'PICKED' && order.status !== 'PACKING') ||
                (order.status === 'PICKED' && claimingOrderId === order.orderId)
              }
              isLoading={order.status === 'PICKED' && claimingOrderId === order.orderId}
              className="font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 text-slate-900 border-0 shadow-[0_0_20px_rgba(192,132,252,0.3)] hover:shadow-[0_0_30px_rgba(192,132,252,0.5)] transition-all duration-300"
            >
              {order.status === 'PACKING' ? (
                'Continue'
              ) : (
                <span className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5" />
                  Start Packing
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
// COMPONENT
// ============================================================================

export function PackingQueuePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore(state => state.user);
  const { showToast } = useToast();

  // Track current page for admin dashboard
  usePageTracking({ view: 'Packing Queue' });

  const [statusFilter, setStatusFilter] = useState<OrderStatus>(OrderStatus.PICKED);
  const [priorityFilter, setPriorityFilter] = useState<OrderPriority | undefined>();
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Read status from URL params immediately on every render
  const urlStatus = searchParams.get('status') as OrderStatus | null;
  const effectiveStatusFilter =
    urlStatus && Object.values(OrderStatus).includes(urlStatus) ? urlStatus : statusFilter;

  // Ref to prevent multiple simultaneous claim attempts (synchronous check)
  const isClaimingRef = useRef(false);
  // Ref to track last claimed order to prevent duplicate WebSocket toasts
  const lastClaimedOrderIdRef = useRef<string | null>(null);
  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch orders based on status filter
  const { data: queueData, isLoading } = useQuery({
    queryKey: ['orders', 'packing-queue', statusFilter, priorityFilter, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (statusFilter === 'PACKING' && !(isAdmin && !getEffectiveRole())) {
        params.append('packerId', currentUser?.userId || '');
      }
      params.append('page', String(page));
      params.append('limit', String(pageSize));

      const response = await apiClient.get(`/orders/full?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  // Separate query to check if user has PACKING orders (for auto-detect)
  const allOrdersQuery = useQuery({
    queryKey: ['orders', 'all-packing', currentUser?.userId],
    queryFn: async () => {
      if (!currentUser?.userId) return { orders: [] };
      const response = await apiClient.get(
        `/orders/full?status=${OrderStatus.PACKING}&packerId=${currentUser.userId}`
      );
      return response.data;
    },
    refetchOnMount: 'always',
  });
  const allOrdersData = allOrdersQuery.data;

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter]);

  const orders = queueData?.orders || [];

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) {
      return orders;
    }

    const query = searchQuery.toLowerCase().trim();

    return orders.filter((order: Order) => {
      if (order.orderId.toLowerCase().includes(query)) {
        return true;
      }
      if (order.customerName?.toLowerCase().includes(query)) {
        return true;
      }
      if (order.items && order.items.length > 0) {
        return order.items.some((item: any) => {
          if (item.sku?.toLowerCase().includes(query)) {
            return true;
          }
          if (item.name?.toLowerCase().includes(query)) {
            return true;
          }
          return false;
        });
      }
      return false;
    });
  }, [orders, searchQuery]);

  useEffect(() => {
    if (orders.length > 0) {
      console.log('[PackingQueue] Orders loaded:', orders);
    }
  }, [orders]);

  // Track if we've done the initial auto-detect
  const hasAutoDetectedRef = useRef(false);

  // Handler to update status filter and sync with URL
  const handleStatusFilterChange = (status: OrderStatus) => {
    setStatusFilter(status);
    setSearchParams({ status });
    hasAutoDetectedRef.current = true;
  };

  // Auto-detect which tab to show - runs once on mount
  useEffect(() => {
    if (hasAutoDetectedRef.current) {
      return;
    }

    const urlStatus = searchParams.get('status') as OrderStatus | null;
    const hasExplicitUrlStatus = urlStatus && Object.values(OrderStatus).includes(urlStatus);

    if (allOrdersData?.orders) {
      if (hasExplicitUrlStatus) {
        setStatusFilter(urlStatus!);
        hasAutoDetectedRef.current = true;
        return;
      }

      const allOrders = allOrdersData.orders || [];
      const packingOrders = allOrders.filter(o => o.status === OrderStatus.PACKING);

      if (packingOrders.length > 0) {
        setStatusFilter(OrderStatus.PACKING);
        setSearchParams({ status: OrderStatus.PACKING }, { replace: true });
        hasAutoDetectedRef.current = true;
        return;
      }

      setStatusFilter(OrderStatus.PICKED);
      hasAutoDetectedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOrdersData]);

  // Refetch orders when component mounts or filter changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient, statusFilter, priorityFilter]);

  // Polling fallback
  useEffect(() => {
    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [queryClient]);

  const claimMutation = useClaimOrderForPacking();

  const handleClaimOrder = async (orderId: string) => {
    if (!currentUser?.userId) {
      showToast('You must be logged in to claim orders', 'error');
      return;
    }

    // If already in PACKING status, just navigate to it
    const order = orders.find((o: any) => o.orderId === orderId);
    if (order?.status === OrderStatus.PACKING) {
      navigate(`/packing/${orderId}/pack`);
      return;
    }

    if (isClaimingRef.current) {
      return;
    }

    if (claimingOrderId === orderId) {
      return;
    }

    isClaimingRef.current = true;
    setClaimingOrderId(orderId);
    lastClaimedOrderIdRef.current = orderId;

    try {
      await queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });

      await claimMutation.mutateAsync(
        { orderId, packerId: currentUser.userId },
        {
          onSuccess: () => {
            showToast(`Order ${orderId} claimed successfully`, 'success');
            navigate(`/packing/${orderId}/pack`);
          },
        }
      );
    } catch (error: any) {
      if (error?.response?.data?.error) {
        const backendError = error.response.data.error;

        if (backendError.includes('already claimed')) {
          showToast('Order is already claimed by another packer', 'error');
          queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });
        } else if (backendError.includes('status')) {
          showToast(`Order cannot be claimed: ${backendError}`, 'error');
        } else {
          showToast(backendError, 'error');
        }
      } else {
        showToast(error instanceof Error ? error.message : 'Failed to claim order', 'error');
      }
    } finally {
      isClaimingRef.current = false;
      setClaimingOrderId(null);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900/20 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Diagonal scan lines */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_100px,rgba(192,132,252,0.015)_100px,rgba(192,132,252,0.015)_200px)]" />
        {/* Corner accents */}
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
        {/* Breadcrumb */}
        <Breadcrumb />

        {/* Page Header */}
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
            Packing Queue
          </h1>
          <p className="mt-4 text-slate-400 text-sm font-medium uppercase tracking-widest">
            {queueData?.total || 0} orders available
          </p>
        </motion.div>

        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <StatusFilterDropdown value={statusFilter} onChange={handleStatusFilterChange} />
          <PriorityFilterDropdown value={priorityFilter} onChange={setPriorityFilter} />
        </motion.div>

        {/* Order Grid */}
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
                    <CubeIcon className="h-10 w-10 text-slate-600" />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-wider">
                    {searchQuery ? 'No matching orders' : 'No orders to pack'}
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
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  onClaim={handleClaimOrder}
                  isClaiming={claimMutation.isPending}
                  claimingOrderId={claimingOrderId}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
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

      {/* Custom keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
