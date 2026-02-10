/**
 * Territory Management Page
 *
 * Page for managing sales territories
 * Shows territory performance, customer assignments, and quota tracking
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  MapPinIcon,
  UserIcon,
  ChartBarIcon,
  PencilIcon,
  UsersIcon,
  CurrencyDollarIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { Header } from '@/components/shared/Header';
import { Card } from '@/components/shared/Card';

interface TerritoryMetrics {
  territoryId: string;
  territoryName: string;
  territoryCode: string;
  managerName?: string;
  customerCount: number;
  orderCount: number;
  totalSales: number;
  sales30Days: number;
  salesYTD: number;
  currentQuota: number;
  quotaPercentAchieved: number;
}

interface TerritoryCustomer {
  territoryCustomerId: string;
  customerId: string;
  customerName: string;
  isPrimary: boolean;
  assignedDate: string;
}

interface TerritoryQuota {
  quotaId: string;
  quotaYear: number;
  quotaMonth?: number;
  quotaAmount: number;
  actualAmount: number;
  variancePercent?: number;
  status: string;
}

export default function TerritoryManagementPage() {
  const navigate = useNavigate();
  const [territories, setTerritories] = useState<TerritoryMetrics[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryMetrics | null>(null);
  const [territoryCustomers, setTerritoryCustomers] = useState<TerritoryCustomer[]>([]);
  const [territoryQuotas, setTerritoryQuotas] = useState<TerritoryQuota[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTerritories();
  }, []);

  useEffect(() => {
    if (selectedTerritory) {
      fetchTerritoryDetails();
    }
  }, [selectedTerritory]);

  const fetchTerritories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sales/territories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Fetch metrics for each territory
        const territoriesWithMetrics = await Promise.all(
          data.map(async (territory: any) => {
            const metricsResponse = await fetch(
              `/api/sales/territories/${territory.territoryId}/metrics`,
              {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
              }
            );
            if (metricsResponse.ok) {
              const metrics = await metricsResponse.json();
              return {
                ...territory,
                ...metrics,
              };
            }
            return territory;
          })
        );
        setTerritories(territoriesWithMetrics);
      }
    } catch (error) {
      console.error('Error fetching territories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTerritoryDetails = async () => {
    if (!selectedTerritory) return;

    try {
      // Fetch customers
      const custResponse = await fetch(
        `/api/sales/territories/${selectedTerritory.territoryId}/customers`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      if (custResponse.ok) {
        setTerritoryCustomers(await custResponse.json());
      }

      // Fetch quotas
      const quotaResponse = await fetch(
        `/api/sales/territories/${selectedTerritory.territoryId}/quotas`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      if (quotaResponse.ok) {
        setTerritoryQuotas(await quotaResponse.json());
      }
    } catch (error) {
      console.error('Error fetching territory details:', error);
    }
  };

  const getQuotaStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'ACHIEVED':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
      case 'MISSED':
        return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400';
    }
  };

  const getPerformanceColor = (percent: number) => {
    if (percent >= 100) return 'text-emerald-500 dark:text-emerald-400';
    if (percent >= 80) return 'text-blue-500 dark:text-blue-400';
    if (percent >= 60) return 'text-amber-500 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
  };

  const topPerformer =
    territories.length > 0
      ? territories.reduce((prev, current) =>
          current.quotaPercentAchieved > prev.quotaPercentAchieved ? current : prev
        )
      : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/sales')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-400 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Sales Territories
              </h1>
              <p className="text-gray-600 dark:text-slate-400 text-sm">
                Manage territories and track performance
              </p>
            </div>
          </div>

          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            New Territory
          </button>
        </div>

        {/* Top Performer Banner */}
        {topPerformer && (
          <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-500/10 dark:to-blue-500/10 border border-emerald-200 dark:border-emerald-500/30">
            <div className="flex items-center gap-4">
              <TrophyIcon className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
              <div className="flex-1">
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Top Performing Territory
                </p>
                <p className="text-gray-900 dark:text-white text-lg font-bold">
                  {topPerformer.territoryName}
                </p>
                <p className="text-gray-600 dark:text-slate-400 text-sm">
                  {topPerformer.quotaPercentAchieved.toFixed(1)}% of quota achieved
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 dark:text-slate-400 text-xs">YTD Sales</p>
                <p className="text-emerald-500 dark:text-emerald-400 text-2xl font-bold">
                  ${topPerformer.salesYTD.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Territories List */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              </Card>
            ) : territories.length === 0 ? (
              <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                  No territories found
                </div>
              </Card>
            ) : (
              territories.map(territory => (
                <Card
                  key={territory.territoryId}
                  className={`cursor-pointer transition-colors bg-white dark:bg-slate-800 border ${
                    selectedTerritory?.territoryId === territory.territoryId
                      ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/30'
                  }`}
                  onClick={() => setSelectedTerritory(territory)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <MapPinIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {territory.territoryName}
                          </h3>
                          <span className="text-gray-400 dark:text-slate-500 text-xs">
                            {territory.territoryCode}
                          </span>
                        </div>
                        {territory.managerName && (
                          <p className="text-gray-600 dark:text-slate-400 text-sm flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {territory.managerName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-2xl font-bold ${getPerformanceColor(territory.quotaPercentAchieved)}`}
                      >
                        {territory.quotaPercentAchieved.toFixed(1)}%
                      </p>
                      <p className="text-gray-500 dark:text-slate-400 text-xs">of quota</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <UsersIcon className="h-5 w-5 text-gray-400 dark:text-slate-400 mx-auto mb-1" />
                      <p className="text-gray-900 dark:text-white font-semibold">
                        {territory.customerCount}
                      </p>
                      <p className="text-gray-500 dark:text-slate-500 text-xs">Customers</p>
                    </div>
                    <div className="text-center">
                      <ChartBarIcon className="h-5 w-5 text-gray-400 dark:text-slate-400 mx-auto mb-1" />
                      <p className="text-gray-900 dark:text-white font-semibold">
                        {territory.orderCount}
                      </p>
                      <p className="text-gray-500 dark:text-slate-500 text-xs">Orders</p>
                    </div>
                    <div className="text-center">
                      <CurrencyDollarIcon className="h-5 w-5 text-gray-400 dark:text-slate-400 mx-auto mb-1" />
                      <p className="text-gray-900 dark:text-white font-semibold">
                        ${territory.sales30Days.toLocaleString()}
                      </p>
                      <p className="text-gray-500 dark:text-slate-500 text-xs">30 Days</p>
                    </div>
                    <div className="text-center">
                      <CurrencyDollarIcon className="h-5 w-5 text-gray-400 dark:text-slate-400 mx-auto mb-1" />
                      <p className="text-gray-900 dark:text-white font-semibold">
                        ${territory.salesYTD.toLocaleString()}
                      </p>
                      <p className="text-gray-500 dark:text-slate-500 text-xs">YTD</p>
                    </div>
                  </div>

                  {/* Progress bar to quota */}
                  {territory.currentQuota > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                        <span>Progress to quota</span>
                        <span>
                          ${territory.salesYTD.toLocaleString()} / $
                          {territory.currentQuota.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            territory.quotaPercentAchieved >= 100
                              ? 'bg-emerald-500'
                              : territory.quotaPercentAchieved >= 80
                                ? 'bg-blue-500'
                                : territory.quotaPercentAchieved >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(territory.quotaPercentAchieved, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>

          {/* Territory Details Panel */}
          <div className="lg:col-span-1">
            {selectedTerritory ? (
              <div className="space-y-6">
                {/* Territory Info */}
                <Card
                  title={selectedTerritory.territoryName}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-500 dark:text-slate-400 text-xs">Territory Code</p>
                      <p className="text-gray-900 dark:text-white">
                        {selectedTerritory.territoryCode}
                      </p>
                    </div>
                    {selectedTerritory.managerName && (
                      <div>
                        <p className="text-gray-500 dark:text-slate-400 text-xs">Manager</p>
                        <p className="text-gray-900 dark:text-white">
                          {selectedTerritory.managerName}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500 dark:text-slate-400 text-xs">YTD Sales</p>
                      <p className="text-emerald-500 dark:text-emerald-400 font-semibold text-lg">
                        ${selectedTerritory.salesYTD.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-slate-400 text-xs">Quota</p>
                      <p className="text-gray-900 dark:text-white">
                        ${selectedTerritory.currentQuota.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Customers */}
                <Card
                  title={`Assigned Customers (${territoryCustomers.length})`}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
                >
                  {territoryCustomers.length === 0 ? (
                    <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-4">
                      No customers assigned
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {territoryCustomers.map(tc => (
                        <div
                          key={tc.territoryCustomerId}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <UsersIcon className="h-4 w-4 text-gray-400 dark:text-slate-400" />
                            <span className="text-gray-900 dark:text-white text-sm">
                              {tc.customerName}
                            </span>
                          </div>
                          {tc.isPrimary && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded">
                              Primary
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Quotas */}
                <Card
                  title="Quotas"
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
                >
                  {territoryQuotas.length === 0 ? (
                    <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-4">
                      No quotas set
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {territoryQuotas.map(quota => (
                        <div
                          key={quota.quotaId}
                          className="p-3 bg-gray-50 dark:bg-slate-800 rounded"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-900 dark:text-white text-sm font-medium">
                              {quota.quotaMonth
                                ? new Date(0, quota.quotaMonth - 1).toLocaleString('default', {
                                    month: 'long',
                                  })
                                : 'Annual'}{' '}
                              {quota.quotaYear}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${getQuotaStatusColor(quota.status)}`}
                            >
                              {quota.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-slate-400">
                              ${quota.actualAmount.toLocaleString()} / $
                              {quota.quotaAmount.toLocaleString()}
                            </span>
                            {quota.variancePercent !== undefined && (
                              <span
                                className={`font-semibold ${
                                  quota.variancePercent >= 0
                                    ? 'text-emerald-500 dark:text-emerald-400'
                                    : 'text-red-500 dark:text-red-400'
                                }`}
                              >
                                {quota.variancePercent >= 0 ? '+' : ''}
                                {quota.variancePercent.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                quota.actualAmount / quota.quotaAmount >= 1
                                  ? 'bg-emerald-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{
                                width: `${Math.min((quota.actualAmount / quota.quotaAmount) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Actions */}
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Assign Customer
                  </button>
                  <button className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    Set Quota
                  </button>
                  <button className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <PencilIcon className="h-4 w-4" />
                    Edit Territory
                  </button>
                </div>
              </div>
            ) : (
              <Card className="text-center py-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                <MapPinIcon className="h-12 w-12 text-gray-400 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-slate-400">
                  Select a territory to view details
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
