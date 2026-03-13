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
import { nzcApi, useCompletePacking, useOrder } from '@/services/api';
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
import { Address, Carrier, NZCQuote, OrderStatus } from '@opsui/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
  const [scanSuccess, setScanSuccess] = useState(false);

  // Skip modal state
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipItemIndex, setSkipItemIndex] = useState<number | null>(null);
  const [skipReason, setSkipReason] = useState('');
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
  const [nzcLabel, setNzcLabel] = useState<{ data: string; contentType: string } | null>(null);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [shipmentCreated, setShipmentCreated] = useState(false);
  const [nzcConnote, setNzcConnote] = useState<string>('');
  const [selectedNzcPackagePreset, setSelectedNzcPackagePreset] = useState(NZC_DEFAULT_PRESET_ID);
  const [nzcCustomLength, setNzcCustomLength] = useState('10');
  const [nzcCustomWidth, setNzcCustomWidth] = useState('10');
  const [nzcCustomHeight, setNzcCustomHeight] = useState('10');
  const [manualAddressEditEnabled, setManualAddressEditEnabled] = useState(false);
  const [confirmManualAddressEdit, setConfirmManualAddressEdit] = useState(false);

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

  const { data: nzcStockSizes = [] } = useQuery({
    queryKey: ['nzc', 'stock-sizes'],
    queryFn: () => nzcApi.getStockSizes(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: order, isLoading, refetch } = useOrder(orderId!);
  const completePackingMutation = useCompletePacking();
  const baseShipToAddress = normalizeShipToAddress(
    order?.shippingAddress,
    order?.customerName || 'Customer'
  );
  const [editableShipToAddress, setEditableShipToAddress] = useState<Address>(baseShipToAddress);
  const trackingDefault = [order?.netsuiteSoTranId || order?.orderId, order?.customerPoNumber]
    .filter(Boolean)
    .join(', ');
  const carriersWithFallback = carriers.some(
    (carrier: Carrier) => carrier.carrierCode === NZC_CARRIER_FALLBACK.carrierCode
  )
    ? carriers
    : [...carriers, NZC_CARRIER_FALLBACK];
  const nzcPackageOptions = nzcStockSizes.length
    ? [
        NZC_PACKAGE_PRESETS[0],
        ...nzcStockSizes.map((stock: NzcStockSize) => ({
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
  const selectedCarrier = carriersWithFallback.find(
    (carrier: Carrier) => carrier.carrierId === selectedCarrierId
  );
  const isNZCCarrier = selectedCarrier?.carrierCode === 'NZC';
  const selectedNzcPreset = nzcPackageOptions.find(
    preset => preset.id === selectedNzcPackagePreset
  );
  const selectedNzcPackageIsCustom = selectedNzcPackagePreset === NZC_DEFAULT_PRESET_ID;

  // Ref to track if we've already attempted to claim this order
  const hasClaimedRef = useRef(false);
  const isClaimingRef = useRef(false);

  const buildNzcPackages = () => {
    const packageUnits = Math.max(1, parseInt(totalPackages || '1', 10) || 1);
    const presetWeightKg = selectedNzcPreset?.kg;
    const customWeightKg = lbsToKg(parseFloat(totalWeight || '0'));

    return [
      {
        packageStockId: selectedNzcPreset?.packageStockId,
        name: selectedNzcPreset?.name,
        type: selectedNzcPreset?.type,
        length: selectedNzcPackageIsCustom
          ? parseFloat(nzcCustomLength || '0') || 10
          : selectedNzcPreset?.length,
        width: selectedNzcPackageIsCustom
          ? parseFloat(nzcCustomWidth || '0') || 10
          : selectedNzcPreset?.width,
        height: selectedNzcPackageIsCustom
          ? parseFloat(nzcCustomHeight || '0') || 10
          : selectedNzcPreset?.height,
        weight: presetWeightKg || customWeightKg,
        units: packageUnits,
      },
    ];
  };

  const printNZCLabel = (label: { data: string; contentType: string }) => {
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
            }
            img {
              display: block;
              width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <img src="data:${label.contentType};base64,${label.data}" alt="NZC Shipping Label" />
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 150);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
      if (!isNZCCarrier || !totalWeight || !totalPackages) {
        setNzcRates([]);
        setSelectedQuote(null);
        return;
      }

      setIsFetchingRates(true);
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
          packages: buildNzcPackages(),
        });

        if (response.Quotes && response.Quotes.length > 0) {
          setNzcRates(response.Quotes);
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

    const timeoutId = setTimeout(fetchNZCRates, 500);
    return () => clearTimeout(timeoutId);
  }, [
    isNZCCarrier,
    totalWeight,
    totalPackages,
    editableShipToAddress,
    selectedNzcPackagePreset,
    nzcCustomLength,
    nzcCustomWidth,
    nzcCustomHeight,
  ]);

  useEffect(() => {
    if (!trackingNumber.trim() && trackingDefault) {
      setTrackingNumber(trackingDefault);
    }
  }, [trackingDefault, trackingNumber]);

  useEffect(() => {
    if (selectedCarrierId) {
      return;
    }

    const nzcCarrier = carriersWithFallback.find(
      (carrier: Carrier) => carrier.carrierCode === NZC_CARRIER_FALLBACK.carrierCode
    );

    if (nzcCarrier) {
      setSelectedCarrierId(nzcCarrier.carrierId);
    }
  }, [selectedCarrierId, carriersWithFallback]);

  useEffect(() => {
    if (!isNZCCarrier) {
      return;
    }

    const defaultPreset =
      nzcPackageOptions.find(preset => preset.id !== NZC_DEFAULT_PRESET_ID) || nzcPackageOptions[0];

    if (!defaultPreset) {
      return;
    }

    if (
      selectedNzcPackagePreset === NZC_DEFAULT_PRESET_ID ||
      !nzcPackageOptions.some(preset => preset.id === selectedNzcPackagePreset)
    ) {
      setSelectedNzcPackagePreset(defaultPreset.id);
    }
  }, [isNZCCarrier, nzcPackageOptions, selectedNzcPackagePreset]);

  useEffect(() => {
    if (!selectedNzcPreset || selectedNzcPackageIsCustom) {
      return;
    }

    if (selectedNzcPreset.length != null) {
      setNzcCustomLength(String(selectedNzcPreset.length));
    }
    if (selectedNzcPreset.width != null) {
      setNzcCustomWidth(String(selectedNzcPreset.width));
    }
    if (selectedNzcPreset.height != null) {
      setNzcCustomHeight(String(selectedNzcPreset.height));
    }
    if (selectedNzcPreset.kg != null) {
      setTotalWeight(String(kgToLbs(selectedNzcPreset.kg)));
    }
  }, [selectedNzcPreset, selectedNzcPackageIsCustom]);

  useEffect(() => {
    setEditableShipToAddress(baseShipToAddress);
    setManualAddressEditEnabled(false);
    setConfirmManualAddressEdit(false);
  }, [
    order?.orderId,
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
            <p className="picking-subtitle text-gray-400 text-sm">Preparing your pack list...</p>
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
          <h2 className="picking-title text-2xl text-white mb-3">Cannot Start Packing</h2>
          <p className="picking-subtitle text-gray-400 mb-6">{claimError}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/packing')}>
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
            <p className="picking-subtitle text-gray-400 text-sm">Retrieving pack details...</p>
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
          <Button onClick={() => navigate('/packing')}>Back to Queue</Button>
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
              setScanError(`Item was skipped: ${item.name}. Revert the skip to verify it.`);
            } else if ((item.verifiedQuantity || 0) >= item.quantity) {
              setScanError(`Item already fully verified: ${item.name}`);
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
      setScanError(`Item already fully verified: ${matchedItem.name}`);
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
      await apiClient.post(`/orders/${orderId}/verify-packing`, {
        order_item_id: matchedItem.orderItemId,
        quantity: 1,
      });

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

    setSkipItemIndex(index);
    setSkipReason('');
    setShowSkipModal(true);
  };

  const handleConfirmSkip = async () => {
    if (skipItemIndex === null || !order?.items?.[skipItemIndex]) return;

    const item = order.items[skipItemIndex];
    setIsSkipping(true);

    try {
      await apiClient.post(`/orders/${orderId}/skip-packing-item`, {
        order_item_id: item.orderItemId,
        reason: skipReason || 'No reason provided',
      });

      showToast('Item skipped!', 'warning');
      setShowSkipModal(false);
      setSkipItemIndex(null);
      setSkipReason('');

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

    if (!totalWeight || parseFloat(totalWeight) <= 0) {
      showToast('Please enter a valid weight', 'error');
      return;
    }

    if (!totalPackages || parseInt(totalPackages) <= 0) {
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

        const weightKg = lbsToKg(parseFloat(totalWeight));

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
          packages: buildNzcPackages().map(pkg => ({
            ...pkg,
            weight: pkg.weight || weightKg,
          })),
          quoteId: selectedQuote.QuoteId,
          senderReference: trackingNumber.trim() || undefined,
          printToPrinter: true,
        });

        const connote = nzcShipment.ConsignmentNo;
        setNzcConnote(connote);
        setShipmentCreated(true);

        const label = await nzcApi.getLabel(connote, 'LABEL_PNG_100X175');
        setNzcLabel(label);
        printNZCLabel(label);

        showToast(`NZC Shipment created! Connote: ${connote}`, 'success');

        await apiClient.post('/shipping/shipments', {
          orderId,
          carrierId: selectedCarrierId,
          serviceType: selectedQuote.Service,
          shippingMethod: 'STANDARD',
          shipFromAddress,
          shipToAddress: editableShipToAddress,
          totalWeight: parseFloat(totalWeight),
          totalPackages: parseInt(totalPackages),
          createdBy: currentUser?.userId,
        });

        await completePackingMutation.mutateAsync({
          orderId,
          dto: {
            orderId,
            packerId: order.packerId || '',
          },
        });

        showToast('Order packed and shipped successfully!', 'success');
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
      setClaimError(null);
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

  // Calculate progress percentage for ring
  const progressPercent = Math.round((verifiedCount / totalItems) * 100) || 0;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

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
      <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* View Mode Banner */}
        {isViewMode && (
          <div className="picking-card rounded-xl p-4 sm:p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="picking-title text-white">
                {order.status === 'PACKED' || order.status === 'SHIPPED'
                  ? 'Viewing completed order'
                  : "Viewing this packer's work in real-time"}
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
                  <h1 className="picking-title text-xl text-white truncate">{order.orderId}</h1>
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
                    <span className="picking-subtitle text-gray-400 text-sm">Verified</span>
                    <span className="hero-number text-lg text-success-400">{verifiedCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="picking-subtitle text-gray-400 text-sm">Remaining</span>
                    <span className="hero-number text-lg text-warning-400">
                      {totalItems - verifiedCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="picking-subtitle text-gray-400 text-sm">Total</span>
                    <span className="hero-number text-lg text-white">{totalItems}</span>
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
            {showShippingForm ? (
              /* Shipping Details Form */
              <div ref={shippingFormRef}>
                <div className="picking-card rounded-2xl border-primary-500/50 border-2 industrial-corners">
                  <div className="p-6 border-b border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="picking-subtitle text-primary-400 text-xs uppercase tracking-wider mb-1">
                          Shipping Details
                        </p>
                        <h2 className="picking-title text-xl text-white">Create Shipment</h2>
                      </div>
                      <span className="text-sm text-gray-400 font-mono">{order.orderId}</span>
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
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 [&_option]:bg-gray-900 [&_option]:text-white"
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
                          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 [&_option]:bg-gray-900 [&_option]:text-white"
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
                          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                        />
                      </div>
                    )}

                    {/* Package Details */}
                    {isNZCCarrier ? (
                      <div className="bg-white/[0.02] rounded-xl border border-white/[0.08] p-4 space-y-4">
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
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 [&_option]:bg-gray-900 [&_option]:text-white"
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
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
                              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 focus:outline-none disabled:opacity-70"
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
                              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-gray-300 focus:outline-none disabled:opacity-70"
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
                              className={`w-full rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                selectedNzcPackageIsCustom
                                  ? 'bg-white/[0.05] border border-white/[0.08] text-white'
                                  : 'bg-white/[0.03] border border-white/[0.05] text-gray-400 cursor-not-allowed'
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
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    )}

                    {/* Shipping Address Info */}
                    <div className="bg-white/[0.02] rounded-xl border border-white/[0.08] p-4">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2">
                            Shipping To
                          </p>
                          <p className="text-white font-semibold">{editableShipToAddress.name}</p>
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
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
                                  ? 'bg-white/[0.05] border border-white/[0.08] text-white'
                                  : 'bg-white/[0.03] border border-white/[0.05] text-gray-400 cursor-not-allowed'
                              } disabled:opacity-70`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* NZC Rates Display */}
                    {nzcRates.length > 0 && (
                      <div className="bg-white/[0.02] rounded-xl border border-primary-500/30 p-4 space-y-3">
                        <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-2">
                          Available Shipping Rates
                        </p>
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
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                  selectedQuote?.QuoteId === quote.QuoteId
                                    ? 'bg-primary-500/20 border-primary-500'
                                    : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]'
                                }`}
                                onClick={() => setSelectedQuote(quote)}
                              >
                                <div className="flex-1">
                                  <p className="picking-title text-white text-sm">
                                    {quote.Service}
                                  </p>
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
                          <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider">
                            Shipping Label
                          </p>
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
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => navigate('/packing')}
                            >
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
                        className="action-button-enhanced touch-target"
                      >
                        <PrinterIcon className="h-5 w-5 mr-2" />
                        Create Shipment & Complete
                      </Button>
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
                  <h2 className="picking-title text-3xl text-white mb-3 animate-celebrate">
                    All Items Verified!
                  </h2>
                  <p className="picking-subtitle text-gray-400 mb-8">
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
                <div className="p-6 border-b border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="picking-subtitle text-primary-400 text-xs uppercase tracking-wider mb-1">
                        Current Pack Task
                      </p>
                      <h2 className="picking-title text-xl text-white">{currentItem.name}</h2>
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
                        <p className="text-primary-400 text-xs uppercase tracking-wider mb-2">
                          Scan Barcode
                        </p>
                        <p className="text-2xl text-white tracking-widest font-mono">
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
                      <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-3">
                        Verified
                      </p>
                      <p className="quantity-display text-primary-400">
                        {currentItem.verifiedQuantity || 0}
                      </p>
                    </div>
                    <div className="text-5xl text-gray-600 font-light">/</div>
                    <div className="text-center">
                      <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-3">
                        Needed
                      </p>
                      <p className="quantity-display text-white">{currentItem.quantity}</p>
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
                  <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.08]">
                    <p className="picking-subtitle text-gray-400 text-xs uppercase tracking-wider mb-4">
                      Items in Order ({order.items?.length || 0})
                    </p>
                    <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                      {order.items?.map((item, index) => {
                        const isCompleted = (item.verifiedQuantity || 0) >= item.quantity;
                        const isSkipped = item.status === 'SKIPPED';
                        const isCurrent = index === currentItemIndex;

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
                      <p className="text-gray-400 text-sm">
                        Scan this barcode:{' '}
                        <span className="font-mono font-semibold text-primary-400">
                          {currentItem.barcode}
                        </span>
                      </p>
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
                <p className="picking-subtitle text-gray-400">No items to verify</p>
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
                    <ExclamationTriangleIcon className="h-6 w-6" />
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
                    placeholder="e.g., Item not found, Damaged, etc."
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
          <div className="fixed inset-0 scanner-modal-overlay flex items-center justify-center z-50 p-4">
            <div className="scanner-modal-content max-w-md w-full rounded-2xl">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="picking-title text-lg">Manual Override</h2>
                  <button
                    onClick={() => setShowOverrideModal(false)}
                    className="text-white hover:text-primary-200 transition-colors"
                  >
                    <PencilSquareIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.08]">
                  <p className="picking-title text-white">{order.items[overrideItemIndex].name}</p>
                  <p className="text-sm text-gray-400 font-mono mt-1">
                    {order.items[overrideItemIndex].sku}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Required: {order.items[overrideItemIndex].quantity} | Currently Verified:{' '}
                    {order.items[overrideItemIndex].verifiedQuantity || 0}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    New Verified Quantity <span className="text-error-400">*</span>
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
                    Max: {order.items[overrideItemIndex].quantity} (cannot exceed required quantity)
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
                    <strong>Note:</strong> This action will be logged and audited. Supervisors will
                    be able to review this override.
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
