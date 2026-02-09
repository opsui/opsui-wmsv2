/**
 * Manufacturing Repository
 *
 * Data access layer for manufacturing operations
 * Handles work centers, routings, MPS, MRP, production orders,
 * shop floor control, quality, and capacity planning
 */

import { query, transaction } from '../db/client';
import { BaseRepository } from './BaseRepository';
import {
  WorkCenterStatus,
  RoutingStatus,
  ProductionOrderStatus,
  MRPPlanStatus,
  CapacityPlanStatus,
} from '@opsui/shared';
import type {
  WorkCenter,
  WorkCenterQueue,
  Routing,
  RoutingWithDetails,
  RoutingOperation,
  RoutingBOMComponent,
  MSPPeriod,
  MPSItem,
  MRPParameters,
  MRPPlan,
  MRPPlanDetail,
  MRPActionMessage,
  ManufacturingOrder,
  ManufacturingOrderWithDetails,
  ProductionOrderOperation,
  ShopFloorTransaction,
  ProductionInspection,
  ProductionDefect,
  CapacityPlan,
  CapacityPlanDetail,
  WorkCenterQueryFilters,
  RoutingQueryFilters,
  ProductionOrderQueryFilters,
  MRPPlanQueryFilters,
  CapacityPlanQueryFilters,
} from '@opsui/shared';

// ============================================================================
// WORK CENTER REPOSITORY
// ============================================================================

export class WorkCenterRepository extends BaseRepository<WorkCenter> {
  constructor() {
    super('work_centers', 'work_center_id');
  }

  // Find by code
  async findByCode(workCenterCode: string): Promise<WorkCenter | null> {
    const result = await query<WorkCenter>(
      `SELECT * FROM ${this.tableName} WHERE work_center_code = $1`,
      [workCenterCode]
    );
    return result.rows[0] || null;
  }

  // Find active work centers
  async findActive(): Promise<WorkCenter[]> {
    const result = await query<WorkCenter>(
      `SELECT * FROM ${this.tableName} WHERE work_center_status = $1 AND active = true ORDER BY work_center_code`,
      [WorkCenterStatus.ACTIVE]
    );
    return result.rows;
  }

  // Find by department
  async findByDepartment(department: string): Promise<WorkCenter[]> {
    const result = await query<WorkCenter>(
      `SELECT * FROM ${this.tableName} WHERE department = $1 ORDER BY work_center_code`,
      [department]
    );
    return result.rows;
  }

  // Find by site
  async findBySite(siteId: string): Promise<WorkCenter[]> {
    const result = await query<WorkCenter>(
      `SELECT * FROM ${this.tableName} WHERE site_id = $1 ORDER BY work_center_code`,
      [siteId]
    );
    return result.rows;
  }

  // Query with filters
  async queryWithFilters(filters: WorkCenterQueryFilters): Promise<WorkCenter[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.entity_id) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(filters.entity_id);
    }
    if (filters.department) {
      conditions.push(`department = $${paramIndex++}`);
      params.push(filters.department);
    }
    if (filters.work_center_status) {
      conditions.push(`work_center_status = $${paramIndex++}`);
      params.push(filters.work_center_status);
    }
    if (filters.site_id) {
      conditions.push(`site_id = $${paramIndex++}`);
      params.push(filters.site_id);
    }
    if (filters.search) {
      conditions.push(
        `(work_center_code ILIKE $${paramIndex++} OR work_center_name ILIKE $${paramIndex++})`
      );
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY work_center_code`;
    const result = await query<WorkCenter>(sql, params);
    return result.rows;
  }
}

// ============================================================================
// WORK CENTER QUEUE REPOSITORY
// ============================================================================

export class WorkCenterQueueRepository extends BaseRepository<WorkCenterQueue> {
  constructor() {
    super('work_center_queues', 'queue_id');
  }

  // Find by work center
  async findByWorkCenter(workCenterId: string): Promise<WorkCenterQueue | null> {
    const result = await query<WorkCenterQueue>(
      `SELECT * FROM ${this.tableName} WHERE work_center_id = $1`,
      [workCenterId]
    );
    return result.rows[0] || null;
  }

  // Find overloaded work centers
  async findOverloaded(): Promise<Array<WorkCenterQueue & { work_center_code: string }>> {
    const result = await query<any>(
      `SELECT wcq.*, wc.work_center_code
       FROM ${this.tableName} wcq
       JOIN work_centers wc ON wc.work_center_id = wcq.work_center_id
       WHERE (wcq.current_hours + wcq.queued_hours) > wc.available_capacity
         AND wc.work_center_status = 'ACTIVE'
       ORDER BY ((wcq.current_hours + wcq.queued_hours) / wc.available_capacity) DESC`
    );
    return result.rows;
  }
}

// ============================================================================
// ROUTING REPOSITORY
// ============================================================================

export class RoutingRepository extends BaseRepository<Routing> {
  constructor() {
    super('routings', 'routing_id');
  }

  // Find by number
  async findByNumber(routingNumber: string): Promise<Routing | null> {
    const result = await query<Routing>(
      `SELECT * FROM ${this.tableName} WHERE routing_number = $1`,
      [routingNumber]
    );
    return result.rows[0] || null;
  }

  // Find by SKU (active routing)
  async findBySKU(sku: string, activeOnly = true): Promise<Routing[]> {
    const condition = activeOnly ? "AND routing_status = 'ACTIVE'" : '';
    const result = await query<Routing>(
      `SELECT * FROM ${this.tableName} WHERE sku = $1 ${condition} ORDER BY version_number DESC`,
      [sku]
    );
    return result.rows;
  }

  // Find with details
  async findByIdWithDetails(routingId: string): Promise<RoutingWithDetails | null> {
    const routing = await this.findById(routingId);
    if (!routing) return null;

    const [operations, bom] = await Promise.all([
      query<RoutingOperation>(
        `SELECT * FROM routing_operations WHERE routing_id = $1 ORDER BY sequence_step, operation_number`,
        [routingId]
      ),
      query<RoutingBOMComponent>(
        `SELECT * FROM routing_bom WHERE routing_id = $1 ORDER BY component_sku`,
        [routingId]
      ),
    ]);

    return {
      ...routing,
      operations: operations.rows,
      bom: bom.rows,
    };
  }

  // Query with filters
  async queryWithFilters(filters: RoutingQueryFilters): Promise<Routing[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.entity_id) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(filters.entity_id);
    }
    if (filters.sku) {
      conditions.push(`sku = $${paramIndex++}`);
      params.push(filters.sku);
    }
    if (filters.routing_status) {
      conditions.push(`routing_status = $${paramIndex++}`);
      params.push(filters.routing_status);
    }
    if (filters.search) {
      conditions.push(
        `(routing_number ILIKE $${paramIndex++} OR routing_name ILIKE $${paramIndex++})`
      );
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY routing_number DESC`;
    const result = await query<Routing>(sql, params);
    return result.rows;
  }
}

// ============================================================================
// ROUTING OPERATION REPOSITORY
// ============================================================================

export class RoutingOperationRepository extends BaseRepository<RoutingOperation> {
  constructor() {
    super('routing_operations', 'operation_id');
  }

  // Find by routing
  async findByRouting(routingId: string): Promise<RoutingOperation[]> {
    const result = await query<RoutingOperation>(
      `SELECT * FROM ${this.tableName} WHERE routing_id = $1 ORDER BY sequence_step, operation_number`,
      [routingId]
    );
    return result.rows;
  }

  // Find by work center
  async findByWorkCenter(workCenterId: string): Promise<RoutingOperation[]> {
    const result = await query<RoutingOperation>(
      `SELECT * FROM ${this.tableName} WHERE work_center_id = $1`,
      [workCenterId]
    );
    return result.rows;
  }
}

// ============================================================================
// ROUTING BOM REPOSITORY
// ============================================================================

export class RoutingBOMRepository extends BaseRepository<RoutingBOMComponent> {
  constructor() {
    super('routing_bom', 'bom_component_id');
  }

  // Find by routing
  async findByRouting(routingId: string): Promise<RoutingBOMComponent[]> {
    const result = await query<RoutingBOMComponent>(
      `SELECT * FROM ${this.tableName} WHERE routing_id = $1 ORDER BY component_sku`,
      [routingId]
    );
    return result.rows;
  }

  // Find by operation
  async findByOperation(operationId: string): Promise<RoutingBOMComponent[]> {
    const result = await query<RoutingBOMComponent>(
      `SELECT * FROM ${this.tableName} WHERE operation_id = $1 ORDER BY component_sku`,
      [operationId]
    );
    return result.rows;
  }

  // Find by component SKU
  async findByComponentSKU(sku: string): Promise<RoutingBOMComponent[]> {
    const result = await query<RoutingBOMComponent>(
      `SELECT * FROM ${this.tableName} WHERE component_sku = $1`,
      [sku]
    );
    return result.rows;
  }
}

// ============================================================================
// MPS PERIOD REPOSITORY
// ============================================================================

export class MSPPeriodRepository extends BaseRepository<MSPPeriod> {
  constructor() {
    super('mps_periods', 'period_id');
  }

  // Find by entity
  async findByEntity(entityId: string): Promise<MSPPeriod[]> {
    const result = await query<MSPPeriod>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 ORDER BY start_date`,
      [entityId]
    );
    return result.rows;
  }

  // Find current period
  async findCurrentPeriod(entityId: string): Promise<MSPPeriod | null> {
    const result = await query<MSPPeriod>(
      `SELECT * FROM ${this.tableName}
       WHERE entity_id = $1
       AND start_date <= CURRENT_DATE
       AND end_date >= CURRENT_DATE
       ORDER BY start_date DESC
       LIMIT 1`,
      [entityId]
    );
    return result.rows[0] || null;
  }

  // Find by date range
  async findByDateRange(startDate: Date, endDate: Date, entityId?: string): Promise<MSPPeriod[]> {
    const condition = entityId ? 'AND entity_id = $3' : '';
    const result = await query<MSPPeriod>(
      `SELECT * FROM ${this.tableName}
       WHERE start_date <= $2 AND end_date >= $1 ${condition}
       ORDER BY start_date`,
      entityId ? [startDate, endDate, entityId] : [startDate, endDate]
    );
    return result.rows;
  }
}

// ============================================================================
// MPS ITEM REPOSITORY
// ============================================================================

export class MPSItemRepository extends BaseRepository<MPSItem> {
  constructor() {
    super('mps_items', 'mps_item_id');
  }

  // Find by period
  async findByPeriod(periodId: string): Promise<MPSItem[]> {
    const result = await query<MPSItem>(
      `SELECT * FROM ${this.tableName} WHERE period_id = $1 ORDER BY sku`,
      [periodId]
    );
    return result.rows;
  }

  // Find by SKU
  async findBySKU(sku: string): Promise<MPSItem[]> {
    const result = await query<MPSItem>(
      `SELECT * FROM ${this.tableName} WHERE sku = $1 ORDER BY period_start_date DESC`,
      [sku]
    );
    return result.rows;
  }

  // Find pending release
  async findPendingRelease(): Promise<MPSItem[]> {
    const result = await query<MPSItem>(
      `SELECT mi.* FROM ${this.tableName} mi
       JOIN mps_periods mp ON mp.period_id = mi.period_id
       WHERE mi.mps_status IN ('APPROVED', 'FIRM')
       AND mi.planned_production_quantity > 0
       AND mi.production_order_id IS NULL
       AND mp.is_frozen = false
       ORDER BY mi.order_due_date ASC`
    );
    return result.rows;
  }
}

// ============================================================================
// MRP PARAMETERS REPOSITORY
// ============================================================================

export class MRPParametersRepository extends BaseRepository<MRPParameters> {
  constructor() {
    super('mrp_parameters', 'parameter_id');
  }

  // Find by entity
  async findByEntity(entityId: string): Promise<MRPParameters | null> {
    const result = await query<MRPParameters>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1`,
      [entityId]
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// MRP PLAN REPOSITORY
// ============================================================================

export class MRPPlanRepository extends BaseRepository<MRPPlan> {
  constructor() {
    super('mrp_plans', 'plan_id');
  }

  // Find by number
  async findByNumber(planNumber: string): Promise<MRPPlan | null> {
    const result = await query<MRPPlan>(`SELECT * FROM ${this.tableName} WHERE plan_number = $1`, [
      planNumber,
    ]);
    return result.rows[0] || null;
  }

  // Find by entity
  async findByEntity(entityId: string): Promise<MRPPlan[]> {
    const result = await query<MRPPlan>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 ORDER BY plan_date DESC`,
      [entityId]
    );
    return result.rows;
  }

  // Find latest completed
  async findLatestCompleted(entityId?: string): Promise<MRPPlan | null> {
    const condition = entityId
      ? 'WHERE entity_id = $1 AND plan_status = $2'
      : 'WHERE plan_status = $1';
    const params = entityId ? [entityId, MRPPlanStatus.COMPLETED] : [MRPPlanStatus.COMPLETED];

    const result = await query<MRPPlan>(
      `SELECT * FROM ${this.tableName} ${condition} ORDER BY plan_date DESC LIMIT 1`,
      params
    );
    return result.rows[0] || null;
  }

  // Query with filters
  async queryWithFilters(filters: MRPPlanQueryFilters): Promise<MRPPlan[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.entity_id) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(filters.entity_id);
    }
    if (filters.plan_status) {
      conditions.push(`plan_status = $${paramIndex++}`);
      params.push(filters.plan_status);
    }
    if (filters.plan_date_from) {
      conditions.push(`plan_date >= $${paramIndex++}`);
      params.push(filters.plan_date_from);
    }
    if (filters.plan_date_to) {
      conditions.push(`plan_date <= $${paramIndex++}`);
      params.push(filters.plan_date_to);
    }
    if (filters.created_by) {
      conditions.push(`created_by = $${paramIndex++}`);
      params.push(filters.created_by);
    }
    if (filters.search) {
      conditions.push(`(plan_number ILIKE $${paramIndex++} OR plan_name ILIKE $${paramIndex++})`);
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY plan_date DESC`;
    const result = await query<MRPPlan>(sql, params);
    return result.rows;
  }
}

// ============================================================================
// MRP PLAN DETAIL REPOSITORY
// ============================================================================

export class MRPPlanDetailRepository extends BaseRepository<MRPPlanDetail> {
  constructor() {
    super('mrp_plan_details', 'detail_id');
  }

  // Find by plan
  async findByPlan(planId: string): Promise<MRPPlanDetail[]> {
    const result = await query<MRPPlanDetail>(
      `SELECT * FROM ${this.tableName} WHERE plan_id = $1 ORDER BY sku`,
      [planId]
    );
    return result.rows;
  }

  // Find by SKU
  async findBySKU(sku: string): Promise<MRPPlanDetail[]> {
    const result = await query<MRPPlanDetail>(
      `SELECT * FROM ${this.tableName} WHERE sku = $1 ORDER BY created_at DESC`,
      [sku]
    );
    return result.rows;
  }

  // Find items with action messages
  async findWithActionMessages(planId: string): Promise<MRPPlanDetail[]> {
    const result = await query<MRPPlanDetail>(
      `SELECT * FROM ${this.tableName}
       WHERE plan_id = $1 AND action_message_count > 0
       ORDER BY sku`,
      [planId]
    );
    return result.rows;
  }
}

// ============================================================================
// MRP ACTION MESSAGE REPOSITORY
// ============================================================================

export class MRPActionMessageRepository extends BaseRepository<MRPActionMessage> {
  constructor() {
    super('mrp_action_messages', 'action_id');
  }

  // Find by plan
  async findByPlan(planId: string): Promise<MRPActionMessage[]> {
    const result = await query<MRPActionMessage>(
      `SELECT * FROM ${this.tableName} WHERE plan_id = $1 ORDER BY action_priority ASC, action_due_date ASC`,
      [planId]
    );
    return result.rows;
  }

  // Find pending review
  async findPendingReview(planId?: string): Promise<MRPActionMessage[]> {
    const condition = planId ? 'AND plan_id = $1' : '';
    const result = await query<MRPActionMessage>(
      `SELECT * FROM ${this.tableName} WHERE is_reviewed = false ${condition} ORDER BY action_priority ASC, action_due_date ASC`,
      planId ? [planId] : []
    );
    return result.rows;
  }

  // Find by SKU
  async findBySKU(sku: string): Promise<MRPActionMessage[]> {
    const result = await query<MRPActionMessage>(
      `SELECT * FROM ${this.tableName} WHERE sku = $1 AND is_implemented = false ORDER BY action_due_date ASC`,
      [sku]
    );
    return result.rows;
  }

  // Find by action type
  async findByActionType(actionType: string): Promise<MRPActionMessage[]> {
    const result = await query<MRPActionMessage>(
      `SELECT * FROM ${this.tableName} WHERE action_type = $1 AND is_implemented = false ORDER BY action_due_date ASC`,
      [actionType]
    );
    return result.rows;
  }
}

// ============================================================================
// PRODUCTION ORDER REPOSITORY
// ============================================================================

export class ProductionOrderRepository extends BaseRepository<ManufacturingOrder> {
  constructor() {
    super('production_orders', 'order_id');
  }

  // Find by number
  async findByNumber(orderNumber: string): Promise<ManufacturingOrder | null> {
    const result = await query<ManufacturingOrder>(
      `SELECT * FROM ${this.tableName} WHERE order_number = $1`,
      [orderNumber]
    );
    return result.rows[0] || null;
  }

  // Find with details
  async findByIdWithDetails(orderId: string): Promise<ManufacturingOrderWithDetails | null> {
    const order = await this.findById(orderId);
    if (!order) return null;

    const [operations, routing] = await Promise.all([
      query<ProductionOrderOperation>(
        `SELECT * FROM production_order_operations WHERE production_order_id = $1 ORDER BY operation_number`,
        [orderId]
      ),
      order.routing_id
        ? query<RoutingWithDetails>(
            `SELECT r.*, ro.*, rb.*
             FROM routings r
             LEFT JOIN routing_operations ro ON ro.routing_id = r.routing_id
             LEFT JOIN routing_bom rb ON rb.routing_id = r.routing_id
             WHERE r.routing_id = $1`,
            [order.routing_id]
          )
        : Promise.resolve({ rows: [] }),
    ]);

    // Build routing object if exists
    let routingObj: RoutingWithDetails | undefined;
    if (routing.rows.length > 0) {
      const firstRow = routing.rows[0] as any;
      routingObj = {
        routing_id: firstRow.routing_id,
        routing_number: firstRow.routing_number,
        entity_id: firstRow.entity_id,
        sku: firstRow.sku,
        item_description: firstRow.item_description,
        routing_name: firstRow.routing_name,
        routing_type: firstRow.routing_type,
        routing_status: firstRow.routing_status,
        version_number: firstRow.version_number,
        effective_date: firstRow.effective_date,
        expiration_date: firstRow.expiration_date,
        supersedes_routing_id: firstRow.supersedes_routing_id,
        standard_lot_size: firstRow.standard_lot_size,
        scrap_percent: firstRow.scrap_percent,
        yield_percent: firstRow.yield_percent,
        standard_labor_hours: firstRow.standard_labor_hours,
        standard_machine_hours: firstRow.standard_machine_hours,
        standard_cost: firstRow.standard_cost,
        approved_by: firstRow.approved_by,
        approved_at: firstRow.approved_at,
        engineered_by: firstRow.engineered_by,
        engineered_at: firstRow.engineered_at,
        notes: firstRow.notes,
        created_at: firstRow.created_at,
        updated_at: firstRow.updated_at,
        operations: routing.rows
          .filter((r: any) => r.operation_id)
          .map((r: any) => ({
            operation_id: r.operation_id,
            routing_id: r.routing_id,
            operation_number: r.operation_number,
            operation_code: r.operation_code,
            operation_name: r.operation_name,
            operation_type: r.operation_type,
            description: r.description,
            work_center_id: r.work_center_id,
            work_center_description: r.work_center_description,
            sequence: r.sequence,
            sequence_step: r.sequence_step,
            send_ahead_quantity: r.send_ahead_quantity,
            overlap_percent: r.overlap_percent,
            setup_hours: r.setup_hours,
            run_hours_per_unit: r.run_hours_per_unit,
            fixed_hours: r.fixed_hours,
            labor_hours_per_unit: r.labor_hours_per_unit,
            machine_hours_per_unit: r.machine_hours_per_unit,
            minimum_crew_size: r.minimum_crew_size,
            maximum_crew_size: r.maximum_crew_size,
            labor_burden_rate: r.labor_burden_rate,
            machine_burden_rate: r.machine_burden_rate,
            inspection_required: r.inspection_required,
            inspection_percent: r.inspection_percent,
            control_point: r.control_point,
            tooling_required: r.tooling_required,
            fixtures_required: r.fixtures_required,
            outside_process_vendor_id: r.outside_process_vendor_id,
            outside_process_cost: r.outside_process_cost,
            outside_process_lead_time_days: r.outside_process_lead_time_days,
            standard_operations: r.standard_operations,
            operator_instructions: r.operator_instructions,
            setup_instructions: r.setup_instructions,
            backflush_report_point: r.backflush_report_point,
            created_at: r.created_at,
            updated_at: r.updated_at,
          })),
        bom: routing.rows
          .filter((r: any) => r.bom_component_id)
          .map((r: any) => ({
            bom_component_id: r.bom_component_id,
            routing_id: r.routing_id,
            operation_id: r.operation_id,
            component_sku: r.component_sku,
            component_description: r.component_description,
            component_type: r.component_type,
            quantity_per_assembly: r.quantity_per_assembly,
            scrap_percent: r.scrap_percent,
            effective_quantity: r.effective_quantity,
            substitute_sku: r.substitute_sku,
            substitute_priority: r.substitute_priority,
            optional: r.optional,
            phantom: r.phantom,
            sourcing_rule: r.sourcing_rule,
            vendor_id: r.vendor_id,
            component_cost: r.component_cost,
            overhead_percent: r.overhead_percent,
            effective_from_date: r.effective_from_date,
            effective_to_date: r.effective_to_date,
            effectivity_quantity: r.effectivity_quantity,
            notes: r.notes,
            created_at: r.created_at,
          })),
      };
    }

    return {
      ...order,
      operations: operations.rows,
      routing: routingObj,
    };
  }

  // Query with filters
  async queryWithFilters(filters: ProductionOrderQueryFilters): Promise<ManufacturingOrder[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.entity_id) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(filters.entity_id);
    }
    if (filters.sku) {
      conditions.push(`sku = $${paramIndex++}`);
      params.push(filters.sku);
    }
    if (filters.order_status) {
      conditions.push(`order_status = $${paramIndex++}`);
      params.push(filters.order_status);
    }
    if (filters.order_type) {
      conditions.push(`order_type = $${paramIndex++}`);
      params.push(filters.order_type);
    }
    if (filters.start_date_from) {
      conditions.push(`start_date >= $${paramIndex++}`);
      params.push(filters.start_date_from);
    }
    if (filters.start_date_to) {
      conditions.push(`start_date <= $${paramIndex++}`);
      params.push(filters.start_date_to);
    }
    if (filters.due_date_from) {
      conditions.push(`due_date >= $${paramIndex++}`);
      params.push(filters.due_date_from);
    }
    if (filters.due_date_to) {
      conditions.push(`due_date <= $${paramIndex++}`);
      params.push(filters.due_date_to);
    }
    if (filters.customer_id) {
      conditions.push(`customer_id = $${paramIndex++}`);
      params.push(filters.customer_id);
    }
    if (filters.sales_order_id) {
      conditions.push(`sales_order_id = $${paramIndex++}`);
      params.push(filters.sales_order_id);
    }
    if (filters.job_number) {
      conditions.push(`job_number = $${paramIndex++}`);
      params.push(filters.job_number);
    }
    if (filters.search) {
      conditions.push(`(order_number ILIKE $${paramIndex++} OR sku ILIKE $${paramIndex++})`);
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY order_date DESC`;
    const result = await query<ManufacturingOrder>(sql, params);
    return result.rows;
  }

  // Find active orders
  async findActive(): Promise<ManufacturingOrder[]> {
    const result = await query<ManufacturingOrder>(
      `SELECT * FROM ${this.tableName} WHERE order_status IN ('RELEASED', 'IN_PROGRESS') ORDER BY due_date ASC`
    );
    return result.rows;
  }

  // Find past due
  async findPastDue(): Promise<ManufacturingOrder[]> {
    const result = await query<ManufacturingOrder>(
      `SELECT * FROM ${this.tableName}
       WHERE order_status IN ('RELEASED', 'IN_PROGRESS')
       AND due_date < CURRENT_DATE
       ORDER BY due_date ASC`
    );
    return result.rows;
  }

  // Find by sales order
  async findBySalesOrder(salesOrderId: string): Promise<ManufacturingOrder[]> {
    const result = await query<ManufacturingOrder>(
      `SELECT * FROM ${this.tableName} WHERE sales_order_id = $1 ORDER BY order_date DESC`,
      [salesOrderId]
    );
    return result.rows;
  }
}

// ============================================================================
// PRODUCTION ORDER OPERATION REPOSITORY
// ============================================================================

export class ProductionOrderOperationRepository extends BaseRepository<ProductionOrderOperation> {
  constructor() {
    super('production_order_operations', 'operation_id');
  }

  // Find by production order
  async findByProductionOrder(orderId: string): Promise<ProductionOrderOperation[]> {
    const result = await query<ProductionOrderOperation>(
      `SELECT * FROM ${this.tableName} WHERE production_order_id = $1 ORDER BY operation_number`,
      [orderId]
    );
    return result.rows;
  }

  // Find by work center
  async findByWorkCenter(workCenterId: string): Promise<ProductionOrderOperation[]> {
    const result = await query<ProductionOrderOperation>(
      `SELECT * FROM ${this.tableName}
       WHERE work_center_id = $1
       AND operation_status IN ('PENDING', 'IN_PROGRESS')
       ORDER BY scheduled_start_date ASC`,
      [workCenterId]
    );
    return result.rows;
  }

  // Find next operation for production order
  async findNextOperation(orderId: string): Promise<ProductionOrderOperation | null> {
    const result = await query<ProductionOrderOperation>(
      `SELECT * FROM ${this.tableName}
       WHERE production_order_id = $1
       AND operation_status = 'PENDING'
       ORDER BY operation_number ASC
       LIMIT 1`,
      [orderId]
    );
    return result.rows[0] || null;
  }

  // Find in-progress operations
  async findInProgress(): Promise<ProductionOrderOperation[]> {
    const result = await query<ProductionOrderOperation>(
      `SELECT * FROM ${this.tableName}
       WHERE operation_status = 'IN_PROGRESS'
       ORDER BY actual_start_date ASC`
    );
    return result.rows;
  }
}

// ============================================================================
// SHOP FLOOR TRANSACTION REPOSITORY
// ============================================================================

export class ShopFloorTransactionRepository extends BaseRepository<ShopFloorTransaction> {
  constructor() {
    super('shop_floor_transactions', 'transaction_id');
  }

  // Find by production order
  async findByProductionOrder(orderId: string): Promise<ShopFloorTransaction[]> {
    const result = await query<ShopFloorTransaction>(
      `SELECT * FROM ${this.tableName} WHERE production_order_id = $1 ORDER BY transaction_date DESC`,
      [orderId]
    );
    return result.rows;
  }

  // Find by operation
  async findByOperation(operationId: string): Promise<ShopFloorTransaction[]> {
    const result = await query<ShopFloorTransaction>(
      `SELECT * FROM ${this.tableName} WHERE operation_id = $1 ORDER BY transaction_date DESC`,
      [operationId]
    );
    return result.rows;
  }

  // Find by user
  async findByUser(userId: string, limit = 100): Promise<ShopFloorTransaction[]> {
    const result = await query<ShopFloorTransaction>(
      `SELECT * FROM ${this.tableName} WHERE user_id = $1 ORDER BY transaction_date DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  // Find by transaction type
  async findByTransactionType(
    transactionType: string,
    limit = 100
  ): Promise<ShopFloorTransaction[]> {
    const result = await query<ShopFloorTransaction>(
      `SELECT * FROM ${this.tableName} WHERE transaction_type = $1 ORDER BY transaction_date DESC LIMIT $2`,
      [transactionType, limit]
    );
    return result.rows;
  }
}

// ============================================================================
// PRODUCTION INSPECTION REPOSITORY
// ============================================================================

export class ProductionInspectionRepository extends BaseRepository<ProductionInspection> {
  constructor() {
    super('production_inspections', 'inspection_id');
  }

  // Find by number
  async findByNumber(inspectionNumber: string): Promise<ProductionInspection | null> {
    const result = await query<ProductionInspection>(
      `SELECT * FROM ${this.tableName} WHERE inspection_number = $1`,
      [inspectionNumber]
    );
    return result.rows[0] || null;
  }

  // Find by production order
  async findByProductionOrder(orderId: string): Promise<ProductionInspection[]> {
    const result = await query<ProductionInspection>(
      `SELECT * FROM ${this.tableName} WHERE production_order_id = $1 ORDER BY inspection_date DESC`,
      [orderId]
    );
    return result.rows;
  }

  // Find by operation
  async findByOperation(operationId: string): Promise<ProductionInspection[]> {
    const result = await query<ProductionInspection>(
      `SELECT * FROM ${this.tableName} WHERE operation_id = $1 ORDER BY inspection_date DESC`,
      [operationId]
    );
    return result.rows;
  }

  // Find pending
  async findPending(): Promise<ProductionInspection[]> {
    const result = await query<ProductionInspection>(
      `SELECT * FROM ${this.tableName} WHERE inspection_result = 'PENDING' ORDER BY inspection_date ASC`
    );
    return result.rows;
  }
}

// ============================================================================
// PRODUCTION DEFECT REPOSITORY
// ============================================================================

export class ProductionDefectRepository extends BaseRepository<ProductionDefect> {
  constructor() {
    super('production_defects', 'defect_id');
  }

  // Find by inspection
  async findByInspection(inspectionId: string): Promise<ProductionDefect[]> {
    const result = await query<ProductionDefect>(
      `SELECT * FROM ${this.tableName} WHERE inspection_id = $1 ORDER BY defect_severity DESC`,
      [inspectionId]
    );
    return result.rows;
  }

  // Find by production order
  async findByProductionOrder(orderId: string): Promise<ProductionDefect[]> {
    const result = await query<ProductionDefect>(
      `SELECT * FROM ${this.tableName} WHERE production_order_id = $1 ORDER BY created_at DESC`,
      [orderId]
    );
    return result.rows;
  }

  // Find unresolved
  async findUnresolved(): Promise<ProductionDefect[]> {
    const result = await query<ProductionDefect>(
      `SELECT * FROM ${this.tableName} WHERE corrective_action_completed = false ORDER BY defect_severity DESC, created_at DESC`
    );
    return result.rows;
  }

  // Find by severity
  async findBySeverity(severity: string): Promise<ProductionDefect[]> {
    const result = await query<ProductionDefect>(
      `SELECT * FROM ${this.tableName} WHERE defect_severity = $1 AND corrective_action_completed = false ORDER BY created_at DESC`,
      [severity]
    );
    return result.rows;
  }

  // Find by SKU
  async findBySKU(sku: string, limit = 100): Promise<ProductionDefect[]> {
    const result = await query<ProductionDefect>(
      `SELECT * FROM ${this.tableName} WHERE sku = $1 ORDER BY created_at DESC LIMIT $2`,
      [sku, limit]
    );
    return result.rows;
  }
}

// ============================================================================
// CAPACITY PLAN REPOSITORY
// ============================================================================

export class CapacityPlanRepository extends BaseRepository<CapacityPlan> {
  constructor() {
    super('capacity_plans', 'plan_id');
  }

  // Find by number
  async findByNumber(planNumber: string): Promise<CapacityPlan | null> {
    const result = await query<CapacityPlan>(
      `SELECT * FROM ${this.tableName} WHERE plan_number = $1`,
      [planNumber]
    );
    return result.rows[0] || null;
  }

  // Find by entity
  async findByEntity(entityId: string): Promise<CapacityPlan[]> {
    const result = await query<CapacityPlan>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 ORDER BY start_date DESC`,
      [entityId]
    );
    return result.rows;
  }

  // Find active
  async findActive(): Promise<CapacityPlan[]> {
    const result = await query<CapacityPlan>(
      `SELECT * FROM ${this.tableName} WHERE plan_status = $1 ORDER BY start_date ASC`,
      [CapacityPlanStatus.ACTIVE]
    );
    return result.rows;
  }

  // Query with filters
  async queryWithFilters(filters: CapacityPlanQueryFilters): Promise<CapacityPlan[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.entity_id) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(filters.entity_id);
    }
    if (filters.plan_status) {
      conditions.push(`plan_status = $${paramIndex++}`);
      params.push(filters.plan_status);
    }
    if (filters.start_date_from) {
      conditions.push(`start_date >= $${paramIndex++}`);
      params.push(filters.start_date_from);
    }
    if (filters.start_date_to) {
      conditions.push(`start_date <= $${paramIndex++}`);
      params.push(filters.start_date_to);
    }
    if (filters.end_date_from) {
      conditions.push(`end_date >= $${paramIndex++}`);
      params.push(filters.end_date_from);
    }
    if (filters.end_date_to) {
      conditions.push(`end_date <= $${paramIndex++}`);
      params.push(filters.end_date_to);
    }
    if (filters.search) {
      conditions.push(`(plan_number ILIKE $${paramIndex++} OR plan_name ILIKE $${paramIndex++})`);
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY start_date DESC`;
    const result = await query<CapacityPlan>(sql, params);
    return result.rows;
  }
}

// ============================================================================
// CAPACITY PLAN DETAIL REPOSITORY
// ============================================================================

export class CapacityPlanDetailRepository extends BaseRepository<CapacityPlanDetail> {
  constructor() {
    super('capacity_plan_details', 'detail_id');
  }

  // Find by plan
  async findByPlan(planId: string): Promise<CapacityPlanDetail[]> {
    const result = await query<CapacityPlanDetail>(
      `SELECT * FROM ${this.tableName} WHERE plan_id = $1 ORDER BY work_center_id, period_start_date`,
      [planId]
    );
    return result.rows;
  }

  // Find by work center
  async findByWorkCenter(workCenterId: string): Promise<CapacityPlanDetail[]> {
    const result = await query<CapacityPlanDetail>(
      `SELECT * FROM ${this.tableName} WHERE work_center_id = $1 ORDER BY period_start_date DESC`,
      [workCenterId]
    );
    return result.rows;
  }

  // Find overloaded
  async findOverloaded(planId?: string): Promise<CapacityPlanDetail[]> {
    const condition = planId
      ? 'WHERE plan_id = $1 AND is_overloaded = true'
      : 'WHERE is_overloaded = true';
    const result = await query<CapacityPlanDetail>(
      `SELECT * FROM ${this.tableName} ${condition} ORDER BY overload_quantity DESC`,
      planId ? [planId] : []
    );
    return result.rows;
  }
}

// ============================================================================
// REPOSITORY INSTANCES
// ============================================================================

export const workCenterRepository = new WorkCenterRepository();
export const workCenterQueueRepository = new WorkCenterQueueRepository();
export const routingRepository = new RoutingRepository();
export const routingOperationRepository = new RoutingOperationRepository();
export const routingBOMRepository = new RoutingBOMRepository();
export const mspPeriodRepository = new MSPPeriodRepository();
export const mspItemRepository = new MPSItemRepository();
export const mrpParametersRepository = new MRPParametersRepository();
export const mrpPlanRepository = new MRPPlanRepository();
export const mrpPlanDetailRepository = new MRPPlanDetailRepository();
export const mrpActionMessageRepository = new MRPActionMessageRepository();
export const productionOrderRepository: ProductionOrderRepository = new ProductionOrderRepository();
export const productionOrderOperationRepository = new ProductionOrderOperationRepository();
export const shopFloorTransactionRepository = new ShopFloorTransactionRepository();
export const productionInspectionRepository = new ProductionInspectionRepository();
export const productionDefectRepository = new ProductionDefectRepository();
export const capacityPlanRepository = new CapacityPlanRepository();
export const capacityPlanDetailRepository = new CapacityPlanDetailRepository();
