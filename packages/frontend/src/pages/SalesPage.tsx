/**
 * Sales page
 *
 * Sales & CRM module for customer management, leads, opportunities, and quotes
 */

import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Header,
  Button,
  useToast,
  Pagination,
  Breadcrumb,
} from '@/components/shared';
import {
  useCustomers,
  useLeads,
  useOpportunities,
  useQuotes,
  useSalesDashboard,
  useConvertLeadToCustomer,
  useSendQuote,
  useAcceptQuote,
} from '@/services/api';
import { CreateCustomerModal } from '@/components/sales/CreateCustomerModal';
import { CreateLeadModal } from '@/components/sales/CreateLeadModal';
import { CreateOpportunityModal } from '@/components/sales/CreateOpportunityModal';
import { CreateQuoteModal } from '@/components/sales/CreateQuoteModal';
import { CustomerDetailModal } from '@/components/sales/CustomerDetailModal';
import { useEffect, useState } from 'react';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  UserPlusIcon,
  TrophyIcon,
  DocumentTextIcon,
  PlusIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

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
  customerName: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  totalAmount: number;
  validUntil: string;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function CustomerStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PROSPECT:
      'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
    ACTIVE:
      'bg-green-100 dark:bg-success-500/20 text-green-600 dark:text-success-300 border border-green-200 dark:border-success-500/30',
    INACTIVE:
      'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500/30',
    BLOCKED:
      'bg-red-100 dark:bg-danger-500/20 text-red-600 dark:text-danger-300 border border-red-200 dark:border-danger-500/30',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PROSPECT}`}
    >
      {status}
    </span>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30',
    CONTACTED:
      'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-500/30',
    QUALIFIED:
      'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-500/30',
    PROPOSAL:
      'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
    NEGOTIATION:
      'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30',
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
      'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30',
    QUALIFICATION:
      'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-500/30',
    PROPOSAL:
      'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30',
    NEGOTIATION:
      'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30',
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
    SENT: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30',
    ACCEPTED:
      'bg-green-100 dark:bg-success-500/20 text-green-600 dark:text-success-300 border border-green-200 dark:border-success-500/30',
    REJECTED:
      'bg-red-100 dark:bg-danger-500/20 text-red-600 dark:text-danger-300 border border-red-200 dark:border-danger-500/30',
    EXPIRED:
      'bg-amber-100 dark:bg-warning-500/20 text-amber-600 dark:text-warning-300 border border-amber-200 dark:border-warning-500/30',
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
          <div className="bg-blue-50 dark:bg-primary-500/10 p-3 rounded-lg mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Value</p>
            <p className="text-xl font-bold text-blue-600 dark:text-primary-400">
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
  const isExpiringSoon =
    new Date(quote.validUntil) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isExpired = new Date(quote.validUntil) < new Date();

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
                {quote.quoteNumber}
              </h3>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{quote.customerName}</p>
            {isExpired && <p className="text-xs text-red-500 dark:text-danger-400 mt-1">Expired</p>}
            {isExpiringSoon && !isExpired && (
              <p className="text-xs text-amber-500 dark:text-warning-400 mt-1">Expiring Soon</p>
            )}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-primary-500/10 p-3 rounded-lg mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-primary-400">
            ${quote.totalAmount.toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Valid Until</p>
            <p
              className={`text-sm ${isExpired ? 'text-red-500 dark:text-danger-400' : isExpiringSoon ? 'text-amber-500 dark:text-warning-400' : 'text-gray-900 dark:text-white'}`}
            >
              {new Date(quote.validUntil).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Status</p>
            <p className="text-sm text-gray-900 dark:text-white">{quote.status}</p>
          </div>
        </div>

        <div className="flex gap-2">
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
  const currentTab = (searchParams.get('tab') as TabType) || 'dashboard';
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modal states
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);
  const [isCreateOpportunityModalOpen, setIsCreateOpportunityModalOpen] = useState(false);
  const [isCreateQuoteModalOpen, setIsCreateQuoteModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

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
    showToast(`Viewing lead: ${lead.customerName}`, 'info');
    // TODO: Implement LeadDetailModal
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
    showToast(`Viewing opportunity: ${opportunity.name}`, 'info');
    // TODO: Implement OpportunityDetailModal
  };

  const handleCreateQuoteForOpportunity = (opportunity: Opportunity) => {
    // Pre-populate quote modal with opportunity data
    setIsCreateQuoteModalOpen(true);
  };

  const handleViewQuoteDetails = (quote: Quote) => {
    showToast(`Viewing quote: ${quote.quoteNumber}`, 'info');
    // TODO: Implement QuoteDetailModal
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
      // TODO: Navigate to order details or show order creation modal
    } catch (error: any) {
      showToast(error?.message || 'Failed to convert quote to order', 'error');
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Sales & CRM
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Customer relationships, leads, opportunities, and quotes
          </p>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-primary-500"></div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Loading sales data...</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        {!isLoading && (
          <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-white/10 pb-4">
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-100 dark:bg-primary-500/20 text-blue-600 dark:text-primary-300 border border-blue-200 dark:border-primary-500/30'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Dashboard Tab */}
        {!isLoading && currentTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card
                variant="glass"
                className="p-6 border-l-4 border-l-purple-500 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                      {dashboard.totalCustomers}
                    </p>
                  </div>
                  <UserGroupIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />
                </div>
              </Card>
              <Card
                variant="glass"
                className="p-6 border-l-4 border-l-yellow-500 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Leads</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                      {dashboard.activeLeads}
                    </p>
                  </div>
                  <UserPlusIcon className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
                </div>
              </Card>
              <Card
                variant="glass"
                className="p-6 border-l-4 border-l-orange-500 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Open Opportunities</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                      {dashboard.openOpportunities}
                    </p>
                  </div>
                  <TrophyIcon className="h-8 w-8 text-orange-500 dark:text-orange-400" />
                </div>
              </Card>
              <Card
                variant="glass"
                className="p-6 border-l-4 border-l-blue-500 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending Quotes</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                      {dashboard.pendingQuotes}
                    </p>
                  </div>
                  <DocumentTextIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                </div>
              </Card>
              <Card
                variant="glass"
                className="p-6 border-l-4 border-l-green-500 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Pipeline</p>
                    <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                      ${dashboard.totalPipeline.toLocaleString()}
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-green-500 dark:text-green-400" />
                </div>
              </Card>
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

            {/* Pagination */}
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

            {/* Pagination */}
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

            {/* Pagination */}
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

            {/* Pagination */}
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
    </div>
  );
}

export default SalesPage;
