/**
 * Zone Picking Page
 *
 * Manage warehouse zones, picker assignments, and zone performance.
 * Design direction: WAREHOUSE FLOOR - Industrial aesthetic with spatial visualization.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Select,
  Pagination,
  Breadcrumb,
  useToast,
  Header,
} from '@/components/shared';
import { useZones, useAllZoneStats, useZonePickTasks, useRebalancePickers } from '@/services/api';
import { useAuthStore } from '@/stores';

import { usePageTracking, PageViews } from '@/hooks/usePageTracking';
import {
  MapIcon,
  UserIcon,
  ArrowPathIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// COMPONENT
// ============================================================================

export function ZonePickingPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  usePageTracking({ view: PageViews.ZONE_PICKING });

  const isAdmin = useAuthStore(state => state.user?.role === 'ADMIN');
  const getEffectiveRole = useAuthStore(state => state.getEffectiveRole);
  const canManage = isAdmin || getEffectiveRole() === 'SUPERVISOR';

  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string | undefined>();
  const [tasksSearchTerm, setTasksSearchTerm] = useState('');
  const [statsSearchTerm, setStatsSearchTerm] = useState('');

  // Pagination state for zone tasks
  const [tasksCurrentPage, setTasksCurrentPage] = useState(1);
  const tasksPerPage = 10;

  // Pagination state for zone stats
  const [statsCurrentPage, setStatsCurrentPage] = useState(1);
  const statsPerPage = 10;

  // Reset pagination when filter changes
  useEffect(() => {
    setTasksCurrentPage(1);
  }, [taskStatusFilter, tasksSearchTerm]);

  useEffect(() => {
    setStatsCurrentPage(1);
  }, [statsSearchTerm]);

  const { data: zones, isLoading: zonesLoading } = useZones();
  const { data: allStats } = useAllZoneStats();
  const { data: zoneTasks } = useZonePickTasks(selectedZone || '', taskStatusFilter);

  const rebalanceMutation = useRebalancePickers();

  const selectedZoneData = zones?.find((z: any) => z.zoneId === selectedZone);
  const selectedStats = allStats?.stats?.find((s: any) => s.zoneId === selectedZone);

  const handleRebalance = async () => {
    try {
      await rebalanceMutation.mutateAsync();
      showToast('Pickers rebalanced successfully', 'success');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
      {/* Industrial ambient background with purple brand */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-purple-500/8 rounded-full blur-[150px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-violet-500/6 rounded-full blur-[120px] translate-y-1/2" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(168, 85, 247, 0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <Header />
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb />

        {/* Page Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30">
              <MapIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-purple-400/80">
              Warehouse Operations
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extralight text-white tracking-tight mb-3">
                Zone Picking
              </h1>
              <p className="text-lg text-slate-400 font-light max-w-xl">
                Manage warehouse zones and picker assignments for optimal workflow.
              </p>
            </div>
            {canManage && (
              <Button
                onClick={handleRebalance}
                disabled={rebalanceMutation.isPending}
                className="h-12 px-6 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 text-white font-medium shadow-lg shadow-purple-500/25"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 mr-2 ${rebalanceMutation.isPending ? 'animate-spin' : ''}`}
                />
                Rebalance Pickers
              </Button>
            )}
          </div>
        </header>

        <div className="space-y-8">
          {/* Zones Overview */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-blue-600" />
                Warehouse Zones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {zonesLoading ? (
                <p className="text-gray-500 dark:text-gray-400">Loading zones...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {zones?.map((zone: any) => (
                    <div
                      key={zone.zoneId}
                      onClick={() =>
                        setSelectedZone(selectedZone === zone.zoneId ? null : zone.zoneId)
                      }
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedZone === zone.zoneId
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{zone.name}</h3>
                        <Badge
                          variant={
                            zone.currentUtilization > 80
                              ? 'error'
                              : zone.currentUtilization > 50
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {zone.zoneType}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Utilization</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {zone.currentUtilization}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Active Pickers</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {zone.activePickers}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Locations</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {zone.locationCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Zone Details */}
          {selectedZone && selectedZoneData && (
            <>
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5 text-green-600" />
                    Zone Statistics: {selectedZoneData.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Pickers</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedStats.totalPickers || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Active Tasks</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedStats.activeTasks || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pending Tasks</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedStats.pendingTasks || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Avg Time/Task</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedStats.averageTimePerTask || 0}s
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Zone Tasks */}
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Zone Tasks</span>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search tasks..."
                          value={tasksSearchTerm}
                          onChange={e => setTasksSearchTerm(e.target.value)}
                          className="pl-9 pr-3 py-1.5 w-48 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <Select
                        value={taskStatusFilter || 'all'}
                        onChange={e => setTaskStatusFilter(e.target.value || undefined)}
                        options={[
                          { value: '', label: 'All Tasks' },
                          { value: 'PENDING', label: 'Pending' },
                          { value: 'IN_PROGRESS', label: 'In Progress' },
                          { value: 'COMPLETED', label: 'Completed' },
                        ]}
                        className="w-40"
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {zoneTasks?.tasks && zoneTasks.tasks.length > 0 ? (
                    (() => {
                      const tasks = zoneTasks.tasks.filter((task: any) => {
                        if (!tasksSearchTerm.trim()) return true;
                        const query = tasksSearchTerm.toLowerCase();
                        return (
                          task.taskId?.toLowerCase().includes(query) ||
                          task.sku?.toLowerCase().includes(query) ||
                          task.binLocation?.toLowerCase().includes(query) ||
                          task.status?.toLowerCase().includes(query) ||
                          task.assignedPicker?.toLowerCase().includes(query)
                        );
                      });
                      const totalPages = Math.ceil(tasks.length / tasksPerPage);
                      const paginatedTasks = tasks.slice(
                        (tasksCurrentPage - 1) * tasksPerPage,
                        tasksCurrentPage * tasksPerPage
                      );
                      return (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b dark:border-gray-700">
                                  <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                    Task
                                  </th>
                                  <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                    SKU
                                  </th>
                                  <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                    Location
                                  </th>
                                  <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                    Status
                                  </th>
                                  <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                    Picker
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedTasks.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="py-4 px-3 text-center text-sm text-gray-500 dark:text-gray-400"
                                    >
                                      {tasks.length === 0
                                        ? 'No tasks match your search'
                                        : 'No tasks on this page'}
                                    </td>
                                  </tr>
                                ) : (
                                  paginatedTasks.map((task: any, idx: number) => (
                                    <tr
                                      key={idx}
                                      className="border-b dark:border-gray-700 last:border-0"
                                    >
                                      <td className="py-2 px-3 text-gray-900 dark:text-white">
                                        {task.taskId}
                                      </td>
                                      <td className="py-2 px-3 text-gray-900 dark:text-white">
                                        {task.sku}
                                      </td>
                                      <td className="py-2 px-3 font-mono text-gray-600 dark:text-gray-400">
                                        {task.binLocation}
                                      </td>
                                      <td className="py-2 px-3">
                                        <Badge
                                          variant={
                                            task.status === 'COMPLETED'
                                              ? 'success'
                                              : task.status === 'IN_PROGRESS'
                                                ? 'primary'
                                                : 'info'
                                          }
                                        >
                                          {task.status.toLowerCase()}
                                        </Badge>
                                      </td>
                                      <td className="py-2 px-3 text-gray-900 dark:text-white">
                                        {task.assignedPicker || '-'}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination for Zone Tasks */}
                          {totalPages > 1 && (
                            <div className="flex justify-center mt-4">
                              <Pagination
                                currentPage={tasksCurrentPage}
                                totalItems={tasks.length}
                                pageSize={tasksPerPage}
                                onPageChange={setTasksCurrentPage}
                              />
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      No tasks found for this zone.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* All Zone Stats Summary */}
          {allStats?.stats && allStats.stats.length > 0 && !selectedZone && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>All Zone Performance</span>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search zones..."
                      value={statsSearchTerm}
                      onChange={e => setStatsSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 w-48 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {(() => {
                    const stats = (allStats?.stats || []).filter((stat: any) => {
                      if (!statsSearchTerm.trim()) return true;
                      const query = statsSearchTerm.toLowerCase();
                      return (
                        stat.zoneName?.toLowerCase().includes(query) ||
                        stat.zoneId?.toLowerCase().includes(query)
                      );
                    });
                    const totalPages = Math.ceil(stats.length / statsPerPage);
                    const paginatedStats = stats.slice(
                      (statsCurrentPage - 1) * statsPerPage,
                      statsCurrentPage * statsPerPage
                    );
                    return (
                      <>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b dark:border-gray-700">
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                Zone
                              </th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                Pickers
                              </th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                Active Tasks
                              </th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                Pending Tasks
                              </th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                Efficiency
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedStats.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="py-4 px-3 text-center text-sm text-gray-500 dark:text-gray-400"
                                >
                                  {stats.length === 0 ? 'No zones found' : 'No zones on this page'}
                                </td>
                              </tr>
                            ) : (
                              paginatedStats.map((stat: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className="border-b dark:border-gray-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                                  onClick={() => setSelectedZone(stat.zoneId)}
                                >
                                  <td className="py-2 px-3 text-gray-900 dark:text-white">
                                    {stat.zoneName}
                                  </td>
                                  <td className="py-2 px-3 text-gray-900 dark:text-white">
                                    <div className="flex items-center gap-1">
                                      <UserIcon className="h-4 w-4 text-gray-400" />
                                      {stat.totalPickers || 0}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-gray-900 dark:text-white">
                                    {stat.activeTasks || 0}
                                  </td>
                                  <td className="py-2 px-3 text-gray-900 dark:text-white">
                                    {stat.pendingTasks || 0}
                                  </td>
                                  <td className="py-2 px-3">
                                    <Badge
                                      variant={
                                        stat.efficiency > 80
                                          ? 'success'
                                          : stat.efficiency > 60
                                            ? 'warning'
                                            : 'info'
                                      }
                                    >
                                      {stat.efficiency || 0}%
                                    </Badge>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>

                        {/* Pagination for All Zone Stats */}
                        {totalPages > 1 && (
                          <div className="flex justify-center mt-4">
                            <Pagination
                              currentPage={statsCurrentPage}
                              totalItems={stats.length}
                              pageSize={statsPerPage}
                              onPageChange={setStatsCurrentPage}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default ZonePickingPage;
