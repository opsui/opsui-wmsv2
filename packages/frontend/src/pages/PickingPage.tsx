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
  DocumentChartBarIcon,
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

const PICKING_THEME_STYLE_ID = 'picking-live-theme-styles';

const pickingThemeStyles = `
  html.light .picking-live-page .picking-card {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.98) 100%);
    border-color: rgba(148, 163, 184, 0.24);
    box-shadow: 0 18px 40px rgba(148, 163, 184, 0.18);
  }

  html.light .picking-live-page .picking-divider {
    border-color: rgba(148, 163, 184, 0.3) !important;
  }

  html.light .picking-live-page .picking-surface-panel {
    background: rgba(248, 250, 252, 0.88);
    border-color: rgba(148, 163, 184, 0.24);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
  }

  html.light .picking-live-page .barcode-display {
    background: rgba(248, 250, 252, 0.96);
    border-color: rgba(168, 85, 247, 0.24);
  }

  html.light .picking-live-page .barcode-display::before {
    background: rgba(168, 85, 247, 0.45);
  }

  html.light .picking-live-page .pick-item-card {
    background: rgba(248, 250, 252, 0.96);
    border-color: rgba(148, 163, 184, 0.18);
  }

  html.light .picking-live-page .pick-item-card:hover {
    background: rgba(241, 245, 249, 0.98);
    border-color: rgba(168, 85, 247, 0.25);
  }

  html.light .picking-live-page .pick-item-card.active {
    background: rgba(168, 85, 247, 0.08);
    border-color: rgba(168, 85, 247, 0.3);
    box-shadow: 0 0 18px rgba(168, 85, 247, 0.08);
  }

  html.light .picking-live-page .pick-item-card.completed {
    background: rgba(34, 197, 94, 0.12);
    border-color: rgba(34, 197, 94, 0.28);
  }

  html.light .picking-live-page .pick-item-card.skipped {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.28);
  }

  html.light .picking-live-page .scanner-modal-content {
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border-color: rgba(168, 85, 247, 0.22);
    box-shadow: 0 25px 50px rgba(148, 163, 184, 0.25), 0 0 80px rgba(168, 85, 247, 0.08);
  }

  html.light .picking-live-page .picking-card .picking-title,
  html.light .picking-live-page .scanner-modal-content .picking-title {
    color: #0f172a !important;
  }

  html.light .picking-live-page .picking-card .picking-subtitle:not(.text-primary-300):not(.text-primary-400):not(.text-primary-600):not(.text-primary-700):not(.text-warning-300):not(.text-warning-400):not(.text-warning-700):not(.text-success-300):not(.text-success-400):not(.text-success-700):not(.text-error-300):not(.text-error-400):not(.text-error-700),
  html.light .picking-live-page .picking-surface-panel .picking-subtitle:not(.text-primary-300):not(.text-primary-400):not(.text-primary-600):not(.text-primary-700):not(.text-warning-300):not(.text-warning-400):not(.text-warning-700):not(.text-success-300):not(.text-success-400):not(.text-success-700):not(.text-error-300):not(.text-error-400):not(.text-error-700),
  html.light .picking-live-page .scanner-modal-content .picking-subtitle:not(.text-primary-300):not(.text-primary-400):not(.text-primary-600):not(.text-primary-700):not(.text-warning-300):not(.text-warning-400):not(.text-warning-700):not(.text-success-300):not(.text-success-400):not(.text-success-700):not(.text-error-300):not(.text-error-400):not(.text-error-700) {
    color: #64748b !important;
  }

  html.light .picking-live-page .scanner-modal-content .step-indicator span {
    color: #334155 !important;
  }

  html.light .picking-live-page .scanner-modal-content .step-indicator-line {
    background: rgba(148, 163, 184, 0.35);
  }

  html.light .picking-live-page .hero-number:not(.text-primary-300):not(.text-primary-400):not(.text-primary-600):not(.text-primary-700):not(.text-warning-300):not(.text-warning-400):not(.text-warning-700):not(.text-success-300):not(.text-success-400):not(.text-success-700):not(.text-error-300):not(.text-error-400):not(.text-error-700),
  html.light .picking-live-page .quantity-display:not(.text-primary-300):not(.text-primary-400):not(.text-primary-600):not(.text-primary-700):not(.text-warning-300):not(.text-warning-400):not(.text-warning-700):not(.text-success-300):not(.text-success-400):not(.text-success-700):not(.text-error-300):not(.text-error-400):not(.text-error-700) {
    background: linear-gradient(180deg, #0f172a 0%, #475569 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: none;
  }
`;

const pickingSurfacePanelClass =
  'picking-surface-panel rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-4';
const pickingInputClass =
  'w-full px-4 py-3 bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.08] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500';

const fulfillmentSlipHeaderColor = '#b8b8b8';
const fulfillmentSlipAccentColor = '#6b7280';
const fulfillmentSlipLogoSvg = `
  <svg width="220" height="96" viewBox="0 0 220 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Arrowhead Alarm Products">
    <rect width="220" height="96" fill="white"/>
    <path d="M19 16H44L28 52H19V16Z" fill="#111111"/>
    <path d="M46 16H72L57 41H46V16Z" fill="#5A97D6"/>
    <path d="M46 44H58L64 54H56V62H74V78H38L52 54H46V44Z" fill="#5A97D6"/>
    <path d="M0 82H9.8L13.2 73.6H29.7L33.1 82H43.1L27 45.4H16.3L0 82ZM16.2 66.4L21.4 53.9L26.5 66.4H16.2Z" fill="#1A1A1A"/>
    <path d="M46.7 82V45.4H63.3C68.2 45.4 72 46.6 74.7 49C77.3 51.4 78.6 54.6 78.6 58.7C78.6 62.6 77.3 65.8 74.8 68.2C72.2 70.6 68.5 71.8 63.6 71.8H56.2V82H46.7ZM56.2 64.4H62.6C64.8 64.4 66.4 63.9 67.4 62.9C68.5 61.9 69 60.5 69 58.7C69 56.8 68.5 55.4 67.4 54.4C66.4 53.4 64.8 52.9 62.6 52.9H56.2V64.4Z" fill="#1A1A1A"/>
    <path d="M83.1 82V45.4H92.6V58.5H106.7V45.4H116.2V82H106.7V66.1H92.6V82H83.1Z" fill="#1A1A1A"/>
    <path d="M121.6 82V45.4H131.1V82H121.6Z" fill="#1A1A1A"/>
    <path d="M137 82V45.4H146.3L161.3 67.8V45.4H170.5V82H161.5L146.2 59.2V82H137Z" fill="#1A1A1A"/>
    <path d="M176.1 82V45.4H205.2V52.8H185.5V59.8H203.7V66.9H185.5V74.6H205.5V82H176.1Z" fill="#1A1A1A"/>
    <path d="M0 94.5V87.6H4.2C5.2 87.6 6 87.9 6.6 88.4C7.2 88.9 7.5 89.5 7.5 90.4C7.5 91.3 7.2 91.9 6.6 92.4C6 93 5.2 93.2 4.2 93.2H1.8V94.5H0ZM1.8 91.8H4.1C4.5 91.8 4.8 91.7 5 91.5C5.3 91.3 5.4 91 5.4 90.6C5.4 90.2 5.3 89.9 5 89.7C4.8 89.5 4.5 89.4 4.1 89.4H1.8V91.8Z" fill="#1A1A1A"/>
    <path d="M8.9 94.5V87.6H10.7V93H14.4V94.5H8.9Z" fill="#1A1A1A"/>
    <path d="M15.4 94.5L18.4 87.6H20.3L23.3 94.5H21.4L20.8 93H17.9L17.3 94.5H15.4ZM18.4 91.7H20.2L19.3 89.4L18.4 91.7Z" fill="#1A1A1A"/>
    <path d="M25.9 94.5V89.1H23.6V87.6H30V89.1H27.7V94.5H25.9Z" fill="#1A1A1A"/>
    <path d="M31.2 94.5V87.6H36.8V89H33V90.4H36.5V91.8H33V94.5H31.2Z" fill="#1A1A1A"/>
    <path d="M41.1 94.7C40.1 94.7 39.2 94.4 38.4 93.7C37.7 93 37.3 92.2 37.3 91.1C37.3 90.1 37.7 89.2 38.4 88.5C39.2 87.8 40.1 87.5 41.1 87.5C42.2 87.5 43.1 87.8 43.8 88.5C44.6 89.2 44.9 90.1 44.9 91.1C44.9 92.2 44.6 93 43.8 93.7C43.1 94.4 42.2 94.7 41.1 94.7ZM41.1 93.1C41.7 93.1 42.2 92.9 42.6 92.4C43 92 43.2 91.5 43.2 90.9C43.2 90.3 43 89.8 42.6 89.4C42.2 88.9 41.7 88.7 41.1 88.7C40.5 88.7 40 88.9 39.6 89.4C39.2 89.8 39 90.3 39 90.9C39 91.5 39.2 92 39.6 92.4C40 92.9 40.5 93.1 41.1 93.1Z" fill="#1A1A1A"/>
    <path d="M46.4 94.5V87.6H50.9C51.9 87.6 52.6 87.8 53.2 88.3C53.8 88.8 54.1 89.5 54.1 90.3C54.1 90.9 53.9 91.4 53.6 91.8C53.2 92.2 52.8 92.5 52.2 92.6L54.4 94.5H52.1L50.1 92.8H48.2V94.5H46.4ZM48.2 91.4H50.6C51 91.4 51.3 91.3 51.6 91.1C51.8 90.9 51.9 90.6 51.9 90.3C51.9 90 51.8 89.8 51.6 89.6C51.3 89.4 51 89.3 50.6 89.3H48.2V91.4Z" fill="#1A1A1A"/>
    <path d="M55.7 94.5V87.6H57.7L60 91.3L62.4 87.6H64.3V94.5H62.5V90.2L60.4 93.5H59.6L57.5 90.2V94.5H55.7Z" fill="#1A1A1A"/>
    <path d="M65.9 94.5L68.9 87.6H70.8L73.8 94.5H71.9L71.3 93H68.4L67.8 94.5H65.9ZM68.9 91.7H70.7L69.8 89.4L68.9 91.7Z" fill="#1A1A1A"/>
    <path d="M76.4 94.5V89.1H74.1V87.6H80.5V89.1H78.2V94.5H76.4Z" fill="#1A1A1A"/>
    <path d="M81.8 94.5V87.6H83.6V94.5H81.8Z" fill="#1A1A1A"/>
    <path d="M88.8 94.7C87.7 94.7 86.8 94.4 86.1 93.7C85.3 93 85 92.2 85 91.1C85 90.1 85.3 89.2 86.1 88.5C86.8 87.8 87.7 87.5 88.8 87.5C89.8 87.5 90.7 87.8 91.5 88.5C92.2 89.2 92.6 90.1 92.6 91.1C92.6 92.2 92.2 93 91.5 93.7C90.7 94.4 89.8 94.7 88.8 94.7ZM88.8 93.1C89.4 93.1 89.9 92.9 90.3 92.4C90.7 92 90.9 91.5 90.9 90.9C90.9 90.3 90.7 89.8 90.3 89.4C89.9 88.9 89.4 88.7 88.8 88.7C88.1 88.7 87.6 88.9 87.2 89.4C86.8 89.8 86.6 90.3 86.6 90.9C86.6 91.5 86.8 92 87.2 92.4C87.6 92.9 88.1 93.1 88.8 93.1Z" fill="#1A1A1A"/>
    <path d="M94 94.5V87.6H95.8L99.4 91.8V87.6H101.2V94.5H99.7L95.8 90V94.5H94Z" fill="#1A1A1A"/>
  </svg>
`;

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
  const pickingTaskStorageKey = orderId ? `picking-current-task:${orderId}` : null;

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

  useEffect(() => {
    if (!document.getElementById(PICKING_THEME_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = PICKING_THEME_STYLE_ID;
      style.textContent = pickingThemeStyles;
      document.head.appendChild(style);
    }
  }, []);

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
      <div className="picking-live-page min-h-screen flex items-center justify-center">
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
            <p className="picking-title text-gray-900 dark:text-white text-xl mb-2">
              Claiming Order
            </p>
            <p className="picking-subtitle text-gray-600 dark:text-gray-400 text-sm">
              Preparing your pick list...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show claim error
  if (claimError) {
    return (
      <div className="picking-live-page min-h-screen flex items-center justify-center p-4">
        <div className="picking-card rounded-2xl p-8 max-w-md w-full text-center industrial-corners">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-error-500/20 flex items-center justify-center">
            <ExclamationCircleIcon className="h-8 w-8 text-error-400" />
          </div>
          <h2 className="picking-title text-2xl text-gray-900 dark:text-white mb-3">
            Cannot Start Picking
          </h2>
          <p className="picking-subtitle text-gray-600 dark:text-gray-400 mb-6">{claimError}</p>
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
      <div className="picking-live-page min-h-screen flex items-center justify-center">
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
            <p className="picking-title text-gray-900 dark:text-white text-xl mb-2">
              Loading Order
            </p>
            <p className="picking-subtitle text-gray-600 dark:text-gray-400 text-sm">
              Retrieving pick details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="picking-live-page min-h-screen flex items-center justify-center p-4">
        <div className="picking-card rounded-2xl p-8 max-w-md w-full text-center industrial-corners">
          <p className="picking-subtitle text-gray-600 dark:text-gray-400 mb-6">Order not found</p>
          <Button onClick={() => navigate('/orders')}>Back to Queue</Button>
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
        <style>{`
          @media print {
            @page { size: A4 landscape; margin: 12mm; }
            html, body {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body * { visibility: hidden !important; }
            #fulfillment-slip-print, #fulfillment-slip-print * { visibility: visible !important; }
            #fulfillment-slip-print {
              position: absolute; inset: 0; width: 100%;
              background: white !important; color: black !important;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            #fulfillment-slip-actions { display: none !important; }
            .print-hide { display: none !important; }
            .fulfillment-slip-print-color {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        `}</style>

        <Header />
        <ResponsiveContainer variant="fluid" padding="lg">
          <main className="relative z-10 space-y-responsive">
            <Breadcrumb
              items={[
                { label: 'Picking Queue', path: pickingQueuePath },
                { label: `Fulfillment ${fulfillmentPreviewOrder.netsuiteIfTranId || fulfillmentPreviewOrder.orderId}` },
              ]}
            />

            <div className="picking-card rounded-2xl industrial-corners overflow-hidden">
              <div id="fulfillment-slip-print" className="bg-white text-slate-900">
                {/* Header Section */}
                <div className="relative border-b-2 border-slate-200">
                  {/* Accent stripe */}
                  <div
                    className="h-2 fulfillment-slip-print-color"
                    style={{
                      background: `linear-gradient(to right, ${fulfillmentSlipAccentColor}, ${fulfillmentSlipHeaderColor}, ${fulfillmentSlipAccentColor})`,
                    }}
                  />

                  <div className="px-8 py-6">
                    <div className="flex items-start justify-between gap-8">
                      {/* Logo & Company */}
                      <div className="flex items-start gap-5">
                        <div
                          className="w-36 h-auto fulfillment-slip-print-color"
                          dangerouslySetInnerHTML={{ __html: fulfillmentSlipLogoSvg }}
                        />
                        <div className="pt-1 text-sm leading-relaxed text-slate-600">
                          <p className="font-semibold text-slate-800">Arrowhead Alarm Products</p>
                          <p>1A Emirali Road</p>
                          <p>Silverdale 0932, Auckland</p>
                          <p>New Zealand</p>
                        </div>
                      </div>

                      {/* Document Title */}
                      <div className="text-right">
                        <div className="inline-block">
                          <p
                            className="text-xs font-bold uppercase tracking-[0.2em]"
                            style={{ color: fulfillmentSlipAccentColor }}
                          >
                            Fulfillment Document
                          </p>
                          <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900">
                            Packing Slip
                          </h1>
                        </div>
                        <div className="mt-4 inline-flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-2 print:bg-white print:border print:border-gray-300">
                          <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">{orderDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Info Grid */}
                <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 print:bg-white">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-3 border border-slate-200 print:border-gray-300">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sales Order</p>
                      <p className="font-mono font-semibold text-slate-900">
                        {fulfillmentPreviewOrder.netsuiteSoTranId || fulfillmentPreviewOrder.orderId}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-200 print:border-gray-300">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fulfillment #</p>
                      <p className="font-mono font-semibold text-slate-900">
                        {fulfillmentPreviewOrder.netsuiteIfTranId || fulfillmentPreviewOrder.netsuiteSoTranId || fulfillmentPreviewOrder.orderId}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-200 print:border-gray-300">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Customer PO</p>
                      <p className="font-mono font-semibold text-slate-900">
                        {fulfillmentPreviewOrder.customerPoNumber || '—'}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-200 print:border-gray-300">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Account #</p>
                      <p className="font-mono font-semibold text-slate-900">
                        {fulfillmentPreviewOrder.customerId || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Addresses Section */}
                <div className="px-8 py-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Ship To */}
                    <div className="relative">
                      <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-violet-500 rounded-full print:bg-gray-400" />
                      <div className="flex items-center gap-2 mb-3">
                        <TruckIcon className="h-5 w-5 text-purple-500 print:text-gray-500" />
                        <h2 className="text-lg font-bold text-slate-900">Ship To</h2>
                      </div>
                      <div className="space-y-0.5 text-sm text-slate-700 pl-1">
                        {previewAddressLines.length > 0 ? (
                          previewAddressLines.map((line, i) => (
                            <p key={`ship-${line}`} className={i === 0 ? 'font-semibold text-slate-900' : ''}>
                              {line}
                            </p>
                          ))
                        ) : (
                          <p className="text-slate-400 italic">No shipping details available</p>
                        )}
                      </div>
                    </div>

                    {/* Bill To */}
                    <div className="relative">
                      <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-400 to-slate-300 rounded-full print:bg-gray-300" />
                      <div className="flex items-center gap-2 mb-3">
                        <DocumentChartBarIcon className="h-5 w-5 text-slate-400 print:text-gray-500" />
                        <h2 className="text-lg font-bold text-slate-900">Bill To</h2>
                      </div>
                      <div className="space-y-0.5 text-sm text-slate-700 pl-1">
                        {billToLines.length > 0 ? (
                          billToLines.map((line, i) => (
                            <p key={`bill-${line}`} className={i === 0 ? 'font-semibold text-slate-900' : ''}>
                              {line}
                            </p>
                          ))
                        ) : (
                          <p className="text-slate-400 italic">Same as shipping address</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shipping Method Badge */}
                  <div className="mt-6 flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Shipping Method</span>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold fulfillment-slip-print-color"
                      style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
                    >
                      <TruckIcon className="h-3.5 w-3.5" />
                      {fulfillmentPreviewOrder.carrier || 'Warehouse Pick'}
                    </span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="px-8 pb-6">
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:rounded-none">
                    {/* Table Header */}
                    <div
                      className="fulfillment-slip-print-color"
                      style={{ backgroundColor: fulfillmentSlipHeaderColor }}
                    >
                      <div
                        className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider"
                        style={{ color: '#ffffff' }}
                      >
                        <span className="col-span-3">Item / SKU</span>
                        <span className="col-span-5">Description</span>
                        <span className="col-span-1 text-center">Ord</span>
                        <span className="col-span-1 text-center">B/O</span>
                        <span className="col-span-2 text-center">Shipped</span>
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-slate-100 print:divide-gray-200">
                      {(fulfillmentPreviewOrder.items || []).map((item: any, idx: number) => (
                        <div
                          key={item.orderItemId}
                          className={`grid grid-cols-12 gap-2 px-4 py-4 text-sm ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                          } print:bg-white`}
                        >
                          <div className="col-span-3">
                            <p className="font-mono font-bold text-slate-900">{item.sku}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Bin: {formatBinLocation(item.binLocation)}</p>
                          </div>
                          <div className="col-span-5">
                            <p className="text-slate-700 font-medium">{item.name}</p>
                          </div>
                          <div className="col-span-1 text-center font-semibold text-slate-600">
                            {item.quantity}
                          </div>
                          <div className="col-span-1 text-center text-slate-400">
                            0
                          </div>
                          <div className="col-span-2 text-center">
                            <span
                              className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-md font-bold fulfillment-slip-print-color"
                              style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
                            >
                              {item.pickedQuantity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Table Footer */}
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 print:bg-white">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <ClipboardDocumentListIcon className="h-4 w-4" />
                          <span>Total Items:</span>
                          <span className="font-bold text-slate-900">
                            {(fulfillmentPreviewOrder.items || []).reduce(
                              (sum: number, item: any) => sum + item.pickedQuantity,
                              0
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span>SKUs:</span>
                          <span className="font-bold text-slate-900">
                            {(fulfillmentPreviewOrder.items || []).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="px-8 py-6 border-t-2 border-slate-200">
                  <div className="flex items-end justify-between">
                    {/* Picked By */}
                    <div className="text-sm">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Picked By</p>
                      <p className="font-semibold text-slate-900">
                        {fulfillmentPreviewOrder.pickerId || currentUser?.userId || 'Unknown'}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {new Date().toLocaleString('en-NZ', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Signature Areas */}
                    <div className="flex gap-12">
                      <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Packed By</p>
                        <div className="w-36 border-b-2 border-slate-300 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Verified By</p>
                        <div className="w-36 border-b-2 border-slate-300 h-8" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Footer */}
                <div className="px-8 py-4 bg-slate-100 border-t border-slate-200 print:bg-white">
                  <p className="text-center text-xs text-slate-400">
                    This document was generated electronically from OpsUI Warehouse Management System
                  </p>
                </div>
              </div>

              {/* Action Buttons (not printed) */}
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
    <div className="picking-live-page min-h-screen">
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
                <p className="picking-title text-gray-900 dark:text-white">
                  {order.status === 'PICKED' || order.status === 'SHIPPED'
                    ? 'Viewing completed order'
                    : "Viewing this picker's work in real-time"}
                </p>
                <p className="picking-subtitle text-gray-600 dark:text-gray-400 text-sm mt-0.5">
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
                  <div className="mb-6 pb-6 border-b picking-divider border-white/[0.08]">
                    <h1 className="picking-title text-xl text-gray-900 dark:text-white truncate">
                      {order.netsuiteSoTranId || order.orderId}
                    </h1>
                    {order.netsuiteSoTranId && (
                      <p className="mt-0.5 picking-subtitle text-gray-500 text-xs font-mono truncate">
                        OpsUI: {order.orderId}
                      </p>
                    )}
                    <p className="mt-1 picking-subtitle text-gray-600 dark:text-gray-400 text-sm truncate">
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
                      <span className="picking-subtitle text-gray-600 dark:text-gray-400 text-sm">
                        Completed
                      </span>
                      <span className="hero-number text-lg text-success-400">{completedTasks}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="picking-subtitle text-gray-600 dark:text-gray-400 text-sm">
                        Remaining
                      </span>
                      <span className="hero-number text-lg text-warning-400">
                        {totalTasks - completedTasks}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="picking-subtitle text-gray-600 dark:text-gray-400 text-sm">
                        Total
                      </span>
                      <span className="hero-number text-lg text-gray-900 dark:text-white">
                        {totalTasks}
                      </span>
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
                    <h2 className="picking-title text-3xl text-gray-900 dark:text-white mb-3 animate-celebrate">
                      All Items Picked!
                    </h2>
                    <p className="picking-subtitle text-gray-600 dark:text-gray-400 mb-8">
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
                  <div className="p-6 border-b picking-divider border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="picking-subtitle text-primary-600 dark:text-primary-400 text-xs uppercase tracking-wider mb-1">
                          Current Pick Task
                        </p>
                        <h2 className="picking-title text-xl text-gray-900 dark:text-white">
                          {currentTask.name}
                        </h2>
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
                          <p className="text-primary-600 dark:text-primary-400 text-xs uppercase tracking-wider mb-2">
                            Scan Barcode
                          </p>
                          <p className="text-2xl text-gray-900 dark:text-white tracking-widest font-mono">
                            {currentTask.barcode}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-warning-500/10 border border-warning-500/30 rounded-xl px-5 py-4">
                          <p className="text-warning-700 dark:text-warning-400 text-sm">
                            No barcode assigned - scan or enter item code manually
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quantity Display */}
                    <div className="flex items-center justify-center gap-8 py-6">
                      <div className="text-center">
                        <p className="picking-subtitle text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">
                          Picked
                        </p>
                        <p className="quantity-display text-primary-400">
                          {currentTask.pickedQuantity}
                        </p>
                      </div>
                      <div className="text-5xl text-gray-600 font-light">/</div>
                      <div className="text-center">
                        <p className="picking-subtitle text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">
                          Needed
                        </p>
                        <p className="quantity-display text-gray-900 dark:text-white">
                          {currentTask.quantity}
                        </p>
                      </div>
                      <div className="text-5xl text-gray-600 font-light hidden sm:block">|</div>
                      <div className="text-center hidden sm:block">
                        <p className="picking-subtitle text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">
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
                      <span className="picking-subtitle text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
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
                        <span className="text-xs text-error-700 dark:text-error-400 bg-error-500/20 px-2 py-0.5 rounded-full">
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
                    <div className={pickingSurfacePanelClass}>
                      <p className="picking-subtitle text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider mb-4">
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
                                        ? 'text-success-700 dark:text-success-300 line-through'
                                        : isSkipped
                                          ? 'text-warning-700 dark:text-warning-300'
                                          : isCurrent
                                            ? 'text-gray-900 dark:text-white'
                                            : 'text-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    {item.name}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-gray-500 font-mono truncate">
                                      {item.binLocation}
                                    </p>
                                    {isSkipped && item.skipReason && (
                                      <p className="text-xs text-warning-700 dark:text-warning-300 truncate">
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
                                      ? 'text-success-700 dark:text-success-300'
                                      : isSkipped
                                        ? 'text-warning-700 dark:text-warning-300'
                                        : isCurrent
                                          ? 'text-primary-400'
                                          : 'text-gray-700 dark:text-gray-300'
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
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
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
                        <p className="picking-subtitle text-primary-700 dark:text-primary-300 text-sm">
                          Interactions are disabled in view-only mode
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* No Current Task */
                <div className="picking-card rounded-2xl p-8 text-center industrial-corners">
                  <p className="picking-subtitle text-gray-600 dark:text-gray-400">
                    No items to pick
                  </p>
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
