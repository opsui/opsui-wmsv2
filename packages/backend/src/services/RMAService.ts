/**
 * RMA (Return Merchandise Authorization) Service
 *
 * Business logic for handling customer returns, warranty claims, refurbishments, and exchanges
 */

import { rmaRepository } from '../repositories/RMARepository';
import {
  RMARequest,
  RMAStatus,
  RMAPriority,
  CreateRMADTO,
  NotFoundError,
  RMAInspection,
  RMAInspectionDTO,
  UpdateRMAStatusDTO,
  ProcessRefundDTO,
  SendReplacementDTO,
} from '@opsui/shared';

export class RMAService {
  // ========================================================================
  // RMA REQUESTS
  // ========================================================================

  async createRMARequest(dto: CreateRMADTO, createdBy: string): Promise<RMARequest> {
    // Validate RMA request
    if (!dto.orderId || dto.orderId.trim() === '') {
      throw new Error('Order ID is required');
    }

    if (!dto.orderItemId || dto.orderItemId.trim() === '') {
      throw new Error('Order Item ID is required');
    }

    if (!dto.sku || dto.sku.trim() === '') {
      throw new Error('SKU is required');
    }

    if (dto.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    if (!dto.reason || dto.reason.trim() === '') {
      throw new Error('Reason for return is required');
    }

    const rma = await rmaRepository.createRMARequest({
      ...dto,
      productName: '', // Will be populated from order item
      status: RMAStatus.PENDING,
      priority: dto.priority || RMAPriority.NORMAL,
      createdBy,
    } as any);

    // Log the creation activity
    await rmaRepository.logActivity({
      rmaId: rma.rmaId,
      activityType: 'CREATED',
      description: `RMA request created for ${dto.sku} - ${dto.reason}`,
      userId: createdBy,
      userName: createdBy, // Will be updated to actual user name
    });

    return rma;
  }

  async getRMAById(rmaId: string): Promise<RMARequest> {
    const rma = await rmaRepository.findRMAById(rmaId);
    if (!rma) {
      throw new NotFoundError('RMA Request', rmaId);
    }
    return rma;
  }

  async getRMAs(filters?: any): Promise<{ requests: RMARequest[]; total: number }> {
    return await rmaRepository.findAllRMAs(filters);
  }

  async updateRMAStatus(
    rmaId: string,
    dto: UpdateRMAStatusDTO,
    userId: string
  ): Promise<RMARequest> {
    const rma = await this.getRMAById(rmaId);
    const oldStatus = rma.status;

    // Validate status transitions
    if (!this.isValidStatusTransition(oldStatus, dto.status)) {
      throw new Error(`Invalid status transition from ${oldStatus} to ${dto.status}`);
    }

    // Update the RMA
    const updated = await rmaRepository.updateRMARequest(rmaId, {
      ...dto,
      updatedBy: userId,
    });

    if (updated) {
      // Log the status change
      await rmaRepository.logActivity({
        rmaId,
        activityType: 'STATUS_CHANGED',
        description: `Status changed from ${oldStatus} to ${dto.status}`,
        oldStatus,
        newStatus: dto.status,
        userId,
        userName: userId,
      });

      // Set timestamps based on status
      await this.updateStatusTimestamps(rmaId, dto.status, userId);
    }

    return updated as RMARequest;
  }

  async approveRMA(rmaId: string, userId: string): Promise<RMARequest> {
    return await this.updateRMAStatus(rmaId, { status: RMAStatus.APPROVED }, userId);
  }

  async rejectRMA(rmaId: string, rejectionReason: string, userId: string): Promise<RMARequest> {
    const rma = await this.updateRMAStatus(
      rmaId,
      { status: RMAStatus.REJECTED, rejectionReason },
      userId
    );

    // Log rejection
    await rmaRepository.logActivity({
      rmaId,
      activityType: 'REJECTED',
      description: `RMA request rejected: ${rejectionReason}`,
      userId,
      userName: userId,
    });

    return rma;
  }

  async markAsReceived(rmaId: string, userId: string): Promise<RMARequest> {
    return await this.updateRMAStatus(rmaId, { status: RMAStatus.RECEIVED }, userId);
  }

  async startInspection(rmaId: string, userId: string): Promise<RMARequest> {
    return await this.updateRMAStatus(rmaId, { status: RMAStatus.INSPECTING }, userId);
  }

  // ========================================================================
  // RMA INSPECTIONS
  // ========================================================================

  async createInspection(
    rmaId: string,
    dto: RMAInspectionDTO,
    userId: string
  ): Promise<RMAInspection> {
    const rma = await this.getRMAById(rmaId);

    if (rma.status !== RMAStatus.RECEIVED && rma.status !== RMAStatus.INSPECTING) {
      throw new Error('RMA must be received or in inspection to add inspection record');
    }

    const inspection = await rmaRepository.createInspection({
      ...dto,
      rmaId,
      inspectedBy: userId,
      inspectedAt: new Date(),
    });

    // Update RMA with inspection findings
    await rmaRepository.updateRMARequest(rmaId, {
      condition: dto.condition,
      disposition: dto.disposition,
      refundAmount: dto.estimatedRefund,
      updatedBy: userId,
    });

    // Log inspection
    await rmaRepository.logActivity({
      rmaId,
      activityType: 'INSPECTED',
      description: `Inspection completed: ${dto.condition} - ${dto.disposition}`,
      userId,
      userName: userId,
      metadata: { inspectionId: inspection.inspectionId },
    });

    return inspection;
  }

  async getInspections(rmaId: string): Promise<RMAInspection[]> {
    await this.getRMAById(rmaId); // Verify RMA exists
    return await rmaRepository.findInspectionsByRMA(rmaId);
  }

  // ========================================================================
  // RESOLUTIONS
  // ========================================================================

  async processRefund(rmaId: string, dto: ProcessRefundDTO, userId: string): Promise<RMARequest> {
    const rma = await this.getRMAById(rmaId);

    if (!rma.refundAmount) {
      throw new Error('No refund amount set for this RMA');
    }

    const updated = await rmaRepository.updateRMARequest(rmaId, {
      status: RMAStatus.REFUNDED,
      refundMethod: dto.refundMethod,
      refundProcessedAt: new Date(),
      resolvedAt: new Date(),
      resolvedBy: userId,
      updatedBy: userId,
      resolutionNotes: dto.notes,
    });

    // Log refund processing
    await rmaRepository.logActivity({
      rmaId,
      activityType: 'REFUND_PROCESSED',
      description: `Refund processed: ${dto.refundMethod} - $${dto.amount || rma.refundAmount}`,
      userId,
      userName: userId,
    });

    return updated as RMARequest;
  }

  async sendReplacement(
    rmaId: string,
    dto: SendReplacementDTO,
    userId: string
  ): Promise<RMARequest> {
    // In production, this would create a new order for the replacement
    // For now, just update the RMA

    const updated = await rmaRepository.updateRMARequest(rmaId, {
      status: RMAStatus.REPLACED,
      replacementShippedAt: new Date(),
      resolvedAt: new Date(),
      resolvedBy: userId,
      updatedBy: userId,
    });

    // Log replacement shipment
    await rmaRepository.logActivity({
      rmaId,
      activityType: 'REPLACEMENT_SENT',
      description: `Replacement shipped via ${dto.shippingMethod}`,
      userId,
      userName: userId,
      metadata: { shippingAddress: dto.shippingAddress, trackingNumber: dto.trackingNumber },
    });

    return updated as RMARequest;
  }

  async closeRMA(rmaId: string, userId: string): Promise<RMARequest> {
    const rma = await this.getRMAById(rmaId);

    if (
      rma.status !== RMAStatus.REFUNDED &&
      rma.status !== RMAStatus.REPLACED &&
      rma.status !== RMAStatus.REPAIRED &&
      rma.status !== RMAStatus.REJECTED
    ) {
      throw new Error('RMA must be resolved before closing');
    }

    const updated = await rmaRepository.updateRMARequest(rmaId, {
      status: RMAStatus.CLOSED,
      closedAt: new Date(),
      closedBy: userId,
      updatedBy: userId,
    });

    // Log closure
    await rmaRepository.logActivity({
      rmaId,
      activityType: 'CLOSED',
      description: 'RMA request closed',
      userId,
      userName: userId,
    });

    return updated as RMARequest;
  }

  // ========================================================================
  // COMMUNICATIONS
  // ========================================================================

  async addCommunication(
    rmaId: string,
    type: 'EMAIL' | 'PHONE' | 'SMS' | 'NOTE',
    direction: 'INBOUND' | 'OUTBOUND',
    content: string,
    userId: string,
    subject?: string
  ): Promise<void> {
    await this.getRMAById(rmaId); // Verify RMA exists

    await rmaRepository.addCommunication({
      rmaId,
      type,
      direction,
      subject,
      content,
      sentBy: userId,
    });
  }

  async getCommunications(rmaId: string): Promise<any[]> {
    await this.getRMAById(rmaId); // Verify RMA exists
    return await rmaRepository.findCommunicationsByRMA(rmaId);
  }

  // ========================================================================
  // ACTIVITY LOG
  // ========================================================================

  async getActivityLog(rmaId: string, limit: number = 50): Promise<any[]> {
    await this.getRMAById(rmaId); // Verify RMA exists
    return await rmaRepository.findActivitiesByRMA(rmaId, limit);
  }

  // ========================================================================
  // DASHBOARD
  // ========================================================================

  async getDashboard(): Promise<{
    pendingRequests: number;
    awaitingApproval: number;
    inProgress: number;
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
    urgent: number;
    overdue: number;
    totalRefundValue: number;
    pendingRefundValue: number;
  }> {
    return await rmaRepository.getDashboardStats();
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private isValidStatusTransition(from: RMAStatus, to: RMAStatus): boolean {
    const transitions: Record<RMAStatus, RMAStatus[]> = {
      [RMAStatus.PENDING]: [RMAStatus.APPROVED, RMAStatus.REJECTED, RMAStatus.CLOSED],
      [RMAStatus.APPROVED]: [RMAStatus.RECEIVED, RMAStatus.REJECTED, RMAStatus.CLOSED],
      [RMAStatus.REJECTED]: [RMAStatus.CLOSED],
      [RMAStatus.RECEIVED]: [RMAStatus.INSPECTING, RMAStatus.CLOSED],
      [RMAStatus.INSPECTING]: [
        RMAStatus.AWAITING_DECISION,
        RMAStatus.REFUND_APPROVED,
        RMAStatus.REPLACEMENT_APPROVED,
        RMAStatus.REPAIR_APPROVED,
      ],
      [RMAStatus.AWAITING_DECISION]: [
        RMAStatus.REFUND_APPROVED,
        RMAStatus.REPLACEMENT_APPROVED,
        RMAStatus.REPAIR_APPROVED,
        RMAStatus.CLOSED,
      ],
      [RMAStatus.REFUND_APPROVED]: [RMAStatus.REFUND_PROCESSING, RMAStatus.CLOSED],
      [RMAStatus.REFUND_PROCESSING]: [RMAStatus.REFUNDED],
      [RMAStatus.REFUNDED]: [RMAStatus.CLOSED],
      [RMAStatus.REPLACEMENT_APPROVED]: [RMAStatus.REPLACEMENT_PROCESSING, RMAStatus.CLOSED],
      [RMAStatus.REPLACEMENT_PROCESSING]: [RMAStatus.REPLACED],
      [RMAStatus.REPLACED]: [RMAStatus.CLOSED],
      [RMAStatus.REPAIR_APPROVED]: [RMAStatus.REPAIRING, RMAStatus.CLOSED],
      [RMAStatus.REPAIRING]: [RMAStatus.REPAIRED],
      [RMAStatus.REPAIRED]: [RMAStatus.CLOSED],
      [RMAStatus.CLOSED]: [],
    };

    return transitions[from]?.includes(to) ?? false;
  }

  private async updateStatusTimestamps(
    rmaId: string,
    status: RMAStatus,
    userId: string
  ): Promise<void> {
    const updates: Partial<RMARequest> = { updatedBy: userId };

    switch (status) {
      case RMAStatus.APPROVED:
        updates.approvedAt = new Date();
        updates.approvedBy = userId;
        break;
      case RMAStatus.RECEIVED:
        updates.receivedAt = new Date();
        updates.receivedBy = userId;
        break;
      case RMAStatus.INSPECTING:
        updates.inspectedAt = new Date();
        updates.inspectedBy = userId;
        break;
    }

    if (Object.keys(updates).length > 1) {
      await rmaRepository.updateRMARequest(rmaId, updates);
    }
  }
}

// Singleton instance
export const rmaService = new RMAService();
