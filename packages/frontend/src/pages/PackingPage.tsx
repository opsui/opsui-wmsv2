/**
 * Packing page
 *
 * Main packing interface for verifying and packing orders
 */

import {
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Header,
  ScanInput,
  UnclaimModal,
  useToast,
} from '@/components/shared';
import { usePageTracking } from '@/hooks/usePageTracking';
import { apiClient } from '@/lib/api-client';
import { formatBinLocation } from '@/lib/utils';
import { nzcApi, useCompletePacking, useOrder } from '@/services/api';
import { useAuthStore } from '@/stores';
import {
  ArrowPathIcon,
  CheckIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { Address, Carrier, NZCQuote } from '@opsui/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// ============================================================================
// COMPONENT
// ============================================================================

export function PackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.user);
  const userRole = useAuthStore(state => state.user?.role);
  const { showToast } = useToast();

  // Track current page for admin dashboard
  usePageTracking({ view: orderId ? `Packing ${orderId}` : 'Packing' });

  const [scanValue, setScanValue] = useState('');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Unclaim modal state
  const [showUnclaimModal, setShowUnclaimModal] = useState(false);
  const [isUnclaiming, setIsUnclaiming] = useState(false);
  const [undoLoading, setUndoLoading] = useState<Record<number, boolean>>({});

  // Confirm dialog states
  const [unskipConfirm, setUnskipConfirm] = useState<{ isOpen: boolean; index: number; item: any }>(
    { isOpen: false, index: -1, item: null }
  );
  const [completeShipmentConfirm, setCompleteShipmentConfirm] = useState<{
    isOpen: boolean;
    skippedItems: any[];
  }>({ isOpen: false, skippedItems: [] });

  // Shipping details state
  const [showShippingForm, setShowShippingForm] = useState(false);
  const shippingFormRef = useRef<HTMLDivElement>(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState('');
  const [serviceType, setServiceType] = useState('Ground');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [totalWeight, setTotalWeight] = useState('1.0');
  const [totalPackages, setTotalPackages] = useState('1');
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);

  // NZC-specific state
  const [nzcRates, setNzcRates] = useState<NZCQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<NZCQuote | null>(null);
  const [nzcLabel, setNzcLabel] = useState<{ data: string; contentType: string } | null>(null);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [shipmentCreated, setShipmentCreated] = useState(false);
  const [nzcConnote, setNzcConnote] = useState<string>('');

  // Helper to convert lbs to kg for NZC API
  const lbsToKg = (lbs: number): number => Math.round(lbs * 0.453592 * 100) / 100;

  // Fetch carriers for shipping form
  const { data: carriers = [] } = useQuery({
    queryKey: ['carriers'],
    queryFn: async () => {
      const response = await apiClient.get('/shipping/carriers');
      return response.data;
    },
  });

  const { data: order, isLoading, refetch } = useOrder(orderId!);
  const completePackingMutation = useCompletePacking();

  // Ref to track if we've already attempted to claim this order
  const hasClaimedRef = useRef(false);
  const isClaimingRef = useRef(false);

  // Claim order for packing mutation
  const claimMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post(`/orders/${orderId}/claim-for-packing`, {
        packer_id: useAuthStore.getState().user?.userId,
      });
      return response.data;
    },
    onSuccess: data => {
      console.log('[PackingPage] Order claimed for packing:', data);
      hasClaimedRef.current = true;
      isClaimingRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: (error: any) => {
      console.error('[PackingPage] Claim error:', error);
      isClaimingRef.current = false;
      const errorMsg = error.response?.data?.error || error.message || 'Failed to claim order';
      setClaimError(errorMsg);
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
  useLayoutEffect(() => {
    if (orderId && order) {
      console.log(`[PackingPage] Checking if order needs to be claimed: ${orderId}`);
      console.log(`[PackingPage] Order status: ${order.status}, packerId: ${order.packerId}`);

      // Check if this is a view-only scenario
      const currentUserId = useAuthStore.getState().user?.userId;
      const isViewOnlyOrder =
        order.status === 'PACKED' ||
        order.status === 'SHIPPED' ||
        (order.packerId &&
          order.packerId !== currentUserId &&
          (userRole === 'ADMIN' || userRole === 'SUPERVISOR'));

      if (isViewOnlyOrder) {
        console.log(
          `[PackingPage] Order is in view-only mode (status: ${order.status}), skipping claim logic`
        );
        return;
      }

      // Check if order is already claimed by current user
      const isAlreadyClaimed = order?.packerId === currentUserId;
      const isReadyForPacking = order?.status === 'PICKED' || order?.status === 'PACKING';

      // Prevent multiple claim attempts
      if (
        isClaimingRef.current ||
        claimMutation.isPending ||
        hasClaimedRef.current ||
        claimMutation.isError
      ) {
        console.log(`[PackingPage] Already claiming, claimed, or had error, skipping`);
        return;
      }

      if (isAlreadyClaimed || isReadyForPacking) {
        console.log(`[PackingPage] Order already claimed or ready for packing: ${orderId}`);
        hasClaimedRef.current = true;
      } else if (order.status === 'PICKED') {
        // Claim the order for packing
        if (order.packerId && order.packerId !== currentUserId) {
          console.log(
            `[PackingPage] Order claimed by another packer (${order.packerId}), skipping`
          );
          hasClaimedRef.current = true;
          return;
        }

        console.log(`[PackingPage] Attempting to claim order for packing: ${orderId}`);
        isClaimingRef.current = true;
        hasClaimedRef.current = true;
        claimMutation.mutate(orderId);
      } else {
        console.log(`[PackingPage] Order is in ${order.status} status, cannot claim`);
        setClaimError(`Order is in ${order.status} status and cannot be packed`);
      }
    }
  }, [orderId, order, claimMutation.isPending, claimMutation.isError]);

  // Real-time updates for view mode
  useEffect(() => {
    const isViewMode =
      order &&
      order.packerId &&
      order.packerId !== currentUser?.userId &&
      (userRole === 'ADMIN' || userRole === 'SUPERVISOR');

    if (!isViewMode) {
      return;
    }

    console.log(`[PackingPage] Starting real-time updates for view mode`);

    const intervalId = setInterval(() => {
      console.log(`[PackingPage] Refetching order data for view mode`);
      refetch();
    }, 2000);

    return () => {
      clearInterval(intervalId);
      console.log(`[PackingPage] Stopped real-time updates for view mode`);
    };
  }, [order, currentUser, userRole, refetch]);

  // Get current item to verify
  const currentItem = order?.items?.[currentItemIndex];

  // Calculate progress
  const totalItems = order?.items?.length || 0;
  const completedItems =
    order?.items?.filter(item => (item.verifiedQuantity || 0) >= item.quantity) || [];
  const allVerified = completedItems.length === totalItems && totalItems > 0;
  const verifiedCount = completedItems.length;

  // Reset current index when order changes
  useEffect(() => {
    if (order) {
      setCurrentItemIndex(0);
      setScanValue('');
      setScanError(null);
    }
  }, [order?.orderId]);

  // Auto-select first incomplete item when order loads
  useEffect(() => {
    if (order && order.items && order.items.length > 0) {
      const firstIncompleteIndex = order.items.findIndex(
        item => (item.verifiedQuantity || 0) < item.quantity && item.status !== 'SKIPPED'
      );
      if (firstIncompleteIndex !== -1 && firstIncompleteIndex !== currentItemIndex) {
        setCurrentItemIndex(firstIncompleteIndex);
      }
    }
  }, [order]);

  // Auto-show shipping form when all items are verified
  useEffect(() => {
    if (allVerified && !showShippingForm) {
      console.log('[PackingPage] All items verified, auto-showing shipping form');
      setShowShippingForm(true);
    } else if (!allVerified && showShippingForm) {
      // Hide shipping form if not all verified (user might have undone verification)
      setShowShippingForm(false);
    }
  }, [allVerified]);

  // Scroll shipping form into view when it appears
  useEffect(() => {
    if (showShippingForm && shippingFormRef.current) {
      shippingFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showShippingForm]);

  // Reset scan error when current task changes
  useEffect(() => {
    setScanError(null);
  }, [currentItemIndex]);

  // Fetch NZC rates when NZC carrier is selected
  useEffect(() => {
    const fetchNZCRates = async () => {
      const isNZCCarrier =
        carriers.find((c: Carrier) => c.carrierId === selectedCarrierId)?.carrierCode === 'NZC';

      if (!isNZCCarrier || !totalWeight || !totalPackages) {
        setNzcRates([]);
        setSelectedQuote(null);
        return;
      }

      setIsFetchingRates(true);
      try {
        const response = await nzcApi.getRates({
          destination: {
            name: order?.customerName || 'Customer',
            company: 'Customer Company',
            addressLine1: '456 Customer Ave',
            city: 'Auckland',
            state: '',
            postalCode: '1010',
            country: 'NZ',
          },
          packages: [
            {
              length: 10,
              width: 10,
              height: 10,
              weight: lbsToKg(parseFloat(totalWeight)),
              units: parseInt(totalPackages),
            },
          ],
        });

        if (response.Quotes && response.Quotes.length > 0) {
          setNzcRates(response.Quotes);
          // Auto-select the first quote
          setSelectedQuote(response.Quotes[0]);
        } else {
          setNzcRates([]);
          setSelectedQuote(null);
          if (response.Rejected && response.Rejected.length > 0) {
            showToast(`NZC rejected: ${response.Rejected.map(r => r.Reason).join(', ')}`, 'error');
          }
        }
      } catch (error) {
        console.error('Error fetching NZC rates:', error);
        setNzcRates([]);
        setSelectedQuote(null);
      } finally {
        setIsFetchingRates(false);
      }
    };

    // Debounce rate fetching
    const timeoutId = setTimeout(fetchNZCRates, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedCarrierId, totalWeight, totalPackages, carriers, order]);

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
            <p className="text-gray-600">Claiming order for packing...</p>
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
        <Card className="border-error-500 border-2">
          <CardContent className="p-6 text-center space-y-4">
            <ExclamationTriangleIcon className="h-12 w-12 text-error-600 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">Cannot Start Packing</h2>
            <p className="text-gray-600">{claimError}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={() => navigate('/packing')}>
                Back to Packing Queue
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
            <Button onClick={() => navigate('/packing')} className="mt-4">
              Back to Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleScan = async (value: string) => {
    if (!currentItem) {
      showToast('No current item to verify', 'error');
      return;
    }

    // Prevent duplicate scans while verification is in progress
    if (isVerifying) {
      console.log('[PackingPage] Scan ignored - verification in progress');
      return;
    }

    setScanError(null);
    const scannedValue = value.trim();

    // Validate scan matches either barcode OR SKU
    const isValidScan =
      (currentItem.barcode && scannedValue === currentItem.barcode) ||
      scannedValue === currentItem.sku;

    if (!isValidScan) {
      const expectedBarcodes = currentItem.barcode ? currentItem.barcode : currentItem.sku;
      setScanError(`Wrong scan! Expected: ${expectedBarcodes}, scanned: ${scannedValue}`);
      showToast(`Wrong barcode scanned`, 'error');
      return;
    }

    // Check if already fully verified
    const currentVerified = currentItem.verifiedQuantity || 0;
    if (currentVerified >= currentItem.quantity) {
      showToast('This item is already fully verified', 'success');
      setScanValue('');
      return;
    }

    // Verify packing item via API
    setIsVerifying(true);
    try {
      await apiClient.post(`/orders/${orderId}/verify-packing`, {
        order_item_id: currentItem.orderItemId,
        quantity: 1,
      });

      showToast('Item verified!', 'success');
      setScanValue('');

      // Calculate the new verified quantity (current + 1)
      const newVerified = currentVerified + 1;

      // Optimistically update the cache to show immediate UI feedback
      queryClient.setQueryData(['orders', orderId], (oldData: any) => {
        if (!oldData?.items) return oldData;

        const updatedItems = oldData.items.map((item: any, idx: number) =>
          idx === currentItemIndex && item.orderItemId === currentItem.orderItemId
            ? { ...item, verifiedQuantity: newVerified }
            : item
        );

        console.log('[PackingPage] Optimistic update:', {
          itemIndex: currentItemIndex,
          oldVerified: currentVerified,
          newVerified,
          sku: currentItem.sku,
        });

        return { ...oldData, items: updatedItems };
      });

      // Check if item is now complete and move to next
      if (newVerified >= currentItem.quantity) {
        // Find next incomplete item using the optimistically updated data
        const orderData = queryClient.getQueryData(['orders', orderId]) as any;
        if (!orderData?.items) return;

        const nextIncompleteIndex = orderData.items.findIndex(
          (item: any, idx: number) =>
            idx > currentItemIndex &&
            (item.verifiedQuantity || 0) < item.quantity &&
            item.status !== 'SKIPPED'
        );

        console.log('[PackingPage] Item complete, finding next:', {
          currentItemIndex,
          nextIncompleteIndex,
          totalItems: orderData.items.length,
        });

        if (nextIncompleteIndex !== -1) {
          console.log('[PackingPage] Moving to next item:', nextIncompleteIndex);
          setCurrentItemIndex(nextIncompleteIndex);
        } else {
          console.log('[PackingPage] No more incomplete items');
        }
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Verification failed');
      showToast(error instanceof Error ? error.message : 'Failed to verify item', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkipItem = async () => {
    if (!currentItem) {
      showToast('No current item to report', 'error');
      return;
    }

    // Confirm before reporting problem
    const reason = prompt('Report a Problem\n\nPlease provide a reason for reporting this item:');
    if (!reason || !reason.trim()) {
      showToast('Reason is required', 'error');
      return;
    }

    try {
      await apiClient.post(`/orders/${orderId}/skip-packing-item`, {
        order_item_id: currentItem.orderItemId,
        reason: reason.trim(),
      });

      showToast('Problem reported successfully!', 'success');

      // Refetch order data to get updated state
      await refetch();

      // Move to next item
      if (!order.items) return;
      const nextIncompleteIndex = order.items.findIndex(
        (item, idx) =>
          idx > currentItemIndex &&
          (item.verifiedQuantity || 0) < item.quantity &&
          item.status !== 'SKIPPED'
      );

      if (nextIncompleteIndex !== -1) {
        setCurrentItemIndex(nextIncompleteIndex);
        setScanValue('');
        setScanError(null);
      } else {
        // All tasks done or skipped, check if order is complete
        refetch();
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to report problem', 'error');
    }
  };

  const handleUnskipItem = async (index: number) => {
    const item = order?.items?.[index];
    if (!item) return;

    setUnskipConfirm({ isOpen: true, index, item });
  };

  const confirmUnskipItem = async () => {
    const { index, item } = unskipConfirm;
    if (!item) return;

    try {
      // Update item status back to PENDING
      await apiClient.put(`/orders/${orderId}/pick-task/${item.orderItemId}`, {
        status: 'PENDING',
      });

      showToast('Skip reverted successfully!', 'success');
      setUnskipConfirm({ isOpen: false, index: -1, item: null });

      // Refetch order data to get updated state
      await refetch();

      // Set this as current item if it's not completed
      if ((item.verifiedQuantity || 0) < item.quantity) {
        setCurrentItemIndex(index);
        setScanValue('');
        setScanError(null);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to revert skip', 'error');
    }
  };

  const handleUndoVerification = async (index: number) => {
    // Prevent multiple simultaneous undo operations on the same item
    if (undoLoading[index]) {
      console.log('[handleUndoVerification] Undo already in progress for item', index);
      return;
    }

    try {
      setUndoLoading(prev => ({ ...prev, [index]: true }));

      // Fetch latest order data directly from API to ensure fresh state
      const response = await apiClient.get(`/orders/${orderId}`);
      const latestOrder = response.data;

      const item = latestOrder?.items?.[index];
      if (!item) {
        showToast('Item not found', 'error');
        return;
      }

      // Can only undo if there's something verified
      const currentVerified = item.verifiedQuantity || 0;
      console.log('[handleUndoVerification] Current verified state:', {
        index,
        sku: item.sku,
        currentVerified,
        itemQuantity: item.quantity,
      });

      if (currentVerified <= 0) {
        showToast(
          'No verified items to undo. The item may have already been undone or never verified.',
          'error'
        );
        await refetch(); // Refresh to show current state
        return;
      }

      // Ask for reason
      const reason =
        prompt(
          `Remove 1 verified item from ${item.name} (${item.sku})?\n\n` +
            `Current: ${currentVerified}/${item.quantity}\n\n` +
            `After undo: ${Math.max(0, currentVerified - 1)}/${item.quantity}\n\n` +
            `Please provide a reason:`
        ) || '';

      if (!reason.trim()) {
        showToast('Reason is required to undo a verification', 'error');
        return;
      }

      try {
        await apiClient.post(`/orders/${orderId}/undo-packing-verification`, {
          order_item_id: item.orderItemId,
          quantity: 1,
          reason: reason.trim(),
        });

        showToast('Verification undone!', 'success');

        // Force invalidate query cache and refetch
        queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
        await refetch();

        // If we undid current item, it stays current
        // If we undid an item above current one, navigate to that item
        if (index < currentItemIndex) {
          setCurrentItemIndex(index);
          setScanValue('');
          setScanError(null);
        }
      } catch (error: any) {
        console.error('Undo verification error:', error);

        // Handle state mismatch gracefully
        const errorMsg =
          error.response?.data?.error || error.message || 'Failed to undo verification';

        if (errorMsg.includes('Cannot undo more items than verified')) {
          // State changed between our fetch and the request - refresh and inform user
          await refetch();
          showToast('State has changed. Please try again.', 'warning');
        } else {
          showToast(errorMsg, 'error');
          await refetch(); // Always refresh on error to sync state
        }
      }
    } catch (error) {
      console.error('Undo verification failed:', error);
      showToast('Failed to undo verification. Please try again.', 'error');
      await refetch();
    } finally {
      setUndoLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleCompletePacking = async () => {
    // Show shipping form instead of completing directly
    setShowShippingForm(true);
  };

  const confirmCreateShipment = async () => {
    // This is called after user confirms the skipped items dialog
    // Continue with the actual shipment creation logic (skip the skipped items check)
    await handleCreateShipment(true);
  };

  const handleCreateShipment = async (skipConfirmCheck = false) => {
    // Validate shipping details
    if (!selectedCarrierId) {
      showToast('Please select a carrier', 'error');
      return;
    }

    // For NZC carrier, we need a selected quote
    const isNZCCarrier =
      carriers.find((c: Carrier) => c.carrierId === selectedCarrierId)?.carrierCode === 'NZC';
    if (isNZCCarrier && !selectedQuote) {
      showToast('Please select a shipping rate/quote', 'error');
      return;
    }

    // For non-NZC carriers, require manual tracking number
    if (!isNZCCarrier && !trackingNumber.trim()) {
      showToast('Please enter a tracking number', 'error');
      return;
    }

    if (!totalWeight || parseFloat(totalWeight) <= 0) {
      showToast('Please enter a valid weight', 'error');
      return;
    }

    if (!totalPackages || parseInt(totalPackages) <= 0) {
      showToast('Please enter a valid number of packages', 'error');
      return;
    }

    // Check for skipped items (unless skipConfirmCheck is true)
    if (!skipConfirmCheck) {
      const skippedItems = order?.items?.filter(item => item.status === 'SKIPPED');

      if (skippedItems && skippedItems.length > 0) {
        // Show confirmation dialog for skipped items
        setCompleteShipmentConfirm({ isOpen: true, skippedItems });
        return;
      }
    }

    setIsCreatingShipment(true);

    try {
      // Default addresses (in real app, these would come from order/customer data)
      const shipFromAddress: Address = {
        name: 'Main Warehouse',
        company: 'Your Company',
        addressLine1: '123 Warehouse St',
        city: 'Wellington',
        state: '',
        postalCode: '6011',
        country: 'NZ',
      };

      const shipToAddress: Address = {
        name: order?.customerName || 'Customer',
        addressLine1: '456 Customer Ave',
        city: 'Auckland',
        state: '',
        postalCode: '1010',
        country: 'NZ',
      };

      if (isNZCCarrier) {
        // NZC Flow: Create shipment via NZC API, get label, complete packing
        if (!selectedQuote) {
          showToast('Please select a shipping rate/quote', 'error');
          setIsCreatingShipment(false);
          return;
        }

        const weightKg = lbsToKg(parseFloat(totalWeight));

        // Create shipment with NZC
        const nzcShipment = await nzcApi.createShipment({
          destination: {
            name: shipToAddress.name,
            company: shipToAddress.company,
            addressLine1: shipToAddress.addressLine1,
            city: shipToAddress.city,
            state: shipToAddress.state,
            postalCode: shipToAddress.postalCode,
            country: shipToAddress.country,
          },
          packages: [
            {
              length: 10, // Default package size - in production, get from order items
              width: 10,
              height: 10,
              weight: weightKg,
              units: parseInt(totalPackages),
            },
          ],
          quoteId: selectedQuote.QuoteId,
        });

        const connote = nzcShipment.ConsignmentNo;
        setNzcConnote(connote);
        setShipmentCreated(true);

        // Get label
        const label = await nzcApi.getLabel(connote, 'LABEL_PNG_100X175');
        setNzcLabel(label);

        showToast(`NZC Shipment created! Connote: ${connote}`, 'success');

        // Create shipment record in database
        await apiClient.post('/shipping/shipments', {
          orderId,
          carrierId: selectedCarrierId,
          serviceType: selectedQuote.Service,
          shippingMethod: 'STANDARD',
          shipFromAddress,
          shipToAddress,
          totalWeight: parseFloat(totalWeight),
          totalPackages: parseInt(totalPackages),
          createdBy: currentUser?.userId,
        });

        // Complete packing
        await completePackingMutation.mutateAsync({
          orderId,
          dto: {
            orderId,
            packerId: order.packerId || '',
          },
        });

        showToast('Order packed and shipped successfully!', 'success');
      } else {
        // Standard Flow: Create shipment record with manual tracking number
        const shipmentResponse = await apiClient.post('/shipping/shipments', {
          orderId,
          carrierId: selectedCarrierId,
          serviceType,
          shippingMethod: 'STANDARD',
          shipFromAddress,
          shipToAddress,
          totalWeight: parseFloat(totalWeight),
          totalPackages: parseInt(totalPackages),
          createdBy: currentUser?.userId,
        });

        const shipment = shipmentResponse.data;

        // Add tracking number if provided
        if (trackingNumber.trim()) {
          await apiClient.post(`/shipping/shipments/${shipment.shipmentId}/tracking`, {
            trackingNumber: trackingNumber.trim(),
          });
        }

        showToast(`Shipment created! Tracking: ${trackingNumber || 'Pending'}`, 'success');

        // Complete packing
        await completePackingMutation.mutateAsync({
          orderId,
          dto: {
            orderId,
            packerId: order.packerId || '',
          },
        });

        showToast('Order packed and shipped successfully!', 'success');
        navigate('/packing');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create shipment', 'error');
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleUnclaimOrder = async () => {
    setShowUnclaimModal(true);
  };

  const handleConfirmUnclaim = async (reason: string, notes: string) => {
    setIsUnclaiming(true);
    try {
      const fullReason = notes.trim() ? `${reason}\n\nAdditional notes: ${notes.trim()}` : reason;

      await apiClient.post(`/orders/${orderId}/unclaim-packing`, {
        packer_id: order.packerId || currentUser?.userId,
        reason: fullReason,
      });

      showToast('Order unclaimed and returned to PICKED status!', 'success');
      setShowUnclaimModal(false);
      hasClaimedRef.current = false;
      isClaimingRef.current = false;
      setClaimError(null);
      // Invalidate all relevant queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
      navigate('/packing');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to unclaim order';
      showToast(errorMsg, 'error');
    } finally {
      setIsUnclaiming(false);
    }
  };

  // Determine if user is viewing in "view-only mode"
  const isViewMode =
    order &&
    (userRole === 'ADMIN' || userRole === 'SUPERVISOR') &&
    ((order.packerId && order.packerId !== currentUser?.userId) ||
      order.status === 'PACKED' ||
      order.status === 'SHIPPED');

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        {/* View Mode Banner */}
        {isViewMode && (
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-5 flex items-center gap-4 card-hover">
            <ExclamationTriangleIcon className="h-6 w-6 text-primary-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">
                {order.status === 'PACKED' || order.status === 'SHIPPED'
                  ? 'Viewing completed order'
                  : "Viewing this packer's work in real-time"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                You are in view-only mode. Interactions are disabled.
              </p>
            </div>
          </div>
        )}

        {/* Order Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{order.orderId}</h1>
              <p className="mt-2 text-gray-400">{order.customerName}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {!isViewMode && (
              <>
                <Button
                  variant="danger"
                  onClick={handleUnclaimOrder}
                  disabled={order.status !== 'PACKING' && order.status !== 'PICKED'}
                >
                  Unclaim Order
                </Button>
                <Button variant="secondary" onClick={() => navigate('/packing')}>
                  Exit
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress */}
        <Card variant="glass" className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Verified: {verifiedCount} / {totalItems} items
              </span>
              <span className="text-2xl font-bold text-white">
                {Math.round((verifiedCount / totalItems) * 100) || 0}%
              </span>
            </div>
            <div className="w-full bg-white/[0.05] rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-success-500 to-success-400 h-full rounded-full transition-all duration-500 shadow-glow"
                style={{ width: `${(verifiedCount / totalItems) * 100 || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Packing Instructions */}
        {order.status === 'PICKED' && !allVerified && (
          <Card variant="glass" className="border-primary-500/50 border-2 shadow-glow card-hover">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <CubeIcon className="h-8 w-8 text-primary-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Packing Instructions</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-primary-400 mt-1">•</span>
                      <span>
                        Scan each item's barcode to verify it's present and in good condition
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-400 mt-1">•</span>
                      <span>Once all items are verified, complete the packing process</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {allVerified ? (
          /* All Items Verified - Show Shipping Details Form or Completion */
          !showShippingForm ? (
            /* Step 1: Show completion button to proceed to shipping */
            <Card variant="glass" className="border-success-500/50 border-2 card-hover">
              <CardContent className="p-10 text-center space-y-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success-500/20 flex items-center justify-center animate-scale-in">
                  <CheckIcon className="h-10 w-10 text-success-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">All Items Verified!</h2>
                <p className="text-gray-400 mb-8">
                  Order is ready to be packed and shipped. Please enter shipping details.
                </p>
                <Button
                  size="lg"
                  variant="success"
                  onClick={handleCompletePacking}
                  disabled={isViewMode ? true : undefined}
                  className="shadow-glow"
                >
                  Enter Shipping Details
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Step 2: Shipping Details Form */
            <div ref={shippingFormRef}>
              <Card
                variant="glass"
                className="border-primary-500/50 border-2 shadow-glow card-hover"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-white">Shipping Details</span>
                    <span className="text-sm text-gray-400">Order: {order.orderId}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Carrier Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Carrier *
                      </label>
                      <select
                        value={selectedCarrierId}
                        onChange={e => setSelectedCarrierId(e.target.value)}
                        disabled={isCreatingShipment || isViewMode}
                        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 [&_option]:bg-gray-900 [&_option]:text-white"
                      >
                        <option value="">Select a carrier...</option>
                        {carriers.map((carrier: Carrier) => (
                          <option key={carrier.carrierId} value={carrier.carrierId}>
                            {carrier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Service Type - Only show for non-NZC carriers */}
                    {carriers.find((c: Carrier) => c.carrierId === selectedCarrierId)
                      ?.carrierCode !== 'NZC' && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                          Service Type *
                        </label>
                        <select
                          value={serviceType}
                          onChange={e => setServiceType(e.target.value)}
                          disabled={isCreatingShipment || isViewMode}
                          className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 [&_option]:bg-gray-900 [&_option]:text-white"
                        >
                          <option value="Ground">Ground</option>
                          <option value="Express">Express</option>
                          <option value="Priority">Priority</option>
                          <option value="Overnight">Overnight</option>
                        </select>
                      </div>
                    )}

                    {/* Tracking Number - Only show for non-NZC carriers */}
                    {carriers.find((c: Carrier) => c.carrierId === selectedCarrierId)
                      ?.carrierCode !== 'NZC' && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                          Tracking Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={e => setTrackingNumber(e.target.value)}
                          placeholder="Enter tracking number..."
                          disabled={isCreatingShipment || isViewMode}
                          className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                        />
                      </div>
                    )}

                    {/* Package Details */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Number of Packages *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={totalPackages}
                        onChange={e => setTotalPackages(e.target.value)}
                        disabled={isCreatingShipment || isViewMode}
                        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      />
                    </div>

                    {/* Weight */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        Total Weight (lbs) *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={totalWeight}
                        onChange={e => setTotalWeight(e.target.value)}
                        placeholder="Enter total weight..."
                        disabled={isCreatingShipment || isViewMode}
                        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Shipping Address Info */}
                  <div className="bg-white/[0.02] rounded-xl border border-white/[0.08] p-4 space-y-3">
                    <h3 className="text-lg font-semibold text-white">Shipping To</h3>
                    <div className="text-gray-300">
                      <p className="font-semibold">{order.customerName}</p>
                      <p className="text-sm mt-2">
                        In production, customer address will be loaded from order details
                      </p>
                    </div>
                  </div>

                  {/* NZC Rates Display */}
                  {nzcRates.length > 0 && (
                    <div className="bg-white/[0.02] rounded-xl border border-primary-500/30 p-4 space-y-3">
                      <h3 className="text-lg font-semibold text-white">Available Shipping Rates</h3>
                      {isFetchingRates && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
                          <span className="text-sm">Fetching rates...</span>
                        </div>
                      )}
                      {!isFetchingRates && (
                        <div className="space-y-2">
                          {nzcRates.map(quote => (
                            <div
                              key={quote.QuoteId}
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedQuote?.QuoteId === quote.QuoteId
                                  ? 'bg-primary-500/20 border-primary-500'
                                  : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]'
                              }`}
                              onClick={() => setSelectedQuote(quote)}
                            >
                              <div className="flex-1">
                                <p className="font-semibold text-white">{quote.Service}</p>
                                {quote.TransitDays && (
                                  <p className="text-sm text-gray-400">
                                    {quote.TransitDays} days transit
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-primary-400">
                                  ${quote.TotalPrice.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* NZC Label Display */}
                  {nzcLabel && (
                    <div className="bg-white/[0.02] rounded-xl border border-success-500/30 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Shipping Label</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">Connote:</span>
                          <span className="font-mono text-primary-400">{nzcConnote}</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <img
                          src={`data:${nzcLabel.contentType};base64,${nzcLabel.data}`}
                          alt="Shipping Label"
                          className="w-full h-auto max-h-[400px] object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            // Open label in new tab for printing
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(
                                `<html><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
                                <img src="data:${nzcLabel.contentType};base64,${nzcLabel.data}" style="max-width:100%;" />
                              </body></html>`
                              );
                              newWindow.document.close();
                            }
                          }}
                        >
                          <PrinterIcon className="h-4 w-4 mr-2" />
                          Print Label
                        </Button>
                        {shipmentCreated && (
                          <Button variant="success" size="sm" onClick={() => navigate('/packing')}>
                            Done
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!shipmentCreated && (
                    <Button
                      variant="success"
                      size="lg"
                      fullWidth
                      onClick={() => handleCreateShipment()}
                      isLoading={isCreatingShipment}
                      disabled={isCreatingShipment || isViewMode}
                      className="shadow-glow"
                    >
                      <PrinterIcon className="h-5 w-5 mr-2" />
                      Create Shipment & Complete
                    </Button>
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
            </div>
          )
        ) : currentItem ? (
          /* Current Item to Scan */
          <Card variant="glass" className="border-primary-500/50 border-2 shadow-glow card-hover">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-white">Current Item to Verify</span>
                <span className="text-sm text-gray-400">
                  {verifiedCount + 1} of {totalItems}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Item Info */}
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {currentItem.name}
                  </h3>
                  {currentItem.barcode && (
                    <p className="text-2xl font-mono text-gray-300 mt-3 tracking-wider bg-white/[0.02] inline-block px-4 py-2 rounded-lg border border-white/[0.08]">
                      {currentItem.barcode}
                    </p>
                  )}
                  {!currentItem.barcode && (
                    <p className="text-lg text-warning-400 mt-3 font-mono bg-warning-500/10 inline-block px-4 py-2 rounded-lg border border-warning-500/30">
                      No barcode assigned
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-sm text-gray-400">Qty: {currentItem.quantity}</span>
                    <span className="text-sm text-gray-400 font-mono">
                      {formatBinLocation(currentItem.binLocation)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-center gap-6 py-6 bg-white/[0.02] rounded-xl border border-white/[0.08]">
                <div className="text-center">
                  <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Verified</p>
                  <p className="text-4xl font-bold text-primary-400">
                    {currentItem.verifiedQuantity || 0}
                  </p>
                </div>
                <div className="text-5xl text-gray-600">/</div>
                <div className="text-center">
                  <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Needed</p>
                  <p className="text-4xl font-bold text-white">{currentItem.quantity}</p>
                </div>
              </div>

              {/* Scan Input */}
              <div>
                <ScanInput
                  value={scanValue}
                  onChange={setScanValue}
                  onScan={handleScan}
                  placeholder={
                    currentItem.barcode ? 'Scan barcode...' : 'Scan or enter item code...'
                  }
                  error={scanError || undefined}
                  disabled={isViewMode ? true : undefined}
                />
                {currentItem.barcode && (
                  <p className="mt-3 text-sm text-gray-400 bg-white/[0.02] inline-block px-4 py-2 rounded-lg border border-white/[0.08]">
                    Scan this barcode:{' '}
                    <span className="font-mono font-semibold text-primary-400">
                      {currentItem.barcode}
                    </span>
                  </p>
                )}
                {!currentItem.barcode && (
                  <p className="mt-3 text-sm text-gray-400 bg-white/[0.02] inline-block px-4 py-2 rounded-lg border border-white/[0.08]">
                    No barcode assigned - scan or enter item code manually
                  </p>
                )}
              </div>

              {/* Actions */}
              {!isViewMode && (
                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    size="lg"
                    fullWidth
                    onClick={handleSkipItem}
                    className="shadow-lg"
                  >
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    Report a Problem
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
        ) : null}

        {/* Items List */}
        <Card variant="glass" className="card-hover">
          <CardHeader>
            <CardTitle>Items in Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items?.map((item, index) => {
                const isCompleted = (item.verifiedQuantity || 0) >= item.quantity;
                const isSkipped = item.status === 'SKIPPED';
                const isCurrent = index === currentItemIndex;

                return (
                  <div
                    key={item.orderItemId}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                      isCompleted
                        ? 'border-success-500/50 bg-success-500/10 shadow-glow'
                        : isSkipped
                          ? 'border-warning-500/50 bg-warning-500/10'
                          : isCurrent
                            ? 'border-primary-500/50 bg-primary-500/10 shadow-glow'
                            : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
                    } ${isCurrent ? 'ring-2 ring-primary-500/30' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Status Icon */}
                      <div>
                        {isCompleted && (
                          <CheckIcon className="h-6 w-6 text-success-400 flex-shrink-0" />
                        )}
                        {isSkipped && (
                          <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-6 w-6 text-warning-400 flex-shrink-0" />
                            {!isViewMode && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleUnskipItem(index);
                                }}
                                className="text-warning-400 hover:text-warning-300 transition-colors p-1 hover:bg-warning-500/20 rounded-lg"
                                title="Revert skip"
                              >
                                <ArrowPathIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1">
                        <p
                          className={`font-semibold text-lg ${
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
                          <p className="text-sm text-gray-500 font-mono">{item.barcode}</p>
                        )}
                        {isSkipped && item.skipReason && (
                          <p className="text-sm text-warning-300 mt-2 bg-warning-500/10 inline-block px-2 py-1 rounded">
                            {item.skipReason}
                          </p>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="text-right">
                        <p
                          className={`font-semibold text-lg ${
                            isCompleted
                              ? 'text-success-300'
                              : isSkipped
                                ? 'text-warning-300'
                                : 'text-white'
                          }`}
                        >
                          {isSkipped
                            ? 'Skipped'
                            : `${item.verifiedQuantity || 0} / ${item.quantity}`}
                        </p>
                        <p className="text-sm text-gray-500 font-mono">{item.binLocation}</p>

                        {/* Undo Verification button - only show if actually has verified items */}
                        {(item.verifiedQuantity || 0) > 0 &&
                          !isSkipped &&
                          !isViewMode &&
                          !undoLoading[index] && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleUndoVerification(index);
                              }}
                              disabled={undoLoading[index]}
                              className={`mt-2 text-error-400 hover:text-error-300 transition-colors flex items-center gap-1 justify-end hover:bg-error-500/10 px-2 py-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                              title="Remove last verified item"
                            >
                              <MinusCircleIcon className="h-4 w-4" />
                              <span className="text-xs">Undo Verify</span>
                            </button>
                          )}
                        {undoLoading[index] && (
                          <div className="mt-2 text-error-400 flex items-center gap-1 justify-end animate-pulse">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                            <span className="text-xs">Undoing...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Complete Packing Button - Only show if not in shipping form mode */}
        {!isViewMode && !showShippingForm && (
          <Card
            variant="glass"
            className={`border-2 card-hover ${allVerified ? 'border-success-500/50 shadow-glow' : 'border-white/[0.08]'}`}
          >
            <CardContent className="p-6">
              <Button
                variant={allVerified ? 'success' : 'secondary'}
                size="lg"
                fullWidth
                onClick={handleCompletePacking}
                disabled={!allVerified}
                className={!allVerified ? '' : 'shadow-glow'}
              >
                {allVerified
                  ? 'Enter Shipping Details'
                  : `Verify All Items First (${verifiedCount}/${totalItems})`}
              </Button>
              {!allVerified && (
                <p className="text-center text-sm text-gray-400 mt-3">
                  Please verify all items before entering shipping details
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* View Mode Message */}
        {isViewMode && (
          <Card variant="glass" className="border-primary-500/30 border">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-primary-300">
                Interactions are disabled in view-only mode
              </p>
            </CardContent>
          </Card>
        )}

        {/* Unclaim Modal */}
        <UnclaimModal
          isOpen={showUnclaimModal}
          onClose={() => setShowUnclaimModal(false)}
          onConfirm={handleConfirmUnclaim}
          orderId={orderId!}
          isLoading={isUnclaiming}
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

        {/* Complete Shipment with Skipped Items Confirmation Dialog */}
        <ConfirmDialog
          isOpen={completeShipmentConfirm.isOpen}
          onClose={() => setCompleteShipmentConfirm({ isOpen: false, skippedItems: [] })}
          onConfirm={confirmCreateShipment}
          title="Complete Order with Skipped Items"
          message={
            <div className="text-left">
              <p className="mb-3">The following items were skipped and could not be verified:</p>
              <ul className="list-disc pl-5 mb-3 space-y-1">
                {completeShipmentConfirm.skippedItems.map((item: any, i: number) => (
                  <li key={i}>
                    {item.name} ({item.sku}) - {item.skipReason || 'No reason provided'}
                  </li>
                ))}
              </ul>
              <p>
                Are you sure you want to complete this order? These items will remain unverified.
              </p>
            </div>
          }
          confirmText="Complete Order"
          cancelText="Cancel"
          variant="warning"
          isLoading={isCreatingShipment}
        />
      </main>
    </div>
  );
}
