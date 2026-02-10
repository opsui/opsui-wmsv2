/**
 * Unit tests for ManufacturingService
 * @covers src/services/ManufacturingService.ts
 */

import { ManufacturingService } from '../ManufacturingService';
import {
  workCenterRepository,
  routingRepository,
  productionOrderRepository,
  mrpPlanRepository,
  capacityPlanRepository,
} from '../../repositories/ManufacturingRepository';
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
  CreateWorkCenterDTO,
  Routing,
  CreateRoutingDTO,
  ManufacturingOrder,
  CreateManufacturingOrderDTO,
  MRPPlan,
  CreateMRPPlanDTO,
  CapacityPlan,
  CreateCapacityPlanDTO,
} from '@opsui/shared';

// Filter types - using plain objects since these might not be exported
interface WorkCenterQueryFilters {
  entity_id?: string;
  department?: string;
  work_center_status?: WorkCenterStatus;
  site_id?: string;
  search?: string;
}

interface RoutingQueryFilters {
  entity_id?: string;
  sku?: string;
  routing_status?: RoutingStatus;
  search?: string;
}

interface ManufacturingOrderQueryFilters {
  entity_id?: string;
  sku?: string;
  status?: ManufacturingOrderStatus;
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

interface MRPPlanQueryFilters {
  entity_id?: string;
  plan_status?: MRPPlanStatus;
  plan_date_from?: Date;
  plan_date_to?: Date;
  created_by?: string;
  search?: string;
}

interface CapacityPlanQueryFilters {
  entity_id?: string;
  plan_status?: CapacityPlanStatus;
  start_date_from?: Date;
  start_date_to?: Date;
  end_date_from?: Date;
  end_date_to?: Date;
  work_center_id?: string;
  search?: string;
}

// Mock dependencies
jest.mock('../../repositories/ManufacturingRepository', () => ({
  workCenterRepository: {
    queryWithFilters: jest.fn(),
    findById: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  },
  routingRepository: {
    queryWithFilters: jest.fn(),
    findById: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  },
  productionOrderRepository: {
    queryWithFilters: jest.fn(),
    findById: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  },
  mrpPlanRepository: {
    queryWithFilters: jest.fn(),
    findById: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  },
  capacityPlanRepository: {
    queryWithFilters: jest.fn(),
    findById: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  },
}));

describe('ManufacturingService', () => {
  let manufacturingService: ManufacturingService;

  // Helper to create mock work center
  const createMockWorkCenter = (overrides: any = {}): WorkCenter => ({
    work_center_id: 'WC-001',
    work_center_code: 'ASSEMBLY-01',
    work_center_name: 'Assembly Line 1',
    entity_id: null,
    department: 'Assembly',
    cost_center: 'CC-001',
    location: 'Building A',
    site_id: 'SITE-001',
    capacity_per_shift: 80,
    shifts_per_day: 2,
    efficiency_percent: 95,
    utilization_percent: 85,
    available_capacity: 68,
    labor_rate_per_hour: 25,
    machine_rate_per_hour: 50,
    overhead_rate_per_hour: 10,
    burden_rate: null,
    setup_time_required: true,
    calendar_id: 'CAL-001',
    work_center_status: WorkCenterStatus.ACTIVE,
    active: true,
    description: 'Primary assembly workstation',
    equipment_list: null,
    skills_required: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...overrides,
  });

  // Helper to create mock routing
  const createMockRouting = (overrides: any = {}): Routing => ({
    routing_id: 'RTG-001',
    routing_number: 'RTG-2024-0001',
    entity_id: null,
    sku: 'PROD-001',
    item_description: 'Product 001',
    routing_name: 'Standard production routing',
    routing_type: 'STANDARD',
    routing_status: RoutingStatus.ACTIVE,
    version_number: 1,
    effective_date: new Date('2024-01-01'),
    expiration_date: null,
    supersedes_routing_id: null,
    standard_lot_size: 100,
    scrap_percent: 2,
    yield_percent: 98,
    standard_labor_hours: 10,
    standard_machine_hours: 5,
    standard_cost: 500,
    approved_by: null,
    approved_at: null,
    engineered_by: 'user-123',
    engineered_at: new Date('2024-01-01'),
    notes: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...overrides,
  });

  // Helper to create mock production order
  const createMockProductionOrder = (overrides: any = {}): ManufacturingOrder => ({
    order_id: 'PO-001',
    order_number: 'WO-202401-0001',
    entity_id: null,
    sku: 'PROD-001',
    item_description: 'Product 001',
    routing_id: 'RTG-001',
    order_type: 'STANDARD',
    quantity: 100,
    status: ManufacturingOrderStatus.PLANNED,
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-15'),
    ...overrides,
  });

  // Helper to create mock MRP plan
  const createMockMRPPlan = (overrides: any = {}): MRPPlan => ({
    plan_id: 'MRP-001',
    plan_number: 'MRP-202401-001',
    entity_id: null,
    plan_name: 'January production plan',
    plan_type: 'STANDARD',
    plan_status: MRPPlanStatus.APPROVED,
    parameter_id: 'PARAM-001',
    plan_date: new Date('2024-01-01'),
    plan_start_date: new Date('2024-01-01'),
    plan_end_date: new Date('2024-01-31'),
    items_planned: 150,
    orders_created: 10,
    orders_modified: 5,
    orders_cancelled: 0,
    action_messages_generated: 3,
    calculation_duration_seconds: 45,
    started_at: new Date('2024-01-01T00:00:00Z'),
    completed_at: new Date('2024-01-01T00:00:45Z'),
    error_message: null,
    created_by: 'user-123',
    approved_by: 'user-456',
    approved_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...overrides,
  });

  // Helper to create mock capacity plan
  const createMockCapacityPlan = (overrides: any = {}): CapacityPlan => ({
    plan_id: 'CAP-001',
    plan_number: 'CAP-2024-W1-001',
    entity_id: null,
    plan_name: 'Monthly capacity plan',
    plan_type: 'MONTHLY',
    plan_status: CapacityPlanStatus.ACTIVE,
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-31'),
    created_by: 'user-123',
    approved_by: 'user-456',
    approved_at: new Date('2024-01-01'),
    notes: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    manufacturingService = new ManufacturingService();
  });

  // ==========================================================================
  // WORK CENTERS
  // ==========================================================================

  describe('getWorkCenters', () => {
    it('should return all work centers', async () => {
      const mockWorkCenters = [
        createMockWorkCenter({ work_center_id: 'WC-001' }),
        createMockWorkCenter({ work_center_id: 'WC-002' }),
      ];
      (workCenterRepository.findAll as jest.Mock).mockResolvedValue(mockWorkCenters);

      const result = await manufacturingService.getWorkCenters();

      expect(result).toHaveLength(2);
    });

    it('should filter work centers by status', async () => {
      const mockWorkCenters = [createMockWorkCenter()];
      (workCenterRepository.queryWithFilters as jest.Mock).mockResolvedValue(mockWorkCenters);

      const filters: WorkCenterQueryFilters = {
        work_center_status: WorkCenterStatus.ACTIVE,
      };
      await manufacturingService.getWorkCenters(filters);

      expect(workCenterRepository.queryWithFilters).toHaveBeenCalledWith(filters);
    });
  });

  // ==========================================================================
  // ROUTINGS
  // ==========================================================================

  describe('getRoutings', () => {
    it('should return all routings', async () => {
      const mockRoutings = [
        createMockRouting({ routing_id: 'RTG-001' }),
        createMockRouting({ routing_id: 'RTG-002' }),
      ];
      (routingRepository.findAll as jest.Mock).mockResolvedValue(mockRoutings);

      const result = await manufacturingService.getRoutings();

      expect(result).toHaveLength(2);
    });

    it('should filter routings by SKU', async () => {
      const mockRoutings = [createMockRouting()];
      (routingRepository.queryWithFilters as jest.Mock).mockResolvedValue(mockRoutings);

      const filters: RoutingQueryFilters = { sku: 'PROD-001' };
      await manufacturingService.getRoutings(filters);

      expect(routingRepository.queryWithFilters).toHaveBeenCalledWith(filters);
    });
  });

  // ==========================================================================
  // PRODUCTION ORDERS
  // ==========================================================================

  describe('getProductionOrders', () => {
    it('should return all production orders', async () => {
      const mockOrders = [
        createMockProductionOrder({ order_id: 'PO-001' }),
        createMockProductionOrder({ order_id: 'PO-002' }),
      ];
      (productionOrderRepository.findAll as jest.Mock).mockResolvedValue(mockOrders);

      const result = await manufacturingService.getProductionOrders();

      expect(result).toHaveLength(2);
    });

    it('should filter production orders by status', async () => {
      const mockOrders = [createMockProductionOrder()];
      (productionOrderRepository.queryWithFilters as jest.Mock).mockResolvedValue(mockOrders);

      const filters: ManufacturingOrderQueryFilters = {
        status: ManufacturingOrderStatus.IN_PROGRESS,
      };
      await manufacturingService.getProductionOrders(filters);

      expect(productionOrderRepository.queryWithFilters).toHaveBeenCalledWith(filters);
    });
  });

  // ==========================================================================
  // MRP PLANS
  // ==========================================================================

  describe('getMRPPlans', () => {
    it('should return all MRP plans', async () => {
      const mockPlans = [
        createMockMRPPlan({ plan_id: 'MRP-001' }),
        createMockMRPPlan({ plan_id: 'MRP-002' }),
      ];
      (mrpPlanRepository.findAll as jest.Mock).mockResolvedValue(mockPlans);

      const result = await manufacturingService.getMRPPlans();

      expect(result).toHaveLength(2);
    });

    it('should filter MRP plans by status', async () => {
      const mockPlans = [createMockMRPPlan()];
      (mrpPlanRepository.queryWithFilters as jest.Mock).mockResolvedValue(mockPlans);

      const filters: MRPPlanQueryFilters = {
        plan_status: MRPPlanStatus.APPROVED,
      };
      await manufacturingService.getMRPPlans(filters);

      expect(mrpPlanRepository.queryWithFilters).toHaveBeenCalledWith(filters);
    });
  });

  // ==========================================================================
  // CAPACITY PLANS
  // ==========================================================================

  describe('getCapacityPlans', () => {
    it('should return all capacity plans', async () => {
      const mockPlans = [
        createMockCapacityPlan({ plan_id: 'CAP-001' }),
        createMockCapacityPlan({ plan_id: 'CAP-002' }),
      ];
      (capacityPlanRepository.findAll as jest.Mock).mockResolvedValue(mockPlans);

      const result = await manufacturingService.getCapacityPlans();

      expect(result).toHaveLength(2);
    });

    it('should filter capacity plans by date range', async () => {
      const mockPlans = [createMockCapacityPlan()];
      (capacityPlanRepository.queryWithFilters as jest.Mock).mockResolvedValue(mockPlans);

      const filters: CapacityPlanQueryFilters = {
        start_date_from: new Date('2024-01-01'),
        start_date_to: new Date('2024-01-31'),
      };
      await manufacturingService.getCapacityPlans(filters);

      expect(capacityPlanRepository.queryWithFilters).toHaveBeenCalledWith(filters);
    });
  });
});
