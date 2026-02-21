/**
 * Slotting Optimization Page
 *
 * ABC analysis and slotting recommendations for warehouse optimization
 *
 * ============================================================================
 * AESTHETIC DIRECTION: OPTIMIZATION HUB - TEAL/MINT EFFICIENCY
 * ============================================================================
 * Efficiency-focused optimization interface:
 * - Teal/mint accent color system for efficiency
 * - Orchestrated staggered entrance animations
 * - ABC analysis visualization with priority tiers
 * - Recommendation cards with benefit indicators
 * - Zone heatmap for slotting visualization
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Select,
  Pagination,
  useToast,
  Breadcrumb,
  Header,
} from '@/components/shared';
import {
  useSlottingClasses,
  useSlottingStats,
  useSlottingAnalysis,
  useSlottingRecommendations,
  useImplementSlotting,
  useRunSlottingAnalysis,
} from '@/services/api';
import { usePageTracking, PageViews } from '@/hooks/usePageTracking';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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
  const { data: analysis } = useSlottingAnalysis(selectedDays, showAnalysis);
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
    <div className="min-h-screen slotting-page-container">
      <Header />
      {/* Atmospheric background */}
      <div className="slotting-atmosphere" aria-hidden="true" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 relative z-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />
        
        <div className="space-y-6">
          {/* Hero Header - Asymmetric Layout */}
          <div className="slotting-hero flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="slotting-hero-content">
              <div className="flex items-center gap-3 mb-3">
                <div className="slotting-icon-wrapper">
                  <ChartBarIcon className="h-6 w-6" />
                </div>
                <Badge className="slotting-badge-pulse">
                  <SparklesIcon className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </div>
              <h1 className="slotting-title">
                Slotting Optimization
              </h1>
              <p className="slotting-subtitle">
                ABC analysis and intelligent slotting recommendations for warehouse efficiency
              </p>
            </div>
            <div className="slotting-hero-visual hidden md:block">
              <div className="slotting-efficiency-meter">
                <div className="efficiency-ring" />
                <div className="efficiency-value">94%</div>
                <div className="efficiency-label">Efficiency Score</div>
              </div>
            </div>
          </div>

          {/* Stats Overview - Staggered Cards */}
          {stats && (
            <div className="slotting-stats-grid">
              <div className="slotting-stat-card" style={{ animationDelay: '0.05s' }}>
                <div className="stat-icon stat-icon-neutral">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Total SKUs</p>
                  <p className="stat-value stat-value-neutral">{stats.data?.totalSkUs || 0}</p>
                </div>
              </div>
              
              <div className="slotting-stat-card" style={{ animationDelay: '0.1s' }}>
                <div className="stat-icon stat-icon-a">
                  <span>A</span>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Class A SKUs</p>
                  <p className="stat-value stat-value-a">{stats.data?.classASkus || 0}</p>
                  <p className="stat-sublabel">High Velocity</p>
                </div>
              </div>
              
              <div className="slotting-stat-card" style={{ animationDelay: '0.15s' }}>
                <div className="stat-icon stat-icon-b">
                  <span>B</span>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Class B SKUs</p>
                  <p className="stat-value stat-value-b">{stats.data?.classBSkus || 0}</p>
                  <p className="stat-sublabel">Medium Velocity</p>
                </div>
              </div>
              
              <div className="slotting-stat-card" style={{ animationDelay: '0.2s' }}>
                <div className="stat-icon stat-icon-c">
                  <span>C</span>
                </div>
                <div className="stat-content">
                  <p className="stat-label">Class C SKUs</p>
                  <p className="stat-value stat-value-c">{stats.data?.classCSkus || 0}</p>
                  <p className="stat-sublabel">Low Velocity</p>
                </div>
              </div>
            </div>
          )}

          {/* ABC Analysis Section */}
          <div className="slotting-analysis-section">
            <div className="slotting-card slotting-card-primary">
              <div className="slotting-card-header">
                <div className="flex items-center gap-3">
                  <div className="slotting-card-icon">
                    <ChartBarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="slotting-card-title">ABC Analysis</h2>
                    <p className="slotting-card-description">Analyze SKU velocity and classify inventory</p>
                  </div>
                </div>
              </div>
              
              <div className="slotting-card-content">
                <div className="slotting-controls">
                  <div className="slotting-control-group">
                    <label htmlFor="analysis-days" className="slotting-label">
                      Analysis Period
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
                      className="slotting-select"
                    />
                  </div>
                  
                  <Button
                    onClick={handleRunAnalysis}
                    disabled={runAnalysisMutation.isPending}
                    className="slotting-btn-primary"
                  >
                    {runAnalysisMutation.isPending ? (
                      <>
                        <div className="slotting-spinner" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-4 w-4" />
                        Run Analysis
                      </>
                    )}
                  </Button>
                </div>

                {/* ABC Classes Info - Visual Cards */}
                <div className="slotting-classes-grid">
                  {classesData.map((cls: any, index: number) => (
                    <div
                      key={cls.class}
                      className={`slotting-class-card slotting-class-${cls.class.toLowerCase()}`}
                      style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                    >
                      <div className="class-header">
                        <div className="class-badge">{cls.name}</div>
                        <div className="class-percentage">{cls.percentage || '20%'}</div>
                      </div>
                      <p className="class-description">{cls.description}</p>
                      <div className="class-zones">
                        <span className="zone-label">Zones:</span>
                        <span className="zone-value">{cls.recommendedZones?.join(', ') || 'N/A'}</span>
                      </div>
                      <div className="class-strategy">{cls.placementStrategy}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          {showAnalysis && analysis && analysis.length > 0 && (
            <div className="slotting-results-section" style={{ animationDelay: '0.3s' }}>
              <div className="slotting-card">
                <div className="slotting-card-header">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="slotting-card-icon slotting-card-icon-success">
                        <CheckCircleIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="slotting-card-title">Analysis Results</h2>
                        <p className="slotting-card-description">{analysis.length} SKUs analyzed</p>
                      </div>
                    </div>
                    <div className="slotting-search-wrapper">
                      <MagnifyingGlassIcon className="slotting-search-icon" />
                      <input
                        type="text"
                        placeholder="Search SKUs..."
                        value={analysisSearchTerm}
                        onChange={e => setAnalysisSearchTerm(e.target.value)}
                        className="slotting-search-input"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="slotting-card-content">
                  <div className="slotting-table-wrapper">
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
                          <table className="slotting-table">
                            <thead>
                              <tr>
                                <th>SKU</th>
                                <th>Product</th>
                                <th>Location</th>
                                <th>Class</th>
                                <th>Velocity</th>
                                <th>Priority</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedAnalysis.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="slotting-table-empty">
                                    {filteredAnalysis.length === 0
                                      ? 'No SKUs match your search'
                                      : 'No SKUs on this page'}
                                  </td>
                                </tr>
                              ) : (
                                paginatedAnalysis.map((item: any, idx: number) => (
                                  <tr key={idx} className="slotting-table-row">
                                    <td className="slotting-sku-cell">{item.sku}</td>
                                    <td className="slotting-product-cell">{item.productName}</td>
                                    <td className="slotting-location-cell">{item.currentLocation}</td>
                                    <td>
                                      <span className={`slotting-class-badge slotting-class-badge-${item.abcClass?.toLowerCase()}`}>
                                        {item.abcClass}
                                      </span>
                                    </td>
                                    <td className="slotting-velocity-cell">
                                      {item.velocity?.toFixed(2) || 0}/day
                                    </td>
                                    <td>
                                      <span className={`slotting-priority-badge slotting-priority-${item.priority?.toLowerCase()}`}>
                                        {item.priority}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>

                          {totalPages > 1 && (
                            <div className="slotting-pagination">
                              <Pagination
                                currentPage={analysisCurrentPage}
                                totalItems={filteredAnalysis.length}
                                pageSize={analysisPageSize}
                                onPageChange={setAnalysisCurrentPage}
                              />
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations &&
            recommendations.data?.recommendations &&
            recommendations.data.recommendations.length > 0 && (
              <div className="slotting-recommendations-section" style={{ animationDelay: '0.35s' }}>
                <div className="slotting-card slotting-card-recommendations">
                  <div className="slotting-card-header">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="slotting-card-icon slotting-card-icon-accent">
                          <ArrowTrendingUpIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="slotting-card-title">
                            Slotting Recommendations
                            <span className="slotting-count-badge">
                              {recommendations.data.recommendations.length}
                            </span>
                          </h2>
                          <p className="slotting-card-description">AI-suggested inventory movements</p>
                        </div>
                      </div>
                      <div className="slotting-search-wrapper">
                        <MagnifyingGlassIcon className="slotting-search-icon" />
                        <input
                          type="text"
                          placeholder="Search recommendations..."
                          value={recommendationsSearchTerm}
                          onChange={e => setRecommendationsSearchTerm(e.target.value)}
                          className="slotting-search-input"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="slotting-card-content">
                    <div className="slotting-recommendations-grid">
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
                              <div className="slotting-empty-state">
                                <div className="slotting-empty-icon">
                                  <MagnifyingGlassIcon className="h-8 w-8" />
                                </div>
                                <p className="slotting-empty-text">
                                  {allRecs.length === 0
                                    ? 'No recommendations match your search'
                                    : 'No recommendations on this page'}
                                </p>
                              </div>
                            ) : (
                              paginatedRecs.map((rec: RecommendationItem, idx: number) => (
                                <div
                                  key={idx}
                                  className={`slotting-recommendation-card ${
                                    selectedRecommendation?.sku === rec.sku
                                      ? 'slotting-recommendation-selected'
                                      : ''
                                  }`}
                                  style={{ animationDelay: `${0.05 * idx}s` }}
                                >
                                  <div className="recommendation-header">
                                    <div className="recommendation-product">
                                      <h4 className="recommendation-name">{rec.productName}</h4>
                                      <p className="recommendation-sku">{rec.sku}</p>
                                    </div>
                                    <div className={`recommendation-priority priority-${rec.priority >= 8 ? 'high' : rec.priority >= 5 ? 'medium' : 'low'}`}>
                                      <span className="priority-value">{rec.priority}</span>
                                      <span className="priority-label">Priority</span>
                                    </div>
                                  </div>

                                  <div className="recommendation-movement">
                                    <div className="movement-from">
                                      <span className="movement-label">From</span>
                                      <span className="movement-location">{rec.fromLocation}</span>
                                    </div>
                                    <div className="movement-arrow">
                                      <ArrowRightIcon className="h-4 w-4" />
                                    </div>
                                    <div className="movement-to">
                                      <span className="movement-label">To</span>
                                      <span className="movement-location">{rec.toLocation}</span>
                                    </div>
                                  </div>

                                  {rec.estimatedBenefit && (
                                    <div className="recommendation-benefits">
                                      {rec.estimatedBenefit.efficiencyGain && (
                                        <div className="benefit-item">
                                          <span className="benefit-icon">↑</span>
                                          <span className="benefit-value">+{rec.estimatedBenefit.efficiencyGain}%</span>
                                          <span className="benefit-label">Efficiency</span>
                                        </div>
                                      )}
                                      {rec.estimatedBenefit.timeSaved && (
                                        <div className="benefit-item">
                                          <span className="benefit-icon">⏱</span>
                                          <span className="benefit-value">{rec.estimatedBenefit.timeSaved}m</span>
                                          <span className="benefit-label">Saved</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="recommendation-footer">
                                    <span className={`effort-badge effort-${rec.effort?.toLowerCase()}`}>
                                      {rec.effort} Effort
                                    </span>
                                    <Button
                                      size="sm"
                                      onClick={() => handleImplement(rec)}
                                      disabled={implementMutation.isPending}
                                      className="slotting-btn-implement"
                                    >
                                      Implement
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}

                            {totalPages > 1 && (
                              <div className="slotting-pagination">
                                <Pagination
                                  currentPage={recsCurrentPage}
                                  totalItems={allRecs.length}
                                  pageSize={recsPageSize}
                                  onPageChange={setRecsCurrentPage}
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Confirmation Dialog */}
          {selectedRecommendation && (
            <div className="slotting-confirmation-overlay">
              <div className="slotting-confirmation-dialog">
                <div className="confirmation-icon">
                  <ArrowRightIcon className="h-6 w-6" />
                </div>
                <h3 className="confirmation-title">Confirm Slotting Change</h3>
                <p className="confirmation-description">
                  Move <strong>{selectedRecommendation.productName}</strong> from{' '}
                  <span className="confirmation-location">{selectedRecommendation.fromLocation}</span> to{' '}
                  <span className="confirmation-location">{selectedRecommendation.toLocation}</span>?
                </p>
                <div className="confirmation-actions">
                  <Button
                    onClick={() => handleImplement(selectedRecommendation)}
                    disabled={implementMutation.isPending}
                    className="slotting-btn-confirm"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    {implementMutation.isPending ? 'Moving...' : 'Confirm Move'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedRecommendation(null)}
                    disabled={implementMutation.isPending}
                    className="slotting-btn-cancel"
                  >
                    <XCircleIcon className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default SlottingPage;