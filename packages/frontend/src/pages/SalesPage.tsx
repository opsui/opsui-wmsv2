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
} from '@/components/shared';
import {
  useCustomers,
  useLeads,
  useOpportunities,
  useQuotes,
  useSalesDashboard,
} from '@/services/api';
import { CreateCustomerModal } from '@/components/sales/CreateCustomerModal';
import { useEffect, useState } from 'react';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  UserPlusIcon,
  TrophyIcon,
  DocumentTextIcon,
  PlusIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
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
    PROSPECT: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    ACTIVE: 'bg-success-500/20 text-success-300 border border-success-500/30',
    INACTIVE: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    BLOCKED: 'bg-danger-500/20 text-danger-300 border border-danger-500/30',
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
    NEW: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    CONTACTED: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    QUALIFIED: 'bg-green-500/20 text-green-300 border border-green-500/30',
    PROPOSAL: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    NEGOTIATION: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    WON: 'bg-success-500/20 text-success-300 border border-success-500/30',
    LOST: 'bg-danger-500/20 text-danger-300 border border-danger-500/30',
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
    PROSPECTING: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    QUALIFICATION: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    PROPOSAL: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    NEGOTIATION: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    CLOSED_WON: 'bg-success-500/20 text-success-300 border border-success-500/30',
    CLOSED_LOST: 'bg-danger-500/20 text-danger-300 border border-danger-500/30',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[stage] || styles.PROSPECTING}`}
      >
        {stage.replace('_', ' ')}
      </span>
      <span className="text-xs text-gray-400">{probability}%</span>
    </div>
  );
}

function QuoteStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    SENT: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    ACCEPTED: 'bg-success-500/20 text-success-300 border border-success-500/30',
    REJECTED: 'bg-danger-500/20 text-danger-300 border border-danger-500/30',
    EXPIRED: 'bg-warning-500/20 text-warning-300 border border-warning-500/30',
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
      <span className="text-xs text-gray-400">{priority}</span>
    </div>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Card variant="glass" className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{customer.companyName}</h3>
              <CustomerStatusBadge status={customer.status} />
            </div>
            <p className="text-sm text-gray-400">{customer.customerNumber}</p>
            {customer.contactName && (
              <p className="text-sm text-gray-300 mt-1">Contact: {customer.contactName}</p>
            )}
            {customer.email && <p className="text-sm text-gray-400">{customer.email}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Account Balance</p>
            <p className="text-lg font-bold text-white">${customer.accountBalance.toFixed(2)}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Status</p>
            <p className="text-sm text-white">{customer.status}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            View Details
          </Button>
          <Button variant="primary" size="sm" className="flex-1">
            Create Quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Card variant="glass" className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{lead.customerName}</h3>
              <LeadStatusBadge status={lead.status} />
            </div>
            {lead.company && <p className="text-sm text-gray-300">{lead.company}</p>}
            <p className="text-xs text-gray-400 mt-1">Source: {lead.source}</p>
          </div>
          <PriorityIndicator priority={lead.priority} />
        </div>

        {lead.estimatedValue && (
          <div className="bg-primary-500/10 p-3 rounded-lg mb-4">
            <p className="text-xs text-gray-400 mb-1">Estimated Value</p>
            <p className="text-xl font-bold text-primary-400">
              ${lead.estimatedValue.toLocaleString()}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            View Details
          </Button>
          <Button variant="primary" size="sm" className="flex-1">
            Convert to Customer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <Card variant="glass" className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{opportunity.name}</h3>
            </div>
            <p className="text-sm text-gray-400">{opportunity.opportunityNumber}</p>
          </div>
          <OpportunityStageBadge stage={opportunity.stage} probability={opportunity.probability} />
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Pipeline Progress</span>
            <span className="text-white font-medium">{opportunity.probability}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                opportunity.stage === 'CLOSED_WON'
                  ? 'bg-success-500'
                  : opportunity.stage === 'CLOSED_LOST'
                    ? 'bg-danger-500'
                    : 'bg-primary-500'
              }`}
              style={{ width: `${opportunity.probability}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Amount</p>
            <p className="text-lg font-bold text-white">${opportunity.amount.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Expected Close</p>
            <p className="text-sm text-white">
              {new Date(opportunity.expectedCloseDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            View Details
          </Button>
          <Button variant="primary" size="sm" className="flex-1">
            Create Quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QuoteCard({ quote }: { quote: Quote }) {
  const isExpiringSoon =
    new Date(quote.validUntil) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isExpired = new Date(quote.validUntil) < new Date();

  return (
    <Card variant="glass" className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{quote.quoteNumber}</h3>
              <QuoteStatusBadge status={quote.status} />
            </div>
            <p className="text-sm text-gray-300">{quote.customerName}</p>
            {isExpired && <p className="text-xs text-danger-400 mt-1">Expired</p>}
            {isExpiringSoon && !isExpired && (
              <p className="text-xs text-warning-400 mt-1">Expiring Soon</p>
            )}
          </div>
        </div>

        <div className="bg-primary-500/10 p-3 rounded-lg mb-4">
          <p className="text-xs text-gray-400 mb-1">Total Amount</p>
          <p className="text-2xl font-bold text-primary-400">
            ${quote.totalAmount.toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Valid Until</p>
            <p
              className={`text-sm ${isExpired ? 'text-danger-400' : isExpiringSoon ? 'text-warning-400' : 'text-white'}`}
            >
              {new Date(quote.validUntil).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Status</p>
            <p className="text-sm text-white">{quote.status}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            View Details
          </Button>
          {quote.status === 'DRAFT' && (
            <Button variant="primary" size="sm" className="flex-1">
              Send Quote
            </Button>
          )}
          {quote.status === 'SENT' && (
            <Button variant="success" size="sm" className="flex-1">
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
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);

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

  return (
    <div className="min-h-screen">
      <Header />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Sales & CRM</h1>
          <p className="mt-2 text-gray-400">
            Customer relationships, leads, opportunities, and quotes
          </p>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              <p className="text-gray-400 text-sm">Loading sales data...</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        {!isLoading && (
          <div className="flex gap-2 mb-8 border-b border-white/10 pb-4">
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
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
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
              <Card variant="glass" className="p-6 border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Customers</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.totalCustomers}</p>
                  </div>
                  <UserGroupIcon className="h-8 w-8 text-purple-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Active Leads</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.activeLeads}</p>
                  </div>
                  <UserPlusIcon className="h-8 w-8 text-yellow-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Open Opportunities</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {dashboard.openOpportunities}
                    </p>
                  </div>
                  <TrophyIcon className="h-8 w-8 text-orange-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pending Quotes</p>
                    <p className="mt-2 text-3xl font-bold text-white">{dashboard.pendingQuotes}</p>
                  </div>
                  <DocumentTextIcon className="h-8 w-8 text-blue-400" />
                </div>
              </Card>
              <Card variant="glass" className="p-6 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Pipeline</p>
                    <p className="mt-2 text-xl font-bold text-white">
                      ${dashboard.totalPipeline.toLocaleString()}
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>New Customer</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setTab('leads')}
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>New Lead</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setTab('opportunities')}
                  >
                    <TrophyIcon className="h-5 w-5" />
                    <span>View Pipeline</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setTab('quotes')}
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
                <h2 className="text-2xl font-bold text-white">Customers</h2>
                <p className="text-gray-400 text-sm mt-1">
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
                <CustomerCard key={customer.customerId} customer={customer} />
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
                <h2 className="text-2xl font-bold text-white">Sales Leads</h2>
                <p className="text-gray-400 text-sm mt-1">Track and convert leads into customers</p>
              </div>
              <Button variant="primary" className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                New Lead
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {paginatedLeads.map(lead => (
                <LeadCard key={lead.leadId} lead={lead} />
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
                <h2 className="text-2xl font-bold text-white">Opportunities</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Manage sales pipeline and opportunities
                </p>
              </div>
              <Button variant="primary" className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                New Opportunity
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {paginatedOpportunities.map(opportunity => (
                <OpportunityCard key={opportunity.opportunityId} opportunity={opportunity} />
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
                <h2 className="text-2xl font-bold text-white">Quotes</h2>
                <p className="text-gray-400 text-sm mt-1">Create and manage sales quotes</p>
              </div>
              <Button variant="primary" className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                New Quote
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {paginatedQuotes.map(quote => (
                <QuoteCard key={quote.quoteId} quote={quote} />
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
          // Optionally refetch customers data
          showToast('Refreshing customer list...', 'info');
        }}
      />
    </div>
  );
}

export default SalesPage;
