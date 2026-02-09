/**
 * Purchasing Repository
 *
 * Data access layer for purchasing operations
 * Handles purchase requisitions, RFQs, purchase orders, receipts,
 * three-way matching, vendor catalogs, and vendor performance
 */

import { query, transaction } from '../db/client';
import { BaseRepository } from './BaseRepository';
import type {
  PurchaseRequisition,
  PurchaseRequisitionWithDetails,
  PurchaseRequisitionLine,
  RequisitionApproval,
  RequisitionQueryFilters,
  RequisitionStatus,
  RFQHeader,
  RFQHeaderWithDetails,
  RFQLine,
  RFQVendor,
  RFQVendorResponse,
  RFQResponseLine,
  RFQStatus,
  VendorResponseStatus,
  VendorItemCatalog,
  PurchaseOrderHeader,
  PurchaseOrderWithDetails,
  PurchaseOrderLine,
  PurchaseOrderStatus,
  PurchaseReceipt,
  PurchaseReceiptWithDetails,
  PurchaseReceiptLine,
  ThreeWayMatchDetails,
  ThreeWayMatchStatus,
  VendorPerformanceSummary,
  VendorPerformanceEvent,
  VendorScorecard,
  VendorPerformanceRank,
  ScorecardStatus,
} from '@opsui/shared';

// ============================================================================
// PURCHASE REQUISITION REPOSITORY
// ============================================================================

export class PurchaseRequisitionRepository extends BaseRepository<PurchaseRequisition> {
  constructor() {
    super('purchase_requisitions', 'requisition_id');
  }

  // Find by number
  async findByNumber(requisitionNumber: string): Promise<PurchaseRequisition | null> {
    const result = await query<PurchaseRequisition>(
      `SELECT * FROM ${this.tableName} WHERE requisition_number = $1`,
      [requisitionNumber]
    );
    return result.rows[0] || null;
  }

  // Find with details
  async findByIdWithDetails(requisitionId: string): Promise<PurchaseRequisitionWithDetails | null> {
    const requisition = await this.findById(requisitionId);
    if (!requisition) return null;

    const [requester, lines, approvals] = await Promise.all([
      query<any>('SELECT user_id, email, first_name, last_name FROM users WHERE user_id = $1', [
        requisition.requested_by,
      ]),
      query<PurchaseRequisitionLine>(
        'SELECT * FROM purchase_requisition_lines WHERE requisition_id = $1 ORDER BY line_number',
        [requisitionId]
      ),
      query<RequisitionApproval>(
        'SELECT * FROM requisition_approvals WHERE requisition_id = $1 ORDER BY approval_level',
        [requisitionId]
      ),
    ]);

    const totalEstimatedCost = lines.rows.reduce(
      (sum, line) => sum + (line.estimated_total_cost || 0),
      0
    );

    return {
      ...requisition,
      requester: requester.rows[0] || {
        user_id: requisition.requested_by,
        email: '',
        first_name: '',
        last_name: '',
      },
      lines: lines.rows,
      approvals: approvals.rows,
      total_estimated_cost: totalEstimatedCost,
    };
  }

  // Query with filters
  async queryWithFilters(filters: RequisitionQueryFilters): Promise<PurchaseRequisition[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.entity_id) {
      conditions.push(`entity_id = $${paramIndex++}`);
      params.push(filters.entity_id);
    }
    if (filters.requested_by) {
      conditions.push(`requested_by = $${paramIndex++}`);
      params.push(filters.requested_by);
    }
    if (filters.department) {
      conditions.push(`department = $${paramIndex++}`);
      params.push(filters.department);
    }
    if (filters.approval_status) {
      conditions.push(`approval_status = $${paramIndex++}`);
      params.push(filters.approval_status);
    }
    if (filters.date_from) {
      conditions.push(`request_date >= $${paramIndex++}`);
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push(`request_date <= $${paramIndex++}`);
      params.push(filters.date_to);
    }
    if (filters.required_by_from) {
      conditions.push(`required_by >= $${paramIndex++}`);
      params.push(filters.required_by_from);
    }
    if (filters.required_by_to) {
      conditions.push(`required_by <= $${paramIndex++}`);
      params.push(filters.required_by_to);
    }
    if (filters.job_number) {
      conditions.push(`job_number = $${paramIndex++}`);
      params.push(filters.job_number);
    }
    if (filters.search) {
      conditions.push(
        `(requisition_number ILIKE $${paramIndex++} OR justification ILIKE $${paramIndex++})`
      );
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY request_date DESC`;
    const result = await query<PurchaseRequisition>(sql, params);
    return result.rows;
  }

  // Find pending approvals
  async findPendingApprovals(): Promise<PurchaseRequisitionWithDetails[]> {
    const result = await query<any>(
      `SELECT pr.* FROM ${this.tableName} pr
       JOIN users u ON u.user_id = pr.requested_by
       WHERE pr.approval_status IN ('SUBMITTED', 'PENDING_APPROVAL')
       ORDER BY pr.required_by ASC`
    );

    const requisitions = await Promise.all(
      result.rows.map(async row => this.findByIdWithDetails(row.requisition_id))
    );

    return requisitions.filter((r): r is PurchaseRequisitionWithDetails => r !== null);
  }

  // Find by job number
  async findByJobNumber(jobNumber: string): Promise<PurchaseRequisition[]> {
    const result = await query<PurchaseRequisition>(
      `SELECT * FROM ${this.tableName} WHERE job_number = $1 ORDER BY request_date DESC`,
      [jobNumber]
    );
    return result.rows;
  }

  // Count by status
  async countByStatus(): Promise<Record<string, number>> {
    const result = await query<{ approval_status: string; count: string }>(
      `SELECT approval_status, COUNT(*) as count FROM ${this.tableName} GROUP BY approval_status`
    );
    return result.rows.reduce(
      (acc, row) => {
        acc[row.approval_status] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<string, number>
    );
  }
}

// ============================================================================
// PURCHASE REQUISITION LINE REPOSITORY
// ============================================================================

export class PurchaseRequisitionLineRepository extends BaseRepository<PurchaseRequisitionLine> {
  constructor() {
    super('purchase_requisition_lines', 'line_id');
  }

  // Find by requisition
  async findByRequisition(requisitionId: string): Promise<PurchaseRequisitionLine[]> {
    const result = await query<PurchaseRequisitionLine>(
      `SELECT * FROM ${this.tableName} WHERE requisition_id = $1 ORDER BY line_number`,
      [requisitionId]
    );
    return result.rows;
  }

  // Get next line number
  async getNextLineNumber(requisitionId: string): Promise<number> {
    const result = await query<{ max_line_number: string }>(
      `SELECT COALESCE(MAX(line_number), 0) + 1 as max_line_number FROM ${this.tableName} WHERE requisition_id = $1`,
      [requisitionId]
    );
    return parseInt(result.rows[0].max_line_number, 10);
  }

  // Delete by requisition
  async deleteByRequisition(requisitionId: string): Promise<number> {
    const result = await query(`DELETE FROM ${this.tableName} WHERE requisition_id = $1`, [
      requisitionId,
    ]);
    return result.rowCount || 0;
  }
}

// ============================================================================
// REQUISITION APPROVAL REPOSITORY
// ============================================================================

export class RequisitionApprovalRepository extends BaseRepository<RequisitionApproval> {
  constructor() {
    super('requisition_approvals', 'approval_id');
  }

  // Find by requisition
  async findByRequisition(requisitionId: string): Promise<RequisitionApproval[]> {
    const result = await query<RequisitionApproval>(
      `SELECT * FROM ${this.tableName} WHERE requisition_id = $1 ORDER BY approval_level`,
      [requisitionId]
    );
    return result.rows;
  }

  // Find pending approvals for user
  async findPendingForUser(userId: string): Promise<RequisitionApproval[]> {
    const result = await query<RequisitionApproval>(
      `SELECT ra.* FROM ${this.tableName} ra
       JOIN purchase_requisitions pr ON pr.requisition_id = ra.requisition_id
       WHERE ra.approver_id = $1
       AND ra.approval_status = 'PENDING'
       AND pr.approval_status IN ('SUBMITTED', 'PENDING_APPROVAL')
       ORDER BY pr.required_by ASC`,
      [userId]
    );
    return result.rows;
  }

  // Check if all approvals completed
  async allApprovalsCompleted(requisitionId: string): Promise<boolean> {
    const result = await query<{ completed: string }>(
      `SELECT CASE
         WHEN COUNT(*) = 0 OR COUNT(*) FILTER (WHERE approval_status = 'PENDING') > 0
         THEN 'false'
         ELSE 'true'
       END as completed
       FROM ${this.tableName}
       WHERE requisition_id = $1`,
      [requisitionId]
    );
    return result.rows[0].completed === 'true';
  }
}

// ============================================================================
// RFQ HEADER REPOSITORY
// ============================================================================

export class RFQHeaderRepository extends BaseRepository<RFQHeader> {
  constructor() {
    super('rfq_headers', 'rfq_id');
  }

  // Find by number
  async findByNumber(rfqNumber: string): Promise<RFQHeader | null> {
    const result = await query<RFQHeader>(`SELECT * FROM ${this.tableName} WHERE rfq_number = $1`, [
      rfqNumber,
    ]);
    return result.rows[0] || null;
  }

  // Find with details
  async findByIdWithDetails(rfqId: string): Promise<RFQHeaderWithDetails | null> {
    const rfq = await this.findById(rfqId);
    if (!rfq) return null;

    const [lines, vendors] = await Promise.all([
      query<RFQLine>(`SELECT * FROM rfq_lines WHERE rfq_id = $1 ORDER BY line_number`, [rfqId]),
      query<RFQVendor>(
        `SELECT rv.*,
         COALESCE(vr.response_id, rv.status) as has_response
         FROM rfq_vendors rv
         LEFT JOIN rfq_vendor_responses vr ON vr.rfq_vendor_id = rv.rfq_vendor_id
         WHERE rv.rfq_id = $1`,
        [rfqId]
      ),
    ]);

    // Count responses and find lowest bid
    const responseCount = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT response_id) as count FROM rfq_vendor_responses WHERE rfq_id = $1`,
      [rfqId]
    );

    const lowestBid = await query<{ grand_total: string }>(
      `SELECT MIN(grand_total) as grand_total FROM rfq_vendor_responses WHERE rfq_id = $1`,
      [rfqId]
    );

    return {
      ...rfq,
      lines: lines.rows,
      vendors: vendors.rows,
      response_count: parseInt(responseCount.rows[0]?.count || '0', 10),
      lowest_bid_amount: lowestBid.rows[0]?.grand_total
        ? parseFloat(lowestBid.rows[0].grand_total)
        : null,
    };
  }

  // Find by source
  async findBySource(sourceType: string, sourceId: string): Promise<RFQHeader[]> {
    const result = await query<RFQHeader>(
      `SELECT * FROM ${this.tableName} WHERE source_type = $1 AND source_id = $2 ORDER BY created_date DESC`,
      [sourceType, sourceId]
    );
    return result.rows;
  }

  // Find pending response
  async findPendingResponse(): Promise<RFQHeaderWithDetails[]> {
    const result = await query<RFQHeader>(
      `SELECT * FROM ${this.tableName} WHERE rfq_status IN ('SENT', 'RESPONSES_PENDING') ORDER BY quote_due_date ASC`
    );

    const rfqs = await Promise.all(
      result.rows.map(async row => this.findByIdWithDetails(row.rfq_id))
    );

    return rfqs.filter((r): r is RFQHeaderWithDetails => r !== null);
  }

  // Update status
  async updateStatus(rfqId: string, status: RFQStatus): Promise<RFQHeader | null> {
    return this.update(rfqId, { rfq_status: status } as Partial<RFQHeader>);
  }
}

// ============================================================================
// RFQ LINE REPOSITORY
// ============================================================================

export class RFQLineRepository extends BaseRepository<RFQLine> {
  constructor() {
    super('rfq_lines', 'line_id');
  }

  // Find by RFQ
  async findByRFQ(rfqId: string): Promise<RFQLine[]> {
    const result = await query<RFQLine>(
      `SELECT * FROM ${this.tableName} WHERE rfq_id = $1 ORDER BY line_number`,
      [rfqId]
    );
    return result.rows;
  }

  // Get next line number
  async getNextLineNumber(rfqId: string): Promise<number> {
    const result = await query<{ max_line_number: string }>(
      `SELECT COALESCE(MAX(line_number), 0) + 1 as max_line_number FROM ${this.tableName} WHERE rfq_id = $1`,
      [rfqId]
    );
    return parseInt(result.rows[0].max_line_number, 10);
  }
}

// ============================================================================
// RFQ VENDOR REPOSITORY
// ============================================================================

export class RFQVendorRepository extends BaseRepository<RFQVendor> {
  constructor() {
    super('rfq_vendors', 'rfq_vendor_id');
  }

  // Find by RFQ
  async findByRFQ(rfqId: string): Promise<RFQVendor[]> {
    const result = await query<RFQVendor>(`SELECT * FROM ${this.tableName} WHERE rfq_id = $1`, [
      rfqId,
    ]);
    return result.rows;
  }

  // Find pending responses
  async findPendingResponses(): Promise<RFQVendor[]> {
    const result = await query<RFQVendor>(
      `SELECT rv.* FROM ${this.tableName} rv
       JOIN rfq_headers rh ON rh.rfq_id = rv.rfq_id
       WHERE rv.status = 'PENDING'
       AND rh.rfq_status IN ('SENT', 'RESPONSES_PENDING')
       AND rh.quote_due_date >= CURRENT_DATE`
    );
    return result.rows;
  }

  // Update status
  async updateStatus(rfqVendorId: string, status: VendorResponseStatus): Promise<RFQVendor | null> {
    return this.update(rfqVendorId, { status } as Partial<RFQVendor>);
  }
}

// ============================================================================
// RFQ VENDOR RESPONSE REPOSITORY
// ============================================================================

export class RFQVendorResponseRepository extends BaseRepository<RFQVendorResponse> {
  constructor() {
    super('rfq_vendor_responses', 'response_id');
  }

  // Find by RFQ
  async findByRFQ(rfqId: string): Promise<RFQVendorResponse[]> {
    const result = await query<RFQVendorResponse>(
      `SELECT * FROM ${this.tableName} WHERE rfq_id = $1 ORDER BY response_date`,
      [rfqId]
    );
    return result.rows;
  }

  // Find by vendor
  async findByVendor(vendorId: string): Promise<RFQVendorResponse[]> {
    const result = await query<RFQVendorResponse>(
      `SELECT * FROM ${this.tableName} WHERE vendor_id = $1 ORDER BY response_date DESC`,
      [vendorId]
    );
    return result.rows;
  }

  // Find with lines
  async findByIdWithLines(responseId: string): Promise<RFQVendorResponse | null> {
    const response = await this.findById(responseId);
    if (!response) return null;

    const lines = await query<RFQResponseLine>(
      `SELECT * FROM rfq_response_lines WHERE response_id = $1 ORDER BY line_number`,
      [responseId]
    );

    return {
      ...response,
      lines: lines.rows,
    };
  }

  // Find lowest bid for RFQ
  async findLowestBidForRFQ(rfqId: string): Promise<RFQVendorResponse | null> {
    const result = await query<RFQVendorResponse>(
      `SELECT * FROM ${this.tableName}
       WHERE rfq_id = $1
       ORDER BY grand_total ASC
       LIMIT 1`,
      [rfqId]
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// RFQ RESPONSE LINE REPOSITORY
// ============================================================================

export class RFQResponseLineRepository extends BaseRepository<RFQResponseLine> {
  constructor() {
    super('rfq_response_lines', 'response_line_id');
  }

  // Find by response
  async findByResponse(responseId: string): Promise<RFQResponseLine[]> {
    const result = await query<RFQResponseLine>(
      `SELECT * FROM ${this.tableName} WHERE response_id = $1 ORDER BY line_number`,
      [responseId]
    );
    return result.rows;
  }
}

// ============================================================================
// VENDOR ITEM CATALOG REPOSITORY
// ============================================================================

export class VendorItemCatalogRepository extends BaseRepository<VendorItemCatalog> {
  constructor() {
    super('vendor_item_catalogs', 'catalog_id');
  }

  // Find by vendor
  async findByVendor(vendorId: string, activeOnly = true): Promise<VendorItemCatalog[]> {
    const condition = activeOnly ? 'AND is_active = true' : '';
    const result = await query<VendorItemCatalog>(
      `SELECT * FROM ${this.tableName} WHERE vendor_id = $1 ${condition} ORDER BY item_name`,
      [vendorId]
    );
    return result.rows;
  }

  // Find by internal SKU
  async findByInternalSKU(sku: string): Promise<VendorItemCatalog[]> {
    const result = await query<VendorItemCatalog>(
      `SELECT * FROM ${this.tableName} WHERE internal_sku = $1 AND is_active = true`,
      [sku]
    );
    return result.rows;
  }

  // Find by vendor and vendor SKU
  async findByVendorSKU(vendorId: string, vendorSku: string): Promise<VendorItemCatalog | null> {
    const result = await query<VendorItemCatalog>(
      `SELECT * FROM ${this.tableName} WHERE vendor_id = $1 AND vendor_sku = $2`,
      [vendorId, vendorSku]
    );
    return result.rows[0] || null;
  }

  // Find preferred vendors for SKU
  async findPreferredForSKU(sku: string): Promise<VendorItemCatalog[]> {
    const result = await query<VendorItemCatalog>(
      `SELECT * FROM ${this.tableName} WHERE internal_sku = $1 AND is_preferred = true AND is_active = true`,
      [sku]
    );
    return result.rows;
  }

  // Find by entity
  async findByEntity(entityId: string): Promise<VendorItemCatalog[]> {
    const result = await query<VendorItemCatalog>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 AND is_active = true`,
      [entityId]
    );
    return result.rows;
  }
}

// ============================================================================
// PURCHASE ORDER HEADER REPOSITORY
// ============================================================================

export class PurchaseOrderHeaderRepository extends BaseRepository<PurchaseOrderHeader> {
  constructor() {
    super('purchase_order_headers', 'po_id');
  }

  // Find by number
  async findByNumber(poNumber: string): Promise<PurchaseOrderHeader | null> {
    const result = await query<PurchaseOrderHeader>(
      `SELECT * FROM ${this.tableName} WHERE po_number = $1`,
      [poNumber]
    );
    return result.rows[0] || null;
  }

  // Find with details
  async findByIdWithDetails(poId: string): Promise<PurchaseOrderWithDetails | null> {
    const po = await this.findById(poId);
    if (!po) return null;

    const lines = await query<PurchaseOrderLine>(
      `SELECT * FROM purchase_order_lines WHERE po_id = $1 ORDER BY line_number`,
      [poId]
    );

    return {
      ...po,
      lines: lines.rows,
    };
  }

  // Find by vendor
  async findByVendor(vendorId: string): Promise<PurchaseOrderHeader[]> {
    const result = await query<PurchaseOrderHeader>(
      `SELECT * FROM ${this.tableName} WHERE vendor_id = $1 ORDER BY order_date DESC`,
      [vendorId]
    );
    return result.rows;
  }

  // Find by source
  async findBySource(sourceType: string, sourceId: string): Promise<PurchaseOrderHeader[]> {
    const result = await query<PurchaseOrderHeader>(
      `SELECT * FROM ${this.tableName} WHERE source_type = $1 AND source_id = $2 ORDER BY order_date DESC`,
      [sourceType, sourceId]
    );
    return result.rows;
  }

  // Find open orders
  async findOpenOrders(): Promise<PurchaseOrderHeader[]> {
    const result = await query<PurchaseOrderHeader>(
      `SELECT * FROM ${this.tableName} WHERE po_status IN ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'PARTIAL') ORDER BY order_date ASC`
    );
    return result.rows;
  }

  // Find orders with match exceptions
  async findWithMatchExceptions(): Promise<PurchaseOrderHeader[]> {
    const result = await query<PurchaseOrderHeader>(
      `SELECT DISTINCT poh.* FROM ${this.tableName} poh
       JOIN three_way_match_details twm ON twm.po_id = poh.po_id
       WHERE twm.is_match_ok = false
       OR ABS(twm.variance_percent) > twm.tolerance_percent
       ORDER BY poh.order_date DESC`
    );
    return result.rows;
  }

  // Update status
  async updateStatus(
    poId: string,
    status: PurchaseOrderStatus
  ): Promise<PurchaseOrderHeader | null> {
    return this.update(poId, { po_status: status } as Partial<PurchaseOrderHeader>);
  }

  // Update three-way match status
  async updateThreeWayMatchStatus(
    poId: string,
    status: ThreeWayMatchStatus
  ): Promise<PurchaseOrderHeader | null> {
    return this.update(poId, { three_way_match_status: status } as Partial<PurchaseOrderHeader>);
  }
}

// ============================================================================
// PURCHASE ORDER LINE REPOSITORY
// ============================================================================

export class PurchaseOrderLineRepository extends BaseRepository<PurchaseOrderLine> {
  constructor() {
    super('purchase_order_lines', 'pol_id');
  }

  // Find by PO
  async findByPO(poId: string): Promise<PurchaseOrderLine[]> {
    const result = await query<PurchaseOrderLine>(
      `SELECT * FROM ${this.tableName} WHERE po_id = $1 ORDER BY line_number`,
      [poId]
    );
    return result.rows;
  }

  // Find by SKU
  async findBySKU(sku: string): Promise<PurchaseOrderLine[]> {
    const result = await query<PurchaseOrderLine>(
      `SELECT * FROM ${this.tableName} WHERE sku = $1`,
      [sku]
    );
    return result.rows;
  }

  // Get next line number
  async getNextLineNumber(poId: string): Promise<number> {
    const result = await query<{ max_line_number: string }>(
      `SELECT COALESCE(MAX(line_number), 0) + 1 as max_line_number FROM ${this.tableName} WHERE po_id = $1`,
      [poId]
    );
    return parseInt(result.rows[0].max_line_number, 10);
  }

  // Update received quantity
  async updateReceivedQuantity(
    polId: string,
    quantityReceived: number
  ): Promise<PurchaseOrderLine | null> {
    const result = await query<PurchaseOrderLine>(
      `UPDATE ${this.tableName}
       SET quantity_received = $1,
           updated_at = NOW()
       WHERE pol_id = $2
       RETURNING *`,
      [quantityReceived, polId]
    );
    return result.rows[0] || null;
  }

  // Update three-way match status
  async updateThreeWayMatchStatus(
    polId: string,
    status: ThreeWayMatchStatus
  ): Promise<PurchaseOrderLine | null> {
    const result = await query<PurchaseOrderLine>(
      `UPDATE ${this.tableName}
       SET three_way_match_status = $1,
           updated_at = NOW()
       WHERE pol_id = $2
       RETURNING *`,
      [status, polId]
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// PURCHASE RECEIPT REPOSITORY
// ============================================================================

export class PurchaseReceiptRepository extends BaseRepository<PurchaseReceipt> {
  constructor() {
    super('purchase_receipts', 'receipt_id');
  }

  // Find by number
  async findByNumber(receiptNumber: string): Promise<PurchaseReceipt | null> {
    const result = await query<PurchaseReceipt>(
      `SELECT * FROM ${this.tableName} WHERE receipt_number = $1`,
      [receiptNumber]
    );
    return result.rows[0] || null;
  }

  // Find with details
  async findByIdWithDetails(receiptId: string): Promise<PurchaseReceiptWithDetails | null> {
    const receipt = await this.findById(receiptId);
    if (!receipt) return null;

    const lines = await query<PurchaseReceiptLine>(
      `SELECT * FROM purchase_receipt_lines WHERE receipt_id = $1 ORDER BY line_number`,
      [receiptId]
    );

    return {
      ...receipt,
      lines: lines.rows,
    };
  }

  // Find by PO
  async findByPO(poId: string): Promise<PurchaseReceipt[]> {
    const result = await query<PurchaseReceipt>(
      `SELECT * FROM ${this.tableName} WHERE po_id = $1 ORDER BY receipt_date DESC`,
      [poId]
    );
    return result.rows;
  }

  // Find by vendor
  async findByVendor(vendorId: string): Promise<PurchaseReceipt[]> {
    const result = await query<PurchaseReceipt>(
      `SELECT * FROM ${this.tableName} WHERE vendor_id = $1 ORDER BY receipt_date DESC`,
      [vendorId]
    );
    return result.rows;
  }

  // Find by date range
  async findByDateRange(startDate: Date, endDate: Date): Promise<PurchaseReceipt[]> {
    const result = await query<PurchaseReceipt>(
      `SELECT * FROM ${this.tableName} WHERE receipt_date BETWEEN $1 AND $2 ORDER BY receipt_date DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }

  // Find open receipts (not fully put away)
  async findOpenReceipts(): Promise<PurchaseReceipt[]> {
    const result = await query<PurchaseReceipt>(
      `SELECT * FROM ${this.tableName} WHERE receipt_status IN ('OPEN', 'PARTIALLY_PUTAWAY') ORDER BY receipt_date ASC`
    );
    return result.rows;
  }
}

// ============================================================================
// PURCHASE RECEIPT LINE REPOSITORY
// ============================================================================

export class PurchaseReceiptLineRepository extends BaseRepository<PurchaseReceiptLine> {
  constructor() {
    super('purchase_receipt_lines', 'receipt_line_id');
  }

  // Find by receipt
  async findByReceipt(receiptId: string): Promise<PurchaseReceiptLine[]> {
    const result = await query<PurchaseReceiptLine>(
      `SELECT * FROM ${this.tableName} WHERE receipt_id = $1 ORDER BY line_number`,
      [receiptId]
    );
    return result.rows;
  }

  // Find by PO line
  async findByPOLine(poLineId: string): Promise<PurchaseReceiptLine[]> {
    const result = await query<PurchaseReceiptLine>(
      `SELECT * FROM ${this.tableName} WHERE po_line_id = $1 ORDER BY receipt_date DESC`,
      [poLineId]
    );
    return result.rows;
  }

  // Find by SKU
  async findBySKU(sku: string): Promise<PurchaseReceiptLine[]> {
    const result = await query<PurchaseReceiptLine>(
      `SELECT * FROM ${this.tableName} WHERE sku = $1`,
      [sku]
    );
    return result.rows;
  }

  // Find by lot number
  async findByLotNumber(lotNumber: string): Promise<PurchaseReceiptLine[]> {
    const result = await query<PurchaseReceiptLine>(
      `SELECT * FROM ${this.tableName} WHERE lot_number = $1`,
      [lotNumber]
    );
    return result.rows;
  }

  // Get next line number
  async getNextLineNumber(receiptId: string): Promise<number> {
    const result = await query<{ max_line_number: string }>(
      `SELECT COALESCE(MAX(line_number), 0) + 1 as max_line_number FROM ${this.tableName} WHERE receipt_id = $1`,
      [receiptId]
    );
    return parseInt(result.rows[0].max_line_number, 10);
  }
}

// ============================================================================
// THREE-WAY MATCH REPOSITORY
// ============================================================================

export class ThreeWayMatchRepository extends BaseRepository<ThreeWayMatchDetails> {
  constructor() {
    super('three_way_match_details', 'match_id');
  }

  // Find by PO
  async findByPO(poId: string): Promise<ThreeWayMatchDetails[]> {
    const result = await query<ThreeWayMatchDetails>(
      `SELECT * FROM ${this.tableName} WHERE po_id = $1 ORDER BY created_at DESC`,
      [poId]
    );
    return result.rows;
  }

  // Find by PO line
  async findByPOLine(poLineId: string): Promise<ThreeWayMatchDetails[]> {
    const result = await query<ThreeWayMatchDetails>(
      `SELECT * FROM ${this.tableName} WHERE po_line_id = $1 ORDER BY created_at DESC`,
      [poLineId]
    );
    return result.rows;
  }

  // Find by receipt
  async findByReceipt(receiptId: string): Promise<ThreeWayMatchDetails[]> {
    const result = await query<ThreeWayMatchDetails>(
      `SELECT * FROM ${this.tableName} WHERE receipt_id = $1 ORDER BY created_at DESC`,
      [receiptId]
    );
    return result.rows;
  }

  // Find by invoice
  async findByInvoice(invoiceId: string): Promise<ThreeWayMatchDetails[]> {
    const result = await query<ThreeWayMatchDetails>(
      `SELECT * FROM ${this.tableName} WHERE invoice_id = $1 ORDER BY created_at DESC`,
      [invoiceId]
    );
    return result.rows;
  }

  // Find exceptions
  async findExceptions(): Promise<ThreeWayMatchDetails[]> {
    const result = await query<ThreeWayMatchDetails>(
      `SELECT * FROM ${this.tableName}
       WHERE is_match_ok = false
       OR ABS(variance_percent) > tolerance_percent
       ORDER BY ABS(variance_percent) DESC`
    );
    return result.rows;
  }

  // Find pending invoice match
  async findPendingInvoiceMatch(): Promise<ThreeWayMatchDetails[]> {
    const result = await query<ThreeWayMatchDetails>(
      `SELECT * FROM ${this.tableName}
       WHERE match_status IN ('FULLY_RECEIVED', 'PENDING_INVOICE')
       ORDER BY created_at ASC`
    );
    return result.rows;
  }

  // Update match status
  async updateMatchStatus(
    matchId: string,
    status: ThreeWayMatchStatus
  ): Promise<ThreeWayMatchDetails | null> {
    const result = await query<ThreeWayMatchDetails>(
      `UPDATE ${this.tableName}
       SET match_status = $1,
           updated_at = NOW()
       WHERE match_id = $2
       RETURNING *`,
      [status, matchId]
    );
    return result.rows[0] || null;
  }

  // Resolve variance
  async resolveVariance(
    matchId: string,
    resolved: boolean,
    resolutionNotes?: string
  ): Promise<ThreeWayMatchDetails | null> {
    const result = await query<ThreeWayMatchDetails>(
      `UPDATE ${this.tableName}
       SET variance_resolved = $1,
           resolution_notes = $2,
           updated_at = NOW()
       WHERE match_id = $3
       RETURNING *`,
      [resolved, resolutionNotes || null, matchId]
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// VENDOR PERFORMANCE SUMMARY REPOSITORY
// ============================================================================

export class VendorPerformanceSummaryRepository extends BaseRepository<VendorPerformanceSummary> {
  constructor() {
    super('vendor_performance_summary', 'performance_id');
  }

  // Find by vendor
  async findByVendor(vendorId: string): Promise<VendorPerformanceSummary[]> {
    const result = await query<VendorPerformanceSummary>(
      `SELECT * FROM ${this.tableName} WHERE vendor_id = $1 ORDER BY period_start DESC`,
      [vendorId]
    );
    return result.rows;
  }

  // Find current period
  async findCurrentPeriod(vendorId: string): Promise<VendorPerformanceSummary | null> {
    const result = await query<VendorPerformanceSummary>(
      `SELECT * FROM ${this.tableName}
       WHERE vendor_id = $1
       AND period_start <= CURRENT_DATE
       AND period_end >= CURRENT_DATE
       LIMIT 1`,
      [vendorId]
    );
    return result.rows[0] || null;
  }

  // Find top performers
  async findTopPerformers(limit = 10, minRating = 4.0): Promise<VendorPerformanceSummary[]> {
    const result = await query<VendorPerformanceSummary>(
      `SELECT * FROM ${this.tableName}
       WHERE overall_rating >= $1
       ORDER BY overall_rating DESC, total_spend DESC
       LIMIT $2`,
      [minRating, limit]
    );
    return result.rows;
  }

  // Find vendors at risk
  async findVendorsAtRisk(maxRating = 2.5): Promise<VendorPerformanceSummary[]> {
    const result = await query<VendorPerformanceSummary>(
      `SELECT * FROM ${this.tableName}
       WHERE overall_rating <= $1
       OR overall_rank = 'CRITICAL'
       ORDER BY overall_rating ASC`,
      [maxRating]
    );
    return result.rows;
  }

  // Find by entity
  async findByEntity(entityId: string): Promise<VendorPerformanceSummary[]> {
    const result = await query<VendorPerformanceSummary>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 ORDER BY overall_rating DESC`,
      [entityId]
    );
    return result.rows;
  }

  // Get vendor ranking
  async getVendorRanking(limit = 50): Promise<VendorPerformanceSummary[]> {
    const result = await query<VendorPerformanceSummary>(
      `SELECT * FROM ${this.tableName}
       WHERE overall_rating IS NOT NULL
       ORDER BY overall_rating DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

// ============================================================================
// VENDOR PERFORMANCE EVENT REPOSITORY
// ============================================================================

export class VendorPerformanceEventRepository extends BaseRepository<VendorPerformanceEvent> {
  constructor() {
    super('vendor_performance_events', 'event_id');
  }

  // Find by vendor
  async findByVendor(vendorId: string, limit = 100): Promise<VendorPerformanceEvent[]> {
    const result = await query<VendorPerformanceEvent>(
      `SELECT * FROM ${this.tableName} WHERE vendor_id = $1 ORDER BY event_date DESC LIMIT $2`,
      [vendorId, limit]
    );
    return result.rows;
  }

  // Find by category
  async findByCategory(vendorId: string, category: string): Promise<VendorPerformanceEvent[]> {
    const result = await query<VendorPerformanceEvent>(
      `SELECT * FROM ${this.tableName}
       WHERE vendor_id = $1 AND event_category = $2
       ORDER BY event_date DESC`,
      [vendorId, category]
    );
    return result.rows;
  }

  // Find unresolved
  async findUnresolved(vendorId?: string): Promise<VendorPerformanceEvent[]> {
    const condition = vendorId ? 'AND vendor_id = $1' : '';
    const result = await query<VendorPerformanceEvent>(
      `SELECT * FROM ${this.tableName} WHERE resolved = false ${condition} ORDER BY severity DESC, event_date ASC`,
      vendorId ? [vendorId] : []
    );
    return result.rows;
  }

  // Find by reference
  async findByReference(
    referenceType: string,
    referenceId: string
  ): Promise<VendorPerformanceEvent[]> {
    const result = await query<VendorPerformanceEvent>(
      `SELECT * FROM ${this.tableName}
       WHERE reference_type = $1 AND reference_id = $2
       ORDER BY event_date DESC`,
      [referenceType, referenceId]
    );
    return result.rows;
  }

  // Update resolution
  async updateResolution(
    eventId: string,
    resolved: boolean,
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<VendorPerformanceEvent | null> {
    const result = await query<VendorPerformanceEvent>(
      `UPDATE ${this.tableName}
       SET resolved = $1,
           resolved_by = $2,
           resolved_at = NOW(),
           resolution_notes = $3,
           updated_at = NOW()
       WHERE event_id = $4
       RETURNING *`,
      [resolved, resolvedBy, resolutionNotes || null, eventId]
    );
    return result.rows[0] || null;
  }
}

// ============================================================================
// VENDOR SCORECARD REPOSITORY
// ============================================================================

export class VendorScorecardRepository extends BaseRepository<VendorScorecard> {
  constructor() {
    super('vendor_scorecards', 'scorecard_id');
  }

  // Find by vendor
  async findByVendor(vendorId: string): Promise<VendorScorecard[]> {
    const result = await query<VendorScorecard>(
      `SELECT * FROM ${this.tableName} WHERE vendor_id = $1 ORDER BY review_period_end DESC`,
      [vendorId]
    );
    return result.rows;
  }

  // Find latest
  async findLatest(vendorId: string): Promise<VendorScorecard | null> {
    const result = await query<VendorScorecard>(
      `SELECT * FROM ${this.tableName}
       WHERE vendor_id = $1
       ORDER BY review_period_end DESC
       LIMIT 1`,
      [vendorId]
    );
    return result.rows[0] || null;
  }

  // Find pending approval
  async findPendingApproval(): Promise<VendorScorecard[]> {
    const result = await query<VendorScorecard>(
      `SELECT * FROM ${this.tableName} WHERE status = 'SUBMITTED' ORDER BY review_date ASC`
    );
    return result.rows;
  }

  // Find by reviewer
  async findByReviewer(reviewerId: string): Promise<VendorScorecard[]> {
    const result = await query<VendorScorecard>(
      `SELECT * FROM ${this.tableName} WHERE reviewed_by = $1 ORDER BY review_date DESC`,
      [reviewerId]
    );
    return result.rows;
  }

  // Update status
  async updateStatus(
    scorecardId: string,
    status: ScorecardStatus
  ): Promise<VendorScorecard | null> {
    return this.update(scorecardId, { status } as Partial<VendorScorecard>);
  }

  // Approve
  async approve(scorecardId: string, approvedBy: string): Promise<VendorScorecard | null> {
    const result = await query<VendorScorecard>(
      `UPDATE ${this.tableName}
       SET status = 'APPROVED',
           approved_by = $1,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE scorecard_id = $2
       RETURNING *`,
      [approvedBy, scorecardId]
    );
    return result.rows[0] || null;
  }

  // Find requiring development
  async findRequiringDevelopment(): Promise<VendorScorecard[]> {
    const result = await query<VendorScorecard>(
      `SELECT * FROM ${this.tableName}
       WHERE requires_development_plan = true
       AND (development_plan_approved IS NULL OR development_plan_approved = false)
       ORDER BY review_date DESC`
    );
    return result.rows;
  }
}

// ============================================================================
// REPOSITORY INSTANCES
// ============================================================================

export const purchaseRequisitionRepository = new PurchaseRequisitionRepository();
export const purchaseRequisitionLineRepository = new PurchaseRequisitionLineRepository();
export const requisitionApprovalRepository = new RequisitionApprovalRepository();
export const rfqHeaderRepository = new RFQHeaderRepository();
export const rfqLineRepository = new RFQLineRepository();
export const rfqVendorRepository = new RFQVendorRepository();
export const rfqVendorResponseRepository = new RFQVendorResponseRepository();
export const rfqResponseLineRepository = new RFQResponseLineRepository();
export const vendorItemCatalogRepository = new VendorItemCatalogRepository();
export const purchaseOrderHeaderRepository = new PurchaseOrderHeaderRepository();
export const purchaseOrderLineRepository = new PurchaseOrderLineRepository();
export const purchaseReceiptRepository = new PurchaseReceiptRepository();
export const purchaseReceiptLineRepository = new PurchaseReceiptLineRepository();
export const threeWayMatchRepository = new ThreeWayMatchRepository();
export const vendorPerformanceSummaryRepository = new VendorPerformanceSummaryRepository();
export const vendorPerformanceEventRepository = new VendorPerformanceEventRepository();
export const vendorScorecardRepository = new VendorScorecardRepository();
