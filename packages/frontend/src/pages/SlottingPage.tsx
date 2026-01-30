/**
 * Slotting Optimization Page
 *
 * ABC analysis and slotting recommendations for warehouse optimization
 */

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Progress,
  Select,
  Header,
  Pagination,
  useToast,
} from '@/components/shared';
import {
  useSlottingClasses,
  useSlottingStats,
  useSlottingAnalysis,
  useSlottingRecommendations,
  useImplementSlotting,
  useRunSlottingAnalysis,
} from '@/services/api';
import { showSuccess, showError } from '@/stores/uiStore';
import { usePageTracking, PageViews } from '@/hooks/usePageTracking';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface RecommendationItem {
  sku: string;
  productName: string;
  fromLocation: string;
  toLocation: string;
  estimatedBenefit?: {
    efficiencyGain?: number;
    timeSaved?: number;
  };
  effort?: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SlottingPage() {
  usePageTracking({ view: PageViews.SLOTTING });

  const [selectedDays, setSelectedDays] = useState<number>(90);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationItem | null>(
    null
  );
  const [analysisSearchTerm, setAnalysisSearchTerm] = useState('');
  const [recommendationsSearchTerm, setRecommendationsSearchTerm] = useState('');

  // Pagination for analysis results
  const [analysisCurrentPage, setAnalysisCurrentPage] = useState(1);
  const analysisPageSize = 20;

  // Pagination for recommendations
  const [recsCurrentPage, setRecsCurrentPage] = useState(1);
  const recsPageSize = 10;

  // Reset pagination when search changes
  useEffect(() => {
    setAnalysisCurrentPage(1);
  }, [analysisSearchTerm]);

  useEffect(() => {
    setRecsCurrentPage(1);
  }, [recommendationsSearchTerm]);

  const { data: classes } = useSlottingClasses();
  const { data: stats } = useSlottingStats();
  const { data: analysis, refetch: refetchAnalysis } = useSlottingAnalysis(
    selectedDays,
    showAnalysis
  );
  const { data: recommendations } = useSlottingRecommendations();

  const runAnalysisMutation = useRunSlottingAnalysis();
  const implementMutation = useImplementSlotting();
  const { showToast } = useToast();

  const handleRunAnalysis = async () => {
    try {
      await runAnalysisMutation.mutateAsync(selectedDays);
      setShowAnalysis(true);
      showToast('ABC analysis completed successfully', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to run analysis', 'error');
    }
  };

  const handleImplement = async (rec: RecommendationItem) => {
    try {
      await implementMutation.mutateAsync({
        sku: rec.sku,
        fromLocation: rec.fromLocation,
        toLocation: rec.toLocation,
      });
      showToast(`Moved ${rec.sku} to ${rec.toLocation}`, 'success');
      setSelectedRecommendation(null);
    } catch (error: any) {
      showToast(error?.message || 'Failed to implement recommendation', 'error');
    }
  };

  const classesData = classes?.data?.classes || [];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Slotting Optimization
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ABC analysis and slotting recommendations
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-gray-400" />
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total SKUs</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.data?.totalSkUs || 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Class A SKUs</p>
                  <p className="text-2xl font-bold text-green-600">{stats.data?.classASkus || 0}</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Class B SKUs</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.data?.classBSkus || 0}</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-gray-700">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Class C SKUs</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.data?.classCSkus || 0}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ABC Analysis Section */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle>ABC Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <label
                  htmlFor="analysis-days"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Analysis Period:
                </label>
                <Select
                  id="analysis-days"
                  value={selectedDays.toString()}
                  onChange={e => setSelectedDays(parseInt(e.target.value))}
                  options={[
                    { value: '30', label: '30 Days' },
                    { value: '60', label: '60 Days' },
                    { value: '90', label: '90 Days' },
                    { value: '180', label: '180 Days' },
                  ]}
                  className="w-40"
                />
                <Button
                  onClick={handleRunAnalysis}
                  disabled={runAnalysisMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <PlayIcon className="h-4 w-4" />
                  {runAnalysisMutation.isPending ? 'Analyzing...' : 'Run Analysis'}
                </Button>
              </div>

              {/* ABC Classes Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {classesData.map((cls: any) => (
                  <div
                    key={cls.class}
                    className="p-4 border dark:border-gray-700 rounded-lg"
                    style={{
                      borderColor: cls.color,
                      backgroundColor: `${cls.color}10`,
                    }}
                  >
                    <h3 className="font-semibold mb-2" style={{ color: cls.color }}>
                      {cls.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {cls.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Recommended: {cls.recommendedZones?.join(', ') || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {cls.placementStrategy}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {showAnalysis && analysis && analysis.length > 0 && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Analysis Results ({analysis.length} SKUs)</span>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search SKUs..."
                      value={analysisSearchTerm}
                      onChange={e => setAnalysisSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 w-48 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors dark:bg-gray-700"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {(() => {
                    const filteredAnalysis = analysis.filter((item: any) => {
                      if (!analysisSearchTerm.trim()) return true;
                      const query = analysisSearchTerm.toLowerCase();
                      return (
                        item.sku?.toLowerCase().includes(query) ||
                        item.productName?.toLowerCase().includes(query) ||
                        item.currentLocation?.toLowerCase().includes(query) ||
                        item.abcClass?.toLowerCase().includes(query)
                      );
                    });
                    const totalPages = Math.ceil(filteredAnalysis.length / analysisPageSize);
                    const paginatedAnalysis = filteredAnalysis.slice(
                      (analysisCurrentPage - 1) * analysisPageSize,
                      analysisCurrentPage * analysisPageSize
                    );
                    return (
                      <>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b dark:border-gray-700">
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                SKU
                              </th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                Product
                              </th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                Current Location
                              </th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                Class
                              </th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                Velocity
                              </th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                                Priority
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedAnalysis.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="py-4 px-3 text-center text-sm text-gray-500 dark:text-gray-400"
                                >
                                  {filteredAnalysis.length === 0
                                    ? 'No SKUs match your search'
                                    : 'No SKUs on this page'}
                                </td>
                              </tr>
                            ) : (
                              paginatedAnalysis.map((item: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className="border-b dark:border-gray-700 last:border-0"
                                >
                                  <td className="py-2 px-3 font-mono text-gray-900 dark:text-white">
                                    {item.sku}
                                  </td>
                                  <td className="py-2 px-3 text-gray-900 dark:text-white">
                                    {item.productName}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-gray-600 dark:text-gray-400">
                                    {item.currentLocation}
                                  </td>
                                  <td className="py-2 px-3">
                                    <Badge
                                      variant={
                                        item.abcClass === 'A'
                                          ? 'success'
                                          : item.abcClass === 'B'
                                            ? 'warning'
                                            : 'secondary'
                                      }
                                    >
                                      {item.abcClass}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-3 text-gray-900 dark:text-white">
                                    {item.velocity?.toFixed(2) || 0}/day
                                  </td>
                                  <td className="py-2 px-3">
                                    <Badge
                                      variant={
                                        item.priority === 'HIGH'
                                          ? 'danger'
                                          : item.priority === 'MEDIUM'
                                            ? 'warning'
                                            : 'secondary'
                                      }
                                    >
                                      {item.priority}
                                    </Badge>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>

                        {/* Pagination for Analysis Results */}
                        {totalPages > 1 && (
                          <div className="flex justify-center mt-4">
                            <Pagination
                              currentPage={analysisCurrentPage}
                              totalPages={totalPages}
                              onPageChange={setAnalysisCurrentPage}
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

          {/* Recommendations */}
          {recommendations &&
            recommendations.data?.recommendations &&
            recommendations.data.recommendations.length > 0 && (
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                      Slotting Recommendations ({recommendations.data.recommendations.length})
                    </div>
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search recommendations..."
                        value={recommendationsSearchTerm}
                        onChange={e => setRecommendationsSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-1.5 w-56 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors dark:bg-gray-700"
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const allRecs = recommendations.data.recommendations.filter(
                        (rec: RecommendationItem) => {
                          if (!recommendationsSearchTerm.trim()) return true;
                          const query = recommendationsSearchTerm.toLowerCase();
                          return (
                            rec.sku?.toLowerCase().includes(query) ||
                            rec.productName?.toLowerCase().includes(query) ||
                            rec.fromLocation?.toLowerCase().includes(query) ||
                            rec.toLocation?.toLowerCase().includes(query)
                          );
                        }
                      );
                      const totalPages = Math.ceil(allRecs.length / recsPageSize);
                      const paginatedRecs = allRecs.slice(
                        (recsCurrentPage - 1) * recsPageSize,
                        recsCurrentPage * recsPageSize
                      );
                      return (
                        <>
                          {paginatedRecs.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              {allRecs.length === 0
                                ? 'No recommendations match your search'
                                : 'No recommendations on this page'}
                            </div>
                          ) : (
                            paginatedRecs.map((rec: RecommendationItem, idx: number) => (
                              <div
                                key={idx}
                                className={`p-4 border dark:border-gray-700 rounded-lg ${
                                  selectedRecommendation?.sku === rec.sku
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white">
                                      {rec.productName}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                      {rec.sku}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      rec.priority >= 8
                                        ? 'danger'
                                        : rec.priority >= 5
                                          ? 'warning'
                                          : 'secondary'
                                    }
                                  >
                                    Priority: {rec.priority}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                  <span>From: {rec.fromLocation}</span>
                                  <ArrowRightIcon className="h-4 w-4" />
                                  <span>To: {rec.toLocation}</span>
                                </div>

                                {rec.estimatedBenefit && (
                                  <div className="mb-3 text-xs">
                                    {rec.estimatedBenefit.efficiencyGain && (
                                      <span className="mr-3">
                                        Efficiency: +{rec.estimatedBenefit.efficiencyGain}%
                                      </span>
                                    )}
                                    {rec.estimatedBenefit.timeSaved && (
                                      <span>Time saved: {rec.estimatedBenefit.timeSaved}m</span>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center justify-between">
                                  <Badge
                                    variant={
                                      rec.effort === 'LOW'
                                        ? 'success'
                                        : rec.effort === 'MEDIUM'
                                          ? 'warning'
                                          : 'danger'
                                    }
                                  >
                                    {rec.effort} Effort
                                  </Badge>
                                  <Button
                                    size="sm"
                                    onClick={() => handleImplement(rec)}
                                    disabled={implementMutation.isPending}
                                    variant="secondary"
                                  >
                                    Implement
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}

                          {/* Pagination for Recommendations */}
                          {totalPages > 1 && (
                            <div className="flex justify-center mt-4">
                              <Pagination
                                currentPage={recsCurrentPage}
                                totalPages={totalPages}
                                onPageChange={setRecsCurrentPage}
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

          {/* Confirmation Dialog */}
          {selectedRecommendation && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Confirm Slotting Change
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Move <strong>{selectedRecommendation.productName}</strong> from{' '}
                  <strong>{selectedRecommendation.fromLocation}</strong> to{' '}
                  <strong>{selectedRecommendation.toLocation}</strong>?
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleImplement(selectedRecommendation)}
                    disabled={implementMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Confirm
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedRecommendation(null)}
                    disabled={implementMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <XCircleIcon className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default SlottingPage;
