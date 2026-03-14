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
import {
  skuApi,
  useClaimOrderForPacking,
  useCompletePacking,
  useCompleteOrder,
  useLogException,
  useOrder,
  usePickItem,
} from '@/services/api';
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
const SKU_LOOKUP_PATTERN = /^[A-Z0-9-]{2,50}$/;

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

// Professional blue theme colors for the fulfillment slip
const fulfillmentSlipPrimaryColor = '#0f4c81'; // deep document blue
const fulfillmentSlipSecondaryColor = '#3b82a6'; // muted steel blue
const fulfillmentSlipAccentColor = '#1e3a5f'; // dark navy accent
const fulfillmentSlipHeaderColor = '#16324f'; // table/header navy
const code39Patterns: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn',
};

const buildCode39Barcode = (value?: string | null) => {
  const normalizedValue = value?.trim().toUpperCase() || '';
  if (!normalizedValue) {
    return null;
  }

  const encodedValue = `*${normalizedValue}*`;
  const segments: Array<{ isBar: boolean; width: number }> = [];

  for (const [charIndex, char] of Array.from(encodedValue).entries()) {
    const pattern = code39Patterns[char];
    if (!pattern) {
      return null;
    }

    for (const [elementIndex, token] of Array.from(pattern).entries()) {
      segments.push({
        isBar: elementIndex % 2 === 0,
        width: token === 'w' ? 3 : 1,
      });
    }

    if (charIndex < encodedValue.length - 1) {
      segments.push({ isBar: false, width: 1 });
    }
  }

  const quietZone = 10;
  const totalWidth = segments.reduce((sum, segment) => sum + segment.width, quietZone * 2);

  return {
    displayValue: normalizedValue,
    quietZone,
    segments,
    totalWidth,
  };
};

const extractNetSuiteAccountNumber = (customerName?: string | null, customerId?: string | null) => {
  const trimmedCustomerName = customerName?.trim() || '';
  const accountMatch = trimmedCustomerName.match(/^(\d{3,})\b/);

  if (accountMatch) {
    return {
      accountNumber: accountMatch[1],
      caption: 'NetSuite customer number',
    };
  }

  return {
    accountNumber: customerId?.trim() || '-',
    caption: 'NetSuite internal customer ID',
  };
};

const chunkFulfillmentSlipItems = <T,>(
  items: T[],
  firstPageSize: number,
  continuationPageSize: number
): T[][] => {
  if (items.length === 0) {
    return [[]];
  }

  const pages: T[][] = [];
  let cursor = 0;

  pages.push(items.slice(cursor, cursor + firstPageSize));
  cursor += firstPageSize;

  while (cursor < items.length) {
    pages.push(items.slice(cursor, cursor + continuationPageSize));
    cursor += continuationPageSize;
  }

  return pages;
};

const renderBarcodeDimensions = (
  totalWidth: number,
  barHeight: number,
  moduleWidthMm: number,
  heightMm: number
): { widthPx: number; heightPx: number; widthMm: string; heightMm: string } => {
  const widthMmValue = Number((totalWidth * moduleWidthMm).toFixed(2));

  return {
    widthPx: Math.round(widthMmValue * 3.78),
    heightPx: Math.round(heightMm * 3.78),
    widthMm: `${widthMmValue}mm`,
    heightMm: `${heightMm}mm`,
  };
};

const getOrderItemDisplayName = (item?: any | null) =>
  item?.itemName || item?.item_name || item?.name || item?.sku || 'Item';

const getOrderItemDescription = (item?: any | null) => {
  const description = item?.description || item?.itemDescription || item?.item_description || null;
  const displayName = getOrderItemDisplayName(item);

  if (!description || description === displayName || description === item?.sku) {
    return null;
  }

  return description;
};

const formatInventoryQuantity = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      });
};

const createBarcodePngDataUrl = (
  barcode: ReturnType<typeof buildCode39Barcode>,
  size: ReturnType<typeof renderBarcodeDimensions>
) => {
  if (!barcode || !size || typeof document === 'undefined') {
    return null;
  }

  const scale = 4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, size.widthPx * scale);
  canvas.height = Math.max(1, size.heightPx * scale);

  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#111827';

  const moduleWidthPx = canvas.width / barcode.totalWidth;
  let currentX = barcode.quietZone * moduleWidthPx;

  for (const segment of barcode.segments) {
    const segmentWidth = segment.width * moduleWidthPx;

    if (segment.isBar) {
      context.fillRect(currentX, 0, Math.max(1, segmentWidth), canvas.height);
    }

    currentX += segmentWidth;
  }

  return canvas.toDataURL('image/png');
};

const formatNetSuiteDisplayText = (value?: string | null): string => {
  if (!value) {
    return '';
  }

  return value
    .trim()
    .replace(/^_+/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

interface AddressLine {
  label: string;
  value: string;
}

const formatAddressLines = (address?: Address | null): AddressLine[] => {
  if (!address) {
    return [];
  }

  const lines: { label: string; value: string | undefined | null }[] = [
    { label: 'Name', value: address.name },
    { label: 'Company', value: address.company },
    { label: 'Address', value: address.addressLine1 },
    { label: '', value: address.addressLine2 },
    { label: 'City', value: address.city },
    { label: 'State', value: address.state },
    { label: 'Postal Code', value: address.postalCode },
    { label: 'Country', value: formatNetSuiteDisplayText(address.country) },
  ];

  return lines
    .map(line => ({
      label: line.label,
      value: typeof line.value === 'string' ? line.value.trim() : '',
    }))
    .filter(line => line.value);
};

const fulfillmentSlipLogoUrl = '/arrowhead-logo.png';

export function PickingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const returnToFromSearch = new URLSearchParams(location.search).get('returnTo');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.user);
  const userRole = useAuthStore(state => state.user.role);
  const { showToast } = useToast();

  // Track current page for admin dashboard
  usePageTracking({ view: orderId ? PageViews.PICKING(orderId) : 'Picking' });

  const [scanValue, setScanValue] = useState('');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [activeOrderItemImageMap, setActiveOrderItemImageMap] = useState<Record<string, string>>(
    {}
  );
  const [fulfillmentItemImageMap, setFulfillmentItemImageMap] = useState<Record<string, string>>(
    {}
  );
  const [fulfillmentItemBarcodeImageMap, setFulfillmentItemBarcodeImageMap] = useState<
    Record<string, string>
  >({});
  const [salesOrderBarcodeImage, setSalesOrderBarcodeImage] = useState<string | null>(null);

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
  const [skipQuantity, setSkipQuantity] = useState(1);
  const [isSkipping, setIsSkipping] = useState(false);

  // Track skipped items for blocking completion
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
  const fulfillmentPreviewStorageKey = orderId ? `picking-fulfillment-preview:${orderId}` : null;

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
  const hasHydratedFulfillmentPreviewRef = useRef(false);
  const hasAutoOpenedFulfillmentRef = useRef(false);

  const { data: order, isLoading, refetch } = useOrder(orderId!);
  const pickMutation = usePickItem();
  const completeMutation = useCompleteOrder();
  const claimForPackingMutation = useClaimOrderForPacking();
  const completePackingMutation = useCompletePacking();
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
      if (data.pickerId === currentUser.userId) {
        queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      }
    },
    [currentUser.userId, orderId, queryClient]
  );
  useZoneUpdates(handleZoneUpdate);

  // Ref to track if we've already attempted to claim this order
  const hasClaimedRef = useRef(false);

  // Ref to prevent race conditions during claim
  const isClaimingRef = useRef(false);

  // Ref to track if we've seen the initial order data load
  // Prevents claim logic from running on first render with potentially stale data
  const hasSeenInitialDataRef = useRef(false);

  // Ref to track auto-print trigger for fulfillment labels
  const autoPrintFulfillmentRef = useRef(false);

  const setSelectedTaskIndex = useCallback(
    (index: number) => {
      if (pickingTaskStorageKey) {
        sessionStorage.setItem(pickingTaskStorageKey, String(index));
      }
      setCurrentTaskIndex(index);
    },
    [pickingTaskStorageKey]
  );

  // Claim order mutation
  const claimMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post(`/orders/${orderId}/claim`, {
        pickerId: useAuthStore.getState().user.userId,
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
    hasHydratedFulfillmentPreviewRef.current = false;
    hasAutoOpenedFulfillmentRef.current = false;
  }, [orderId]);

  useEffect(() => {
    if (!fulfillmentPreviewOrder || !autoPrintFulfillmentRef.current) {
      return;
    }

    autoPrintFulfillmentRef.current = false;
    void handlePrintFulfillmentSlip();
  }, [fulfillmentPreviewOrder]);

  const handleFulfillmentPreviewReady = useCallback((completedOrder: any) => {
    setFulfillmentPreviewOrder(completedOrder);
    autoPrintFulfillmentRef.current = true;
  }, []);

  useEffect(() => {
    if (!fulfillmentPreviewStorageKey) {
      return;
    }

    if (!hasHydratedFulfillmentPreviewRef.current) {
      return;
    }

    if (!fulfillmentPreviewOrder) {
      sessionStorage.removeItem(fulfillmentPreviewStorageKey);
      return;
    }

    sessionStorage.setItem(fulfillmentPreviewStorageKey, JSON.stringify(fulfillmentPreviewOrder));
  }, [fulfillmentPreviewOrder, fulfillmentPreviewStorageKey]);

  useEffect(() => {
    if (!fulfillmentPreviewStorageKey || hasHydratedFulfillmentPreviewRef.current) {
      return;
    }

    hasHydratedFulfillmentPreviewRef.current = true;

    const savedPreview = sessionStorage.getItem(fulfillmentPreviewStorageKey);
    if (!savedPreview) {
      return;
    }

    try {
      const parsedPreview = JSON.parse(savedPreview);
      if (parsedPreview?.orderId === orderId) {
        setFulfillmentPreviewOrder(parsedPreview);
        return;
      }
    } catch {
      // Fall through to clear invalid session state.
    }

    sessionStorage.removeItem(fulfillmentPreviewStorageKey);
  }, [fulfillmentPreviewStorageKey, orderId]);

  useEffect(() => {
    if (!order?.items?.length) {
      setActiveOrderItemImageMap({});
      return;
    }

    const activeItems = order.items as Array<{
      sku?: string;
      image?: string | null;
    }>;
    const missingSkus = Array.from(
      new Set(
        activeItems
          .filter(item => item?.sku && !item.image)
          .map(item => String(item.sku).trim().toUpperCase())
          .filter(sku => SKU_LOOKUP_PATTERN.test(sku))
      )
    );

    const seededImages = activeItems.reduce<Record<string, string>>((acc, item) => {
      if (item?.sku && item.image) {
        acc[String(item.sku)] = item.image;
      }
      return acc;
    }, {});

    setActiveOrderItemImageMap(current => ({ ...seededImages, ...current }));

    if (missingSkus.length === 0) {
      return;
    }

    let isCancelled = false;

    void Promise.allSettled(missingSkus.map(sku => skuApi.getWithInventory(sku))).then(results => {
      if (isCancelled) {
        return;
      }

      const fetchedImages = results.reduce<Record<string, string>>((acc, result, index) => {
        if (result.status === 'fulfilled' && result.value?.image) {
          acc[missingSkus[index]] = result.value.image;
        }
        return acc;
      }, {});

      if (Object.keys(fetchedImages).length > 0) {
        setActiveOrderItemImageMap(current => ({ ...current, ...fetchedImages }));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [order]);

  useEffect(() => {
    if (!fulfillmentPreviewOrder?.items?.length) {
      setFulfillmentItemImageMap({});
      return;
    }

    const previewItems = fulfillmentPreviewOrder.items as Array<{
      sku?: string;
      image?: string | null;
    }>;
    const missingSkus = Array.from(
      new Set(
        previewItems
          .filter(item => item?.sku && !item.image)
          .map(item => String(item.sku).trim().toUpperCase())
          .filter(sku => SKU_LOOKUP_PATTERN.test(sku))
      )
    );

    const seededImages = previewItems.reduce<Record<string, string>>((acc, item) => {
      if (item?.sku && item.image) {
        acc[String(item.sku)] = item.image;
      }
      return acc;
    }, {});

    setFulfillmentItemImageMap(current => ({ ...seededImages, ...current }));

    if (missingSkus.length === 0) {
      return;
    }

    let isCancelled = false;

    void Promise.allSettled(missingSkus.map(sku => skuApi.getWithInventory(sku))).then(results => {
      if (isCancelled) {
        return;
      }

      const fetchedImages = results.reduce<Record<string, string>>((acc, result, index) => {
        if (result.status === 'fulfilled' && result.value?.image) {
          acc[missingSkus[index]] = result.value.image;
        }
        return acc;
      }, {});

      if (Object.keys(fetchedImages).length > 0) {
        setFulfillmentItemImageMap(current => ({ ...current, ...fetchedImages }));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [fulfillmentPreviewOrder]);

  useEffect(() => {
    if (!fulfillmentPreviewOrder) {
      setSalesOrderBarcodeImage(null);
      setFulfillmentItemBarcodeImageMap({});
      return;
    }

    const previewSalesOrderBarcode = buildCode39Barcode(
      fulfillmentPreviewOrder.netsuiteSoTranId || fulfillmentPreviewOrder.orderId
    );
    const previewSalesOrderBarcodeSize = previewSalesOrderBarcode
      ? renderBarcodeDimensions(previewSalesOrderBarcode.totalWidth, 38, 0.33, 12.5)
      : null;

    setSalesOrderBarcodeImage(
      previewSalesOrderBarcode && previewSalesOrderBarcodeSize
        ? createBarcodePngDataUrl(previewSalesOrderBarcode, previewSalesOrderBarcodeSize)
        : null
    );

    const itemBarcodeImages = (fulfillmentPreviewOrder.items || []).reduce<Record<string, string>>(
      (acc: Record<string, string>, item: any) => {
        if (!item?.barcode || !item?.orderItemId) {
          return acc;
        }

        const barcode = buildCode39Barcode(item.barcode);
        const barcodeSize = barcode
          ? renderBarcodeDimensions(barcode.totalWidth, 32, 0.22, 7.5)
          : null;
        const dataUrl =
          barcode && barcodeSize ? createBarcodePngDataUrl(barcode, barcodeSize) : null;

        if (dataUrl) {
          acc[String(item.orderItemId)] = dataUrl;
        }

        return acc;
      },
      {}
    );

    setFulfillmentItemBarcodeImageMap(itemBarcodeImages);
  }, [fulfillmentPreviewOrder]);

  const handlePrintFulfillmentSlip = useCallback(async () => {
    const slipElement = document.getElementById('fulfillment-slip-print');
    if (!slipElement) {
      showToast('Packing slip preview is not ready yet', 'error');
      return;
    }

    setIsPrintingFulfillmentSlip(true);

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || !iframe.contentWindow) {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        throw new Error('Unable to open print document');
      }

      const copiedHeadMarkup = Array.from(
        document.head.querySelectorAll('link[rel="stylesheet"], style')
      )
        .map(node => node.outerHTML)
        .join('\n');

      doc.open();
      doc.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Fulfillment Packing Slip</title>
            ${copiedHeadMarkup}
            <style>
              @page { size: A4 landscape; margin: 10mm; }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body {
                overflow: hidden !important;
              }
              #fulfillment-slip-actions,
              .print-hide {
                display: none !important;
              }
              #fulfillment-slip-print {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                background: white !important;
              }
              #fulfillment-slip-print,
              #fulfillment-slip-print * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              #fulfillment-slip-print svg[role="img"] {
                max-width: none !important;
                flex: none !important;
                width: auto !important;
                height: auto !important;
              }
            </style>
          </head>
          <body>
            ${slipElement.outerHTML}
          </body>
        </html>
      `);
      doc.close();

      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      };
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to print packing slip', 'error');
    } finally {
      setIsPrintingFulfillmentSlip(false);
    }
  }, [showToast]);

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
      const currentUserId = useAuthStore.getState().user.userId;

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
      const isAlreadyClaimed = order.pickerId === currentUserId;
      const isAlreadyInProgress = order.status === OrderStatus.PICKING;

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
      order.pickerId !== currentUser.userId &&
      (userRole === 'ADMIN' || userRole === 'SUPERVISOR');

    // View mode uses WebSocket events (pick:updated / pick:completed) already
    // subscribed via usePickUpdates above — no polling needed.
  }, [order, currentUser, userRole]);

  // Get current pick task
  const currentTask = order?.items?.[currentTaskIndex];

  // Calculate progress
  const totalTasks = order?.items?.length || 0;
  const completedTasks =
    order?.items?.filter(item => item.pickedQuantity >= item.quantity || item.status === 'SKIPPED')
      .length || 0;

  // Reset scan error when current task changes
  useEffect(() => {
    setScanError(null);
  }, [currentTaskIndex]);

  // Restore the last focused task when possible, otherwise move to the first incomplete item.
  useEffect(() => {
    if (order?.items && order.items.length > 0) {
      let nextIndex = order.items.findIndex(
        item => item.status !== 'SKIPPED' && item.pickedQuantity < item.quantity
      );

      if (pickingTaskStorageKey) {
        const storedIndex = Number(sessionStorage.getItem(pickingTaskStorageKey));
        if (
          Number.isInteger(storedIndex) &&
          storedIndex >= 0 &&
          storedIndex < order.items.length &&
          order.items[storedIndex].status !== 'SKIPPED' &&
          order.items[storedIndex].pickedQuantity < order.items[storedIndex].quantity
        ) {
          nextIndex = storedIndex;
        }
      }

      const currentItem = order.items[currentTaskIndex];
      const isCurrentItemSelectable =
        currentItem &&
        currentItem.status !== 'SKIPPED' &&
        currentItem.pickedQuantity < currentItem.quantity;

      if (!isCurrentItemSelectable && nextIndex !== -1 && nextIndex !== currentTaskIndex) {
        setSelectedTaskIndex(nextIndex);
      }
    }
  }, [currentTaskIndex, order, setSelectedTaskIndex]);

  useEffect(() => {
    if (pickingTaskStorageKey) {
      sessionStorage.setItem(pickingTaskStorageKey, String(currentTaskIndex));
    }
  }, [currentTaskIndex, pickingTaskStorageKey]);

  useEffect(() => {
    if (!showOverrideModal) {
      return;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [showOverrideModal]);

  // ==========================================================================
  // ANY-ORDER SCANNING LOGIC
  // ==========================================================================

  /**
   * Find an item matching the scanned barcode/SKU that is not yet fully picked
   * This allows scanning items in any order
   */
  const findMatchingItem = (scannedValue: string): { item: any; index: number } | null => {
    if (!order.items) return null;

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
      if (order.items) {
        for (const item of order.items) {
          const matchesBarcode = item.barcode && scanValueTrimmed === item.barcode;
          const matchesSku = scanValueTrimmed === item.sku;
          if (matchesBarcode || matchesSku) {
            if (item.status === 'SKIPPED') {
              setScanError(
                `Item was skipped: ${getOrderItemDisplayName(item)}. Revert the skip to pick it.`
              );
            } else if (item.pickedQuantity >= item.quantity) {
              setScanError(`Item already fully picked: ${getOrderItemDisplayName(item)}`);
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
      setScanError(`Item already fully picked: ${getOrderItemDisplayName(matchedItem)}`);
      showToast('Item already fully picked', 'warning');
      return;
    }

    // Switch to the matched item's task if different from current
    if (matchedIndex !== currentTaskIndex) {
      setSelectedTaskIndex(matchedIndex);
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

      showToast(`${getOrderItemDisplayName(matchedItem)} picked!`, 'success');

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
    const skippedItems = order.items.filter(item => item.status === 'SKIPPED');

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
      hasAutoOpenedFulfillmentRef.current = false;
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

  const handleFulfillmentDone = useCallback(async () => {
    const completionOrderId = fulfillmentPreviewOrder?.orderId || orderId;
    if (!completionOrderId) {
      navigate(pickingQueuePath);
      return;
    }

    const currentFulfillmentStatus = fulfillmentPreviewOrder?.status || order?.status;

    try {
      let effectiveStatus = currentFulfillmentStatus;

      if (currentFulfillmentStatus === OrderStatus.PICKED) {
        try {
          await claimForPackingMutation.mutateAsync({
            orderId: completionOrderId,
            packerId: currentUser.userId,
          });
          effectiveStatus = OrderStatus.PACKING;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
          const isAlreadyAdvancedConflict =
            errorMessage.includes('409') ||
            errorMessage.includes('conflict') ||
            errorMessage.includes('already claimed') ||
            errorMessage.includes('already assigned') ||
            errorMessage.includes('packing');

          if (!isAlreadyAdvancedConflict) {
            throw error;
          }

          effectiveStatus = OrderStatus.PACKING;
        }
      }

      if (effectiveStatus === OrderStatus.PICKED || effectiveStatus === OrderStatus.PACKING) {
        await completePackingMutation.mutateAsync({
          orderId: completionOrderId,
          dto: {
            orderId: completionOrderId,
            packerId: currentUser.userId,
          },
        });
      }

      if (fulfillmentPreviewStorageKey) {
        sessionStorage.removeItem(fulfillmentPreviewStorageKey);
      }

      setFulfillmentPreviewOrder(null);
      showToast('Order packed!', 'success');
      navigate(pickingQueuePath);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to complete packing', 'error');
    }
  }, [
    claimForPackingMutation,
    completePackingMutation,
    currentUser.userId,
    fulfillmentPreviewOrder,
    fulfillmentPreviewStorageKey,
    navigate,
    order?.status,
    orderId,
    pickingQueuePath,
    showToast,
  ]);

  const handleUnskipItem = async (index: number) => {
    const item = order.items[index];
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
        setSelectedTaskIndex(index);
        setScanValue('');
        setScanError(null);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to revert skip', 'error');
    }
  };

  const handleUndoPick = async (index: number) => {
    const item = order.items[index];
    if (!item) return;

    // Can only undo if there's something picked
    if (item.pickedQuantity <= 0) return;

    // Open the undo-pick modal instead of using prompt
    setUndoPickItemIndex(index);
    setShowUndoPickModal(true);
  };

  const handleConfirmUndoPick = async (reason: string, notes: string) => {
    const item = undoPickItemIndex !== null && order.items ? order.items[undoPickItemIndex] : null;
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
        setSelectedTaskIndex(undoPickItemIndex);
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
    const item = order.items[index];
    if (!item) return;

    setSkipItemIndex(index);
    setSkipReason('');
    setSkipQuantity(item.quantity);
    setShowSkipModal(true);
  };

  const handleConfirmSkip = async () => {
    if (skipItemIndex === null || !order.items[skipItemIndex]) return;

    const item = order.items[skipItemIndex];
    setIsSkipping(true);

    try {
      await logExceptionMutation.mutateAsync({
        orderId: orderId!,
        orderItemId: item.orderItemId,
        sku: item.sku,
        type: ExceptionType.SHORT_PICK_BACKORDER,
        quantityExpected: item.quantity,
        quantityActual: item.quantity - skipQuantity,
        reason: skipReason || 'No reason provided',
      });

      await apiClient.post(`/orders/${orderId}/skip-item`, {
        pickTaskId: item.orderItemId,
        reason: skipReason || 'No reason provided',
        skipQuantity,
      });

      showToast('Item skipped and logged for backorder!', 'warning');
      setShowSkipModal(false);
      setSkipItemIndex(null);
      setSkipReason('');
      setSkipQuantity(1);

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
    const item = order.items[index];
    if (!item) return;

    setOverrideItemIndex(index);
    setOverrideQuantity(String(item.pickedQuantity));
    setOverrideReason('');
    setOverrideNotes('');
    setShowOverrideModal(true);
  };

  const handleConfirmOverride = async () => {
    if (overrideItemIndex === null || !order.items[overrideItemIndex]) return;

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
        setSelectedTaskIndex(currentTaskIndex + 1);
        setScanValue('');
        setScanError(null);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to log exception', 'error');
    }
  };

  const isOrderComplete = completedTasks === totalTasks && totalTasks > 0;
  const currentTaskPrimaryName =
    currentTask?.itemName ||
    currentTask?.item_name ||
    currentTask?.name ||
    currentTask?.sku ||
    'Item';
  const currentTaskDescriptionRaw =
    currentTask?.description ||
    currentTask?.itemDescription ||
    currentTask?.item_description ||
    null;
  const currentTaskDescription =
    currentTaskDescriptionRaw &&
    currentTaskDescriptionRaw !== currentTaskPrimaryName &&
    currentTaskDescriptionRaw !== currentTask?.sku
      ? currentTaskDescriptionRaw
      : null;
  const currentTaskImage =
    currentTask?.image ||
    (currentTask?.sku ? activeOrderItemImageMap[currentTask.sku] : null) ||
    null;

  // Determine if user is viewing in "view-only mode"
  // This is true when:
  // 1. Admin viewing another picker's active order
  // 2. Admin viewing completed (PICKED/SHIPPED) orders
  const isViewMode =
    order &&
    (userRole === 'ADMIN' || userRole === 'SUPERVISOR') &&
    ((order.pickerId && order.pickerId !== currentUser.userId) ||
      order.status === 'PICKED' ||
      order.status === 'SHIPPED');

  useEffect(() => {
    if (!order || !isOrderComplete || fulfillmentPreviewOrder || completeMutation.isPending) {
      if (!isOrderComplete) {
        hasAutoOpenedFulfillmentRef.current = false;
      }
      return;
    }

    if (isViewMode || order.status !== OrderStatus.PICKING) {
      return;
    }

    if (hasAutoOpenedFulfillmentRef.current) {
      return;
    }

    hasAutoOpenedFulfillmentRef.current = true;
    void handleCompleteOrder();
  }, [
    completeMutation.isPending,
    fulfillmentPreviewOrder,
    handleCompleteOrder,
    isOrderComplete,
    isViewMode,
    order,
  ]);

  if (!orderId) {
    return <div>No order ID provided</div>;
  }

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
                claimMutation.mutate(orderId);
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

  // Calculate progress percentage for ring
  const progressPercent = order.progress || 0;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  if (fulfillmentPreviewOrder) {
    const previewAddressLines = formatAddressLines(fulfillmentPreviewOrder.shippingAddress);
    const billToLines = previewAddressLines;
    const orderDate = fulfillmentPreviewOrder.netsuiteOrderDate
      ? new Date(fulfillmentPreviewOrder.netsuiteOrderDate).toLocaleDateString('en-NZ')
      : new Date().toLocaleDateString('en-NZ');
    const shippingMethodLabel = formatNetSuiteDisplayText(
      fulfillmentPreviewOrder.shippingMethod || fulfillmentPreviewOrder.carrier || 'Not specified'
    );
    const accountNumberDetails = extractNetSuiteAccountNumber(
      fulfillmentPreviewOrder.customerName,
      fulfillmentPreviewOrder.customerId
    );
    const salesOrderBarcode = buildCode39Barcode(
      fulfillmentPreviewOrder.netsuiteSoTranId || fulfillmentPreviewOrder.orderId
    );
    const salesOrderBarcodeSize = salesOrderBarcode
      ? renderBarcodeDimensions(salesOrderBarcode.totalWidth, 38, 0.33, 12.5)
      : null;
    const pickedByLabel =
      fulfillmentPreviewOrder.pickerName ||
      (fulfillmentPreviewOrder.pickerId === currentUser.userId ? currentUser.name : null) ||
      currentUser.name ||
      fulfillmentPreviewOrder.pickerId ||
      'Unknown';
    const allFulfillmentItems = fulfillmentPreviewOrder.items || [];
    const slipPages = chunkFulfillmentSlipItems(allFulfillmentItems, 2, 4);
    const totalSlipPages = slipPages.length;

    return (
      <div className="min-h-screen">
        <style>{`
          .fulfillment-slip-page {
            background: white;
            margin-bottom: 1.5rem;
            box-shadow: 0 25px 50px -12px rgba(15, 76, 129, 0.12);
            border-radius: 16px;
            overflow: hidden;
          }

          .fulfillment-slip-page:last-child {
            margin-bottom: 0;
          }

          .opsui-gradient-header {
            background: linear-gradient(135deg, #16324f 0%, #0f4c81 50%, #0b3b63 100%);
          }

          .opsui-accent-bar {
            background: linear-gradient(90deg, #3b82a6 0%, #0f4c81 25%, #16324f 50%, #0f4c81 75%, #3b82a6 100%);
          }

          .opsui-badge {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 1px solid #cbd5e1;
          }

          .opsui-section-card {
            background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
            border: 1px solid #dbe5ef;
            border-radius: 12px;
          }

          .opsui-table-header {
            background: linear-gradient(135deg, #16324f 0%, #0f4c81 100%);
          }

          @media print {
            @page { size: A4 landscape; margin: 10mm; }
            html, body {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .fulfillment-slip-page {
              margin-bottom: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              break-after: page;
              page-break-after: always;
            }

            .fulfillment-slip-page:last-child {
              break-after: auto;
              page-break-after: auto;
            }

            .opsui-gradient-header,
            .opsui-accent-bar,
            .opsui-table-header {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

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
              <div id="fulfillment-slip-print" className="bg-white text-slate-900">
                <section className="fulfillment-slip-page">
                  {/* Header Section */}
                  <div className="relative">
                    {/* Professional blue accent stripe */}
                    <div className="opsui-accent-bar h-2" />

                    <div className="px-8 py-6">
                      <div className="flex items-start justify-between gap-8">
                        {/* Logo & Company */}
                        <div className="flex items-start gap-5">
                          <img
                            src={fulfillmentSlipLogoUrl}
                            alt="Arrowhead Alarm Products"
                            className="w-36 h-auto"
                          />
                          <div className="pt-1 text-sm leading-relaxed">
                            <p className="font-bold text-gray-900 print:text-black">
                              Arrowhead Alarm Products
                            </p>
                            <p className="text-gray-600 print:text-black">1A Emirali Road</p>
                            <p className="text-gray-600 print:text-black">
                              Silverdale 0932, Auckland
                            </p>
                            <p className="text-gray-600 print:text-black">New Zealand</p>
                          </div>
                        </div>

                        {/* Document Title */}
                        <div className="ml-auto min-w-[20rem] max-w-[24rem]">
                          <div className="flex items-start justify-between gap-6">
                            <div className="text-center">
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-sky-900 text-xs font-bold uppercase tracking-wider print:bg-slate-50 print:text-sky-950">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-800 print:bg-sky-900" />
                                Fulfillment Document
                              </div>
                              <h1 className="mt-2 text-4xl font-black tracking-tight bg-gradient-to-r from-sky-950 via-slate-700 to-sky-900 bg-clip-text text-transparent print:text-sky-950">
                                Packing Slip
                              </h1>
                              <div className="mt-3 flex justify-center">
                                <div className="opsui-badge inline-flex items-center gap-2 rounded-full px-4 py-2 print:bg-slate-50 print:border-slate-300">
                                  <CalendarDaysIcon className="h-4 w-4 text-sky-800 print:text-sky-900" />
                                  <span className="text-sm font-semibold text-sky-950 print:text-sky-950">
                                    {orderDate}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider print:bg-slate-50 print:text-slate-700">
                                {`Page 1 of ${totalSlipPages}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Info Grid */}
                  <div className="px-8 py-5 border-b border-slate-200 print:bg-white">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white rounded-lg p-3 border border-slate-200 print:border-gray-400">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 print:text-black">
                          Sales Order
                        </p>
                        <p className="font-mono font-semibold text-slate-900 print:text-black">
                          {fulfillmentPreviewOrder.netsuiteSoTranId ||
                            fulfillmentPreviewOrder.orderId}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200 print:border-gray-400">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 print:text-black">
                          Fulfillment #
                        </p>
                        <p className="font-mono font-semibold text-slate-900 print:text-black">
                          {fulfillmentPreviewOrder.netsuiteIfTranId ||
                            fulfillmentPreviewOrder.netsuiteSoTranId ||
                            fulfillmentPreviewOrder.orderId}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200 print:border-gray-400">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 print:text-black">
                          Customer PO
                        </p>
                        <p className="font-mono font-semibold text-slate-900 print:text-black">
                          {fulfillmentPreviewOrder.customerPoNumber || '—'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200 print:border-gray-400">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 print:text-black">
                          Account #
                        </p>
                        <p className="font-mono font-semibold text-slate-900 print:text-black">
                          {accountNumberDetails.accountNumber}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500 print:text-black">
                          {accountNumberDetails.caption}
                        </p>
                      </div>
                    </div>
                  </div>

                  {salesOrderBarcode && (
                    <div className="px-8 py-5 border-b border-slate-200 print:bg-white">
                      <div className="flex justify-center">
                        <div className="rounded-lg border border-slate-200 bg-white px-5 py-3 print:border-gray-400">
                          {salesOrderBarcodeImage ? (
                            <img
                              src={salesOrderBarcodeImage}
                              alt={`Barcode ${salesOrderBarcode.displayValue}`}
                              className="block"
                              style={{
                                width: salesOrderBarcodeSize?.widthMm,
                                height: salesOrderBarcodeSize?.heightMm,
                              }}
                            />
                          ) : (
                            <svg
                              aria-label={`Barcode ${salesOrderBarcode.displayValue}`}
                              className="block"
                              width={salesOrderBarcodeSize?.widthMm}
                              height={salesOrderBarcodeSize?.heightMm}
                              style={{
                                width: salesOrderBarcodeSize?.widthMm,
                                height: salesOrderBarcodeSize?.heightMm,
                              }}
                              viewBox={`0 0 ${salesOrderBarcode.totalWidth} 38`}
                              preserveAspectRatio="xMidYMid meet"
                              role="img"
                              shapeRendering="crispEdges"
                            >
                              {(() => {
                                let currentX = salesOrderBarcode.quietZone;

                                return salesOrderBarcode.segments.map((segment, index) => {
                                  const rect = segment.isBar ? (
                                    <rect
                                      key={`barcode-${index}`}
                                      x={currentX}
                                      y={0}
                                      width={segment.width}
                                      height={38}
                                      fill="#111827"
                                    />
                                  ) : null;

                                  currentX += segment.width;
                                  return rect;
                                });
                              })()}
                            </svg>
                          )}
                          <p className="mt-1 text-center font-mono text-lg font-semibold tracking-tight text-slate-900 print:text-black">
                            {salesOrderBarcode.displayValue}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Addresses Section */}
                  <div className="px-8 py-6">
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Ship To */}
                      <div className="relative">
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-600 to-slate-500 rounded-full print:bg-gray-500" />
                        <div className="flex items-center gap-2 mb-3">
                          <TruckIcon className="h-5 w-5 text-slate-600 print:text-gray-600" />
                          <h2 className="text-lg font-bold text-slate-900 print:text-black">
                            Ship To
                          </h2>
                        </div>
                        <div className="space-y-1 text-sm pl-1">
                          {previewAddressLines.length > 0 ? (
                            previewAddressLines.map((line, i) => (
                              <p key={`ship-${i}`} className="text-gray-800 print:text-black">
                                {line.label ? (
                                  <>
                                    <span className="font-medium text-gray-600 print:text-black">
                                      {line.label}:
                                    </span>{' '}
                                    {line.value}
                                  </>
                                ) : (
                                  line.value
                                )}
                              </p>
                            ))
                          ) : (
                            <p className="text-gray-600 italic print:text-black">
                              No shipping details available
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bill To */}
                      <div className="relative">
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-slate-500 to-slate-400 rounded-full print:bg-gray-400" />
                        <div className="flex items-center gap-2 mb-3">
                          <DocumentChartBarIcon className="h-5 w-5 text-slate-500 print:text-gray-600" />
                          <h2 className="text-lg font-bold text-slate-900 print:text-black">
                            Bill To
                          </h2>
                        </div>
                        <div className="space-y-1 text-sm pl-1">
                          {billToLines.length > 0 ? (
                            billToLines.map((line, i) => (
                              <p key={`bill-${i}`} className="text-gray-800 print:text-black">
                                {line.label ? (
                                  <>
                                    <span className="font-medium text-gray-600 print:text-black">
                                      {line.label}:
                                    </span>{' '}
                                    {line.value}
                                  </>
                                ) : (
                                  line.value
                                )}
                              </p>
                            ))
                          ) : (
                            <p className="text-gray-600 italic print:text-black">
                              Same as shipping address
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Shipping Method Badge */}
                    <div className="mt-6 flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 print:text-black">
                        Shipping Method
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold fulfillment-slip-print-color"
                        style={{ backgroundColor: '#e5e7eb', color: '#1f2937' }}
                      >
                        <TruckIcon className="h-3.5 w-3.5" />
                        {shippingMethodLabel}
                      </span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="px-8 pb-6">
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:rounded-none print:border-gray-400">
                      {/* Table Header */}
                      <div
                        className="fulfillment-slip-print-color"
                        style={{ backgroundColor: fulfillmentSlipHeaderColor }}
                      >
                        <div
                          className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider"
                          style={{ color: '#ffffff' }}
                        >
                          <span className="col-span-4">Item / SKU</span>
                          <span className="col-span-5">Description</span>
                          <span className="col-span-1 text-center">Ord</span>
                          <span className="col-span-1 text-center">B/O</span>
                          <span className="col-span-1 text-center">Shipped</span>
                        </div>
                      </div>

                      {/* Table Body */}
                      <div className="divide-y divide-slate-200 print:divide-gray-300">
                        {slipPages[0].map((item: any, idx: number) => {
                          const itemImage = item.image || fulfillmentItemImageMap[item.sku] || null;

                          return (
                            <div
                              key={item.orderItemId}
                              className={`grid grid-cols-12 gap-2 px-4 py-4 text-sm ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                              } print:bg-white`}
                            >
                              <div className="col-span-4 flex items-start gap-3">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 print:border-gray-400 print:bg-white">
                                  {itemImage ? (
                                    <img
                                      src={itemImage}
                                      alt={item.name || item.sku}
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-400 print:text-gray-500">
                                      No Image
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-mono font-bold text-slate-900 print:text-black">
                                    {item.sku}
                                  </p>
                                  <p className="mt-0.5 text-xs text-slate-600 print:text-black">
                                    Bin: {formatBinLocation(item.binLocation)}
                                  </p>
                                </div>
                              </div>
                              <div className="col-span-5">
                                <p className="text-slate-800 font-medium print:text-black">
                                  {getOrderItemDisplayName(item)}
                                </p>
                                {getOrderItemDescription(item) && (
                                  <p className="mt-1 text-xs leading-relaxed text-slate-600 print:text-black">
                                    {getOrderItemDescription(item)}
                                  </p>
                                )}
                                {item.barcode && (
                                  <div className="mt-2 inline-flex flex-col rounded border border-slate-200 bg-white px-2 py-1 print:border-gray-400">
                                    {(() => {
                                      const itemBarcode = buildCode39Barcode(item.barcode);
                                      const itemBarcodeSize = itemBarcode
                                        ? renderBarcodeDimensions(
                                            itemBarcode.totalWidth,
                                            32,
                                            0.22,
                                            7.5
                                          )
                                        : null;
                                      const itemBarcodeImage =
                                        fulfillmentItemBarcodeImageMap[String(item.orderItemId)] ||
                                        null;
                                      if (!itemBarcode) {
                                        return (
                                          <p className="font-mono text-xs text-slate-600 print:text-black">
                                            Barcode: {item.barcode}
                                          </p>
                                        );
                                      }

                                      return (
                                        <>
                                          {itemBarcodeImage && itemBarcodeSize ? (
                                            <img
                                              src={itemBarcodeImage}
                                              alt={`Item barcode ${itemBarcode.displayValue}`}
                                              className="block"
                                              style={{
                                                width: itemBarcodeSize.widthMm,
                                                height: itemBarcodeSize.heightMm,
                                              }}
                                            />
                                          ) : (
                                            <svg
                                              aria-label={`Item barcode ${itemBarcode.displayValue}`}
                                              className="block"
                                              width={itemBarcodeSize?.widthMm}
                                              height={itemBarcodeSize?.heightMm}
                                              style={{
                                                width: itemBarcodeSize?.widthMm,
                                                height: itemBarcodeSize?.heightMm,
                                              }}
                                              viewBox={`0 0 ${itemBarcode.totalWidth} 32`}
                                              preserveAspectRatio="xMidYMid meet"
                                              role="img"
                                              shapeRendering="crispEdges"
                                            >
                                              {(() => {
                                                let currentX = itemBarcode.quietZone;

                                                return itemBarcode.segments.map(
                                                  (segment, index) => {
                                                    const rect = segment.isBar ? (
                                                      <rect
                                                        key={`item-barcode-${item.orderItemId}-${index}`}
                                                        x={currentX}
                                                        y={0}
                                                        width={segment.width}
                                                        height={32}
                                                        fill="#111827"
                                                      />
                                                    ) : null;

                                                    currentX += segment.width;
                                                    return rect;
                                                  }
                                                );
                                              })()}
                                            </svg>
                                          )}
                                          <p className="mt-1 text-center font-mono text-[10px] text-slate-600 print:text-black">
                                            {itemBarcode.displayValue}
                                          </p>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                              <div className="col-span-1 text-center font-semibold text-slate-800 print:text-black">
                                {item.quantity}
                              </div>
                              <div className="col-span-1 text-center text-slate-600 print:text-black">
                                {Math.max(0, item.quantity - (item.pickedQuantity || 0))}
                              </div>
                              <div className="col-span-1 text-center">
                                <span
                                  className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-md font-bold fulfillment-slip-print-color"
                                  style={{ backgroundColor: '#d1d5db', color: '#111827' }}
                                >
                                  {item.pickedQuantity}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {totalSlipPages === 1 && (
                        <div className="border-t border-slate-200 px-4 py-3 print:border-gray-400">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-slate-800 print:text-black">
                              <ClipboardDocumentListIcon className="h-4 w-4" />
                              <span>Total Items:</span>
                              <span className="font-bold text-slate-900 print:text-black">
                                {allFulfillmentItems.reduce(
                                  (sum: number, item: any) => sum + item.pickedQuantity,
                                  0
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-800 print:text-black">
                              <span>SKUs:</span>
                              <span className="font-bold text-slate-900 print:text-black">
                                {allFulfillmentItems.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Footer Section */}
                {totalSlipPages === 1 && (
                  <div className="px-8 py-6 border-t-2 border-slate-200 print:border-gray-400">
                    <div className="flex items-end justify-between">
                      {/* Picked By */}
                      <div className="text-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 print:text-black">
                          Picked By
                        </p>
                        <p className="font-semibold text-slate-900 print:text-black">
                          {pickedByLabel}
                        </p>
                        <p className="text-slate-700 text-xs mt-1 print:text-black">
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
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 print:text-black">
                            Packed By
                          </p>
                          <div className="w-36 border-b-2 border-slate-400 h-8 print:border-gray-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Footer */}
                {totalSlipPages === 1 && (
                  <div className="px-8 py-4 border-t border-slate-200 print:border-gray-400">
                    <p className="text-center text-xs text-slate-600 print:text-black">
                      This document was generated electronically from OpsUI Warehouse Management
                      System
                    </p>
                  </div>
                )}

                {slipPages.slice(1).map((pageItems: any[], continuationIndex: number) => {
                  const pageNumber = continuationIndex + 2;
                  const isLastPage = pageNumber === totalSlipPages;

                  return (
                    <section
                      key={`continuation-page-${pageNumber}`}
                      className="fulfillment-slip-page"
                    >
                      <div className="relative border-b-2 border-slate-200">
                        <div
                          className="h-2 fulfillment-slip-print-color"
                          style={{
                            background: `linear-gradient(to right, ${fulfillmentSlipAccentColor}, ${fulfillmentSlipHeaderColor}, ${fulfillmentSlipAccentColor})`,
                          }}
                        />

                        <div className="px-8 py-6">
                          <div className="flex items-start justify-between gap-8">
                            <div className="flex items-start gap-5">
                              <img
                                src={fulfillmentSlipLogoUrl}
                                alt="Arrowhead Alarm Products"
                                className="w-36 h-auto"
                              />
                              <div className="pt-1 text-sm leading-relaxed">
                                <p className="font-semibold text-gray-900 print:text-black">
                                  Arrowhead Alarm Products
                                </p>
                                <p className="text-gray-800 print:text-black">1A Emirali Road</p>
                                <p className="text-gray-800 print:text-black">
                                  Silverdale 0932, Auckland
                                </p>
                                <p className="text-gray-800 print:text-black">New Zealand</p>
                              </div>
                            </div>

                            <div className="ml-auto min-w-[20rem] max-w-[24rem]">
                              <div className="flex items-start justify-between gap-6">
                                <div className="text-center">
                                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-900 print:text-sky-950">
                                    Fulfillment Document
                                  </p>
                                  <h1 className="mt-1 text-4xl font-black tracking-tight text-sky-950 print:text-sky-950">
                                    Packing Slip
                                  </h1>
                                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 print:text-slate-700">
                                    Continued
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 print:text-black">
                                    {`Page ${pageNumber} of ${totalSlipPages}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-8 py-6">
                        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:rounded-none print:border-gray-400">
                          <div
                            className="fulfillment-slip-print-color"
                            style={{ backgroundColor: fulfillmentSlipHeaderColor }}
                          >
                            <div
                              className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider"
                              style={{ color: '#ffffff' }}
                            >
                              <span className="col-span-4">Item / SKU</span>
                              <span className="col-span-5">Description</span>
                              <span className="col-span-1 text-center">Ord</span>
                              <span className="col-span-1 text-center">B/O</span>
                              <span className="col-span-1 text-center">Shipped</span>
                            </div>
                          </div>

                          <div className="divide-y divide-slate-200 print:divide-gray-300">
                            {pageItems.map((item: any, idx: number) => {
                              const itemImage =
                                item.image || fulfillmentItemImageMap[item.sku] || null;

                              return (
                                <div
                                  key={`${item.orderItemId}-continuation-${pageNumber}`}
                                  className={`grid grid-cols-12 gap-2 px-4 py-4 text-sm ${
                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                                  } print:bg-white`}
                                >
                                  <div className="col-span-4 flex items-start gap-3">
                                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 print:border-gray-400 print:bg-white">
                                      {itemImage ? (
                                        <img
                                          src={itemImage}
                                          alt={item.name || item.sku}
                                          className="h-full w-full object-contain"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-400 print:text-gray-500">
                                          No Image
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-mono font-bold text-slate-900 print:text-black">
                                        {item.sku}
                                      </p>
                                      <p className="mt-0.5 text-xs text-slate-600 print:text-black">
                                        Bin: {formatBinLocation(item.binLocation)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="col-span-5">
                                    <p className="text-slate-800 font-medium print:text-black">
                                      {getOrderItemDisplayName(item)}
                                    </p>
                                    {getOrderItemDescription(item) && (
                                      <p className="mt-1 text-xs leading-relaxed text-slate-600 print:text-black">
                                        {getOrderItemDescription(item)}
                                      </p>
                                    )}
                                    {item.barcode && (
                                      <div className="mt-2 inline-flex flex-col rounded border border-slate-200 bg-white px-2 py-1 print:border-gray-400">
                                        {(() => {
                                          const itemBarcode = buildCode39Barcode(item.barcode);
                                          const itemBarcodeSize = itemBarcode
                                            ? renderBarcodeDimensions(
                                                itemBarcode.totalWidth,
                                                32,
                                                0.22,
                                                7.5
                                              )
                                            : null;
                                          const itemBarcodeImage =
                                            fulfillmentItemBarcodeImageMap[
                                              String(item.orderItemId)
                                            ] || null;
                                          if (!itemBarcode) {
                                            return (
                                              <p className="font-mono text-xs text-slate-600 print:text-black">
                                                Barcode: {item.barcode}
                                              </p>
                                            );
                                          }

                                          return (
                                            <>
                                              {itemBarcodeImage && itemBarcodeSize ? (
                                                <img
                                                  src={itemBarcodeImage}
                                                  alt={`Item barcode ${itemBarcode.displayValue}`}
                                                  className="block"
                                                  style={{
                                                    width: itemBarcodeSize.widthMm,
                                                    height: itemBarcodeSize.heightMm,
                                                  }}
                                                />
                                              ) : (
                                                <svg
                                                  aria-label={`Item barcode ${itemBarcode.displayValue}`}
                                                  className="block"
                                                  width={itemBarcodeSize?.widthMm}
                                                  height={itemBarcodeSize?.heightMm}
                                                  style={{
                                                    width: itemBarcodeSize?.widthMm,
                                                    height: itemBarcodeSize?.heightMm,
                                                  }}
                                                  viewBox={`0 0 ${itemBarcode.totalWidth} 32`}
                                                  preserveAspectRatio="xMidYMid meet"
                                                  role="img"
                                                  shapeRendering="crispEdges"
                                                >
                                                  {(() => {
                                                    let currentX = itemBarcode.quietZone;

                                                    return itemBarcode.segments.map(
                                                      (segment, index) => {
                                                        const rect = segment.isBar ? (
                                                          <rect
                                                            key={`continued-item-barcode-${item.orderItemId}-${pageNumber}-${index}`}
                                                            x={currentX}
                                                            y={0}
                                                            width={segment.width}
                                                            height={32}
                                                            fill="#111827"
                                                          />
                                                        ) : null;

                                                        currentX += segment.width;
                                                        return rect;
                                                      }
                                                    );
                                                  })()}
                                                </svg>
                                              )}
                                              <p className="mt-1 text-center font-mono text-[10px] text-slate-600 print:text-black">
                                                {itemBarcode.displayValue}
                                              </p>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="col-span-1 text-center font-semibold text-slate-800 print:text-black">
                                    {item.quantity}
                                  </div>
                                  <div className="col-span-1 text-center text-slate-600 print:text-black">
                                    {Math.max(0, item.quantity - (item.pickedQuantity || 0))}
                                  </div>
                                  <div className="col-span-1 text-center">
                                    <span
                                      className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-md font-bold fulfillment-slip-print-color"
                                      style={{ backgroundColor: '#d1d5db', color: '#111827' }}
                                    >
                                      {item.pickedQuantity}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {isLastPage && (
                            <div className="border-t border-slate-200 px-4 py-3 print:border-gray-400">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-slate-800 print:text-black">
                                  <ClipboardDocumentListIcon className="h-4 w-4" />
                                  <span>Total Items:</span>
                                  <span className="font-bold text-slate-900 print:text-black">
                                    {allFulfillmentItems.reduce(
                                      (sum: number, item: any) => sum + item.pickedQuantity,
                                      0
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-800 print:text-black">
                                  <span>SKUs:</span>
                                  <span className="font-bold text-slate-900 print:text-black">
                                    {allFulfillmentItems.length}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {isLastPage && (
                        <>
                          <div className="px-8 py-6 border-t-2 border-slate-200 print:border-gray-400">
                            <div className="flex items-end justify-between">
                              <div className="text-sm">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 print:text-black">
                                  Picked By
                                </p>
                                <p className="font-semibold text-slate-900 print:text-black">
                                  {pickedByLabel}
                                </p>
                                <p className="text-slate-700 text-xs mt-1 print:text-black">
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

                              <div className="flex gap-12">
                                <div className="text-center">
                                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 print:text-black">
                                    Packed By
                                  </p>
                                  <div className="w-36 border-b-2 border-slate-400 h-8 print:border-gray-500" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="px-8 py-4 border-t border-slate-200 print:border-gray-400">
                            <p className="text-center text-xs text-slate-600 print:text-black">
                              This document was generated electronically from OpsUI Warehouse
                              Management System
                            </p>
                          </div>
                        </>
                      )}
                    </section>
                  );
                })}
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
                <Button
                  variant="success"
                  onClick={handleFulfillmentDone}
                  isLoading={claimForPackingMutation.isPending || completePackingMutation.isPending}
                >
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
                    <div className="w-full rounded-xl border border-success-500/30 bg-success-500/10 px-4 py-3 text-center">
                      <p className="picking-subtitle text-success-700 dark:text-success-300 text-sm">
                        Preparing packing slip...
                      </p>
                    </div>
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
                      Handing this order straight to the packing slip.
                    </p>
                    <div className="inline-flex items-center gap-3 rounded-xl border border-success-500/30 bg-success-500/10 px-5 py-3 animate-pop-in">
                      <div className="h-5 w-5 rounded-full border-2 border-success-400 border-t-transparent animate-spin" />
                      <span className="picking-subtitle text-success-700 dark:text-success-300">
                        Preparing packing slip...
                      </span>
                    </div>
                  </div>
                </div>
              ) : currentTask ? (
                /* Current Task Card */
                <div
                  className={`picking-card rounded-2xl border-primary-500/50 border-2 industrial-corners ${scanSuccess ? 'item-flash' : ''}`}
                >
                  <div className="p-6 border-b picking-divider border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
                          {currentTaskImage ? (
                            <img
                              src={currentTaskImage}
                              alt={currentTaskPrimaryName}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-gray-500">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="picking-subtitle text-primary-600 dark:text-primary-400 text-xs uppercase tracking-wider mb-1">
                            Current Pick Task
                          </p>
                          <h2 className="picking-title text-xl text-gray-900 dark:text-white">
                            {currentTaskPrimaryName}
                          </h2>
                          {currentTaskDescription && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              {currentTaskDescription}
                            </p>
                          )}
                        </div>
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
                          {formatInventoryQuantity(currentTask.onHandQuantity)}
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
                        {formatInventoryQuantity(currentTask.onHandQuantity)}
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
                        Items in Order ({order.items.length || 0})
                      </p>
                      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                        {order.items.map((item, index) => {
                          const isCompleted = item.pickedQuantity >= item.quantity;
                          const isSkipped = item.status === 'SKIPPED';
                          const isCurrent = index === currentTaskIndex;
                          const itemImage = item.image || activeOrderItemImageMap[item.sku] || null;

                          return (
                            <div
                              key={item.orderItemId}
                              onClick={() => {
                                // Allow clicking on any incomplete/non-skipped item to select it
                                if (!isCompleted && !isSkipped && !isViewMode) {
                                  setSelectedTaskIndex(index);
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
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04]">
                                  {itemImage ? (
                                    <img
                                      src={itemImage}
                                      alt={getOrderItemDisplayName(item)}
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-gray-500">
                                      No Image
                                    </div>
                                  )}
                                </div>
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
                                    {getOrderItemDisplayName(item)}
                                  </p>
                                  {getOrderItemDescription(item) && (
                                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {getOrderItemDescription(item)}
                                    </p>
                                  )}
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
              itemName={getOrderItemDisplayName(order.items[undoPickItemIndex])}
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
                      {getOrderItemDisplayName(item)} ({item.sku}) -{' '}
                      {item.skipReason || 'No reason provided'}
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
            message={`Do you want to revert the skip for ${getOrderItemDisplayName(unskipConfirm.item)} (${unskipConfirm.item?.sku})?`}
            confirmText="Revert"
            cancelText="Cancel"
            variant="success"
          />

          {/* Skip Item Modal */}
          {showSkipModal && skipItemIndex !== null && order.items[skipItemIndex] && (
            <div className="fixed inset-0 scanner-modal-overlay flex items-center justify-center z-50 p-4">
              <div className="scanner-modal-content max-w-md w-full rounded-2xl">
                <div className="bg-gradient-to-r from-warning-500 to-warning-600 text-white px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <h2 className="picking-title text-lg">Skip Item</h2>
                    <button
                      onClick={() => { setShowSkipModal(false); setSkipQuantity(1); }}
                      className="text-white hover:text-warning-200 transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.08]">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04]">
                        {order.items[skipItemIndex].image ||
                        activeOrderItemImageMap[order.items[skipItemIndex].sku] ? (
                          <img
                            src={
                              order.items[skipItemIndex].image ||
                              activeOrderItemImageMap[order.items[skipItemIndex].sku]
                            }
                            alt={getOrderItemDisplayName(order.items[skipItemIndex])}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-gray-500">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="picking-title text-white">
                          {getOrderItemDisplayName(order.items[skipItemIndex])}
                        </p>
                        {getOrderItemDescription(order.items[skipItemIndex]) && (
                          <p className="text-sm text-gray-300 mt-1">
                            {getOrderItemDescription(order.items[skipItemIndex])}
                          </p>
                        )}
                        <p className="text-sm text-gray-400 font-mono mt-1">
                          {order.items[skipItemIndex].sku}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Qty: {order.items[skipItemIndex].quantity} | Bin:{' '}
                          {order.items[skipItemIndex].binLocation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quantity to skip */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Quantity to skip (backorder)
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSkipQuantity(q => Math.max(1, q - 1))}
                        className="h-9 w-9 rounded-lg bg-white/[0.08] border border-white/[0.12] text-white flex items-center justify-center hover:bg-white/[0.15] transition-colors"
                      >
                        −
                      </button>
                      <span className="text-white font-bold text-lg w-12 text-center">{skipQuantity}</span>
                      <button
                        onClick={() => setSkipQuantity(q => Math.min(order.items[skipItemIndex].quantity, q + 1))}
                        className="h-9 w-9 rounded-lg bg-white/[0.08] border border-white/[0.12] text-white flex items-center justify-center hover:bg-white/[0.15] transition-colors"
                      >
                        +
                      </button>
                      <span className="text-sm text-gray-400">of {order.items[skipItemIndex].quantity} units</span>
                    </div>
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
                  <Button variant="ghost" onClick={() => { setShowSkipModal(false); setSkipQuantity(1); }}>
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
          {showOverrideModal && overrideItemIndex !== null && order.items[overrideItemIndex] && (
            <div className="fixed inset-0 scanner-modal-overlay flex items-center justify-center z-[120] p-3 sm:p-6 lg:p-8">
              <div className="scanner-modal-content relative z-[121] w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
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

                <div className="p-6 space-y-4 lg:grid lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:gap-6 lg:space-y-0">
                  <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.08]">
                    <div className="flex items-start gap-4">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04]">
                        {order.items[overrideItemIndex].image ||
                        activeOrderItemImageMap[order.items[overrideItemIndex].sku] ? (
                          <img
                            src={
                              order.items[overrideItemIndex].image ||
                              activeOrderItemImageMap[order.items[overrideItemIndex].sku]
                            }
                            alt={getOrderItemDisplayName(order.items[overrideItemIndex])}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-gray-500">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="picking-title text-white">
                          {getOrderItemDisplayName(order.items[overrideItemIndex])}
                        </p>
                        {getOrderItemDescription(order.items[overrideItemIndex]) && (
                          <p className="text-sm text-gray-300 mt-1">
                            {getOrderItemDescription(order.items[overrideItemIndex])}
                          </p>
                        )}
                        <p className="text-sm text-gray-400 font-mono mt-1">
                          {order.items[overrideItemIndex].sku}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Required: {order.items[overrideItemIndex].quantity} | Currently Picked:{' '}
                          {order.items[overrideItemIndex].pickedQuantity}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
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
                        rows={3}
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
                        rows={5}
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
