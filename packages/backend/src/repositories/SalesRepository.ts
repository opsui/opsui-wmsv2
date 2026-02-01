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
}

// Singleton instance
export const salesRepository = new SalesRepository();
