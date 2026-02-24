/**
 * Chart of Accounts Page
 *
 * A distinctive, production-grade interface for managing the Chart of Accounts.
 * Features a bold "Financial Editorial" aesthetic with:
 * - Sophisticated typography (Cormorant Garamond + IBM Plex Mono)
 * - Dramatic motion and staggered reveals
 * - Split-pane layout with atmospheric depth
 * - Rich textures and visual details
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  Modal,
  Input,
  Skeleton,
  Breadcrumb,
  Toast,
} from '@/components/shared';
import {
  PlusIcon,
  PencilIcon,
  EyeIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  DocumentTextIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  useChartOfAccounts,
  useAccountBalance,
  useCreateAccount,
  useUpdateAccount,
} from '@/services/api';
import { AccountType, type ChartOfAccounts } from '@opsui/shared';

type NormalBalance = 'D' | 'C';

// ============================================================================
// TYPES
// ============================================================================

interface AccountNode extends ChartOfAccounts {
  children: AccountNode[];
  level: number;
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const sampleAccounts: ChartOfAccounts[] = [
  // Assets
  {
    accountId: 'ACT-1000',
    accountCode: '1000',
    accountName: 'ASSETS',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: true,
    isActive: true,
    parentAccountId: null,
  },
  {
    accountId: 'ACT-1100',
    accountCode: '1100',
    accountName: 'Current Assets',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: true,
    isActive: true,
    parentAccountId: 'ACT-1000',
  },
  {
    accountId: 'ACT-1110',
    accountCode: '1110',
    accountName: 'Cash',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-1100',
    description: 'Cash on hand and in banks',
  },
  {
    accountId: 'ACT-1120',
    accountCode: '1120',
    accountName: 'Accounts Receivable',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-1100',
    description: 'Money owed by customers',
  },
  {
    accountId: 'ACT-1130',
    accountCode: '1130',
    accountName: 'Inventory',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-1100',
    description: 'Products for sale',
  },
  {
    accountId: 'ACT-1200',
    accountCode: '1200',
    accountName: 'Non-Current Assets',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: true,
    isActive: true,
    parentAccountId: 'ACT-1000',
  },
  {
    accountId: 'ACT-1210',
    accountCode: '1210',
    accountName: 'Equipment',
    accountType: AccountType.ASSET,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-1200',
    description: 'Machinery and equipment',
  },
  {
    accountId: 'ACT-1220',
    accountCode: '1220',
    accountName: 'Accumulated Depreciation',
    accountType: AccountType.ASSET,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-1200',
    description: 'Depreciation on equipment',
  },
  // Liabilities
  {
    accountId: 'ACT-2000',
    accountCode: '2000',
    accountName: 'LIABILITIES',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: true,
    isActive: true,
    parentAccountId: null,
  },
  {
    accountId: 'ACT-2100',
    accountCode: '2100',
    accountName: 'Current Liabilities',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: true,
    isActive: true,
    parentAccountId: 'ACT-2000',
  },
  {
    accountId: 'ACT-2110',
    accountCode: '2110',
    accountName: 'Accounts Payable',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-2100',
    description: 'Money owed to suppliers',
  },
  {
    accountId: 'ACT-2120',
    accountCode: '2120',
    accountName: 'Accrued Expenses',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-2100',
    description: 'Expenses incurred but not yet paid',
  },
  {
    accountId: 'ACT-2200',
    accountCode: '2200',
    accountName: 'Non-Current Liabilities',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: true,
    isActive: true,
    parentAccountId: 'ACT-2000',
  },
  {
    accountId: 'ACT-2210',
    accountCode: '2210',
    accountName: 'Long-Term Debt',
    accountType: AccountType.LIABILITY,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-2200',
    description: 'Loans and long-term obligations',
  },
  // Equity
  {
    accountId: 'ACT-3000',
    accountCode: '3000',
    accountName: 'EQUITY',
    accountType: AccountType.EQUITY,
    normalBalance: 'C',
    isHeader: true,
    isActive: true,
    parentAccountId: null,
  },
  {
    accountId: 'ACT-3100',
    accountCode: '3100',
    accountName: "Owner's Equity",
    accountType: AccountType.EQUITY,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-3000',
    description: "Owner's investment in the business",
  },
  {
    accountId: 'ACT-3200',
    accountCode: '3200',
    accountName: 'Retained Earnings',
    accountType: AccountType.EQUITY,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-3000',
    description: 'Accumulated profits',
  },
  // Revenue
  {
    accountId: 'ACT-4000',
    accountCode: '4000',
    accountName: 'REVENUE',
    accountType: AccountType.REVENUE,
    normalBalance: 'C',
    isHeader: true,
    isActive: true,
    parentAccountId: null,
  },
  {
    accountId: 'ACT-4100',
    accountCode: '4100',
    accountName: 'Sales Revenue',
    accountType: AccountType.REVENUE,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-4000',
    description: 'Income from sales',
  },
  {
    accountId: 'ACT-4200',
    accountCode: '4200',
    accountName: 'Service Revenue',
    accountType: AccountType.REVENUE,
    normalBalance: 'C',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-4000',
    description: 'Income from services',
  },
  // Expenses
  {
    accountId: 'ACT-5000',
    accountCode: '5000',
    accountName: 'EXPENSES',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: true,
    isActive: true,
    parentAccountId: null,
  },
  {
    accountId: 'ACT-5100',
    accountCode: '5100',
    accountName: 'Cost of Goods Sold',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-5000',
    description: 'Direct costs of goods sold',
  },
  {
    accountId: 'ACT-5200',
    accountCode: '5200',
    accountName: 'Operating Expenses',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: true,
    isActive: true,
    parentAccountId: 'ACT-5000',
  },
  {
    accountId: 'ACT-5210',
    accountCode: '5210',
    accountName: 'Rent Expense',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-5200',
    description: 'Rent for facilities',
  },
  {
    accountId: 'ACT-5220',
    accountCode: '5220',
    accountName: 'Utilities Expense',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-5200',
    description: 'Electricity, water, gas',
  },
  {
    accountId: 'ACT-5230',
    accountCode: '5230',
    accountName: 'Salaries Expense',
    accountType: AccountType.EXPENSE,
    normalBalance: 'D',
    isHeader: false,
    isActive: true,
    parentAccountId: 'ACT-5200',
    description: 'Employee salaries and wages',
  },
];

// ============================================================================
// STYLES - Inject custom fonts and animations
// ============================================================================

const styleId = 'coa-custom-styles';

function injectStyles() {
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Import distinctive fonts */
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap');

    /* Custom CSS Variables for the page */
    .coa-page {
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: 'IBM Plex Mono', 'Fira Code', monospace;
      --font-body: 'DM Sans', system-ui, sans-serif;
      
      /* Refined color palette - Financial Editorial */
      --color-ink: #1a1a2e;
      --color-paper: #faf9f7;
      --color-accent-gold: #c9a227;
      --color-accent-copper: #b87333;
      --color-debit: #2d5a7b;
      --color-credit: #7b2d5a;
      
      /* Shadows */
      --shadow-subtle: 0 1px 3px rgba(26, 26, 46, 0.04);
      --shadow-medium: 0 4px 12px rgba(26, 26, 46, 0.08);
      --shadow-dramatic: 0 12px 40px rgba(26, 26, 46, 0.15);
    }

    .dark .coa-page {
      --color-ink: #f5f5f0;
      --color-paper: #0d0d12;
      --color-accent-gold: #d4af37;
      --color-accent-copper: #da8a67;
      --color-debit: #5b9bd5;
      --color-credit: #d55b9b;
    }

    /* Staggered reveal animation */
    @keyframes coa-reveal-up {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes coa-reveal-scale {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes coa-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes coa-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }

    @keyframes coa-pulse-glow {
      0%, 100% { 
        box-shadow: 0 0 20px rgba(201, 162, 39, 0.1);
      }
      50% { 
        box-shadow: 0 0 40px rgba(201, 162, 39, 0.2);
      }
    }

    .coa-animate-reveal {
      animation: coa-reveal-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      opacity: 0;
    }

    .coa-animate-scale {
      animation: coa-reveal-scale 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      opacity: 0;
    }

    /* Grid pattern background */
    .coa-grid-pattern {
      background-image: 
        linear-gradient(rgba(26, 26, 46, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(26, 26, 46, 0.02) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    .dark .coa-grid-pattern {
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    }

    /* Ledger lines effect */
    .coa-ledger-lines {
      background-image: 
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 28px,
          rgba(201, 162, 39, 0.08) 28px,
          rgba(201, 162, 39, 0.08) 29px
        );
    }

    /* Custom scrollbar */
    .coa-scroll::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    .coa-scroll::-webkit-scrollbar-track {
      background: transparent;
    }

    .coa-scroll::-webkit-scrollbar-thumb {
      background: rgba(201, 162, 39, 0.3);
      border-radius: 4px;
    }

    .coa-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(201, 162, 39, 0.5);
    }

    /* Tree connector lines */
    .coa-tree-line {
      position: relative;
    }

    .coa-tree-line::before {
      content: '';
      position: absolute;
      left: -12px;
      top: 0;
      bottom: 0;
      width: 1px;
      background: linear-gradient(to bottom, rgba(201, 162, 39, 0.3), rgba(201, 162, 39, 0.1));
    }

    .coa-tree-line::after {
      content: '';
      position: absolute;
      left: -12px;
      top: 50%;
      width: 8px;
      height: 1px;
      background: rgba(201, 162, 39, 0.3);
    }

    /* Shimmer effect for loading */
    .coa-shimmer {
      background: linear-gradient(
        90deg,
        rgba(201, 162, 39, 0) 0%,
        rgba(201, 162, 39, 0.1) 50%,
        rgba(201, 162, 39, 0) 100%
      );
      background-size: 200% 100%;
      animation: coa-shimmer 2s infinite;
    }

    /* Typography classes */
    .coa-display {
      font-family: var(--font-display);
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .coa-mono {
      font-family: var(--font-mono);
      letter-spacing: 0.02em;
    }

    .coa-body {
      font-family: var(--font-body);
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// Elegant Dropdown Component
interface CustomDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  delay?: number;
}

function CustomDropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
  delay = 0,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  const handleOpen = () => {
    setIsOpen(true);
    setIsAnimating(true);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div
      className="relative flex-1 min-w-[200px] coa-animate-reveal"
      style={{ animationDelay: `${delay}ms` }}
    >
      <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-gold)] mb-2 coa-mono">
        {label}
      </label>
      <button
        type="button"
        onClick={isOpen ? handleClose : handleOpen}
        className={`w-full px-4 py-3 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm border-2 ${
          isOpen
            ? 'border-[var(--color-accent-gold)] shadow-lg shadow-[var(--color-accent-gold)]/10'
            : 'border-gray-200 dark:border-white/10 hover:border-[var(--color-accent-gold)]/50'
        } rounded-xl text-sm transition-all duration-300 flex items-center justify-between group`}
      >
        <span
          className={`coa-mono ${value === '' ? 'text-gray-400 dark:text-gray-500' : 'text-[var(--color-ink)] dark:text-gray-100'}`}
        >
          {selectedOption?.label || placeholder || 'Select...'}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-[var(--color-accent-gold)] transition-transform duration-300 ${isOpen || isAnimating ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={handleClose}
            style={{ animation: 'fadeIn 0.15s ease-out' }}
          />
          <div
            className={`absolute z-50 w-full mt-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-[var(--color-accent-gold)]/20 rounded-xl shadow-2xl overflow-hidden ${
              isAnimating && !isOpen
                ? 'animate-out fade-out slide-out-to-top-2'
                : 'animate-in slide-in-from-top-2'
            }`}
            style={{ animationDuration: '200ms' }}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  handleClose();
                }}
                className={`w-full px-4 py-3 text-sm text-left transition-all duration-200 border-b last:border-b-0 border-gray-100 dark:border-white/5 ${
                  value === option.value
                    ? 'bg-gradient-to-r from-[var(--color-accent-gold)]/10 to-[var(--color-accent-copper)]/10 text-[var(--color-ink)] dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-[var(--color-accent-gold)]/5 hover:pl-6'
                }`}
                style={{
                  animation: `coa-reveal-up 0.3s ease-out ${index * 40}ms both`,
                }}
              >
                <span className="coa-mono">{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface AccountRowProps {
  account: AccountNode;
  onEdit: (account: ChartOfAccounts) => void;
  onViewBalance: (accountId: string) => void;
  expandedNodes: Set<string>;
  onToggleExpand: (accountId: string) => void;
  selectedIndex: number;
  onSelect: (account: AccountNode) => void;
  isSelected: boolean;
}

function AccountRow({
  account,
  onEdit,
  onViewBalance,
  expandedNodes,
  onToggleExpand,
  selectedIndex,
  onSelect,
  isSelected,
}: AccountRowProps) {
  const hasChildren = account.children.length > 0;
  const isExpanded = expandedNodes.has(account.accountId);

  // Sophisticated color mapping
  const accountTypeStyles: Record<string, { bg: string; text: string; border: string }> = {
    ASSET: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-l-blue-400',
    },
    LIABILITY: {
      bg: 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-l-rose-400',
    },
    EQUITY: {
      bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30',
      text: 'text-violet-700 dark:text-violet-300',
      border: 'border-l-violet-400',
    },
    REVENUE: {
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-l-emerald-400',
    },
    EXPENSE: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-l-amber-400',
    },
  };

  const styles = accountTypeStyles[account.accountType] || accountTypeStyles.ASSET;

  return (
    <>
      <div
        onClick={() => onSelect(account)}
        className={`group relative py-3 px-4 cursor-pointer transition-all duration-300 border-l-4 ${
          isSelected
            ? `${styles.border} bg-gradient-to-r from-[var(--color-accent-gold)]/5 to-transparent shadow-md`
            : 'border-l-transparent hover:border-l-gray-300 dark:hover:border-l-gray-600 hover:bg-gray-50/50 dark:hover:bg-white/[0.02]'
        } ${account.isHeader ? 'bg-gray-50/30 dark:bg-white/[0.01]' : ''}`}
        style={{
          animation: `coa-reveal-up 0.4s ease-out ${selectedIndex * 30}ms both`,
        }}
      >
        <div className="flex items-center gap-4">
          {/* Expand/Collapse */}
          <button
            onClick={e => {
              e.stopPropagation();
              onToggleExpand(account.accountId);
            }}
            className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200 ${
              hasChildren
                ? 'hover:bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]'
                : 'text-transparent'
            }`}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {hasChildren && (
              <ChevronRightIcon
                className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </button>

          {/* Account Code */}
          <span
            className={`coa-mono text-sm flex-shrink-0 w-16 ${
              account.isHeader
                ? 'font-semibold text-[var(--color-accent-gold)]'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            style={{ paddingLeft: `${account.level * 8}px` }}
          >
            {account.accountCode}
          </span>

          {/* Account Name */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {account.isHeader ? (
              <FolderIcon className="h-4 w-4 text-[var(--color-accent-gold)] flex-shrink-0" />
            ) : (
              <DocumentTextIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            )}
            <span
              className={`truncate ${
                account.isHeader
                  ? 'coa-display text-lg text-[var(--color-ink)] dark:text-white'
                  : 'coa-body text-gray-800 dark:text-gray-200'
              }`}
            >
              {account.accountName}
            </span>
            {!account.isActive && (
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-gray-200/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 coa-mono">
                Inactive
              </span>
            )}
          </div>

          {/* Type Badge */}
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text} border border-current/10 coa-mono`}
          >
            {account.accountType}
          </span>

          {/* Normal Balance */}
          <div className="flex items-center gap-1.5 w-20 justify-center">
            <span
              className={`flex items-center gap-1 text-sm ${
                account.normalBalance === 'D'
                  ? 'text-[var(--color-debit)]'
                  : 'text-[var(--color-credit)]'
              }`}
            >
              {account.normalBalance === 'D' ? (
                <ArrowDownIcon className="h-3 w-3" />
              ) : (
                <ArrowUpIcon className="h-3 w-3" />
              )}
              <span className="coa-mono text-xs">{account.normalBalance}</span>
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={e => {
                e.stopPropagation();
                onViewBalance(account.accountId);
              }}
              className="p-2 hover:bg-[var(--color-accent-gold)]/10 rounded-lg transition-colors"
              title="View Balance"
            >
              <EyeIcon className="h-4 w-4 text-gray-400 hover:text-[var(--color-accent-gold)]" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(account);
              }}
              className="p-2 hover:bg-[var(--color-accent-gold)]/10 rounded-lg transition-colors"
              title="Edit Account"
            >
              <PencilIcon className="h-4 w-4 text-gray-400 hover:text-[var(--color-accent-gold)]" />
            </button>
          </div>
        </div>

        {/* Tree line connector */}
        {account.level > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none"
            style={{ left: `${16 + account.level * 16}px` }}
          >
            <div className="h-full w-px bg-gradient-to-b from-[var(--color-accent-gold)]/20 to-transparent" />
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded &&
        account.children.map((child, idx) => (
          <AccountRow
            key={child.accountId}
            account={child}
            onEdit={onEdit}
            onViewBalance={onViewBalance}
            expandedNodes={expandedNodes}
            onToggleExpand={onToggleExpand}
            selectedIndex={selectedIndex + idx + 1}
            onSelect={onSelect}
            isSelected={isSelected}
          />
        ))}
    </>
  );
}

interface AccountFormProps {
  account?: ChartOfAccounts;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  parentOptions: ChartOfAccounts[];
  isLoading?: boolean;
}

function AccountForm({ account, onSubmit, onCancel, parentOptions, isLoading }: AccountFormProps) {
  const [formData, setFormData] = useState({
    accountCode: account?.accountCode || '',
    accountName: account?.accountName || '',
    accountType: account?.accountType || AccountType.ASSET,
    parentAccountId: account?.parentAccountId || '',
    normalBalance: account?.normalBalance || ('D' as NormalBalance),
    isHeader: account?.isHeader || false,
    description: account?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const accountTypeOptions = [
    { value: AccountType.ASSET, label: 'Asset' },
    { value: AccountType.LIABILITY, label: 'Liability' },
    { value: AccountType.EQUITY, label: 'Equity' },
    { value: AccountType.REVENUE, label: 'Revenue' },
    { value: AccountType.EXPENSE, label: 'Expense' },
  ];

  const normalBalanceOptions = [
    { value: 'D', label: 'Debit' },
    { value: 'C', label: 'Credit' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 coa-body">
      <div className="coa-animate-reveal" style={{ animationDelay: '50ms' }}>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-gold)] mb-2 coa-mono">
          Account Code *
        </label>
        <Input
          type="text"
          value={formData.accountCode}
          onChange={e => setFormData({ ...formData, accountCode: e.target.value })}
          placeholder="e.g., 1110"
          required
          disabled={!!account}
          className="coa-mono"
        />
      </div>

      <div className="coa-animate-reveal" style={{ animationDelay: '100ms' }}>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-gold)] mb-2 coa-mono">
          Account Name *
        </label>
        <Input
          type="text"
          value={formData.accountName}
          onChange={e => setFormData({ ...formData, accountName: e.target.value })}
          placeholder="e.g., Cash"
          required
        />
      </div>

      <div className="coa-animate-reveal" style={{ animationDelay: '150ms' }}>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-gold)] mb-2 coa-mono">
          Account Type *
        </label>
        <select
          value={formData.accountType}
          onChange={e => setFormData({ ...formData, accountType: e.target.value as AccountType })}
          required
          disabled={!!account}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm coa-mono focus:outline-none focus:border-[var(--color-accent-gold)] transition-colors"
        >
          {accountTypeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="coa-animate-reveal" style={{ animationDelay: '200ms' }}>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-gold)] mb-2 coa-mono">
          Parent Account
        </label>
        <select
          value={formData.parentAccountId}
          onChange={e => setFormData({ ...formData, parentAccountId: e.target.value })}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm coa-mono focus:outline-none focus:border-[var(--color-accent-gold)] transition-colors"
        >
          <option value="">No Parent</option>
          {parentOptions
            .filter((a: ChartOfAccounts) => a.accountId !== account?.accountId)
            .map((opt: ChartOfAccounts) => (
              <option key={opt.accountId} value={opt.accountId}>
                {opt.accountCode} - {opt.accountName}
              </option>
            ))}
        </select>
      </div>

      <div className="coa-animate-reveal" style={{ animationDelay: '250ms' }}>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-gold)] mb-2 coa-mono">
          Normal Balance *
        </label>
        <select
          value={formData.normalBalance}
          onChange={e =>
            setFormData({ ...formData, normalBalance: e.target.value as NormalBalance })
          }
          required
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm coa-mono focus:outline-none focus:border-[var(--color-accent-gold)] transition-colors"
        >
          {normalBalanceOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="flex items-center gap-3 coa-animate-reveal"
        style={{ animationDelay: '300ms' }}
      >
        <input
          type="checkbox"
          id="isHeader"
          checked={formData.isHeader}
          onChange={e => setFormData({ ...formData, isHeader: e.target.checked })}
          className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[var(--color-accent-gold)] focus:ring-[var(--color-accent-gold)] focus:ring-offset-0"
        />
        <label htmlFor="isHeader" className="text-sm text-gray-700 dark:text-gray-300">
          Header account (contains sub-accounts)
        </label>
      </div>

      <div className="coa-animate-reveal" style={{ animationDelay: '350ms' }}>
        <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-gold)] mb-2 coa-mono">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description..."
          rows={3}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:border-[var(--color-accent-gold)] transition-colors resize-none"
        />
      </div>

      <div
        className="flex items-center gap-3 justify-end pt-6 border-t border-gray-200 dark:border-gray-700 coa-animate-reveal"
        style={{ animationDelay: '400ms' }}
      >
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          className="px-6 bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-copper)] hover:from-[var(--color-accent-copper)] hover:to-[var(--color-accent-gold)]"
        >
          {account ? 'Update' : 'Create'} Account
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function ChartOfAccountsPage() {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);

  // Inject custom styles on mount
  useEffect(() => {
    injectStyles();
  }, []);

  // State
  const [filterType, setFilterType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set([
      'ACT-1000',
      'ACT-1100',
      'ACT-1200',
      'ACT-2000',
      'ACT-2100',
      'ACT-2200',
      'ACT-3000',
      'ACT-4000',
      'ACT-5000',
      'ACT-5200',
    ])
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccounts | undefined>();
  const [selectedAccountForBalance, setSelectedAccountForBalance] = useState<string | undefined>();
  const [selectedAccountNode, setSelectedAccountNode] = useState<AccountNode | undefined>();
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Trigger page load animation
  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // API hooks
  const {
    data: apiAccounts = [],
    isLoading,
    refetch,
  } = useChartOfAccounts({
    accountType: filterType || undefined,
    isActive: filterActive === 'active' ? true : filterActive === 'inactive' ? false : undefined,
  });

  // Use sample data if API returns nothing
  const accounts = apiAccounts.length > 0 ? apiAccounts : sampleAccounts;

  const { data: balanceData } = useAccountBalance(
    selectedAccountForBalance || '',
    undefined,
    !!selectedAccountForBalance
  );

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();

  // Toast state for error notifications
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Build tree structure
  const buildAccountTree = (flatAccounts: ChartOfAccounts[]): AccountNode[] => {
    const accountMap = new Map<string, AccountNode>();
    const rootAccounts: AccountNode[] = [];

    // First pass: create nodes
    flatAccounts.forEach(account => {
      accountMap.set(account.accountId, { ...account, children: [], level: 0 });
    });

    // Second pass: build hierarchy
    flatAccounts.forEach(account => {
      const node = accountMap.get(account.accountId)!;
      if (account.parentAccountId && accountMap.has(account.parentAccountId)) {
        const parent = accountMap.get(account.parentAccountId)!;
        parent.children.push(node);
        node.level = parent.level + 1;
      } else {
        rootAccounts.push(node);
      }
    });

    // Sort by code within each level
    const sortTree = (nodes: AccountNode[]) => {
      nodes.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      nodes.forEach(node => sortTree(node.children));
    };
    sortTree(rootAccounts);

    return rootAccounts;
  };

  const accountTree = buildAccountTree(accounts);

  // Filter by search - recursively search through all accounts including children
  const filterAccountsBySearch = (accounts: AccountNode[], query: string): AccountNode[] => {
    if (!query) return accounts;
    const lowerQuery = query.toLowerCase();

    return accounts.reduce<AccountNode[]>((acc, account) => {
      const matchesSelf =
        account.accountName.toLowerCase().includes(lowerQuery) ||
        account.accountCode.includes(query);

      const matchingChildren = filterAccountsBySearch(account.children, query);

      if (matchesSelf || matchingChildren.length > 0) {
        acc.push({
          ...account,
          children: matchingChildren.length > 0 ? matchingChildren : account.children,
        });
      }

      return acc;
    }, []);
  };

  // Filter by account type on client-side (for sample data)
  const filterByType = (accounts: AccountNode[], type: string): AccountNode[] => {
    if (!type) return accounts;

    return accounts.reduce<AccountNode[]>((acc, account) => {
      const matchesSelf = account.accountType === type;
      const matchingChildren = filterByType(account.children, type);

      if (matchesSelf || matchingChildren.length > 0) {
        acc.push({
          ...account,
          children: matchingChildren.length > 0 ? matchingChildren : account.children,
        });
      }

      return acc;
    }, []);
  };

  let filteredTree = accountTree;

  // Apply type filter first
  if (filterType) {
    filteredTree = filterByType(filteredTree, filterType);
  }

  // Apply search filter
  if (searchQuery) {
    filteredTree = filterAccountsBySearch(filteredTree, searchQuery);
  }

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Handlers
  const handleToggleExpand = (accountId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const handleCreateAccount = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setShowCreateModal(false);
      showToast('Account created successfully', 'success');
      refetch();
    } catch (error: any) {
      showToast(error.message || 'Failed to create account', 'error');
    }
  };

  const handleEditAccount = async (data: any) => {
    if (selectedAccount) {
      try {
        await updateMutation.mutateAsync({ accountId: selectedAccount.accountId, data });
        setShowEditModal(false);
        setSelectedAccount(undefined);
        showToast('Account updated successfully', 'success');
        refetch();
      } catch (error: any) {
        showToast(error.message || 'Failed to update account', 'error');
      }
    }
  };

  const handleEditClick = (account: ChartOfAccounts) => {
    setSelectedAccount(account);
    setShowEditModal(true);
  };

  const handleViewBalance = (accountId: string) => {
    setSelectedAccountForBalance(accountId);
    setShowBalanceModal(true);
  };

  const handleSelectAccount = (account: AccountNode) => {
    setSelectedAccountNode(account);
  };

  // Get parent options (only header accounts)
  const parentOptions = (accounts.length > 0 ? accounts : sampleAccounts).filter(
    a => a.isHeader || !a.parentAccountId
  );

  // Calculate summary stats
  const totalAccounts = accounts.length;
  const headerAccounts = accounts.filter(a => a.isHeader).length;
  const activeAccounts = accounts.filter(a => a.isActive).length;

  return (
    <div ref={pageRef} className="coa-page min-h-screen bg-[var(--color-paper)] coa-grid-pattern">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Hero Header Section */}
        <header className="mb-10 coa-animate-reveal" style={{ animationDelay: '50ms' }}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-8 md:p-12">
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Gold accent lines */}
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-[var(--color-accent-gold)] via-[var(--color-accent-copper)] to-transparent opacity-80" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent-gold)]/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-[var(--color-accent-copper)]/5 rounded-full blur-3xl" />

              {/* Floating geometric shapes */}
              <div
                className="absolute top-8 right-8 w-4 h-4 border border-[var(--color-accent-gold)]/30 rotate-45"
                style={{ animation: 'coa-float 4s ease-in-out infinite' }}
              />
              <div
                className="absolute bottom-12 right-24 w-3 h-3 border border-[var(--color-accent-copper)]/30 rotate-12"
                style={{ animation: 'coa-float 5s ease-in-out infinite 0.5s' }}
              />
              <div
                className="absolute top-16 right-48 w-2 h-2 bg-[var(--color-accent-gold)]/20 rounded-full"
                style={{ animation: 'coa-float 3s ease-in-out infinite 1s' }}
              />

              {/* Ledger lines effect */}
              <div className="absolute inset-0 coa-ledger-lines opacity-30" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <p className="text-[var(--color-accent-gold)] coa-mono text-xs uppercase tracking-[0.3em] mb-3">
                  Financial Structure
                </p>
                <h1 className="coa-display text-4xl md:text-5xl lg:text-6xl text-white mb-4">
                  Chart of Accounts
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl coa-body">
                  The foundation of your double-entry accounting system. Organize, classify, and
                  manage every financial transaction.
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="group relative flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-copper)] rounded-xl text-gray-900 font-semibold overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-accent-gold)]/20 hover:scale-105 coa-body"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <PlusIcon className="h-5 w-5 relative z-10" />
                <span className="relative z-10">New Account</span>
              </button>
            </div>

            {/* Stats bar */}
            <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-gold)]/10 flex items-center justify-center">
                  <DocumentDuplicateIcon className="h-5 w-5 text-[var(--color-accent-gold)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white coa-mono">{totalAccounts}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FolderIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white coa-mono">{headerAccounts}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Headers</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ChartBarIcon className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white coa-mono">{activeAccounts}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Active</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[1fr,340px] gap-6">
          {/* Left Column - Account List */}
          <div className="space-y-6">
            {/* Filters Card */}
            <div
              className="bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/5 p-6 shadow-lg coa-animate-reveal"
              style={{ animationDelay: '100ms' }}
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-[var(--color-accent-gold)] transition-colors coa-body"
                  />
                </div>

                <CustomDropdown
                  label="Type"
                  value={filterType}
                  onChange={setFilterType}
                  placeholder="All"
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'ASSET', label: 'Assets' },
                    { value: 'LIABILITY', label: 'Liabilities' },
                    { value: 'EQUITY', label: 'Equity' },
                    { value: 'REVENUE', label: 'Revenue' },
                    { value: 'EXPENSE', label: 'Expenses' },
                  ]}
                  delay={150}
                />

                <CustomDropdown
                  label="Status"
                  value={filterActive}
                  onChange={setFilterActive}
                  placeholder="All"
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  delay={200}
                />
              </div>
            </div>

            {/* Accounts Table */}
            <div
              className="bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg overflow-hidden coa-animate-reveal"
              style={{ animationDelay: '150ms' }}
            >
              {/* Table Header */}
              <div className="px-6 py-4 border-b border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <span className="w-6" />
                  <span className="coa-mono text-xs uppercase tracking-widest text-gray-400 w-16">
                    Code
                  </span>
                  <span className="coa-mono text-xs uppercase tracking-widest text-gray-400 flex-1">
                    Account Name
                  </span>
                  <span className="coa-mono text-xs uppercase tracking-widest text-gray-400 w-24 text-center">
                    Type
                  </span>
                  <span className="coa-mono text-xs uppercase tracking-widest text-gray-400 w-20 text-center">
                    Dr/Cr
                  </span>
                  <span className="w-16" />
                </div>
              </div>

              {/* Table Body */}
              <div className="coa-scroll max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton variant="rounded" className="h-10 flex-1" />
                      </div>
                    ))}
                  </div>
                ) : filteredTree.length === 0 ? (
                  <div className="py-16 text-center">
                    <FolderIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 coa-body">No accounts found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Try adjusting your filters or create a new account
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredTree.map((account, idx) => (
                      <AccountRow
                        key={account.accountId}
                        account={account}
                        onEdit={handleEditClick}
                        onViewBalance={handleViewBalance}
                        expandedNodes={expandedNodes}
                        onToggleExpand={handleToggleExpand}
                        selectedIndex={idx}
                        onSelect={handleSelectAccount}
                        isSelected={selectedAccountNode?.accountId === account.accountId}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Detail Panel */}
          <div
            className="coa-animate-reveal lg:sticky lg:top-8 h-fit"
            style={{ animationDelay: '200ms' }}
          >
            {selectedAccountNode ? (
              <div className="bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-lg overflow-hidden">
                {/* Panel Header */}
                <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border-b border-gray-200/50 dark:border-white/5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="coa-mono text-sm text-[var(--color-accent-gold)]">
                      {selectedAccountNode.accountCode}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                        selectedAccountNode.isHeader
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {selectedAccountNode.isHeader ? 'Header' : 'Posting'}
                    </span>
                  </div>
                  <h3 className="coa-display text-2xl text-[var(--color-ink)] dark:text-white">
                    {selectedAccountNode.accountName}
                  </h3>
                </div>

                {/* Panel Content */}
                <div className="p-6 space-y-6">
                  {/* Account Type */}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 coa-mono">
                      Account Type
                    </p>
                    <p className="coa-body text-gray-800 dark:text-gray-200">
                      {selectedAccountNode.accountType}
                    </p>
                  </div>

                  {/* Normal Balance */}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 coa-mono">
                      Normal Balance
                    </p>
                    <p
                      className={`coa-mono text-lg ${
                        selectedAccountNode.normalBalance === 'D'
                          ? 'text-[var(--color-debit)]'
                          : 'text-[var(--color-credit)]'
                      }`}
                    >
                      {selectedAccountNode.normalBalance === 'D' ? 'Debit' : 'Credit'}
                    </p>
                  </div>

                  {/* Parent */}
                  {selectedAccountNode.parentAccountId && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 coa-mono">
                        Parent Account
                      </p>
                      <p className="coa-mono text-sm text-gray-600 dark:text-gray-300">
                        {accounts.find(a => a.accountId === selectedAccountNode.parentAccountId)
                          ?.accountName || selectedAccountNode.parentAccountId}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {selectedAccountNode.description && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 coa-mono">
                        Description
                      </p>
                      <p className="coa-body text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {selectedAccountNode.description}
                      </p>
                    </div>
                  )}

                  {/* Children count for headers */}
                  {selectedAccountNode.isHeader && selectedAccountNode.children.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 coa-mono">
                        Sub-accounts
                      </p>
                      <p className="coa-mono text-lg text-[var(--color-accent-gold)]">
                        {selectedAccountNode.children.length} accounts
                      </p>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 coa-mono">
                      Status
                    </p>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
                        selectedAccountNode.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          selectedAccountNode.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                      {selectedAccountNode.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Panel Actions */}
                <div className="p-6 pt-0 flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => handleViewBalance(selectedAccountNode.accountId)}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <EyeIcon className="h-4 w-4" />
                    Balance
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleEditClick(selectedAccountNode)}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="bg-white/50 dark:bg-gray-900/30 backdrop-blur-xl rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--color-accent-gold)]/10 to-[var(--color-accent-copper)]/10 flex items-center justify-center">
                  <SparklesIcon className="h-8 w-8 text-[var(--color-accent-gold)]" />
                </div>
                <h4 className="coa-display text-xl text-gray-700 dark:text-gray-300 mb-2">
                  Select an Account
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 coa-body">
                  Click on any account from the list to view its details here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Create Account Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Account"
          size="md"
        >
          <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <AccountForm
              parentOptions={parentOptions}
              onSubmit={handleCreateAccount}
              onCancel={() => setShowCreateModal(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </Modal>

        {/* Edit Account Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAccount(undefined);
          }}
          title="Edit Account"
          size="md"
        >
          <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <AccountForm
              account={selectedAccount}
              parentOptions={parentOptions}
              onSubmit={handleEditAccount}
              onCancel={() => {
                setShowEditModal(false);
                setSelectedAccount(undefined);
              }}
              isLoading={updateMutation.isPending}
            />
          </div>
        </Modal>

        {/* Account Balance Modal */}
        <Modal
          isOpen={showBalanceModal}
          onClose={() => {
            setShowBalanceModal(false);
            setSelectedAccountForBalance(undefined);
          }}
          title="Account Balance"
          size="sm"
        >
          <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {balanceData ? (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs uppercase tracking-widest text-[var(--color-accent-gold)] mb-2 coa-mono">
                    Account
                  </p>
                  <p className="coa-display text-2xl text-gray-900 dark:text-white">
                    {accounts.find(a => a.accountId === selectedAccountForBalance)?.accountName}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2 coa-mono">
                    Current Balance
                  </p>
                  <p
                    className={`coa-display text-5xl ${
                      balanceData.currentBalance >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(balanceData.currentBalance)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                    <p className="text-xs uppercase tracking-widest text-blue-400 mb-1 coa-mono">
                      Total Debits
                    </p>
                    <p className="coa-mono text-xl text-blue-600 dark:text-blue-400">
                      {formatCurrency(balanceData.totalDebits)}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30">
                    <p className="text-xs uppercase tracking-widest text-rose-400 mb-1 coa-mono">
                      Total Credits
                    </p>
                    <p className="coa-mono text-xl text-rose-600 dark:text-rose-400">
                      {formatCurrency(balanceData.totalCredits)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-8">
                <Skeleton variant="rounded" className="h-16" />
                <Skeleton variant="rounded" className="h-24" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton variant="rounded" className="h-16" />
                  <Skeleton variant="rounded" className="h-16" />
                </div>
              </div>
            )}
          </div>
        </Modal>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 ${
            toast.type === 'error' ? 'bg-rose-500/90 text-white' : 'bg-emerald-500/90 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'error' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-radial from-[var(--color-accent-gold)]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] bg-gradient-radial from-[var(--color-accent-copper)]/5 to-transparent rounded-full blur-3xl" />
      </div>
    </div>
  );
}

export default ChartOfAccountsPage;
