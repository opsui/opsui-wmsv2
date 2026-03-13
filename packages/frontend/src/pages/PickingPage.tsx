/**
 * Picking page
 *
 * Main picking interface for scanning and picking items
 *
 * Design: Scanner-First Industrial Aesthetic
 * - Bold typography with Archivo display font
 * - Technical monospace for codes/locations
 * - Industrial corner accents and beacon effects
 * - Distinctive visual hierarchy
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
  TaskStatusBadge,
  UnclaimModal,
  UndoPickModal,
  useToast,
} from '@/components/shared';
import { ResponsiveContainer } from '@/components/shared/ResponsiveContainer';
import { PageViews, usePageTracking } from '@/hooks/usePageTracking';
import { usePickUpdates, useZoneUpdates } from '@/hooks/useWebSocket';
import { apiClient } from '@/lib/api-client';
import { formatBinLocation } from '@/lib/utils';
import { useCompleteOrder, useLogException, useOrder, usePickItem } from '@/services/api';
import { useAuthStore } from '@/stores';
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ForwardIcon,
  MinusCircleIcon,
  PencilSquareIcon,
  PrinterIcon,
  TruckIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Address, ExceptionType, OrderStatus, TaskStatus } from '@opsui/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

// ============================================================================
// COMPONENT
// ============================================================================

export function PickingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const returnToFromSearch = new URLSearchParams(location.search).get('returnTo');
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
  const [scanSuccess, setScanSuccess] = useState(false);

  // Exception modal state
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  // Manual override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideItemIndex, setOverrideItemIndex] = useState<number | null>(null);
  const [overrideQuantity, setOverrideQuantity] = useState<string>('0');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

  // Skip modal state
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipItemIndex, setSkipItemIndex] = useState<number | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [isSkipping, setIsSkipping] = useState(false);

  // Track skipped items for blocking completion
  const [skippedItemIds, setSkippedItemIds] = useState<Set<string>>(new Set());
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
  const pickingQueuePath =
    typeof location.state?.returnTo === 'string' && location.state.returnTo.length > 0
      ? location.state.returnTo
      : typeof returnToFromSearch === 'string' && returnToFromSearch.length > 0
        ? returnToFromSearch
        : '/orders?status=PICKING';

  // Confirm dialog states
  const [completeOrderConfirm, setCompleteOrderConfirm] = useState<{
    isOpen: boolean;
    skippedItems: any[];
  }>({ isOpen: false, skippedItems: [] });
  const [unskipConfirm, setUnskipConfirm] = useState<{ isOpen: boolean; index: number; item: any }>(
    { isOpen: false, index: -1, item: null }
  );
  const [fulfillmentPreviewOrder, setFulfillmentPreviewOrder] = useState<any | null>(null);
  const [isPrintingFulfillmentSlip, setIsPrintingFulfillmentSlip] = useState(false);

  const { data: order, isLoading, refetch } = useOrder(orderId!);
  const pickMutation = usePickItem();
  const completeMutation = useCompleteOrder();
  const logExceptionMutation = useLogException();
  const pickingTaskStorageKey = orderId ? `picking-current-task:${orderId}` : null;
  const autoPrintFulfillmentRef = useRef(false);

  const formatAddressLines = (address?: Address) =>
    [
      address?.name,
      address?.company && address?.company !== address?.name ? address.company : null,
      address?.addressLine1,
      address?.addressLine2,
      [address?.city, address?.state].filter(Boolean).join(', '),
      [address?.postalCode, address?.country].filter(Boolean).join(' '),
      address?.phone ? `Phone: ${address.phone}` : null,
      address?.email ? `Email: ${address.email}` : null,
    ].filter(Boolean) as string[];

  const escapePrintHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const buildFulfillmentSlipPrintHtml = (completedOrder: any) => {
    const previewAddressLines = formatAddressLines(completedOrder.shippingAddress);
    const billToLines = previewAddressLines;
    const orderDate = completedOrder.netsuiteOrderDate
      ? new Date(completedOrder.netsuiteOrderDate).toLocaleDateString('en-NZ')
      : new Date().toLocaleDateString('en-NZ');
    const completedAt = new Date().toLocaleString('en-NZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const shipToHtml =
      previewAddressLines.length > 0
        ? previewAddressLines
            .map(line => `<div class="meta-line">${escapePrintHtml(String(line))}</div>`)
            .join('')
        : '<div class="meta-line">No shipping details available</div>';

    const billToHtml =
      billToLines.length > 0
        ? billToLines
            .map(line => `<div class="meta-line">${escapePrintHtml(String(line))}</div>`)
            .join('')
        : '<div class="meta-line">No billing details available</div>';

    const rowsHtml = ((completedOrder.items || []) as any[])
      .map(
        item => `
          <tr>
            <td class="mono">${escapePrintHtml(String(item.sku || ''))}</td>
            <td>
              <div class="item-name">${escapePrintHtml(String(item.name || ''))}</div>
              <div class="item-sub">Bin: ${escapePrintHtml(
                String(formatBinLocation(item.binLocation || ''))
              )}</div>
            </td>
            <td class="num">${escapePrintHtml(String(item.quantity ?? 0))}</td>
            <td class="num">0</td>
            <td class="num">${escapePrintHtml(String(item.pickedQuantity ?? 0))}</td>
          </tr>
        `
      )
      .join('');

    return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Fulfillment Slip</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }

            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #0f172a;
              font-family: Arial, Helvetica, sans-serif;
            }

            * {
              box-sizing: border-box;
            }

            .sheet {
              width: 100%;
              padding: 0;
            }

            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 32px;
              margin-bottom: 28px;
            }

            .brand-block {
              display: flex;
              align-items: flex-start;
              gap: 18px;
              min-width: 420px;
            }

            .brand-logo {
              width: 168px;
              height: auto;
            }

            .brand-address {
              padding-top: 8px;
              font-size: 13px;
              line-height: 1.25;
              color: #111827;
            }

            .slip-meta {
              min-width: 360px;
            }

            .slip-title {
              margin: 0 0 18px;
              font-size: 26px;
              font-weight: 700;
            }

            .meta-grid {
              display: grid;
              grid-template-columns: 180px 1fr;
              row-gap: 8px;
              column-gap: 12px;
              font-size: 13px;
            }

            .label {
              font-weight: 700;
            }

            .address-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 42px;
              margin-bottom: 28px;
            }

            .address-panel-title {
              font-size: 15px;
              font-weight: 700;
              margin-bottom: 8px;
            }

            .mono {
              font-family: "Courier New", Courier, monospace;
            }

            .meta-line {
              margin: 1px 0;
              font-size: 13px;
              line-height: 1.25;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            thead th {
              text-align: left;
              background: #b8b8b8;
              color: #ffffff;
              font-size: 11px;
              padding: 6px 8px;
              border: 1px solid #b8b8b8;
            }

            tbody td {
              padding: 10px 8px;
              border: 1px solid #b7b7b7;
              vertical-align: top;
              font-size: 13px;
            }

            .item-name {
              font-weight: 700;
              margin-bottom: 4px;
            }

            .item-sub {
              color: #64748b;
              font-size: 12px;
              margin-top: 4px;
            }

            .num {
              text-align: right;
            }
          </style>
        </head>
        <body>
            <div class="sheet">
              <div class="header">
                <div class="brand-block">
                  <img class="brand-logo" src="/arrowhead-logo.svg" alt="Arrowhead Alarm Products" />
                  <div class="brand-address">
                    <div>1A Emirali Road,</div>
                    <div>Silverdale, 0932</div>
                    <div>Auckland</div>
                    <div>New Zealand</div>
                  </div>
                </div>
                <div class="slip-meta">
                  <div class="slip-title">Packing Slip</div>
                  <div class="meta-grid">
                    <div class="label">Order Date</div>
                    <div>${escapePrintHtml(orderDate)}</div>
                    <div class="label">Sales Order #</div>
                    <div>${escapePrintHtml(
                      String(completedOrder.netsuiteSoTranId || completedOrder.orderId)
                    )}</div>
                    <div class="label">Account Number</div>
                    <div>${escapePrintHtml(String(completedOrder.customerId || ''))}</div>
                    <div class="label">Customer PO #</div>
                    <div>${escapePrintHtml(String(completedOrder.customerPoNumber || ''))}</div>
                    <div class="label">Shipping Method</div>
                    <div>${escapePrintHtml(String(completedOrder.carrier || 'Warehouse Pick'))}</div>
                    <div class="label">Fulfillment #</div>
                    <div>${escapePrintHtml(
                      String(
                        completedOrder.netsuiteIfTranId ||
                          completedOrder.netsuiteSoTranId ||
                          completedOrder.orderId
                      )
                    )}</div>
                    <div class="label">Completed</div>
                    <div>${escapePrintHtml(completedAt)}</div>
                  </div>
                </div>
              </div>

              <div class="address-grid">
                <div>
                  <div class="address-panel-title">Ship To</div>
                  ${shipToHtml}
                </div>
                <div>
                  <div class="address-panel-title">Bill To</div>
                  ${billToHtml}
                </div>
              </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 24%;">Item</th>
                  <th style="width: 46%;">Description</th>
                  <th style="width: 10%; text-align: right;">Ordered</th>
                  <th style="width: 10%; text-align: right;">B/O</th>
                  <th style="width: 10%; text-align: right;">Shipped</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintFulfillmentSlip = async () => {
    setIsPrintingFulfillmentSlip(true);
    try {
      if (!fulfillmentPreviewOrder) {
        throw new Error('Packing slip preview is not ready yet');
      }

      const printFrame = document.createElement('iframe');
      printFrame.setAttribute('aria-hidden', 'true');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';

      document.body.appendChild(printFrame);

      const printDocument =
        printFrame.contentDocument || printFrame.contentWindow?.document || null;
      if (!printDocument) {
        document.body.removeChild(printFrame);
        throw new Error('Unable to prepare packing slip for printing');
      }

      printDocument.open();
      printDocument.write(buildFulfillmentSlipPrintHtml(fulfillmentPreviewOrder));
      printDocument.close();

      await new Promise(resolve => {
        const frameWindow = printFrame.contentWindow;
        if (!frameWindow) {
          resolve(null);
          return;
        }

        const triggerPrint = () => {
          frameWindow.focus();
          frameWindow.print();
          window.setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
            resolve(null);
          }, 500);
        };

        if (printDocument.readyState === 'complete') {
          triggerPrint();
        } else {
          printFrame.onload = triggerPrint;
        }
      });
    } finally {
      setTimeout(() => setIsPrintingFulfillmentSlip(false), 250);
    }
  };

  const handleFulfillmentPreviewReady = (completedOrder: any) => {
    setFulfillmentPreviewOrder(completedOrder);
    autoPrintFulfillmentRef.current = true;
  };

  // ==========================================================================
  // Real-time WebSocket Subscriptions
  // ==========================================================================

  // Subscribe to pick updates for this order
  const handlePickUpdate = useCallback(
    (data: { orderId: string; orderItemId: string; pickedQuantity?: number }) => {
      if (data.orderId === orderId) {
        queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      }
    },
    [orderId, queryClient]
  );
  usePickUpdates(handlePickUpdate);

  // Subscribe to zone updates (for zone reassignments during picking)
  const handleZoneUpdate = useCallback(
    (data: { zoneId: string; pickerId?: string; taskCount?: number; pickerCount?: number }) => {
      if (data.pickerId === currentUser?.userId) {
        queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      }
    },
    [currentUser?.userId, orderId, queryClient]
  );
  useZoneUpdates(handleZoneUpdate);

  // Ref to track if we've already attempted to claim this order
  const hasClaimedRef = useRef(false);

  // Ref to prevent race conditions during claim
  const isClaimingRef = useRef(false);

  // Ref to track if we've seen the initial order data load
  // Prevents claim logic from running on first render with potentially stale data
  const hasSeenInitialDataRef = useRef(false);

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
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
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
    hasSeenInitialDataRef.current = false;
    setClaimError(null);
    setFulfillmentPreviewOrder(null);
    autoPrintFulfillmentRef.current = false;
  }, [orderId]);

  useEffect(() => {
    if (!fulfillmentPreviewOrder || !autoPrintFulfillmentRef.current) {
      return;
    }

    autoPrintFulfillmentRef.current = false;
    void handlePrintFulfillmentSlip();
  }, [fulfillmentPreviewOrder]);

  // Claim order on page mount if not already claimed
  // Use useLayoutEffect to ensure ref updates happen synchronously before React StrictMode's second invocation
  useLayoutEffect(() => {
    if (orderId && order) {
      // CRITICAL: Validate that the order data matches the current orderId
      // This prevents acting on stale cached data from a previous order
      if (order.orderId !== orderId) {
        console.log(`[PickingPage] Order ID mismatch - data is stale, skipping claim`);
        console.log(`[PickingPage] Expected: ${orderId}, Got: ${order.orderId}`);
        return;
      }

      // CRITICAL: Mark that we've seen initial data - prevents race condition with stale data
      // The first render might have stale data (from previous order or cache)
      // Skip claim logic on first render, only run on subsequent renders with fresh data
      if (!hasSeenInitialDataRef.current) {
        console.log(`[PickingPage] First render - marking initial data seen, skipping claim`);
        hasSeenInitialDataRef.current = true;
        return;
      }

      console.log(`[PickingPage] Checking if order needs to be claimed: ${orderId}`);
      console.log(`[PickingPage] Order status: ${order.status}, pickerId: ${order.pickerId}`);
      console.log(
        `[PickingPage] hasClaimedRef: ${hasClaimedRef.current}, isClaiming: ${isClaimingRef.current}, isPending: ${claimMutation.isPending}`
      );

      // Get current user ID
      const currentUserId = useAuthStore.getState().user?.userId;

      // CRITICAL: If order is already in PICKING status and assigned to current user, skip claiming
      // This prevents React StrictMode double-render from causing 409 errors
      if (order.status === OrderStatus.PICKING && order.pickerId === currentUserId) {
        console.log(`[PickingPage] Order already claimed by current user, skipping claim`);
        hasClaimedRef.current = true;
        isClaimingRef.current = false;
        return;
      }

      // Check if this is a view-only scenario (admin/supervisor viewing someone else's order OR viewing a PICKED order)
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

      // Check if order is already claimed by current user OR is already in PICKING status
      const isAlreadyClaimed = order?.pickerId === currentUserId;
      const isAlreadyInProgress = order?.status === OrderStatus.PICKING;

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
  // Only call if order is already PICKING to avoid race condition with claim mutation
  useEffect(() => {
    // Don't call getNextTask if we're about to claim or currently claiming
    // Only call if order is already in PICKING status (already claimed)
    const shouldCallGetNextTask =
      orderId &&
      order &&
      !claimError &&
      !claimMutation.isPending &&
      !isClaimingRef.current &&
      order.status === OrderStatus.PICKING;

    if (shouldCallGetNextTask) {
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
  }, [orderId, order, claimError, claimMutation.isPending, queryClient]);

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

    // View mode uses WebSocket events (pick:updated / pick:completed) already
    // subscribed via usePickUpdates above — no polling needed.
  }, [order, currentUser, userRole]);

  // Get current pick task
  const currentTask = order?.items?.[currentTaskIndex];

  // Calculate progress
  const totalTasks = order?.items?.length || 0;
  const completedTasks =
    order?.items?.filter(item => item.pickedQuantity >= item.quantity).length || 0;

  // Reset scan error when current task changes
  useEffect(() => {
    setScanError(null);
  }, [currentTaskIndex]);

  // Restore the last focused task when possible, otherwise move to the first incomplete item.
  useEffect(() => {
    if (order?.items && order.items.length > 0) {
      let nextIndex = order.items.findIndex(item => item.pickedQuantity < item.quantity);

      if (pickingTaskStorageKey) {
        const storedIndex = Number(sessionStorage.getItem(pickingTaskStorageKey));
        if (
          Number.isInteger(storedIndex) &&
          storedIndex >= 0 &&
          storedIndex < order.items.length &&
          order.items[storedIndex].pickedQuantity < order.items[storedIndex].quantity
        ) {
          nextIndex = storedIndex;
        }
      }

      if (nextIndex !== -1 && nextIndex !== currentTaskIndex) {
        setCurrentTaskIndex(nextIndex);
      }
    }
  }, [currentTaskIndex, order, pickingTaskStorageKey]);

  useEffect(() => {
    if (pickingTaskStorageKey) {
      sessionStorage.setItem(pickingTaskStorageKey, String(currentTaskIndex));
    }
  }, [currentTaskIndex, pickingTaskStorageKey]);

  if (!orderId) {
    return <div>No order ID provided</div>;
  }

  // Show claim loading state - Distinctive warehouse loading animation
  if (claimMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="warehouse-loading">
          <div className="warehouse-loading-icon" />
          <div className="warehouse-loading-bars">
            <div className="warehouse-loading-bar" />
            <div className="warehouse-loading-bar" />
            <div className="warehouse-loading-bar" />
            <div className="warehouse-loading-bar" />
            <div className="warehouse-loading-bar" />
          </div>
          <div className="text-center">
            <p className="picking-title text-white text-xl mb-2">Claiming Order</p>
            <p className="picking-subtitle text-gray-400 text-sm">Preparing your pick list...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show claim error
  if (claimError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="picking-card rounded-2xl p-8 max-w-md w-full text-center industrial-corners">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-error-500/20 flex items-center justify-center">
            <ExclamationCircleIcon className="h-8 w-8 text-error-400" />
          </div>
          <h2 className="picking-title text-2xl text-white mb-3">Cannot Start Picking</h2>
          <p className="picking-subtitle text-gray-400 mb-6">{claimError}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate(pickingQueuePath)}>
              Back to Queue
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
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="warehouse-loading">
          <div className="warehouse-loading-icon" />
          <div className="warehouse-loading-bars">
            <div className="warehouse-loading-bar" />
            <div className="warehouse-loading-bar" />
            <div className="warehouse-loading-bar" />
            <div className="warehouse-loading-bar" />
            <div className="warehouse-loading-bar" />
          </div>
          <div className="text-center">
            <p className="picking-title text-white text-xl mb-2">Loading Order</p>
            <p className="picking-subtitle text-gray-400 text-sm">Retrieving pick details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="picking-card rounded-2xl p-8 max-w-md w-full text-center industrial-corners">
          <p className="picking-subtitle text-gray-400 mb-6">Order not found</p>
          <Button onClick={() => navigate(pickingQueuePath)}>Back to Queue</Button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ANY-ORDER SCANNING LOGIC
  // ==========================================================================

  /**
   * Find an item matching the scanned barcode/SKU that is not yet fully picked
   * This allows scanning items in any order
   */
  const findMatchingItem = (scannedValue: string): { item: any; index: number } | null => {
    if (!order?.items) return null;

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const isCompleted = item.pickedQuantity >= item.quantity;
      const isSkipped = item.status === 'SKIPPED';

      // Skip completed or skipped items
      if (isCompleted || isSkipped) continue;

      // Check if scanned value matches barcode or SKU
      const matchesBarcode = item.barcode && scannedValue === item.barcode;
      const matchesSku = scannedValue === item.sku;

      if (matchesBarcode || matchesSku) {
        return { item, index: i };
      }
    }

    return null;
  };

  const handleScan = async (value: string) => {
    setScanError(null);

    // Use barcode if available, otherwise use SKU
    const scanValueTrimmed = value.trim();

    // ANY-ORDER SCANNING: Find any item that matches the scanned value
    const matchResult = findMatchingItem(scanValueTrimmed);

    if (!matchResult) {
      // Check if it matches a completed or skipped item for better error message
      if (order?.items) {
        for (const item of order.items) {
          const matchesBarcode = item.barcode && scanValueTrimmed === item.barcode;
          const matchesSku = scanValueTrimmed === item.sku;
          if (matchesBarcode || matchesSku) {
            if (item.status === 'SKIPPED') {
              setScanError(`Item was skipped: ${item.name}. Revert the skip to pick it.`);
            } else if (item.pickedQuantity >= item.quantity) {
              setScanError(`Item already fully picked: ${item.name}`);
            }
            showToast('Item already processed', 'warning');
            return;
          }
        }
      }

      setScanError(
        `Invalid scan: "${scanValueTrimmed}" does not match any unpicked item in this order.`
      );
      showToast('Invalid barcode or SKU', 'error');
      return;
    }

    const { item: matchedItem, index: matchedIndex } = matchResult;

    // Check for over-scanning
    if (matchedItem.pickedQuantity >= matchedItem.quantity) {
      setScanError(`Item already fully picked: ${matchedItem.name}`);
      showToast('Item already fully picked', 'warning');
      return;
    }

    // Switch to the matched item's task if different from current
    if (matchedIndex !== currentTaskIndex) {
      setCurrentTaskIndex(matchedIndex);
    }

    // Perform pick - backend already handles both barcode and SKU validation
    try {
      await pickMutation.mutateAsync({
        orderId,
        dto: {
          sku: matchedItem.barcode || matchedItem.sku,
          quantity: 1,
          binLocation: matchedItem.binLocation,
          pickTaskId: matchedItem.orderItemId,
        },
      });

      // Show success feedback
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 600);

      showToast(`${matchedItem.name} picked!`, 'success');

      // Refetch order data to get updated state
      await refetch();
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Pick failed');
      showToast(error instanceof Error ? error.message : 'Failed to pick item', 'error');
    }

    setScanValue('');
  };

  const handleCompleteOrder = async () => {
    // Check for skipped items
    const skippedItems = order?.items?.filter(item => item.status === 'SKIPPED');

    if (skippedItems && skippedItems.length > 0) {
      // Show confirmation dialog for skipped items
      setCompleteOrderConfirm({ isOpen: true, skippedItems });
      return;
    }

    try {
      const completedOrder = await completeMutation.mutateAsync({
        orderId,
        dto: {
          orderId,
          pickerId: order.pickerId || '',
        },
      });
      if (pickingTaskStorageKey) {
        sessionStorage.removeItem(pickingTaskStorageKey);
      }
      showToast('Order completed!', 'success');
      handleFulfillmentPreviewReady(completedOrder);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to complete order', 'error');
    }
  };

  const confirmCompleteOrder = async () => {
    try {
      const completedOrder = await completeMutation.mutateAsync({
        orderId,
        dto: {
          orderId,
          pickerId: order.pickerId || '',
        },
      });
      if (pickingTaskStorageKey) {
        sessionStorage.removeItem(pickingTaskStorageKey);
      }
      showToast('Order completed!', 'success');
      setCompleteOrderConfirm({ isOpen: false, skippedItems: [] });
      handleFulfillmentPreviewReady(completedOrder);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to complete order', 'error');
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
    const item = order?.items?.[index];
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

      showToast(`Order ${orderId} unclaimed and reset to PENDING!`, 'success');
      setShowUnclaimModal(false);
      hasClaimedRef.current = false; // Reset ref after unclaiming
      isClaimingRef.current = false; // Reset claiming ref to allow re-claiming if needed
      setClaimError(null); // Clear any previous claim errors

      // Clear all order-related queries to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['orders', 'queue'] });
      await queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
      await queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
      if (pickingTaskStorageKey) {
        sessionStorage.removeItem(pickingTaskStorageKey);
      }

      // Force a full page reload to ensure fresh state and proper URL param reading
      window.location.href = '/orders?status=PENDING';
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

  // ==========================================================================
  // SKIP ITEM FUNCTIONALITY
  // ==========================================================================

  const handleSkipItem = (index: number) => {
    const item = order?.items?.[index];
    if (!item) return;

    setSkipItemIndex(index);
    setSkipReason('');
    setShowSkipModal(true);
  };

  const handleConfirmSkip = async () => {
    if (skipItemIndex === null || !order?.items?.[skipItemIndex]) return;

    const item = order.items[skipItemIndex];
    setIsSkipping(true);

    try {
      await apiClient.post(`/orders/${orderId}/skip-item`, {
        pickTaskId: item.orderItemId,
        reason: skipReason || 'No reason provided',
      });

      showToast('Item skipped!', 'warning');
      setShowSkipModal(false);
      setSkipItemIndex(null);
      setSkipReason('');

      // Track skipped item for completion blocking
      setSkippedItemIds(prev => new Set(prev).add(item.orderItemId));

      // Refetch order data
      await refetch();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to skip item', 'error');
    } finally {
      setIsSkipping(false);
    }
  };

  // ==========================================================================
  // MANUAL OVERRIDE FUNCTIONALITY
  // ==========================================================================

  const handleManualOverride = (index: number) => {
    const item = order?.items?.[index];
    if (!item) return;

    setOverrideItemIndex(index);
    setOverrideQuantity(String(item.pickedQuantity));
    setOverrideReason('');
    setOverrideNotes('');
    setShowOverrideModal(true);
  };

  const handleConfirmOverride = async () => {
    if (overrideItemIndex === null || !order?.items?.[overrideItemIndex]) return;

    const item = order.items[overrideItemIndex];
    const quantity = parseInt(overrideQuantity, 10) || 0;

    // Validate quantity
    if (quantity < 0 || quantity > item.quantity) {
      showToast(`Quantity must be between 0 and ${item.quantity}`, 'error');
      return;
    }

    setIsOverriding(true);

    try {
      await apiClient.post(`/orders/${orderId}/manual-override`, {
        pickTaskId: item.orderItemId,
        newQuantity: quantity,
        reason: overrideReason || 'Manual override',
        notes: overrideNotes || undefined,
      });

      showToast('Manual override applied!', 'success');
      setShowOverrideModal(false);
      setOverrideItemIndex(null);
      setOverrideReason('');
      setOverrideNotes('');

      // Refetch order data
      await refetch();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to apply override', 'error');
    } finally {
      setIsOverriding(false);
    }
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

  // Calculate progress percentage for ring
  const progressPercent = order?.progress || 0;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  if (fulfillmentPreviewOrder) {
    const previewAddressLines = formatAddressLines(fulfillmentPreviewOrder.shippingAddress);
    const billToLines = previewAddressLines;
    const orderDate = fulfillmentPreviewOrder.netsuiteOrderDate
      ? new Date(fulfillmentPreviewOrder.netsuiteOrderDate).toLocaleDateString('en-NZ')
      : new Date().toLocaleDateString('en-NZ');

    return (
      <div className="min-h-screen">
        <Header />
        <ResponsiveContainer variant="fluid" padding="lg">
          <main className="relative z-10 space-y-responsive">
            <Breadcrumb
              items={[
                { label: 'Picking Queue', path: pickingQueuePath },
                {
                  label: `Fulfillment ${fulfillmentPreviewOrder.netsuiteIfTranId || fulfillmentPreviewOrder.orderId}`,
                },
              ]}
            />

            <div className="picking-card rounded-2xl industrial-corners overflow-hidden">
              <div id="fulfillment-slip-print" className="bg-white text-slate-900 p-8 space-y-8">
                <div className="flex items-start justify-between gap-8">
                  <div className="flex items-start gap-5">
                    <img
                      src="/arrowhead-logo.svg"
                      alt="Arrowhead Alarm Products"
                      className="w-40 h-auto object-contain"
                    />
                    <div className="pt-2 text-sm leading-5 text-slate-800">
                      <div>1A Emirali Road,</div>
                      <div>Silverdale, 0932</div>
                      <div>Auckland</div>
                      <div>New Zealand</div>
                    </div>
                  </div>
                  <div className="min-w-[360px]">
                    <h1 className="text-5xl font-bold tracking-tight text-slate-950">
                      Packing Slip
                    </h1>
                    <dl className="mt-6 grid grid-cols-[170px,1fr] gap-y-2 gap-x-4 text-[15px]">
                      <dt className="font-bold text-slate-950">Order Date</dt>
                      <dd>{orderDate}</dd>
                      <dt className="font-bold text-slate-950">Sales Order #</dt>
                      <dd>
                        {fulfillmentPreviewOrder.netsuiteSoTranId ||
                          fulfillmentPreviewOrder.orderId}
                      </dd>
                      <dt className="font-bold text-slate-950">Account Number</dt>
                      <dd>{fulfillmentPreviewOrder.customerId || ''}</dd>
                      <dt className="font-bold text-slate-950">Customer PO #</dt>
                      <dd>{fulfillmentPreviewOrder.customerPoNumber || ''}</dd>
                      <dt className="font-bold text-slate-950">Shipping Method</dt>
                      <dd>{fulfillmentPreviewOrder.carrier || 'Warehouse Pick'}</dd>
                      <dt className="font-bold text-slate-950">Fulfillment #</dt>
                      <dd>
                        {fulfillmentPreviewOrder.netsuiteIfTranId ||
                          fulfillmentPreviewOrder.netsuiteSoTranId ||
                          fulfillmentPreviewOrder.orderId}
                      </dd>
                    </dl>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-10 text-[15px]">
                  <div>
                    <p className="mb-3 text-2xl font-bold text-slate-950">Ship To</p>
                    <div className="space-y-0.5 text-slate-900">
                      {previewAddressLines.length > 0 ? (
                        previewAddressLines.map(line => <p key={`ship-${line}`}>{line}</p>)
                      ) : (
                        <p>No shipping details available</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-2xl font-bold text-slate-950">Bill To</p>
                    <div className="space-y-0.5 text-slate-900">
                      {billToLines.length > 0 ? (
                        billToLines.map(line => <p key={`bill-${line}`}>{line}</p>)
                      ) : (
                        <p>No billing details available</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border border-[#b7b7b7]">
                  <div className="grid grid-cols-[24%,46%,10%,10%,10%] bg-[#b8b8b8] px-3 py-1.5 text-[13px] font-bold text-white">
                    <span>Item</span>
                    <span>Description</span>
                    <span className="text-right">Ordered</span>
                    <span className="text-right">B/O</span>
                    <span className="text-right">Shipped</span>
                  </div>
                  <div>
                    {(fulfillmentPreviewOrder.items || []).map((item: any) => (
                      <div
                        key={item.orderItemId}
                        className="grid grid-cols-[24%,46%,10%,10%,10%] border-t border-[#b7b7b7] px-3 py-4 text-[15px]"
                      >
                        <div>{item.sku}</div>
                        <div>
                          <div>{item.name}</div>
                          <div className="mt-1 text-[13px] text-slate-600">
                            Bin: {formatBinLocation(item.binLocation)}
                          </div>
                        </div>
                        <div className="text-right">{item.quantity}</div>
                        <div className="text-right">0</div>
                        <div className="text-right">{item.pickedQuantity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                id="fulfillment-slip-actions"
                className="flex flex-wrap items-center justify-end gap-3 border-t border-white/[0.08] px-6 py-5"
              >
                <Button
                  variant="secondary"
                  onClick={handlePrintFulfillmentSlip}
                  isLoading={isPrintingFulfillmentSlip}
                >
                  <PrinterIcon className="h-5 w-5 mr-2" />
                  Print Packing Slip
                </Button>
                <Button variant="success" onClick={() => navigate('/orders?status=PENDING')}>
                  Done
                </Button>
              </div>
            </div>
          </main>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Industrial grid background texture - fixed position to not affect scroll */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.12) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(168, 85, 247, 0.12) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          opacity: 0.4,
          maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />

      <Header />
      <ResponsiveContainer variant="fluid" padding="lg">
        <main className="relative z-10 space-y-responsive">
          {/* Breadcrumb Navigation */}
          <Breadcrumb
            items={[
              { label: 'Picking Queue', path: pickingQueuePath },
              { label: `Picking Order ${orderId}` },
            ]}
          />

          {/* View Mode Banner */}
          {isViewMode && (
            <div className="picking-card rounded-xl p-4 sm:p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="picking-title text-white">
                  {order.status === 'PICKED' || order.status === 'SHIPPED'
                    ? 'Viewing completed order'
                    : "Viewing this picker's work in real-time"}
                </p>
                <p className="picking-subtitle text-gray-400 text-sm mt-0.5">
                  You are in view-only mode. Interactions are disabled.
                </p>
              </div>
            </div>
          )}

          {/* Main Content Grid - Progress on left, Current Task on right */}
          <div className="lg:flex lg:gap-6">
            {/* Progress Sidebar - Left side - Sticky on desktop */}
            <div className="lg:w-1/4 lg:flex-shrink-0 mb-6 lg:mb-0">
              <div className="picking-card rounded-2xl lg:sticky lg:top-20 industrial-corners">
                <div className="p-6">
                  {/* Order Info */}
                  <div className="mb-6 pb-6 border-b border-white/[0.08]">
                    <h1 className="picking-title text-xl text-white truncate">
                      {order.netsuiteSoTranId || order.orderId}
                    </h1>
                    {order.netsuiteSoTranId && (
                      <p className="mt-0.5 picking-subtitle text-gray-500 text-xs font-mono truncate">
                        OpsUI: {order.orderId}
                      </p>
                    )}
                    <p className="mt-1 picking-subtitle text-gray-400 text-sm truncate">
                      {order.customerName}
                    </p>
                  </div>

                  {/* Progress Ring */}
                  <div className="flex justify-center mb-6">
                    <div className="relative picking-reticle rounded-full">
                      <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="rgba(168, 85, 247, 0.2)"
                          strokeWidth="6"
                          fill="none"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="url(#progress-gradient)"
                          strokeWidth="6"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-700 ease-out"
                        />
                        <defs>
                          <linearGradient
                            id="progress-gradient"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#c084fc" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="hero-number text-3xl">{order.progress}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="picking-subtitle text-gray-400 text-sm">Completed</span>
                      <span className="hero-number text-lg text-success-400">{completedTasks}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="picking-subtitle text-gray-400 text-sm">Remaining</span>
                      <span className="hero-number text-lg text-warning-400">
                        {totalTasks - completedTasks}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="picking-subtitle text-gray-400 text-sm">Total</span>
                      <span className="hero-number text-lg text-white">{totalTasks}</span>
                    </div>
                  </div>

                  {isOrderComplete && (
                    <Button
                      size="lg"
                      variant="success"
                      onClick={handleCompleteOrder}
                      isLoading={completeMutation.isPending}
                      disabled={isViewMode ? true : undefined}
                      className="w-full action-button-enhanced touch-target"
                    >
                      Complete Order
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Current Task - Right side */}
            <div className="flex-1 min-w-0">
              {isOrderComplete ? (
                /* Complete Order Card with Celebration Animation */
                <div className="picking-card rounded-2xl border-success-500/50 border-2 overflow-hidden relative celebration-container industrial-corners">
                  {/* Confetti particles */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(30)].map((_, i) => (
                      <div
                        key={i}
                        className="confetti-piece"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${100 + Math.random() * 20}%`,
                          backgroundColor:
                            i % 4 === 0
                              ? '#22c55e'
                              : i % 4 === 1
                                ? '#a855f7'
                                : i % 4 === 2
                                  ? '#f59e0b'
                                  : '#8b5cf6',
                          animationDelay: `${Math.random() * 0.8}s`,
                          borderRadius: i % 2 === 0 ? '50%' : '2px',
                          width: `${6 + Math.random() * 8}px`,
                          height: `${6 + Math.random() * 8}px`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="p-8 sm:p-12 text-center relative z-10">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-500/20 flex items-center justify-center animate-bounce-in">
                      <CheckIcon className="h-10 w-10 text-success-400" />
                    </div>
                    <h2 className="picking-title text-3xl text-white mb-3 animate-celebrate">
                      All Items Picked!
                    </h2>
                    <p className="picking-subtitle text-gray-400 mb-8">
                      Order is ready to be completed and sent to packing.
                    </p>
                    <Button
                      size="lg"
                      variant="success"
                      onClick={handleCompleteOrder}
                      isLoading={completeMutation.isPending}
                      disabled={isViewMode ? true : undefined}
                      className="action-button-enhanced touch-target animate-pop-in"
                    >
                      Complete Order
                    </Button>
                  </div>
                </div>
              ) : currentTask ? (
                /* Current Task Card */
                <div
                  className={`picking-card rounded-2xl border-primary-500/50 border-2 industrial-corners ${scanSuccess ? 'item-flash' : ''}`}
                >
                  <div className="p-6 border-b border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="picking-subtitle text-primary-400 text-xs uppercase tracking-wider mb-1">
                          Current Pick Task
                        </p>
                        <h2 className="picking-title text-xl text-white">{currentTask.name}</h2>
                      </div>
                      <div className="flex items-center gap-3">
                        {!isViewMode && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleUnclaimOrder}
                            disabled={order.status !== OrderStatus.PICKING}
                          >
                            Unclaim
                          </Button>
                        )}
                        <TaskStatusBadge
                          status={
                            currentTask.pickedQuantity > 0
                              ? TaskStatus.IN_PROGRESS
                              : TaskStatus.PENDING
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Barcode Display */}
                    <div>
                      {currentTask.barcode ? (
                        <div className="barcode-display rounded-xl px-5 py-4">
                          <p className="text-primary-400 text-xs uppercase tracking-wider mb-2">
                            Scan Barcode
                          </p>
                          <p className="text-2xl text-white tracking-widest font-mono">
                            {currentTask.barcode}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-warning-500/10 border border-warning-500/30 rounded-xl px-5 py-4">
                          <p className="text-warning-400 text-sm">
                            No barcode assigned - scan or enter item code manually
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quantity Display */}
                    <div className="flex items-center justify-center gap-8 py-6">
                      <div className="text-center">
                        <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-3">
                          Picked
                        </p>
                        <p className="quantity-display text-primary-400">
                          {currentTask.pickedQuantity}
                        </p>
                      </div>
                      <div className="text-5xl text-gray-600 font-light">/</div>
                      <div className="text-center">
                        <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-3">
                          Needed
                        </p>
                        <p className="quantity-display text-white">{currentTask.quantity}</p>
                      </div>
                      <div className="text-5xl text-gray-600 font-light hidden sm:block">|</div>
                      <div className="text-center hidden sm:block">
                        <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-3">
                          On Hand
                        </p>
                        <p
                          className={`quantity-display ${
                            (currentTask.onHandQuantity ?? 0) >= currentTask.quantity
                              ? 'text-success-400'
                              : (currentTask.onHandQuantity ?? 0) > 0
                                ? 'text-warning-400'
                                : 'text-error-400'
                          }`}
                        >
                          {currentTask.onHandQuantity ?? 0}
                        </p>
                      </div>
                    </div>

                    {/* On Hand indicator for mobile */}
                    <div className="sm:hidden flex items-center justify-center gap-2 mb-4">
                      <span className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider">
                        On Hand:
                      </span>
                      <span
                        className={`font-bold text-lg ${
                          (currentTask.onHandQuantity ?? 0) >= currentTask.quantity
                            ? 'text-success-400'
                            : (currentTask.onHandQuantity ?? 0) > 0
                              ? 'text-warning-400'
                              : 'text-error-400'
                        }`}
                      >
                        {currentTask.onHandQuantity ?? 0}
                      </span>
                      {(currentTask.onHandQuantity ?? 0) < currentTask.quantity && (
                        <span className="text-xs text-error-400 bg-error-500/20 px-2 py-0.5 rounded-full">
                          Low Stock
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    <div className="bin-location-display rounded-xl p-5 text-center bin-beacon">
                      <p className="text-white/70 text-xs uppercase tracking-wider mb-2">
                        Go to bin location
                      </p>
                      <p className="text-3xl text-white font-bold tracking-widest">
                        {formatBinLocation(currentTask.binLocation)}
                      </p>
                    </div>

                    {/* Items in Order - Integrated into Current Pick Task */}
                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                      <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-4">
                        Items in Order ({order.items?.length || 0})
                      </p>
                      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                        {order.items?.map((item, index) => {
                          const isCompleted = item.pickedQuantity >= item.quantity;
                          const isSkipped = item.status === 'SKIPPED';
                          const isCurrent = index === currentTaskIndex;

                          return (
                            <div
                              key={item.orderItemId}
                              onClick={() => {
                                // Allow clicking on any incomplete/non-skipped item to select it
                                if (!isCompleted && !isSkipped && !isViewMode) {
                                  setCurrentTaskIndex(index);
                                }
                              }}
                              className={`pick-item-card flex items-center justify-between p-3 rounded-xl transition-all duration-200 animate-fade-in-up ${
                                isCurrent
                                  ? 'active'
                                  : isCompleted
                                    ? 'completed'
                                    : isSkipped
                                      ? 'skipped'
                                      : ''
                              } ${!isCompleted && !isSkipped && !isViewMode ? 'cursor-pointer' : ''}`}
                              style={{
                                animationDelay: `${index * 30}ms`,
                                animationFillMode: 'backwards',
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Status Icon */}
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                                  {isCompleted && (
                                    <div className="w-6 h-6 rounded-full bg-success-500/20 flex items-center justify-center">
                                      <CheckIcon className="h-4 w-4 text-success-400" />
                                    </div>
                                  )}
                                  {isSkipped && !isViewMode && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleUnskipItem(index);
                                      }}
                                      className="w-6 h-6 rounded-full bg-warning-500/20 flex items-center justify-center text-warning-400 hover:bg-warning-500/30 transition-colors touch-target"
                                      title="Revert skip"
                                    >
                                      <ArrowPathIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                  {isSkipped && isViewMode && (
                                    <div className="w-6 h-6 rounded-full bg-warning-500/20 flex items-center justify-center">
                                      <ExclamationTriangleIcon className="h-4 w-4 text-warning-400" />
                                    </div>
                                  )}
                                  {!isCompleted && !isSkipped && (
                                    <div
                                      className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-primary-400 status-badge-glow' : 'bg-gray-500'}`}
                                    />
                                  )}
                                </div>

                                {/* Item Info */}
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`font-medium text-sm truncate ${
                                      isCompleted
                                        ? 'text-success-300 line-through'
                                        : isSkipped
                                          ? 'text-warning-300'
                                          : isCurrent
                                            ? 'text-white'
                                            : 'text-gray-300'
                                    }`}
                                  >
                                    {item.name}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-gray-500 font-mono truncate">
                                      {item.binLocation}
                                    </p>
                                    {isSkipped && item.skipReason && (
                                      <p className="text-xs text-warning-300 truncate">
                                        ({item.skipReason})
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Quantity & Actions */}
                              <div className="text-right flex-shrink-0 ml-2 flex items-center gap-2">
                                <p
                                  className={`font-semibold text-sm font-mono ${
                                    isCompleted
                                      ? 'text-success-300'
                                      : isSkipped
                                        ? 'text-warning-300'
                                        : isCurrent
                                          ? 'text-primary-400'
                                          : 'text-gray-300'
                                  }`}
                                >
                                  {isSkipped
                                    ? 'Skipped'
                                    : `${item.pickedQuantity}/${item.quantity}`}
                                </p>

                                {/* Action buttons - only show for current/selected item */}
                                {isCurrent && !isViewMode && !isCompleted && !isSkipped && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleSkipItem(index);
                                    }}
                                    className="text-warning-400 hover:text-warning-300 hover:bg-warning-500/10 p-1.5 rounded-lg transition-colors touch-target"
                                    title="Skip this item"
                                  >
                                    <ForwardIcon className="h-4 w-4" />
                                  </button>
                                )}
                                {isCurrent &&
                                  !isViewMode &&
                                  !isCompleted &&
                                  !isSkipped &&
                                  (userRole === 'ADMIN' || userRole === 'SUPERVISOR') && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleManualOverride(index);
                                      }}
                                      className="text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 p-1.5 rounded-lg transition-colors touch-target"
                                      title="Manual override"
                                    >
                                      <PencilSquareIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                {(!isViewMode ||
                                  userRole === 'ADMIN' ||
                                  userRole === 'SUPERVISOR') &&
                                  item.pickedQuantity > 0 &&
                                  !isSkipped && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleUndoPick(index);
                                      }}
                                      className="text-error-400 hover:text-error-300 hover:bg-error-500/10 p-1.5 rounded-lg transition-colors touch-target"
                                      title="Undo pick"
                                    >
                                      <MinusCircleIcon className="h-4 w-4" />
                                    </button>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Scan Input */}
                    <div className="scanner-active rounded-xl">
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
                    </div>

                    {/* Scan Instruction */}
                    {currentTask.barcode && (
                      <div className="scan-instruction">
                        <p className="text-gray-400 text-sm">
                          Scan this barcode:{' '}
                          <span className="font-mono font-semibold text-primary-400">
                            {currentTask.barcode}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {!isViewMode && (
                      <div className="flex gap-3">
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={handleReportException}
                          disabled={pickMutation.isPending}
                          className="w-full action-button-enhanced touch-target"
                        >
                          <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
                          Report Exception
                        </Button>
                      </div>
                    )}
                    {isViewMode && (
                      <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 text-center">
                        <p className="picking-subtitle text-primary-300 text-sm">
                          Interactions are disabled in view-only mode
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* No Current Task */
                <div className="picking-card rounded-2xl p-8 text-center industrial-corners">
                  <p className="picking-subtitle text-gray-400">No items to pick</p>
                </div>
              )}
            </div>
          </div>

          {/* Exception Modal */}
          {showExceptionModal && (
            <div className="fixed inset-0 scanner-modal-overlay flex items-center justify-center z-50 p-2 sm:p-4">
              <div className="scanner-modal-content max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-warning-500 to-warning-600 text-white px-4 sm:px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                        <WrenchScrewdriverIcon className="h-5 w-5" />
                      </div>
                      <h2 className="picking-title text-xl">Report Exception</h2>
                    </div>
                    <button
                      onClick={() => setShowExceptionModal(false)}
                      className="text-white hover:text-warning-200 transition-colors touch-target p-1"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Step Indicator */}
                <div className="px-6 py-4 border-b border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <div className="step-indicator flex items-center gap-2">
                      <div
                        className={`step-indicator-dot ${exceptionStep === 'type' ? 'active' : exceptionStep !== 'type' ? 'completed' : ''}`}
                      />
                      <span className="text-xs font-medium text-white hidden xs:inline">Type</span>
                    </div>
                    <div
                      className={`step-indicator-line flex-1 mx-2 ${exceptionStep !== 'type' ? 'completed' : ''}`}
                    />
                    <div className="step-indicator flex items-center gap-2">
                      <div
                        className={`step-indicator-dot ${exceptionStep === 'details' ? 'active' : exceptionStep === 'confirm' ? 'completed' : ''}`}
                      />
                      <span className="text-xs font-medium text-white hidden sm:inline">
                        Details
                      </span>
                    </div>
                    <div
                      className={`step-indicator-line flex-1 mx-2 ${exceptionStep === 'confirm' ? 'completed' : ''}`}
                    />
                    <div className="step-indicator flex items-center gap-2">
                      <div
                        className={`step-indicator-dot ${exceptionStep === 'confirm' ? 'active' : ''}`}
                      />
                      <span className="text-xs font-medium text-white hidden sm:inline">
                        Confirm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {exceptionStep === 'type' && (
                    <div>
                      <p className="picking-subtitle text-white mb-4">Select type of exception:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {
                            type: ExceptionType.OUT_OF_STOCK,
                            label: 'Out of Stock',
                            desc: 'Item not available in bin',
                          },
                          { type: ExceptionType.DAMAGE, label: 'Damaged', desc: 'Item is damaged' },
                          {
                            type: ExceptionType.DEFECTIVE,
                            label: 'Defective',
                            desc: 'Item has quality issues',
                          },
                          {
                            type: ExceptionType.WRONG_ITEM,
                            label: 'Wrong Item',
                            desc: 'Incorrect item in bin',
                          },
                          {
                            type: ExceptionType.SHORT_PICK,
                            label: 'Short Pick',
                            desc: 'Insufficient quantity',
                          },
                          {
                            type: ExceptionType.BIN_MISMATCH,
                            label: 'Bin Mismatch',
                            desc: 'Item in wrong bin',
                          },
                          {
                            type: ExceptionType.SUBSTITUTION,
                            label: 'Substitution',
                            desc: 'Customer accepts substitute',
                          },
                          {
                            type: ExceptionType.BARCODE_MISMATCH,
                            label: 'Barcode Issue',
                            desc: "Barcode doesn't match",
                          },
                        ].map(({ type, label, desc }) => (
                          <button
                            key={type}
                            onClick={() => setExceptionType(type)}
                            className={`p-4 rounded-xl border-2 text-left transition-all touch-target ${
                              exceptionType === type
                                ? 'border-primary-500 bg-primary-500/20'
                                : 'border-white/[0.08] bg-white/[0.02] hover:border-primary-500/50'
                            }`}
                          >
                            <div className="picking-title text-white text-sm">{label}</div>
                            <div className="picking-subtitle text-xs text-gray-400 mt-1">
                              {desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {exceptionStep === 'details' && (
                    <div>
                      <div className="mb-4">
                        <div className="inline-block px-3 py-1.5 bg-primary-500/20 text-primary-300 rounded-lg text-sm font-medium">
                          {exceptionType.replace(/_/g, ' ')}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Reason <span className="text-error-400">*</span>
                          </label>
                          <textarea
                            value={exceptionReason}
                            onChange={e => setExceptionReason(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-500"
                            placeholder="Provide details about the exception..."
                            required
                          />
                        </div>

                        {exceptionType === ExceptionType.SUBSTITUTION && (
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Substitute SKU
                            </label>
                            <input
                              type="text"
                              value={substituteSku}
                              onChange={e => setSubstituteSku(e.target.value.toUpperCase())}
                              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-500 font-mono"
                              placeholder="Enter substitute SKU..."
                            />
                          </div>
                        )}

                        {exceptionType === ExceptionType.SHORT_PICK && (
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Actual Quantity Available
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={exceptionQuantity}
                              onChange={e => setExceptionQuantity(parseInt(e.target.value) || 0)}
                              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-500 font-mono"
                              placeholder="Enter actual quantity..."
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {exceptionStep === 'confirm' && (
                    <div>
                      <h3 className="picking-title text-lg text-white mb-4">Confirm Exception</h3>

                      <div className="bg-white/[0.05] rounded-xl p-4 space-y-3 border border-white/[0.08]">
                        <div className="flex justify-between">
                          <span className="picking-subtitle text-gray-400 text-sm">Type:</span>
                          <span className="text-sm font-semibold text-white">
                            {exceptionType.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {currentTask && (
                          <>
                            <div className="flex justify-between">
                              <span className="picking-subtitle text-gray-400 text-sm">SKU:</span>
                              <span className="text-sm font-semibold text-white font-mono">
                                {currentTask.sku}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="picking-subtitle text-gray-400 text-sm">
                                Expected Qty:
                              </span>
                              <span className="text-sm font-semibold text-white font-mono">
                                {currentTask.quantity}
                              </span>
                            </div>
                          </>
                        )}

                        {exceptionReason && (
                          <div>
                            <span className="picking-subtitle text-gray-400 text-sm">Reason:</span>
                            <p className="text-sm text-white mt-1">{exceptionReason}</p>
                          </div>
                        )}

                        {exceptionType === ExceptionType.SUBSTITUTION && substituteSku && (
                          <div className="flex justify-between">
                            <span className="picking-subtitle text-gray-400 text-sm">
                              Substitute SKU:
                            </span>
                            <span className="text-sm font-semibold text-primary-400 font-mono">
                              {substituteSku}
                            </span>
                          </div>
                        )}

                        {exceptionType === ExceptionType.SHORT_PICK && exceptionQuantity > 0 && (
                          <div className="flex justify-between">
                            <span className="picking-subtitle text-gray-400 text-sm">
                              Actual Qty:
                            </span>
                            <span className="text-sm font-semibold text-white font-mono">
                              {exceptionQuantity}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
                        <p className="picking-subtitle text-primary-300 text-sm">
                          <strong>Note:</strong> This exception will be logged and the item will be
                          skipped. A supervisor will review and resolve this exception.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/[0.08] rounded-b-2xl flex flex-col sm:flex-row justify-between gap-3">
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
              itemName={order.items?.[undoPickItemIndex]?.name || ''}
              sku={order.items?.[undoPickItemIndex]?.sku || ''}
              currentQuantity={order.items?.[undoPickItemIndex]?.pickedQuantity || 0}
              totalQuantity={order.items?.[undoPickItemIndex]?.quantity || 0}
              wasCompleted={
                (order.items?.[undoPickItemIndex]?.pickedQuantity || 0) >=
                (order.items?.[undoPickItemIndex]?.quantity || 0)
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
                <p>
                  Are you sure you want to complete this order? These items will remain unpicked.
                </p>
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

          {/* Skip Item Modal */}
          {showSkipModal && skipItemIndex !== null && order?.items?.[skipItemIndex] && (
            <div className="fixed inset-0 scanner-modal-overlay flex items-center justify-center z-50 p-4">
              <div className="scanner-modal-content max-w-md w-full rounded-2xl">
                <div className="bg-gradient-to-r from-warning-500 to-warning-600 text-white px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <h2 className="picking-title text-lg">Skip Item</h2>
                    <button
                      onClick={() => setShowSkipModal(false)}
                      className="text-white hover:text-warning-200 transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.08]">
                    <p className="picking-title text-white">{order.items[skipItemIndex].name}</p>
                    <p className="text-sm text-gray-400 font-mono mt-1">
                      {order.items[skipItemIndex].sku}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Qty: {order.items[skipItemIndex].quantity} | Bin:{' '}
                      {order.items[skipItemIndex].binLocation}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Reason for skipping <span className="text-error-400">*</span>
                    </label>
                    <textarea
                      value={skipReason}
                      onChange={e => setSkipReason(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-warning-500 focus:border-warning-500 text-white placeholder-gray-500"
                      placeholder="e.g., Item not found in bin, Damaged, etc."
                    />
                  </div>

                  <div className="p-4 bg-warning-500/10 border border-warning-500/30 rounded-xl">
                    <p className="picking-subtitle text-warning-300 text-sm">
                      <strong>Warning:</strong> Skipping this item will mark it as skipped. You can
                      revert this later if needed.
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-white/[0.08] rounded-b-2xl flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowSkipModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="warning"
                    onClick={handleConfirmSkip}
                    isLoading={isSkipping}
                    disabled={!skipReason.trim()}
                  >
                    Skip Item
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Manual Override Modal */}
          {showOverrideModal && overrideItemIndex !== null && order?.items?.[overrideItemIndex] && (
            <div className="fixed inset-0 scanner-modal-overlay flex items-center justify-center z-50 p-4">
              <div className="scanner-modal-content max-w-md w-full rounded-2xl">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <h2 className="picking-title text-lg">Manual Override</h2>
                    <button
                      onClick={() => setShowOverrideModal(false)}
                      className="text-white hover:text-primary-200 transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.08]">
                    <p className="picking-title text-white">
                      {order.items[overrideItemIndex].name}
                    </p>
                    <p className="text-sm text-gray-400 font-mono mt-1">
                      {order.items[overrideItemIndex].sku}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Required: {order.items[overrideItemIndex].quantity} | Currently Picked:{' '}
                      {order.items[overrideItemIndex].pickedQuantity}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      New Picked Quantity <span className="text-error-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={order.items[overrideItemIndex].quantity}
                      value={overrideQuantity}
                      onChange={e => setOverrideQuantity(e.target.value)}
                      onFocus={e => e.target.select()}
                      className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-500 font-mono text-lg"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Max: {order.items[overrideItemIndex].quantity} (cannot exceed required
                      quantity)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Reason <span className="text-error-400">*</span>
                    </label>
                    <textarea
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-500"
                      placeholder="e.g., Found damaged item, Correcting count, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Additional Notes (optional)
                    </label>
                    <textarea
                      value={overrideNotes}
                      onChange={e => setOverrideNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-gray-500"
                      placeholder="Any additional details..."
                    />
                  </div>

                  <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
                    <p className="picking-subtitle text-primary-300 text-sm">
                      <strong>Note:</strong> This action will be logged and audited. Supervisors
                      will be able to review this override.
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-white/[0.08] rounded-b-2xl flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowOverrideModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleConfirmOverride}
                    isLoading={isOverriding}
                    disabled={!overrideReason.trim() || overrideQuantity < 0}
                  >
                    Apply Override
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </ResponsiveContainer>
    </div>
  );
}
