/**
 * Advanced Inventory Types
 *
 * Domain model for advanced inventory management features
 * Landed cost, ABC analysis, demand planning, cycle count optimization
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Landed cost component types
 */
export enum LandedCostComponentType {
  FREIGHT = 'FREIGHT',
  DUTY = 'DUTY',
  INSURANCE = 'INSURANCE',
  HANDLING = 'HANDLING',
  OTHER = 'OTHER',
}

/**
 * Allocation method for landed costs
 */
export enum AllocationMethod {
  PROPORTIONAL = 'PROPORTIONAL',
  EQUAL = 'EQUAL',
  WEIGHT = 'WEIGHT',
  VOLUME = 'VOLUME',
}

/**
 * ABC classification
 */
export enum ABCClass {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D', // Dead/Obsolete
}

/**
 * Inventory layer transaction types
 */
export enum LayerTransactionType {
  RECEIPT = 'RECEIPT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}

/**
 * Depletion transaction types
 */
export enum DepletionTransactionType {
  SHIPMENT = 'SHIPMENT',
  TRANSFER_OUT = 'TRANSFER_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGE = 'DAMAGE',
}

/**
 * Forecast methods
 */
export enum ForecastMethod {
  MOVING_AVERAGE = 'MOVING_AVERAGE',
  EXPONENTIAL_SMOOTHING = 'EXPONENTIAL_SMOOTHING',
  TREND = 'TREND',
  SEASONAL = 'SEASONAL',
  ML = 'ML',
}

/**
 * Period types for forecasting
 */
export enum PeriodType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
}

/**
 * Cycle count strategies
 */
export enum CycleCountStrategy {
  ABC_BASED = 'ABC_BASED',
  RANDOM = 'RANDOM',
  VELOCITY = 'VELOCITY',
  LOCATION = 'LOCATION',
  ZONE = 'ZONE',
}

/**
 * Count priority
 */
export enum CountPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Safety stock calculation method
 */
export enum SafetyStockMethod {
  SERVICE_LEVEL = 'SERVICE_LEVEL',
  FIXED_PERIOD = 'FIXED_PERIOD',
  MIN_MAX = 'MIN_MAX',
}

/**
 * Inventory velocity category
 */
export enum VelocityCategory {
  FAST = 'FAST',
  SLOW = 'SLOW',
  OBSOLETE = 'OBSOLETE',
  DEAD = 'DEAD',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Landed cost component
 */
export interface LandedCostComponent {
  componentId: string;
  receiptLineId: string;
  componentType: LandedCostComponentType;
  amount: number;
  currency: string;
  description?: string;
  vendorId?: string;
  allocationMethod: AllocationMethod;
  referenceDocumentId?: string;
  referenceDocumentNumber?: string;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Inventory layer for FIFO/LIFO valuation
 */
export interface InventoryLayer {
  layerId: string;
  sku: string;
  receiptLineId?: string;
  transactionType: LayerTransactionType;
  quantity: number;
  unitCost: number;
  landedCost: number;
  totalCost: number;
  layerDate: Date;
  isExhausted: boolean;
  remainingQuantity: number;
  warehouseLocation?: string;
  referenceDocument?: string;
  referenceType?: string;
  createdAt: Date;
}

/**
 * Inventory layer depletion (COGS tracking)
 */
export interface InventoryLayerDepletion {
  depletionId: string;
  layerId: string;
  sku: string;
  quantity: number;
  unitCost: number;
  landedCost: number;
  depletionDate: Date;
  transactionType?: DepletionTransactionType;
  referenceDocument?: string;
  createdAt: Date;
}

/**
 * ABC analysis header
 */
export interface ABCAnalysis {
  analysisId: string;
  analysisName: string;
  analysisDate: Date;
  periodStartDate: Date;
  periodEndDate: Date;
  classificationMethod: string;
  aThreshold: number;
  bThreshold: number;
  totalSkusAnalyzed: number;
  totalUsageValue: number;
  createdAt: Date;
  createdBy?: string;
}

/**
 * ABC analysis detail
 */
export interface ABCAnalysisDetail {
  detailId: string;
  analysisId: string;
  sku: string;
  abcClass: ABCClass;
  annualUsageQuantity?: number;
  annualUsageValue?: number;
  unitCost?: number;
  cumulativePercentage: number;
  contributionToTotal: number;
  turnoverRatio?: number;
  daysInventoryOutstanding?: number;
  previousClass?: ABCClass;
  classChange?: string;
}

/**
 * Demand forecast header
 */
export interface DemandForecast {
  forecastId: string;
  forecastName: string;
  forecastType: string;
  forecastMethod: ForecastMethod;
  periodType: PeriodType;
  forecastHorizonWeeks: number;
  historicalPeriodsUsed: number;
  confidenceLevel: number;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Demand forecast detail
 */
export interface DemandForecastDetail {
  detailId: string;
  forecastId: string;
  sku: string;
  locationId?: string;
  forecastPeriodStart: Date;
  forecastPeriodEnd: Date;
  forecastQuantity: number;
  lowerBoundQuantity?: number;
  upperBoundQuantity?: number;
  actualQuantity?: number;
  forecastAccuracy?: number;
  seasonalityFactor?: number;
  trendFactor?: number;
  foreignSkuId?: string;
  createdAt: Date;
}

/**
 * Demand history
 */
export interface DemandHistory {
  historyId: string;
  sku: string;
  locationId?: string;
  periodStart: Date;
  periodEnd: Date;
  periodType: PeriodType;
  quantityDemanded: number;
  quantityShipped?: number;
  quantityBackordered?: number;
  revenue?: number;
  uniqueOrders?: number;
  averageOrderQuantity?: number;
  seasonalityFactor?: number;
  createdAt: Date;
}

/**
 * Cycle count optimization header
 */
export interface CycleCountOptimization {
  optimizationId: string;
  optimizationName: string;
  optimizationDate: Date;
  optimizationStrategy: CycleCountStrategy;
  countFrequencyA: number;
  countFrequencyB: number;
  countFrequencyC: number;
  totalItemsToCount: number;
  estimatedHours?: number;
  targetAccuracy: number;
  resourceConstraints?: Record<string, unknown>;
  createdAt: Date;
  createdBy?: string;
}

/**
 * Cycle count schedule
 */
export interface CycleCountSchedule {
  scheduleId: string;
  optimizationId?: string;
  sku: string;
  locationId?: string;
  priority: CountPriority;
  plannedCountDate: Date;
  estimatedMinutes?: number;
  lastCountDate?: Date;
  daysSinceLastCount?: number;
  countFrequencyDays?: number;
  velocityImpact?: number;
  accuracyImpact?: number;
  abcClass?: ABCClass;
  status: string;
  assignedTo?: string;
  notes?: string;
  createdAt: Date;
}

/**
 * Safety stock level
 */
export interface SafetyStockLevel {
  safetyStockId: string;
  sku: string;
  locationId?: string;
  calculationMethod: SafetyStockMethod;
  leadTimeDays: number;
  demandStandardDeviation?: number;
  leadTimeStandardDeviation?: number;
  serviceLevelTarget: number;
  safetyStockQuantity: number;
  reorderPoint: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  orderQuantityMultiple?: number;
  lastCalculatedAt: Date;
  calculatedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reorder point history
 */
export interface ReorderPointHistory {
  historyId: string;
  sku: string;
  locationId?: string;
  oldReorderPoint?: number;
  newReorderPoint: number;
  oldSafetyStock?: number;
  newSafetyStock: number;
  changeReason?: string;
  calculationMethod?: string;
  changedBy?: string;
  changedAt: Date;
}

/**
 * Inventory investment analysis header
 */
export interface InventoryInvestment {
  analysisId: string;
  analysisDate: Date;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  totalInvestment: number;
  fastMovingInvestment: number;
  slowMovingInvestment: number;
  obsoleteInvestment: number;
  totalSkus: number;
  fastMovingSkus: number;
  slowMovingSkus: number;
  obsoleteSkus: number;
  investmentTurnover?: number;
  gmri?: number; // Gross Margin Return on Investment
  createdAt: Date;
}

/**
 * Inventory investment detail
 */
export interface InventoryInvestmentDetail {
  detailId: string;
  analysisId: string;
  sku: string;
  inventoryValue: number;
  quantityOnHand: number;
  unitCost: number;
  daysSinceLastMovement: number;
  velocityCategory: VelocityCategory;
  turnoverRatio?: number;
  gmri?: number;
  carryingCostAnnual?: number;
  opportunityCost?: number;
}

/**
 * Slow moving inventory view
 */
export interface SlowMovingInventory {
  sku: string;
  productName?: string;
  quantity: number;
  binLocation?: string;
  unitCost: number;
  inventoryValue: number;
  daysSinceMovement: number;
  velocityStatus: VelocityCategory;
}

/**
 * Safety stock alert
 */
export interface SafetyStockAlert {
  sku: string;
  productName?: string;
  currentQuantity: number;
  safetyStock: number;
  reorderPoint: number;
  variance: number;
  alertStatus: 'CRITICAL' | 'WARNING' | 'OK';
}

// ============================================================================
// DTOs
// ============================================================================

/**
 * Create landed cost component DTO
 */
export interface CreateLandedCostComponentDTO {
  receiptLineId: string;
  componentType: LandedCostComponentType;
  amount: number;
  currency?: string;
  description?: string;
  vendorId?: string;
  allocationMethod?: AllocationMethod;
  referenceDocumentId?: string;
  referenceDocumentNumber?: string;
  createdBy?: string;
}

/**
 * Create ABC analysis DTO
 */
export interface CreateABCAnalysisDTO {
  analysisName: string;
  periodStartDate: Date;
  periodEndDate: Date;
  aThreshold?: number;
  bThreshold?: number;
  classificationMethod?: string;
  createdBy: string;
}

/**
 * Create demand forecast DTO
 */
export interface CreateDemandForecastDTO {
  forecastName: string;
  forecastType: string;
  forecastMethod: ForecastMethod;
  periodType: PeriodType;
  forecastHorizonWeeks?: number;
  historicalPeriodsUsed?: number;
  confidenceLevel?: number;
  skus?: string[]; // Specific SKUs to forecast
  locationId?: string;
  createdBy: string;
}

/**
 * Calculate safety stock DTO
 */
export interface CalculateSafetyStockDTO {
  sku: string;
  locationId?: string;
  serviceLevelTarget?: number;
  leadTimeDays?: number;
  calculationMethod?: SafetyStockMethod;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  orderQuantityMultiple?: number;
  calculatedBy?: string;
}

/**
 * Create cycle count optimization DTO
 */
export interface CreateCycleCountOptimizationDTO {
  optimizationName: string;
  optimizationStrategy?: CycleCountStrategy;
  countFrequencyA?: number;
  countFrequencyB?: number;
  countFrequencyC?: number;
  targetAccuracy?: number;
  resourceConstraints?: Record<string, unknown>;
  createdBy: string;
}

/**
 * Inventory layer summary
 */
export interface InventoryLayerSummary {
  sku: string;
  totalLayers: number;
  availableQuantity: number;
  totalLayerCost: number;
  weightedAvgCost: number;
  oldestLayerDate?: Date;
  newestLayerDate?: Date;
}

/**
 * Landed cost calculation result
 */
export interface LandedCostResult {
  receiptLineId: string;
  baseCost: number;
  landedCost: number;
  totalCost: number;
}
