/**
 * Production Management Service
 *
 * Business logic for production order management and manufacturing workflows
 */

import { productionRepository } from '../repositories/ProductionRepository';
import {
  ProductionOrder,
  BillOfMaterial,
  ProductionOutput,
  CreateProductionOrderDTO,
  UpdateProductionOrderDTO,
  RecordProductionOutputDTO,
  CreateBOMDTO,
  ProductionOrderStatus,
  BillOfMaterialStatus,
  NotFoundError,
} from '@opsui/shared';

export class ProductionService {
  // ========================================================================
  // BILL OF MATERIALS
  // ========================================================================

  async createBOM(dto: CreateBOMDTO, createdBy: string): Promise<BillOfMaterial> {
    // Validate BOM
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('BOM name is required');
    }

    if (!dto.productId || dto.productId.trim() === '') {
      throw new Error('Product ID is required');
    }

    if (!dto.components || dto.components.length === 0) {
      throw new Error('BOM must have at least one component');
    }

    // Validate all SKUs exist
    // This would integrate with the SKU service

    const bom = await productionRepository.createBOM({
      ...dto,
      status: BillOfMaterialStatus.DRAFT,
      version: '1.0',
      createdBy,
    } as any);

    return bom;
  }

  async getBOMById(bomId: string): Promise<BillOfMaterial> {
    const bom = await productionRepository.findBOMById(bomId);
    if (!bom) {
      throw new NotFoundError('BOM', bomId);
    }
    return bom;
  }

  async getAllBOMs(filters?: { productId?: string; status?: string }): Promise<BillOfMaterial[]> {
    return await productionRepository.findAllBOMs(filters);
  }

  // ========================================================================
  // PRODUCTION ORDERS
  // ========================================================================

  async createProductionOrder(
    dto: CreateProductionOrderDTO,
    createdBy: string
  ): Promise<ProductionOrder> {
    // Validate production order
    if (!dto.bomId || dto.bomId.trim() === '') {
      throw new Error('BOM ID is required');
    }

    if (dto.quantityToProduce <= 0) {
      throw new Error('Quantity to produce must be greater than 0');
    }

    if (dto.scheduledStartDate >= dto.scheduledEndDate) {
      throw new Error('Scheduled end date must be after start date');
    }

    // Check if BOM exists and is active
    const bom = await productionRepository.findBOMById(dto.bomId);
    if (!bom) {
      throw new NotFoundError('BOM', dto.bomId);
    }

    if (bom.status !== BillOfMaterialStatus.ACTIVE) {
      throw new Error('BOM must be active to create production order');
    }

    // Get product name and unit of measure from BOM
    const productId = bom.productId;

    const order = await productionRepository.createProductionOrder({
      ...dto,
      productId,
      productName: `Product ${productId}`, // Would fetch from SKU service
      unitOfMeasure: bom.unitOfMeasure || 'EA',
      status: ProductionOrderStatus.PLANNED,
      materialsReserved: false,
      priority: dto.priority || ('NORMAL' as any),
      createdBy,
    });

    return order;
  }

  async getProductionOrderById(orderId: string): Promise<ProductionOrder> {
    const order = await productionRepository.findProductionOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Production Order', orderId);
    }
    return order;
  }

  async getAllProductionOrders(filters?: {
    status?: ProductionOrderStatus;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: ProductionOrder[]; total: number }> {
    return await productionRepository.findAllProductionOrders(filters);
  }

  async updateProductionOrder(
    orderId: string,
    dto: UpdateProductionOrderDTO,
    userId: string
  ): Promise<ProductionOrder> {
    const order = await productionRepository.findProductionOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Production Order', orderId);
    }

    // Validate status transitions
    if (dto.status) {
      this.validateStatusTransition(order.status, dto.status);
    }

    const updated = await productionRepository.updateProductionOrder(orderId, {
      ...dto,
      updatedBy: userId,
    });

    return updated as ProductionOrder;
  }

  async releaseProductionOrder(orderId: string, userId: string): Promise<ProductionOrder> {
    const order = await this.getProductionOrderById(orderId);

    if (order.status !== 'PLANNED' && order.status !== 'DRAFT') {
      throw new Error('Only PLANNED or DRAFT orders can be released');
    }

    // Check material availability
    // This would integrate with inventory service

    const updated = await productionRepository.updateProductionOrder(orderId, {
      status: ProductionOrderStatus.RELEASED,
      materialsReserved: true,
      updatedBy: userId,
    });

    return updated as ProductionOrder;
  }

  async startProductionOrder(orderId: string, userId: string): Promise<ProductionOrder> {
    const order = await this.getProductionOrderById(orderId);

    if (order.status !== 'RELEASED') {
      throw new Error('Only RELEASED orders can be started');
    }

    const updated = await productionRepository.updateProductionOrder(orderId, {
      status: ProductionOrderStatus.IN_PROGRESS,
      actualStartDate: new Date(),
      updatedBy: userId,
    });

    // Log journal entry
    await productionRepository.createProductionJournalEntry({
      orderId,
      producedAt: new Date(),
      producedBy: userId,
      productId: order.productId,
      quantity: 0,
      notes: 'Production started',
    } as any);

    return updated as ProductionOrder;
  }

  async recordProductionOutput(
    dto: RecordProductionOutputDTO,
    userId: string
  ): Promise<ProductionOutput> {
    const order = await this.getProductionOrderById(dto.orderId);

    if (order.status !== 'IN_PROGRESS') {
      throw new Error('Production order must be IN_PROGRESS to record output');
    }

    // Validate quantities
    if (dto.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const totalCompleted = order.quantityCompleted + dto.quantity;
    const totalRejected = order.quantityRejected + (dto.quantityRejected || 0);

    if (totalCompleted + totalRejected > order.quantityToProduce) {
      throw new Error('Total output cannot exceed quantity to produce');
    }

    const output = await productionRepository.createProductionOutput({
      ...dto,
      productId: order.productId,
      producedAt: new Date(),
      producedBy: userId,
    });

    // Check if order is complete
    if (totalCompleted >= order.quantityToProduce) {
      await productionRepository.updateProductionOrder(dto.orderId, {
        status: ProductionOrderStatus.COMPLETED,
        actualEndDate: new Date(),
        updatedBy: userId,
      });
    }

    return output;
  }

  async getProductionJournal(orderId: string): Promise<any[]> {
    await this.getProductionOrderById(orderId); // Validate order exists
    return await productionRepository.findProductionJournalEntries(orderId);
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private validateStatusTransition(
    currentStatus: ProductionOrderStatus,
    newStatus: ProductionOrderStatus
  ): void {
    const validTransitions: Record<ProductionOrderStatus, ProductionOrderStatus[]> = {
      DRAFT: [ProductionOrderStatus.PLANNED, ProductionOrderStatus.CANCELLED],
      PLANNED: [ProductionOrderStatus.RELEASED, ProductionOrderStatus.CANCELLED],
      RELEASED: [ProductionOrderStatus.IN_PROGRESS, ProductionOrderStatus.CANCELLED],
      IN_PROGRESS: [ProductionOrderStatus.COMPLETED, ProductionOrderStatus.CANCELLED],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }
}

// Singleton instance
export const productionService = new ProductionService();
