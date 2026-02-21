/**
 * Fixed Assets Page
 *
 * Art Deco Financial Aesthetic
 * A distinctive, editorial design for asset management
 * Features: Staggered animations, distinctive typography, atmospheric depth
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
`;

// ============================================================================
// MAIN PAGE
// ============================================================================

function FixedAssetsPage() {
  const navigate = useNavigate();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Trigger animations after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mock data
  const mockAssets: FixedAsset[] = [
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

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalOriginalCost = mockAssets.reduce((sum, a) => sum + a.purchaseCost, 0);
  const totalAccumulatedDepreciation = mockAssets.reduce(
    (sum, a) => sum + a.accumulatedDepreciation,
    0
  );
  const totalNetBookValue = mockAssets.reduce((sum, a) => sum + a.currentBookValue, 0);

  // Export to CSV
  const exportToCSV = () => {
    const lines: string[] = [];

    lines.push('FIXED ASSET REGISTER');
    lines.push(`Generated on ${new Date().toLocaleDateString()}`);
    lines.push('');
    lines.push(
      'Asset Number,Asset Name,Category,Purchase Date,Cost,Accum. Depreciation,Net Book Value'
    );

    mockAssets.forEach(asset => {
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

      <main className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Header - Editorial Style */}
        <header className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Title Section */}
            <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl border border-emerald-500/30">
                    <BuildingOfficeIcon className="h-7 w-7 text-emerald-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <span className="category-badge text-emerald-400 tracking-widest">Asset Management</span>
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
            <div className={`flex flex-wrap items-center gap-3 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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
          <div className={`asset-card metric-card bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-emerald-500/30 transition-all duration-500 ${mounted ? '' : ''}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Assets</span>
            </div>
            <p className="hero-number text-3xl lg:text-4xl font-bold text-white font-mono">
              {mockAssets.length}
            </p>
          </div>

          {/* Total Original Cost */}
          <div className={`asset-card metric-card bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-blue-500/30 transition-all duration-500`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Original Cost</span>
            </div>
            <p className="hero-number text-3xl lg:text-4xl font-bold text-blue-400 font-mono">
              {formatCurrency(totalOriginalCost)}
            </p>
          </div>

          {/* Accumulated Depreciation */}
          <div className={`asset-card metric-card bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-amber-500/30 transition-all duration-500`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Accum. Dep.</span>
            </div>
            <p className="hero-number text-3xl lg:text-4xl font-bold text-amber-400 font-mono">
              {formatCurrency(totalAccumulatedDepreciation)}
            </p>
          </div>

          {/* Net Book Value */}
          <div className={`asset-card metric-card live bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-emerald-500/30 transition-all duration-500`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <SparklesIcon className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Net Book Value</span>
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
              <p className="text-sm text-gray-400 mt-1">Complete listing of all registered fixed assets</p>
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
                  {mockAssets.map((asset, index) => (
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
                        <span className="text-sm text-white font-medium">
                          {asset.assetName}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`category-badge inline-flex px-2.5 py-1 rounded-md border ${getCategoryColor(asset.assetCategory)}`}>
                          {asset.assetCategory || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-400">
                          {new Date(asset.purchaseDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
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
                          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors group">
                            <PencilIcon className="h-4 w-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                          </button>
                          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors group">
                            <TrashIcon className="h-4 w-4 text-gray-500 group-hover:text-rose-400 transition-colors" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
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
              onClick={() => setShowAddModal(false)}
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
                    <p className="text-sm text-gray-400 mt-0.5">Register a new asset for depreciation tracking</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Asset Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Forklift - Toyota 8-Series"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Asset Number</label>
                    <input
                      type="text"
                      placeholder="e.g., EQ-2024-001"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all">
                      <option value="">Select category</option>
                      <option value="equipment">Equipment</option>
                      <option value="vehicles">Vehicles</option>
                      <option value="building">Building Improvements</option>
                      <option value="furniture">Furniture & Fixtures</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Purchase Cost</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Purchase Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Useful Life (Years)</label>
                    <input
                      type="number"
                      placeholder="10"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Salvage Value</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
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
                  onClick={() => setShowAddModal(false)}
                  className="bg-white/5 hover:bg-white/10 border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 border-0"
                >
                  Save Asset
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