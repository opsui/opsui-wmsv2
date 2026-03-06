/**
 * Sales page
 *
 * Sales & CRM module for customer management, leads, opportunities, and quotes
 *
 * Design Direction: "Luxe Pipeline" - A refined, premium aesthetic with purple accents
 * Typography: Space Grotesk (display) + Inter var (body) for modern sophistication
 * Motion: Staggered reveals, elegant transitions, micro-interactions
 * Layout: Asymmetric hero, overlapping elements, broken grid cards
 */

import { CreateCustomerModal } from '@/components/sales/CreateCustomerModal';
import { CreateLeadModal } from '@/components/sales/CreateLeadModal';
import { CreateOpportunityModal } from '@/components/sales/CreateOpportunityModal';
import { CreateQuoteModal } from '@/components/sales/CreateQuoteModal';
import { CustomerDetailModal } from '@/components/sales/CustomerDetailModal';
import { LeadDetailModal } from '@/components/sales/LeadDetailModal';
import { OpportunityDetailModal } from '@/components/sales/OpportunityDetailModal';
import { QuoteDetailModal } from '@/components/sales/QuoteDetailModal';
import {
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Header,
  Pagination,
  useToast,
} from '@/components/shared';
import {
  useAcceptQuote,
  useConvertLeadToCustomer,
  useCustomers,
  useLeads,
  useOpportunities,
  useQuotes,
  useSalesDashboard,
  useSendQuote,
} from '@/services/api';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PlusIcon,
  TrophyIcon,
  UserGroupIcon,
  UserPlusIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useIsPerformanceMode } from '@/hooks/useHardwareCapabilities';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'dashboard' | 'customers' | 'leads' | 'opportunities' | 'quotes';

interface Customer {
  customerId: string;
  customerNumber: string;
  companyName: string;
  contactName?: string;
  email?: string;
  status: 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  accountBalance: number;
}

interface Lead {
  leadId: string;
  customerName: string;
  company?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedValue?: number;
  source: string;
}

interface Opportunity {
  opportunityId: string;
  opportunityNumber: string;
  name: string;
  stage:
    | 'PROSPECTING'
    | 'QUALIFICATION'
    | 'PROPOSAL'
    | 'NEGOTIATION'
    | 'CLOSED_WON'
    | 'CLOSED_LOST';
  amount: number;
  probability: number;
  expectedCloseDate: string;
}

interface Quote {
  quoteId: string;
  quoteNumber: string;
  customerId: string;
  customerName?: string;
  opportunityId?: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  totalAmount: number;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  validUntil: string;
  createdAt?: string;
  updatedAt?: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  notes?: string;
  termsAndConditions?: string;
  createdBy?: string;
  convertedToOrderId?: string;
  lineItems?: Array<{
    sku?: string;
    description?: string;
    quantity: number;
    unitPrice?: number;
    discount?: number;
    total?: number;
  }>;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeInOut' },
  },
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -4, transition: { duration: 0.3, ease: 'easeOut' } },
};

const shimmerVariants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: { duration: 3, repeat: Infinity, ease: 'linear' },
  },
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function CustomerStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PROSPECT:
      'bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30',
    ACTIVE:
      'bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30',
    INACTIVE:
      'bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800/40 dark:to-gray-800/40 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-500/30',
    BLOCKED:
      'bg-gradient-to-r from-rose-100 to-red-100 dark:from-rose-900/40 dark:to-red-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${styles[status] || styles.PROSPECT}`}
    >
      {status}
    </span>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
    CONTACTED:
      'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30',
    QUALIFIED:
      'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-500/30',
    PROPOSAL:
      'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
    NEGOTIATION:
      'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-500/30',
    WON: 'bg-green-100 dark:bg-success-500/20 text-green-600 dark:text-success-300 border border-green-200 dark:border-success-500/30',
    LOST: 'bg-red-100 dark:bg-danger-500/20 text-red-600 dark:text-danger-300 border border-red-200 dark:border-danger-500/30',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.NEW}`}
    >
      {status}
    </span>
  );
}

function OpportunityStageBadge({ stage, probability }: { stage: string; probability: number }) {
  const styles: Record<string, string> = {
    PROSPECTING:
      'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
    QUALIFICATION:
      'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30',
    PROPOSAL:
      'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
    NEGOTIATION:
      'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-500/30',
    CLOSED_WON:
      'bg-green-100 dark:bg-success-500/20 text-green-600 dark:text-success-300 border border-green-200 dark:border-success-500/30',
    CLOSED_LOST:
      'bg-red-100 dark:bg-danger-500/20 text-red-600 dark:text-danger-300 border border-red-200 dark:border-danger-500/30',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[stage] || styles.PROSPECTING}`}
      >
        {stage.replace('_', ' ')}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{probability}%</span>
    </div>
  );
}

function QuoteStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT:
      'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500/30',
    SENT: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
    ACCEPTED:
      'bg-green-100 dark:bg-success-500/20 text-green-600 dark:text-success-300 border border-green-200 dark:border-success-500/30',
    REJECTED:
      'bg-red-100 dark:bg-danger-500/20 text-red-600 dark:text-danger-300 border border-red-200 dark:border-danger-500/30',
    EXPIRED:
      'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500/30',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.DRAFT}`}
    >
      {status}
    </span>
  );
}

function PriorityIndicator({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-500',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500 animate-pulse',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[priority] || colors.MEDIUM}`} />
      <span className="text-xs text-gray-500 dark:text-gray-400">{priority}</span>
    </div>
  );
}

function CustomerCard({
  customer,
  onViewDetails,
  onCreateQuote,
}: {
  customer: Customer;
  onViewDetails: (customer: Customer) => void;
  onCreateQuote: (customer: Customer) => void;
}) {
  return (
    <Card
      variant="glass"
      className="card-hover bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {customer.companyName}
              </h3>
              <CustomerStatusBadge status={customer.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{customer.customerNumber}</p>
            {customer.contactName && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Contact: {customer.contactName}
              </p>
            )}
            {customer.email && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Account Balance</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${customer.accountBalance.toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Status</p>
            <p className="text-sm text-gray-900 dark:text-white">{customer.status}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(customer)}
          >
            View Details
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onCreateQuote(customer)}
          >
            Create Quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadCard({
  lead,
  onViewDetails,
  onConvert,
}: {
  lead: Lead;
  onViewDetails: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
}) {
  return (
    <Card
      variant="glass"
      className="card-hover bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {lead.customerName}
              </h3>
              <LeadStatusBadge status={lead.status} />
            </div>
            {lead.company && (
              <p className="text-sm text-gray-600 dark:text-gray-300">{lead.company}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Source: {lead.source}</p>
          </div>
          <PriorityIndicator priority={lead.priority} />
        </div>

        {lead.estimatedValue && (
          <div className="bg-purple-50 dark:bg-primary-500/10 p-3 rounded-lg mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Value</p>
            <p className="text-xl font-bold text-purple-600 dark:text-primary-400">
              ${lead.estimatedValue.toLocaleString()}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(lead)}
          >
            View Details
          </Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={() => onConvert(lead)}>
            Convert to Customer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityCard({
  opportunity,
  onViewDetails,
  onCreateQuote,
}: {
  opportunity: Opportunity;
  onViewDetails: (opportunity: Opportunity) => void;
  onCreateQuote: (opportunity: Opportunity) => void;
}) {
  return (
    <Card
      variant="glass"
      className="card-hover bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {opportunity.name}
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {opportunity.opportunityNumber}
            </p>
          </div>
          <OpportunityStageBadge stage={opportunity.stage} probability={opportunity.probability} />
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500 dark:text-gray-400">Pipeline Progress</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {opportunity.probability}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                opportunity.stage === 'CLOSED_WON'
                  ? 'bg-green-500 dark:bg-success-500'
                  : opportunity.stage === 'CLOSED_LOST'
                    ? 'bg-red-500 dark:bg-danger-500'
                    : 'bg-blue-500 dark:bg-primary-500'
              }`}
              style={{ width: `${opportunity.probability}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Amount</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${opportunity.amount.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Expected Close</p>
            <p className="text-sm text-gray-900 dark:text-white">
              {new Date(opportunity.expectedCloseDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(opportunity)}
          >
            View Details
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onCreateQuote(opportunity)}
          >
            Create Quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-slate-500/20 text-slate-400',
  PICKING: 'bg-blue-500/20 text-blue-400',
  PICKED: 'bg-cyan-500/20 text-cyan-400',
  PACKING: 'bg-amber-500/20 text-amber-400',
  PACKED: 'bg-orange-500/20 text-orange-400',
  SHIPPED: 'bg-emerald-500/20 text-emerald-400',
};

function QuoteCard({
  quote,
  onViewDetails,
  onSend,
  onConvert,
}: {
  quote: Quote;
  onViewDetails: (quote: Quote) => void;
  onSend: (quote: Quote) => void;
  onConvert: (quote: Quote) => void;
}) {
  const { data: linkedOrder } = useQuery({
    queryKey: ['orders', quote.convertedToOrderId],
    queryFn: async () => {
      const response = await apiClient.get(`/orders/${quote.convertedToOrderId}`);
      return response.data;
    },
    enabled: !!quote.convertedToOrderId,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const isExpiringSoon =
    new Date(quote.validUntil) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isExpired = new Date(quote.validUntil) < new Date();
  const itemCount = quote.lineItems?.length ?? 0;

  return (
    <Card
      variant="glass"
      className="card-hover bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex flex-col"
    >
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                {quote.quoteNumber}
              </h3>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              {quote.customerName ?? '—'}
            </p>
            {quote.createdAt && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Created {new Date(quote.createdAt).toLocaleDateString()}
                {quote.createdBy && <span className="ml-1">by {quote.createdBy}</span>}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              $
              {Number(quote.totalAmount || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            {itemCount > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Line items preview */}
        {quote.lineItems && quote.lineItems.length > 0 && (
          <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 space-y-1.5">
            {quote.lineItems.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-start justify-between text-xs gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700 dark:text-gray-200 font-medium truncate block">
                    {item.description ?? item.sku ?? `Item ${i + 1}`}
                  </span>
                  {item.sku && item.description && (
                    <span className="text-gray-400 dark:text-gray-500">{item.sku}</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-gray-500 dark:text-gray-400">×{item.quantity}</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium ml-2">
                    ${Number(item.total ?? (item.unitPrice ?? 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {quote.lineItems.length > 3 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-0.5">
                +{quote.lineItems.length - 3} more item{quote.lineItems.length - 3 !== 1 ? 's' : ''}
              </p>
            )}
            {/* Financial breakdown */}
            {(quote.subtotal !== undefined ||
              quote.taxAmount !== undefined ||
              quote.discountAmount !== undefined) && (
              <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 space-y-1">
                {quote.subtotal !== undefined && (
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>${Number(quote.subtotal).toFixed(2)}</span>
                  </div>
                )}
                {quote.discountAmount !== undefined && quote.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span>-${Number(quote.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                {quote.taxAmount !== undefined && quote.taxAmount > 0 && (
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Tax</span>
                    <span>${Number(quote.taxAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Linked SO + order status */}
        {quote.convertedToOrderId && (
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-700/50">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">
                Sales Order
              </p>
              <p className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">
                {quote.convertedToOrderId}
              </p>
            </div>
            {linkedOrder ? (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${ORDER_STATUS_COLOR[linkedOrder.status] ?? 'bg-gray-500/20 text-gray-400'}`}
              >
                {linkedOrder.status}
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 animate-pulse">Loading…</span>
            )}
          </div>
        )}

        {/* Status dates + notes */}
        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          {quote.sentAt && (
            <div className="flex justify-between">
              <span>Sent</span>
              <span>{new Date(quote.sentAt).toLocaleDateString()}</span>
            </div>
          )}
          {quote.acceptedAt && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Accepted</span>
              <span>{new Date(quote.acceptedAt).toLocaleDateString()}</span>
            </div>
          )}
          {quote.rejectedAt && (
            <div className="flex justify-between text-red-500 dark:text-red-400">
              <span>Rejected</span>
              <span>{new Date(quote.rejectedAt).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>Valid until</span>
            <span
              className={
                isExpired
                  ? 'text-red-500 font-medium'
                  : isExpiringSoon
                    ? 'text-amber-500 font-medium'
                    : 'text-gray-600 dark:text-gray-300'
              }
            >
              {isExpired ? '⚠ ' : isExpiringSoon ? '⏰ ' : ''}
              {new Date(quote.validUntil).toLocaleDateString()}
            </span>
          </div>
        </div>

        {quote.notes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic border-l-2 border-gray-200 dark:border-gray-700 pl-2 line-clamp-2">
            {quote.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(quote)}
          >
            View Details
          </Button>
          {quote.status === 'DRAFT' && (
            <Button variant="primary" size="sm" className="flex-1" onClick={() => onSend(quote)}>
              Send Quote
            </Button>
          )}
          {quote.status === 'SENT' && (
            <Button variant="success" size="sm" className="flex-1" onClick={() => onConvert(quote)}>
              Convert to Order
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function SalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = (searchParams.get('tab') as TabType) || 'dashboard';
  const { showToast } = useToast();
  const isPerf = useIsPerformanceMode();
  const prefersReducedMotion = useReducedMotion();
  const noMotion = isPerf || !!prefersReducedMotion;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modal states
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const [isCreateOpportunityModalOpen, setIsCreateOpportunityModalOpen] = useState(false);
  const [isCreateQuoteModalOpen, setIsCreateQuoteModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  // Search/filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Mutation hooks
  const convertLeadMutation = useConvertLeadToCustomer();
  const sendQuoteMutation = useSendQuote();
  const acceptQuoteMutation = useAcceptQuote();

  // Fetch sales data from backend
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
  } = useSalesDashboard();
  const {
    data: customersData,
    isLoading: isCustomersLoading,
    error: customersError,
  } = useCustomers();
  const { data: leadsData, isLoading: isLeadsLoading, error: leadsError } = useLeads();
  const {
    data: opportunitiesData,
    isLoading: isOpportunitiesLoading,
    error: opportunitiesError,
  } = useOpportunities();
  const { data: quotesData, isLoading: isQuotesLoading, error: quotesError } = useQuotes();

  // Show error toasts
  useEffect(() => {
    if (dashboardError) {
      showToast('Failed to load sales dashboard', 'error');
    }
  }, [dashboardError, showToast]);

  useEffect(() => {
    if (customersError) {
      showToast('Failed to load customers', 'error');
    }
  }, [customersError, showToast]);

  useEffect(() => {
    if (leadsError) {
      showToast('Failed to load leads', 'error');
    }
  }, [leadsError, showToast]);

  useEffect(() => {
    if (opportunitiesError) {
      showToast('Failed to load opportunities', 'error');
    }
  }, [opportunitiesError, showToast]);

  useEffect(() => {
    if (quotesError) {
      showToast('Failed to load quotes', 'error');
    }
  }, [quotesError, showToast]);

  // Use real data from backend or fallback to defaults
  const dashboard = dashboardData || {
    totalCustomers: 0,
    activeLeads: 0,
    openOpportunities: 0,
    pendingQuotes: 0,
    totalPipeline: 0,
  };

  const customers: Customer[] = customersData?.customers || [];
  const leads: Lead[] = leadsData?.leads || [];
  const opportunities: Opportunity[] = opportunitiesData?.opportunities || [];
  const quotes: Quote[] = quotesData?.quotes || [];

  // Show loading state
  const isLoading =
    isDashboardLoading ||
    isCustomersLoading ||
    isLeadsLoading ||
    isOpportunitiesLoading ||
    isQuotesLoading;

  // Pagination for different tabs
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCustomers = customers.slice(startIndex, endIndex);
  const paginatedLeads = leads.slice(startIndex, endIndex);
  const paginatedOpportunities = opportunities.slice(startIndex, endIndex);
  const paginatedQuotes = quotes.slice(startIndex, endIndex);

  const setTab = (tab: TabType) => {
    setSearchParams({ tab });
    setCurrentPage(1); // Reset pagination when changing tabs
  };

  // Handler functions
  const handleViewCustomerDetails = (customer: Customer) => {
    setSelectedCustomerId(customer.customerId);
  };

  const handleCreateQuoteForCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.customerId);
    setIsCreateQuoteModalOpen(true);
  };

  const handleViewLeadDetails = (lead: Lead) => {
    setSelectedLeadId(lead.leadId);
  };

  const handleConvertLeadToCustomer = async (lead: Lead) => {
    try {
      await convertLeadMutation.mutateAsync(lead.leadId);
      showToast(`Lead "${lead.customerName}" converted to customer successfully!`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to convert lead', 'error');
    }
  };

  const handleViewOpportunityDetails = (opportunity: Opportunity) => {
    setSelectedOpportunityId(opportunity.opportunityId);
  };

  const handleCreateQuoteForOpportunity = (opportunity: Opportunity) => {
    // Pre-populate quote modal with opportunity data
    setIsCreateQuoteModalOpen(true);
  };

  const handleViewQuoteDetails = (quote: Quote) => {
    setSelectedQuoteId(quote.quoteId);
  };

  const handleSendQuote = async (quote: Quote) => {
    try {
      await sendQuoteMutation.mutateAsync(quote.quoteId);
      showToast(`Quote ${quote.quoteNumber} sent to customer!`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to send quote', 'error');
    }
  };

  const handleConvertQuoteToOrder = async (quote: Quote) => {
    try {
      await acceptQuoteMutation.mutateAsync(quote.quoteId);
      showToast(`Quote ${quote.quoteNumber} accepted! Order creation initiated.`, 'success');
      navigate('/orders');
    } catch (error: any) {
      showToast(error?.message || 'Failed to convert quote to order', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/20 to-violet-200/10 dark:from-purple-500/10 dark:to-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-gradient-to-br from-violet-200/20 to-purple-200/10 dark:from-violet-500/10 dark:to-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-40 h-40 bg-gradient-to-br from-purple-200/20 to-fuchsia-200/10 dark:from-purple-500/10 dark:to-fuchsia-500/5 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Page Header - Premium Design */}
        <div className="mb-10 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="relative">
              {!noMotion && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 dark:from-purple-500 dark:via-violet-500 dark:to-purple-600 rounded-full"
                />
              )}
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                Sales & CRM
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-xl">
                Nurture relationships, close deals, and grow your pipeline with elegance
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-500/30">
              <SparklesIcon className="h-4 w-4" />
              <span className="font-medium">Pipeline Intelligence</span>
              <ArrowTrendingUpIcon className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-purple-200 dark:border-purple-800" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-purple-500 dark:border-t-purple-400 animate-spin" />
            </div>
            <p className="mt-6 text-gray-500 dark:text-gray-400 text-sm font-medium">
              Loading your pipeline...
            </p>
          </div>
        )}

        {/* Tab Navigation - Premium Pills */}
        {!isLoading && (
          <div className="flex gap-1.5 sm:gap-2 mb-8 sm:mb-10 overflow-x-auto touch-scroll -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0 scrollbar-hide">
            {[
              { key: 'dashboard' as TabType, label: 'Dashboard', icon: ChartBarIcon },
              { key: 'customers' as TabType, label: 'Customers', icon: UserGroupIcon },
              { key: 'leads' as TabType, label: 'Leads', icon: UserPlusIcon },
              { key: 'opportunities' as TabType, label: 'Opportunities', icon: TrophyIcon },
              { key: 'quotes' as TabType, label: 'Quotes', icon: DocumentTextIcon },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTab(tab.key)}
                  className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {isActive &&
                    (noMotion ? (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 rounded-lg sm:rounded-xl border border-purple-200 dark:border-purple-500/30" />
                    ) : (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 rounded-lg sm:rounded-xl border border-purple-200 dark:border-purple-500/30"
                        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
                      />
                    ))}
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 relative z-10 flex-shrink-0" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab Content */}
        {/* Dashboard Tab */}
        {!isLoading && currentTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {[
                {
                  label: 'Total Customers',
                  value: dashboard.totalCustomers,
                  icon: UserGroupIcon,
                  gradient: 'from-violet-500 to-purple-600',
                  bgGradient:
                    'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
                },
                {
                  label: 'Active Leads',
                  value: dashboard.activeLeads,
                  icon: UserPlusIcon,
                  gradient: 'from-purple-500 to-fuchsia-600',
                  bgGradient:
                    'from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20',
                },
                {
                  label: 'Open Opportunities',
                  value: dashboard.openOpportunities,
                  icon: TrophyIcon,
                  gradient: 'from-violet-500 to-purple-600',
                  bgGradient:
                    'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
                },
                {
                  label: 'Pending Quotes',
                  value: dashboard.pendingQuotes,
                  icon: DocumentTextIcon,
                  gradient: 'from-purple-400 to-violet-500',
                  bgGradient:
                    'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
                },
                {
                  label: 'Total Pipeline',
                  value: `$${dashboard.totalPipeline.toLocaleString()}`,
                  icon: CurrencyDollarIcon,
                  gradient: 'from-fuchsia-500 to-purple-600',
                  bgGradient:
                    'from-fuchsia-50 to-purple-50 dark:from-fuchsia-900/20 dark:to-purple-900/20',
                  isLargeText: true,
                },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="group relative">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 rounded-2xl transition-opacity duration-300`}
                    />
                    <Card
                      variant="glass"
                      className={`relative p-6 bg-gradient-to-br ${stat.bgGradient} border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden`}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/50 to-transparent dark:from-white/5 dark:to-transparent rounded-bl-full" />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {stat.label}
                            </p>
                            <p
                              className={`mt-2 font-bold text-gray-900 dark:text-white ${stat.isLargeText ? 'text-2xl' : 'text-3xl'}`}
                            >
                              {stat.value}
                            </p>
                          </div>
                          <div
                            className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}
                          >
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <Card
              variant="glass"
              className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
            >
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setIsCreateCustomerModalOpen(true)}
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>New Customer</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setIsCreateLeadModalOpen(true)}
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>New Lead</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setIsCreateOpportunityModalOpen(true)}
                  >
                    <TrophyIcon className="h-5 w-5" />
                    <span>New Opportunity</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setIsCreateQuoteModalOpen(true)}
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    <span>New Quote</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Customers Tab */}
        {!isLoading && currentTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Manage customer accounts and relationships
                </p>
              </div>
              <Button
                variant="primary"
                className="flex items-center gap-2"
                onClick={() => setIsCreateCustomerModalOpen(true)}
              >
                <PlusIcon className="h-5 w-5" />
                New Customer
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {paginatedCustomers.map(customer => (
                <CustomerCard
                  key={customer.customerId}
                  customer={customer}
                  onViewDetails={handleViewCustomerDetails}
                  onCreateQuote={handleCreateQuoteForCustomer}
                />
              ))}
            </div>

            {customers.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={customers.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}

        {/* Leads Tab */}
        {!isLoading && currentTab === 'leads' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Leads</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Track and convert leads into customers
                </p>
              </div>
              <Button
                variant="primary"
                className="flex items-center gap-2"
                onClick={() => setIsCreateLeadModalOpen(true)}
              >
                <PlusIcon className="h-5 w-5" />
                New Lead
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {paginatedLeads.map(lead => (
                <LeadCard
                  key={lead.leadId}
                  lead={lead}
                  onViewDetails={handleViewLeadDetails}
                  onConvert={handleConvertLeadToCustomer}
                />
              ))}
            </div>

            {leads.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={leads.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}

        {/* Opportunities Tab */}
        {!isLoading && currentTab === 'opportunities' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Opportunities</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Manage sales pipeline and opportunities
                </p>
              </div>
              <Button
                variant="primary"
                className="flex items-center gap-2"
                onClick={() => setIsCreateOpportunityModalOpen(true)}
              >
                <PlusIcon className="h-5 w-5" />
                New Opportunity
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {paginatedOpportunities.map(opportunity => (
                <OpportunityCard
                  key={opportunity.opportunityId}
                  opportunity={opportunity}
                  onViewDetails={handleViewOpportunityDetails}
                  onCreateQuote={handleCreateQuoteForOpportunity}
                />
              ))}
            </div>

            {opportunities.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={opportunities.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}

        {/* Quotes Tab */}
        {!isLoading && currentTab === 'quotes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quotes</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Create and manage sales quotes
                </p>
              </div>
              <Button
                variant="primary"
                className="flex items-center gap-2"
                onClick={() => setIsCreateQuoteModalOpen(true)}
              >
                <PlusIcon className="h-5 w-5" />
                New Quote
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {paginatedQuotes.map(quote => (
                <QuoteCard
                  key={quote.quoteId}
                  quote={quote}
                  onViewDetails={handleViewQuoteDetails}
                  onSend={handleSendQuote}
                  onConvert={handleConvertQuoteToOrder}
                />
              ))}
            </div>

            {quotes.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={quotes.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateCustomerModal
        isOpen={isCreateCustomerModalOpen}
        onClose={() => setIsCreateCustomerModalOpen(false)}
        onSuccess={() => {
          showToast('Customer list refreshed', 'success');
        }}
      />
      <CreateLeadModal
        isOpen={isCreateLeadModalOpen}
        onClose={() => setIsCreateLeadModalOpen(false)}
        onSuccess={() => {
          showToast('Lead list refreshed', 'success');
        }}
      />
      <CreateOpportunityModal
        isOpen={isCreateOpportunityModalOpen}
        onClose={() => setIsCreateOpportunityModalOpen(false)}
        onSuccess={() => {
          showToast('Opportunity list refreshed', 'success');
        }}
      />
      <CreateQuoteModal
        isOpen={isCreateQuoteModalOpen}
        onClose={() => setIsCreateQuoteModalOpen(false)}
        onSuccess={() => {
          showToast('Quote list refreshed', 'success');
        }}
      />
      {selectedCustomerId && (
        <CustomerDetailModal
          isOpen={!!selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onSuccess={() => {
            showToast('Customer details refreshed', 'success');
          }}
          customerId={selectedCustomerId}
        />
      )}
      {selectedLeadId && (
        <LeadDetailModal
          isOpen={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onSuccess={() => {
            showToast('Lead converted to customer', 'success');
          }}
          leadId={selectedLeadId}
        />
      )}
      {selectedOpportunityId && (
        <OpportunityDetailModal
          isOpen={!!selectedOpportunityId}
          onClose={() => setSelectedOpportunityId(null)}
          opportunityId={selectedOpportunityId}
          onCreateQuote={() => {
            setSelectedOpportunityId(null);
            setIsCreateQuoteModalOpen(true);
          }}
        />
      )}
      {selectedQuoteId && (
        <QuoteDetailModal
          isOpen={!!selectedQuoteId}
          onClose={() => setSelectedQuoteId(null)}
          quoteId={selectedQuoteId}
          onAccepted={() => navigate('/orders')}
        />
      )}
    </div>
  );
}

export default SalesPage;
