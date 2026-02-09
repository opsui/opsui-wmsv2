/**
 * Purchasing Service
 *
 * Business logic for purchasing operations
 * Handles purchase requisitions, RFQs, purchase orders, receipts,
 * three-way matching, vendor catalogs, and vendor performance
 */

import {
  purchaseRequisitionRepository,
  purchaseRequisitionLineRepository,
  requisitionApprovalRepository,
  rfqHeaderRepository,
  rfqLineRepository,
  rfqVendorRepository,
  rfqVendorResponseRepository,
  rfqResponseLineRepository,
  vendorItemCatalogRepository,
  purchaseOrderHeaderRepository,
  purchaseOrderLineRepository,
  purchaseReceiptRepository,
  purchaseReceiptLineRepository,
  threeWayMatchRepository,
  vendorPerformanceSummaryRepository,
  vendorPerformanceEventRepository,
  vendorScorecardRepository,
} from '../repositories/PurchasingRepository';
import { query, transaction } from '../db/client';
import {
  NotFoundError,
  RequisitionStatus,
  RFQStatus,
  PurchaseOrderStatus,
  ThreeWayMatchStatus,
  VendorPerformanceRank,
  ScorecardStatus,
  QualityStatus,
} from '@opsui/shared';

// Import purchasing types from main shared package (re-exports from purchasing.ts)
import type {
  PurchaseRequisition,
  PurchaseRequisitionWithDetails,
  PurchaseRequisitionLine,
  CreatePurchaseRequisitionDTO,
  UpdatePurchaseRequisitionDTO,
  RequisitionApprovalDTO,
  RequisitionQueryFilters,
  RFQHeader,
  RFQHeaderWithDetails,
  RFQVendorResponse,
  CreateRFQDTO,
  AwardRFQDTO,
  RFQQueryFilters,
  VendorItemCatalog,
  CreateVendorCatalogItemDTO,
  PurchaseOrderHeader,
  PurchaseOrderWithDetails,
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  ConvertRequisitionToPODTO,
  PurchaseOrderQueryFilters,
  PurchaseReceipt,
  PurchaseReceiptWithDetails,
  PurchaseReceiptLine,
  CreatePurchaseReceiptDTO,
  UpdateReceiptQualityDTO,
  ThreeWayMatchDetails,
  ThreeWayMatchSummary,
  ResolveVarianceDTO,
  VendorPerformanceSummary,
  VendorPerformanceEvent,
  CreateVendorEventDTO,
  VendorScorecard,
  CreateVendorScorecardDTO,
  PurchasingDashboardMetrics,
  VendorPerformanceReport,
  SpendAnalysisReport,
} from '@opsui/shared';

// ============================================================================
// REPOSITORY INSTANCES
// ============================================================================

// Use imported repository instances instead of creating new ones
const prRepo = purchaseRequisitionRepository;
const prLineRepo = purchaseRequisitionLineRepository;
const prApprovalRepo = requisitionApprovalRepository;
const rfqRepo = rfqHeaderRepository;
const rfqLineRepo = rfqLineRepository;
const rfqVendorRepo = rfqVendorRepository;
const rfqResponseRepo = rfqVendorResponseRepository;
const rfqResponseLineRepo = rfqResponseLineRepository;
const vendorCatalogRepo = vendorItemCatalogRepository;
const poRepo = purchaseOrderHeaderRepository;
const poLineRepo = purchaseOrderLineRepository;
const receiptRepo = purchaseReceiptRepository;
const receiptLineRepo = purchaseReceiptLineRepository;
const threeWayMatchRepo = threeWayMatchRepository;
const vendorPerfRepo = vendorPerformanceSummaryRepository;
const vendorEventRepo = vendorPerformanceEventRepository;
const vendorScorecardRepo = vendorScorecardRepository;

// ============================================================================
// ID GENERATORS
// ============================================================================

function generateRequisitionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PR-${timestamp}-${random}`;
}

function generateRequisitionNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `PR-${year}-${random}`;
}

function generateRFQId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RFQ-${timestamp}-${random}`;
}

function generateRFQNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `RFQ-${year}-${random}`;
}

function generatePOId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PO-${timestamp}-${random}`;
}

function generatePONumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `PO-${year}-${random}`;
}

function generateReceiptId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${timestamp}-${random}`;
}

function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `RCP-${year}-${random}`;
}

function generateMatchId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `3WM-${timestamp}-${random}`;
}

function generateEventId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EVT-${timestamp}-${random}`;
}

function generateScorecardId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SCORE-${timestamp}-${random}`;
}

// ============================================================================
// PURCHASE REQUISITIONS
// ============================================================================

export class PurchasingService {
  // --------------------------------------------------------------------------
  // PURCHASE REQUISITIONS
  // --------------------------------------------------------------------------

  /**
   * Create a new purchase requisition
   */
  async createRequisition(
    dto: CreatePurchaseRequisitionDTO
  ): Promise<PurchaseRequisitionWithDetails> {
    return transaction(async client => {
      const requisitionId = generateRequisitionId();
      const requisitionNumber = await this.generateUniqueRequisitionNumber();

      const requisition = await prRepo.insert(
        {
          requisition_id: requisitionId,
          requisition_number: requisitionNumber,
          entity_id: dto.entity_id || null,
          requested_by: dto.requested_by,
          request_date: new Date(),
          department: dto.department,
          cost_center: dto.cost_center || null,
          job_number: dto.job_number || null,
          approval_status: RequisitionStatus.DRAFT,
          required_by: dto.required_by,
          justification: dto.justification || null,
          delivery_instructions: dto.delivery_instructions || null,
          notes: dto.notes || null,
        } as any,
        client
      );

      // Create lines
      const lines = await Promise.all(
        dto.lines.map((line, index) =>
          prLineRepo.insert(
            {
              line_id: `PRL-${Date.now().toString(36).toUpperCase()}-${index}`,
              requisition_id: requisitionId,
              line_number: index + 1,
              sku: line.sku || null,
              item_description: line.item_description,
              quantity: line.quantity,
              uom: line.uom || 'EA',
              suggested_vendor_id: line.suggested_vendor_id || null,
              suggested_vendor_item_code: line.suggested_vendor_item_code || null,
              estimated_unit_cost: line.estimated_unit_cost || null,
              estimated_total_cost: line.estimated_unit_cost
                ? line.quantity * line.estimated_unit_cost
                : null,
              notes: line.notes || null,
              attachment_url: line.attachment_url || null,
            } as any,
            client
          )
        )
      );

      return {
        ...requisition,
        requester: {
          user_id: dto.requested_by,
          email: '',
          first_name: '',
          last_name: '',
        },
        lines,
        approvals: [],
        total_estimated_cost: lines.reduce(
          (sum, line) => sum + (line.estimated_total_cost || 0),
          0
        ),
      };
    });
  }

  /**
   * Generate unique requisition number
   */
  private async generateUniqueRequisitionNumber(): Promise<string> {
    let number: string;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      number = generateRequisitionNumber();
      const existing = await prRepo.findByNumber(number);
      exists = !!existing;
      attempts++;
    }

    return number!;
  }

  /**
   * Submit requisition for approval
   */
  async submitRequisition(requisitionId: string): Promise<PurchaseRequisition> {
    const requisition = await prRepo.findByIdOrThrow(requisitionId);

    if (requisition.approval_status !== RequisitionStatus.DRAFT) {
      throw new Error('Only draft requisitions can be submitted');
    }

    const updated = await prRepo.update(requisitionId, {
      approval_status: RequisitionStatus.SUBMITTED,
    } as any);

    return updated!;
  }

  /**
   * Approve or reject requisition
   */
  async processRequisitionApproval(dto: RequisitionApprovalDTO): Promise<PurchaseRequisition> {
    const requisition = await prRepo.findByIdOrThrow(dto.requisition_id);

    if (dto.approval_status === 'APPROVED') {
      const updated = await prRepo.update(dto.requisition_id, {
        approval_status: RequisitionStatus.APPROVED,
        approved_by: null, // Would be set from auth context
        approved_at: new Date(),
      } as any);
      return updated!;
    } else {
      const updated = await prRepo.update(dto.requisition_id, {
        approval_status: RequisitionStatus.REJECTED,
        rejection_reason: dto.rejection_reason || null,
      } as any);
      return updated!;
    }
  }

  /**
   * Convert requisition to purchase order
   */
  async convertRequisitionToPO(dto: ConvertRequisitionToPODTO): Promise<PurchaseOrderWithDetails> {
    const requisition = await prRepo.findByIdWithDetails(dto.requisition_id);
    if (!requisition) {
      throw new NotFoundError('purchase_requisitions', dto.requisition_id);
    }

    if (requisition.approval_status !== RequisitionStatus.APPROVED) {
      throw new Error('Only approved requisitions can be converted to PO');
    }

    // Create PO from requisition lines
    const poDTO: CreatePurchaseOrderDTO = {
      entity_id: requisition.entity_id || undefined,
      vendor_id: dto.vendor_id || requisition.lines[0]?.suggested_vendor_id || '',
      source_type: 'REQUISITION',
      source_id: requisition.requisition_id,
      requested_delivery_date: dto.requested_delivery_date,
      payment_terms: dto.payment_terms,
      freight_terms: dto.freight_terms,
      notes: dto.notes,
      lines: requisition.lines.map(line => ({
        sku: line.sku || undefined,
        item_description: line.item_description,
        vendor_sku: line.suggested_vendor_item_code || undefined,
        quantity_ordered: line.quantity,
        unit_price: line.estimated_unit_cost || 0,
        job_number: requisition.job_number || undefined,
      })),
    };

    const po = await this.createPurchaseOrder(poDTO);

    // Update requisition
    await prRepo.update(requisition.requisition_id, {
      converted_to_po_id: po.po_id,
      approval_status: RequisitionStatus.CONVERTED_TO_PO,
      converted_at: new Date(),
    } as any);

    return po;
  }

  /**
   * Query requisitions with filters
   */
  async queryRequisitions(filters: RequisitionQueryFilters): Promise<PurchaseRequisition[]> {
    return prRepo.queryWithFilters(filters);
  }

  /**
   * Get requisition with details
   */
  async getRequisitionWithDetails(
    requisitionId: string
  ): Promise<PurchaseRequisitionWithDetails | null> {
    return prRepo.findByIdWithDetails(requisitionId);
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<PurchaseRequisitionWithDetails[]> {
    return prRepo.findPendingApprovals();
  }

  // --------------------------------------------------------------------------
  // RFQ MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Create RFQ from requisition or manually
   */
  async createRFQ(dto: CreateRFQDTO): Promise<RFQHeaderWithDetails> {
    return transaction(async client => {
      const rfqId = generateRFQId();
      const rfqNumber = await this.generateUniqueRFQNumber();

      const rfq = await rfqRepo.insert(
        {
          rfq_id: rfqId,
          rfq_number: rfqNumber,
          entity_id: dto.entity_id || null,
          source_type: dto.source_type,
          source_id: dto.source_id || null,
          source_line_id: null,
          created_date: new Date(),
          quote_due_date: dto.quote_due_date,
          response_by_date: dto.response_by_date,
          rfq_status: RFQStatus.DRAFT,
          created_by: '', // Would be from auth context
          delivery_location: dto.delivery_location || null,
          payment_terms: dto.payment_terms || null,
          freight_terms: dto.freight_terms || null,
          incoterms: dto.incoterms || null,
          notes: dto.notes || null,
          special_instructions: dto.special_instructions || null,
          attachments: null,
        } as any,
        client
      );

      // Create lines
      const lines = await Promise.all(
        dto.lines.map((line, index) =>
          rfqLineRepo.insert(
            {
              line_id: `RFQL-${Date.now().toString(36).toUpperCase()}-${index}`,
              rfq_id: rfqId,
              line_number: index + 1,
              sku: line.sku || null,
              item_description: line.item_description,
              quantity: line.quantity,
              uom: line.uom || 'EA',
              specifications: line.specifications || null,
              technical_requirements: line.technical_requirements || null,
              quality_requirements: line.quality_requirements || null,
              attachment_url: line.attachment_url || null,
              budgeted_unit_cost: line.budgeted_unit_cost || null,
              budgeted_total_cost:
                line.budgeted_unit_cost && line.quantity
                  ? line.quantity * line.budgeted_unit_cost
                  : null,
            } as any,
            client
          )
        )
      );

      // Add vendors
      const vendors = await Promise.all(
        dto.vendor_ids.map((vendorId, index) =>
          rfqVendorRepo.insert(
            {
              rfq_vendor_id: `RFQV-${Date.now().toString(36).toUpperCase()}-${index}`,
              rfq_id: rfqId,
              vendor_id: vendorId,
              vendor_contact_id: null,
              status: 'PENDING' as any,
            } as any,
            client
          )
        )
      );

      return {
        ...rfq,
        lines,
        vendors,
        response_count: 0,
        lowest_bid_amount: null,
      };
    });
  }

  /**
   * Generate unique RFQ number
   */
  private async generateUniqueRFQNumber(): Promise<string> {
    let number: string;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      number = generateRFQNumber();
      const existing = await rfqRepo.findByNumber(number);
      exists = !!existing;
      attempts++;
    }

    return number!;
  }

  /**
   * Send RFQ to vendors
   */
  async sendRFQ(rfqId: string): Promise<RFQHeader> {
    const rfq = await rfqRepo.findByIdOrThrow(rfqId);

    if (rfq.rfq_status !== RFQStatus.DRAFT) {
      throw new Error('Only draft RFQs can be sent');
    }

    // Update RFQ status
    const updated = await rfqRepo.updateStatus(rfqId, RFQStatus.SENT);

    // Update vendor statuses
    const vendors = await rfqVendorRepo.findByRFQ(rfqId);
    await Promise.all(
      vendors.map(v =>
        rfqVendorRepo.update(v.rfq_vendor_id, {
          status: 'PENDING' as any,
          sent_at: new Date(),
          email_sent: true,
          email_sent_at: new Date(),
          email_count: (v.email_count || 0) + 1,
        } as any)
      )
    );

    return updated!;
  }

  /**
   * Record vendor response to RFQ
   */
  async recordVendorResponse(
    rfqVendorId: string,
    response: {
      quote_number?: string;
      quote_valid_until?: Date;
      contact_person?: string;
      contact_email?: string;
      contact_phone?: string;
      total_amount: number;
      total_tax: number;
      total_freight: number;
      payment_terms?: string;
      delivery_terms?: string;
      estimated_delivery_date?: Date;
      lead_time_days?: number;
      quote_document_url?: string;
      notes?: string;
      lines: Array<{
        rfq_line_id: string;
        vendor_item_code?: string;
        item_description: string;
        quantity: number;
        unit_price: number;
        discount_percent?: number;
        lead_time_days?: number;
        notes?: string;
      }>;
    }
  ): Promise<RFQVendorResponse> {
    const rfqVendor = await rfqVendorRepo.findByIdOrThrow(rfqVendorId);

    const responseId = `RFQR-${Date.now().toString(36).toUpperCase()}`;
    const responseData = await rfqResponseRepo.insert({
      response_id: responseId,
      rfq_vendor_id: rfqVendorId,
      rfq_id: rfqVendor.rfq_id,
      vendor_id: rfqVendor.vendor_id,
      response_date: new Date(),
      quote_number: response.quote_number || null,
      quote_valid_until: response.quote_valid_until || null,
      contact_person: response.contact_person || null,
      contact_email: response.contact_email || null,
      contact_phone: response.contact_phone || null,
      total_amount: response.total_amount,
      total_tax: response.total_tax,
      total_freight: response.total_freight,
      grand_total: response.total_amount + response.total_tax + response.total_freight,
      payment_terms: response.payment_terms || null,
      delivery_terms: response.delivery_terms || null,
      estimated_delivery_date: response.estimated_delivery_date || null,
      lead_time_days: response.lead_time_days || null,
      quote_document_url: response.quote_document_url || null,
      additional_attachments: null,
      notes: response.notes || null,
      terms_conditions: null,
    } as any);

    // Create response lines
    await Promise.all(
      response.lines.map((line, index) =>
        rfqResponseLineRepo.insert({
          response_line_id: `RFQRL-${Date.now().toString(36).toUpperCase()}-${index}`,
          response_id: responseId,
          rfq_line_id: line.rfq_line_id,
          line_number: index + 1,
          vendor_item_code: line.vendor_item_code || null,
          item_description: line.item_description,
          quantity: line.quantity,
          uom: null,
          unit_price: line.unit_price,
          line_total: line.quantity * line.unit_price,
          discount_percent: line.discount_percent || 0,
          discount_amount: line.discount_percent
            ? (line.quantity * line.unit_price * line.discount_percent) / 100
            : 0,
          net_amount:
            line.quantity * line.unit_price -
            (line.discount_percent
              ? (line.quantity * line.unit_price * line.discount_percent) / 100
              : 0),
          lead_time_days: line.lead_time_days || null,
          availability_date: null,
          notes: line.notes || null,
          substitution_notes: null,
        } as any)
      )
    );

    // Update vendor status
    await rfqVendorRepo.update(rfqVendorId, {
      status: 'RECEIVED' as any,
      response_received_at: new Date(),
    } as any);

    return responseData;
  }

  /**
   * Award RFQ to vendor and optionally convert to PO
   */
  async awardRFQ(dto: AwardRFQDTO): Promise<{ rfq: RFQHeader; po?: PurchaseOrderWithDetails }> {
    const rfq = await rfqRepo.findByIdOrThrow(dto.rfq_id);
    const rfqVendor = await rfqVendorRepo.findByIdOrThrow(dto.rfq_vendor_id);
    const response = await rfqResponseRepo.findOneByColumn('rfq_vendor_id', dto.rfq_vendor_id);

    if (!response) {
      throw new Error('No response found for this vendor');
    }

    // Update RFQ
    await rfqRepo.update(dto.rfq_id, {
      rfq_status: RFQStatus.AWARDED,
      awarded_to_vendor_id: rfqVendor.vendor_id,
      awarded_at: new Date(),
      awarded_amount: dto.awarded_amount,
      awarded_notes: dto.awarded_notes || null,
    } as any);

    // Update vendor
    await rfqVendorRepo.update(dto.rfq_vendor_id, {
      is_awarded: true,
      awarded_at: new Date(),
      awarded_amount: dto.awarded_amount,
    } as any);

    let po: PurchaseOrderWithDetails | undefined;

    if (dto.convert_to_po) {
      // Create PO from RFQ response
      const responseLines = await rfqResponseLineRepo.findByResponse(response.response_id);

      const poDTO: CreatePurchaseOrderDTO = {
        entity_id: rfq.entity_id || undefined,
        vendor_id: response.vendor_id,
        source_type: 'RFQ',
        source_id: rfq.rfq_id,
        rfq_response_id: response.response_id,
        requested_delivery_date: response.estimated_delivery_date || rfq.response_by_date,
        payment_terms: response.payment_terms || undefined,
        freight_terms: rfq.freight_terms || undefined,
        incoterms: rfq.incoterms || undefined,
        currency: 'USD',
        notes: rfq.notes || undefined,
        lines: responseLines.map(line => ({
          sku: undefined,
          item_description: line.item_description,
          vendor_sku: line.vendor_item_code || undefined,
          quantity_ordered: line.quantity,
          unit_price: line.net_amount / line.quantity,
          notes: line.notes || undefined,
        })),
      };

      po = await this.createPurchaseOrder(poDTO);
    }

    return {
      rfq: (await rfqRepo.findByIdWithDetails(dto.rfq_id))!,
      po,
    };
  }

  /**
   * Get RFQ with details
   */
  async getRFQWithDetails(rfqId: string): Promise<RFQHeaderWithDetails | null> {
    return rfqRepo.findByIdWithDetails(rfqId);
  }

  /**
   * Get RFQs awaiting response
   */
  async getRFQsAwaitingResponse(): Promise<RFQHeaderWithDetails[]> {
    return rfqRepo.findPendingResponse();
  }

  // --------------------------------------------------------------------------
  // VENDOR CATALOGS
  // --------------------------------------------------------------------------

  /**
   * Add item to vendor catalog
   */
  async addVendorCatalogItem(dto: CreateVendorCatalogItemDTO): Promise<VendorItemCatalog> {
    // Check if already exists
    const existing = await vendorCatalogRepo.findByVendorSKU(dto.vendor_id, dto.vendor_sku);
    if (existing) {
      throw new Error('Item already exists in vendor catalog');
    }

    return vendorCatalogRepo.insert({
      catalog_id: `VIC-${Date.now().toString(36).toUpperCase()}`,
      vendor_id: dto.vendor_id,
      entity_id: dto.entity_id || null,
      internal_sku: dto.internal_sku || null,
      vendor_sku: dto.vendor_sku,
      item_name: dto.item_name || null,
      item_description: null,
      list_price: dto.list_price || null,
      contract_price: dto.contract_price || null,
      minimum_order_quantity: dto.minimum_order_quantity || 1,
      price_break_quantity: dto.price_break_quantity || null,
      price_break_price: dto.price_break_price || null,
      standard_lead_time_days: dto.standard_lead_time_days || null,
      current_lead_time_days: null,
      is_preferred: dto.is_preferred || false,
      is_active: true,
      last_ordered_date: null,
      last_price_update: new Date(),
      vendor_category: dto.vendor_category || null,
      internal_category: dto.internal_category || null,
      uom: dto.uom || null,
      weight: null,
      dimensions: null,
      product_url: null,
      spec_sheet_url: null,
    } as any);
  }

  /**
   * Get vendor catalog
   */
  async getVendorCatalog(vendorId: string, activeOnly = true): Promise<VendorItemCatalog[]> {
    return vendorCatalogRepo.findByVendor(vendorId, activeOnly);
  }

  /**
   * Find vendors for SKU
   */
  async findVendorsForSKU(sku: string): Promise<VendorItemCatalog[]> {
    return vendorCatalogRepo.findByInternalSKU(sku);
  }

  // --------------------------------------------------------------------------
  // PURCHASE ORDERS
  // --------------------------------------------------------------------------

  /**
   * Create purchase order
   */
  async createPurchaseOrder(dto: CreatePurchaseOrderDTO): Promise<PurchaseOrderWithDetails> {
    return transaction(async client => {
      const poId = generatePOId();
      const poNumber = await this.generateUniquePONumber();

      // Calculate totals
      const subtotal = dto.lines.reduce(
        (sum, line) => sum + line.quantity_ordered * line.unit_price,
        0
      );

      const po = await poRepo.insert(
        {
          po_id: poId,
          po_number: poNumber,
          entity_id: dto.entity_id || null,
          vendor_id: dto.vendor_id,
          vendor_name: '', // Would fetch from vendors table
          vendor_contact_id: dto.vendor_contact_id || null,
          vendor_address: null,
          source_type: dto.source_type || null,
          source_id: dto.source_id || null,
          rfq_response_id: dto.rfq_response_id || null,
          order_date: new Date(),
          requested_delivery_date: dto.requested_delivery_date,
          promised_delivery_date: null,
          actual_delivery_date: null,
          po_status: PurchaseOrderStatus.DRAFT,
          three_way_match_status: ThreeWayMatchStatus.PENDING_RECEIPT,
          subtotal,
          tax_amount: 0,
          freight_amount: 0,
          other_charges: 0,
          total_amount: subtotal,
          quantity_ordered: dto.lines.reduce((sum, line) => sum + line.quantity_ordered, 0),
          quantity_received: 0,
          quantity_invoiced: 0,
          amount_invoiced: 0,
          amount_paid: 0,
          payment_terms: dto.payment_terms || null,
          payment_terms_days: 30,
          freight_terms: dto.freight_terms || null,
          incoterms: dto.incoterms || null,
          currency: dto.currency || 'USD',
          exchange_rate: 1.0,
          approved_by: null,
          approved_at: null,
          created_by: '', // From auth context
          notes: dto.notes || null,
          shipping_instructions: null,
          vendor_notes: dto.vendor_notes || null,
          internal_notes: null,
          attachments: null,
        } as any,
        client
      );

      // Create lines
      const lines = await Promise.all(
        dto.lines.map((line, index) =>
          poLineRepo.insert(
            {
              pol_id: `POL-${Date.now().toString(36).toUpperCase()}-${index}`,
              po_id: poId,
              line_number: index + 1,
              sku: line.sku || null,
              item_description: line.item_description,
              vendor_sku: line.vendor_sku || null,
              quantity_ordered: line.quantity_ordered,
              quantity_received: 0,
              quantity_invoiced: 0,
              quantity_rejected: 0,
              unit_price: line.unit_price,
              line_total: line.quantity_ordered * line.unit_price,
              tax_amount: 0,
              freight_amount: 0,
              total_amount: line.quantity_ordered * line.unit_price,
              amount_received: 0,
              amount_invoiced: null,
              three_way_match_status: ThreeWayMatchStatus.PENDING_RECEIPT,
              promised_date: line.promised_date || null,
              requested_date: line.requested_date || null,
              notes: line.notes || null,
              job_number: line.job_number || null,
            } as any,
            client
          )
        )
      );

      return {
        ...po,
        lines,
      };
    });
  }

  /**
   * Generate unique PO number
   */
  private async generateUniquePONumber(): Promise<string> {
    let number: string;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      number = generatePONumber();
      const existing = await poRepo.findByNumber(number);
      exists = !!existing;
      attempts++;
    }

    return number!;
  }

  /**
   * Submit PO for approval
   */
  async submitPurchaseOrder(poId: string): Promise<PurchaseOrderHeader> {
    const po = await poRepo.findByIdOrThrow(poId);

    if (po.po_status !== PurchaseOrderStatus.DRAFT) {
      throw new Error('Only draft POs can be submitted');
    }

    const updated = await poRepo.updateStatus(poId, PurchaseOrderStatus.SUBMITTED);
    return updated!;
  }

  /**
   * Approve PO
   */
  async approvePurchaseOrder(poId: string, approvedBy: string): Promise<PurchaseOrderHeader> {
    const po = await poRepo.findByIdOrThrow(poId);

    if (po.po_status !== PurchaseOrderStatus.SUBMITTED) {
      throw new Error('Only submitted POs can be approved');
    }

    const updated = await poRepo.update(poId, {
      po_status: PurchaseOrderStatus.ACKNOWLEDGED,
      approved_by: approvedBy,
      approved_at: new Date(),
    } as any);

    return updated!;
  }

  /**
   * Get PO with details
   */
  async getPurchaseOrderWithDetails(poId: string): Promise<PurchaseOrderWithDetails | null> {
    return poRepo.findByIdWithDetails(poId);
  }

  /**
   * Get open POs
   */
  async getOpenPurchaseOrders(): Promise<PurchaseOrderHeader[]> {
    return poRepo.findOpenOrders();
  }

  // --------------------------------------------------------------------------
  // PURCHASE RECEIPTS
  // --------------------------------------------------------------------------

  /**
   * Create purchase receipt
   */
  async createPurchaseReceipt(dto: CreatePurchaseReceiptDTO): Promise<PurchaseReceiptWithDetails> {
    return transaction(async client => {
      const receiptId = generateReceiptId();
      const receiptNumber = await this.generateUniqueReceiptNumber();

      // Get PO details
      const po = dto.po_id ? await poRepo.findById(dto.po_id) : null;

      const receipt = await receiptRepo.insert(
        {
          receipt_id: receiptId,
          receipt_number: receiptNumber,
          po_id: dto.po_id || null,
          entity_id: dto.entity_id || null,
          vendor_id: po?.vendor_id || '',
          vendor_name: po?.vendor_name || '',
          vendor_document_number: dto.vendor_document_number || null,
          receipt_date: dto.receipt_date || new Date(),
          received_by: dto.received_by,
          warehouse_location: dto.warehouse_location || null,
          dock_door: dto.dock_door || null,
          receipt_status: 'OPEN' as any,
          notes: dto.notes || null,
          carrier: dto.carrier || null,
          tracking_number: dto.tracking_number || null,
          bill_of_lading: dto.bill_of_lading || null,
        } as any,
        client
      );

      // Create lines
      const lines = await Promise.all(
        dto.lines.map((line, index) =>
          receiptLineRepo.insert(
            {
              receipt_line_id: `RCP-L-${Date.now().toString(36).toUpperCase()}-${index}`,
              receipt_id: receiptId,
              po_line_id: line.po_line_id || null,
              line_number: index + 1,
              sku: line.sku,
              item_description: line.item_description || null,
              vendor_sku: line.vendor_sku || null,
              quantity_ordered: null,
              quantity_shipped: line.quantity_shipped,
              quantity_received: line.quantity_received,
              quantity_rejected: line.quantity_rejected || 0,
              uom: line.uom || null,
              conversion_factor: line.conversion_factor || 1.0,
              lot_number: line.lot_number || null,
              expiration_date: line.expiration_date || null,
              serial_numbers: line.serial_numbers ? { items: line.serial_numbers } : null,
              quality_status: 'PENDING' as any,
              inspected_by: null,
              inspected_at: null,
              putaway_location: null,
              putaway_at: null,
              putaway_by: null,
              notes: line.notes || null,
            } as any,
            client
          )
        )
      );

      // Update PO quantities
      if (dto.po_id) {
        await Promise.all(
          dto.lines.map(async line => {
            if (line.po_line_id) {
              const poLine = await poLineRepo.findById(line.po_line_id);
              if (poLine) {
                await poLineRepo.updateReceivedQuantity(
                  line.po_line_id,
                  poLine.quantity_received + line.quantity_received
                );
              }
            }
          })
        );

        // Update PO header
        const poLines = await poLineRepo.findByPO(dto.po_id);
        const totalReceived = poLines.reduce((sum, l) => sum + l.quantity_received, 0);
        const totalOrdered = poLines.reduce((sum, l) => sum + l.quantity_ordered, 0);

        if (totalReceived >= totalOrdered) {
          await poRepo.updateStatus(dto.po_id, PurchaseOrderStatus.RECEIVED);
        } else if (totalReceived > 0) {
          await poRepo.updateStatus(dto.po_id, PurchaseOrderStatus.PARTIAL);
        }
      }

      return {
        ...receipt,
        lines,
      };
    });
  }

  /**
   * Generate unique receipt number
   */
  private async generateUniqueReceiptNumber(): Promise<string> {
    let number: string;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      number = generateReceiptNumber();
      const existing = await receiptRepo.findByNumber(number);
      exists = !!existing;
      attempts++;
    }

    return number!;
  }

  /**
   * Update receipt line quality
   */
  async updateReceiptQuality(dto: UpdateReceiptQualityDTO): Promise<PurchaseReceiptLine> {
    const receiptLine = await receiptLineRepo.findByIdOrThrow(dto.receipt_line_id);

    // Update quality status
    const updated = await receiptLineRepo.update(dto.receipt_line_id, {
      quality_status: dto.quality_status,
      quantity_rejected: dto.quantity_rejected ?? receiptLine.quantity_rejected,
      putaway_location: dto.putaway_location || null,
      notes: dto.notes || receiptLine.notes,
    } as any);

    // If quality failed, create vendor performance event
    if (dto.quality_status === 'FAILED' && receiptLine.po_line_id) {
      const poLine = await poLineRepo.findById(receiptLine.po_line_id);
      if (poLine) {
        const po = await poRepo.findById(poLine.po_id);
        if (po) {
          await this.createVendorEvent({
            vendor_id: po.vendor_id,
            event_type: 'QUALITY_FAILURE',
            event_category: 'QUALITY',
            reference_type: 'RECEIPT',
            reference_id: receiptLine.receipt_id,
            event_date: new Date(),
            event_description: `Quality inspection failed for ${receiptLine.sku}`,
            severity: 'HIGH',
            impact_amount: dto.quantity_rejected
              ? dto.quantity_rejected * poLine.unit_price
              : receiptLine.quantity_rejected * poLine.unit_price,
            score_impact: -2,
            reported_by: '', // From auth context
          });
        }
      }
    }

    return updated!;
  }

  /**
   * Get receipt with details
   */
  async getReceiptWithDetails(receiptId: string): Promise<PurchaseReceiptWithDetails | null> {
    return receiptRepo.findByIdWithDetails(receiptId);
  }

  // --------------------------------------------------------------------------
  // THREE-WAY MATCHING
  // --------------------------------------------------------------------------

  /**
   * Get three-way match summary for PO
   */
  async getThreeWayMatchSummary(poId: string): Promise<ThreeWayMatchSummary> {
    const po = await poRepo.findByIdOrThrow(poId);
    const matches = await threeWayMatchRepo.findByPO(poId);

    const varianceLines = matches.filter(
      m => !m.is_match_ok || Math.abs(m.variance_percent || 0) > (m.tolerance_percent || 5)
    );

    return {
      po_id: po.po_id,
      po_number: po.po_number,
      vendor_name: po.vendor_name,
      total_amount: po.total_amount,
      quantity_ordered: po.quantity_ordered,
      quantity_received: po.quantity_received,
      quantity_invoiced: po.quantity_invoiced,
      amount_invoiced: po.amount_invoiced,
      match_status: po.three_way_match_status,
      variance_count: varianceLines.length,
      total_variance: varianceLines.reduce((sum, m) => sum + (m.amount_variance || 0), 0),
      lines_with_variance: varianceLines,
    };
  }

  /**
   * Resolve variance
   */
  async resolveVariance(dto: ResolveVarianceDTO): Promise<ThreeWayMatchDetails> {
    const resolved = await threeWayMatchRepo.resolveVariance(
      dto.match_id,
      dto.variance_resolved,
      dto.resolution_notes
    );

    if (!resolved) {
      throw new NotFoundError('three_way_match_details', dto.match_id);
    }

    // Update resolver info
    const updated = await threeWayMatchRepo.update(dto.match_id, {
      resolved_by: dto.resolved_by,
      resolved_at: new Date(),
    } as any);

    return updated!;
  }

  /**
   * Get match exceptions
   */
  async getMatchExceptions(): Promise<ThreeWayMatchDetails[]> {
    return threeWayMatchRepo.findExceptions();
  }

  // --------------------------------------------------------------------------
  // VENDOR PERFORMANCE
  // --------------------------------------------------------------------------

  /**
   * Create vendor performance event
   */
  async createVendorEvent(dto: CreateVendorEventDTO): Promise<VendorPerformanceEvent> {
    return vendorEventRepo.insert({
      event_id: generateEventId(),
      vendor_id: dto.vendor_id,
      entity_id: dto.entity_id || null,
      event_type: dto.event_type,
      event_category: dto.event_category,
      reference_type: dto.reference_type || null,
      reference_id: dto.reference_id || null,
      reference_line_id: null,
      event_date: dto.event_date,
      event_description: dto.event_description,
      severity: dto.severity,
      impact_amount: dto.impact_amount || null,
      score_impact: dto.score_impact,
      rating_after: null,
      resolved: false,
      resolved_by: null,
      resolved_at: null,
      resolution_notes: null,
      credit_issued: null,
      reported_by: dto.reported_by,
      acknowledged_by_vendor: false,
      vendor_response: null,
    } as any);
  }

  /**
   * Get vendor performance summary
   */
  async getVendorPerformance(vendorId: string): Promise<VendorPerformanceSummary | null> {
    return vendorPerfRepo.findCurrentPeriod(vendorId);
  }

  /**
   * Get vendor ranking
   */
  async getVendorRanking(limit = 50): Promise<VendorPerformanceSummary[]> {
    return vendorPerfRepo.getVendorRanking(limit);
  }

  /**
   * Get vendors at risk
   */
  async getVendorsAtRisk(): Promise<VendorPerformanceSummary[]> {
    return vendorPerfRepo.findVendorsAtRisk();
  }

  /**
   * Create vendor scorecard
   */
  async createVendorScorecard(dto: CreateVendorScorecardDTO): Promise<VendorScorecard> {
    // Calculate overall score
    const scores = [
      dto.delivery_score,
      dto.quality_score,
      dto.cost_score,
      dto.service_score,
      dto.communication_score,
      dto.documentation_score,
    ].filter((s): s is number => s !== undefined);

    const overallScore =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;

    let overallRating: VendorPerformanceRank | null = null;
    if (overallScore !== null) {
      if (overallScore >= 4.5) overallRating = VendorPerformanceRank.EXCELLENT;
      else if (overallScore >= 3.5) overallRating = VendorPerformanceRank.GOOD;
      else if (overallScore >= 2.5) overallRating = VendorPerformanceRank.AVERAGE;
      else if (overallScore >= 1.5) overallRating = VendorPerformanceRank.NEEDS_IMPROVEMENT;
      else overallRating = VendorPerformanceRank.UNSATISFACTORY;
    }

    return vendorScorecardRepo.insert({
      scorecard_id: generateScorecardId(),
      vendor_id: dto.vendor_id,
      entity_id: dto.entity_id || null,
      review_period_start: dto.review_period_start,
      review_period_end: dto.review_period_end,
      review_date: dto.review_date || new Date(),
      reviewed_by: dto.reviewed_by,
      approved_by: null,
      approved_at: null,
      delivery_score: dto.delivery_score || null,
      quality_score: dto.quality_score || null,
      cost_score: dto.cost_score || null,
      service_score: dto.service_score || null,
      communication_score: dto.communication_score || null,
      documentation_score: dto.documentation_score || null,
      overall_score: overallScore,
      overall_rating: overallRating,
      status: ScorecardStatus.DRAFT,
      strengths: null,
      weaknesses: null,
      improvement_required: null,
      corrective_actions: null,
      follow_up_date: dto.follow_up_date || null,
      requires_development_plan: dto.requires_development_plan || false,
      development_plan: dto.development_plan || null,
      development_plan_approved: false,
      notes: dto.notes || null,
    } as any);
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(entityId?: string): Promise<PurchasingDashboardMetrics> {
    const entityFilter = entityId ? `AND entity_id = '${entityId}'` : '';

    const [pendingRequisitions, openOrders, activeRfqs, matchExceptions, vendorsAtRisk] =
      await Promise.all([
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM purchase_requisitions WHERE approval_status IN ('SUBMITTED', 'PENDING_APPROVAL') ${entityFilter}`
        ),
        query<{ count: string; total_amount: string }>(
          `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_amount FROM purchase_order_headers WHERE po_status IN ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED') ${entityFilter}`
        ),
        query<{ count: string }>(
          `SELECT COUNT(DISTINCT rfq_id) as count FROM rfq_headers WHERE rfq_status IN ('SENT', 'RESPONSES_PENDING') ${entityFilter}`
        ),
        query<{ count: string }>(
          `SELECT COUNT(DISTINCT po_id) as count FROM three_way_match_details WHERE is_match_ok = false OR ABS(variance_percent) > tolerance_percent`
        ),
        query<{ rows: VendorPerformanceSummary[] }>(
          `SELECT * FROM vendor_performance_summary WHERE (overall_rating <= 2.5 OR overall_rank = 'CRITICAL') ${entityFilter} ORDER BY overall_rating ASC LIMIT 10`
        ),
      ]);

    return {
      pending_requisitions: parseInt(pendingRequisitions.rows[0].count, 10),
      requisitions_awaiting_approval: parseInt(pendingRequisitions.rows[0].count, 10),
      approved_requisitions_this_month: 0, // Would calculate from date range
      active_rfqs: parseInt(activeRfqs.rows[0].count, 10),
      rfqs_awaiting_response: parseInt(activeRfqs.rows[0].count, 10),
      rfqs_awarded_this_month: 0,
      open_orders: parseInt(openOrders.rows[0].count, 10),
      orders_past_due: 0, // Would calculate based on delivery dates
      orders_ready_to_pay: 0,
      total_open_order_value: parseFloat(openOrders.rows[0].total_amount),
      pending_receipts: 0,
      receipts_today: 0,
      receipts_this_month: 0,
      match_exceptions: parseInt(matchExceptions.rows[0].count, 10),
      pending_invoices: 0,
      matched_this_month: 0,
      vendors_at_risk: vendorsAtRisk.rows.length,
      new_vendors_this_month: 0,
      top_performers: await vendorPerfRepo.findTopPerformers(5),
    };
  }
}

// Export singleton instance
export const purchasingService = new PurchasingService();
