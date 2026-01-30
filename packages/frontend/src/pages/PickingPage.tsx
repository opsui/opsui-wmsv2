/**
 * Picking page
 *
 * Main picking interface for scanning and picking items
 */

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useOrder, usePickItem, useCompleteOrder, useLogException } from '@/services/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ScanInput,
  Button,
  Header,
  UnclaimModal,
  UndoPickModal,
  useToast,
  ConfirmDialog,
} from '@/components/shared';
import { TaskStatusBadge } from '@/components/shared';
import { formatBinLocation } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { usePickUpdates, useZoneUpdates } from '@/hooks/useWebSocket';
import {
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MinusCircleIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';
import { usePageTracking, PageViews } from '@/hooks/usePageTracking';
import { TaskStatus, ExceptionType } from '@opsui/shared';

// ============================================================================
// COMPONENT
// ============================================================================

export function PickingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.user);
  const userRole = useAuthStore(state => state.user?.role);
  const { showToast } = useToast();

  // Track current page for admin dashboard
  usePageTracking({ view: orderId ? PageViews.PICKING(orderId) : 'Picking' });

  const [scanValue, setScanValue] = useState('');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Exception modal state
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionType, setExceptionType] = useState<ExceptionType>(ExceptionType.OUT_OF_STOCK);
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionQuantity, setExceptionQuantity] = useState(0);
  const [substituteSku, setSubstituteSku] = useState('');
  const [exceptionStep, setExceptionStep] = useState<'type' | 'details' | 'confirm'>('type');

  // Unclaim modal state
  const [showUnclaimModal, setShowUnclaimModal] = useState(false);
  const [isUnclaiming, setIsUnclaiming] = useState(false);

  // Undo pick modal state
  const [showUndoPickModal, setShowUndoPickModal] = useState(false);
  const [isUndoingPick, setIsUndoingPick] = useState(false);
  const [undoPickItemIndex, setUndoPickItemIndex] = useState<number | null>(null);

  // Confirm dialog states
  const [completeOrderConfirm, setCompleteOrderConfirm] = useState<{
    isOpen: boolean;
    skippedItems: any[];
  }>({ isOpen: false, skippedItems: [] });
  const [unskipConfirm, setUnskipConfirm] = useState<{ isOpen: boolean; index: number; item: any }>(
    { isOpen: false, index: -1, item: null }
  );

  const { data: order, isLoading, refetch } = useOrder(orderId!);
  const pickMutation = usePickItem();
  const completeMutation = useCompleteOrder();
  const logExceptionMutation = useLogException();

  // ==========================================================================
  // Real-time WebSocket Subscriptions
  // ==========================================================================

  // Subscribe to pick updates for this order
  usePickUpdates({
    onPickCompleted: data => {
      // If this pick is for the current order, refresh the order data
      if (data.orderId === orderId) {
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
    },
    onPickStarted: data => {
      // If this pick is for the current order, refresh the order data
      if (data.orderId === orderId) {
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      }
    },
  });

  // Subscribe to zone updates (for zone reassignments during picking)
  useZoneUpdates({
    onZoneAssignment: data => {
      // If this zone assignment affects the current user, refresh
      if (data.pickerId === currentUser?.userId) {
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        showToast({
          title: 'Zone Assignment Updated',
          message: `You have been assigned to ${data.zone}`,
          type: 'info',
          duration: 3000,
        });
      }
    },
  });

  // Ref to track if we've already attempted to claim this order
  const hasClaimedRef = useRef(false);

  // Ref to prevent race conditions during claim
  const isClaimingRef = useRef(false);

  // Claim order mutation
  const claimMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post(`/orders/${orderId}/claim`, {
        pickerId: useAuthStore.getState().user?.userId,
      });
      return response.data;
    },
    onSuccess: data => {
      console.log('[PickingPage] Order claimed successfully:', data);
      hasClaimedRef.current = true;
      isClaimingRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: (error: any) => {
      console.error('[PickingPage] Claim error:', error);
      isClaimingRef.current = false;
      const errorMsg = error.response?.data?.error || error.message || 'Failed to claim order';

      // Don't reset hasClaimedRef on conflict errors (409) - order might actually be claimed
      const isConflict = error.response?.status === 409;
      if (!isConflict) {
        hasClaimedRef.current = false; // Only reset on non-conflict errors
      }

      // Handle specific claim errors
      if (errorMsg.includes('already claimed')) {
        setClaimError(`Order is already claimed by another picker`);
      } else if (errorMsg.includes('cannot be claimed')) {
        setClaimError(`Order cannot be claimed: ${errorMsg}`);
      } else if (errorMsg.includes('maximum limit')) {
        setClaimError(`You have too many active orders. Complete some before claiming more.`);
      } else {
        setClaimError(`Failed to claim order: ${errorMsg}`);
      }

      showToast(errorMsg, 'error');
    },
  });

  // Reset claim ref when orderId changes
  useEffect(() => {
    hasClaimedRef.current = false;
    isClaimingRef.current = false;
    setClaimError(null);
  }, [orderId]);

  // Claim order on page mount if not already claimed
  // Use useLayoutEffect to ensure ref updates happen synchronously before React StrictMode's second invocation
  useLayoutEffect(() => {
    if (orderId && order) {
      console.log(`[PickingPage] Checking if order needs to be claimed: ${orderId}`);
      console.log(`[PickingPage] Order status: ${order.status}, pickerId: ${order.pickerId}`);
      console.log(
        `[PickingPage] hasClaimedRef: ${hasClaimedRef.current}, isClaiming: ${isClaimingRef.current}, isPending: ${claimMutation.isPending}`
      );

      // Check if this is a view-only scenario (admin/supervisor viewing someone else's order OR viewing a PICKED order)
      const currentUserId = useAuthStore.getState().user?.userId;
      const isViewOnlyOrder =
        order.status === 'PICKED' ||
        order.status === 'SHIPPED' ||
        (order.pickerId &&
          order.pickerId !== currentUserId &&
          (userRole === 'ADMIN' || userRole === 'SUPERVISOR'));

      if (isViewOnlyOrder) {
        console.log(
          `[PickingPage] Order is in view-only mode (status: ${order.status}), skipping claim logic`
        );
        return;
      }

      // Check if order is already claimed by current user OR is already in PICKING/IN_PROGRESS status
      const isAlreadyClaimed = order?.pickerId === currentUserId;
      const isAlreadyInProgress = order?.status === 'PICKING' || order?.status === 'IN_PROGRESS';

      // Prevent multiple claim attempts - use ref + isPending check + isClaiming check + isError check
      // This prevents race conditions from rapid useEffect triggers
      if (
        isClaimingRef.current ||
        claimMutation.isPending ||
        hasClaimedRef.current ||
        claimMutation.isError
      ) {
        console.log(`[PickingPage] Already claiming, claimed, or had error, skipping`);
        return;
      }

      if (isAlreadyClaimed || isAlreadyInProgress) {
        console.log(`[PickingPage] Order already claimed or in progress: ${orderId}`);
        if (isAlreadyInProgress && !isAlreadyClaimed) {
          console.log(
            `[PickingPage] Order is in ${order.status} status but not claimed by current user. Showing warning.`
          );
          // Don't block the user - they might be resuming their work
        }
        hasClaimedRef.current = true; // Mark as claimed since we're working on it
      } else if (order.status === 'PENDING') {
        // Validate order status one more time before claiming to prevent race conditions
        // This double-checks the order state right before the mutation call
        if (order.status !== 'PENDING') {
          console.log(
            `[PickingPage] Order status changed to ${order.status} before claim, skipping`
          );
          hasClaimedRef.current = true;
          return;
        }

        if (order.pickerId && order.pickerId !== currentUserId) {
          console.log(
            `[PickingPage] Order claimed by another picker (${order.pickerId}), skipping`
          );
          hasClaimedRef.current = true;
          return;
        }

        console.log(`[PickingPage] Attempting to claim order: ${orderId}`);
        // Set claiming flag IMMEDIATELY to prevent race condition with React StrictMode double invocation
        isClaimingRef.current = true;
        hasClaimedRef.current = true; // Mark as claimed immediately to prevent double claims
        claimMutation.mutate(orderId);
      } else {
        console.log(`[PickingPage] Order is in ${order.status} status, cannot claim`);
        setClaimError(`Order is in ${order.status} status and cannot be claimed`);
      }
    }
  }, [orderId, order, claimMutation.isPending, claimMutation.isError]);

  // Call getNextTask after order is loaded (and potentially claimed)
  useEffect(() => {
    if (orderId && !claimError && !claimMutation.isPending) {
      console.log(`[PickingPage] Calling getNextTask API for: ${orderId}`);

      const callGetNextTask = async () => {
        try {
          const response = await apiClient.get(`/orders/${orderId}/next-task`);
          console.log(`[PickingPage] getNextTask response:`, response);
          console.log(`[PickingPage] getNextTask success - invalidating picker-activity`);
          // Invalidate picker activity to update admin dashboard
          queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
        } catch (error) {
          console.error(`[PickingPage] getNextTask error for ${orderId}:`, error);
        }
      };

      callGetNextTask();
    }
  }, [orderId, claimError, claimMutation.isPending, queryClient]);

  // Track window visibility for ACTIVE/IDLE status
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      console.log(
        `[PickingPage] Window visibility: ${isVisible ? 'VISIBLE (ACTIVE)' : 'HIDDEN (IDLE)'}`
      );

      if (orderId) {
        apiClient
          .put(`/orders/${orderId}/picker-status`, {
            status: isVisible ? 'ACTIVE' : 'IDLE',
          })
          .catch(error => {
            console.error(`[PickingPage] Failed to update picker status:`, error);
          });
      }
    };

    // Set initial status
    handleVisibilityChange();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle tab/window close - mark as IDLE and clear location before closing
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery during page unload
      // Call /auth/set-idle which sets status to IDLE and clears current_view (location) to None
      const data = JSON.stringify({});
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon('/api/auth/set-idle', blob);
      console.log('[PickingPage] Tab closing - marked picker as IDLE and cleared location to None');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [orderId]);

  // Real-time updates for view mode (admin viewing picker's work)
  useEffect(() => {
    // Calculate if we're in view mode
    const isViewMode =
      order &&
      order.pickerId &&
      order.pickerId !== currentUser?.userId &&
      (userRole === 'ADMIN' || userRole === 'SUPERVISOR');

    // Only poll when in view mode (admin/supervisor viewing someone else's work)
    if (!isViewMode) {
      return;
    }

    console.log(`[PickingPage] Starting real-time updates for view mode`);

    // Poll every 2 seconds to get latest order state
    const intervalId = setInterval(() => {
      console.log(`[PickingPage] Refetching order data for view mode`);
      refetch();
    }, 2000);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      console.log(`[PickingPage] Stopped real-time updates for view mode`);
    };
  }, [order, currentUser, userRole, refetch]);

  // Get current pick task
  const currentTask = order?.items[currentTaskIndex];

  // Calculate progress
  const totalTasks = order?.items.length || 0;
  const completedTasks =
    order?.items.filter(item => item.pickedQuantity >= item.quantity).length || 0;

  // Reset scan error when current task changes
  useEffect(() => {
    setScanError(null);
  }, [currentTaskIndex]);

  // Auto-select first incomplete item when order loads
  useEffect(() => {
    if (order && order.items.length > 0) {
      const firstIncompleteIndex = order.items.findIndex(
        item => item.pickedQuantity < item.quantity
      );
      if (firstIncompleteIndex !== -1 && firstIncompleteIndex !== currentTaskIndex) {
        setCurrentTaskIndex(firstIncompleteIndex);
      }
    }
  }, [order]);

  if (!orderId) {
    return <div>No order ID provided</div>;
  }

  // Show claim loading state
  if (claimMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            <p className="text-gray-600">Claiming order...</p>
            <p className="text-sm text-gray-500">Please wait while we assign this order to you</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show claim error
  if (claimError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-danger-500 border-2">
          <CardContent className="p-6 text-center space-y-4">
            <ExclamationCircleIcon className="h-12 w-12 text-danger-600 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">Cannot Start Picking</h2>
            <p className="text-gray-600">{claimError}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={() => navigate('/orders')}>
                Back to Order Queue
              </Button>
              <Button
                onClick={() => {
                  setClaimError(null);
                  claimMutation.mutate(orderId!);
                }}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card variant="glass">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">Order not found</p>
            <Button onClick={() => navigate('/orders')} className="mt-4">
              Back to Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleScan = async (value: string) => {
    if (!currentTask) {
      showToast('No current task to pick', 'error');
      return;
    }

    setScanError(null);

    // Use barcode if available, otherwise use SKU
    const scanValue = value.trim();

    // Validate scan matches either barcode OR SKU
    // This allows scanning either the barcode or SKU code
    const isValidScan =
      (currentTask.barcode && scanValue === currentTask.barcode) || scanValue === currentTask.sku;

    if (!isValidScan) {
      // Show barcode as primary expected value, with SKU as subtle alternative
      const expectedBarcodes = currentTask.barcode ? currentTask.barcode : currentTask.sku;
      setScanError(`Wrong scan! Expected: ${expectedBarcodes}, scanned: ${scanValue}`);
      showToast(`Wrong barcode scanned`, 'error');
      return;
    }

    // Perform pick - backend already handles both barcode and SKU validation
    try {
      const result = await pickMutation.mutateAsync({
        orderId,
        dto: {
          barcode: currentTask.barcode || currentTask.sku,
          quantity: 1, // Pick one at a time for simplicity
          binLocation: currentTask.binLocation,
          pickTaskId: currentTask.orderItemId,
        },
      });

      showToast('Item picked!', 'success');

      // Refetch order data to get updated state
      await refetch();

      // Move to next task or complete order
      const remaining = currentTask.quantity - currentTask.pickedQuantity - 1;
      if (remaining <= 0) {
        // Task complete, move to next
        if (currentTaskIndex < totalTasks - 1) {
          setCurrentTaskIndex(currentTaskIndex + 1);
        } else {
          // All tasks complete
          await handleCompleteOrder();
        }
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Pick failed');
      showToast(error instanceof Error ? error.message : 'Failed to pick item', 'error');
    }

    setScanValue('');
  };

  const handleCompleteOrder = async () => {
    // Check for skipped items
    const skippedItems = order?.items.filter(item => item.status === 'SKIPPED');

    if (skippedItems && skippedItems.length > 0) {
      // Show confirmation dialog for skipped items
      setCompleteOrderConfirm({ isOpen: true, skippedItems });
      return;
    }

    try {
      await completeMutation.mutateAsync({
        orderId,
        dto: {
          orderId,
          pickerId: order.pickerId || '',
        },
      });
      showToast('Order completed!', 'success');
      navigate('/orders');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to complete order', 'error');
    }
  };

  const confirmCompleteOrder = async () => {
    try {
      await completeMutation.mutateAsync({
        orderId,
        dto: {
          orderId,
          pickerId: order.pickerId || '',
        },
      });
      showToast('Order completed!', 'success');
      setCompleteOrderConfirm({ isOpen: false, skippedItems: [] });
      navigate('/orders');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to complete order', 'error');
    }
  };

  const handleUnskipItem = async (index: number) => {
    const item = order?.items[index];
    if (!item) return;

    setUnskipConfirm({ isOpen: true, index, item });
  };

  const confirmUnskipItem = async () => {
    const { index, item } = unskipConfirm;
    if (!item) return;

    try {
      // Update pick task status back to PENDING
      await apiClient.put(`/orders/${orderId}/pick-task/${item.orderItemId}`, {
        status: 'PENDING',
      });

      showToast('Skip reverted successfully!', 'success');
      setUnskipConfirm({ isOpen: false, index: -1, item: null });

      // Refetch order data to get updated state
      await refetch();

      // Set this as current task if it's not completed
      if (item.pickedQuantity < item.quantity) {
        setCurrentTaskIndex(index);
        setScanValue('');
        setScanError(null);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to revert skip', 'error');
    }
  };

  const handleUndoPick = async (index: number) => {
    const item = order?.items[index];
    if (!item) return;

    // Can only undo if there's something picked
    if (item.pickedQuantity <= 0) return;

    // Open the undo-pick modal instead of using prompt
    setUndoPickItemIndex(index);
    setShowUndoPickModal(true);
  };

  const handleConfirmUndoPick = async (reason: string, notes: string) => {
    const item = undoPickItemIndex !== null && order?.items ? order.items[undoPickItemIndex] : null;
    if (!item || undoPickItemIndex === null) return;

    setIsUndoingPick(true);
    try {
      const fullReason = notes.trim() ? `${reason}\n\nAdditional notes: ${notes.trim()}` : reason;

      await apiClient.post(`/orders/${orderId}/undo-pick`, {
        pickTaskId: item.orderItemId,
        quantity: 1, // Always undo 1 at a time for safety
        reason: fullReason.trim(),
      });

      showToast('Pick undone!', 'success');
      setShowUndoPickModal(false);
      setUndoPickItemIndex(null);

      // Refetch order data to get updated state
      await refetch();

      // If we undid current item, it stays current
      // If we undid an item above current one, navigate to that item
      if (undoPickItemIndex < currentTaskIndex) {
        setCurrentTaskIndex(undoPickItemIndex);
        setScanValue('');
        setScanError(null);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to undo pick', 'error');
    } finally {
      setIsUndoingPick(false);
    }
  };

  const handleUnclaimOrder = async () => {
    setShowUnclaimModal(true);
  };

  const handleConfirmUnclaim = async (reason: string, notes: string) => {
    setIsUnclaiming(true);
    try {
      const fullReason = notes.trim() ? `${reason}\n\nAdditional notes: ${notes.trim()}` : reason;

      await apiClient.post(`/orders/${orderId}/unclaim`, {
        reason: fullReason,
      });

      showToast('Order unclaimed and reset to PENDING!', 'success');
      setShowUnclaimModal(false);
      hasClaimedRef.current = false; // Reset ref after unclaiming
      isClaimingRef.current = false; // Reset claiming ref to allow re-claiming if needed
      setClaimError(null); // Clear any previous claim errors
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      navigate('/orders');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to unclaim order';
      showToast(errorMsg, 'error');
    } finally {
      setIsUnclaiming(false);
    }
  };

  // Exception handling functions
  const handleReportException = () => {
    if (!currentTask) return;
    setShowExceptionModal(true);
    setExceptionStep('type');
    setExceptionType(ExceptionType.OUT_OF_STOCK);
    setExceptionReason('');
    setExceptionQuantity(0);
    setSubstituteSku('');
  };

  const handleLogException = async () => {
    if (!currentTask || !currentUser) return;

    try {
      // Validate required fields before sending
      if (!currentTask.orderItemId) {
        showToast('Order item ID is missing. Please try refreshing the page.', 'error');
        console.error('[PickingPage] Missing orderItemId:', currentTask);
        return;
      }

      if (!currentTask.sku) {
        showToast('SKU is missing. Please try refreshing the page.', 'error');
        return;
      }

      // Prepare exception data with proper handling for optional fields
      const quantityActual =
        exceptionType === ExceptionType.SHORT_PICK
          ? exceptionQuantity > 0
            ? exceptionQuantity
            : 0
          : currentTask.pickedQuantity;

      const exceptionData: any = {
        orderId: orderId!,
        orderItemId: currentTask.orderItemId,
        sku: currentTask.sku,
        type: exceptionType,
        quantityExpected: currentTask.quantity,
        quantityActual: quantityActual,
        reason: exceptionReason || `Exception reported: ${exceptionType}`,
        substituteSku:
          exceptionType === ExceptionType.SUBSTITUTION && substituteSku.trim()
            ? substituteSku
            : undefined,
      };

      console.log('[PickingPage] Logging exception with data:', exceptionData);
      console.log('[PickingPage] currentTask:', currentTask);

      await logExceptionMutation.mutateAsync(exceptionData);

      showToast('Exception logged successfully!', 'success');
      setShowExceptionModal(false);

      // Then skip the item after logging exception
      await apiClient.post(`/orders/${orderId}/skip-task`, {
        pickTaskId: currentTask.orderItemId,
        reason: `Exception: ${exceptionType} - ${exceptionReason}`,
      });

      // Refetch and move to next task
      await refetch();
      if (currentTaskIndex < totalTasks - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
        setScanValue('');
        setScanError(null);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to log exception', 'error');
    }
  };

  const isOrderComplete = completedTasks === totalTasks && totalTasks > 0;

  // Determine if user is viewing in "view-only mode"
  // This is true when:
  // 1. Admin viewing another picker's active order
  // 2. Admin viewing completed (PICKED/SHIPPED) orders
  const isViewMode =
    order &&
    (userRole === 'ADMIN' || userRole === 'SUPERVISOR') &&
    ((order.pickerId && order.pickerId !== currentUser?.userId) ||
      order.status === 'PICKED' ||
      order.status === 'SHIPPED');

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-in">
        {/* View Mode Banner */}
        {isViewMode && (
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 sm:p-5 flex items-center gap-4 card-hover">
            <ExclamationCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                {order.status === 'PICKED' || order.status === 'SHIPPED'
                  ? 'Viewing completed order'
                  : "Viewing this picker's work in real-time"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                You are in view-only mode. Interactions are disabled.
              </p>
            </div>
          </div>
        )}

        {/* Order Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {isViewMode && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 flex-shrink-0"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Dashboard
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight truncate">
                {order.orderId}
              </h1>
              <p className="mt-2 text-gray-400 text-sm truncate">{order.customerName}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {!isViewMode && (
              <>
                <Button
                  variant="danger"
                  onClick={handleUnclaimOrder}
                  disabled={order.status !== 'PICKING' && order.status !== 'IN_PROGRESS'}
                  className="touch-target"
                >
                  Unclaim Order
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/orders')}
                  className="touch-target"
                >
                  Exit
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress */}
        <Card variant="glass" className="card-hover">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Progress: {completedTasks} / {totalTasks} items
              </span>
              <span className="text-xl sm:text-2xl font-bold text-white">{order.progress}%</span>
            </div>
            <div className="w-full bg-white/[0.05] rounded-full h-2 sm:h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-400 h-full rounded-full transition-all duration-500 shadow-glow"
                style={{ width: `${order.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {isOrderComplete ? (
          /* Complete Order Card */
          <Card variant="glass" className="border-success-500/50 border-2 card-hover">
            <CardContent className="p-6 sm:p-10 text-center space-y-4 sm:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-success-500/20 flex items-center justify-center animate-scale-in">
                <CheckIcon className="h-8 w-8 sm:h-10 sm:w-10 text-success-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">All Items Picked!</h2>
              <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">
                Order is ready to be completed and sent to packing.
              </p>
              <Button
                size="lg"
                variant="success"
                onClick={handleCompleteOrder}
                isLoading={completeMutation.isPending}
                disabled={isViewMode ? true : undefined}
                className="shadow-glow touch-target"
              >
                Complete Order
              </Button>
            </CardContent>
          </Card>
        ) : currentTask ? (
          /* Current Task Card */
          <Card variant="glass" className="border-primary-500/50 border-2 shadow-glow card-hover">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span className="text-white">Current Pick Task</span>
                <TaskStatusBadge
                  status={
                    currentTask.pickedQuantity > 0 ? TaskStatus.IN_PROGRESS : TaskStatus.PENDING
                  }
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {/* Item Info */}
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {currentTask.name}
                  </h3>
                  {currentTask.barcode && (
                    <p className="text-lg sm:text-2xl font-mono text-gray-300 mt-3 tracking-wider bg-white/[0.02] inline-block px-3 sm:px-4 py-2 rounded-lg border border-white/[0.08] text-sm sm:text-base break-all">
                      {currentTask.barcode}
                    </p>
                  )}
                  {!currentTask.barcode && (
                    <p className="text-base sm:text-lg text-warning-400 mt-3 font-mono bg-warning-500/10 inline-block px-3 sm:px-4 py-2 rounded-lg border border-warning-500/30">
                      No barcode assigned
                    </p>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 py-4 sm:py-6 bg-white/[0.02] rounded-xl border border-white/[0.08]">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider mb-2">
                    Picked
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-primary-400">
                    {currentTask.pickedQuantity}
                  </p>
                </div>
                <div className="text-4xl sm:text-5xl text-gray-600">/</div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider mb-2">
                    Needed
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-white">
                    {currentTask.quantity}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="bg-primary-500/10 rounded-xl p-4 sm:p-5 border border-primary-500/30">
                <p className="text-xs sm:text-sm text-gray-400 mb-2 uppercase tracking-wider">
                  Go to bin location:
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-primary-400 font-mono tracking-wider break-all">
                  {formatBinLocation(currentTask.binLocation)}
                </p>
              </div>

              {/* Scan Input */}
              <div>
                <ScanInput
                  value={scanValue}
                  onChange={setScanValue}
                  onScan={handleScan}
                  placeholder={
                    currentTask.barcode ? 'Scan barcode...' : 'Scan or enter item code...'
                  }
                  error={scanError || undefined}
                  disabled={isViewMode ? true : undefined}
                />
                {currentTask.barcode && (
                  <p className="mt-3 text-sm text-gray-400 bg-white/[0.02] inline-block px-3 sm:px-4 py-2 rounded-lg border border-white/[0.08]">
                    Scan this barcode:{' '}
                    <span className="font-mono font-semibold text-primary-400 break-all">
                      {currentTask.barcode}
                    </span>
                  </p>
                )}
                {!currentTask.barcode && (
                  <p className="mt-3 text-sm text-gray-400 bg-white/[0.02] inline-block px-3 sm:px-4 py-2 rounded-lg border border-white/[0.08]">
                    No barcode assigned - scan or enter item code manually
                  </p>
                )}
              </div>

              {/* Actions */}
              {!isViewMode && (
                <div className="flex gap-3">
                  <Button
                    variant="warning"
                    size="lg"
                    onClick={handleReportException}
                    disabled={pickMutation.isPending}
                    className="w-full shadow-lg touch-target"
                  >
                    <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
                    Report Exception
                  </Button>
                </div>
              )}
              {isViewMode && (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 text-center">
                  <p className="text-sm text-primary-300">
                    Interactions are disabled in view-only mode
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* No Current Task */
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-gray-600">No items to pick</p>
            </CardContent>
          </Card>
        )}

        {/* Remaining Items List */}
        <Card variant="glass" className="card-hover">
          <CardHeader>
            <CardTitle>Items in Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items.map((item, index) => {
                const isCompleted = item.pickedQuantity >= item.quantity;
                const isSkipped = item.status === 'SKIPPED';
                const isCurrent = index === currentTaskIndex;

                return (
                  <div
                    key={item.orderItemId}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-xl border transition-all duration-300 gap-3 ${
                      isCompleted
                        ? 'border-success-500/50 bg-success-500/10 shadow-glow'
                        : isSkipped
                          ? 'border-warning-500/50 bg-warning-500/10'
                          : isCurrent
                            ? 'border-primary-500/50 bg-primary-500/10 shadow-glow'
                            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                    } ${isCurrent ? 'ring-2 ring-primary-500/30' : ''}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {isCompleted && (
                          <CheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-success-400" />
                        )}
                        {isSkipped && (
                          <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-warning-400" />
                            {!isViewMode && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleUnskipItem(index);
                                }}
                                className="text-warning-400 hover:text-warning-300 transition-colors p-1 hover:bg-warning-500/20 rounded-lg touch-target"
                                title="Revert skip"
                              >
                                <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <div>
                          <p
                            className={`font-semibold text-base sm:text-lg ${
                              isCompleted
                                ? 'text-success-300'
                                : isSkipped
                                  ? 'text-warning-300'
                                  : 'text-white'
                            }`}
                          >
                            {item.name}
                          </p>
                          {!item.barcode && (
                            <p className="text-xs text-warning-400 font-mono mt-1">
                              No barcode assigned
                            </p>
                          )}
                          {item.barcode && (
                            <p className="text-xs sm:text-sm text-gray-500 font-mono truncate">
                              {item.barcode}
                            </p>
                          )}
                          {isSkipped && item.skipReason && (
                            <p className="text-xs sm:text-sm text-warning-300 mt-2 bg-warning-500/10 inline-block px-2 py-1 rounded">
                              {item.skipReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`font-semibold text-base sm:text-lg ${
                            isCompleted
                              ? 'text-success-300'
                              : isSkipped
                                ? 'text-warning-300'
                                : 'text-white'
                          }`}
                        >
                          {isSkipped ? 'Skipped' : `${item.pickedQuantity} / ${item.quantity}`}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 font-mono">
                          {item.binLocation}
                        </p>

                        {/* Undo Pick button */}
                        {item.pickedQuantity > 0 && !isSkipped && !isViewMode && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleUndoPick(index);
                            }}
                            className="mt-2 text-error-400 hover:text-error-300 transition-colors flex items-center gap-1 justify-end hover:bg-error-500/10 px-2 py-1 rounded-lg touch-target"
                            title="Remove last picked item"
                          >
                            <MinusCircleIcon className="h-4 w-4" />
                            <span className="text-xs">Undo Pick</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Exception Modal */}
        {showExceptionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="glass-card shadow-xl max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-warning-500 to-warning-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <WrenchScrewdriverIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <h2 className="text-lg sm:text-xl font-bold">Report Exception</h2>
                  </div>
                  <button
                    onClick={() => setShowExceptionModal(false)}
                    className="text-white hover:text-warning-200 transition-colors touch-target p-1"
                  >
                    <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
              </div>

              {/* Step Indicator */}
              <div className="px-4 sm:px-6 py-2 sm:py-3 bg-white/[0.05] border-b border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                        exceptionStep === 'type'
                          ? 'bg-warning-500 text-white'
                          : exceptionStep === 'details' || exceptionStep === 'confirm'
                            ? 'bg-success-500 text-white'
                            : 'bg-gray-600 text-gray-400'
                      }`}
                    >
                      {exceptionStep === 'type' ? '1' : '✓'}
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white hidden xs:inline">
                      Type
                    </span>
                  </div>
                  <div
                    className={`h-0.5 w-6 sm:w-12 ${
                      exceptionStep === 'details' || exceptionStep === 'confirm'
                        ? 'bg-success-500'
                        : 'bg-gray-600'
                    }`}
                  ></div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                        exceptionStep === 'details'
                          ? 'bg-warning-500 text-white'
                          : exceptionStep === 'confirm'
                            ? 'bg-success-500 text-white'
                            : 'bg-gray-600 text-gray-400'
                      }`}
                    >
                      {exceptionStep === 'details' ? '2' : exceptionStep === 'confirm' ? '✓' : '2'}
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white hidden sm:inline">
                      Details
                    </span>
                  </div>
                  <div
                    className={`h-0.5 w-6 sm:w-12 ${exceptionStep === 'confirm' ? 'bg-success-500' : 'bg-gray-600'}`}
                  ></div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                        exceptionStep === 'confirm'
                          ? 'bg-warning-500 text-white'
                          : 'bg-gray-600 text-gray-400'
                      }`}
                    >
                      3
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white hidden sm:inline">
                      Confirm
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6">
                {exceptionStep === 'type' && (
                  <div>
                    <p className="text-white mb-4 text-sm sm:text-base">
                      Select type of exception:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setExceptionType(ExceptionType.OUT_OF_STOCK)}
                        className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all touch-target ${
                          exceptionType === ExceptionType.OUT_OF_STOCK
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-primary-500/50'
                        }`}
                      >
                        <div className="font-semibold text-white text-sm">Out of Stock</div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          Item not available in bin
                        </div>
                      </button>

                      <button
                        onClick={() => setExceptionType(ExceptionType.DAMAGE)}
                        className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all touch-target ${
                          exceptionType === ExceptionType.DAMAGE
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-primary-500/50'
                        }`}
                      >
                        <div className="font-semibold text-white text-sm">Damaged</div>
                        <div className="text-xs sm:text-sm text-gray-400">Item is damaged</div>
                      </button>

                      <button
                        onClick={() => setExceptionType(ExceptionType.DEFECTIVE)}
                        className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all touch-target ${
                          exceptionType === ExceptionType.DEFECTIVE
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-primary-500/50'
                        }`}
                      >
                        <div className="font-semibold text-white text-sm">Defective</div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          Item has quality issues
                        </div>
                      </button>

                      <button
                        onClick={() => setExceptionType(ExceptionType.WRONG_ITEM)}
                        className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all touch-target ${
                          exceptionType === ExceptionType.WRONG_ITEM
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-primary-500/50'
                        }`}
                      >
                        <div className="font-semibold text-white text-sm">Wrong Item</div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          Incorrect item in bin
                        </div>
                      </button>

                      <button
                        onClick={() => setExceptionType(ExceptionType.SHORT_PICK)}
                        className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all touch-target ${
                          exceptionType === ExceptionType.SHORT_PICK
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-primary-500/50'
                        }`}
                      >
                        <div className="font-semibold text-white text-sm">Short Pick</div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          Insufficient quantity
                        </div>
                      </button>

                      <button
                        onClick={() => setExceptionType(ExceptionType.BIN_MISMATCH)}
                        className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all touch-target ${
                          exceptionType === ExceptionType.BIN_MISMATCH
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-primary-500/50'
                        }`}
                      >
                        <div className="font-semibold text-white text-sm">Bin Mismatch</div>
                        <div className="text-xs sm:text-sm text-gray-400">Item in wrong bin</div>
                      </button>

                      <button
                        onClick={() => setExceptionType(ExceptionType.SUBSTITUTION)}
                        className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all touch-target ${
                          exceptionType === ExceptionType.SUBSTITUTION
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-primary-500/50'
                        }`}
                      >
                        <div className="font-semibold text-white text-sm">Substitution</div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          Customer accepts substitute
                        </div>
                      </button>

                      <button
                        onClick={() => setExceptionType(ExceptionType.BARCODE_MISMATCH)}
                        className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all touch-target ${
                          exceptionType === ExceptionType.BARCODE_MISMATCH
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-primary-500/50'
                        }`}
                      >
                        <div className="font-semibold text-white text-sm">Barcode Issue</div>
                        <div className="text-xs sm:text-sm text-gray-400">
                          Barcode doesn't match
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {exceptionStep === 'details' && (
                  <div>
                    <div className="mb-4">
                      <div className="inline-block px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-sm font-medium">
                        {exceptionType.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-1">
                          Reason <span className="text-danger-400">*</span>
                        </label>
                        <textarea
                          value={exceptionReason}
                          onChange={e => setExceptionReason(e.target.value)}
                          rows={3}
                          className="mobile-input w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-500"
                          placeholder="Provide details about the exception..."
                          required
                        />
                      </div>

                      {exceptionType === ExceptionType.SUBSTITUTION && (
                        <div>
                          <label className="block text-sm font-medium text-white mb-1">
                            Substitute SKU
                          </label>
                          <input
                            type="text"
                            value={substituteSku}
                            onChange={e => setSubstituteSku(e.target.value.toUpperCase())}
                            className="mobile-input w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-500"
                            placeholder="Enter substitute SKU..."
                          />
                        </div>
                      )}

                      {exceptionType === ExceptionType.SHORT_PICK && (
                        <div>
                          <label className="block text-sm font-medium text-white mb-1">
                            Actual Quantity Available
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={exceptionQuantity}
                            onChange={e => setExceptionQuantity(parseInt(e.target.value) || 0)}
                            className="mobile-input w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-500"
                            placeholder="Enter actual quantity..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {exceptionStep === 'confirm' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Confirm Exception</h3>

                    <div className="bg-white/[0.05] rounded-lg p-4 space-y-3 border border-white/[0.08]">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-400">Type:</span>
                        <span className="text-sm font-semibold text-white">
                          {exceptionType.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {currentTask && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-400">SKU:</span>
                            <span className="text-sm font-semibold text-white">
                              {currentTask.sku}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-400">Expected Qty:</span>
                            <span className="text-sm font-semibold text-white">
                              {currentTask.quantity}
                            </span>
                          </div>
                        </>
                      )}

                      {exceptionReason && (
                        <div>
                          <span className="text-sm font-medium text-gray-400">Reason:</span>
                          <p className="text-sm text-white mt-1">{exceptionReason}</p>
                        </div>
                      )}

                      {exceptionType === ExceptionType.SUBSTITUTION && substituteSku && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-400">Substitute SKU:</span>
                          <span className="text-sm font-semibold text-primary-400">
                            {substituteSku}
                          </span>
                        </div>
                      )}

                      {exceptionType === ExceptionType.SHORT_PICK && exceptionQuantity > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-400">Actual Qty:</span>
                          <span className="text-sm font-semibold text-white">
                            {exceptionQuantity}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 p-3 bg-primary-500/20 border border-primary-500/30 rounded-lg">
                      <p className="text-sm text-primary-300">
                        <strong>Note:</strong> This exception will be logged and the item will be
                        skipped. A supervisor will review and resolve this exception.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white/[0.02] border-t border-white/[0.08] rounded-b-xl flex flex-col sm:flex-row justify-between gap-3">
                {exceptionStep === 'type' && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setShowExceptionModal(false)}
                      className="touch-target"
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => setExceptionStep('details')} className="touch-target">
                      Next
                    </Button>
                  </>
                )}

                {exceptionStep === 'details' && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setExceptionStep('type')}
                      className="touch-target"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setExceptionStep('confirm')}
                      disabled={!exceptionReason}
                      className="touch-target"
                    >
                      Review
                    </Button>
                  </>
                )}

                {exceptionStep === 'confirm' && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setExceptionStep('details')}
                      className="touch-target"
                    >
                      Back
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleLogException}
                      isLoading={logExceptionMutation.isPending}
                      className="touch-target"
                    >
                      Log Exception & Skip
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Unclaim Modal */}
        <UnclaimModal
          isOpen={showUnclaimModal}
          onClose={() => setShowUnclaimModal(false)}
          onConfirm={handleConfirmUnclaim}
          orderId={orderId!}
          isPicking={true}
          isLoading={isUnclaiming}
        />

        {/* Undo Pick Modal */}
        {undoPickItemIndex !== null && (
          <UndoPickModal
            isOpen={showUndoPickModal}
            onClose={() => {
              setShowUndoPickModal(false);
              setUndoPickItemIndex(null);
            }}
            onConfirm={handleConfirmUndoPick}
            itemName={order.items[undoPickItemIndex]?.name || ''}
            sku={order.items[undoPickItemIndex]?.sku || ''}
            currentQuantity={order.items[undoPickItemIndex]?.pickedQuantity || 0}
            totalQuantity={order.items[undoPickItemIndex]?.quantity || 0}
            wasCompleted={
              (order.items[undoPickItemIndex]?.pickedQuantity || 0) >=
              (order.items[undoPickItemIndex]?.quantity || 0)
            }
            isLoading={isUndoingPick}
          />
        )}

        {/* Complete Order Confirmation Dialog */}
        <ConfirmDialog
          isOpen={completeOrderConfirm.isOpen}
          onClose={() => setCompleteOrderConfirm({ isOpen: false, skippedItems: [] })}
          onConfirm={confirmCompleteOrder}
          title="Complete Order with Skipped Items"
          message={
            <div className="text-left">
              <p className="mb-3">The following items were skipped and could not be found:</p>
              <ul className="list-disc pl-5 mb-3 space-y-1">
                {completeOrderConfirm.skippedItems.map((item: any, i: number) => (
                  <li key={i}>
                    {item.name} ({item.sku}) - {item.skipReason || 'No reason provided'}
                  </li>
                ))}
              </ul>
              <p>Are you sure you want to complete this order? These items will remain unpicked.</p>
            </div>
          }
          confirmText="Complete Order"
          cancelText="Cancel"
          variant="warning"
          isLoading={completeMutation.isPending}
        />

        {/* Unskip Item Confirmation Dialog */}
        <ConfirmDialog
          isOpen={unskipConfirm.isOpen}
          onClose={() => setUnskipConfirm({ isOpen: false, index: -1, item: null })}
          onConfirm={confirmUnskipItem}
          title="Revert Skip"
          message={`Do you want to revert the skip for ${unskipConfirm.item?.name} (${unskipConfirm.item?.sku})?`}
          confirmText="Revert"
          cancelText="Cancel"
          variant="success"
        />
      </main>
    </div>
  );
}
