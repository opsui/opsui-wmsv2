/**
 * Manufacturing Module Types
 *
 * Types for advanced manufacturing operations
 * Integrates with Production, Inventory, Purchasing, HR, and Projects modules
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Work Center Status
 */
export enum WorkCenterStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  DOWN = 'DOWN',
}

/**
 * Routing Status
 */
export enum RoutingStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUPERSEDED = 'SUPERSEDED',
}

/**
 * Operation Type
 */
export enum OperationType {
  SETUP = 'SETUP',
  MACHINING = 'MACHINING',
  ASSEMBLY = 'ASSEMBLY',
  INSPECTION = 'INSPECTION',
  PACKAGING = 'PACKAGING',
  OUTSIDE_PROCESS = 'OUTSIDE_PROCESS',
}

/**
 * Production Order Status
 */
export enum ProductionOrderStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  RELEASED = 'RELEASED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

/**
 * MPS Status
 */
export enum MPSStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  FIRM = 'FIRM',
  RELEASED = 'RELEASED',
}

/**
 * MRP Plan Status
 */
export enum MRPPlanStatus {
  DRAFT = 'DRAFT',
  CALCULATING = 'CALCULATING',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  RELEASED = 'RELEASED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * MRP Action Type
 */
export enum MRPActionType {
  RELEASE_ORDER = 'RELEASE_ORDER',
  RESCHEDULE_IN = 'RESCHEDULE_IN',
  RESCHEDULE_OUT = 'RESCHEDULE_OUT',
  CANCEL_ORDER = 'CANCEL_ORDER',
  ADJUST_QUANTITY = 'ADJUST_QUANTITY',
  EXPEDITE = 'EXPEDITE',
  DE_EXPEDITE = 'DE_EXPEDITE',
}

/**
 * Shop Floor Transaction Type
 */
export enum ShopFloorTransactionType {
  CLOCK_ON = 'CLOCK_ON',
  CLOCK_OFF = 'CLOCK_OFF',
  REPORT_QUANTITY = 'REPORT_QUANTITY',
  REPORT_SCRAP = 'REPORT_SCRAP',
  REPORT_REWORK = 'REPORT_REWORK',
  MOVE_OPERATION = 'MOVE_OPERATION',
  COMPLETE_OPERATION = 'COMPLETE_OPERATION',
  SUSPEND = 'SUSPEND',
  RESUME = 'RESUME',
}

/**
 * Defect Type
 */
export enum DefectType {
  DIMENSIONAL = 'DIMENSIONAL',
  COSMETIC = 'COSMETIC',
  FUNCTIONAL = 'FUNCTIONAL',
  MATERIAL = 'MATERIAL',
  ASSEMBLY = 'ASSEMBLY',
  PACKAGING = 'PACKAGING',
  DOCUMENTATION = 'DOCUMENTATION',
  OTHER = 'OTHER',
}

/**
 * Defect Severity
 */
export enum DefectSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

/**
 * Defect Disposition
 */
export enum DefectDisposition {
  ACCEPT = 'ACCEPT',
  REWORK = 'REWORK',
  SCRAP = 'SCRAP',
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
  CONCESSION = 'CONCESSION',
  QUARANTINE = 'QUARANTINE',
}

/**
 * Capacity Plan Status
 */
export enum CapacityPlanStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

// ============================================================================
// WORK CENTER TYPES
// ============================================================================

/**
 * Work Center interface
 */
export interface WorkCenter {
  work_center_id: string;
  work_center_code: string;
  work_center_name: string;
  entity_id: string | null;
  department: string | null;
  cost_center: string | null;
  location: string | null;
  site_id: string | null;
  capacity_per_shift: number;
  shifts_per_day: number;
  efficiency_percent: number;
  utilization_percent: number;
  available_capacity: number;
  labor_rate_per_hour: number | null;
  machine_rate_per_hour: number | null;
  overhead_rate_per_hour: number | null;
  burden_rate: number | null;
  setup_time_required: boolean;
  calendar_id: string | null;
  work_center_status: WorkCenterStatus;
  active: boolean;
  description: string | null;
  equipment_list: Record<string, unknown> | null;
  skills_required: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Work Center Queue
 */
export interface WorkCenterQueue {
  queue_id: string;
  work_center_id: string;
  current_orders: number;
  current_hours: number;
  queued_orders: number;
  queued_hours: number;
  average_wait_time_hours: number | null;
  average_cycle_time_hours: number | null;
  on_time_performance_percent: number | null;
  last_calculated_at: Date | null;
  created_at: Date;
}

/**
 * Create Work Center DTO
 */
export interface CreateWorkCenterDTO {
  work_center_code: string;
  work_center_name: string;
  entity_id?: string;
  department?: string;
  cost_center?: string;
  location?: string;
  site_id?: string;
  capacity_per_shift?: number;
  shifts_per_day?: number;
  efficiency_percent?: number;
  utilization_percent?: number;
  labor_rate_per_hour?: number;
  machine_rate_per_hour?: number;
  overhead_rate_per_hour?: number;
  burden_rate?: number;
  setup_time_required?: boolean;
  calendar_id?: string;
  description?: string;
  equipment_list?: Record<string, unknown>;
  skills_required?: Record<string, unknown>;
}

// ============================================================================
// ROUTING TYPES
// ============================================================================

/**
 * Routing interface
 */
export interface Routing {
  routing_id: string;
  routing_number: string;
  entity_id: string | null;
  sku: string;
  item_description: string | null;
  routing_name: string;
  routing_type: string;
  routing_status: RoutingStatus;
  version_number: number;
  effective_date: Date | null;
  expiration_date: Date | null;
  supersedes_routing_id: string | null;
  standard_lot_size: number;
  scrap_percent: number;
  yield_percent: number;
  standard_labor_hours: number | null;
  standard_machine_hours: number | null;
  standard_cost: number | null;
  approved_by: string | null;
  approved_at: Date | null;
  engineered_by: string | null;
  engineered_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Routing with details
 */
export interface RoutingWithDetails extends Routing {
  operations: RoutingOperation[];
  bom: RoutingBOMComponent[];
}

/**
 * Routing Operation interface
 */
export interface RoutingOperation {
  operation_id: string;
  routing_id: string;
  operation_number: number;
  operation_code: string | null;
  operation_name: string;
  operation_type: OperationType;
  description: string | null;
  work_center_id: string | null;
  work_center_description: string | null;
  sequence: number | null;
  sequence_step: string | null;
  send_ahead_quantity: number | null;
  overlap_percent: number | null;
  setup_hours: number;
  run_hours_per_unit: number;
  fixed_hours: number;
  labor_hours_per_unit: number | null;
  machine_hours_per_unit: number | null;
  minimum_crew_size: number;
  maximum_crew_size: number;
  labor_burden_rate: number | null;
  machine_burden_rate: number | null;
  inspection_required: boolean;
  inspection_percent: number | null;
  control_point: string | null;
  tooling_required: Record<string, unknown> | null;
  fixtures_required: Record<string, unknown> | null;
  outside_process_vendor_id: string | null;
  outside_process_cost: number | null;
  outside_process_lead_time_days: number | null;
  standard_operations: string | null;
  operator_instructions: string | null;
  setup_instructions: string | null;
  backflush_report_point: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Routing BOM Component
 */
export interface RoutingBOMComponent {
  bom_component_id: string;
  routing_id: string;
  operation_id: string | null;
  component_sku: string;
  component_description: string | null;
  component_type: string;
  quantity_per_assembly: number;
  scrap_percent: number;
  effective_quantity: number;
  substitute_sku: string | null;
  substitute_priority: number | null;
  optional: boolean;
  phantom: boolean;
  sourcing_rule: string | null;
  vendor_id: string | null;
  component_cost: number | null;
  overhead_percent: number | null;
  effective_from_date: Date | null;
  effective_to_date: Date | null;
  effectivity_quantity: number | null;
  notes: string | null;
  created_at: Date;
}

/**
 * Create Routing DTO
 */
export interface CreateRoutingDTO {
  sku: string;
  item_description?: string;
  routing_name: string;
  routing_type?: string;
  version_number?: number;
  effective_date?: Date;
  expiration_date?: Date;
  supersedes_routing_id?: string;
  standard_lot_size?: number;
  scrap_percent?: number;
  yield_percent?: number;
  standard_labor_hours?: number;
  standard_machine_hours?: number;
  standard_cost?: number;
  entity_id?: string;
  operations: Array<{
    operation_number: number;
    operation_code?: string;
    operation_name: string;
    operation_type?: OperationType;
    description?: string;
    work_center_id?: string;
    sequence?: number;
    sequence_step?: string;
    send_ahead_quantity?: number;
    overlap_percent?: number;
    setup_hours?: number;
    run_hours_per_unit: number;
    fixed_hours?: number;
    labor_hours_per_unit?: number;
    machine_hours_per_unit?: number;
    minimum_crew_size?: number;
    maximum_crew_size?: number;
    inspection_required?: boolean;
    inspection_percent?: number;
    control_point?: string;
    backflush_report_point?: boolean;
  }>;
  bom: Array<{
    component_sku: string;
    component_description?: string;
    component_type?: string;
    quantity_per_assembly: number;
    scrap_percent?: number;
    operation_id?: string;
    optional?: boolean;
    phantom?: boolean;
    sourcing_rule?: string;
    vendor_id?: string;
  }>;
}

// ============================================================================
// MPS TYPES
// ============================================================================

/**
 * MPS Period
 */
export interface MSPPeriod {
  period_id: string;
  entity_id: string | null;
  period_number: number;
  period_type: string;
  start_date: Date;
  end_date: Date;
  is_closed: boolean;
  is_frozen: boolean;
  frozen_through: Date | null;
  created_at: Date;
}

/**
 * MPS Item
 */
export interface MPSItem {
  mps_item_id: string;
  period_id: string;
  entity_id: string | null;
  sku: string;
  item_description: string | null;
  forecast_quantity: number;
  customer_orders_quantity: number;
  projected_available: number;
  planned_production_quantity: number;
  available_to_promise: number;
  mps_status: MPSStatus;
  planning_time_fence: Date | null;
  demand_time_fence: Date | null;
  order_due_date: Date | null;
  order_start_date: Date | null;
  production_order_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// MRP TYPES
// ============================================================================

/**
 * MRP Parameters
 */
export interface MRPParameters {
  parameter_id: string;
  entity_id: string | null;
  planning_horizon_days: number;
  planning_time_fence_days: number;
  release_time_fence_days: number;
  lot_sizing_rule: string;
  fixed_order_quantity: number | null;
  minimum_order_quantity: number | null;
  maximum_order_quantity: number | null;
  order_multiple: number | null;
  safety_stock_rule: string;
  safety_stock_days: number | null;
  safety_stock_percent: number | null;
  include_scrap_in_calculation: boolean;
  component_yield_percent: number;
  create_planned_orders: boolean;
  reschedule_orders: boolean;
  cancel_orders: boolean;
  reschedule_in_days_threshold: number;
  reschedule_out_days_threshold: number;
  mrp_cutoff_days: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * MRP Plan
 */
export interface MRPPlan {
  plan_id: string;
  plan_number: string;
  entity_id: string | null;
  plan_name: string;
  plan_type: string;
  plan_status: MRPPlanStatus;
  parameter_id: string | null;
  plan_date: Date;
  plan_start_date: Date;
  plan_end_date: Date;
  items_planned: number;
  orders_created: number;
  orders_modified: number;
  orders_cancelled: number;
  action_messages_generated: number;
  calculation_duration_seconds: number | null;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * MRP Plan Detail
 */
export interface MRPPlanDetail {
  detail_id: string;
  plan_id: string;
  sku: string;
  item_description: string | null;
  item_type: string | null;
  on_hand_quantity: number;
  on_order_quantity: number;
  allocated_quantity: number;
  available_quantity: number;
  lead_time_days: number;
  safety_stock_quantity: number;
  order_policy: string | null;
  order_quantity: number | null;
  minimum_order_quantity: number | null;
  maximum_order_quantity: number | null;
  gross_requirements: number;
  scheduled_receipts: number;
  planned_order_releases: number;
  planned_order_receipts: number;
  projected_available: number;
  action_message_count: number;
  exception_message: string | null;
  created_at: Date;
}

/**
 * MRP Action Message
 */
export interface MRPActionMessage {
  action_id: string;
  plan_id: string;
  detail_id: string | null;
  sku: string;
  action_type: MRPActionType;
  action_priority: number;
  order_type: string | null;
  order_id: string | null;
  order_number: string | null;
  current_quantity: number | null;
  current_date: Date | null;
  suggested_quantity: number | null;
  suggested_date: Date | null;
  is_reviewed: boolean;
  is_implemented: boolean;
  implemented_by: string | null;
  implemented_at: Date | null;
  implementation_notes: string | null;
  action_due_date: Date | null;
  notes: string | null;
  created_at: Date;
}

/**
 * Create MRP Plan DTO
 */
export interface CreateMRPPlanDTO {
  plan_name: string;
  plan_type?: string;
  entity_id?: string;
  plan_date?: Date;
  plan_start_date: Date;
  plan_end_date: Date;
  parameter_id?: string;
}

// ============================================================================
// PRODUCTION ORDER TYPES
// ============================================================================

/**
 * Production Order
 */
export interface ProductionOrder {
  order_id: string;
  order_number: string;
  entity_id: string | null;
  sku: string;
  item_description: string | null;
  routing_id: string | null;
  order_type: string;
  quantity_ordered: number;
  quantity_completed: number;
  quantity_scrapped: number;
  quantity_rejected: number;
  quantity_remaining: number;
  order_date: Date;
  start_date: Date;
  due_date: Date;
  actual_start_date: Date | null;
  actual_finish_date: Date | null;
  order_status: ProductionOrderStatus;
  progress_percent: number;
  estimated_labor_cost: number;
  estimated_material_cost: number;
  estimated_overhead_cost: number;
  estimated_total_cost: number;
  actual_labor_cost: number;
  actual_material_cost: number;
  actual_overhead_cost: number;
  actual_total_cost: number;
  customer_id: string | null;
  sales_order_id: string | null;
  sales_order_line_id: string | null;
  job_number: string | null;
  created_by: string;
  released_by: string | null;
  released_at: Date | null;
  closed_by: string | null;
  closed_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Production Order with details
 */
export interface ProductionOrderWithDetails extends ProductionOrder {
  operations: ProductionOrderOperation[];
  routing?: RoutingWithDetails;
}

/**
 * Production Order Operation
 */
export interface ProductionOrderOperation {
  operation_id: string;
  production_order_id: string;
  routing_operation_id: string | null;
  operation_number: number;
  operation_name: string;
  operation_type: OperationType;
  work_center_id: string | null;
  operation_status: string;
  sequence_step: string | null;
  quantity_completed: number;
  quantity_scrapped: number;
  quantity_rejected: number;
  estimated_setup_hours: number;
  estimated_run_hours: number;
  estimated_total_hours: number;
  actual_setup_hours: number;
  actual_run_hours: number;
  actual_total_hours: number;
  progress_percent: number;
  scheduled_start_date: Date | null;
  scheduled_finish_date: Date | null;
  actual_start_date: Date | null;
  actual_finish_date: Date | null;
  crew_size: number;
  assigned_to: Record<string, unknown> | null;
  actual_labor_cost: number;
  actual_machine_cost: number;
  inspection_required: boolean;
  inspection_completed: boolean;
  inspection_result: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create Production Order DTO
 */
export interface CreateProductionOrderDTO {
  sku: string;
  item_description?: string;
  routing_id?: string;
  order_type?: string;
  quantity_ordered: number;
  start_date: Date;
  due_date: Date;
  entity_id?: string;
  customer_id?: string;
  sales_order_id?: string;
  sales_order_line_id?: string;
  job_number?: string;
  notes?: string;
}

/**
 * Release Production Order DTO
 */
export interface ReleaseProductionOrderDTO {
  order_id: string;
  release_date?: Date;
}

// ============================================================================
// SHOP FLOOR TRANSACTION TYPES
// ============================================================================

/**
 * Shop Floor Transaction
 */
export interface ShopFloorTransaction {
  transaction_id: string;
  production_order_id: string;
  operation_id: string;
  transaction_type: ShopFloorTransactionType;
  transaction_date: Date;
  user_id: string;
  work_center_id: string | null;
  transaction_quantity: number;
  scrap_quantity: number;
  rework_quantity: number;
  hours_reported: number;
  labor_cost: number;
  machine_cost: number;
  from_work_center_id: string | null;
  to_work_center_id: string | null;
  lot_number: string | null;
  serial_numbers: Record<string, unknown> | null;
  notes: string | null;
  created_at: Date;
}

/**
 * Create Shop Floor Transaction DTO
 */
export interface CreateShopFloorTransactionDTO {
  production_order_id: string;
  operation_id: string;
  transaction_type: ShopFloorTransactionType;
  transaction_quantity?: number;
  scrap_quantity?: number;
  rework_quantity?: number;
  hours_reported?: number;
  lot_number?: string;
  serial_numbers?: string[];
  notes?: string;
}

// ============================================================================
// PRODUCTION QUALITY TYPES
// ============================================================================

/**
 * Production Inspection
 */
export interface ProductionInspection {
  inspection_id: string;
  production_order_id: string | null;
  operation_id: string | null;
  inspection_number: string;
  inspection_type: string;
  inspection_date: Date;
  sku: string;
  lot_number: string | null;
  quantity_inspected: number;
  quantity_accepted: number;
  quantity_rejected: number;
  quantity_reworked: number;
  inspected_by: string;
  inspected_at: Date | null;
  approved_by: string | null;
  approved_at: Date | null;
  inspection_result: string;
  overall_grade: string | null;
  defects_found: number;
  defect_details: Record<string, unknown> | null;
  disposition: string | null;
  disposition_notes: string | null;
  notes: string | null;
  created_at: Date;
}

/**
 * Production Defect
 */
export interface ProductionDefect {
  defect_id: string;
  inspection_id: string | null;
  production_order_id: string | null;
  operation_id: string | null;
  defect_type: DefectType;
  defect_severity: DefectSeverity;
  defect_code: string | null;
  defect_description: string;
  sku: string;
  lot_number: string | null;
  serial_number: string | null;
  defect_quantity: number;
  labor_cost_to_fix: number;
  material_cost_to_fix: number;
  total_cost_to_fix: number;
  root_cause_category: string | null;
  root_cause_description: string | null;
  disposition: DefectDisposition;
  disposition_by: string | null;
  disposition_at: Date | null;
  corrective_action: string | null;
  corrective_action_completed: boolean;
  corrective_action_by: string | null;
  corrective_action_at: Date | null;
  vendor_id: string | null;
  vendor_notified: boolean;
  vendor_claim_amount: number;
  created_at: Date;
  resolved_at: Date | null;
}

/**
 * Create Production Inspection DTO
 */
export interface CreateProductionInspectionDTO {
  production_order_id?: string;
  operation_id?: string;
  inspection_type: string;
  sku: string;
  lot_number?: string;
  quantity_inspected: number;
  quantity_accepted?: number;
  quantity_rejected?: number;
  quantity_reworked?: number;
  inspection_result: string;
  disposition?: string;
  disposition_notes?: string;
  notes?: string;
}

// ============================================================================
// CAPACITY PLANNING TYPES
// ============================================================================

/**
 * Capacity Plan
 */
export interface CapacityPlan {
  plan_id: string;
  plan_number: string;
  entity_id: string | null;
  plan_name: string;
  plan_type: string;
  plan_status: CapacityPlanStatus;
  start_date: Date;
  end_date: Date;
  created_by: string;
  approved_by: string | null;
  approved_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Capacity Plan Detail
 */
export interface CapacityPlanDetail {
  detail_id: string;
  plan_id: string;
  work_center_id: string;
  period_start_date: Date;
  period_end_date: Date;
  available_hours: number;
  available_units: number;
  planned_hours: number;
  planned_units: number;
  actual_hours: number;
  actual_units: number;
  utilization_percent: number;
  over_under_hours: number;
  is_overloaded: boolean;
  overload_quantity: number;
  is_underloaded: boolean;
  underload_quantity: number;
  created_at: Date;
}

/**
 * Create Capacity Plan DTO
 */
export interface CreateCapacityPlanDTO {
  plan_name: string;
  plan_type?: string;
  entity_id?: string;
  start_date: Date;
  end_date: Date;
  details: Array<{
    work_center_id: string;
    period_start_date: Date;
    period_end_date: Date;
    available_hours?: number;
    planned_hours: number;
  }>;
}

// ============================================================================
// QUERY AND FILTER TYPES
// ============================================================================

/**
 * Work Center Query Filters
 */
export interface WorkCenterQueryFilters {
  entity_id?: string;
  department?: string;
  work_center_status?: WorkCenterStatus;
  site_id?: string;
  search?: string;
}

/**
 * Routing Query Filters
 */
export interface RoutingQueryFilters {
  entity_id?: string;
  sku?: string;
  routing_status?: RoutingStatus;
  search?: string;
}

/**
 * Production Order Query Filters
 */
export interface ProductionOrderQueryFilters {
  entity_id?: string;
  sku?: string;
  order_status?: ProductionOrderStatus;
  order_type?: string;
  start_date_from?: Date;
  start_date_to?: Date;
  due_date_from?: Date;
  due_date_to?: Date;
  work_center_id?: string;
  customer_id?: string;
  sales_order_id?: string;
  job_number?: string;
  search?: string;
}

/**
 * MRP Plan Query Filters
 */
export interface MRPPlanQueryFilters {
  entity_id?: string;
  plan_status?: MRPPlanStatus;
  plan_date_from?: Date;
  plan_date_to?: Date;
  created_by?: string;
  search?: string;
}

/**
 * Capacity Plan Query Filters
 */
export interface CapacityPlanQueryFilters {
  entity_id?: string;
  plan_status?: CapacityPlanStatus;
  start_date_from?: Date;
  start_date_to?: Date;
  end_date_from?: Date;
  end_date_to?: Date;
  work_center_id?: string;
  search?: string;
}

// ============================================================================
// ANALYTICS AND REPORTING TYPES
// ============================================================================

/**
 * Manufacturing Dashboard Metrics
 */
export interface ManufacturingDashboardMetrics {
  // Orders
  active_orders: number;
  orders_past_due: number;
  orders_today: number;
  orders_ready_to_ship: number;

  // Work Centers
  work_centers_active: number;
  work_centers_idle: number;
  work_centers_overloaded: number;
  overall_utilization_percent: number;

  // Production
  units_produced_today: number;
  units_produced_this_month: number;
  scrap_rate_percent: number;
  rework_rate_percent: number;

  // Quality
  first_pass_yield_percent: number;
  defects_today: number;
  inspections_pending: number;

  // Capacity
  capacity_utilization_percent: number;
  overloaded_work_centers: number;

  // MPS/MRP
  mps_items_firm: number;
  mrp_action_messages_pending: number;
}

/**
 * Work Center Performance Report
 */
export interface WorkCenterPerformanceReport {
  work_center_id: string;
  work_center_code: string;
  work_center_name: string;
  total_orders: number;
  total_hours_planned: number;
  total_hours_actual: number;
  utilization_percent: number;
  efficiency_percent: number;
  on_time_delivery_percent: number;
  average_wait_time_hours: number;
  average_cycle_time_hours: number;
}

/**
 * Production Order Cost Analysis
 */
export interface ProductionOrderCostAnalysis {
  order_id: string;
  order_number: string;
  sku: string;
  quantity_ordered: number;
  quantity_completed: number;
  estimated_total_cost: number;
  actual_total_cost: number;
  cost_variance: number;
  cost_per_unit_estimated: number;
  cost_per_unit_actual: number;
  labor_cost_percent: number;
  material_cost_percent: number;
  overhead_cost_percent: number;
}

/**
 * MRP Analysis Summary
 */
export interface MRPAnalysisSummary {
  plan_id: string;
  plan_number: string;
  plan_date: Date;
  total_items_planned: number;
  total_actions: number;
  actions_by_type: Record<string, number>;
  high_priority_actions: number;
  past_due_actions: number;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch Release Production Orders DTO
 */
export interface BatchReleaseProductionOrdersDTO {
  order_ids: string[];
  release_date?: Date;
}

/**
 * Batch Complete Production Orders DTO
 */
export interface BatchCompleteProductionOrdersDTO {
  order_ids: string[];
  quantity_completed?: number;
  completed_by: string;
}

/**
 * Implement MRP Actions DTO
 */
export interface ImplementMRPActionsDTO {
  action_ids: string[];
  implemented_by: string;
  implementation_notes?: string;
}
