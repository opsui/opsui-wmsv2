/**
 * Fixed Assets Page
 *
 * Purple Industrial Aesthetic
 * A distinctive, editorial design for asset management
 * Features: Staggered animations, distinctive typography, atmospheric depth
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Skeleton,
  Breadcrumb,
} from '@/components/shared';
import {
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface FixedAsset {
  assetId: string;
  assetNumber: string;
  assetName: string;
  assetCategory?: string;
  purchaseDate: Date;
  purchaseCost: number;
  salvageValue: number;
  usefulLife: number;
  depreciationMethod: string;
  currentBookValue: number;
  accumulatedDepreciation: number;
  status: string;
}

interface FormData {
  assetName: string;
  assetNumber: string;
  category: string;
  purchaseCost: string;
  purchaseDate: string;
  usefulLife: string;
  salvageValue: string;
}

interface FormErrors {
  assetName?: string;
  assetNumber?: string;
  category?: string;
  purchaseCost?: string;
  purchaseDate?: string;
  usefulLife?: string;
}

// ============================================================================
// ANIMATION STYLES (inline for this page)
// ============================================================================

const pageStyles = `
  /* Staggered entrance animation */
  @keyframes asset-stagger-in {
    from {
      opacity: 0;
      transform: translateY(32px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Number slide up with elegant easing */
  @keyframes number-slide-up {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Decorative line reveal */
  @keyframes deco-line-reveal {
    from {
      width: 0;
      opacity: 0;
    }
    to {
      width: 100%;
      opacity: 1;
    }
  }

  /* Subtle float for decorative elements */
  @keyframes asset-float {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-6px) rotate(1deg);
    }
  }

  /* Metric pulse for live indicators */
  @keyframes metric-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
    }
  }

  /* Row hover highlight */
  @keyframes row-highlight {
    from {
      background-position: -100% 0;
    }
    to {
      background-position: 200% 0;
    }
  }

  /* Asset card styling */
  .asset-card {
    animation: asset-stagger-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  .asset-card:nth-child(1) { animation-delay: 0.05s; }
  .asset-card:nth-child(2) { animation-delay: 0.1s; }
  .asset-card:nth-child(3) { animation-delay: 0.15s; }
  .asset-card:nth-child(4) { animation-delay: 0.2s; }
  .asset-card:nth-child(5) { animation-delay: 0.25s; }
  .asset-card:nth-child(6) { animation-delay: 0.3s; }

  /* Metric card with pulse */
  .metric-card {
    position: relative;
  }

  .metric-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.6), transparent);
    animation: deco-line-reveal 0.8s ease-out 0.4s backwards;
  }

  .metric-card.live::after {
    content: '';
    position: absolute;
    top: 12px;
    right: 12px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    animation: metric-pulse 2s ease-in-out infinite;
  }

  /* Hero number styling */
  .hero-number {
    animation: number-slide-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  .hero-number:nth-child(1) { animation-delay: 0.2s; }
  .hero-number:nth-child(2) { animation-delay: 0.3s; }
  .hero-number:nth-child(3) { animation-delay: 0.4s; }
  .hero-number:nth-child(4) { animation-delay: 0.5s; }

  /* Art Deco corner accents */
  .deco-corner {
    position: relative;
  }

  .deco-corner::before,
  .deco-corner::after {
    content: '';
    position: absolute;
    width: 24px;
    height: 24px;
    border-color: rgba(16, 185, 129, 0.4);
    border-style: solid;
    transition: all 0.3s ease;
  }

  .deco-corner::before {
    top: -1px;
    left: -1px;
    border-width: 2px 0 0 2px;
    border-radius: 6px 0 0 0;
  }

  .deco-corner::after {
    bottom: -1px;
    right: -1px;
    border-width: 0 2px 2px 0;
    border-radius: 0 0 6px 0;
  }

  .deco-corner:hover::before,
  .deco-corner:hover::after {
    border-color: rgba(16, 185, 129, 0.7);
    width: 32px;
    height: 32px;
  }

  /* Table row hover effect */
  .asset-row {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .asset-row:hover {
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(16, 185, 129, 0.05) 20%, 
      rgba(16, 185, 129, 0.08) 50%, 
      rgba(16, 185, 129, 0.05) 80%, 
      transparent 100%
    );
    transform: translateX(4px);
  }

  /* Asset number styling - distinctive monospace */
  .asset-number {
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.08em;
  }

  /* Category badge - art deco style */
  .category-badge {
    font-family: 'Archivo', sans-serif;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-size: 0.65rem;
  }

  /* Page title - editorial serif */
  .page-title {
    font-family: 'DM Serif Display', Georgia, serif;
    letter-spacing: -0.02em;
  }

  /* Atmospheric background */
  .asset-atmosphere {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .asset-atmosphere::before {
    content: '';
    position: absolute;
    top: 5%;
    right: 10%;
    width: 45%;
    height: 45%;
    background: radial-gradient(ellipse at center, rgba(16, 185, 129, 0.1) 0%, transparent 60%);
    filter: blur(60px);
    animation: asset-float 12s ease-in-out infinite;
  }

  .asset-atmosphere::after {
    content: '';
    position: absolute;
    bottom: 15%;
    left: 5%;
    width: 35%;
    height: 35%;
    background: radial-gradient(ellipse at center, rgba(6, 182, 212, 0.08) 0%, transparent 60%);
    filter: blur(50px);
    animation: asset-float 15s ease-in-out infinite reverse;
  }

  /* Light mode adjustments */
  html.light .asset-atmosphere::before {
    background: radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, transparent 60%);
  }

  html.light .asset-atmosphere::after {
    background: radial-gradient(ellipse at center, rgba(6, 182, 212, 0.1) 0%, transparent 60%);
  }

  /* Floating action button */
  .fab-container {
    position: relative;
  }

  .fab-container::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(6, 182, 212, 0.3));
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: blur(8px);
  }

  .fab-container:hover::before {
    opacity: 1;
  }

  /* Modal overlay with gradient */
  .modal-overlay {
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
    backdrop-filter: blur(8px);
  }

  /* Grain texture overlay */
  .grain-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }

  html.light .grain-overlay {
    opacity: 0.02;
  }

  /* Toast notification */
  .toast {
    animation: slide-in-right 0.3s ease-out;
  }

  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Input error state */
  .input-error {
    border-color: rgba(239, 68, 68, 0.5) !important;
    background-color: rgba(239, 68, 68, 0.05) !important;
  }
`;

// ============================================================================
// API FUNCTIONS
// ============================================================================

import { apiClient } from '@/lib/api-client';

async function fetchAssets(): Promise<FixedAsset[]> {
  const response = await apiClient.get('/accounting/fixed-assets');
  return response.data.assets || [];
}

async function createAsset(assetData: FormData): Promise<FixedAsset> {
  const response = await apiClient.post('/accounting/fixed-assets', {
    assetNumber: assetData.assetNumber,
    assetName: assetData.assetName,
    assetCategory: assetData.category,
    purchaseDate: assetData.purchaseDate,
    purchaseCost: parseFloat(assetData.purchaseCost),
    salvageValue: parseFloat(assetData.salvageValue || '0'),
    usefulLife: parseInt(assetData.usefulLife),
    depreciationMethod: 'STRAIGHT_LINE',
  });
  return response.data;
}

async function deleteAsset(assetId: string): Promise<void> {
  await apiClient.delete(`/accounting/fixed-assets/${assetId}`);
}

// ============================================================================
// INITIAL FORM STATE
// ============================================================================

const initialFormData: FormData = {
  assetName: '',
  assetNumber: '',
  category: '',
  purchaseCost: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  usefulLife: '',
  salvageValue: '0',
};

// ============================================================================
// MAIN PAGE
// ============================================================================

function FixedAssetsPage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore(state => state.accessToken);

  // State
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    assetId: string;
    assetName: string;
  }>({
    show: false,
    assetId: '',
    assetName: '',
  });

  // Fetch assets on mount
  const loadAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchAssets();
      setAssets(data);
    } catch (error) {
      console.error('Failed to load assets:', error);
      showToast('error', 'Failed to load assets. Using sample data.');
      // Use sample data as fallback
      setAssets(getSampleAssets());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadAssets();
  }, [loadAssets]);

  // Sample assets fallback
  const getSampleAssets = (): FixedAsset[] => [
    {
      assetId: 'FA-001',
      assetNumber: 'EQ-2024-001',
      assetName: 'Forklift - Toyota 8-Series',
      assetCategory: 'Equipment',
      purchaseDate: new Date('2024-01-15'),
      purchaseCost: 45000,
      salvageValue: 5000,
      usefulLife: 10,
      depreciationMethod: 'STRAIGHT_LINE',
      currentBookValue: 41000,
      accumulatedDepreciation: 4000,
      status: 'ACTIVE',
    },
    {
      assetId: 'FA-002',
      assetNumber: 'VE-2024-001',
      assetName: 'Delivery Truck - Ford Transit',
      assetCategory: 'Vehicles',
      purchaseDate: new Date('2024-03-01'),
      purchaseCost: 35000,
      salvageValue: 3000,
      usefulLife: 8,
      depreciationMethod: 'DOUBLE_DECLINING',
      currentBookValue: 32000,
      accumulatedDepreciation: 3000,
      status: 'ACTIVE',
    },
    {
      assetId: 'FA-003',
      assetNumber: 'BL-2023-001',
      assetName: 'Warehouse Racking System',
      assetCategory: 'Building Improvements',
      purchaseDate: new Date('2023-06-01'),
      purchaseCost: 120000,
      salvageValue: 0,
      usefulLife: 20,
      depreciationMethod: 'STRAIGHT_LINE',
      currentBookValue: 114000,
      accumulatedDepreciation: 6000,
      status: 'ACTIVE',
    },
    {
      assetId: 'FA-004',
      assetNumber: 'OF-2022-001',
      assetName: 'Office Furniture',
      assetCategory: 'Furniture & Fixtures',
      purchaseDate: new Date('2022-01-15'),
      purchaseCost: 15000,
      salvageValue: 0,
      usefulLife: 7,
      depreciationMethod: 'STRAIGHT_LINE',
      currentBookValue: 10714,
      accumulatedDepreciation: 4286,
      status: 'ACTIVE',
    },
  ];

  // Show toast notification
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.assetName.trim()) {
      errors.assetName = 'Asset name is required';
    }

    if (!formData.assetNumber.trim()) {
      errors.assetNumber = 'Asset number is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    if (!formData.purchaseCost || parseFloat(formData.purchaseCost) <= 0) {
      errors.purchaseCost = 'Purchase cost must be greater than 0';
    }

    if (!formData.purchaseDate) {
      errors.purchaseDate = 'Purchase date is required';
    }

    if (!formData.usefulLife || parseInt(formData.usefulLife) <= 0) {
      errors.usefulLife = 'Useful life must be greater than 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input change
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const newAsset = await createAsset(formData);
      setAssets(prev => [...prev, newAsset]);
      setShowAddModal(false);
      setFormData(initialFormData);
      setFormErrors({});
      showToast('success', `Asset "${newAsset.assetName}" created successfully!`);
    } catch (error) {
      console.error('Failed to create asset:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to create asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete asset
  const handleDeleteAsset = async () => {
    if (!deleteConfirm.assetId) return;

    setIsSubmitting(true);
    try {
      await deleteAsset(deleteConfirm.assetId);
      setAssets(prev => prev.filter(a => a.assetId !== deleteConfirm.assetId));
      setDeleteConfirm({ show: false, assetId: '', assetName: '' });
      showToast('success', 'Asset deleted successfully!');
    } catch (error) {
      console.error('Failed to delete asset:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to delete asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setShowAddModal(false);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalOriginalCost = assets.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
  const totalAccumulatedDepreciation = assets.reduce(
    (sum, a) => sum + (Number(a.accumulatedDepreciation) || 0),
    0
  );
  const totalNetBookValue = assets.reduce((sum, a) => sum + (Number(a.currentBookValue) || 0), 0);

  // Export to CSV
  const exportToCSV = () => {
    const lines: string[] = [];

    lines.push('FIXED ASSET REGISTER');
    lines.push(`Generated on ${new Date().toLocaleDateString()}`);
    lines.push('');
    lines.push(
      'Asset Number,Asset Name,Category,Purchase Date,Cost,Accum. Depreciation,Net Book Value'
    );

    assets.forEach(asset => {
      lines.push(
        `${asset.assetNumber},${asset.assetName},${asset.assetCategory || ''},` +
          `${new Date(asset.purchaseDate).toLocaleDateString()},${asset.purchaseCost},` +
          `${asset.accumulatedDepreciation},${asset.currentBookValue}`
      );
    });

    lines.push('');
    lines.push(
      `TOTALS,,,$${totalOriginalCost},$${totalAccumulatedDepreciation},$${totalNetBookValue}`
    );

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixed-assets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', 'Asset register exported successfully!');
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Get category color
  const getCategoryColor = (category?: string): string => {
    const colors: Record<string, string> = {
      Equipment: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      Vehicles: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      'Building Improvements': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      'Furniture & Fixtures': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    };
    return colors[category || ''] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  };

  return (
    <div className="min-h-screen relative">
      {/* Inject page-specific styles */}
      <style>{pageStyles}</style>

      {/* Atmospheric background elements */}
      <div className="asset-atmosphere" aria-hidden="true" />
      <div className="grain-overlay" aria-hidden="true" />

      <Header />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] toast">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-70 transition-opacity"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Header - Editorial Style */}
        <header className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Title Section */}
            <div
              className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <div className="p-3 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl border border-purple-500/30">
                    <BuildingOfficeIcon className="h-7 w-7 text-purple-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <span className="category-badge text-purple-400 tracking-widest">
                    Asset Management
                  </span>
                </div>
              </div>
              <h1 className="page-title text-4xl lg:text-5xl text-white dark:text-white tracking-tight">
                Fixed Assets
              </h1>
              <p className="mt-3 text-lg text-gray-400 dark:text-gray-400 max-w-2xl">
                Track depreciation, manage disposals, and generate asset registers with precision
              </p>
            </div>

            {/* Action Buttons - Refined Grouping */}
            <div
              className={`flex flex-wrap items-center gap-3 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <Button
                variant="secondary"
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border-white/10 hover:border-emerald-500/30 transition-all duration-300"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                variant="secondary"
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border-white/10 hover:border-emerald-500/30 transition-all duration-300"
              >
                <PrinterIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <div className="fab-container">
                <Button
                  variant="primary"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 border-0 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add Asset</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Summary Metrics - Art Deco Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {/* Total Assets */}
          <div
            className={`asset-card metric-card bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-emerald-500/30 transition-all duration-500 ${mounted ? '' : ''}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Total Assets
              </span>
            </div>
            <p className="hero-number text-3xl lg:text-4xl font-bold text-white font-mono">
              {assets.length}
            </p>
          </div>

          {/* Total Original Cost */}
          <div
            className={`asset-card metric-card bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-blue-500/30 transition-all duration-500`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Original Cost
              </span>
            </div>
            <p className="hero-number text-3xl lg:text-4xl font-bold text-blue-400 font-mono">
              {formatCurrency(totalOriginalCost)}
            </p>
          </div>

          {/* Accumulated Depreciation */}
          <div
            className={`asset-card metric-card bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-amber-500/30 transition-all duration-500`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Accum. Dep.
              </span>
            </div>
            <p className="hero-number text-3xl lg:text-4xl font-bold text-amber-400 font-mono">
              {formatCurrency(totalAccumulatedDepreciation)}
            </p>
          </div>

          {/* Net Book Value */}
          <div
            className={`asset-card metric-card live bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-emerald-500/30 transition-all duration-500`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <SparklesIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Net Book Value
              </span>
            </div>
            <p className="hero-number text-3xl lg:text-4xl font-bold text-emerald-400 font-mono">
              {formatCurrency(totalNetBookValue)}
            </p>
          </div>
        </section>

        {/* Assets Table - Enhanced Design */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton variant="rounded" className="h-64" />
          </div>
        ) : (
          <div className="asset-card deco-corner bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-5 border-b border-white/10 bg-white/[0.02]">
              <h2 className="text-lg font-semibold text-white tracking-tight">Asset Register</h2>
              <p className="text-sm text-gray-400 mt-1">
                Complete listing of all registered fixed assets
              </p>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Asset #
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Purchase Date
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Accum. Dep.
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Net Book Value
                    </th>
                    <th className="text-center py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="text-center py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {assets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-3">
                          <BuildingOfficeIcon className="h-12 w-12 text-gray-600" />
                          <p>No assets registered yet</p>
                          <Button
                            variant="primary"
                            onClick={() => setShowAddModal(true)}
                            className="mt-2"
                          >
                            Add Your First Asset
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset, index) => (
                      <tr
                        key={asset.assetId}
                        className="asset-row"
                        style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                      >
                        <td className="py-4 px-6">
                          <span className="asset-number text-sm text-emerald-400 font-medium">
                            {asset.assetNumber}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-white font-medium">{asset.assetName}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`category-badge inline-flex px-2.5 py-1 rounded-md border ${getCategoryColor(asset.assetCategory)}`}
                          >
                            {asset.assetCategory || '-'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-400">
                            {new Date(asset.purchaseDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-sm font-medium text-blue-400 font-mono">
                            {formatCurrency(asset.purchaseCost)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-sm text-amber-400 font-mono">
                            {formatCurrency(asset.accumulatedDepreciation)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            {formatCurrency(asset.currentBookValue)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">
                            {asset.depreciationMethod.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                // Pre-fill form with asset data for editing
                                setFormData({
                                  assetName: asset.assetName,
                                  assetNumber: asset.assetNumber,
                                  category: asset.assetCategory || '',
                                  purchaseCost: asset.purchaseCost.toString(),
                                  purchaseDate: new Date(asset.purchaseDate)
                                    .toISOString()
                                    .split('T')[0],
                                  usefulLife: asset.usefulLife.toString(),
                                  salvageValue: asset.salvageValue.toString(),
                                });
                                setShowAddModal(true);
                              }}
                              className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
                              title="Edit asset"
                            >
                              <PencilIcon className="h-4 w-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  show: true,
                                  assetId: asset.assetId,
                                  assetName: asset.assetName,
                                })
                              }
                              className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
                              title="Delete asset"
                            >
                              <TrashIcon className="h-4 w-4 text-gray-500 group-hover:text-rose-400 transition-colors" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {assets.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-emerald-500/20 bg-emerald-500/5">
                      <td
                        colSpan={4}
                        className="py-4 px-6 text-sm font-bold text-gray-300 text-right uppercase tracking-wider"
                      >
                        Totals
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-sm font-bold text-blue-400 font-mono">
                          {formatCurrency(totalOriginalCost)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-sm font-bold text-amber-400 font-mono">
                          {formatCurrency(totalAccumulatedDepreciation)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-base font-bold text-emerald-400 font-mono">
                          {formatCurrency(totalNetBookValue)}
                        </span>
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Add Asset Modal - Refined Design */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="modal-overlay absolute inset-0"
              onClick={handleCancel}
              aria-hidden="true"
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <PlusIcon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Add New Fixed Asset</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Register a new asset for depreciation tracking
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Asset Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Forklift - Toyota 8-Series"
                      value={formData.assetName}
                      onChange={e => handleInputChange('assetName', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all ${
                        formErrors.assetName ? 'input-error' : 'border-white/10'
                      }`}
                    />
                    {formErrors.assetName && (
                      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-4 w-4" />
                        {formErrors.assetName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Asset Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., EQ-2024-001"
                      value={formData.assetNumber}
                      onChange={e => handleInputChange('assetNumber', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono ${
                        formErrors.assetNumber ? 'input-error' : 'border-white/10'
                      }`}
                    />
                    {formErrors.assetNumber && (
                      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-4 w-4" />
                        {formErrors.assetNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => handleInputChange('category', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all ${
                        formErrors.category ? 'input-error' : 'border-white/10'
                      }`}
                    >
                      <option value="">Select category</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Vehicles">Vehicles</option>
                      <option value="Building Improvements">Building Improvements</option>
                      <option value="Furniture & Fixtures">Furniture & Fixtures</option>
                    </select>
                    {formErrors.category && (
                      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-4 w-4" />
                        {formErrors.category}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Purchase Cost <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.purchaseCost}
                        onChange={e => handleInputChange('purchaseCost', e.target.value)}
                        className={`w-full pl-8 pr-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono ${
                          formErrors.purchaseCost ? 'input-error' : 'border-white/10'
                        }`}
                      />
                    </div>
                    {formErrors.purchaseCost && (
                      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-4 w-4" />
                        {formErrors.purchaseCost}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Purchase Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={e => handleInputChange('purchaseDate', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all ${
                        formErrors.purchaseDate ? 'input-error' : 'border-white/10'
                      }`}
                    />
                    {formErrors.purchaseDate && (
                      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-4 w-4" />
                        {formErrors.purchaseDate}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Useful Life (Years) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="10"
                      value={formData.usefulLife}
                      onChange={e => handleInputChange('usefulLife', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono ${
                        formErrors.usefulLife ? 'input-error' : 'border-white/10'
                      }`}
                    />
                    {formErrors.usefulLife && (
                      <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-4 w-4" />
                        {formErrors.usefulLife}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Salvage Value
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.salvageValue}
                        onChange={e => handleInputChange('salvageValue', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="bg-white/5 hover:bg-white/10 border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 border-0"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Asset'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="modal-overlay absolute inset-0"
              onClick={() => setDeleteConfirm({ show: false, assetId: '', assetName: '' })}
            />
            <div className="relative w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <TrashIcon className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Delete Asset</h3>
                  <p className="text-sm text-gray-400">
                    Are you sure you want to delete "{deleteConfirm.assetName}"?
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-6">
                This action cannot be undone. The asset will be permanently removed from the
                register.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm({ show: false, assetId: '', assetName: '' })}
                  disabled={isSubmitting}
                  className="bg-white/5 hover:bg-white/10 border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDeleteAsset}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-500 border-0"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default FixedAssetsPage;
