/**
 * Manufacturing Service
 *
 * Business logic for manufacturing operations
 * Handles work centers, routings, MPS, MRP, production orders,
 * shop floor control, quality, and capacity planning
 */

import {
  workCenterRepository,
  workCenterQueueRepository,
  routingRepository,
  routingOperationRepository,
  routingBOMRepository,
  mspPeriodRepository,
  mspItemRepository,
  mrpParametersRepository,
  mrpPlanRepository,
  mrpPlanDetailRepository,
  mrpActionMessageRepository,
  productionOrderRepository,
  productionOrderOperationRepository,
  shopFloorTransactionRepository,
  productionInspectionRepository,
  productionDefectRepository,
  capacityPlanRepository,
  capacityPlanDetailRepository,
} from '../repositories/ManufacturingRepository';
import { ProductionOrderRepository } from '../repositories/ManufacturingRepository';
import { query, transaction } from '../db/client';
import {
  NotFoundError,
  WorkCenterStatus,
  RoutingStatus,
  ManufacturingOrderStatus,
  MRPPlanStatus,
  CapacityPlanStatus,
} from '@opsui/shared';
import type {
  WorkCenter,
  WorkCenterQueue,
  CreateWorkCenterDTO,
  Routing,
  RoutingWithDetails,
  CreateRoutingDTO,
  MRPParameters,
  MRPPlan,
  CreateMRPPlanDTO,
  ManufacturingOrder,
  ManufacturingOrderWithDetails,
  CreateManufacturingOrderDTO,
  ReleaseProductionOrderDTO,
  ShopFloorTransaction,
  CreateShopFloorTransactionDTO,
  ProductionInspection,
  ProductionDefect,
  CapacityPlan,
  CreateCapacityPlanDTO,
  ManufacturingDashboardMetrics,
  WorkCenterQueryFilters,
  RoutingQueryFilters,
  ProductionOrderQueryFilters,
  MRPPlanQueryFilters,
  CapacityPlanQueryFilters,
  ProductionOrderOperation,
} from '@opsui/shared';

// ============================================================================
// REPOSITORY INSTANCES
// ============================================================================

// Use imported repository instances directly
const wcRepo = workCenterRepository;
const wcQueueRepo = workCenterQueueRepository;
const routingRepo = routingRepository;
const routingOpRepo = routingOperationRepository;
const routingBOMRepo = routingBOMRepository;
const mspPeriodRepo = mspPeriodRepository;
const mspItemRepo = mspItemRepository;
const mrpParamsRepo = mrpParametersRepository;
const mrpPlanRepo = mrpPlanRepository;
const mrpDetailRepo = mrpPlanDetailRepository;
const mrpActionRepo = mrpActionMessageRepository;
const poRepo = productionOrderRepository as any;
const pooRepo = productionOrderOperationRepository;
const sftRepo = shopFloorTransactionRepository;
const piRepo = productionInspectionRepository;
const pdRepo = productionDefectRepository;
const cpRepo = capacityPlanRepository;
const cpdRepo = capacityPlanDetailRepository;

// ============================================================================
// ID GENERATORS
// ============================================================================

function generateWorkCenterId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WC-${timestamp}-${random}`;
}

function generateRoutingId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RTG-${timestamp}-${random}`;
}

function generateRoutingNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `RTG-${year}-${random}`;
}

function generateProductionOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${timestamp}-${random}`;
}

function generateProductionOrderNumber(): string {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `WO-${year}${month}-${random}`;
}

function generateMRPPlanId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MRP-${timestamp}-${random}`;
}

function generateMRPPlanNumber(): string {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `MRP-${year}${month}-${random}`;
}

function generateCapacityPlanId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CAP-${timestamp}-${random}`;
}

function generateCapacityPlanNumber(): string {
  const year = new Date().getFullYear();
  const week = Math.floor(new Date().getDate() / 7) + 1;
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `CAP-${year}-W${week}-${random}`;
}

function generateShopFloorTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SFT-${timestamp}-${random}`;
}

function generateInspectionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INSP-${timestamp}-${random}`;
}

function generateInspectionNumber(): string {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `INSP-${year}${month}-${random}`;
}

// ============================================================================
// MANUFACTURING SERVICE
// ============================================================================

export class ManufacturingService {
  // --------------------------------------------------------------------------
  // WORK CENTERS
  // --------------------------------------------------------------------------

  /**
   * Create a new work center
   */
  async createWorkCenter(dto: CreateWorkCenterDTO): Promise<WorkCenter> {
    return transaction(async client => {
      const workCenterId = generateWorkCenterId();

      const workCenter = await wcRepo.insert(
        {
          work_center_id: workCenterId,
          work_center_code: dto.work_center_code,
          work_center_name: dto.work_center_name,
          entity_id: dto.entity_id || null,
          department: dto.department || null,
          cost_center: dto.cost_center || null,
          location: dto.location || null,
          site_id: dto.site_id || null,
          capacity_per_shift: dto.capacity_per_shift || 8,
          shifts_per_day: dto.shifts_per_day || 1,
          efficiency_percent: dto.efficiency_percent || 100,
          utilization_percent: dto.utilization_percent || 85,
          labor_rate_per_hour: dto.labor_rate_per_hour || null,
          machine_rate_per_hour: dto.machine_rate_per_hour || null,
          overhead_rate_per_hour: dto.overhead_rate_per_hour || null,
          burden_rate: dto.burden_rate || null,
          setup_time_required: dto.setup_time_required !== false,
          calendar_id: dto.calendar_id || null,
          work_center_status: WorkCenterStatus.ACTIVE,
          active: true,
          description: dto.description || null,
          equipment_list: dto.equipment_list || null,
          skills_required: dto.skills_required || null,
        } as any,
        client
      );

      // Create queue entry
      await wcQueueRepo.insert(
        {
          queue_id: `WCQ-${Date.now().toString(36).toUpperCase()}`,
          work_center_id: workCenterId,
          current_orders: 0,
          current_hours: 0,
          queued_orders: 0,
          queued_hours: 0,
        } as any,
        client
      );

      return workCenter;
    });
  }

  /**
   * Get work centers with filters
   */
  async getWorkCenters(filters?: WorkCenterQueryFilters): Promise<WorkCenter[]> {
    if (filters) {
      return wcRepo.queryWithFilters(filters);
    }
    return wcRepo.findAll({ orderBy: 'work_center_code', limit: 1000 });
  }

  /**
   * Get work center with queue
   */
  async getWorkCenterWithQueue(
    workCenterId: string
  ): Promise<(WorkCenter & { queue: WorkCenterQueue | null }) | null> {
    const workCenter = await wcRepo.findById(workCenterId);
    if (!workCenter) return null;

    const queue = await wcQueueRepo.findByWorkCenter(workCenterId);

    return {
      ...workCenter,
      queue,
    };
  }

  // --------------------------------------------------------------------------
  // ROUTINGS
  // --------------------------------------------------------------------------

  /**
   * Create a new routing
   */
  async createRouting(dto: CreateRoutingDTO): Promise<RoutingWithDetails> {
    return transaction(async client => {
      const routingId = generateRoutingId();
      const routingNumber = await this.generateUniqueRoutingNumber();

      const routing = await routingRepo.insert(
        {
          routing_id: routingId,
          routing_number: routingNumber,
          entity_id: dto.entity_id || null,
          sku: dto.sku,
          item_description: dto.item_description || null,
          routing_name: dto.routing_name,
          routing_type: dto.routing_type || 'STANDARD',
          routing_status: RoutingStatus.DRAFT,
          version_number: dto.version_number || 1,
          effective_date: dto.effective_date || new Date(),
          expiration_date: dto.expiration_date || null,
          standard_lot_size: dto.standard_lot_size || 1,
          scrap_percent: dto.scrap_percent || 0,
          yield_percent: dto.yield_percent || 100,
          standard_labor_hours: null,
          standard_machine_hours: null,
          standard_cost: null,
          notes: null,
        } as any,
        client
      );

      // Create operations
      const operations = await Promise.all(
        dto.operations.map((op, index) =>
          routingOpRepo.insert(
            {
              operation_id: `RTG-OP-${Date.now().toString(36).toUpperCase()}-${index}`,
              routing_id: routingId,
              operation_number: op.operation_number,
              operation_code: op.operation_code || null,
              operation_name: op.operation_name,
              operation_type: op.operation_type || 'MACHINING',
              description: op.description || null,
              work_center_id: op.work_center_id || null,
              sequence: op.sequence || index + 1,
              sequence_step: op.sequence_step || (index + 1).toString().padStart(4, '0'),
              setup_hours: op.setup_hours || 0,
              run_hours_per_unit: op.run_hours_per_unit,
              fixed_hours: op.fixed_hours || 0,
              labor_hours_per_unit: op.labor_hours_per_unit || null,
              machine_hours_per_unit: op.machine_hours_per_unit || null,
              minimum_crew_size: op.minimum_crew_size || 1,
              maximum_crew_size: op.maximum_crew_size || 1,
              inspection_required: op.inspection_required || false,
              inspection_percent: op.inspection_percent || null,
              backflush_report_point: op.backflush_report_point || false,
              created_at: new Date(),
              updated_at: new Date(),
            } as any,
            client
          )
        )
      );

      // Create BOM
      const bom = await Promise.all(
        dto.bom.map((item, index) =>
          routingBOMRepo.insert(
            {
              bom_component_id: `RTG-BOM-${Date.now().toString(36).toUpperCase()}-${index}`,
              routing_id: routingId,
              operation_id: item.operation_id || null,
              component_sku: item.component_sku,
              component_description: item.component_description || null,
              component_type: item.component_type || 'MATERIAL',
              quantity_per_assembly: item.quantity_per_assembly,
              scrap_percent: item.scrap_percent || 0,
              optional: item.optional || false,
              phantom: item.phantom || false,
              sourcing_rule: item.sourcing_rule || null,
              vendor_id: item.vendor_id || null,
              created_at: new Date(),
            } as any,
            client
          )
        )
      );

      return {
        ...routing,
        operations,
        bom,
      };
    });
  }

  /**
   * Generate unique routing number
   */
  private async generateUniqueRoutingNumber(): Promise<string> {
    let number: string;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      number = generateRoutingNumber();
      const existing = await routingRepo.findByNumber(number);
      exists = !!existing;
      attempts++;
    }

    return number!;
  }

  /**
   * Get routings with filters
   */
  async getRoutings(filters?: RoutingQueryFilters): Promise<Routing[]> {
    if (filters) {
      return routingRepo.queryWithFilters(filters);
    }
    return routingRepo.findAll({ orderBy: 'routing_number', limit: 1000 });
  }

  /**
   * Get routing with details
   */
  async getRoutingWithDetails(routingId: string): Promise<RoutingWithDetails | null> {
    return routingRepo.findByIdWithDetails(routingId);
  }

  // --------------------------------------------------------------------------
  // PRODUCTION ORDERS
  // --------------------------------------------------------------------------

  /**
   * Create a production order
   */
  async createProductionOrder(
    dto: CreateManufacturingOrderDTO
  ): Promise<ManufacturingOrderWithDetails> {
    return transaction(async client => {
      const orderId = generateProductionOrderId();
      const orderNumber = await this.generateUniqueProductionOrderNumber();

      // Get routing if specified
      const routing = dto.routing_id ? await routingRepo.findById(dto.routing_id) : null;

      // Estimate costs from routing
      let estimatedLaborCost = 0;
      let estimatedMaterialCost = 0;
      let estimatedOverheadCost = 0;

      if (routing) {
        // Calculate from routing operations
        estimatedLaborCost = dto.quantity_ordered * 10; // Simplified
        estimatedMaterialCost = dto.quantity_ordered * 5; // Simplified
        estimatedOverheadCost = estimatedLaborCost * 0.5; // 50% of labor
      }

      const order = await poRepo.insert(
        {
          order_id: orderId,
          order_number: orderNumber,
          entity_id: dto.entity_id || null,
          sku: dto.sku,
          item_description: dto.item_description || null,
          routing_id: dto.routing_id || null,
          order_type: dto.order_type || 'MAKE_TO_STOCK',
          quantity_ordered: dto.quantity_ordered,
          quantity_completed: 0,
          quantity_scrapped: 0,
          quantity_rejected: 0,
          order_date: new Date(),
          start_date: dto.start_date,
          due_date: dto.due_date,
          actual_start_date: null,
          actual_finish_date: null,
          order_status: ManufacturingOrderStatus.DRAFT,
          progress_percent: 0,
          estimated_labor_cost: estimatedLaborCost,
          estimated_material_cost: estimatedMaterialCost,
          estimated_overhead_cost: estimatedOverheadCost,
          actual_labor_cost: 0,
          actual_material_cost: 0,
          actual_overhead_cost: 0,
          customer_id: dto.customer_id || null,
          sales_order_id: dto.sales_order_id || null,
          sales_order_line_id: dto.sales_order_line_id || null,
          job_number: dto.job_number || null,
          created_by: '', // From auth context
          notes: dto.notes || null,
        } as any,
        client
      );

      // Create operations from routing
      const operations: any[] = [];
      if (routing) {
        const routingOps = await routingOpRepo.findByRouting(routing.routing_id);

        for (const [index, routingOp] of routingOps.entries()) {
          const op = await pooRepo.insert(
            {
              operation_id: `POO-${Date.now().toString(36).toUpperCase()}-${index}`,
              production_order_id: orderId,
              routing_operation_id: routingOp.operation_id,
              operation_number: routingOp.operation_number,
              operation_name: routingOp.operation_name,
              operation_type: routingOp.operation_type,
              work_center_id: routingOp.work_center_id,
              operation_status: 'PENDING',
              sequence_step: routingOp.sequence_step,
              quantity_completed: 0,
              quantity_scrapped: 0,
              quantity_rejected: 0,
              estimated_setup_hours: routingOp.setup_hours,
              estimated_run_hours: routingOp.run_hours_per_unit * dto.quantity_ordered,
              estimated_total_hours:
                routingOp.setup_hours + routingOp.run_hours_per_unit * dto.quantity_ordered,
              actual_setup_hours: 0,
              actual_run_hours: 0,
              actual_total_hours: 0,
              progress_percent: 0,
              scheduled_start_date: dto.start_date,
              scheduled_finish_date: dto.due_date,
              crew_size: routingOp.minimum_crew_size || 1,
              assigned_to: null,
              actual_labor_cost: 0,
              actual_machine_cost: 0,
              inspection_required: routingOp.inspection_required || false,
              inspection_completed: false,
              inspection_result: null,
              notes: null,
              created_at: new Date(),
              updated_at: new Date(),
            } as any,
            client
          );
          operations.push(op);
        }
      }

      return {
        ...order,
        operations,
      };
    });
  }

  /**
   * Generate unique production order number
   */
  private async generateUniqueProductionOrderNumber(): Promise<string> {
    let number: string;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      number = generateProductionOrderNumber();
      const existing = await poRepo.findByNumber(number);
      exists = !!existing;
      attempts++;
    }

    return number!;
  }

  /**
   * Release production order
   */
  async releaseProductionOrder(dto: ReleaseProductionOrderDTO): Promise<ManufacturingOrder> {
    const order = await poRepo.findByIdOrThrow(dto.order_id);

    if (
      order.order_status !== ManufacturingOrderStatus.DRAFT &&
      order.order_status !== ManufacturingOrderStatus.PLANNED
    ) {
      throw new Error('Only draft or planned orders can be released');
    }

    const updated = await poRepo.update(dto.order_id, {
      order_status: ManufacturingOrderStatus.RELEASED,
      released_by: '', // From auth context
      released_at: new Date(),
      actual_start_date: dto.release_date || new Date(),
    } as any);

    return updated!;
  }

  /**
   * Get production orders with filters
   */
  async getProductionOrders(filters?: ProductionOrderQueryFilters): Promise<ManufacturingOrder[]> {
    if (filters) {
      return poRepo.queryWithFilters(filters);
    }
    return poRepo.findAll({ orderBy: 'order_date', orderDirection: 'DESC', limit: 100 });
  }

  /**
   * Get production order with details
   */
  async getProductionOrderWithDetails(
    orderId: string
  ): Promise<ManufacturingOrderWithDetails | null> {
    return poRepo.findByIdWithDetails(orderId);
  }

  /**
   * Get active production orders
   */
  async getActiveProductionOrders(): Promise<ManufacturingOrder[]> {
    return poRepo.findActive();
  }

  // --------------------------------------------------------------------------
  // SHOP FLOOR TRANSACTIONS
  // --------------------------------------------------------------------------

  /**
   * Create shop floor transaction
   */
  async createShopFloorTransaction(
    dto: CreateShopFloorTransactionDTO
  ): Promise<ShopFloorTransaction> {
    return sftRepo.insert({
      transaction_id: generateShopFloorTransactionId(),
      production_order_id: dto.production_order_id,
      operation_id: dto.operation_id,
      transaction_type: dto.transaction_type,
      transaction_date: new Date(),
      user_id: '', // From auth context
      work_center_id: null, // Would derive from operation
      transaction_quantity: dto.transaction_quantity || 0,
      scrap_quantity: dto.scrap_quantity || 0,
      rework_quantity: dto.rework_quantity || 0,
      hours_reported: 0,
      labor_cost: 0,
      machine_cost: 0,
      lot_number: dto.lot_number || null,
      serial_numbers: dto.serial_numbers ? { items: dto.serial_numbers } : null,
      notes: null,
      created_at: new Date(),
    } as any);
  }

  /**
   * Record quantity completion
   */
  async recordQuantityCompletion(
    productionOrderId: string,
    operationId: string,
    quantity: number,
    scrap: number,
    userId: string
  ): Promise<ProductionOrderOperation> {
    const operation = await pooRepo.findByIdOrThrow(operationId);

    const updated = await pooRepo.update(operationId, {
      quantity_completed: operation.quantity_completed + quantity,
      quantity_scrapped: operation.quantity_scrapped + scrap,
      progress_percent: Math.min(
        100,
        ((operation.quantity_completed + quantity) / operation.quantity_completed) * 100
      ), // Simplified
    } as any);

    // Update production order progress
    const order = await poRepo.findById(productionOrderId);
    if (order) {
      const ops = await pooRepo.findByProductionOrder(productionOrderId);
      const totalProgress =
        ops.reduce((sum, op) => sum + (op.progress_percent || 0), 0) / ops.length;
      await poRepo.update(productionOrderId, {
        progress_percent: totalProgress,
        quantity_completed: order.quantity_completed + quantity,
      } as any);
    }

    return updated!;
  }

  // --------------------------------------------------------------------------
  // MRP
  // --------------------------------------------------------------------------

  /**
   * Create MRP plan
   */
  async createMRPPlan(dto: CreateMRPPlanDTO): Promise<MRPPlan> {
    const planId = generateMRPPlanId();
    const planNumber = await this.generateUniqueMRPPlanNumber();

    return mrpPlanRepo.insert({
      plan_id: planId,
      plan_number: planNumber,
      entity_id: dto.entity_id || null,
      plan_name: dto.plan_name,
      plan_type: dto.plan_type || 'REGENERATIVE',
      plan_status: MRPPlanStatus.DRAFT,
      parameter_id: dto.parameter_id || null,
      plan_date: dto.plan_date || new Date(),
      plan_start_date: dto.plan_start_date,
      plan_end_date: dto.plan_end_date,
      items_planned: 0,
      orders_created: 0,
      orders_modified: 0,
      orders_cancelled: 0,
      action_messages_generated: 0,
      calculation_duration_seconds: null,
      started_at: null,
      completed_at: null,
      error_message: null,
      created_by: '', // From auth context
      approved_by: null,
      approved_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);
  }

  /**
   * Generate unique MRP plan number
   */
  private async generateUniqueMRPPlanNumber(): Promise<string> {
    let number: string;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      number = generateMRPPlanNumber();
      const existing = await mrpPlanRepo.findByNumber(number);
      exists = !!existing;
      attempts++;
    }

    return number!;
  }

  /**
   * Get MRP plans with filters
   */
  async getMRPPlans(filters?: MRPPlanQueryFilters): Promise<MRPPlan[]> {
    if (filters) {
      return mrpPlanRepo.queryWithFilters(filters);
    }
    return mrpPlanRepo.findAll({ orderBy: 'plan_date', orderDirection: 'DESC', limit: 100 });
  }

  /**
   * Get pending MRP actions
   */
  async getPendingMRPActions(planId?: string): Promise<any[]> {
    return mrpActionRepo.findPendingReview(planId);
  }

  // --------------------------------------------------------------------------
  // CAPACITY PLANNING
  // --------------------------------------------------------------------------

  /**
   * Create capacity plan
   */
  async createCapacityPlan(dto: CreateCapacityPlanDTO): Promise<CapacityPlan> {
    return transaction(async client => {
      const planId = generateCapacityPlanId();
      const planNumber = await this.generateUniqueCapacityPlanNumber();

      const plan = await cpRepo.insert(
        {
          plan_id: planId,
          plan_number: planNumber,
          entity_id: null,
          plan_name: dto.plan_name,
          plan_type: 'DETAILED',
          plan_status: CapacityPlanStatus.DRAFT,
          start_date: dto.start_date,
          end_date: dto.end_date,
          created_by: '', // From auth context
          approved_by: null,
          approved_at: null,
          notes: null,
          created_at: new Date(),
          updated_at: new Date(),
        } as any,
        client
      );

      // Create details
      for (const detail of dto.details) {
        await cpdRepo.insert(
          {
            detail_id: `CAP-DTL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            plan_id: planId,
            work_center_id: detail.work_center_id,
            period_start_date: detail.period_start_date,
            period_end_date: detail.period_end_date,
            available_hours: detail.available_hours || 0,
            available_units: 0,
            planned_hours: detail.planned_hours,
            planned_units: 0,
            actual_hours: 0,
            actual_units: 0,
            created_at: new Date(),
          } as any,
          client
        );
      }

      return plan;
    });
  }

  /**
   * Generate unique capacity plan number
   */
  private async generateUniqueCapacityPlanNumber(): Promise<string> {
    let number: string;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      number = generateCapacityPlanNumber();
      const existing = await cpRepo.findByNumber(number);
      exists = !!existing;
      attempts++;
    }

    return number!;
  }

  /**
   * Get capacity plans with filters
   */
  async getCapacityPlans(filters?: CapacityPlanQueryFilters): Promise<CapacityPlan[]> {
    if (filters) {
      return cpRepo.queryWithFilters(filters);
    }
    return cpRepo.findAll({ orderBy: 'start_date', orderDirection: 'DESC', limit: 100 });
  }

  /**
   * Get overloaded work centers
   */
  async getOverloadedWorkCenters(): Promise<any[]> {
    return wcQueueRepo.findOverloaded();
  }

  // --------------------------------------------------------------------------
  // DASHBOARD METRICS
  // --------------------------------------------------------------------------

  /**
   * Get manufacturing dashboard metrics
   */
  async getDashboardMetrics(entityId?: string): Promise<ManufacturingDashboardMetrics> {
    const entityFilter = entityId ? `AND entity_id = '${entityId}'` : '';

    const [activeOrders, pastDueOrders, workCentersActive, todayProduced, defectsToday] =
      await Promise.all([
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM production_orders WHERE order_status IN ('RELEASED', 'IN_PROGRESS') ${entityFilter}`
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM production_orders WHERE order_status IN ('RELEASED', 'IN_PROGRESS') AND due_date < CURRENT_DATE ${entityFilter}`
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM work_centers WHERE work_center_status = 'ACTIVE' ${entityFilter}`
        ),
        query<{ count: string }>(
          `SELECT COUNT(DISTINCT production_order_id) as count FROM shop_floor_transactions WHERE transaction_date >= CURRENT_DATE ${entityFilter}`
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM production_defects WHERE created_at >= CURRENT_DATE ${entityFilter}`
        ),
      ]);

    return {
      active_orders: parseInt(activeOrders.rows[0].count, 10),
      orders_past_due: parseInt(pastDueOrders.rows[0].count, 10),
      orders_today: 0,
      orders_ready_to_ship: 0,
      work_centers_active: parseInt(workCentersActive.rows[0].count, 10),
      work_centers_idle: 0,
      work_centers_overloaded: 0,
      overall_utilization_percent: 0,
      units_produced_today: 0,
      units_produced_this_month: 0,
      scrap_rate_percent: 0,
      rework_rate_percent: 0,
      first_pass_yield_percent: 0,
      defects_today: parseInt(defectsToday.rows[0].count, 10),
      inspections_pending: 0,
      capacity_utilization_percent: 0,
      overloaded_work_centers: 0,
      mps_items_firm: 0,
      mrp_action_messages_pending: 0,
    };
  }
}

// Export singleton instance
export const manufacturingService = new ManufacturingService();
