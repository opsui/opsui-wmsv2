/**
 * Packing page
 *
 * Main packing interface for verifying and packing orders
 *
 * Design: Scanner-First Industrial Aesthetic (Matches PickingPage)
 * - Bold typography with Archivo display font
 * - Technical monospace for codes/locations
 * - Industrial corner accents and beacon effects
 * - Distinctive visual hierarchy
 */

import {
  Breadcrumb,
  Button,
  ConfirmDialog,
  Header,
  ScanInput,
  TaskStatusBadge,
  UnclaimModal,
  useToast,
} from '@/components/shared';
import { PageViews, usePageTracking } from '@/hooks/usePageTracking';
import { apiClient } from '@/lib/api-client';
import { formatBinLocation } from '@/lib/utils';
import {
  nzcApi,
  skuApi,
  useCompletePacking,
  useLogException,
  useOrder,
  useShipOrder,
} from '@/services/api';
import { useAuthStore } from '@/stores';
import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  PrinterIcon,
  ForwardIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { Address, Carrier, ExceptionType, NZCQuote, OrderStatus } from '@opsui/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

// ============================================================================
// COMPONENT
// ============================================================================

type NzcPackagePreset = {
  id: string;
  label: string;
  packageStockId?: number;
  name?: string;
  type?: string;
  kg?: number;
  cubicM3?: number;
  length?: number;
  width?: number;
  height?: number;
};

type NzcStockSize = {
  PackageStockId?: number;
  Name?: string;
  Height?: number;
  Length?: number;
  Width?: number;
  Cubic?: number;
  Weight?: number;
  Type?: string;
  Availability?: string;
};

type NzcPackageRow = {
  rowId: string;
  presetId: string;
  units: string;
  customLength: string;
  customWidth: string;
  customHeight: string;
  customWeightLbs: string;
};

type NzcRenderedLabel = {
  connote: string;
  data: string;
  contentType: string;
};

const NZC_DEFAULT_PRESET_ID = 'CUSTOM';

const NZC_CARRIER_FALLBACK: Carrier = {
  carrierId: 'CARR-NZC',
  name: 'NZ Couriers',
  carrierCode: 'NZC',
  serviceTypes: ['Courier', 'CourierPost', 'Overnight', 'Rural'],
  isActive: true,
  requiresAccountNumber: false,
  requiresPackageDimensions: false,
  requiresWeight: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const NZC_PACKAGE_PRESETS: NzcPackagePreset[] = [
  { id: NZC_DEFAULT_PRESET_ID, label: '-- Custom --' },
  { id: '25KG_0015M3', label: '25KG/0.015M3', kg: 25, cubicM3: 0.015 },
  { id: '25KG_002M3', label: '25KG/0.02M3', kg: 25, cubicM3: 0.02 },
  { id: '25KG_003M3', label: '25KG/0.03M3', kg: 25, cubicM3: 0.03 },
  { id: '25KG_004M3', label: '25KG/0.04M3', kg: 25, cubicM3: 0.04 },
  { id: '25KG_005M3', label: '25KG/0.05M3', kg: 25, cubicM3: 0.05 },
  { id: '25KG_006M3', label: '25KG/0.06M3', kg: 25, cubicM3: 0.06 },
  { id: '25KG_0075M3', label: '25KG/0.075M3', kg: 25, cubicM3: 0.075 },
  { id: '25KG_009M3', label: '25KG/0.09M3', kg: 25, cubicM3: 0.09 },
  { id: '25KG_01M3', label: '25KG/0.1M3', kg: 25, cubicM3: 0.1 },
  { id: 'NZC_DP_RIGID_CARD_A4', label: 'NZC DP Rigid Card A4+' },
  { id: 'NZC_E11_DLE_PLASTIC', label: 'NZC E11 DLE Plastic' },
  { id: 'NZC_E20_A5', label: 'NZC E20 A5' },
  { id: 'NZC_E25B', label: 'NZC E25B' },
  { id: 'NZC_E40_A4', label: 'NZC E40 A4' },
  { id: 'NZC_E50_FOOLSCAP', label: 'NZC E50 Foolscap' },
  { id: 'NZC_E60_A3', label: 'NZC E60 A3' },
  { id: 'NZC_ENVIRO360_E360', label: 'NZC Enviro360 (E360)' },
  { id: 'NZC_PP_PLASTIC_A3', label: 'NZC PP Plastic A3+' },
];

const createNzcPackageRow = (presetId: string = NZC_DEFAULT_PRESET_ID): NzcPackageRow => ({
  rowId: `nzc-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  presetId,
  units: '1',
  customLength: '',
  customWidth: '',
  customHeight: '',
  customWeightLbs: '',
});

const PACKING_THEME_STYLE_ID = 'packing-live-theme-styles';

const packingThemeStyles = `
  html.light .packing-live-page .picking-card {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.98) 100%);
    border-color: rgba(148, 163, 184, 0.24);
    box-shadow: 0 18px 40px rgba(148, 163, 184, 0.18);
  }

  html.light .packing-live-page .packing-divider {
    border-color: rgba(148, 163, 184, 0.3) !important;
  }

  html.light .packing-live-page .packing-surface-panel {
    background: rgba(248, 250, 252, 0.88);
    border-color: rgba(148, 163, 184, 0.24);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
  }

  html.light .packing-live-page .barcode-display {
    background: rgba(248, 250, 252, 0.96);
    border-color: rgba(168, 85, 247, 0.24);
  }

  html.light .packing-live-page .barcode-display::before {
    background: rgba(168, 85, 247, 0.45);
  }

  html.light .packing-live-page .pick-item-card {
    background: rgba(248, 250, 252, 0.96);
    border-color: rgba(148, 163, 184, 0.18);
  }

  html.light .packing-live-page .pick-item-card:hover {
    background: rgba(241, 245, 249, 0.98);
    border-color: rgba(168, 85, 247, 0.25);
  }

  html.light .packing-live-page .pick-item-card.active {
    background: rgba(168, 85, 247, 0.08);
    border-color: rgba(168, 85, 247, 0.3);
    box-shadow: 0 0 18px rgba(168, 85, 247, 0.08);
  }

  html.light .packing-live-page .scanner-modal-content {
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border-color: rgba(168, 85, 247, 0.22);
    box-shadow: 0 25px 50px rgba(148, 163, 184, 0.25), 0 0 80px rgba(168, 85, 247, 0.08);
  }

  html.light .packing-live-page .picking-card .picking-title,
  html.light .packing-live-page .scanner-modal-content .picking-title {
    color: #0f172a !important;
  }

  html.light .packing-live-page .picking-card .picking-subtitle:not(.text-primary-300):not(.text-primary-400):not(.text-primary-600):not(.text-primary-700):not(.text-warning-300):not(.text-warning-400):not(.text-warning-700):not(.text-success-300):not(.text-success-400):not(.text-success-700):not(.text-error-300):not(.text-error-400):not(.text-error-700),
  html.light .packing-live-page .packing-surface-panel .picking-subtitle:not(.text-primary-300):not(.text-primary-400):not(.text-primary-600):not(.text-primary-700):not(.text-warning-300):not(.text-warning-400):not(.text-warning-700):not(.text-success-300):not(.text-success-400):not(.text-success-700):not(.text-error-300):not(.text-error-400):not(.text-error-700),
  html.light .packing-live-page .scanner-modal-content .picking-subtitle:not(.text-primary-300):not(.text-primary-400):not(.text-primary-600):not(.text-primary-700):not(.text-warning-300):not(.text-warning-400):not(.text-warning-700):not(.text-success-300):not(.text-success-400):not(.text-success-700):not(.text-error-300):not(.text-error-400):not(.text-error-700) {
    color: #64748b !important;
  }

  html.light .packing-live-page .hero-number,
  html.light .packing-live-page .quantity-display {
    background: linear-gradient(180deg, #0f172a 0%, #475569 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: none;
  }
`;

const packingSurfacePanelClass =
  'packing-surface-panel rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-4';
const packingSurfacePanelSpacedClass = `${packingSurfacePanelClass} space-y-4`;
const packingInputClass =
  'packing-input w-full rounded-xl px-4 py-3 bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50';
const packingSelectClass = `${packingInputClass} [&_option]:bg-white dark:[&_option]:bg-gray-900 [&_option]:text-gray-900 dark:[&_option]:text-white`;
const packingReadonlyInputClass =
  'packing-input w-full rounded-xl px-4 py-3 bg-gray-100 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.08] text-gray-600 dark:text-gray-300 focus:outline-none disabled:opacity-70';

const SKU_LOOKUP_PATTERN = /^[A-Z0-9-]{2,50}$/;

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

type PersistedPackingShippingState = {
  orderId: string;
  showShippingForm: boolean;
  shipmentCreated: boolean;
  nzcLabels: NzcRenderedLabel[];
  nzcConnotes: string[];
  selectedCarrierId: string;
};

export function PackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const returnToFromSearch = new URLSearchParams(location.search).get('returnTo');
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
  const [scanSuccess, setScanSuccess] = useState(false);
  const [activeOrderItemImageMap, setActiveOrderItemImageMap] = useState<Record<string, string>>(
    {}
  );

  // Skip modal state
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipItemIndex, setSkipItemIndex] = useState<number | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [skipQuantity, setSkipQuantity] = useState(1);
  const [isSkipping, setIsSkipping] = useState(false);

  // Manual override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideItemIndex, setOverrideItemIndex] = useState<number | null>(null);
  const [overrideQuantity, setOverrideQuantity] = useState<string>('0');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

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
  const [nzcLabels, setNzcLabels] = useState<NzcRenderedLabel[]>([]);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [nzcRateError, setNzcRateError] = useState<string | null>(null);
  const [shipmentCreated, setShipmentCreated] = useState(false);
  const [isFinalizingShipment, setIsFinalizingShipment] = useState(false);
  const [nzcConnotes, setNzcConnotes] = useState<string[]>([]);
  const [nzcPackageRows, setNzcPackageRows] = useState<NzcPackageRow[]>([createNzcPackageRow()]);
  const [selectedNzcPackagePreset, setSelectedNzcPackagePreset] =
    useState<string>(NZC_DEFAULT_PRESET_ID);
  const [nzcCustomLength, setNzcCustomLength] = useState('');
  const [nzcCustomWidth, setNzcCustomWidth] = useState('');
  const [nzcCustomHeight, setNzcCustomHeight] = useState('');
  const [reprintingConnotes, setReprintingConnotes] = useState<Record<string, boolean>>({});
  const [manualAddressEditEnabled, setManualAddressEditEnabled] = useState(false);
  const [confirmManualAddressEdit, setConfirmManualAddressEdit] = useState(false);
  const packingShippingStateStorageKey = orderId ? `packing-shipping-state:${orderId}` : null;
  const hasHydratedPackingShippingStateRef = useRef(false);
  const restoredShippingStageRef = useRef(false);
  const hydratedShipmentPreviewKeyRef = useRef<string | null>(null);
  const packingQueuePath =
    typeof location.state?.returnTo === 'string' && location.state.returnTo.length > 0
      ? location.state.returnTo
      : typeof returnToFromSearch === 'string' && returnToFromSearch.length > 0
        ? returnToFromSearch
        : '/packing?status=PACKING';

  // Helper to convert lbs to kg for NZC API
  const lbsToKg = (lbs: number): number => Math.round(lbs * 0.453592 * 100) / 100;
  const kgToLbs = (kg: number): number => Math.round((kg / 0.453592) * 100) / 100;
  const normalizeShipToAddress = (rawAddress: any, fallbackName: string): Address => ({
    name: rawAddress?.name || fallbackName || 'Customer',
    company: rawAddress?.company || undefined,
    addressLine1: rawAddress?.addressLine1 || rawAddress?.street1 || '',
    addressLine2: rawAddress?.addressLine2 || rawAddress?.street2 || '',
    city: rawAddress?.city || '',
    state: rawAddress?.state || '',
    postalCode: rawAddress?.postalCode || rawAddress?.zip || '',
    country:
      rawAddress?.country === '_newZealand'
        ? 'NZ'
        : rawAddress?.country?.id === '_newZealand'
          ? 'NZ'
          : rawAddress?.country?.refName || rawAddress?.country || 'NZ',
    phone: rawAddress?.phone || undefined,
    email: rawAddress?.email || undefined,
  });

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
  const logExceptionMutation = useLogException();
  const shipOrderMutation = useShipOrder();
  const baseShipToAddress = normalizeShipToAddress(
    order?.shippingAddress,
    order?.customerName || 'Customer'
  );
  const [editableShipToAddress, setEditableShipToAddress] = useState<Address>(baseShipToAddress);
  const trackingDefault = [order?.netsuiteSoTranId || order?.orderId, order?.customerPoNumber]
    .filter(Boolean)
    .join(', ');
  const carrierList: Carrier[] = Array.isArray(carriers) ? carriers : [];
  const carriersWithFallback = carrierList.some(
    (carrier: Carrier) => carrier.carrierCode === NZC_CARRIER_FALLBACK.carrierCode
  )
    ? carrierList
    : [...carrierList, NZC_CARRIER_FALLBACK];
  const hasRealNzcCarrier = carrierList.some(
    (carrier: Carrier) => carrier.carrierCode === NZC_CARRIER_FALLBACK.carrierCode
  );
  const selectedCarrier = carriersWithFallback.find(
    (carrier: Carrier) => carrier.carrierId === selectedCarrierId
  );
  const isNZCCarrier = selectedCarrier?.carrierCode === 'NZC';

  const { data: nzcStockSizes = [] } = useQuery({
    queryKey: ['nzc', 'stock-sizes'],
    queryFn: () => nzcApi.getStockSizes(),
    staleTime: 5 * 60 * 1000,
    enabled: isNZCCarrier,
    retry: false,
  });
  const nzcStockSizeList: NzcStockSize[] = Array.isArray(nzcStockSizes) ? nzcStockSizes : [];

  const nzcPackageOptions = nzcStockSizeList.length
    ? [
        NZC_PACKAGE_PRESETS[0],
        ...nzcStockSizeList.map((stock: NzcStockSize) => ({
          id: String(stock.PackageStockId || stock.Name || 'UNKNOWN'),
          label: stock.Name || 'NZC Stock',
          packageStockId: stock.PackageStockId,
          name: stock.Name,
          type: stock.Type,
          kg: stock.Weight,
          cubicM3: stock.Cubic,
          length: stock.Length,
          width: stock.Width,
          height: stock.Height,
        })),
      ]
    : NZC_PACKAGE_PRESETS;
  const selectedNzcPreset = nzcPackageOptions.find(
    preset => preset.id === selectedNzcPackagePreset
  );
  const selectedNzcPackageIsCustom = selectedNzcPackagePreset === NZC_DEFAULT_PRESET_ID;

  useEffect(() => {
    setNzcPackageRows(rows => {
      if (rows.length === 0) {
        return [createNzcPackageRow(selectedNzcPackagePreset)];
      }

      const firstRow = rows[0];
      const nextUnits = totalPackages || '1';
      const nextWeightLbs = totalWeight || '';
      const nextRow: NzcPackageRow = {
        ...firstRow,
        presetId: selectedNzcPackagePreset,
        units: nextUnits,
        customLength: selectedNzcPackageIsCustom ? nzcCustomLength : firstRow.customLength,
        customWidth: selectedNzcPackageIsCustom ? nzcCustomWidth : firstRow.customWidth,
        customHeight: selectedNzcPackageIsCustom ? nzcCustomHeight : firstRow.customHeight,
        customWeightLbs: selectedNzcPackageIsCustom ? nextWeightLbs : firstRow.customWeightLbs,
      };

      const didChange =
        firstRow.presetId !== nextRow.presetId ||
        firstRow.units !== nextRow.units ||
        firstRow.customLength !== nextRow.customLength ||
        firstRow.customWidth !== nextRow.customWidth ||
        firstRow.customHeight !== nextRow.customHeight ||
        firstRow.customWeightLbs !== nextRow.customWeightLbs;

      if (!didChange) {
        return rows;
      }

      return [nextRow, ...rows.slice(1)];
    });
  }, [
    nzcCustomHeight,
    nzcCustomLength,
    nzcCustomWidth,
    selectedNzcPackageIsCustom,
    selectedNzcPackagePreset,
    totalPackages,
    totalWeight,
  ]);

  useEffect(() => {
    if (!document.getElementById(PACKING_THEME_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = PACKING_THEME_STYLE_ID;
      style.textContent = packingThemeStyles;
      document.head.appendChild(style);
    }
  }, []);

  // Ref to track if we've already attempted to claim this order
  const hasClaimedRef = useRef(false);
  const isClaimingRef = useRef(false);
  const packingSessionActiveRef = useRef(false);

  const getNzcPresetById = (presetId: string) =>
    nzcPackageOptions.find(preset => preset.id === presetId);
  const isCustomNzcPreset = (presetId: string) => presetId === NZC_DEFAULT_PRESET_ID;
  const buildNzcPackages = () =>
    nzcPackageRows.map(row => {
      const preset = getNzcPresetById(row.presetId);
      const isCustom = isCustomNzcPreset(row.presetId);

      return {
        packageStockId: preset?.packageStockId,
        name: preset?.name,
        type: preset?.type,
        length: isCustom ? parseFloat(row.customLength || '0') || 10 : preset?.length,
        width: isCustom ? parseFloat(row.customWidth || '0') || 10 : preset?.width,
        height: isCustom ? parseFloat(row.customHeight || '0') || 10 : preset?.height,
        weight: preset?.kg || lbsToKg(parseFloat(row.customWeightLbs || '0')),
        units: Math.max(1, parseInt(row.units || '1', 10) || 1),
      };
    });
  const builtNzcPackages = buildNzcPackages();
  const builtNzcPackagesKey = JSON.stringify(builtNzcPackages);
  const derivedNzcTotalPackages = builtNzcPackages.reduce(
    (sum, pkg) => sum + Math.max(1, Number(pkg.units || 1)),
    0
  );
  const derivedNzcTotalWeightKg = builtNzcPackages.reduce(
    (sum, pkg) => sum + (Number(pkg.weight) || 0) * Math.max(1, Number(pkg.units || 1)),
    0
  );
  const derivedNzcTotalWeightLbs = Math.round(kgToLbs(derivedNzcTotalWeightKg) * 100) / 100;
  const nzcRateList = Array.isArray(nzcRates) ? nzcRates : [];
  const nzcLabel = nzcLabels[0] || null;
  const nzcConnote = nzcConnotes[0] || '';
  const getQuotePrice = (quote: NZCQuote) => {
    const rawQuote = quote as NZCQuote & { charge?: number; cost?: number };
    const value = Number(rawQuote.TotalPrice ?? rawQuote.charge ?? rawQuote.cost ?? 0);
    return Number.isFinite(value) ? value : 0;
  };
  const getQuoteZones = (quote: NZCQuote) => {
    if (quote.IsRuralDelivery) return ['Rural'];
    const zones = ['Urban'];
    if (quote.IsResidentialDelivery) zones.push('Residential');
    return zones;
  };

  const getNzcLabelSource = (label: { data: string; contentType: string }) => {
    const normalizedContentType = (label.contentType || '').toLowerCase();

    if (normalizedContentType.includes('pdf') || label.data.startsWith('JVBERi0')) {
      return {
        src: `data:application/pdf;base64,${label.data}`,
        isPdf: true,
      };
    }

    return {
      src: `data:image/png;base64,${label.data}`,
      isPdf: false,
    };
  };

  const printNZCLabel = (label: { data: string; contentType: string }) => {
    const labelSource = getNzcLabelSource(label);
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
    if (!printWindow) {
      showToast('Popup blocked. Use Print Label to print manually.', 'warning');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>NZC Shipping Label</title>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            img, iframe {
              display: block;
              width: 100%;
              height: auto;
              border: 0;
            }
          </style>
        </head>
        <body>
          ${
            labelSource.isPdf
              ? `<iframe src="${labelSource.src}" title="NZC Shipping Label" style="height:100vh;"></iframe>`
              : `<img src="${labelSource.src}" alt="NZC Shipping Label" />`
          }
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 400);
              }, 150);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const updateNzcPackageRow = (rowId: string, updates: Partial<NzcPackageRow>) => {
    setNzcPackageRows(rows =>
      rows.map(row => {
        if (row.rowId !== rowId) return row;

        const nextRow = { ...row, ...updates };
        const nextPresetId = updates.presetId ?? row.presetId;
        const preset = getNzcPresetById(nextPresetId);

        if (preset && !isCustomNzcPreset(nextPresetId)) {
          if (preset.length != null) nextRow.customLength = String(preset.length);
          if (preset.width != null) nextRow.customWidth = String(preset.width);
          if (preset.height != null) nextRow.customHeight = String(preset.height);
          if (preset.kg != null) nextRow.customWeightLbs = String(kgToLbs(preset.kg));
        }

        return nextRow;
      })
    );
  };

  const addNzcPackageRow = () => {
    const defaultPreset =
      nzcPackageOptions.find(preset => preset.id !== NZC_DEFAULT_PRESET_ID)?.id ||
      NZC_DEFAULT_PRESET_ID;
    setNzcPackageRows(rows => [...rows, createNzcPackageRow(defaultPreset)]);
  };

  const removeNzcPackageRow = (rowId: string) => {
    setNzcPackageRows(rows => (rows.length > 1 ? rows.filter(row => row.rowId !== rowId) : rows));
  };

  // Claim order for packing mutation
  const claimMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const currentUserId = useAuthStore.getState().user?.userId;

      try {
        const response = await apiClient.post(`/orders/${orderId}/claim-for-packing`, {
          packer_id: currentUserId,
        });
        return response.data;
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || error?.message || '';
        const isAlreadyPackingRace =
          typeof errorMessage === 'string' && errorMessage.includes('current status: PACKING');

        if (!isAlreadyPackingRace || !currentUserId) {
          throw error;
        }

        const latestOrderResponse = await apiClient.get(`/orders/${orderId}`);
        const latestOrder = latestOrderResponse.data;

        if (
          latestOrder?.status === OrderStatus.PACKING &&
          latestOrder?.packerId === currentUserId
        ) {
          console.log('[PackingPage] Claim race resolved - order already packed by current user', {
            orderId,
            packerId: currentUserId,
          });
          return latestOrder;
        }

        throw error;
      }
    },
    onSuccess: data => {
      console.log('[PackingPage] Order claimed for packing:', data);
      hasClaimedRef.current = true;
      packingSessionActiveRef.current = true;
      isClaimingRef.current = false;
      setClaimError(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
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
    packingSessionActiveRef.current = false;
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

      // Only PACKING means an active packing session already exists.
      const isAlreadyClaimed = order?.status === 'PACKING' && order?.packerId === currentUserId;
      const isReadyForPacking = order?.status === 'PACKING';

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
        if (!order.packerId || order.packerId === currentUserId) {
          packingSessionActiveRef.current = true;
        }
      } else if (order.status === 'PICKED') {
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

    const intervalId = setInterval(() => {
      if (!document.hidden) refetch();
    }, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [order, currentUser, userRole, refetch]);

  // Get current item to verify
  const currentItem = order?.items?.[currentItemIndex];
  const currentItemDisplayName = getOrderItemDisplayName(currentItem);
  const currentItemDescription = getOrderItemDescription(currentItem);
  const currentItemImage =
    currentItem?.image ||
    (currentItem?.sku ? activeOrderItemImageMap[String(currentItem.sku)] : null) ||
    null;

  // Calculate progress
  const totalItems = order?.items?.length || 0;
  const completedItems =
    order?.items?.filter(item => (item.verifiedQuantity || 0) >= item.quantity) || [];
  const allVerified = completedItems.length === totalItems && totalItems > 0;
  const verifiedCount = completedItems.length;
  const hasCompletedShippingSession =
    shipmentCreated || nzcLabels.length > 0 || nzcConnotes.length > 0;
  const shouldShowShippingStage =
    showShippingForm || hasCompletedShippingSession || restoredShippingStageRef.current;
  const areRatesLocked = nzcConnotes.length > 0 || nzcLabels.length > 0 || shipmentCreated;

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
      return;
    }

    const shouldHoldShippingForm =
      restoredShippingStageRef.current ||
      hasCompletedShippingSession ||
      (packingSessionActiveRef.current &&
        !!order &&
        [OrderStatus.PICKED, OrderStatus.PACKING, OrderStatus.PACKED, OrderStatus.SHIPPED].includes(
          order.status
        ));

    if (!allVerified && showShippingForm && !shouldHoldShippingForm) {
      setShowShippingForm(false);
    }
  }, [allVerified, hasCompletedShippingSession, order, showShippingForm]);

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

  // Fetch NZC rates when NZC carrier is selected
  useEffect(() => {
    const fetchNZCRates = async () => {
      if (!isNZCCarrier || builtNzcPackages.length === 0) {
        setNzcRates([]);
        setSelectedQuote(null);
        setNzcRateError(null);
        return;
      }

      setIsFetchingRates(true);
      setNzcRateError(null);
      try {
        const response = await nzcApi.getRates({
          destination: {
            name: editableShipToAddress.name,
            company: editableShipToAddress.company,
            addressLine1: [editableShipToAddress.addressLine1, editableShipToAddress.addressLine2]
              .filter(Boolean)
              .join(', '),
            city: editableShipToAddress.city,
            state: editableShipToAddress.state,
            postalCode: editableShipToAddress.postalCode,
            country: editableShipToAddress.country,
            phone: editableShipToAddress.phone,
            email: editableShipToAddress.email,
          },
          packages: builtNzcPackages,
        });

        if (response.Quotes && response.Quotes.length > 0) {
          setNzcRates(response.Quotes);
          const matchedQuote =
            response.Quotes.find(quote => quote.Service === serviceType) || response.Quotes[0];
          setSelectedQuote(matchedQuote);
        } else {
          setNzcRates([]);
          setSelectedQuote(null);
          if (response.Rejected && response.Rejected.length > 0) {
            const rejectionMessage = response.Rejected.map(r => r.Reason).join(', ');
            setNzcRateError(rejectionMessage);
            showToast(`NZC rejected: ${rejectionMessage}`, 'error');
          } else {
            setNzcRateError('No shipping quotes were returned for the current address/package.');
          }
        }
      } catch (error: any) {
        console.error('Error fetching NZC rates:', error);
        setNzcRates([]);
        setSelectedQuote(null);
        setNzcRateError(
          error?.response?.data?.error || error?.message || 'Failed to fetch NZC rates'
        );
      } finally {
        setIsFetchingRates(false);
      }
    };

    const timeoutId = setTimeout(fetchNZCRates, 500);
    return () => clearTimeout(timeoutId);
  }, [builtNzcPackagesKey, editableShipToAddress, isNZCCarrier, serviceType]);

  useEffect(() => {
    if (!trackingNumber.trim() && trackingDefault) {
      setTrackingNumber(trackingDefault);
    }
  }, [trackingDefault, trackingNumber]);

  useEffect(() => {
    if (selectedCarrierId) {
      return;
    }

    const preferredCarrier =
      carrierList.find((carrier: Carrier) => carrier.isActive && carrier.carrierCode !== 'NZC') ||
      carrierList.find((carrier: Carrier) => carrier.isActive) ||
      null;

    if (preferredCarrier) {
      setSelectedCarrierId(preferredCarrier.carrierId);
      return;
    }

    if (hasRealNzcCarrier) {
      const nzcCarrier = carrierList.find(
        (carrier: Carrier) => carrier.carrierCode === NZC_CARRIER_FALLBACK.carrierCode
      );

      if (nzcCarrier) {
        setSelectedCarrierId(nzcCarrier.carrierId);
      }
    }
  }, [selectedCarrierId, carrierList, hasRealNzcCarrier]);

  useEffect(() => {
    const firstRealOptionId =
      nzcPackageOptions.find(preset => preset.id !== NZC_DEFAULT_PRESET_ID)?.id ||
      nzcPackageOptions[0]?.id;
    if (!firstRealOptionId) {
      return;
    }

    const hasSelectedOption = nzcPackageOptions.some(
      preset => preset.id === selectedNzcPackagePreset
    );
    if (hasSelectedOption && selectedNzcPackagePreset === firstRealOptionId) {
      return;
    }

    if (!hasSelectedOption || selectedNzcPackagePreset === NZC_DEFAULT_PRESET_ID) {
      setSelectedNzcPackagePreset(firstRealOptionId);
    }
  }, [nzcPackageOptions, selectedNzcPackagePreset]);

  useEffect(() => {
    if (!isNZCCarrier) {
      return;
    }

    const defaultPreset =
      nzcPackageOptions.find(preset => preset.id !== NZC_DEFAULT_PRESET_ID) || nzcPackageOptions[0];

    if (!defaultPreset) {
      return;
    }

    setNzcPackageRows(rows => {
      let didChange = false;

      const nextRows = rows.map(row => {
        const shouldReplace =
          row.presetId === NZC_DEFAULT_PRESET_ID ||
          !nzcPackageOptions.some(preset => preset.id === row.presetId);

        if (!shouldReplace) {
          return row;
        }

        didChange = true;
        return {
          ...row,
          presetId: defaultPreset.id,
          customLength: '',
          customWidth: '',
          customHeight: '',
          customWeightLbs: '',
        };
      });

      return didChange ? nextRows : rows;
    });
  }, [isNZCCarrier, nzcPackageOptions]);

  useEffect(() => {
    setEditableShipToAddress(baseShipToAddress);
  }, [
    baseShipToAddress.addressLine1,
    baseShipToAddress.addressLine2,
    baseShipToAddress.city,
    baseShipToAddress.state,
    baseShipToAddress.postalCode,
    baseShipToAddress.country,
    baseShipToAddress.phone,
    baseShipToAddress.email,
    baseShipToAddress.name,
    baseShipToAddress.company,
  ]);

  useEffect(() => {
    hasHydratedPackingShippingStateRef.current = false;
    restoredShippingStageRef.current = false;
    hydratedShipmentPreviewKeyRef.current = null;
    setManualAddressEditEnabled(false);
    setConfirmManualAddressEdit(false);
    setShipmentCreated(false);
    setNzcLabels([]);
    setNzcConnotes([]);
    setShowShippingForm(false);
  }, [orderId]);

  useEffect(() => {
    if (!packingShippingStateStorageKey || hasHydratedPackingShippingStateRef.current) {
      return;
    }

    hasHydratedPackingShippingStateRef.current = true;

    const savedState = sessionStorage.getItem(packingShippingStateStorageKey);
    if (!savedState) {
      return;
    }

    try {
      const parsedState = JSON.parse(savedState) as PersistedPackingShippingState;
      if (parsedState.orderId !== orderId) {
        sessionStorage.removeItem(packingShippingStateStorageKey);
        return;
      }

      restoredShippingStageRef.current = Boolean(
        parsedState.showShippingForm ||
        parsedState.shipmentCreated ||
        (Array.isArray(parsedState.nzcLabels) && parsedState.nzcLabels.length > 0) ||
        (Array.isArray(parsedState.nzcConnotes) && parsedState.nzcConnotes.length > 0)
      );
      setShowShippingForm(Boolean(parsedState.showShippingForm || parsedState.shipmentCreated));
      setShipmentCreated(Boolean(parsedState.shipmentCreated));
      setNzcLabels(Array.isArray(parsedState.nzcLabels) ? parsedState.nzcLabels : []);
      setNzcConnotes(Array.isArray(parsedState.nzcConnotes) ? parsedState.nzcConnotes : []);
      if (parsedState.selectedCarrierId) {
        setSelectedCarrierId(parsedState.selectedCarrierId);
      }
    } catch {
      restoredShippingStageRef.current = false;
      sessionStorage.removeItem(packingShippingStateStorageKey);
    }
  }, [orderId, packingShippingStateStorageKey]);

  useEffect(() => {
    if (!packingShippingStateStorageKey || !hasHydratedPackingShippingStateRef.current) {
      return;
    }

    if (
      !showShippingForm &&
      !shipmentCreated &&
      nzcLabels.length === 0 &&
      nzcConnotes.length === 0
    ) {
      sessionStorage.removeItem(packingShippingStateStorageKey);
      return;
    }

    const persistedState: PersistedPackingShippingState = {
      orderId: orderId || '',
      showShippingForm,
      shipmentCreated,
      nzcLabels,
      nzcConnotes,
      selectedCarrierId,
    };

    sessionStorage.setItem(packingShippingStateStorageKey, JSON.stringify(persistedState));
  }, [
    nzcConnotes,
    nzcLabels,
    orderId,
    packingShippingStateStorageKey,
    selectedCarrierId,
    shipmentCreated,
    showShippingForm,
  ]);

  useEffect(() => {
    const hydrateExistingNzcPreview = async () => {
      if (
        !orderId ||
        !shouldShowShippingStage ||
        nzcLabels.length > 0 ||
        order?.status !== OrderStatus.SHIPPED
      ) {
        return;
      }

      try {
        const response = await apiClient.get(`/shipping/orders/${orderId}/shipment`);
        const shipment = response.data as {
          carrierId?: string;
          serviceType?: string | null;
          trackingNumber?: string | null;
        };

        const trackingTokens = String(shipment?.trackingNumber || '')
          .split(',')
          .map((value: string) => value.trim())
          .filter(Boolean);

        if (trackingTokens.length === 0) {
          return;
        }

        const shipmentCarrier = carriersWithFallback.find(
          (carrier: Carrier) => carrier.carrierId === shipment?.carrierId
        );
        const isNzcShipment =
          shipmentCarrier?.carrierCode === 'NZC' ||
          shipment?.carrierId === NZC_CARRIER_FALLBACK.carrierId;

        if (!isNzcShipment) {
          return;
        }

        const previewKey = `${orderId}:${trackingTokens.join(',')}`;
        if (hydratedShipmentPreviewKeyRef.current === previewKey) {
          return;
        }
        hydratedShipmentPreviewKeyRef.current = previewKey;

        if (shipment?.carrierId) {
          setSelectedCarrierId(shipment.carrierId);
        }
        if (shipment?.serviceType) {
          setServiceType(shipment.serviceType);
        }

        restoredShippingStageRef.current = true;
        setShowShippingForm(true);
        setShipmentCreated(true);
        setNzcConnotes(trackingTokens);

        const labels = await Promise.all(
          trackingTokens.map(async connote => {
            const label = await nzcApi.getLabel(connote, 'LABEL_PNG_100X175');
            return {
              connote,
              data: label.data,
              contentType: label.contentType,
            };
          })
        );

        setNzcLabels(labels);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return;
        }

        hydratedShipmentPreviewKeyRef.current = null;
        console.error('Failed to rehydrate NZC label preview:', error);
      }
    };

    void hydrateExistingNzcPreview();
  }, [carriersWithFallback, nzcLabels.length, order?.status, orderId, shouldShowShippingStage]);

  if (!orderId) {
    return <div>No order ID provided</div>;
  }

  // Show claim loading state - Distinctive warehouse loading animation
  if (claimMutation.isPending) {
    return (
      <div className="packing-live-page min-h-screen flex items-center justify-center">
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
              Preparing your pack list...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show claim error
  if (claimError) {
    return (
      <div className="packing-live-page min-h-screen flex items-center justify-center p-4">
        <div className="picking-card rounded-2xl p-8 max-w-md w-full text-center industrial-corners">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-error-500/20 flex items-center justify-center">
            <ExclamationCircleIcon className="h-8 w-8 text-error-400" />
          </div>
          <h2 className="picking-title text-2xl text-white mb-3">Cannot Start Packing</h2>
          <p className="picking-subtitle text-gray-400 mb-6">{claimError}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate(packingQueuePath)}>
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
      <div className="packing-live-page min-h-screen flex items-center justify-center">
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
              Retrieving pack details...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="packing-live-page min-h-screen flex items-center justify-center p-4">
        <div className="picking-card rounded-2xl p-8 max-w-md w-full text-center industrial-corners">
          <p className="picking-subtitle text-gray-400 mb-6">Order not found</p>
          <Button onClick={() => navigate(packingQueuePath)}>Back to Queue</Button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ANY-ORDER SCANNING LOGIC
  // ==========================================================================

  /**
   * Find an item matching the scanned barcode/SKU that is not yet fully verified
   * This allows scanning items in any order
   */
  const findMatchingItem = (scannedValue: string): { item: any; index: number } | null => {
    if (!order?.items) return null;

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const isCompleted = (item.verifiedQuantity || 0) >= item.quantity;
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
    if (isVerifying) {
      console.log('[PackingPage] Scan ignored - verification in progress');
      return;
    }

    setScanError(null);
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
              setScanError(
                `Item was skipped: ${getOrderItemDisplayName(item)}. Revert the skip to verify it.`
              );
            } else if ((item.verifiedQuantity || 0) >= item.quantity) {
              setScanError(`Item already fully verified: ${getOrderItemDisplayName(item)}`);
            }
            showToast('Item already processed', 'warning');
            return;
          }
        }
      }

      setScanError(
        `Invalid scan: "${scanValueTrimmed}" does not match any unverified item in this order.`
      );
      showToast('Invalid barcode or SKU', 'error');
      return;
    }

    const { item: matchedItem, index: matchedIndex } = matchResult;

    // Check for over-scanning
    const currentVerified = matchedItem.verifiedQuantity || 0;
    if (currentVerified >= matchedItem.quantity) {
      setScanError(`Item already fully verified: ${getOrderItemDisplayName(matchedItem)}`);
      showToast('Item already fully verified', 'warning');
      return;
    }

    // Switch to the matched item's task if different from current
    if (matchedIndex !== currentItemIndex) {
      setCurrentItemIndex(matchedIndex);
    }

    // Verify packing item via API
    setIsVerifying(true);
    try {
      const verifyItem = async () =>
        apiClient.post(`/orders/${orderId}/verify-packing`, {
          order_item_id: matchedItem.orderItemId,
          quantity: 1,
        });

      try {
        await verifyItem();
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.error || error?.message || 'Failed to verify item';
        const normalizedErrorMessage =
          typeof errorMessage === 'string' ? errorMessage : String(errorMessage);
        const isNotPackingConflict = normalizedErrorMessage.includes('not in PACKING status');

        if (!isNotPackingConflict) {
          throw error;
        }

        const latestOrder = await refetch();
        const refreshedOrder = latestOrder.data;
        const latestStatus = refreshedOrder?.status;
        const refreshedMatchedItem = refreshedOrder?.items?.find(
          (item: any) => item.orderItemId === matchedItem.orderItemId
        );
        const latestVerifiedQuantity = refreshedMatchedItem?.verifiedQuantity || 0;

        if (latestVerifiedQuantity > currentVerified) {
          return;
        }

        if (latestStatus === OrderStatus.PICKED) {
          showToast('Order moved back to picked. Reclaiming packing session...', 'warning');
          await claimMutation.mutateAsync(orderId!);
          await refetch();
          await verifyItem();
        } else if (latestStatus === OrderStatus.PACKING) {
          await verifyItem();
        } else {
          throw error;
        }
      }

      // Show success feedback
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 600);

      showToast(`${matchedItem.name} verified!`, 'success');
      setScanValue('');

      // Optimistically update the cache
      const newVerified = currentVerified + 1;
      queryClient.setQueryData(['orders', orderId], (oldData: any) => {
        if (!oldData?.items) return oldData;

        const updatedItems = oldData.items.map((item: any, idx: number) =>
          idx === matchedIndex && item.orderItemId === matchedItem.orderItemId
            ? { ...item, verifiedQuantity: newVerified }
            : item
        );

        return { ...oldData, items: updatedItems };
      });

      // Check if item is now complete and move to next
      if (newVerified >= matchedItem.quantity) {
        const orderData = queryClient.getQueryData(['orders', orderId]) as any;
        if (!orderData?.items) return;

        const nextIncompleteIndex = orderData.items.findIndex(
          (item: any, idx: number) =>
            idx > matchedIndex &&
            (item.verifiedQuantity || 0) < item.quantity &&
            item.status !== 'SKIPPED'
        );

        if (nextIncompleteIndex !== -1) {
          setCurrentItemIndex(nextIncompleteIndex);
        }
      }
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Verification failed');
      showToast(error instanceof Error ? error.message : 'Failed to verify item', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // ==========================================================================
  // SKIP ITEM FUNCTIONALITY
  // ==========================================================================

  const handleSkipItem = (index: number) => {
    const item = order?.items?.[index];
    if (!item) return;

    const remaining = item.quantity - (item.verifiedQuantity || 0);
    setSkipQuantity(Math.max(1, remaining));
    setSkipItemIndex(index);
    setSkipReason('');
    setShowSkipModal(true);
  };

  const handleConfirmSkip = async () => {
    if (skipItemIndex === null || !order?.items?.[skipItemIndex]) return;

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

      await apiClient.post(`/orders/${orderId}/skip-packing-item`, {
        order_item_id: item.orderItemId,
        reason: skipReason || 'No reason provided',
        skip_quantity: skipQuantity,
      });

      showToast('Item skipped and logged for backorder!', 'warning');
      setShowShippingForm(false);
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

  const handleUnskipItem = async (index: number) => {
    const item = order?.items?.[index];
    if (!item) return;

    setUnskipConfirm({ isOpen: true, index, item });
  };

  const confirmUnskipItem = async () => {
    const { index, item } = unskipConfirm;
    if (!item) return;

    try {
      await apiClient.put(`/orders/${orderId}/pick-task/${item.orderItemId}`, {
        status: 'PENDING',
      });

      showToast('Skip reverted successfully!', 'success');
      setUnskipConfirm({ isOpen: false, index: -1, item: null });

      await refetch();

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
    if (undoLoading[index]) {
      console.log('[handleUndoVerification] Undo already in progress for item', index);
      return;
    }

    try {
      setUndoLoading(prev => ({ ...prev, [index]: true }));

      const response = await apiClient.get(`/orders/${orderId}`);
      const latestOrder = response.data;

      const item = latestOrder?.items?.[index];
      if (!item) {
        showToast('Item not found', 'error');
        return;
      }

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
        await refetch();
        return;
      }

      const reason =
        prompt(
          `Remove 1 verified item from ${getOrderItemDisplayName(item)} (${item.sku})?\n\n` +
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
        setShowShippingForm(false);
        queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
        await refetch();

        if (index < currentItemIndex) {
          setCurrentItemIndex(index);
          setScanValue('');
          setScanError(null);
        }
      } catch (error: any) {
        console.error('Undo verification error:', error);
        const errorMsg =
          error.response?.data?.error || error.message || 'Failed to undo verification';

        if (errorMsg.includes('Cannot undo more items than verified')) {
          await refetch();
          showToast('State has changed. Please try again.', 'warning');
        } else {
          showToast(errorMsg, 'error');
          await refetch();
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
    setShowShippingForm(true);
  };

  const handleReprintLabel = async (connote: string) => {
    setReprintingConnotes(current => ({ ...current, [connote]: true }));
    try {
      await nzcApi.reprintLabel(connote, 1);
      showToast(`NZC reprint requested for ${connote}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to reprint label', 'error');
    } finally {
      setReprintingConnotes(current => ({ ...current, [connote]: false }));
    }
  };

  const confirmCreateShipment = async () => {
    await handleCreateShipment(true);
  };

  const handleCreateShipment = async (skipConfirmCheck = false) => {
    if (!selectedCarrierId) {
      showToast('Please select a carrier', 'error');
      return;
    }

    if (isNZCCarrier && !selectedQuote) {
      showToast('Please select a shipping rate/quote', 'error');
      return;
    }

    if (!isNZCCarrier && !trackingNumber.trim()) {
      showToast('Please enter a tracking number', 'error');
      return;
    }

    if (
      (isNZCCarrier && derivedNzcTotalWeightLbs <= 0) ||
      (!isNZCCarrier && (!totalWeight || parseFloat(totalWeight) <= 0))
    ) {
      showToast('Please enter a valid weight', 'error');
      return;
    }

    if (
      (isNZCCarrier && derivedNzcTotalPackages <= 0) ||
      (!isNZCCarrier && (!totalPackages || parseInt(totalPackages) <= 0))
    ) {
      showToast('Please enter a valid number of packages', 'error');
      return;
    }

    if (!skipConfirmCheck) {
      const skippedItems = order?.items?.filter(item => item.status === 'SKIPPED');

      if (skippedItems && skippedItems.length > 0) {
        setCompleteShipmentConfirm({ isOpen: true, skippedItems });
        return;
      }
    }

    setIsCreatingShipment(true);
    try {
      const shipFromAddress: Address = {
        name: 'Main Warehouse',
        company: 'Your Company',
        addressLine1: '123 Warehouse St',
        city: 'Wellington',
        state: '',
        postalCode: '6011',
        country: 'NZ',
      };

      if (isNZCCarrier) {
        if (!selectedQuote) {
          showToast('Please select a shipping rate/quote', 'error');
          setIsCreatingShipment(false);
          return;
        }

        const nzcShipment = await nzcApi.createShipment({
          destination: {
            name: editableShipToAddress.name,
            company: editableShipToAddress.company,
            addressLine1: [editableShipToAddress.addressLine1, editableShipToAddress.addressLine2]
              .filter(Boolean)
              .join(', '),
            city: editableShipToAddress.city,
            state: editableShipToAddress.state,
            postalCode: editableShipToAddress.postalCode,
            country: editableShipToAddress.country,
            phone: editableShipToAddress.phone,
            email: editableShipToAddress.email,
          },
          packages: builtNzcPackages,
          quoteId: selectedQuote.QuoteId,
          senderReference: trackingNumber.trim() || undefined,
          printToPrinter: true,
        });

        const connoteList = Array.from(
          new Set(
            [
              nzcShipment.ConsignmentNo,
              ...(nzcShipment.Packages || []).map(pkg => pkg.ConsignmentNo),
            ]
              .filter(Boolean)
              .map(connote => String(connote))
          )
        );
        const primaryConnote = connoteList[0];
        const labels = await Promise.all(
          connoteList.map(async connote => {
            const label = await nzcApi.getLabel(connote, 'LABEL_PNG_100X175');
            return {
              connote,
              data: label.data,
              contentType: label.contentType,
            };
          })
        );

        if (connoteList.length > 1) {
          await Promise.all(connoteList.slice(1).map(connote => nzcApi.reprintLabel(connote, 1)));
        }

        setNzcConnotes(connoteList);
        setShipmentCreated(true);
        setNzcLabels(labels);

        showToast(
          `NZC Shipment created! ${connoteList.length > 1 ? `Connotes: ${connoteList.join(', ')}` : `Connote: ${primaryConnote}`}`,
          'success'
        );

        const shipmentResponse = await apiClient.post('/shipping/shipments', {
          orderId,
          carrierId: selectedCarrierId,
          serviceType: selectedQuote.Service,
          shippingMethod: 'STANDARD',
          shipFromAddress,
          shipToAddress: editableShipToAddress,
          totalWeight: derivedNzcTotalWeightLbs,
          totalPackages: derivedNzcTotalPackages,
          createdBy: currentUser?.userId,
        });

        const shipment = shipmentResponse.data;

        if (shipment?.shipmentId) {
          await apiClient.post(`/shipping/shipments/${shipment.shipmentId}/tracking`, {
            trackingNumber: connoteList.join(', '),
          });
        }
        showToast(
          'NZC shipment created. Press Done when you are ready to mark it as shipped.',
          'success'
        );
      } else {
        const shipmentResponse = await apiClient.post('/shipping/shipments', {
          orderId,
          carrierId: selectedCarrierId,
          serviceType,
          shippingMethod: 'STANDARD',
          shipFromAddress,
          shipToAddress: editableShipToAddress,
          totalWeight: parseFloat(totalWeight),
          totalPackages: parseInt(totalPackages),
          createdBy: currentUser?.userId,
        });

        const shipment = shipmentResponse.data;

        if (trackingNumber.trim()) {
          await apiClient.post(`/shipping/shipments/${shipment.shipmentId}/tracking`, {
            trackingNumber: trackingNumber.trim(),
          });
        }

        showToast(`Shipment created! Tracking: ${trackingNumber || 'Pending'}`, 'success');

        setShipmentCreated(true);
        showToast(
          'Shipment created. Press Done when you are ready to mark it as shipped.',
          'success'
        );
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

  const handleShippingDone = async () => {
    if (!orderId) {
      navigate(packingQueuePath);
      return;
    }

    try {
      setIsFinalizingShipment(true);

      const currentTrackingNumber =
        isNZCCarrier && nzcConnotes.length > 0 ? nzcConnotes.join(', ') : trackingNumber.trim();
      const currentCarrier = selectedCarrier?.name || selectedCarrier?.carrierCode || 'Carrier';

      if (
        order?.status === OrderStatus.PICKING ||
        order?.status === OrderStatus.PICKED ||
        order?.status === OrderStatus.PACKING
      ) {
        await completePackingMutation.mutateAsync({
          orderId,
          dto: {
            orderId,
            packerId: order.packerId || currentUser.userId,
          },
        });
      }

      if (order?.status !== OrderStatus.SHIPPED) {
        if (!currentTrackingNumber) {
          throw new Error('Tracking/connote is required before marking this order as shipped');
        }

        await shipOrderMutation.mutateAsync({
          orderId,
          carrier: currentCarrier,
          trackingNumber: currentTrackingNumber,
          packageWeight: isNZCCarrier ? derivedNzcTotalWeightLbs : parseFloat(totalWeight),
        });
      }

      restoredShippingStageRef.current = false;
      if (packingShippingStateStorageKey) {
        sessionStorage.removeItem(packingShippingStateStorageKey);
      }
      showToast('Order marked as shipped.', 'success');
      navigate(packingQueuePath);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to mark order as shipped',
        'error'
      );
    } finally {
      setIsFinalizingShipment(false);
    }
  };

  // ==========================================================================
  // MANUAL OVERRIDE FUNCTIONALITY
  // ==========================================================================

  const handleManualOverride = (index: number) => {
    const item = order?.items?.[index];
    if (!item) return;

    setOverrideItemIndex(index);
    setOverrideQuantity(String(item.verifiedQuantity || 0));
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
      packingSessionActiveRef.current = false;
      setClaimError(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
      navigate(packingQueuePath);
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

  // Calculate progress percentage for ring
  const progressPercent = Math.round((verifiedCount / totalItems) * 100) || 0;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="packing-live-page min-h-screen">
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
      <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: 'Packing Queue', path: packingQueuePath },
            { label: `Packing Order ${orderId}` },
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
                {order.status === 'PACKED' || order.status === 'SHIPPED'
                  ? 'Viewing completed order'
                  : "Viewing this packer's work in real-time"}
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
                <div className="mb-6 pb-6 border-b packing-divider border-white/[0.08]">
                  <h1 className="picking-title text-xl text-gray-900 dark:text-white truncate">
                    {order.orderId}
                  </h1>
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
                        <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#c084fc" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="hero-number text-3xl">{progressPercent}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="picking-subtitle text-gray-600 dark:text-gray-400 text-sm">
                      Verified
                    </span>
                    <span className="hero-number text-lg text-success-400">{verifiedCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="picking-subtitle text-gray-600 dark:text-gray-400 text-sm">
                      Remaining
                    </span>
                    <span className="hero-number text-lg text-warning-400">
                      {totalItems - verifiedCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="picking-subtitle text-gray-600 dark:text-gray-400 text-sm">
                      Total
                    </span>
                    <span className="hero-number text-lg text-gray-900 dark:text-white">
                      {totalItems}
                    </span>
                  </div>
                </div>

                {allVerified && !showShippingForm && (
                  <Button
                    size="lg"
                    variant="success"
                    onClick={handleCompletePacking}
                    disabled={isViewMode ? true : undefined}
                    className="w-full action-button-enhanced touch-target"
                  >
                    Enter Shipping Details
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Current Task - Right side */}
          <div className="flex-1 min-w-0">
            {shouldShowShippingStage ? (
              /* Shipping Details Form */
              <div ref={shippingFormRef}>
                <div className="picking-card rounded-2xl border-primary-500/50 border-2 industrial-corners">
                  <div className="p-6 border-b packing-divider border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="picking-subtitle text-primary-600 dark:text-primary-400 text-xs uppercase tracking-wider mb-1">
                          Shipping Details
                        </p>
                        <h2 className="picking-title text-xl text-gray-900 dark:text-white">
                          Create Shipment
                        </h2>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {order.orderId}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Carrier Selection */}
                    <div>
                      <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                        Carrier <span className="text-error-400">*</span>
                      </label>
                      <select
                        value={selectedCarrierId}
                        onChange={e => setSelectedCarrierId(e.target.value)}
                        disabled={isCreatingShipment || isViewMode}
                        className={packingSelectClass}
                      >
                        <option value="">Select a carrier...</option>
                        {carriersWithFallback.map((carrier: Carrier) => (
                          <option key={carrier.carrierId} value={carrier.carrierId}>
                            {carrier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Service Type - Only for non-NZC carriers */}
                    {!isNZCCarrier && (
                      <div>
                        <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                          Service Type <span className="text-error-400">*</span>
                        </label>
                        <select
                          value={serviceType}
                          onChange={e => setServiceType(e.target.value)}
                          disabled={isCreatingShipment || isViewMode}
                          className={packingSelectClass}
                        >
                          <option value="Ground">Ground</option>
                          <option value="Express">Express</option>
                          <option value="Priority">Priority</option>
                          <option value="Overnight">Overnight</option>
                        </select>
                      </div>
                    )}

                    {!isNZCCarrier && (
                      <div>
                        <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                          Tracking Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={e => setTrackingNumber(e.target.value)}
                          placeholder="Enter tracking number..."
                          disabled={isCreatingShipment || isViewMode}
                          className={packingInputClass}
                        />
                      </div>
                    )}

                    {/* Package Details */}
                    {isNZCCarrier ? (
                      <div className={packingSurfacePanelSpacedClass}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider">
                            NZC Package Setup
                          </p>
                          <span className="text-xs text-gray-500">
                            Matches NZ Couriers stock naming
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                              Stock / Package Type <span className="text-error-400">*</span>
                            </label>
                            <select
                              value={selectedNzcPackagePreset}
                              onChange={e => setSelectedNzcPackagePreset(e.target.value)}
                              disabled={isCreatingShipment || isViewMode}
                              className={packingSelectClass}
                            >
                              {nzcPackageOptions.map(preset => (
                                <option key={preset.id} value={preset.id}>
                                  {preset.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                              Units <span className="text-error-400">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={totalPackages}
                              onChange={e => setTotalPackages(e.target.value)}
                              disabled={isCreatingShipment || isViewMode}
                              className={packingInputClass}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                              Length (cm)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={
                                selectedNzcPackageIsCustom
                                  ? nzcCustomLength
                                  : selectedNzcPreset?.length || ''
                              }
                              onChange={e => setNzcCustomLength(e.target.value)}
                              disabled={
                                isCreatingShipment || isViewMode || !selectedNzcPackageIsCustom
                              }
                              className={packingInputClass}
                            />
                          </div>
                          <div>
                            <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                              Width (cm)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={
                                selectedNzcPackageIsCustom
                                  ? nzcCustomWidth
                                  : selectedNzcPreset?.width || ''
                              }
                              onChange={e => setNzcCustomWidth(e.target.value)}
                              disabled={
                                isCreatingShipment || isViewMode || !selectedNzcPackageIsCustom
                              }
                              className={packingInputClass}
                            />
                          </div>
                          <div>
                            <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                              Height (cm)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={
                                selectedNzcPackageIsCustom
                                  ? nzcCustomHeight
                                  : selectedNzcPreset?.height || ''
                              }
                              onChange={e => setNzcCustomHeight(e.target.value)}
                              disabled={
                                isCreatingShipment || isViewMode || !selectedNzcPackageIsCustom
                              }
                              className={packingInputClass}
                            />
                          </div>
                          <div>
                            <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                              KG
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={
                                selectedNzcPreset?.kg != null
                                  ? selectedNzcPreset.kg.toFixed(3)
                                  : lbsToKg(parseFloat(totalWeight || '0')).toFixed(3)
                              }
                              className={packingReadonlyInputClass}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                              Cubic (m3)
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={
                                selectedNzcPreset?.cubicM3 != null
                                  ? selectedNzcPreset.cubicM3.toFixed(4)
                                  : selectedNzcPackageIsCustom
                                    ? 'Custom'
                                    : '0.0000'
                              }
                              className={packingReadonlyInputClass}
                            />
                          </div>
                          <div>
                            <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                              Weight Reference (lbs)
                            </label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={totalWeight}
                              onChange={e => setTotalWeight(e.target.value)}
                              placeholder="Enter weight..."
                              disabled={
                                isCreatingShipment || isViewMode || !selectedNzcPackageIsCustom
                              }
                              className={`w-full rounded-xl px-4 py-3 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                selectedNzcPackageIsCustom
                                  ? 'bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.08] text-gray-900 dark:text-white'
                                  : 'bg-gray-100 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.05] text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              } disabled:opacity-50`}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                            Packages <span className="text-error-400">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={totalPackages}
                            onChange={e => setTotalPackages(e.target.value)}
                            disabled={isCreatingShipment || isViewMode}
                            className={packingInputClass}
                          />
                        </div>
                        <div>
                          <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                            Weight (lbs) <span className="text-error-400">*</span>
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={totalWeight}
                            onChange={e => setTotalWeight(e.target.value)}
                            placeholder="Enter weight..."
                            disabled={isCreatingShipment || isViewMode}
                            className={packingInputClass}
                          />
                        </div>
                      </div>
                    )}

                    {/* Shipping Address Info */}
                    <div className={packingSurfacePanelClass}>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2">
                            Shipping To
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {editableShipToAddress.name}
                          </p>
                        </div>
                        {!manualAddressEditEnabled ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfirmManualAddressEdit(true)}
                            disabled={isCreatingShipment || isViewMode}
                          >
                            <PencilSquareIcon className="h-4 w-4 mr-2" />
                            Manual Edit
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditableShipToAddress(baseShipToAddress);
                              setManualAddressEditEnabled(false);
                            }}
                            disabled={isCreatingShipment || isViewMode}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                      {isNZCCarrier && (
                        <div className="mb-4">
                          <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                            Sender Reference
                          </label>
                          <input
                            type="text"
                            value={trackingNumber}
                            onChange={e => setTrackingNumber(e.target.value)}
                            placeholder="SO number, customer PO"
                            disabled={isCreatingShipment || isViewMode}
                            className={packingInputClass}
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          ['Name', 'name'],
                          ['Company', 'company'],
                          ['Address Line 1', 'addressLine1'],
                          ['Address Line 2', 'addressLine2'],
                          ['City', 'city'],
                          ['State', 'state'],
                          ['Postal Code', 'postalCode'],
                          ['Country', 'country'],
                          ['Phone', 'phone'],
                          ['Email', 'email'],
                        ].map(([label, key]) => (
                          <div key={key}>
                            <label className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2 block">
                              {label}
                            </label>
                            <input
                              type="text"
                              value={(editableShipToAddress as any)[key] || ''}
                              onChange={e =>
                                setEditableShipToAddress(prev => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              disabled={
                                isCreatingShipment || isViewMode || !manualAddressEditEnabled
                              }
                              className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                manualAddressEditEnabled
                                  ? 'bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.08] text-gray-900 dark:text-white'
                                  : 'bg-gray-100 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.05] text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              } disabled:opacity-70`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* NZC Rates Display */}
                    {isNZCCarrier && (
                      <div
                        className={`${packingSurfacePanelClass} border-primary-500/30 space-y-3`}
                      >
                        <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2">
                          Available Shipping Rates
                        </p>
                        {areRatesLocked && (
                          <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 px-4 py-3 text-sm text-primary-700 dark:text-primary-200">
                            Shipping rate selection is locked after a connote has been created.
                          </div>
                        )}
                        {isFetchingRates && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
                            <span className="text-sm">Fetching rates...</span>
                          </div>
                        )}
                        {!isFetchingRates && nzcRateError && (
                          <div className="rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-700 dark:text-error-200">
                            {nzcRateError}
                          </div>
                        )}
                        {!isFetchingRates && !nzcRateError && nzcRateList.length === 0 && (
                          <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-100 dark:bg-white/[0.03] px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            No NZC rates available yet. Check the shipping address, package stock,
                            units, and weight.
                          </div>
                        )}
                        {!isFetchingRates && (
                          <div className="space-y-2">
                            {nzcRateList.map(quote => (
                              <div
                                key={quote.QuoteId}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                  selectedQuote?.QuoteId === quote.QuoteId
                                    ? areRatesLocked
                                      ? 'bg-primary-500/25 border-primary-400 ring-2 ring-primary-400/40 shadow-[0_0_0_1px_rgba(168,85,247,0.25)]'
                                      : 'bg-primary-500/20 border-primary-500'
                                    : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.08]'
                                } ${
                                  areRatesLocked
                                    ? selectedQuote?.QuoteId === quote.QuoteId
                                      ? 'cursor-not-allowed'
                                      : 'cursor-not-allowed opacity-55'
                                    : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.05]'
                                }`}
                                onClick={() => {
                                  if (areRatesLocked) {
                                    return;
                                  }
                                  setSelectedQuote(quote);
                                }}
                              >
                                <div className="flex-1">
                                  <p className="picking-title text-sm text-gray-900 dark:text-white">
                                    {quote.Service}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    {quote.DeliveryType && (
                                      <span className="rounded-full border border-primary-500/30 bg-primary-500/10 px-2 py-0.5 text-xs text-primary-700 dark:text-primary-200">
                                        {quote.DeliveryType}
                                      </span>
                                    )}
                                    {getQuoteZones(quote).map(zone => (
                                      <span
                                        key={`${quote.QuoteId}-${zone}`}
                                        className="rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
                                      >
                                        {zone}
                                      </span>
                                    ))}
                                    {quote.IsSaturdayDelivery && (
                                      <span className="rounded-full border border-warning-500/30 bg-warning-500/10 px-2 py-0.5 text-xs text-warning-700 dark:text-warning-200">
                                        Saturday
                                      </span>
                                    )}
                                  </div>
                                  {(quote.Description || quote.TransitDays) && (
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                      {quote.Description?.trim() ||
                                        (quote.TransitDays
                                          ? `${quote.TransitDays} days transit`
                                          : '')}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-primary-400">
                                    ${getQuotePrice(quote).toFixed(2)}
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
                      <div
                        className={`${packingSurfacePanelClass} border-success-500/30 space-y-4`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider">
                            Shipping Labels
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Connote:
                            </span>
                            <span className="font-mono text-primary-400">{nzcConnote}</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {nzcLabels.map(label => {
                            const labelSource = getNzcLabelSource(label);

                            return (
                              <div
                                key={label.connote}
                                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm text-gray-300">
                                    Label for{' '}
                                    <span className="font-mono text-primary-400">
                                      {label.connote}
                                    </span>
                                  </span>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleReprintLabel(label.connote)}
                                    isLoading={!!reprintingConnotes[label.connote]}
                                    disabled={!!reprintingConnotes[label.connote]}
                                  >
                                    <PrinterIcon className="h-4 w-4 mr-2" />
                                    Print Label
                                  </Button>
                                </div>
                                <div className="bg-white rounded-lg p-2">
                                  {labelSource.isPdf ? (
                                    <iframe
                                      src={labelSource.src}
                                      title={`Shipping Label ${label.connote}`}
                                      className="w-full h-[420px] rounded-lg border-0"
                                    />
                                  ) : (
                                    <img
                                      src={labelSource.src}
                                      alt={`Shipping Label ${label.connote}`}
                                      className="w-full h-auto max-h-[400px] object-contain"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
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
                        className="action-button-enhanced touch-target"
                      >
                        <PrinterIcon className="h-5 w-5 mr-2" />
                        Create Shipment & Complete
                      </Button>
                    )}

                    {shipmentCreated && (
                      <Button
                        variant="success"
                        size="lg"
                        fullWidth
                        onClick={handleShippingDone}
                        isLoading={isFinalizingShipment}
                        disabled={isFinalizingShipment}
                        className="action-button-enhanced touch-target"
                      >
                        Done & Mark Shipped
                      </Button>
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
              </div>
            ) : allVerified ? (
              /* All Items Verified - Show completion card with celebration */
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
                    All Items Verified!
                  </h2>
                  <p className="picking-subtitle text-gray-600 dark:text-gray-400 mb-8">
                    Order is ready to be packed and shipped.
                  </p>
                  <Button
                    size="lg"
                    variant="success"
                    onClick={handleCompletePacking}
                    disabled={isViewMode ? true : undefined}
                    className="action-button-enhanced touch-target animate-pop-in"
                  >
                    Enter Shipping Details
                  </Button>
                </div>
              </div>
            ) : currentItem ? (
              /* Current Task Card */
              <div
                className={`picking-card rounded-2xl border-primary-500/50 border-2 industrial-corners ${scanSuccess ? 'item-flash' : ''}`}
              >
                <div className="p-6 border-b packing-divider border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
                        {currentItemImage ? (
                          <img
                            src={currentItemImage}
                            alt={currentItemDisplayName}
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
                          Current Pack Task
                        </p>
                        <h2 className="picking-title text-xl text-gray-900 dark:text-white">
                          {currentItemDisplayName}
                        </h2>
                        {currentItemDescription && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {currentItemDescription}
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
                          disabled={order.status !== OrderStatus.PACKING}
                        >
                          Unclaim
                        </Button>
                      )}
                      <TaskStatusBadge
                        status={
                          (currentItem.verifiedQuantity || 0) > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Barcode Display */}
                  <div>
                    {currentItem.barcode ? (
                      <div className="barcode-display rounded-xl px-5 py-4">
                        <p className="text-primary-600 dark:text-primary-400 text-xs uppercase tracking-wider mb-2">
                          Scan Barcode
                        </p>
                        <p className="text-2xl text-gray-900 dark:text-white tracking-widest font-mono">
                          {currentItem.barcode}
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
                      <p className="picking-subtitle text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">
                        Verified
                      </p>
                      <p className="quantity-display text-primary-400">
                        {currentItem.verifiedQuantity || 0}
                      </p>
                    </div>
                    <div className="text-5xl text-gray-600 font-light">/</div>
                    <div className="text-center">
                      <p className="picking-subtitle text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider mb-3">
                        Needed
                      </p>
                      <p className="quantity-display text-gray-900 dark:text-white">
                        {currentItem.quantity}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bin-location-display rounded-xl p-5 text-center bin-beacon">
                    <p className="text-white/70 text-xs uppercase tracking-wider mb-2">
                      From bin location
                    </p>
                    <p className="text-3xl text-white font-bold tracking-widest">
                      {formatBinLocation(currentItem.binLocation)}
                    </p>
                  </div>

                  {/* Items in Order - Integrated into Current Pack Task */}
                  <div className={`${packingSurfacePanelClass} p-4`}>
                    <p className="picking-subtitle text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider mb-4">
                      Items in Order ({order.items?.length || 0})
                    </p>
                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                      {order.items?.map((item, index) => {
                        const isCompleted = (item.verifiedQuantity || 0) >= item.quantity;
                        const isSkipped = item.status === 'SKIPPED';
                        const isCurrent = index === currentItemIndex;
                        const itemImage = item.image || activeOrderItemImageMap[item.sku] || null;

                        return (
                          <div
                            key={item.orderItemId}
                            onClick={() => {
                              // Allow clicking on any incomplete/non-skipped item to select it
                              if (!isCompleted && !isSkipped && !isViewMode) {
                                setCurrentItemIndex(index);
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
                                      ? 'text-success-300 line-through'
                                      : isSkipped
                                        ? 'text-warning-300'
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
                                        : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {isSkipped
                                  ? 'Skipped'
                                  : `${item.verifiedQuantity || 0}/${item.quantity}`}
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
                              {/* Manual override button - for admins/supervisors */}
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
                              {(!isViewMode || userRole === 'ADMIN' || userRole === 'SUPERVISOR') &&
                                (item.verifiedQuantity || 0) > 0 &&
                                !isSkipped && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleUndoVerification(index);
                                    }}
                                    disabled={undoLoading[index]}
                                    className="text-error-400 hover:text-error-300 hover:bg-error-500/10 p-1.5 rounded-lg transition-colors touch-target disabled:opacity-50"
                                    title="Undo verification"
                                  >
                                    {undoLoading[index] ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                                    ) : (
                                      <MinusCircleIcon className="h-4 w-4" />
                                    )}
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
                        currentItem.barcode ? 'Scan barcode...' : 'Scan or enter item code...'
                      }
                      error={scanError || undefined}
                      disabled={isViewMode ? true : undefined}
                    />
                  </div>

                  {/* Scan Instruction */}
                  {currentItem.barcode && (
                    <div className="scan-instruction">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Scan this barcode:{' '}
                        <span className="font-mono font-semibold text-primary-400">
                          {currentItem.barcode}
                        </span>
                      </p>
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
                  No items to verify
                </p>
              </div>
            )}
          </div>
        </div>

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
          message={`Do you want to revert the skip for ${getOrderItemDisplayName(unskipConfirm.item)} (${unskipConfirm.item?.sku})?`}
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
                    onClick={() => { setShowSkipModal(false); setSkipQuantity(1); }}
                    className="text-white hover:text-warning-200 transition-colors"
                  >
                    <ExclamationTriangleIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className={packingSurfacePanelClass}>
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
                      <p className="picking-title text-gray-900 dark:text-white">
                        {getOrderItemDisplayName(order.items[skipItemIndex])}
                      </p>
                      {getOrderItemDescription(order.items[skipItemIndex]) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {getOrderItemDescription(order.items[skipItemIndex])}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">
                        {order.items[skipItemIndex].sku}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Qty: {order.items[skipItemIndex].quantity} | Bin:{' '}
                        {order.items[skipItemIndex].binLocation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quantity to skip */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Quantity to skip (backorder)
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSkipQuantity(q => Math.max(1, q - 1))}
                      className="h-9 w-9 rounded-lg bg-white/[0.08] border border-white/[0.12] text-gray-900 dark:text-white flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.15] transition-colors border-gray-200 dark:border-white/[0.12]"
                    >
                      −
                    </button>
                    <span className="text-gray-900 dark:text-white font-bold text-lg w-12 text-center">{skipQuantity}</span>
                    <button
                      onClick={() => {
                        const maxSkip = order.items[skipItemIndex].quantity - (order.items[skipItemIndex].verifiedQuantity || 0);
                        setSkipQuantity(q => Math.min(maxSkip, q + 1));
                      }}
                      className="h-9 w-9 rounded-lg bg-white/[0.08] border border-white/[0.12] text-gray-900 dark:text-white flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.15] transition-colors border-gray-200 dark:border-white/[0.12]"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      of {order.items[skipItemIndex].quantity - (order.items[skipItemIndex].verifiedQuantity || 0)} remaining units
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Reason for skipping <span className="text-error-400">*</span>
                  </label>
                  <textarea
                    value={skipReason}
                    onChange={e => setSkipReason(e.target.value)}
                    rows={3}
                    className={`${packingInputClass} focus:ring-warning-500 focus:border-warning-500`}
                    placeholder="e.g., Item not found, Damaged, etc."
                  />
                </div>

                <div className="p-4 bg-warning-500/10 border border-warning-500/30 rounded-xl">
                  <p className="picking-subtitle text-warning-700 dark:text-warning-300 text-sm">
                    <strong>Warning:</strong> Skipping this item will mark it as skipped. You can
                    revert this later if needed.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t packing-divider border-white/[0.08] rounded-b-2xl flex justify-end gap-3">
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
                    {getOrderItemDisplayName(item)} ({item.sku}) -{' '}
                    {item.skipReason || 'No reason provided'}
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

        <ConfirmDialog
          isOpen={confirmManualAddressEdit}
          onClose={() => setConfirmManualAddressEdit(false)}
          onConfirm={() => {
            setManualAddressEditEnabled(true);
            setConfirmManualAddressEdit(false);
          }}
          title="Enable Manual Address Edit"
          message="This unlocks the NZC shipping address fields for manual changes. Only do this if the NetSuite address needs to be corrected for this shipment."
          confirmText="Unlock Address"
          cancelText="Keep Locked"
          variant="warning"
        />

        {/* Manual Override Modal */}
        {showOverrideModal && overrideItemIndex !== null && order?.items?.[overrideItemIndex] && (
          <div className="fixed inset-0 scanner-modal-overlay flex items-center justify-center z-[120] p-3 sm:p-6 lg:p-8">
            <div className="scanner-modal-content relative z-[121] w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="picking-title text-lg">Manual Override</h2>
                  <button
                    onClick={() => setShowOverrideModal(false)}
                    className="text-white hover:text-primary-200 transition-colors"
                  >
                    <ExclamationCircleIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 lg:grid lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:gap-6 lg:space-y-0">
                <div className={packingSurfacePanelClass}>
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
                      <p className="picking-title text-gray-900 dark:text-white">
                        {getOrderItemDisplayName(order.items[overrideItemIndex])}
                      </p>
                      {getOrderItemDescription(order.items[overrideItemIndex]) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {getOrderItemDescription(order.items[overrideItemIndex])}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">
                        {order.items[overrideItemIndex].sku}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Required: {order.items[overrideItemIndex].quantity} | Currently Verified:{' '}
                        {order.items[overrideItemIndex].verifiedQuantity || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      New Verified Quantity <span className="text-error-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={order.items[overrideItemIndex].quantity}
                      value={overrideQuantity}
                      onChange={e => setOverrideQuantity(e.target.value)}
                      onFocus={e => e.target.select()}
                      className={`${packingInputClass} font-mono text-lg`}
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Max: {order.items[overrideItemIndex].quantity} (cannot exceed required
                      quantity)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Reason <span className="text-error-400">*</span>
                    </label>
                    <textarea
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                      rows={3}
                      className={packingInputClass}
                      placeholder="e.g., Found damaged item, Correcting count, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Additional Notes (optional)
                    </label>
                    <textarea
                      value={overrideNotes}
                      onChange={e => setOverrideNotes(e.target.value)}
                      rows={5}
                      className={packingInputClass}
                      placeholder="Any additional details..."
                    />
                  </div>

                  <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
                    <p className="picking-subtitle text-primary-700 dark:text-primary-300 text-sm">
                      <strong>Note:</strong> This action will be logged and audited. Supervisors
                      will be able to review this override.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t packing-divider border-white/[0.08] rounded-b-2xl flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowOverrideModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmOverride}
                  isLoading={isOverriding}
                  disabled={!overrideReason.trim() || parseInt(overrideQuantity) < 0}
                >
                  Apply Override
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
