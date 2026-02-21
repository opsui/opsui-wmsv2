/**
 * Budgeting & Forecasting Page
 *
 * Financial Observatory Aesthetic
 * A distinctive, data-centric design for budget management
 * Features: Staggered animations, variance visualizations, atmospheric depth
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
  ChartBarIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  ScaleIcon,
  CalendarIcon,
  SparklesIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface BudgetLine {
  accountId: string;
  accountName: string;
  accountCode: string;
  period: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
}

interface Budget {
  budgetId: string;
  budgetName: string;
  fiscalYear: number;
  budgetType: string;
  status: string;
}

// ============================================================================
// ANIMATION STYLES (inline for this page)
// ============================================================================

const pageStyles = `
  /* Staggered entrance animation */
  @keyframes budget-stagger-in {
    from {
      opacity: 0;
      transform: translateY(28px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Number reveal animation */
  @keyframes number-reveal {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Variance bar animation */
  @keyframes variance-bar-fill {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }

  /* Decorative line reveal */
  @keyframes observatory-line-reveal {
    from {
      width: 0;
      opacity: 0;
    }
    to {
      width: 100%;
      opacity: 1;
    }
  }

  /* Subtle pulse for live data */
  @keyframes observatory-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.3);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
    }
  }

  /* Floating data point */
  @keyframes data-float {
    0%, 100% {
      transform: translateY(0) scale(1);
      opacity: 0.6;
    }
    50% {
      transform: translateY(-10px) scale(1.1);
      opacity: 1;
    }
  }

  /* Budget card styling */
  .budget-card {
    animation: budget-stagger-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  .budget-card:nth-child(1) { animation-delay: 0.05s; }
  .budget-card:nth-child(2) { animation-delay: 0.1s; }
  .budget-card:nth-child(3) { animation-delay: 0.15s; }
  .budget-card:nth-child(4) { animation-delay: 0.2s; }
  .budget-card:nth-child(5) { animation-delay: 0.25s; }
  .budget-card:nth-child(6) { animation-delay: 0.3s; }

  /* Metric card with gold accent */
  .metric-card-observatory {
    position: relative;
  }

  .metric-card-observatory::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.6), transparent);
    animation: observatory-line-reveal 0.8s ease-out 0.4s backwards;
  }

  .metric-card-observatory.gold::before {
    background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.7), transparent);
  }

  .metric-card-observatory.cyan::before {
    background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.7), transparent);
  }

  .metric-card-observatory.emerald::before {
    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.7), transparent);
  }

  .metric-card-observatory.rose::before {
    background: linear-gradient(90deg, transparent, rgba(244, 63, 94, 0.7), transparent);
  }

  /* Live indicator pulse */
  .live-indicator {
    animation: observatory-pulse 2s ease-in-out infinite;
  }

  /* Number reveal */
  .number-reveal {
    animation: number-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  .number-reveal:nth-child(1) { animation-delay: 0.15s; }
  .number-reveal:nth-child(2) { animation-delay: 0.2s; }
  .number-reveal:nth-child(3) { animation-delay: 0.25s; }
  .number-reveal:nth-child(4) { animation-delay: 0.3s; }

  /* Variance bar */
  .variance-bar {
    transform-origin: left center;
    animation: variance-bar-fill 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  /* Account code styling - monospace */
  .account-code {
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.05em;
  }

  /* Category label - bold tracking */
  .category-label {
    font-family: 'Archivo', sans-serif;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 0.65rem;
  }

  /* Page title - editorial serif */
  .page-title-observatory {
    font-family: 'DM Serif Display', Georgia, serif;
    letter-spacing: -0.02em;
  }

  /* Atmospheric background */
  .observatory-atmosphere {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .observatory-atmosphere::before {
    content: '';
    position: absolute;
    top: 0%;
    right: 5%;
    width: 50%;
    height: 50%;
    background: radial-gradient(ellipse at center, rgba(251, 191, 36, 0.08) 0%, transparent 60%);
    filter: blur(60px);
    animation: data-float 15s ease-in-out infinite;
  }

  .observatory-atmosphere::after {
    content: '';
    position: absolute;
    bottom: 10%;
    left: 0%;
    width: 40%;
    height: 40%;
    background: radial-gradient(ellipse at center, rgba(6, 182, 212, 0.06) 0%, transparent 60%);
    filter: blur(50px);
    animation: data-float 18s ease-in-out infinite reverse;
  }

  /* Light mode adjustments */
  html.light .observatory-atmosphere::before {
    background: radial-gradient(ellipse at center, rgba(251, 191, 36, 0.12) 0%, transparent 60%);
  }

  html.light .observatory-atmosphere::after {
    background: radial-gradient(ellipse at center, rgba(6, 182, 212, 0.08) 0%, transparent 60%);
  }

  /* Floating data points - decorative */
  .data-point {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(251, 191, 36, 0.4);
    animation: data-float 8s ease-in-out infinite;
  }

  /* Observatory corner accents */
  .observatory-corner {
    position: relative;
  }

  .observatory-corner::before,
  .observatory-corner::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-color: rgba(251, 191, 36, 0.4);
    border-style: solid;
    transition: all 0.3s ease;
  }

  .observatory-corner::before {
    top: -1px;
    left: -1px;
    border-width: 2px 0 0 2px;
    border-radius: 6px 0 0 0;
  }

  .observatory-corner::after {
    bottom: -1px;
    right: -1px;
    border-width: 0 2px 2px 0;
    border-radius: 0 0 6px 0;
  }

  .observatory-corner:hover::before,
  .observatory-corner:hover::after {
    border-color: rgba(251, 191, 36, 0.7);
    width: 28px;
    height: 28px;
  }

  /* Table row hover effect */
  .budget-row {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .budget-row:hover {
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(251, 191, 36, 0.04) 20%, 
      rgba(251, 191, 36, 0.06) 50%, 
      rgba(251, 191, 36, 0.04) 80%, 
      transparent 100%
    );
    transform: translateX(4px);
  }

  /* Floating action button */
  .fab-observatory {
    position: relative;
  }

  .fab-observatory::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(6, 182, 212, 0.3));
    opacity: 0;
    transition: opacity 0.3s ease;
    filter: blur(8px);
  }

  .fab-observatory:hover::before {
    opacity: 1;
  }

  /* Modal overlay with gradient */
  .modal-observatory {
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%);
    backdrop-filter: blur(8px);
  }

  /* Grain texture overlay */
  .grain-overlay-budget {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    opacity: 0.02;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }

  html.light .grain-overlay-budget {
    opacity: 0.015;
  }

  /* Variance indicator badge */
  .variance-badge {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  /* Hero metric display */
  .hero-metric-budget {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  /* Budget selector styling */
  .budget-selector {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    border: 1px solid rgba(251, 191, 36, 0.2);
    transition: all 0.3s ease;
  }

  .budget-selector:hover {
    border-color: rgba(251, 191, 36, 0.4);
  }

  .budget-selector:focus {
    border-color: rgba(251, 191, 36, 0.6);
    box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.15);
  }
`;

// ============================================================================
// MAIN PAGE
// ============================================================================

function BudgetingPage() {
  const navigate = useNavigate();

  // State
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Trigger animations after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mock data
  const mockBudgets: Budget[] = [
    {
      budgetId: 'BG-2024-001',
      budgetName: 'FY 2024 Operating Budget',
      fiscalYear: 2024,
      budgetType: 'ANNUAL',
      status: 'ACTIVE',
    },
    {
      budgetId: 'BG-2024-002',
      budgetName: 'FY 2024 Q1 Forecast',
      fiscalYear: 2024,
      budgetType: 'QUARTERLY',
      status: 'ACTIVE',
    },
    {
      budgetId: 'BG-2024-003',
      budgetName: 'FY 2024 Q2 Forecast',
      fiscalYear: 2024,
      budgetType: 'QUARTERLY',
      status: 'DRAFT',
    },
  ];

  const mockBudgetLines: BudgetLine[] = [
    // Revenue
    {
      accountId: 'ACT-4100',
      accountName: 'Sales Revenue',
      accountCode: '4100',
      period: '2024-01',
      budgetedAmount: 500000,
      actualAmount: 525000,
      variance: -25000,
      variancePercent: -5,
    },
    {
      accountId: 'ACT-4150',
      accountName: 'Service Revenue',
      accountCode: '4150',
      period: '2024-01',
      budgetedAmount: 150000,
      actualAmount: 162000,
      variance: -12000,
      variancePercent: -8,
    },
    {
      accountId: 'ACT-4200',
      accountName: 'Interest Income',
      accountCode: '4200',
      period: '2024-01',
      budgetedAmount: 5000,
      actualAmount: 5200,
      variance: -200,
      variancePercent: -4,
    },
    // Cost of Goods
    {
      accountId: 'ACT-5100',
      accountName: 'Cost of Goods Sold',
      accountCode: '5100',
      period: '2024-01',
      budgetedAmount: 300000,
      actualAmount: 290000,
      variance: 10000,
      variancePercent: 3.33,
    },
    {
      accountId: 'ACT-5120',
      accountName: 'Material Costs',
      accountCode: '5120',
      period: '2024-01',
      budgetedAmount: 180000,
      actualAmount: 175000,
      variance: 5000,
      variancePercent: 2.78,
    },
    // Operating Expenses
    {
      accountId: 'ACT-5200',
      accountName: 'Operating Expenses',
      accountCode: '5200',
      period: '2024-01',
      budgetedAmount: 80000,
      actualAmount: 85000,
      variance: -5000,
      variancePercent: -6.25,
    },
    {
      accountId: 'ACT-5210',
      accountName: 'Salaries & Wages',
      accountCode: '5210',
      period: '2024-01',
      budgetedAmount: 50000,
      actualAmount: 52000,
      variance: -2000,
      variancePercent: -4,
    },
    {
      accountId: 'ACT-5220',
      accountName: 'Rent & Utilities',
      accountCode: '5220',
      period: '2024-01',
      budgetedAmount: 15000,
      actualAmount: 14800,
      variance: 200,
      variancePercent: 1.33,
    },
    {
      accountId: 'ACT-5230',
      accountName: 'Marketing Expenses',
      accountCode: '5230',
      period: '2024-01',
      budgetedAmount: 12000,
      actualAmount: 14500,
      variance: -2500,
      variancePercent: -20.83,
    },
    {
      accountId: 'ACT-5240',
      accountName: 'Insurance',
      accountCode: '5240',
      period: '2024-01',
      budgetedAmount: 8000,
      actualAmount: 8000,
      variance: 0,
      variancePercent: 0,
    },
    {
      accountId: 'ACT-5250',
      accountName: 'Depreciation',
      accountCode: '5250',
      period: '2024-01',
      budgetedAmount: 6500,
      actualAmount: 6500,
      variance: 0,
      variancePercent: 0,
    },
    {
      accountId: 'ACT-5260',
      accountName: 'Travel & Entertainment',
      accountCode: '5260',
      period: '2024-01',
      budgetedAmount: 4500,
      actualAmount: 5200,
      variance: -700,
      variancePercent: -15.56,
    },
    {
      accountId: 'ACT-5270',
      accountName: 'Office Supplies',
      accountCode: '5270',
      period: '2024-01',
      budgetedAmount: 2500,
      actualAmount: 2100,
      variance: 400,
      variancePercent: 16,
    },
    {
      accountId: 'ACT-5280',
      accountName: 'Professional Fees',
      accountCode: '5280',
      period: '2024-01',
      budgetedAmount: 10000,
      actualAmount: 9500,
      variance: 500,
      variancePercent: 5,
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

  const totalBudgeted = mockBudgetLines.reduce((sum, l) => sum + l.budgetedAmount, 0);
  const totalActual = mockBudgetLines.reduce((sum, l) => sum + l.actualAmount, 0);
  const totalVariance = mockBudgetLines.reduce((sum, l) => sum + l.variance, 0);

  // Export to CSV
  const exportToCSV = () => {
    if (!selectedBudgetId) return;

    const budget = mockBudgets.find(b => b.budgetId === selectedBudgetId);
    const lines: string[] = [];

    lines.push(`BUDGET VS ACTUAL REPORT - ${budget?.budgetName}`);
    lines.push(`Fiscal Year: ${budget?.fiscalYear}`);
    lines.push('');

    lines.push('Account,Account Code,Budgeted,Actual,Variance,Variance %');
    mockBudgetLines.forEach(line => {
      lines.push(
        `${line.accountName},${line.accountCode},${line.budgetedAmount},` +
          `${line.actualAmount},${line.variance},${line.variancePercent.toFixed(2)}%`
      );
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-${budget?.budgetName?.toLowerCase().replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Get variance status
  const getVarianceStatus = (variancePercent: number): { label: string; color: string; icon: typeof ArrowTrendingUpIcon } => {
    const absVariance = Math.abs(variancePercent);
    if (absVariance <= 5) {
      return { label: 'On Track', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: ArrowTrendingUpIcon };
    } else if (absVariance <= 10) {
      return { label: 'Watch', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: ArrowTrendingDownIcon };
    } else {
      return { label: 'Alert', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: ArrowTrendingDownIcon };
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Inject page-specific styles */}
      <style>{pageStyles}</style>

      {/* Atmospheric background elements */}
      <div className="observatory-atmosphere" aria-hidden="true" />
      <div className="grain-overlay-budget" aria-hidden="true" />

      <Header />

      <main className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Header - Observatory Style */}
        <header className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Title Section */}
            <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <div className="p-3 bg-gradient-to-br from-amber-500/20 to-cyan-500/20 rounded-xl border border-amber-500/30">
                    <ChartBarIcon className="h-7 w-7 text-amber-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full live-indicator" />
                </div>
                <div>
                  <span className="category-label text-amber-400 tracking-widest">Financial Planning</span>
                </div>
              </div>
              <h1 className="page-title-observatory text-4xl lg:text-5xl text-white dark:text-white tracking-tight">
                Budgeting & Forecasting
              </h1>
              <p className="mt-3 text-lg text-gray-400 dark:text-gray-400 max-w-2xl">
                Analyze budget performance, track variances, and forecast financial outcomes
              </p>
            </div>

            {/* Action Buttons */}
            <div className={`flex flex-wrap items-center gap-3 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <Button
                variant="secondary"
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border-white/10 hover:border-amber-500/30 transition-all duration-300"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                variant="secondary"
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border-white/10 hover:border-amber-500/30 transition-all duration-300"
              >
                <PrinterIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <div className="fab-observatory">
                <Button
                  variant="primary"
                  onClick={() => setShowAddBudgetModal(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-cyan-600 hover:from-amber-500 hover:to-cyan-500 border-0 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>New Budget</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Budget Selection - Observatory Style */}
        <section className={`budget-card mb-8 transition-all duration-500 ${mounted ? '' : ''}`}>
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <EyeIcon className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <span className="category-label text-gray-400">Select Dataset</span>
                  <p className="text-xs text-gray-500 mt-0.5">Choose a budget to analyze</p>
                </div>
              </div>
              <div className="flex-1 sm:max-w-md">
                <select
                  id="budget-select"
                  value={selectedBudgetId}
                  onChange={e => setSelectedBudgetId(e.target.value)}
                  className="budget-selector w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-gray-400">Select a budget...</option>
                  {mockBudgets.map(budget => (
                    <option key={budget.budgetId} value={budget.budgetId} className="bg-slate-900 text-white">
                      {budget.budgetName} ({budget.fiscalYear})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Budget vs Actual Report */}
        {selectedBudgetId && !isLoading && (
          <div className="space-y-6">
            {/* Summary Stats - Observatory Cards */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {/* Total Budgeted */}
              <div className={`budget-card metric-card-observatory cyan bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-cyan-500/30 transition-all duration-500`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <ScaleIcon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Budgeted</span>
                </div>
                <p className="number-reveal hero-metric-budget text-3xl lg:text-4xl font-bold text-cyan-400">
                  {formatCurrency(totalBudgeted)}
                </p>
              </div>

              {/* Total Actual */}
              <div className={`budget-card metric-card-observatory gold bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-amber-500/30 transition-all duration-500`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <SparklesIcon className="h-5 w-5 text-amber-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Actual</span>
                </div>
                <p className="number-reveal hero-metric-budget text-3xl lg:text-4xl font-bold text-amber-400">
                  {formatCurrency(totalActual)}
                </p>
              </div>

              {/* Net Variance */}
              <div className={`budget-card metric-card-observatory ${totalVariance >= 0 ? 'emerald' : 'rose'} bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-${totalVariance >= 0 ? 'emerald' : 'rose'}-500/30 transition-all duration-500`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 ${totalVariance >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'} rounded-lg`}>
                    {totalVariance >= 0 ? (
                      <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-5 w-5 text-rose-400" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Net Variance</span>
                </div>
                <p className={`number-reveal hero-metric-budget text-3xl lg:text-4xl font-bold ${totalVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)}
                </p>
              </div>

              {/* Status */}
              <div className={`budget-card metric-card-observatory ${totalVariance >= 0 ? 'emerald' : 'rose'} bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 p-5 lg:p-6 hover:border-${totalVariance >= 0 ? 'emerald' : 'rose'}-500/30 transition-all duration-500`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 ${totalVariance >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'} rounded-lg`}>
                    <CalendarIcon className={`h-5 w-5 ${totalVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Budget Status</span>
                </div>
                <p className={`number-reveal hero-metric-budget text-3xl lg:text-4xl font-bold ${totalVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalVariance >= 0 ? 'Under' : 'Over'}
                </p>
              </div>
            </section>

            {/* Variance Table - Observatory Style */}
            <div className="budget-card observatory-corner bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-5 border-b border-white/10 bg-white/[0.02]">
                <h2 className="text-lg font-semibold text-white tracking-tight">Budget vs Actual Analysis</h2>
                <p className="text-sm text-gray-400 mt-1">Variance breakdown by account category</p>
              </div>

              {/* Table Content */}
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Budgeted
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Actual
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Variance
                      </th>
                      <th className="text-right py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        %
                      </th>
                      <th className="text-center py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mockBudgetLines.map((line, index) => {
                      const status = getVarianceStatus(line.variancePercent);
                      const StatusIcon = status.icon;
                      return (
                        <tr
                          key={index}
                          className="budget-row"
                          style={{ animationDelay: `${0.1 + index * 0.03}s` }}
                        >
                          <td className="py-4 px-6">
                            <span className="text-sm text-white font-medium">
                              {line.accountName}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="account-code text-sm text-gray-500">
                              {line.accountCode}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-sm text-cyan-400 font-mono">
                              {formatCurrency(line.budgetedAmount)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-sm text-amber-400 font-mono">
                              {formatCurrency(line.actualAmount)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className={`text-sm font-medium font-mono ${line.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {line.variance >= 0 ? '+' : ''}{formatCurrency(line.variance)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className={`variance-badge text-sm ${line.variancePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {line.variancePercent >= 0 ? '+' : ''}{line.variancePercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center">
                              <span className={`variance-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${status.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                <span className="text-xs">{status.label}</span>
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedBudgetId && (
          <div className="budget-card bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <div className="p-16 text-center">
              <div className="relative inline-block mb-6">
                <div className="p-4 bg-amber-500/10 rounded-2xl">
                  <ChartBarIcon className="h-12 w-12 text-amber-400/60" />
                </div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-500/30 rounded-full animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Select a Budget to Analyze</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Choose a budget from the dropdown above to view detailed variance analysis and financial performance metrics
              </p>
            </div>
          </div>
        )}

        {/* Add Budget Modal - Observatory Style */}
        {showAddBudgetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="modal-observatory absolute inset-0"
              onClick={() => setShowAddBudgetModal(false)}
              aria-hidden="true"
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <PlusIcon className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Create New Budget</h3>
                    <p className="text-sm text-gray-400 mt-0.5">Define a new financial planning period</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Budget Name</label>
                  <input
                    type="text"
                    placeholder="e.g., FY 2025 Operating Budget"
                    className="budget-selector w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Fiscal Year</label>
                    <select className="budget-selector w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all cursor-pointer">
                      <option className="bg-slate-900">2024</option>
                      <option className="bg-slate-900">2025</option>
                      <option className="bg-slate-900">2026</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Budget Type</label>
                    <select className="budget-selector w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all cursor-pointer">
                      <option className="bg-slate-900">Annual</option>
                      <option className="bg-slate-900">Quarterly</option>
                      <option className="bg-slate-900">Monthly</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                  <textarea
                    placeholder="Brief description of this budget..."
                    rows={3}
                    className="budget-selector w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowAddBudgetModal(false)}
                  className="bg-white/5 hover:bg-white/10 border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowAddBudgetModal(false)}
                  className="bg-gradient-to-r from-amber-600 to-cyan-600 hover:from-amber-500 hover:to-cyan-500 border-0"
                >
                  Create Budget
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default BudgetingPage;