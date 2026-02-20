/**
 * Exceptions Management Page
 *
 * Supervisor dashboard for viewing and resolving order exceptions
 *
 * ============================================================================
 * AESTHETIC DIRECTION: ALERT OPS - INDUSTRIAL ALERT CENTER
 * ============================================================================
 * High-urgency design with distinctive character:
 * - JetBrains Mono + Archivo typography pairing (industrial/technical)
 * - Staggered entrance animations with visible delays
 * - Pulsing glow indicators for open exceptions
 * - Dramatic red/amber accent system with glow effects
 * - Atmospheric depth with gradient overlays and grain texture
 * - Grid-breaking hero stat with asymmetric layout
 * ============================================================================
 */

import {
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Header,
  Pagination,
} from '@/components/shared';
import {
  useExceptions,
  useExceptionSummary,
  useOpenExceptions,
  useResolveException,
} from '@/services/api';
import { useAuthStore } from '@/stores';
import {
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  ExceptionResolution,
  ExceptionStatus,
  ExceptionType,
  type OrderException,
} from '@opsui/shared';
import { useEffect, useState } from 'react';

// ============================================================================
// CSS VARIABLES FOR EXCEPTION THEME (injected via style tag)
// ============================================================================
const exceptionThemeStyles = `
  :root {
    --exception-bg-primary: #0c0f1a;
    --exception-bg-secondary: #111827;
    --exception-accent-urgent: #ef4444;
    --exception-accent-warning: #f59e0b;
    --exception-accent-success: #22c55e;
    --exception-accent-info: #3b82f6;
    --exception-glow-urgent: 0 0 30px rgba(239, 68, 68, 0.4);
    --exception-glow-warning: 0 0 30px rgba(245, 158, 11, 0.4);
    --exception-glow-success: 0 0 30px rgba(34, 197, 94, 0.4);
    --exception-border-subtle: rgba(255, 255, 255, 0.06);
    --exception-border-accent: rgba(168, 85, 247, 0.3);
  }

  /* Staggered entrance animations */
  @keyframes exception-stagger-in {
    0% {
      opacity: 0;
      transform: translateX(-20px) scale(0.98);
    }
    100% {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  @keyframes exception-scale-in {
    0% {
      opacity: 0;
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes pulse-glow-urgent {
    0%, 100% {
      box-shadow: 0 0 5px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.2);
    }
    50% {
      box-shadow: 0 0 15px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.3);
    }
  }

  @keyframes pulse-dot {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.5);
      opacity: 0.7;
    }
  }

  @keyframes hero-stat-glow {
    0%, 100% {
      filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.3));
    }
    50% {
      filter: drop-shadow(0 0 40px rgba(239, 68, 68, 0.5));
    }
  }

  @keyframes scan-line {
    0% {
      transform: translateY(-100%);
    }
    100% {
      transform: translateY(100vh);
    }
  }

  @keyframes grain-shift {
    0%, 100% { transform: translate(0, 0); }
    10% { transform: translate(-5%, -10%); }
    20% { transform: translate(-15%, 5%); }
    30% { transform: translate(7%, -25%); }
    40% { transform: translate(-5%, 25%); }
    50% { transform: translate(-15%, 10%); }
    60% { transform: translate(15%, 0%); }
    70% { transform: translate(0%, 15%); }
    80% { transform: translate(3%, 35%); }
    90% { transform: translate(-10%, 10%); }
  }

  .exception-stagger-item {
    animation: exception-stagger-in 0.5s ease-out forwards;
    opacity: 0;
  }

  .exception-stagger-item:nth-child(1) { animation-delay: 0ms; }
  .exception-stagger-item:nth-child(2) { animation-delay: 50ms; }
  .exception-stagger-item:nth-child(3) { animation-delay: 100ms; }
  .exception-stagger-item:nth-child(4) { animation-delay: 150ms; }
  .exception-stagger-item:nth-child(5) { animation-delay: 200ms; }
  .exception-stagger-item:nth-child(6) { animation-delay: 250ms; }
  .exception-stagger-item:nth-child(7) { animation-delay: 300ms; }
  .exception-stagger-item:nth-child(8) { animation-delay: 350ms; }
  .exception-stagger-item:nth-child(9) { animation-delay: 400ms; }
  .exception-stagger-item:nth-child(10) { animation-delay: 450ms; }

  .exception-card-animate {
    animation: exception-scale-in 0.4s ease-out forwards;
    opacity: 0;
  }

  .pulse-glow-urgent {
    animation: pulse-glow-urgent 2s ease-in-out infinite;
  }

  .pulse-dot {
    animation: pulse-dot 1.5s ease-in-out infinite;
  }

  .hero-stat-glow {
    animation: hero-stat-glow 3s ease-in-out infinite;
  }

  /* Industrial typography */
  .exception-display-font {
    font-family: 'Archivo', sans-serif;
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  .exception-mono-font {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .exception-body-font {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 500;
  }

  /* Atmospheric background */
  .exception-atmosphere {
    position: relative;
  }

  .exception-atmosphere::before {
    content: '';
    position: fixed;
    inset: 0;
    background: 
      radial-gradient(ellipse at 20% 0%, rgba(239, 68, 68, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(245, 158, 11, 0.06) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(168, 85, 247, 0.04) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* Grain texture overlay */
  .exception-grain {
    position: relative;
  }

  .exception-grain::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.03;
    pointer-events: none;
    z-index: 1;
    animation: grain-shift 8s steps(10) infinite;
  }

  /* Scan line effect */
  .exception-scan-line {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.5) 50%, transparent 100%);
    animation: scan-line 8s linear infinite;
    pointer-events: none;
    z-index: 100;
    opacity: 0.5;
  }

  /* Industrial corner accents */
  .exception-card-industrial {
    position: relative;
    border: 1px solid var(--exception-border-subtle);
    background: linear-gradient(145deg, rgba(17, 24, 39, 0.95) 0%, rgba(12, 15, 26, 0.98) 100%);
  }

  .exception-card-industrial::before,
  .exception-card-industrial::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-style: solid;
    border-color: rgba(168, 85, 247, 0.4);
    transition: border-color 0.3s ease;
  }

  .exception-card-industrial::before {
    top: -1px;
    left: -1px;
    border-width: 2px 0 0 2px;
    border-radius: 4px 0 0 0;
  }

  .exception-card-industrial::after {
    bottom: -1px;
    right: -1px;
    border-width: 0 2px 2px 0;
    border-radius: 0 0 4px 0;
  }

  .exception-card-industrial:hover::before,
  .exception-card-industrial:hover::after {
    border-color: rgba(168, 85, 247, 0.7);
  }

  /* Hero stat card - breaks the grid */
  .exception-hero-stat {
    position: relative;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(17, 24, 39, 0.95) 100%);
    border: 2px solid rgba(239, 68, 68, 0.3);
    overflow: visible;
  }

  .exception-hero-stat::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, transparent 50%, transparent 100%);
    border-radius: inherit;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .exception-hero-stat:hover::before {
    opacity: 1;
  }

  /* Urgent badge glow */
  .exception-badge-urgent {
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.2);
  }

  /* Type-specific glow effects */
  .exception-type-glow-damage {
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  }

  .exception-type-glow-warning {
    text-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
  }

  /* Filter button active state */
  .exception-filter-active {
    position: relative;
    overflow: hidden;
  }

  .exception-filter-active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 2px;
    background: currentColor;
    border-radius: 1px;
  }

  /* Resolution option hover effect */
  .exception-resolution-option {
    transition: all 0.2s ease;
  }

  .exception-resolution-option:hover {
    transform: translateX(4px);
  }

  /* Modal backdrop industrial */
  .exception-modal-backdrop {
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
  }

  /* Accent divider */
  .exception-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.3) 50%, transparent 100%);
  }

  /* Status indicator dot */
  .exception-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .exception-status-dot-open {
    background: #ef4444;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  }

  .exception-status-dot-resolved {
    background: #22c55e;
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
  }

  /* Asymmetric hero section */
  .exception-hero-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .exception-hero-grid {
      grid-template-columns: 1.5fr 1fr 1fr 1fr;
    }
  }

  /* Quantity display mono */
  .exception-quantity {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* Light mode overrides */
  html.light .exception-atmosphere::before {
    background: 
      radial-gradient(ellipse at 20% 0%, rgba(239, 68, 68, 0.05) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(245, 158, 11, 0.04) 0%, transparent 50%);
  }

  html.light .exception-card-industrial {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
    border-color: rgba(0, 0, 0, 0.08);
  }

  html.light .exception-hero-stat {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(255, 255, 255, 0.98) 100%);
  }
`;

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function ExceptionBadge({ status }: { status: ExceptionStatus }) {
  const statusConfig: Record<ExceptionStatus, { color: string; label: string; glow?: string }> = {
    [ExceptionStatus.OPEN]: {
      color: 'bg-red-500/20 text-red-400 border border-red-500/40',
      label: 'OPEN',
      glow: 'exception-badge-urgent pulse-glow-urgent',
    },
    [ExceptionStatus.REVIEWING]: {
      color: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
      label: 'REVIEWING',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    },
    [ExceptionStatus.APPROVED]: {
      color: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
      label: 'APPROVED',
    },
    [ExceptionStatus.REJECTED]: {
      color: 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
      label: 'REJECTED',
    },
    [ExceptionStatus.RESOLVED]: {
      color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
      label: 'RESOLVED',
    },
    [ExceptionStatus.CANCELLED]: {
      color: 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
      label: 'CANCELLED',
    },
  };

  const config = statusConfig[status] || statusConfig[ExceptionStatus.OPEN];

  return (
    <span
      className={`px-2.5 py-1 rounded-md text-[0.65rem] font-bold uppercase tracking-wider exception-mono-font ${config.color} ${config.glow || ''}`}
    >
      {config.label}
    </span>
  );
}

function ExceptionTypeBadge({ type }: { type: ExceptionType }) {
  const typeConfig: Record<
    ExceptionType,
    { icon: any; color: string; label: string; glowClass?: string }
  > = {
    [ExceptionType.UNCLAIM]: {
      icon: XMarkIcon,
      color: 'text-gray-400',
      label: 'Unclaimed',
    },
    [ExceptionType.UNDO_PICK]: {
      icon: ArrowUturnLeftIcon,
      color: 'text-amber-400',
      label: 'Undo Pick',
      glowClass: 'exception-type-glow-warning',
    },
    [ExceptionType.SHORT_PICK]: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-400',
      label: 'Short Pick',
      glowClass: 'exception-type-glow-damage',
    },
    [ExceptionType.SHORT_PICK_BACKORDER]: {
      icon: ClockIcon,
      color: 'text-amber-400',
      label: 'Backorder',
      glowClass: 'exception-type-glow-warning',
    },
    [ExceptionType.DAMAGE]: {
      icon: ExclamationCircleIcon,
      color: 'text-red-400',
      label: 'Damaged',
      glowClass: 'exception-type-glow-damage',
    },
    [ExceptionType.DEFECTIVE]: {
      icon: ExclamationCircleIcon,
      color: 'text-red-400',
      label: 'Defective',
      glowClass: 'exception-type-glow-damage',
    },
    [ExceptionType.WRONG_ITEM]: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-400',
      label: 'Wrong Item',
      glowClass: 'exception-type-glow-damage',
    },
    [ExceptionType.SUBSTITUTION]: {
      icon: InformationCircleIcon,
      color: 'text-blue-400',
      label: 'Substitution',
    },
    [ExceptionType.OUT_OF_STOCK]: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-400',
      label: 'Out of Stock',
      glowClass: 'exception-type-glow-damage',
    },
    [ExceptionType.BIN_MISMATCH]: {
      icon: ExclamationTriangleIcon,
      color: 'text-amber-400',
      label: 'Bin Mismatch',
      glowClass: 'exception-type-glow-warning',
    },
    [ExceptionType.BARCODE_MISMATCH]: {
      icon: ExclamationTriangleIcon,
      color: 'text-amber-400',
      label: 'Barcode Issue',
      glowClass: 'exception-type-glow-warning',
    },
    [ExceptionType.EXPIRED]: {
      icon: ExclamationTriangleIcon,
      color: 'text-red-400',
      label: 'Expired',
      glowClass: 'exception-type-glow-damage',
    },
    [ExceptionType.OTHER]: {
      icon: InformationCircleIcon,
      color: 'text-gray-400',
      label: 'Other',
    },
  };

  const config = typeConfig[type] || typeConfig[ExceptionType.OTHER];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-md bg-white/5 ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span
        className={`text-xs font-semibold uppercase tracking-wide exception-mono-font ${config.color} ${config.glowClass || ''}`}
      >
        {config.label}
      </span>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExceptionsPage() {
  const canSupervise = useAuthStore(state => state.canSupervise);
  const [selectedException, setSelectedException] = useState<OrderException | null>(null);
  const [filterStatus, setFilterStatus] = useState<ExceptionStatus | 'all'>('all');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState<ExceptionResolution>(ExceptionResolution.BACKORDER);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [substituteSku, setSubstituteSku] = useState('');
  const [newQuantity, setNewQuantity] = useState(0);
  const [newBinLocation, setNewBinLocation] = useState('');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch exceptions
  const { data: allExceptions, refetch: refetchAll } = useExceptions(
    filterStatus === 'all'
      ? { limit: 20, offset: (page - 1) * 20 }
      : { status: filterStatus, limit: 20, offset: (page - 1) * 20 }
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    refetchAll();
    refetchOpen();
  }, [filterStatus, searchQuery]);

  const { data: openExceptions, refetch: refetchOpen } = useOpenExceptions();
  const {
    data: summary,
    refetch: refetchSummary,
    isLoading: summaryLoading,
  } = useExceptionSummary();

  const resolveMutation = useResolveException();

  // In report mode, allow all authenticated users to report problems
  // Otherwise, require supervisor/admin access
  if (!canSupervise()) {
    return (
      <div className="flex items-center justify-center min-h-screen exception-atmosphere exception-grain">
        <style>{exceptionThemeStyles}</style>
        <Card className="max-w-md exception-card-industrial">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center pulse-glow-urgent">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 exception-display-font">
              Access Denied
            </h2>
            <p className="text-gray-400 exception-body-font">
              Supervisor or admin privileges required to access the Exception Control Center.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleResolve = async () => {
    if (!selectedException) return;

    try {
      await resolveMutation.mutateAsync({
        exceptionId: selectedException.exceptionId,
        dto: {
          exceptionId: selectedException.exceptionId,
          resolution,
          notes: resolutionNotes,
          resolvedBy: 'current-user', // Would come from auth store
          substituteSku: resolution === ExceptionResolution.SUBSTITUTE ? substituteSku : undefined,
          newQuantity: resolution === ExceptionResolution.ADJUST_QUANTITY ? newQuantity : undefined,
          newBinLocation:
            resolution === ExceptionResolution.TRANSFER_BIN ? newBinLocation : undefined,
        },
      });

      // Refetch data
      refetchAll();
      refetchOpen();
      refetchSummary();

      setShowResolveModal(false);
      setSelectedException(null);
      setResolutionNotes('');
      setSubstituteSku('');
      setNewQuantity(0);
      setNewBinLocation('');
    } catch (error) {
      console.error('Failed to resolve exception:', error);
    }
  };

  const getResolutionOptions = (exceptionType: ExceptionType) => {
    const commonOptions = [
      {
        value: ExceptionResolution.CANCEL_ITEM,
        label: 'Cancel Item',
        description: 'Remove this item from the order',
      },
      {
        value: ExceptionResolution.CANCEL_ORDER,
        label: 'Cancel Order',
        description: 'Cancel the entire order',
      },
      {
        value: ExceptionResolution.CONTACT_CUSTOMER,
        label: 'Contact Customer',
        description: 'Reach out to customer for guidance',
      },
      {
        value: ExceptionResolution.MANUAL_OVERRIDE,
        label: 'Manual Override',
        description: 'Manually resolve without automated action',
      },
    ];

    const typeSpecificOptions: Record<ExceptionType, typeof commonOptions> = {
      [ExceptionType.UNCLAIM]: [
        {
          value: ExceptionResolution.MANUAL_OVERRIDE,
          label: 'Re-assign Order',
          description: 'Assign order to a different picker/packer',
        },
        {
          value: ExceptionResolution.CONTACT_CUSTOMER,
          label: 'Investigate Issue',
          description: 'Review the unclaim reason and follow up',
        },
        {
          value: ExceptionResolution.CANCEL_ORDER,
          label: 'Cancel Order',
          description: 'Cancel the order if needed',
        },
        {
          value: ExceptionResolution.MANUAL_OVERRIDE,
          label: 'Archive',
          description: 'Mark as reviewed and close',
        },
      ],
      [ExceptionType.SHORT_PICK]: [
        {
          value: ExceptionResolution.BACKORDER,
          label: 'Backorder',
          description: 'Place item on backorder',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Offer substitute product',
        },
        {
          value: ExceptionResolution.ADJUST_QUANTITY,
          label: 'Adjust Quantity',
          description: 'Update quantity to what is available',
        },
        ...commonOptions,
      ],
      [ExceptionType.SHORT_PICK_BACKORDER]: [
        {
          value: ExceptionResolution.BACKORDER,
          label: 'Backorder',
          description: 'Confirm backorder for customer',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Offer substitute product instead',
        },
        {
          value: ExceptionResolution.CANCEL_ITEM,
          label: 'Cancel Item',
          description: 'Remove this item from order',
        },
        ...commonOptions.filter(o => o.value !== ExceptionResolution.CANCEL_ITEM),
      ],
      [ExceptionType.DAMAGE]: [
        {
          value: ExceptionResolution.RETURN_TO_STOCK,
          label: 'Return to Stock',
          description: 'Return item if salvageable',
        },
        {
          value: ExceptionResolution.WRITE_OFF,
          label: 'Write Off',
          description: 'Write off damaged item',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Send replacement item',
        },
        ...commonOptions,
      ],
      [ExceptionType.DEFECTIVE]: [
        {
          value: ExceptionResolution.RETURN_TO_STOCK,
          label: 'Return to Stock',
          description: 'Return for RMA if applicable',
        },
        {
          value: ExceptionResolution.WRITE_OFF,
          label: 'Write Off',
          description: 'Write off defective item',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Send replacement item',
        },
        ...commonOptions,
      ],
      [ExceptionType.WRONG_ITEM]: [
        {
          value: ExceptionResolution.TRANSFER_BIN,
          label: 'Transfer Bin',
          description: 'Move item to correct bin location',
        },
        {
          value: ExceptionResolution.RETURN_TO_STOCK,
          label: 'Return to Stock',
          description: 'Return item to inventory',
        },
        ...commonOptions,
      ],
      [ExceptionType.SUBSTITUTION]: [
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Confirm Substitution',
          description: 'Process the substitution',
        },
        ...commonOptions,
      ],
      [ExceptionType.OUT_OF_STOCK]: [
        {
          value: ExceptionResolution.BACKORDER,
          label: 'Backorder',
          description: 'Place on backorder',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Offer alternative product',
        },
        {
          value: ExceptionResolution.CANCEL_ITEM,
          label: 'Cancel Item',
          description: 'Remove item from order',
        },
        ...commonOptions.filter(o => o.value !== ExceptionResolution.CANCEL_ITEM),
      ],
      [ExceptionType.BIN_MISMATCH]: [
        {
          value: ExceptionResolution.TRANSFER_BIN,
          label: 'Transfer Bin',
          description: 'Update to correct bin location',
        },
        {
          value: ExceptionResolution.RETURN_TO_STOCK,
          label: 'Return to Stock',
          description: 'Return item for proper stocking',
        },
        ...commonOptions,
      ],
      [ExceptionType.BARCODE_MISMATCH]: [
        {
          value: ExceptionResolution.MANUAL_OVERRIDE,
          label: 'Manual Override',
          description: 'Manually verify and correct',
        },
        ...commonOptions,
      ],
      [ExceptionType.EXPIRED]: [
        {
          value: ExceptionResolution.WRITE_OFF,
          label: 'Write Off',
          description: 'Dispose of expired item',
        },
        {
          value: ExceptionResolution.SUBSTITUTE,
          label: 'Substitute',
          description: 'Send fresh replacement',
        },
        ...commonOptions,
      ],
      [ExceptionType.UNDO_PICK]: [
        {
          value: ExceptionResolution.MANUAL_OVERRIDE,
          label: 'Acknowledge',
          description: 'Acknowledge the undo pick action',
        },
        {
          value: ExceptionResolution.RETURN_TO_STOCK,
          label: 'Return to Stock',
          description: 'Return item to inventory',
        },
        ...commonOptions,
      ],
      [ExceptionType.OTHER]: commonOptions,
    };

    return typeSpecificOptions[exceptionType] || commonOptions;
  };

  const displayExceptions =
    filterStatus === ExceptionStatus.OPEN
      ? openExceptions?.exceptions || []
      : allExceptions?.exceptions || [];

  // Filter exceptions based on search
  const filteredExceptions = displayExceptions.filter((exc: OrderException) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      exc.exceptionId?.toLowerCase().includes(query) ||
      exc.orderId?.toLowerCase().includes(query) ||
      exc.sku?.toLowerCase().includes(query) ||
      exc.type?.toLowerCase().includes(query) ||
      exc.status?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen exception-atmosphere exception-grain">
      {/* Inject theme styles */}
      <style>{exceptionThemeStyles}</style>

      {/* Scan line effect */}
      <div className="exception-scan-line" />

      <Header />
      <main className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Exception Management Interface */}
        {canSupervise() && (
          <>
            {/* Page Header - Industrial Title */}
            <div className="exception-stagger-item">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Status indicator dot */}
                    {summary && summary.open > 0 && (
                      <div className="exception-status-dot exception-status-dot-open pulse-dot" />
                    )}
                    <h1 className="text-4xl sm:text-5xl text-white exception-display-font">
                      EXCEPTION<span className="text-red-400">.</span>CONTROL
                    </h1>
                  </div>
                  <p className="text-gray-400 exception-body-font text-lg">
                    Industrial Exception Management Center — Monitor, Investigate, Resolve
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      refetchAll();
                      refetchOpen();
                      refetchSummary();
                    }}
                    className="exception-card-industrial !bg-transparent"
                  >
                    <ClockIcon className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Asymmetric Hero Stats - Grid Breaking Layout */}
            {summary && (
              <div className="exception-hero-grid">
                {/* Hero Stat - Open Exceptions (larger, prominent) */}
                <Card className="exception-hero-stat hero-stat-glow exception-stagger-item overflow-hidden">
                  <CardContent className="p-8 relative">
                    {/* Decorative background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full blur-3xl" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500 rounded-full blur-3xl" />
                    </div>

                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="exception-status-dot exception-status-dot-open pulse-dot" />
                        <p className="text-xs font-bold uppercase tracking-widest text-red-400 exception-mono-font">
                          CRITICAL / OPEN
                        </p>
                      </div>
                      <p className="text-7xl sm:text-8xl font-black text-white exception-display-font leading-none mb-2">
                        {summary.open}
                      </p>
                      <p className="text-gray-500 exception-body-font">
                        Require immediate attention
                      </p>

                      {/* Urgency indicator bar */}
                      <div className="mt-6 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${summary.total > 0 ? (summary.open / summary.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Secondary Stats */}
                <Card className="exception-card-industrial exception-stagger-item">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
                        <ExclamationTriangleIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-4xl font-black text-white exception-display-font">
                      {summary.total}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-gray-500 exception-mono-font mt-1">
                      Total Exceptions
                    </p>
                  </CardContent>
                </Card>

                <Card className="exception-card-industrial exception-stagger-item">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-4xl font-black text-emerald-400 exception-display-font">
                      {summary.resolved}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-gray-500 exception-mono-font mt-1">
                      Resolved
                    </p>
                  </CardContent>
                </Card>

                <Card className="exception-card-industrial exception-stagger-item">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <InformationCircleIcon className="h-4 w-4 text-purple-400" />
                      </div>
                    </div>
                    <p className="text-4xl font-black text-purple-400 exception-display-font">
                      {summary.total > 0 ? Math.round((summary.resolved / summary.total) * 100) : 0}
                      %
                    </p>
                    <p className="text-xs uppercase tracking-wider text-gray-500 exception-mono-font mt-1">
                      Resolution Rate
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Type Breakdown - Industrial Grid */}
            {!summaryLoading && summary && Object.keys(summary.byType).length > 0 && (
              <Card className="exception-card-industrial exception-stagger-item">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-400 exception-mono-font">
                    Exception Distribution by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Object.entries(summary.byType).map(
                      ([type, count]: [string, unknown], index: number) => (
                        <div
                          key={type}
                          className="exception-card-animate group p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-purple-500/30 hover:bg-purple-500/5 transition-all duration-300 cursor-default"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <p className="text-2xl font-black text-white exception-display-font group-hover:text-purple-300 transition-colors">
                            {count as number}
                          </p>
                          <p className="text-[0.65rem] uppercase tracking-wide text-gray-500 exception-mono-font mt-1 truncate">
                            {type.replace(/_/g, ' ')}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filter Tabs - Industrial Buttons */}
            <div className="flex flex-wrap gap-2 exception-stagger-item">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider exception-mono-font transition-all duration-200 ${
                  filterStatus === 'all'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25 exception-filter-active'
                    : 'exception-card-industrial text-gray-400 hover:text-white hover:border-purple-500/30'
                }`}
              >
                All ({summary?.total || 0})
              </button>
              <button
                onClick={() => setFilterStatus(ExceptionStatus.OPEN)}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider exception-mono-font transition-all duration-200 ${
                  filterStatus === ExceptionStatus.OPEN
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/25 exception-filter-active'
                    : 'exception-card-industrial text-gray-400 hover:text-red-400 hover:border-red-500/30'
                }`}
              >
                <span className="flex items-center gap-2">
                  {summary && summary.open > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-400 pulse-dot" />
                  )}
                  Open ({summary?.open || 0})
                </span>
              </button>
              <button
                onClick={() => setFilterStatus(ExceptionStatus.RESOLVED)}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider exception-mono-font transition-all duration-200 ${
                  filterStatus === ExceptionStatus.RESOLVED
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 exception-filter-active'
                    : 'exception-card-industrial text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30'
                }`}
              >
                Resolved ({summary?.resolved || 0})
              </button>
            </div>

            {/* Exceptions List */}
            <Card className="exception-card-industrial exception-stagger-item">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-400 exception-mono-font">
                    {filterStatus === 'all'
                      ? 'ALL EXCEPTIONS'
                      : filterStatus === ExceptionStatus.OPEN
                        ? 'OPEN EXCEPTIONS — ACTION REQUIRED'
                        : 'RESOLVED EXCEPTIONS'}
                  </CardTitle>
                  {/* Search Exceptions Filter */}
                  <div className="relative w-full sm:w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search by ID, Order, SKU..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.02] border border-white/[0.08] rounded-lg text-sm text-white placeholder-gray-600 exception-mono-font focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] transition-all"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredExceptions.length > 0 ? (
                  <div className="space-y-3">
                    {filteredExceptions.map((exception: OrderException, index: number) => {
                      const isOpen = exception.status === ExceptionStatus.OPEN;
                      return (
                        <div
                          key={exception.exceptionId}
                          className={`exception-card-animate group relative p-5 rounded-xl transition-all duration-300 ${
                            isOpen
                              ? 'exception-card-industrial pulse-glow-urgent hover:border-red-500/50'
                              : 'exception-card-industrial hover:border-purple-500/30'
                          }`}
                          style={{ animationDelay: `${index * 75}ms` }}
                        >
                          {/* Status indicator strip */}
                          {isOpen && (
                            <div className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-red-500 to-amber-500 rounded-r-full" />
                          )}

                          {/* Header row with badges and ID */}
                          <div className="flex flex-wrap items-center gap-3 mb-4 pl-3">
                            <ExceptionTypeBadge type={exception.type} />
                            <ExceptionBadge status={exception.status} />
                            <span className="text-[0.65rem] text-gray-600 exception-mono-font ml-auto">
                              #{exception.exceptionId}
                            </span>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pl-3">
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-wider text-gray-600 exception-mono-font mb-1">
                                Order
                              </p>
                              <p className="text-sm font-semibold text-white exception-mono-font truncate">
                                {exception.orderId}
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-wider text-gray-600 exception-mono-font mb-1">
                                SKU
                              </p>
                              <p className="text-sm font-semibold text-white exception-mono-font truncate">
                                {exception.sku}
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-wider text-gray-600 exception-mono-font mb-1">
                                Quantity
                              </p>
                              <p className="text-sm text-white exception-quantity">
                                <span className="text-red-400">{exception.quantityActual}</span>
                                <span className="text-gray-600 mx-1">/</span>
                                <span>{exception.quantityExpected}</span>
                                {exception.quantityShort > 0 && (
                                  <span className="text-red-400 ml-1">
                                    (-{exception.quantityShort})
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.65rem] uppercase tracking-wider text-gray-600 exception-mono-font mb-1">
                                Reported
                              </p>
                              <p className="text-sm text-gray-400 exception-mono-font">
                                {new Date(exception.reportedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {exception.reason && (
                            <div className="mt-4 ml-3 p-3 rounded-lg bg-white/[0.02] border-l-2 border-purple-500/50">
                              <p className="text-xs text-gray-400 exception-body-font italic">
                                "{exception.reason}"
                              </p>
                            </div>
                          )}

                          {exception.resolution && (
                            <div className="mt-4 ml-3 flex flex-wrap items-center gap-2">
                              <span className="text-[0.65rem] uppercase tracking-wider text-gray-600 exception-mono-font">
                                Resolution:
                              </span>
                              <span className="text-xs font-semibold text-emerald-400 exception-mono-font">
                                {exception.resolution.replace(/_/g, ' ')}
                              </span>
                            </div>
                          )}

                          {exception.resolutionNotes && (
                            <div className="mt-3 ml-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                              <p className="text-xs text-emerald-300 exception-body-font">
                                {exception.resolutionNotes}
                              </p>
                            </div>
                          )}

                          {/* Resolve button */}
                          {isOpen && (
                            <div className="mt-5 ml-3">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedException(exception);
                                  setShowResolveModal(true);
                                  setResolution(ExceptionResolution.BACKORDER);
                                  setResolutionNotes('');
                                  setSubstituteSku('');
                                  setNewQuantity(0);
                                  setNewBinLocation('');
                                }}
                                className="bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-400 hover:to-amber-400 text-white font-bold uppercase text-xs tracking-wider exception-mono-font shadow-lg shadow-red-500/25"
                              >
                                Resolve Exception
                                <ChevronRightIcon className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                      <CheckCircleIcon className="h-10 w-10 text-emerald-400" />
                    </div>
                    <p className="text-lg font-semibold text-white exception-display-font mb-2">
                      All Clear
                    </p>
                    <p className="text-sm text-gray-500 exception-body-font">
                      {searchQuery
                        ? 'No exceptions match your search criteria'
                        : 'No exceptions match this filter'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {allExceptions?.total && allExceptions.total > 0 && (
              <Pagination
                currentPage={page}
                totalItems={allExceptions.total}
                pageSize={20}
                onPageChange={setPage}
                onPageSizeChange={() => {}}
                pageSizeOptions={[10, 20, 50, 100]}
              />
            )}
          </>
        )}
      </main>

      {/* Resolve Modal - Industrial Design */}
      {showResolveModal && selectedException && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 exception-modal-backdrop transition-opacity"
              onClick={() => setShowResolveModal(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-gray-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-white/[0.08] exception-card-animate">
              {/* Modal header */}
              <div className="relative px-6 py-5 border-b border-white/[0.08] bg-gradient-to-r from-red-500/10 to-amber-500/10">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')]" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white exception-display-font">
                      Resolve Exception
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 exception-mono-font">
                      ID: {selectedException.exceptionId}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowResolveModal(false)}
                    className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal content */}
              <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
                {/* Exception Details Section */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 exception-mono-font mb-4 flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center">
                      <InformationCircleIcon className="h-3 w-3 text-purple-400" />
                    </div>
                    Exception Details
                  </h4>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <div className="flex items-center gap-3 mb-4">
                      <ExceptionTypeBadge type={selectedException.type} />
                      <ExceptionBadge status={selectedException.status} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-white/[0.02]">
                        <p className="text-[0.65rem] uppercase tracking-wider text-gray-600 exception-mono-font mb-1">
                          Order
                        </p>
                        <p className="text-sm font-semibold text-white exception-mono-font truncate">
                          {selectedException.orderId}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02]">
                        <p className="text-[0.65rem] uppercase tracking-wider text-gray-600 exception-mono-font mb-1">
                          SKU
                        </p>
                        <p className="text-sm font-semibold text-white exception-mono-font truncate">
                          {selectedException.sku}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02]">
                        <p className="text-[0.65rem] uppercase tracking-wider text-gray-600 exception-mono-font mb-1">
                          Expected
                        </p>
                        <p className="text-sm font-semibold text-white exception-quantity">
                          {selectedException.quantityExpected}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02]">
                        <p className="text-[0.65rem] uppercase tracking-wider text-gray-600 exception-mono-font mb-1">
                          Actual
                        </p>
                        <p className="text-sm font-semibold text-red-400 exception-quantity">
                          {selectedException.quantityActual}
                        </p>
                      </div>
                    </div>
                    {selectedException.reason && (
                      <div className="mt-4 pt-4 border-t border-white/[0.05]">
                        <p className="text-[0.65rem] uppercase tracking-wider text-gray-600 exception-mono-font mb-2">
                          Reason
                        </p>
                        <p className="text-sm text-gray-300 exception-body-font italic">
                          "{selectedException.reason}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolution Selection */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 exception-mono-font flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircleIcon className="h-3 w-3 text-emerald-400" />
                    </div>
                    Select Resolution <span className="text-red-400">*</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getResolutionOptions(selectedException.type).map((option, idx) => (
                      <button
                        key={option.value}
                        onClick={() => setResolution(option.value)}
                        className={`exception-resolution-option text-left p-4 rounded-xl border transition-all ${
                          resolution === option.value
                            ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
                            : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                        }`}
                        style={{ animationDelay: `${idx * 25}ms` }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {resolution === option.value && (
                            <div className="w-2 h-2 rounded-full bg-purple-400" />
                          )}
                          <span className="text-sm font-semibold text-white exception-mono-font">
                            {option.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 exception-body-font">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Conditional Fields */}
                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-gray-500 exception-mono-font mb-4">
                      Resolution Details
                    </h5>
                    {resolution === ExceptionResolution.SUBSTITUTE && (
                      <div className="mb-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 exception-mono-font mb-2">
                          Substitute SKU
                        </label>
                        <input
                          type="text"
                          value={substituteSku}
                          onChange={e => setSubstituteSku(e.target.value.toUpperCase())}
                          className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white exception-mono-font placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] transition-all"
                          placeholder="Enter substitute SKU..."
                        />
                      </div>
                    )}

                    {resolution === ExceptionResolution.ADJUST_QUANTITY && (
                      <div className="mb-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 exception-mono-font mb-2">
                          New Quantity
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={selectedException.quantityExpected}
                          value={newQuantity}
                          onChange={e => setNewQuantity(parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white exception-mono-font placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] transition-all"
                          placeholder="Enter new quantity..."
                        />
                      </div>
                    )}

                    {resolution === ExceptionResolution.TRANSFER_BIN && (
                      <div className="mb-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 exception-mono-font mb-2">
                          New Bin Location
                        </label>
                        <input
                          type="text"
                          value={newBinLocation}
                          onChange={e => setNewBinLocation(e.target.value.toUpperCase())}
                          className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white exception-mono-font placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] transition-all"
                          placeholder="Enter new bin location..."
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 exception-mono-font mb-2">
                        Notes (optional)
                      </label>
                      <textarea
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white exception-body-font placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.04] transition-all resize-none"
                        placeholder="Add notes about this resolution..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-5 border-t border-white/[0.08] flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowResolveModal(false)}
                  className="exception-card-industrial !bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleResolve}
                  disabled={resolveMutation.isPending}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold uppercase text-xs tracking-wider exception-mono-font shadow-lg shadow-emerald-500/25"
                >
                  {resolveMutation.isPending ? 'Resolving...' : 'Confirm Resolution'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
