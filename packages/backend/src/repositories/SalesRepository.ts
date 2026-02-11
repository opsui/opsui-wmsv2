/**
 * Sales & CRM Repository
 *
 * Data access layer for customer relationship management and sales functionality
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import {
  Customer,
  Lead,
  Opportunity,
  Quote,
  QuoteLineItem,
  CustomerInteraction,
  CustomerStatus,
  LeadStatus,
  OpportunityStage,
  QuoteStatus,
} from '@opsui/shared';

export class SalesRepository {
  // ========================================================================
  // CUSTOMERS
  // ========================================================================

  async createCustomer(
    customer: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt' | 'lastContactDate'>
  ): Promise<Customer> {
    const client = await getPool();

    // Generate customer ID and number
    const customerId = `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const customerNumber = `CUST-${Date.now()}`;

    const result = await client.query(
      `INSERT INTO customers
        (customer_id, customer_number, company_name, contact_name, email, phone,
         billing_address, shipping_address, status, tax_id, payment_terms,
         credit_limit, account_balance, notes, assigned_to, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13, $14, $15, NOW())
       RETURNING *`,
      [
        customerId,
        customerNumber,
        customer.companyName,
        customer.contactName || null,
        customer.email || null,
        customer.phone || null,
        JSON.stringify(customer.billingAddress),
        customer.shippingAddress ? JSON.stringify(customer.shippingAddress) : null,
        customer.status,
        customer.taxId || null,
        customer.paymentTerms || null,
        customer.creditLimit || null,
        customer.notes || null,
        customer.assignedTo || null,
        customer.createdBy,
      ]
    );

    logger.info('Customer created', { customerId, customerNumber });
    return this.mapRowToCustomer(result.rows[0]);
  }

  async findCustomerById(customerId: string): Promise<Customer | null> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM customers WHERE customer_id = $1`, [
      customerId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async findCustomerByNumber(customerNumber: string): Promise<Customer | null> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM customers WHERE customer_number = $1`, [
      customerNumber,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCustomer(result.rows[0]);
  }

  async findAllCustomers(filters?: {
    status?: CustomerStatus;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ customers: Customer[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.assignedTo) {
      conditions.push(`assigned_to = $${paramCount}`);
      params.push(filters.assignedTo);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM customers ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const customers = result.rows.map(row => this.mapRowToCustomer(row));

    return { customers, total };
  }

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<Customer | null> {
    const client = await getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.companyName !== undefined) {
      fields.push(`company_name = $${paramCount}`);
      values.push(updates.companyName);
      paramCount++;
    }

    if (updates.contactName !== undefined) {
      fields.push(`contact_name = $${paramCount}`);
      values.push(updates.contactName);
      paramCount++;
    }

    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount}`);
      values.push(updates.email);
      paramCount++;
    }

    if (updates.phone !== undefined) {
      fields.push(`phone = $${paramCount}`);
      values.push(updates.phone);
      paramCount++;
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount}`);
      values.push(updates.status);
      paramCount++;
    }

    if (updates.notes !== undefined) {
      fields.push(`notes = $${paramCount}`);
      values.push(updates.notes);
      paramCount++;
    }

    if (updates.assignedTo !== undefined) {
      fields.push(`assigned_to = $${paramCount}`);
      values.push(updates.assignedTo);
      paramCount++;
    }

    if (updates.updatedBy !== undefined) {
      fields.push(`updated_by = $${paramCount}`);
      values.push(updates.updatedBy);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(customerId);
    paramCount++;

    if (fields.length === 1) {
      return await this.findCustomerById(customerId);
    }

    const result = await client.query(
      `UPDATE customers SET ${fields.join(', ')} WHERE customer_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Customer updated', { customerId });
    return this.mapRowToCustomer(result.rows[0]);
  }

  // ========================================================================
  // LEADS
  // ========================================================================

  async createLead(
    lead: Omit<Lead, 'leadId' | 'createdAt' | 'updatedAt' | 'lastContactDate' | 'nextFollowUpDate'>
  ): Promise<Lead> {
    const client = await getPool();

    const leadId = `LEAD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(
      `INSERT INTO leads
        (lead_id, customer_name, contact_name, email, phone, company, status, priority,
         estimated_value, source, description, assigned_to, expected_close_date,
         created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
       RETURNING *`,
      [
        leadId,
        lead.customerName,
        lead.contactName || null,
        lead.email || null,
        lead.phone || null,
        lead.company || null,
        lead.status,
        lead.priority,
        lead.estimatedValue || null,
        lead.source,
        lead.description || null,
        lead.assignedTo,
        lead.expectedCloseDate || null,
        lead.createdBy,
      ]
    );

    logger.info('Lead created', { leadId });
    return this.mapRowToLead(result.rows[0]);
  }

  async findLeadById(leadId: string): Promise<Lead | null> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM leads WHERE lead_id = $1`, [leadId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToLead(result.rows[0]);
  }

  async findAllLeads(filters?: {
    status?: LeadStatus;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ leads: Lead[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.assignedTo) {
      conditions.push(`assigned_to = $${paramCount}`);
      params.push(filters.assignedTo);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM leads ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM leads ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const leads = result.rows.map(row => this.mapRowToLead(row));

    return { leads, total };
  }

  async updateLead(leadId: string, updates: Partial<Lead>): Promise<Lead | null> {
    const client = await getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount}`);
      values.push(updates.status);
      paramCount++;
    }

    if (updates.priority !== undefined) {
      fields.push(`priority = $${paramCount}`);
      values.push(updates.priority);
      paramCount++;
    }

    // Handle notes as description (Lead type uses description)
    if ((updates as any).notes !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push((updates as any).notes);
      paramCount++;
    }

    if (updates.updatedBy !== undefined) {
      fields.push(`updated_by = $${paramCount}`);
      values.push(updates.updatedBy);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(leadId);
    paramCount++;

    const result = await client.query(
      `UPDATE leads SET ${fields.join(', ')} WHERE lead_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Lead updated', { leadId });
    return this.mapRowToLead(result.rows[0]);
  }

  // ========================================================================
  // OPPORTUNITIES
  // ========================================================================

  async createOpportunity(
    opp: Omit<
      Opportunity,
      'opportunityId' | 'opportunityNumber' | 'createdAt' | 'updatedAt' | 'closedAt' | 'closedBy'
    >
  ): Promise<Opportunity> {
    const client = await getPool();

    const opportunityId = `OPP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const opportunityNumber = `OPP-${Date.now()}`;

    const result = await client.query(
      `INSERT INTO opportunities
        (opportunity_id, opportunity_number, customer_id, name, stage, amount, probability,
         expected_close_date, description, assigned_to, source, competitor, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING *`,
      [
        opportunityId,
        opportunityNumber,
        opp.customerId || null,
        opp.name,
        opp.stage,
        opp.amount,
        opp.probability,
        opp.expectedCloseDate,
        opp.description || null,
        opp.assignedTo,
        opp.source,
        opp.competitor || null,
        opp.createdBy,
      ]
    );

    logger.info('Opportunity created', { opportunityId, opportunityNumber });
    return this.mapRowToOpportunity(result.rows[0]);
  }

  async findOpportunityById(opportunityId: string): Promise<Opportunity | null> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM opportunities WHERE opportunity_id = $1`, [
      opportunityId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOpportunity(result.rows[0]);
  }

  async findAllOpportunities(filters?: {
    stage?: OpportunityStage;
    customerId?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ opportunities: Opportunity[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.stage) {
      conditions.push(`stage = $${paramCount}`);
      params.push(filters.stage);
      paramCount++;
    }

    if (filters?.customerId) {
      conditions.push(`customer_id = $${paramCount}`);
      params.push(filters.customerId);
      paramCount++;
    }

    if (filters?.assignedTo) {
      conditions.push(`assigned_to = $${paramCount}`);
      params.push(filters.assignedTo);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM opportunities ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM opportunities ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const opportunities = result.rows.map(row => this.mapRowToOpportunity(row));

    return { opportunities, total };
  }

  async updateOpportunity(
    opportunityId: string,
    updates: Partial<Opportunity>
  ): Promise<Opportunity | null> {
    const client = await getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.stage !== undefined) {
      fields.push(`stage = $${paramCount}`);
      values.push(updates.stage);
      paramCount++;
    }

    if (updates.amount !== undefined) {
      fields.push(`amount = $${paramCount}`);
      values.push(updates.amount);
      paramCount++;
    }

    if (updates.probability !== undefined) {
      fields.push(`probability = $${paramCount}`);
      values.push(updates.probability);
      paramCount++;
    }

    if (updates.expectedCloseDate !== undefined) {
      fields.push(`expected_close_date = $${paramCount}`);
      values.push(updates.expectedCloseDate);
      paramCount++;
    }

    if (updates.closedAt !== undefined) {
      fields.push(`closed_at = $${paramCount}`);
      values.push(updates.closedAt);
      paramCount++;
    }

    if (updates.closedBy !== undefined) {
      fields.push(`closed_by = $${paramCount}`);
      values.push(updates.closedBy);
      paramCount++;
    }

    if (updates.updatedBy !== undefined) {
      fields.push(`updated_by = $${paramCount}`);
      values.push(updates.updatedBy);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(opportunityId);
    paramCount++;

    if (fields.length === 1) {
      return await this.findOpportunityById(opportunityId);
    }

    const result = await client.query(
      `UPDATE opportunities SET ${fields.join(', ')} WHERE opportunity_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Opportunity updated', { opportunityId });
    return this.mapRowToOpportunity(result.rows[0]);
  }

  // ========================================================================
  // QUOTES
  // ========================================================================

  async createQuote(
    quote: Omit<
      Quote,
      | 'quoteId'
      | 'quoteNumber'
      | 'createdAt'
      | 'updatedAt'
      | 'sentAt'
      | 'acceptedAt'
      | 'rejectedAt'
      | 'subtotal'
      | 'taxAmount'
      | 'discountAmount'
      | 'totalAmount'
    >
  ): Promise<Quote> {
    const client = await getPool();

    const quoteId = `QT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const quoteNumber = `QT-${Date.now()}`;

    try {
      await client.query('BEGIN');

      // Calculate totals
      let subtotal = 0;
      for (const item of quote.lineItems) {
        subtotal += item.total;
      }

      const taxAmount = subtotal * 0.15; // Default 15% tax
      const discountAmount = (quote as any).discountAmount || 0;
      const totalAmount = subtotal + taxAmount - discountAmount;

      // Insert quote
      await client.query(
        `INSERT INTO quotes
          (quote_id, quote_number, customer_id, opportunity_id, status, valid_until,
           subtotal, tax_amount, discount_amount, total_amount, notes, terms_and_conditions,
           created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         RETURNING *`,
        [
          quoteId,
          quoteNumber,
          quote.customerId,
          quote.opportunityId || null,
          quote.status,
          quote.validUntil,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          quote.notes || null,
          quote.termsAndConditions || null,
          quote.createdBy,
        ]
      );

      // Insert line items
      for (const item of quote.lineItems) {
        await client.query(
          `INSERT INTO quote_line_items
            (line_item_id, quote_id, sku, description, quantity, unit_price, discount, tax_rate, line_number, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            `QTLI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            quoteId,
            item.sku,
            item.description || null,
            item.quantity,
            item.unitPrice,
            item.discount,
            item.taxRate,
            item.lineNumber,
            item.total,
          ]
        );
      }

      await client.query('COMMIT');

      logger.info('Quote created', { quoteId, quoteNumber });
      return (await this.findQuoteById(quoteId)) as Quote;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating quote', error);
      throw error;
    }
  }

  async findQuoteById(quoteId: string): Promise<Quote | null> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM quotes WHERE quote_id = $1`, [quoteId]);

    if (result.rows.length === 0) {
      return null;
    }

    const quoteRow = result.rows[0];

    // Get line items
    const itemsResult = await client.query(
      `SELECT * FROM quote_line_items WHERE quote_id = $1 ORDER BY line_number`,
      [quoteId]
    );

    const lineItems = itemsResult.rows.map(row => ({
      lineItemId: row.line_item_id,
      quoteId: row.quote_id,
      sku: row.sku,
      description: row.description,
      quantity: parseFloat(row.quantity),
      unitPrice: parseFloat(row.unit_price),
      discount: parseFloat(row.discount),
      taxRate: parseFloat(row.tax_rate),
      lineNumber: row.line_number,
      total: parseFloat(row.total),
    }));

    return this.mapRowToQuote(quoteRow, lineItems);
  }

  async findAllQuotes(filters?: {
    customerId?: string;
    status?: QuoteStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ quotes: Quote[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.customerId) {
      conditions.push(`customer_id = $${paramCount}`);
      params.push(filters.customerId);
      paramCount++;
    }

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM quotes ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM quotes ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const quotes: Quote[] = [];

    for (const quoteRow of result.rows) {
      const quote = await this.findQuoteById(quoteRow.quote_id);
      if (quote) {
        quotes.push(quote);
      }
    }

    return { quotes, total };
  }

  async updateQuote(quoteId: string, updates: Partial<Quote>): Promise<Quote | null> {
    const client = await getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const allowedFields = [
      'customerId',
      'status',
      'validUntil',
      'subtotal',
      'taxAmount',
      'totalAmount',
      'notes',
      'internalNotes',
      'convertedToOrderId',
      'updatedBy',
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return await this.findQuoteById(quoteId);
    }

    values.push(quoteId);

    const query = `
      UPDATE quotes
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE quote_id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return await this.findQuoteById(quoteId);
  }

  // ========================================================================
  // CUSTOMER INTERACTIONS
  // ========================================================================

  async createInteraction(
    interaction: Omit<CustomerInteraction, 'interactionId' | 'createdAt'>
  ): Promise<CustomerInteraction> {
    const client = await getPool();

    const interactionId = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await client.query(
      `INSERT INTO customer_interactions
        (interaction_id, customer_id, lead_id, opportunity_id, interaction_type, subject, notes,
         duration_minutes, next_follow_up_date, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        interactionId,
        interaction.customerId || null,
        interaction.leadId || null,
        interaction.opportunityId || null,
        interaction.interactionType,
        interaction.subject,
        interaction.notes,
        interaction.durationMinutes || null,
        interaction.nextFollowUpDate || null,
        interaction.createdBy,
      ]
    );

    logger.info('Customer interaction created', { interactionId });

    return {
      interactionId,
      ...interaction,
      createdAt: new Date(),
    } as CustomerInteraction;
  }

  async findInteractionsByCustomer(
    customerId: string,
    limit: number = 50
  ): Promise<CustomerInteraction[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM customer_interactions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [customerId, limit]
    );

    return result.rows.map(row => ({
      interactionId: row.interaction_id,
      customerId: row.customer_id,
      leadId: row.lead_id,
      opportunityId: row.opportunity_id,
      interactionType: row.interaction_type,
      subject: row.subject,
      notes: row.notes,
      durationMinutes: row.duration_minutes,
      nextFollowUpDate: row.next_follow_up_date,
      createdAt: row.created_at,
      createdBy: row.created_by,
    }));
  }

  // ========================================================================
  // SALES ORDERS (Phase 6: Sales Order Management)
  // ========================================================================

  async createSalesOrder(order: any): Promise<any> {
    const client = await getPool();
    const orderId = `SO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(
      `INSERT INTO sales_orders
        (order_id, entity_id, customer_id, order_number, order_date, order_status,
         warehouse_id, shipping_method_id, payment_terms, currency, exchange_rate,
         subtotal, discount_amount, discount_percent, tax_amount, shipping_amount, total_amount,
         customer_po_number, requested_date, promised_date, notes, internal_notes,
         sales_person_id, territory_id, commission_rate, commission_amount, commission_paid,
         requires_approval, approval_status, source_channel, ecommerce_order_id,
         original_order_id, is_backorder, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
               $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, NOW())
       RETURNING *`,
      [
        orderId,
        order.entityId || null,
        order.customerId,
        order.orderNumber,
        order.orderDate,
        order.orderStatus,
        order.warehouseId || null,
        order.shippingMethodId || null,
        order.paymentTerms,
        order.currency,
        order.exchangeRate,
        order.subtotal,
        order.discountAmount,
        order.discountPercent,
        order.taxAmount,
        order.shippingAmount,
        order.totalAmount,
        order.customerPoNumber || null,
        order.requestedDate || null,
        order.promisedDate || null,
        order.notes || null,
        order.internalNotes || null,
        order.salesPersonId || null,
        order.territoryId || null,
        order.commissionRate,
        order.commissionAmount,
        order.commissionPaid,
        order.requiresApproval,
        order.approvalStatus,
        order.sourceChannel || null,
        order.ecommerceOrderId || null,
        order.originalOrderId || null,
        order.isBackorder,
        order.createdBy || null,
      ]
    );

    logger.info('Sales order created', { orderId, orderNumber: order.orderNumber });
    return { ...result.rows[0], orderId };
  }

  async createSalesOrderLine(line: any): Promise<any> {
    const client = await getPool();
    const lineId = `SOL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(
      `INSERT INTO sales_order_lines
        (line_id, order_id, line_number, sku, description, quantity, unit_price,
         discount_percent, discount_amount, tax_code, tax_rate, tax_amount, line_total,
         quantity_picked, quantity_shipped, quantity_invoiced, quantity_backordered,
         status, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
       RETURNING *`,
      [
        lineId,
        line.orderId,
        line.lineNumber,
        line.sku,
        line.description || null,
        line.quantity,
        line.unitPrice,
        line.discountPercent,
        line.discountAmount,
        line.taxCode || null,
        line.taxRate,
        line.taxAmount,
        line.lineTotal,
        line.quantityPicked,
        line.quantityShipped,
        line.quantityInvoiced,
        line.quantityBackordered,
        line.status,
        line.notes || null,
      ]
    );

    return { ...result.rows[0], lineId };
  }

  async findSalesOrderById(orderId: string): Promise<any | null> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM sales_orders WHERE order_id = $1`, [orderId]);

    if (result.rows.length === 0) {
      return null;
    }

    const orderRow = result.rows[0];

    // Get line items
    const linesResult = await client.query(
      `SELECT * FROM sales_order_lines WHERE order_id = $1 ORDER BY line_number`,
      [orderId]
    );

    const lines = linesResult.rows.map(row => ({
      lineId: row.line_id,
      orderId: row.order_id,
      lineNumber: row.line_number,
      sku: row.sku,
      description: row.description,
      quantity: parseFloat(row.quantity),
      unitPrice: parseFloat(row.unit_price),
      discountPercent: parseFloat(row.discount_percent),
      discountAmount: parseFloat(row.discount_amount),
      taxCode: row.tax_code,
      taxRate: parseFloat(row.tax_rate),
      taxAmount: parseFloat(row.tax_amount),
      lineTotal: parseFloat(row.line_total),
      quantityPicked: parseFloat(row.quantity_picked),
      quantityShipped: parseFloat(row.quantity_shipped),
      quantityInvoiced: parseFloat(row.quantity_invoiced),
      quantityBackordered: parseFloat(row.quantity_backordered),
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
    }));

    return this.mapRowToSalesOrder(orderRow, lines);
  }

  async findAllSalesOrders(filters?: any): Promise<{ orders: any[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.customerId) {
      conditions.push(`customer_id = $${paramCount}`);
      params.push(filters.customerId);
      paramCount++;
    }

    if (filters?.orderStatus) {
      conditions.push(`order_status = $${paramCount}`);
      params.push(filters.orderStatus);
      paramCount++;
    }

    if (filters?.salesPersonId) {
      conditions.push(`sales_person_id = $${paramCount}`);
      params.push(filters.salesPersonId);
      paramCount++;
    }

    if (filters?.territoryId) {
      conditions.push(`territory_id = $${paramCount}`);
      params.push(filters.territoryId);
      paramCount++;
    }

    if (filters?.isBackorder !== undefined) {
      conditions.push(`is_backorder = $${paramCount}`);
      params.push(filters.isBackorder);
      paramCount++;
    }

    if (filters?.search) {
      conditions.push(
        `(order_number ILIKE $${paramCount} OR customer_po_number ILIKE $${paramCount})`
      );
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM sales_orders ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM sales_orders ${whereClause} ORDER BY order_date DESC, created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const orders: any[] = [];

    for (const orderRow of result.rows) {
      const order = await this.findSalesOrderById(orderRow.order_id);
      if (order) {
        orders.push(order);
      }
    }

    return { orders, total };
  }

  async updateSalesOrder(orderId: string, updates: any): Promise<any | null> {
    const client = await getPool();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const updatableFields = [
      'orderStatus',
      'promisedDate',
      'shippingMethodId',
      'notes',
      'internalNotes',
      'salesPersonId',
      'territoryId',
      'shipDate',
      'trackingNumber',
      'requiresApproval',
      'approvalStatus',
      'approvedBy',
      'approvedDate',
      'approvalNotes',
      'updatedBy',
    ];

    const dbFieldMap: Record<string, string> = {
      orderStatus: 'order_status',
      promisedDate: 'promised_date',
      shippingMethodId: 'shipping_method_id',
      internalNotes: 'internal_notes',
      salesPersonId: 'sales_person_id',
      territoryId: 'territory_id',
      shipDate: 'ship_date',
      trackingNumber: 'tracking_number',
      requiresApproval: 'requires_approval',
      approvalStatus: 'approval_status',
      approvedBy: 'approved_by',
      approvedDate: 'approved_date',
      approvalNotes: 'approval_notes',
      updatedBy: 'updated_by',
    };

    for (const field of updatableFields) {
      if (updates[field] !== undefined) {
        const dbField = dbFieldMap[field] || field;
        fields.push(`${dbField} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    }

    fields.push(`updated_at = NOW()`);
    values.push(orderId);
    paramCount++;

    const result = await client.query(
      `UPDATE sales_orders SET ${fields.join(', ')} WHERE order_id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Sales order updated', { orderId });
    return await this.findSalesOrderById(orderId);
  }

  async deleteSalesOrder(orderId: string): Promise<void> {
    const client = await getPool();
    await client.query(`DELETE FROM sales_orders WHERE order_id = $1`, [orderId]);
    logger.info('Sales order deleted', { orderId });
  }

  async get_next_sales_order_number(): Promise<string> {
    const client = await getPool();
    const result = await client.query(`SELECT get_next_sales_order_number() as order_number`);
    return result.rows[0].order_number;
  }

  async update_sales_order_totals(orderId: string): Promise<void> {
    const client = await getPool();
    await client.query(`SELECT update_sales_order_totals($1)`, [orderId]);
  }

  async calculate_sales_commission(orderId: string): Promise<number> {
    const client = await getPool();
    const result = await client.query(
      `SELECT calculate_sales_commission($1) as commission_amount`,
      [orderId]
    );
    return parseFloat(result.rows[0].commission_amount);
  }

  async create_backorder_from_line(lineId: string, quantity: number): Promise<string> {
    const client = await getPool();
    const result = await client.query(`SELECT create_backorder_from_line($1, $2) as backorder_id`, [
      lineId,
      quantity,
    ]);
    return result.rows[0].backorder_id;
  }

  // ========================================================================
  // BACKORDERS (Phase 6)
  // ========================================================================

  async findBackorderById(backorderId: string): Promise<any | null> {
    const client = await getPool();
    const result = await client.query(`SELECT * FROM backorders WHERE backorder_id = $1`, [
      backorderId,
    ]);
    return result.rows.length > 0 ? this.mapRowToBackorder(result.rows[0]) : null;
  }

  async findAllBackorders(filters?: any): Promise<any[]> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.customerId) {
      conditions.push(`customer_id = $${paramCount}`);
      params.push(filters.customerId);
      paramCount++;
    }

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.sku) {
      conditions.push(`sku = $${paramCount}`);
      params.push(filters.sku);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await client.query(
      `SELECT * FROM backorders ${whereClause} ORDER BY promised_date ASC, created_at ASC`,
      params
    );

    return result.rows.map(row => this.mapRowToBackorder(row));
  }

  async fulfillBackorder(backorderId: string, quantity: number, _userId: string): Promise<void> {
    const client = await getPool();

    await client.query(
      `UPDATE backorders
       SET quantity_fulfilled = quantity_fulfilled + $1,
           quantity_outstanding = GREATEST(0, quantity_outstanding - $1),
           status = CASE WHEN quantity_outstanding - $1 <= 0 THEN 'FULFILLED' ELSE status END,
           fulfilled_date = CASE WHEN quantity_outstanding - $1 <= 0 THEN NOW() ELSE fulfilled_date END,
           updated_at = NOW()
       WHERE backorder_id = $2`,
      [quantity, backorderId]
    );

    logger.info('Backorder fulfilled', { backorderId, quantity });
  }

  // ========================================================================
  // COMMISSIONS (Phase 6)
  // ========================================================================

  async findAllCommissions(filters?: any): Promise<any[]> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.salesPersonId) {
      conditions.push(`sales_person_id = $${paramCount}`);
      params.push(filters.salesPersonId);
      paramCount++;
    }

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await client.query(
      `SELECT * FROM sales_commissions ${whereClause} ORDER BY commission_date DESC`,
      params
    );

    return result.rows.map(row => this.mapRowToCommission(row));
  }

  async payCommission(commissionId: string, paymentDate: Date, _userId: string): Promise<void> {
    const client = await getPool();

    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await client.query(
      `UPDATE sales_commissions
       SET status = 'PAID', paid_date = $1, payment_id = $2
       WHERE commission_id = $3`,
      [paymentDate, paymentId, commissionId]
    );

    logger.info('Commission paid', { commissionId, paymentId });
  }

  // ========================================================================
  // TERRITORIES (Phase 6)
  // ========================================================================

  async createTerritory(territory: any): Promise<any> {
    const client = await getPool();
    const territoryId = `TERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(
      `INSERT INTO sales_territories
        (territory_id, territory_code, territory_name, description, manager_id,
         territory_type, parent_territory_id, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        territoryId,
        territory.territoryCode,
        territory.territoryName,
        territory.description || null,
        territory.managerId || null,
        territory.territoryType,
        territory.parentTerritoryId || null,
        territory.isActive,
      ]
    );

    logger.info('Territory created', { territoryId, territoryCode: territory.territoryCode });
    return this.mapRowToTerritory(result.rows[0]);
  }

  async findTerritoryById(territoryId: string): Promise<any | null> {
    const client = await getPool();
    const result = await client.query(`SELECT * FROM sales_territories WHERE territory_id = $1`, [
      territoryId,
    ]);
    return result.rows.length > 0 ? this.mapRowToTerritory(result.rows[0]) : null;
  }

  async findTerritoryByCode(territoryCode: string): Promise<any | null> {
    const client = await getPool();
    const result = await client.query(`SELECT * FROM sales_territories WHERE territory_code = $1`, [
      territoryCode,
    ]);
    return result.rows.length > 0 ? this.mapRowToTerritory(result.rows[0]) : null;
  }

  async findAllTerritories(): Promise<any[]> {
    const client = await getPool();
    const result = await client.query(
      `SELECT * FROM sales_territories WHERE is_active = true ORDER BY territory_code`
    );
    return result.rows.map(row => this.mapRowToTerritory(row));
  }

  async getTerritoryMetrics(territoryId: string): Promise<any> {
    const client = await getPool();
    const result = await client.query(
      `SELECT * FROM v_territory_performance WHERE territory_id = $1`,
      [territoryId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async assignTerritoryCustomer(assignment: any): Promise<any> {
    const client = await getPool();
    const territoryCustomerId = `TCUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await client.query(
      `INSERT INTO sales_territory_customers
        (territory_customer_id, territory_id, customer_id, assigned_date, assigned_by, is_primary, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (territory_id, customer_id) DO UPDATE SET
         is_primary = EXCLUDED.is_primary,
         assigned_by = EXCLUDED.assigned_by`,
      [
        territoryCustomerId,
        assignment.territoryId,
        assignment.customerId,
        assignment.assignedDate,
        assignment.assignedBy,
        assignment.isPrimary,
        assignment.notes || null,
      ]
    );

    logger.info('Customer assigned to territory', {
      territoryCustomerId,
      territoryId: assignment.territoryId,
    });
    return { ...assignment, territoryCustomerId };
  }

  async createTerritoryQuota(quota: any): Promise<any> {
    const client = await getPool();
    const quotaId = `QUOTA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await client.query(
      `INSERT INTO sales_territory_quotas
        (quota_id, territory_id, quota_year, quota_month, quota_amount, quota_type,
         actual_amount, variance_percent, status, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       RETURNING *`,
      [
        quotaId,
        quota.territoryId,
        quota.quotaYear,
        quota.quotaMonth || null,
        quota.quotaAmount,
        quota.quotaType,
        quota.actualAmount,
        quota.variancePercent || null,
        quota.status,
        quota.notes || null,
      ]
    );

    logger.info('Territory quota created', { quotaId, territoryId: quota.territoryId });
    return this.mapRowToTerritoryQuota(result.rows[0]);
  }

  // ========================================================================
  // SALES ORDER METRICS (Phase 6)
  // ========================================================================

  async getSalesOrderMetrics(): Promise<any> {
    const client = await getPool();

    const result = await client.query(`
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE order_status = 'PENDING') as pending_orders,
        COUNT(*) FILTER (WHERE order_status IN ('PENDING', 'CONFIRMED', 'PICKING', 'PICKED', 'PARTIAL')) as open_orders,
        COUNT(*) FILTER (WHERE order_status = 'SHIPPED' AND ship_date = CURRENT_DATE) as shipped_today,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) as revenue_this_month,
        COALESCE(AVG(total_amount), 0) as average_order_value,
        COUNT(*) FILTER (WHERE is_backorder = true) as backorder_count
      FROM sales_orders
    `);

    return {
      totalOrders: parseInt(result.rows[0].total_orders),
      pendingOrders: parseInt(result.rows[0].pending_orders),
      openOrders: parseInt(result.rows[0].open_orders),
      shippedToday: parseInt(result.rows[0].shipped_today),
      totalRevenue: parseFloat(result.rows[0].total_revenue),
      revenueThisMonth: parseFloat(result.rows[0].revenue_this_month),
      averageOrderValue: parseFloat(result.rows[0].average_order_value),
      backorderCount: parseInt(result.rows[0].backorder_count),
    };
  }

  async findOrderActivity(orderId: string, limit: number = 50): Promise<any[]> {
    const client = await getPool();
    const result = await client.query(
      `SELECT * FROM sales_order_activity WHERE order_id = $1 ORDER BY activity_date DESC LIMIT $2`,
      [orderId, limit]
    );

    return result.rows.map(row => ({
      activityId: row.activity_id,
      orderId: row.order_id,
      activityType: row.activity_type,
      activityDate: row.activity_date,
      userId: row.user_id,
      fieldName: row.field_name,
      oldValue: row.old_value,
      newValue: row.new_value,
      notes: row.notes,
    }));
  }

  // ========================================================================
  // HELPER METHODS (Phase 6)
  // ========================================================================

  private mapRowToSalesOrder(row: any, lines: any[]): any {
    return {
      orderId: row.order_id,
      entityId: row.entity_id,
      customerId: row.customer_id,
      orderNumber: row.order_number,
      orderDate: row.order_date,
      orderStatus: row.order_status,
      warehouseId: row.warehouse_id,
      shippingMethodId: row.shipping_method_id,
      paymentTerms: row.payment_terms,
      currency: row.currency,
      exchangeRate: parseFloat(row.exchange_rate),
      subtotal: parseFloat(row.subtotal),
      discountAmount: parseFloat(row.discount_amount),
      discountPercent: parseFloat(row.discount_percent),
      taxAmount: parseFloat(row.tax_amount),
      shippingAmount: parseFloat(row.shipping_amount),
      totalAmount: parseFloat(row.total_amount),
      customerPoNumber: row.customer_po_number,
      requestedDate: row.requested_date,
      promisedDate: row.promised_date,
      shipDate: row.ship_date,
      trackingNumber: row.tracking_number,
      notes: row.notes,
      internalNotes: row.internal_notes,
      salesPersonId: row.sales_person_id,
      territoryId: row.territory_id,
      commissionRate: parseFloat(row.commission_rate),
      commissionAmount: parseFloat(row.commission_amount),
      commissionPaid: row.commission_paid,
      requiresApproval: row.requires_approval,
      approvalStatus: row.approval_status,
      approvedBy: row.approved_by,
      approvedDate: row.approved_date,
      approvalNotes: row.approval_notes,
      sourceChannel: row.source_channel,
      ecommerceOrderId: row.ecommerce_order_id,
      originalOrderId: row.original_order_id,
      isBackorder: row.is_backorder,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      lines,
    };
  }

  private mapRowToBackorder(row: any): any {
    return {
      backorderId: row.backorder_id,
      originalOrderId: row.original_order_id,
      originalLineId: row.original_line_id,
      orderId: row.order_id,
      sku: row.sku,
      description: row.description,
      quantityOriginal: parseFloat(row.quantity_original),
      quantityOutstanding: parseFloat(row.quantity_outstanding),
      quantityFulfilled: parseFloat(row.quantity_fulfilled),
      promisedDate: row.promised_date,
      customerId: row.customer_id,
      status: row.status,
      priority: row.priority,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      fulfilledDate: row.fulfilled_date,
    };
  }

  private mapRowToCommission(row: any): any {
    return {
      commissionId: row.commission_id,
      orderId: row.order_id,
      lineId: row.line_id,
      salesPersonId: row.sales_person_id,
      commissionDate: row.commission_date,
      transactionType: row.transaction_type,
      baseAmount: parseFloat(row.base_amount),
      commissionRate: parseFloat(row.commission_rate),
      commissionAmount: parseFloat(row.commission_amount),
      status: row.status,
      paidDate: row.paid_date,
      paymentId: row.payment_id,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  private mapRowToTerritory(row: any): any {
    return {
      territoryId: row.territory_id,
      territoryCode: row.territory_code,
      territoryName: row.territory_name,
      description: row.description,
      managerId: row.manager_id,
      territoryType: row.territory_type,
      parentTerritoryId: row.parent_territory_id,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }

  private mapRowToTerritoryQuota(row: any): any {
    return {
      quotaId: row.quota_id,
      territoryId: row.territory_id,
      quotaYear: row.quota_year,
      quotaMonth: row.quota_month,
      quotaAmount: parseFloat(row.quota_amount),
      quotaType: row.quota_type,
      actualAmount: parseFloat(row.actual_amount),
      variancePercent: row.variance_percent ? parseFloat(row.variance_percent) : undefined,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private mapRowToCustomer(row: any): Customer {
    return {
      customerId: row.customer_id,
      customerNumber: row.customer_number,
      companyName: row.company_name,
      contactName: row.contact_name,
      email: row.email,
      phone: row.phone,
      billingAddress:
        typeof row.billing_address === 'string'
          ? JSON.parse(row.billing_address)
          : row.billing_address,
      shippingAddress: row.shipping_address
        ? typeof row.shipping_address === 'string'
          ? JSON.parse(row.shipping_address)
          : row.shipping_address
        : undefined,
      status: row.status,
      taxId: row.tax_id,
      paymentTerms: row.payment_terms,
      creditLimit: row.credit_limit ? parseFloat(row.credit_limit) : undefined,
      accountBalance: parseFloat(row.account_balance),
      notes: row.notes,
      assignedTo: row.assigned_to,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      lastContactDate: row.last_contact_date,
    };
  }

  private mapRowToLead(row: any): Lead {
    return {
      leadId: row.lead_id,
      customerName: row.customer_name,
      contactName: row.contact_name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      status: row.status,
      priority: row.priority,
      estimatedValue: row.estimated_value ? parseFloat(row.estimated_value) : undefined,
      source: row.source,
      description: row.description,
      assignedTo: row.assigned_to,
      expectedCloseDate: row.expected_close_date,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      lastContactDate: row.last_contact_date,
      nextFollowUpDate: row.next_follow_up_date,
    };
  }

  private mapRowToOpportunity(row: any): Opportunity {
    return {
      opportunityId: row.opportunity_id,
      opportunityNumber: row.opportunity_number,
      customerId: row.customer_id,
      name: row.name,
      stage: row.stage,
      amount: parseFloat(row.amount),
      probability: row.probability,
      expectedCloseDate: row.expected_close_date,
      description: row.description,
      assignedTo: row.assigned_to,
      source: row.source,
      competitor: row.competitor,
      lostReason: row.lost_reason,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      closedAt: row.closed_at,
      closedBy: row.closed_by,
    };
  }

  private mapRowToQuote(row: any, lineItems: QuoteLineItem[]): Quote {
    return {
      quoteId: row.quote_id,
      quoteNumber: row.quote_number,
      customerId: row.customer_id,
      opportunityId: row.opportunity_id,
      status: row.status,
      validUntil: row.valid_until,
      lineItems,
      subtotal: parseFloat(row.subtotal),
      taxAmount: parseFloat(row.tax_amount),
      discountAmount: parseFloat(row.discount_amount),
      totalAmount: parseFloat(row.total_amount),
      notes: row.notes,
      termsAndConditions: row.terms_and_conditions,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      sentAt: row.sent_at,
      acceptedAt: row.accepted_at,
      rejectedAt: row.rejected_at,
      convertedToOrderId: row.converted_to_order_id,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// Singleton instance
export const salesRepository = new SalesRepository();
