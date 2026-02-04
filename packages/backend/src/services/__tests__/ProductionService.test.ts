/**
 * Unit tests for ProductionService
 * @covers src/services/ProductionService.ts
 */

import { ProductionService, productionService } from '../ProductionService';
import {
  BillOfMaterial,
  ProductionOrder,
  ProductionOutput,
  ProductionOrderComponent,
  CreateBOMDTO,
  CreateProductionOrderDTO,
  UpdateProductionOrderDTO,
  RecordProductionOutputDTO,
  ProductionOrderStatus,
  ProductionOrderPriority,
  BillOfMaterialStatus,
  NotFoundError,
} from '@opsui/shared';

// Mock productionRepository
jest.mock('../../repositories/ProductionRepository', () => ({
  productionRepository: {
    createBOM: jest.fn(),
    findBOMById: jest.fn(),
    findAllBOMs: jest.fn(),
    createProductionOrder: jest.fn(),
    findProductionOrderById: jest.fn(),
    findAllProductionOrders: jest.fn(),
    updateProductionOrder: jest.fn(),
    createProductionOutput: jest.fn(),
    createProductionJournalEntry: jest.fn(),
    findProductionJournalEntries: jest.fn(),
  },
}));

import { productionRepository } from '../../repositories/ProductionRepository';

describe('ProductionService', () => {
  let service: ProductionService;

  const mockBOM: BillOfMaterial = {
    bomId: 'BOM-001',
    name: 'Test BOM',
    productId: 'PROD-001',
    version: '1.0',
    status: BillOfMaterialStatus.ACTIVE,
    components: [
      {
        componentId: 'COMP-001',
        bomId: 'BOM-001',
        sku: 'SKU-001',
        quantity: 10,
        unitOfMeasure: 'EA',
        isOptional: false,
      },
    ],
    totalQuantity: 10,
    unitOfMeasure: 'EA',
    createdBy: 'user-001',
    createdAt: new Date('2024-01-01'),
  };

  const mockProductionOrder: ProductionOrder = {
    orderId: 'PO-001',
    orderNumber: 'PO-2024-001',
    bomId: 'BOM-001',
    productId: 'PROD-001',
    productName: 'Test Product',
    quantityToProduce: 100,
    quantityCompleted: 0,
    quantityRejected: 0,
    unitOfMeasure: 'EA',
    status: ProductionOrderStatus.PLANNED,
    priority: ProductionOrderPriority.MEDIUM,
    scheduledStartDate: new Date('2024-02-01'),
    scheduledEndDate: new Date('2024-02-15'),
    materialsReserved: false,
    components: [],
    createdAt: new Date('2024-01-01'),
    createdBy: 'user-001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductionService();
  });

  // ==========================================================================
  // BILL OF MATERIALS
  // ==========================================================================

  describe('createBOM', () => {
    const mockDto: CreateBOMDTO = {
      name: 'Test BOM',
      productId: 'PROD-001',
      components: [
        {
          sku: 'SKU-001',
          quantity: 10,
          unitOfMeasure: 'EA',
          isOptional: false,
        },
      ],
      totalQuantity: 10,
      unitOfMeasure: 'EA',
    };

    it('should create a new BOM', async () => {
      const draftBOM = { ...mockBOM, status: BillOfMaterialStatus.DRAFT };
      (productionRepository.createBOM as jest.Mock).mockResolvedValue(draftBOM);

      const result = await service.createBOM(mockDto, 'user-001');

      expect(result.name).toBe('Test BOM');
      expect(result.productId).toBe('PROD-001');
      expect(result.status).toBe(BillOfMaterialStatus.DRAFT);
      expect(productionRepository.createBOM).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test BOM',
          productId: 'PROD-001',
          status: BillOfMaterialStatus.DRAFT,
          version: '1.0',
          createdBy: 'user-001',
        })
      );
    });

    it('should throw error when name is empty', async () => {
      const invalidDto = { ...mockDto, name: '' };

      await expect(service.createBOM(invalidDto, 'user-001')).rejects.toThrow(
        'BOM name is required'
      );
    });

    it('should throw error when name is whitespace', async () => {
      const invalidDto = { ...mockDto, name: '   ' };

      await expect(service.createBOM(invalidDto, 'user-001')).rejects.toThrow(
        'BOM name is required'
      );
    });

    it('should throw error when productId is empty', async () => {
      const invalidDto = { ...mockDto, productId: '' };

      await expect(service.createBOM(invalidDto, 'user-001')).rejects.toThrow(
        'Product ID is required'
      );
    });

    it('should throw error when components array is empty', async () => {
      const invalidDto = { ...mockDto, components: [] };

      await expect(service.createBOM(invalidDto, 'user-001')).rejects.toThrow(
        'BOM must have at least one component'
      );
    });
  });

  // ==========================================================================
  // GET BOM BY ID
  // ==========================================================================

  describe('getBOMById', () => {
    it('should return BOM by ID', async () => {
      (productionRepository.findBOMById as jest.Mock).mockResolvedValue(mockBOM);

      const result = await service.getBOMById('BOM-001');

      expect(result.bomId).toBe('BOM-001');
      expect(result.name).toBe('Test BOM');
    });

    it('should throw NotFoundError when BOM not found', async () => {
      (productionRepository.findBOMById as jest.Mock).mockResolvedValue(null);

      await expect(service.getBOMById('NOT-FOUND')).rejects.toThrow(NotFoundError);
      await expect(service.getBOMById('NOT-FOUND')).rejects.toThrow('BOM');
    });
  });

  // ==========================================================================
  // GET ALL BOMS
  // ==========================================================================

  describe('getAllBOMs', () => {
    it('should return all BOMs without filters', async () => {
      (productionRepository.findAllBOMs as jest.Mock).mockResolvedValue([mockBOM]);

      const result = await service.getAllBOMs();

      expect(result).toHaveLength(1);
      expect(productionRepository.findAllBOMs).toHaveBeenCalledWith(undefined);
    });

    it('should filter BOMs by productId', async () => {
      (productionRepository.findAllBOMs as jest.Mock).mockResolvedValue([mockBOM]);

      await service.getAllBOMs({ productId: 'PROD-001' });

      expect(productionRepository.findAllBOMs).toHaveBeenCalledWith({ productId: 'PROD-001' });
    });

    it('should filter BOMs by status', async () => {
      (productionRepository.findAllBOMs as jest.Mock).mockResolvedValue([mockBOM]);

      await service.getAllBOMs({ status: BillOfMaterialStatus.ACTIVE });

      expect(productionRepository.findAllBOMs).toHaveBeenCalledWith({ status: 'ACTIVE' });
    });

    it('should filter BOMs by both productId and status', async () => {
      (productionRepository.findAllBOMs as jest.Mock).mockResolvedValue([mockBOM]);

      await service.getAllBOMs({ productId: 'PROD-001', status: BillOfMaterialStatus.ACTIVE });

      expect(productionRepository.findAllBOMs).toHaveBeenCalledWith({
        productId: 'PROD-001',
        status: 'ACTIVE',
      });
    });
  });

  // ==========================================================================
  // CREATE PRODUCTION ORDER
  // ==========================================================================

  describe('createProductionOrder', () => {
    const mockDto: CreateProductionOrderDTO = {
      productId: 'PROD-001',
      bomId: 'BOM-001',
      quantityToProduce: 100,
      scheduledStartDate: new Date('2024-02-01'),
      scheduledEndDate: new Date('2024-02-15'),
    };

    it('should create a new production order', async () => {
      (productionRepository.findBOMById as jest.Mock).mockResolvedValue(mockBOM);
      (productionRepository.createProductionOrder as jest.Mock).mockResolvedValue(
        mockProductionOrder
      );

      const result = await service.createProductionOrder(mockDto, 'user-001');

      expect(result.orderId).toBe('PO-001');
      expect(result.status).toBe(ProductionOrderStatus.PLANNED);
      expect(result.productId).toBe('PROD-001');
      expect(result.priority).toBe('MEDIUM');
    });

    it('should throw error when bomId is empty', async () => {
      const invalidDto = { ...mockDto, bomId: '', productId: 'PROD-001' };

      await expect(service.createProductionOrder(invalidDto, 'user-001')).rejects.toThrow(
        'BOM ID is required'
      );
    });

    it('should throw error when quantityToProduce is zero', async () => {
      const invalidDto = { ...mockDto, quantityToProduce: 0 };

      await expect(service.createProductionOrder(invalidDto, 'user-001')).rejects.toThrow(
        'Quantity to produce must be greater than 0'
      );
    });

    it('should throw error when quantityToProduce is negative', async () => {
      const invalidDto = { ...mockDto, quantityToProduce: -10 };

      await expect(service.createProductionOrder(invalidDto, 'user-001')).rejects.toThrow(
        'Quantity to produce must be greater than 0'
      );
    });

    it('should throw error when end date is before start date', async () => {
      const invalidDto = {
        ...mockDto,
        scheduledStartDate: new Date('2024-02-15'),
        scheduledEndDate: new Date('2024-02-01'),
      };

      await expect(service.createProductionOrder(invalidDto, 'user-001')).rejects.toThrow(
        'Scheduled end date must be after start date'
      );
    });

    it('should throw error when end date equals start date', async () => {
      const sameDate = new Date('2024-02-01');
      const invalidDto = {
        ...mockDto,
        scheduledStartDate: sameDate,
        scheduledEndDate: sameDate,
      };

      await expect(service.createProductionOrder(invalidDto, 'user-001')).rejects.toThrow(
        'Scheduled end date must be after start date'
      );
    });

    it('should throw NotFoundError when BOM not found', async () => {
      (productionRepository.findBOMById as jest.Mock).mockResolvedValue(null);

      await expect(service.createProductionOrder(mockDto, 'user-001')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw error when BOM is not active', async () => {
      const inactiveBOM = { ...mockBOM, status: BillOfMaterialStatus.DRAFT };
      (productionRepository.findBOMById as jest.Mock).mockResolvedValue(inactiveBOM);

      await expect(service.createProductionOrder(mockDto, 'user-001')).rejects.toThrow(
        'BOM must be active to create production order'
      );
    });

    it('should use provided priority', async () => {
      const highPriorityDto = { ...mockDto, priority: ProductionOrderPriority.HIGH };
      (productionRepository.findBOMById as jest.Mock).mockResolvedValue(mockBOM);
      const orderWithHighPriority = {
        ...mockProductionOrder,
        priority: ProductionOrderPriority.HIGH,
      };
      (productionRepository.createProductionOrder as jest.Mock).mockResolvedValue(
        orderWithHighPriority
      );

      await service.createProductionOrder(highPriorityDto, 'user-001');

      expect(productionRepository.createProductionOrder).toHaveBeenCalledWith(
        expect.objectContaining({ priority: ProductionOrderPriority.HIGH })
      );
    });
  });

  // ==========================================================================
  // GET PRODUCTION ORDER BY ID
  // ==========================================================================

  describe('getProductionOrderById', () => {
    it('should return production order by ID', async () => {
      (productionRepository.findProductionOrderById as jest.Mock).mockResolvedValue(
        mockProductionOrder
      );

      const result = await service.getProductionOrderById('PO-001');

      expect(result.orderId).toBe('PO-001');
    });

    it('should throw NotFoundError when order not found', async () => {
      (productionRepository.findProductionOrderById as jest.Mock).mockResolvedValue(null);

      await expect(service.getProductionOrderById('NOT-FOUND')).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // GET ALL PRODUCTION ORDERS
  // ==========================================================================

  describe('getAllProductionOrders', () => {
    it('should return all production orders without filters', async () => {
      (productionRepository.findAllProductionOrders as jest.Mock).mockResolvedValue({
        orders: [mockProductionOrder],
        total: 1,
      });

      const result = await service.getAllProductionOrders();

      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter orders by status', async () => {
      (productionRepository.findAllProductionOrders as jest.Mock).mockResolvedValue({
        orders: [mockProductionOrder],
        total: 1,
      });

      await service.getAllProductionOrders({ status: ProductionOrderStatus.IN_PROGRESS });

      expect(productionRepository.findAllProductionOrders).toHaveBeenCalledWith({
        status: ProductionOrderStatus.IN_PROGRESS,
      });
    });

    it('should filter orders by assignedTo', async () => {
      (productionRepository.findAllProductionOrders as jest.Mock).mockResolvedValue({
        orders: [mockProductionOrder],
        total: 1,
      });

      await service.getAllProductionOrders({ assignedTo: 'user-001' });

      expect(productionRepository.findAllProductionOrders).toHaveBeenCalledWith({
        assignedTo: 'user-001',
      });
    });

    it('should apply pagination', async () => {
      (productionRepository.findAllProductionOrders as jest.Mock).mockResolvedValue({
        orders: [mockProductionOrder],
        total: 1,
      });

      await service.getAllProductionOrders({ limit: 10, offset: 20 });

      expect(productionRepository.findAllProductionOrders).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
      });
    });
  });

  // ==========================================================================
  // UPDATE PRODUCTION ORDER
  // ==========================================================================

  describe('updateProductionOrder', () => {
    it('should update production order', async () => {
      const dto: UpdateProductionOrderDTO = {
        priority: ProductionOrderPriority.HIGH,
        notes: 'Updated notes',
      };
      const updatedOrder = { ...mockProductionOrder, priority: ProductionOrderPriority.HIGH };
      (productionRepository.findProductionOrderById as jest.Mock).mockResolvedValue(
        mockProductionOrder
      );
      (productionRepository.updateProductionOrder as jest.Mock).mockResolvedValue(updatedOrder);

      const result = await service.updateProductionOrder('PO-001', dto, 'user-001');

      expect(result.priority).toBe(ProductionOrderPriority.HIGH);
      expect(productionRepository.updateProductionOrder).toHaveBeenCalledWith('PO-001', {
        priority: ProductionOrderPriority.HIGH,
        notes: 'Updated notes',
        updatedBy: 'user-001',
      });
    });

    it('should throw NotFoundError when order not found', async () => {
      (productionRepository.findProductionOrderById as jest.Mock).mockResolvedValue(null);

      await expect(service.updateProductionOrder('NOT-FOUND', {}, 'user-001')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should validate status transition from PLANNED to RELEASED', async () => {
      const dto: UpdateProductionOrderDTO = { status: ProductionOrderStatus.RELEASED };
      (productionRepository.findProductionOrderById as jest.Mock).mockResolvedValue(
        mockProductionOrder
      );
      (productionRepository.updateProductionOrder as jest.Mock).mockResolvedValue(
        mockProductionOrder
      );

      await service.updateProductionOrder('PO-001', dto, 'user-001');

      expect(productionRepository.updateProductionOrder).toHaveBeenCalled();
    });

    it('should throw error on invalid status transition', async () => {
      const dto: UpdateProductionOrderDTO = {
        status: ProductionOrderStatus.COMPLETED,
      };
      (productionRepository.findProductionOrderById as jest.Mock).mockResolvedValue(
        mockProductionOrder
      );

      await expect(service.updateProductionOrder('PO-001', dto, 'user-001')).rejects.toThrow(
        'Cannot transition from PLANNED to COMPLETED'
      );
    });
  });

  // ==========================================================================
  // RELEASE PRODUCTION ORDER
  // ==========================================================================

  describe('releaseProductionOrder', () => {
    it('should release a PLANNED order', async () => {
      const releasedOrder = {
        ...mockProductionOrder,
        status: ProductionOrderStatus.RELEASED,
        materialsReserved: true,
      };
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValueOnce(mockProductionOrder);
      (productionRepository.updateProductionOrder as jest.Mock)
        .mockClear()
        .mockResolvedValue(releasedOrder);

      const result = await service.releaseProductionOrder('PO-001', 'user-001');

      expect(result.status).toBe(ProductionOrderStatus.RELEASED);
      expect(result.materialsReserved).toBe(true);
      expect(productionRepository.updateProductionOrder).toHaveBeenCalledWith('PO-001', {
        status: ProductionOrderStatus.RELEASED,
        materialsReserved: true,
        updatedBy: 'user-001',
      });
    });

    it('should release a DRAFT order', async () => {
      const draftOrder = { ...mockProductionOrder, status: ProductionOrderStatus.DRAFT };
      const releasedOrder = {
        ...draftOrder,
        status: ProductionOrderStatus.RELEASED,
        materialsReserved: true,
      };
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValue(draftOrder);
      (productionRepository.updateProductionOrder as jest.Mock)
        .mockClear()
        .mockResolvedValue(releasedOrder);

      const result = await service.releaseProductionOrder('PO-001', 'user-001');

      expect(result.status).toBe(ProductionOrderStatus.RELEASED);
    });

    it('should throw error when order is not PLANNED or DRAFT', async () => {
      const inProgressOrder = {
        ...mockProductionOrder,
        status: ProductionOrderStatus.IN_PROGRESS,
      };
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValue(inProgressOrder);

      await expect(service.releaseProductionOrder('PO-001', 'user-001')).rejects.toThrow(
        'Only PLANNED or DRAFT orders can be released'
      );
    });
  });

  // ==========================================================================
  // START PRODUCTION ORDER
  // ==========================================================================

  describe('startProductionOrder', () => {
    it('should start a RELEASED order', async () => {
      const releasedOrder = {
        ...mockProductionOrder,
        status: ProductionOrderStatus.RELEASED,
      };
      const inProgressOrder = {
        ...releasedOrder,
        status: ProductionOrderStatus.IN_PROGRESS,
        actualStartDate: new Date(),
      };
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValue(releasedOrder);
      (productionRepository.updateProductionOrder as jest.Mock)
        .mockClear()
        .mockResolvedValue(inProgressOrder);
      (productionRepository.createProductionJournalEntry as jest.Mock)
        .mockClear()
        .mockResolvedValue(undefined);

      const result = await service.startProductionOrder('PO-001', 'user-001');

      expect(result.status).toBe(ProductionOrderStatus.IN_PROGRESS);
      expect(result.actualStartDate).toBeDefined();
      expect(productionRepository.updateProductionOrder).toHaveBeenCalledWith('PO-001', {
        status: ProductionOrderStatus.IN_PROGRESS,
        actualStartDate: expect.any(Date),
        updatedBy: 'user-001',
      });
      expect(productionRepository.createProductionJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'PO-001',
          notes: 'Production started',
        })
      );
    });

    it('should throw error when order is not RELEASED', async () => {
      const plannedOrder = { ...mockProductionOrder, status: ProductionOrderStatus.PLANNED };
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValue(plannedOrder);

      await expect(service.startProductionOrder('PO-001', 'user-001')).rejects.toThrow(
        'Only RELEASED orders can be started'
      );
    });
  });

  // ==========================================================================
  // RECORD PRODUCTION OUTPUT
  // ==========================================================================

  describe('recordProductionOutput', () => {
    const mockDto: RecordProductionOutputDTO = {
      orderId: 'PO-001',
      quantity: 50,
      quantityRejected: 0,
    };

    it('should record production output', async () => {
      const inProgressOrder = {
        ...mockProductionOrder,
        status: ProductionOrderStatus.IN_PROGRESS,
      };
      const mockOutput: ProductionOutput = {
        outputId: 'OUT-001',
        orderId: 'PO-001',
        productId: 'PROD-001',
        quantity: 50,
        quantityRejected: 0,
        producedAt: new Date(),
        producedBy: 'user-001',
      };
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValue(inProgressOrder);
      (productionRepository.createProductionOutput as jest.Mock)
        .mockClear()
        .mockResolvedValue(mockOutput);

      const result = await service.recordProductionOutput(mockDto, 'user-001');

      expect(result.quantity).toBe(50);
      expect(result.orderId).toBe('PO-001');
    });

    it('should throw error when order is not IN_PROGRESS', async () => {
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValue(mockProductionOrder);

      await expect(service.recordProductionOutput(mockDto, 'user-001')).rejects.toThrow(
        'Production order must be IN_PROGRESS to record output'
      );
    });

    it('should throw error when quantity is zero', async () => {
      const invalidDto = { ...mockDto, quantity: 0 };
      const inProgressOrder = {
        ...mockProductionOrder,
        status: ProductionOrderStatus.IN_PROGRESS,
      };
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValue(inProgressOrder);

      await expect(service.recordProductionOutput(invalidDto, 'user-001')).rejects.toThrow(
        'Quantity must be greater than 0'
      );
    });

    it('should throw error when quantity is negative', async () => {
      const invalidDto = { ...mockDto, quantity: -10 };
      const inProgressOrder = {
        ...mockProductionOrder,
        status: ProductionOrderStatus.IN_PROGRESS,
      };
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValue(inProgressOrder);

      await expect(service.recordProductionOutput(invalidDto, 'user-001')).rejects.toThrow(
        'Quantity must be greater than 0'
      );
    });

    it('should throw error when total output exceeds quantity to produce', async () => {
      const inProgressOrder = {
        ...mockProductionOrder,
        status: ProductionOrderStatus.IN_PROGRESS,
        quantityCompleted: 80,
      };
      const dto = { ...mockDto, quantity: 30 }; // 80 + 30 = 110 > 100
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValue(inProgressOrder);

      await expect(service.recordProductionOutput(dto, 'user-001')).rejects.toThrow(
        'Total output cannot exceed quantity to produce'
      );
    });

    it('should complete order when output reaches quantity to produce', async () => {
      const inProgressOrder = {
        ...mockProductionOrder,
        status: ProductionOrderStatus.IN_PROGRESS,
        quantityCompleted: 50,
      };
      const dto = { ...mockDto, quantity: 50 }; // 50 + 50 = 100 = quantityToProduce
      const mockOutput: ProductionOutput = {
        outputId: 'OUT-001',
        orderId: 'PO-001',
        productId: 'PROD-001',
        quantity: 50,
        quantityRejected: 0,
        producedAt: new Date(),
        producedBy: 'user-001',
      };
      (productionRepository.findProductionOrderById as jest.Mock)
        .mockClear()
        .mockResolvedValue(inProgressOrder);
      (productionRepository.createProductionOutput as jest.Mock)
        .mockClear()
        .mockResolvedValue(mockOutput);
      (productionRepository.updateProductionOrder as jest.Mock)
        .mockClear()
        .mockResolvedValue(undefined);

      await service.recordProductionOutput(dto, 'user-001');

      expect(productionRepository.updateProductionOrder).toHaveBeenCalledWith('PO-001', {
        status: ProductionOrderStatus.COMPLETED,
        actualEndDate: expect.any(Date),
        updatedBy: 'user-001',
      });
    });
  });

  // ==========================================================================
  // GET PRODUCTION JOURNAL
  // ==========================================================================

  describe('getProductionJournal', () => {
    it('should return production journal entries', async () => {
      const mockJournal = [
        {
          entryId: 'JOURNAL-001',
          orderId: 'PO-001',
          producedAt: new Date(),
          notes: 'Production started',
        },
      ];
      (productionRepository.findProductionOrderById as jest.Mock).mockResolvedValue(
        mockProductionOrder
      );
      (productionRepository.findProductionJournalEntries as jest.Mock).mockResolvedValue(
        mockJournal
      );

      const result = await service.getProductionJournal('PO-001');

      expect(result).toHaveLength(1);
      expect(result[0].notes).toBe('Production started');
    });

    it('should throw NotFoundError when order not found', async () => {
      (productionRepository.findProductionOrderById as jest.Mock).mockResolvedValue(null);

      await expect(service.getProductionJournal('NOT-FOUND')).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('productionService singleton', () => {
    it('should export singleton instance', () => {
      expect(productionService).toBeInstanceOf(ProductionService);
    });
  });
});
