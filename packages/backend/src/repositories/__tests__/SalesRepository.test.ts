/**
 * Unit tests for SalesRepository
 * @covers src/repositories/SalesRepository.ts
 */

import { SalesRepository } from '../SalesRepository';
import {
  CustomerStatus,
  LeadStatus,
  LeadPriority,
  OpportunityStage,
  QuoteStatus,
} from '@opsui/shared';

// Mock getPool
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SalesRepository', () => {
  let salesRepository: SalesRepository;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    salesRepository = new SalesRepository();

    // Create mock pool
    mockClient = {
      query: jest.fn(),
    };
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    // Mock getPool to return our mock pool
    const { getPool } = require('../../db/client');
    getPool.mockReturnValue(mockPool);
  });

  // ==========================================================================
  // CUSTOMERS
  // ==========================================================================

  describe('Customers', () => {
    it('should create a new customer', async () => {
      const mockCustomerRow = {
        customer_id: 'CUST-123',
        customer_number: 'CUST-123',
        company_name: 'Test Company',
        contact_name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        billing_address: '{"street": "123 Main St"}',
        shipping_address: '{"street": "456 Oak Ave"}',
        status: CustomerStatus.ACTIVE,
        tax_id: '123456',
        payment_terms: 'NET30',
        credit_limit: 10000,
        account_balance: 0,
        notes: 'Test notes',
        assigned_to: 'user-1',
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: null,
        updated_by: null,
        last_contact_date: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockCustomerRow] });

      const customer = await salesRepository.createCustomer({
        customerNumber: 'CUST-TEST',
        companyName: 'Test Company',
        contactName: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        billingAddress: {
          street1: '123 Main St',
          street2: '',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
        },
        shippingAddress: {
          street1: '456 Oak Ave',
          street2: '',
          city: 'Anytown',
          state: 'CA',
          postalCode: '12346',
          country: 'USA',
        },
        status: CustomerStatus.ACTIVE,
        taxId: '123456',
        paymentTerms: 'NET30',
        creditLimit: 10000,
        notes: 'Test notes',
        assignedTo: 'user-1',
        createdBy: 'user-1',
      });

      expect(customer).toHaveProperty('customerId', 'CUST-123');
      expect(customer).toHaveProperty('companyName', 'Test Company');
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should find customer by ID', async () => {
      const mockCustomerRow = {
        customer_id: 'CUST-123',
        company_name: 'Test Company',
        status: CustomerStatus.ACTIVE,
        account_balance: 0,
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockCustomerRow] });

      const customer = await salesRepository.findCustomerById('CUST-123');

      expect(customer).toHaveProperty('customerId', 'CUST-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM customers WHERE customer_id = $1',
        ['CUST-123']
      );
    });

    it('should return null when customer not found by ID', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const customer = await salesRepository.findCustomerById('NONEXISTENT');

      expect(customer).toBeNull();
    });

    it('should find customer by number', async () => {
      const mockCustomerRow = {
        customer_id: 'CUST-123',
        customer_number: 'CUST-001',
        company_name: 'Test Company',
        status: CustomerStatus.ACTIVE,
        account_balance: 0,
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockCustomerRow] });

      const customer = await salesRepository.findCustomerByNumber('CUST-001');

      expect(customer).toHaveProperty('customerNumber', 'CUST-001');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM customers WHERE customer_number = $1',
        ['CUST-001']
      );
    });

    it('should find all customers with filters', async () => {
      const mockCustomerRows = [
        {
          customer_id: 'CUST-001',
          company_name: 'Company A',
          status: CustomerStatus.ACTIVE,
          account_balance: 0,
          created_at: new Date(),
        },
        {
          customer_id: 'CUST-002',
          company_name: 'Company B',
          status: CustomerStatus.ACTIVE,
          account_balance: 0,
          created_at: new Date(),
        },
      ];

      // Count query
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // Data query
      mockPool.query.mockResolvedValueOnce({ rows: mockCustomerRows });

      const result = await salesRepository.findAllCustomers({
        status: CustomerStatus.ACTIVE,
        limit: 10,
        offset: 0,
      });

      expect(result.customers).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should update customer', async () => {
      const mockUpdatedCustomer = {
        customer_id: 'CUST-123',
        company_name: 'Updated Company',
        contact_name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '987-654-3210',
        status: CustomerStatus.ACTIVE,
        account_balance: 0,
        notes: 'Updated notes',
        assigned_to: 'user-2',
        updated_by: 'user-2',
        created_at: new Date(),
        updated_at: new Date(),
        billing_address: null,
        shipping_address: null,
        tax_id: null,
        payment_terms: null,
        credit_limit: null,
        created_by: null,
        last_contact_date: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUpdatedCustomer] });

      const customer = await salesRepository.updateCustomer('CUST-123', {
        companyName: 'Updated Company',
        contactName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '987-654-3210',
        status: CustomerStatus.ACTIVE,
        notes: 'Updated notes',
        assignedTo: 'user-2',
        updatedBy: 'user-2',
      });

      expect(customer).toHaveProperty('companyName', 'Updated Company');
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should return null when updating non-existent customer', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const customer = await salesRepository.updateCustomer('NONEXISTENT', {
        companyName: 'New Name',
      });

      expect(customer).toBeNull();
    });
  });

  // ==========================================================================
  // LEADS
  // ==========================================================================

  describe('Leads', () => {
    it('should create a new lead', async () => {
      const mockLeadRow = {
        lead_id: 'LEAD-123',
        customer_name: 'Test Customer',
        contact_name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        company: 'Test Company',
        status: LeadStatus.NEW,
        priority: LeadPriority.HIGH,
        estimated_value: 50000,
        source: 'WEBSITE',
        description: 'Test description',
        assigned_to: 'user-1',
        expected_close_date: new Date('2024-12-31'),
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: null,
        updated_by: null,
        last_contact_date: null,
        next_follow_up_date: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockLeadRow] });

      const lead = await salesRepository.createLead({
        customerName: 'Test Customer',
        contactName: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        company: 'Test Company',
        status: LeadStatus.NEW,
        priority: LeadPriority.HIGH,
        estimatedValue: 50000,
        source: 'WEBSITE',
        description: 'Test description',
        assignedTo: 'user-1',
        expectedCloseDate: new Date('2024-12-31'),
        createdBy: 'user-1',
      });

      expect(lead).toHaveProperty('leadId', 'LEAD-123');
      expect(lead).toHaveProperty('customerName', 'Test Customer');
    });

    it('should find lead by ID', async () => {
      const mockLeadRow = {
        lead_id: 'LEAD-123',
        customer_name: 'Test Customer',
        status: LeadStatus.NEW,
        priority: LeadPriority.HIGH,
        created_at: new Date(),
        company: null,
        contact_name: null,
        email: null,
        phone: null,
        estimated_value: null,
        source: null,
        description: null,
        assigned_to: null,
        expected_close_date: null,
        created_by: null,
        updated_at: null,
        updated_by: null,
        last_contact_date: null,
        next_follow_up_date: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockLeadRow] });

      const lead = await salesRepository.findLeadById('LEAD-123');

      expect(lead).toHaveProperty('leadId', 'LEAD-123');
    });

    it('should return null when lead not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const lead = await salesRepository.findLeadById('NONEXISTENT');

      expect(lead).toBeNull();
    });

    it('should find all leads with filters', async () => {
      const mockLeadRows = [
        {
          lead_id: 'LEAD-001',
          customer_name: 'Customer A',
          status: LeadStatus.NEW,
          priority: LeadPriority.HIGH,
          created_at: new Date(),
          company: null,
          contact_name: null,
          email: null,
          phone: null,
          estimated_value: null,
          source: null,
          description: null,
          assigned_to: null,
          expected_close_date: null,
          created_by: null,
          updated_at: null,
          updated_by: null,
          last_contact_date: null,
          next_follow_up_date: null,
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: mockLeadRows });

      const result = await salesRepository.findAllLeads({
        status: LeadStatus.NEW,
        limit: 10,
      });

      expect(result.leads).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should update lead', async () => {
      const mockUpdatedLead = {
        lead_id: 'LEAD-123',
        customer_name: 'Test Customer',
        status: LeadStatus.CONTACTED,
        priority: LeadPriority.MEDIUM,
        updated_at: new Date(),
        updated_by: 'user-2',
        created_at: new Date(),
        company: null,
        contact_name: null,
        email: null,
        phone: null,
        estimated_value: null,
        source: null,
        description: 'Updated description',
        assigned_to: null,
        expected_close_date: null,
        created_by: null,
        last_contact_date: null,
        next_follow_up_date: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUpdatedLead] });

      const lead = await salesRepository.updateLead('LEAD-123', {
        status: LeadStatus.CONTACTED,
        priority: LeadPriority.MEDIUM,
        updatedBy: 'user-2',
      } as any);

      expect(lead).toHaveProperty('status', LeadStatus.CONTACTED);
    });
  });

  // ==========================================================================
  // OPPORTUNITIES
  // ==========================================================================

  describe('Opportunities', () => {
    it('should create a new opportunity', async () => {
      const mockOppRow = {
        opportunity_id: 'OPP-123',
        opportunity_number: 'OPP-123',
        customer_id: 'CUST-001',
        name: 'Test Opportunity',
        stage: OpportunityStage.PROSPECTING,
        amount: 100000,
        probability: 25,
        expected_close_date: new Date('2024-12-31'),
        description: 'Test description',
        assigned_to: 'user-1',
        source: 'WEBSITE',
        competitor: null,
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: null,
        updated_by: null,
        closed_at: null,
        closed_by: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockOppRow] });

      const opportunity = await salesRepository.createOpportunity({
        customerId: 'CUST-001',
        name: 'Test Opportunity',
        stage: OpportunityStage.PROSPECTING,
        amount: 100000,
        probability: 25,
        expectedCloseDate: new Date('2024-12-31'),
        description: 'Test description',
        assignedTo: 'user-1',
        source: 'WEBSITE',
        createdBy: 'user-1',
      });

      expect(opportunity).toHaveProperty('opportunityId', 'OPP-123');
      expect(opportunity).toHaveProperty('name', 'Test Opportunity');
    });

    it('should find opportunity by ID', async () => {
      const mockOppRow = {
        opportunity_id: 'OPP-123',
        opportunity_number: 'OPP-001',
        customer_id: 'CUST-001',
        name: 'Test Opportunity',
        stage: OpportunityStage.PROSPECTING,
        amount: 100000,
        probability: 25,
        expected_close_date: new Date('2024-12-31'),
        description: null,
        assigned_to: 'user-1',
        source: 'WEBSITE',
        competitor: null,
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: null,
        updated_by: null,
        closed_at: null,
        closed_by: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockOppRow] });

      const opportunity = await salesRepository.findOpportunityById('OPP-123');

      expect(opportunity).toHaveProperty('opportunityId', 'OPP-123');
    });

    it('should find all opportunities with filters', async () => {
      const mockOppRows = [
        {
          opportunity_id: 'OPP-001',
          customer_id: 'CUST-001',
          name: 'Opportunity A',
          stage: OpportunityStage.PROSPECTING,
          amount: 50000,
          probability: 25,
          created_at: new Date(),
          opportunity_number: 'OPP-001',
          expected_close_date: null,
          description: null,
          assigned_to: null,
          source: null,
          competitor: null,
          created_by: null,
          updated_at: null,
          updated_by: null,
          closed_at: null,
          closed_by: null,
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: mockOppRows });

      const result = await salesRepository.findAllOpportunities({
        stage: OpportunityStage.PROSPECTING,
        limit: 10,
      });

      expect(result.opportunities).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should update opportunity', async () => {
      const mockUpdatedOpp = {
        opportunity_id: 'OPP-123',
        opportunity_number: 'OPP-001',
        customer_id: 'CUST-001',
        name: 'Test Opportunity',
        stage: OpportunityStage.QUALIFICATION,
        amount: 120000,
        probability: 50,
        expected_close_date: new Date('2024-12-31'),
        closed_at: null,
        closed_by: null,
        updated_at: new Date(),
        updated_by: 'user-2',
        description: null,
        assigned_to: null,
        source: null,
        competitor: null,
        created_by: null,
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUpdatedOpp] });

      const opportunity = await salesRepository.updateOpportunity('OPP-123', {
        stage: OpportunityStage.QUALIFICATION,
        amount: 120000,
        probability: 50,
        updatedBy: 'user-2',
      });

      expect(opportunity).toHaveProperty('stage', OpportunityStage.QUALIFICATION);
      expect(opportunity).toHaveProperty('amount', 120000);
    });

    it('should return existing opportunity when no fields to update', async () => {
      const mockOppRow = {
        opportunity_id: 'OPP-123',
        opportunity_number: 'OPP-001',
        customer_id: 'CUST-001',
        name: 'Test Opportunity',
        stage: OpportunityStage.PROSPECTING,
        amount: 100000,
        probability: 25,
        expected_close_date: new Date('2024-12-31'),
        description: null,
        assigned_to: 'user-1',
        source: 'WEBSITE',
        competitor: null,
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: null,
        updated_by: null,
        closed_at: null,
        closed_by: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockOppRow] });

      const opportunity = await salesRepository.updateOpportunity('OPP-123', {});

      expect(opportunity).toHaveProperty('opportunityId', 'OPP-123');
    });
  });

  // ==========================================================================
  // QUOTES
  // ==========================================================================

  describe('Quotes', () => {
    it('should create a new quote', async () => {
      const mockQuoteRow = {
        quote_id: 'QT-123',
        quote_number: 'QT-123',
        customer_id: 'CUST-001',
        opportunity_id: 'OPP-001',
        status: QuoteStatus.DRAFT,
        valid_until: new Date('2024-12-31'),
        subtotal: 1000,
        tax_amount: 150,
        discount_amount: 0,
        total_amount: 1150,
        notes: 'Test notes',
        terms_and_conditions: 'Test terms',
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: null,
        updated_by: null,
        sent_at: null,
        accepted_at: null,
        rejected_at: null,
        converted_to_order_id: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockPool.query.mockResolvedValueOnce({ rows: [mockQuoteRow] }); // INSERT quote
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // INSERT line items
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // COMMIT
      mockPool.query.mockResolvedValueOnce({ rows: [mockQuoteRow] }); // findQuoteById
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // findQuoteById line items

      const quote = await salesRepository.createQuote({
        customerId: 'CUST-001',
        opportunityId: 'OPP-001',
        status: QuoteStatus.DRAFT,
        validUntil: new Date('2024-12-31'),
        lineItems: [
          {
            lineItemId: 'QTLI-001',
            quoteId: 'QT-123',
            sku: 'SKU-001',
            description: 'Test Product',
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxRate: 0.15,
            lineNumber: 1,
            total: 1000,
          },
        ],
        notes: 'Test notes',
        termsAndConditions: 'Test terms',
        createdBy: 'user-1',
      });

      expect(quote).toHaveProperty('quoteId', 'QT-123');
    });

    it('should find quote by ID with line items', async () => {
      const mockQuoteRow = {
        quote_id: 'QT-123',
        quote_number: 'QT-001',
        customer_id: 'CUST-001',
        opportunity_id: null,
        status: QuoteStatus.DRAFT,
        valid_until: new Date('2024-12-31'),
        subtotal: 1000,
        tax_amount: 150,
        discount_amount: 0,
        total_amount: 1150,
        notes: null,
        terms_and_conditions: null,
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: null,
        updated_by: null,
        sent_at: null,
        accepted_at: null,
        rejected_at: null,
        converted_to_order_id: null,
      };

      const mockLineItems = [
        {
          line_item_id: 'QTLI-001',
          quote_id: 'QT-123',
          sku: 'SKU-001',
          description: 'Test Product',
          quantity: 10,
          unit_price: 100,
          discount: 0,
          tax_rate: 0.15,
          line_number: 1,
          total: 1000,
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: [mockQuoteRow] });
      mockPool.query.mockResolvedValueOnce({ rows: mockLineItems });

      const quote = await salesRepository.findQuoteById('QT-123');

      expect(quote).toHaveProperty('quoteId', 'QT-123');
      expect(quote.lineItems).toHaveLength(1);
      expect(quote.lineItems[0]).toHaveProperty('sku', 'SKU-001');
    });

    it('should return null when quote not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const quote = await salesRepository.findQuoteById('NONEXISTENT');

      expect(quote).toBeNull();
    });

    it('should find all quotes with filters', async () => {
      const mockQuoteRow = {
        quote_id: 'QT-001',
        quote_number: 'QT-001',
        customer_id: 'CUST-001',
        opportunity_id: null,
        status: QuoteStatus.DRAFT,
        valid_until: new Date(),
        subtotal: 1000,
        tax_amount: 150,
        discount_amount: 0,
        total_amount: 1150,
        notes: null,
        terms_and_conditions: null,
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: null,
        updated_by: null,
        sent_at: null,
        accepted_at: null,
        rejected_at: null,
        converted_to_order_id: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [mockQuoteRow] });
      mockPool.query.mockResolvedValueOnce({ rows: [mockQuoteRow] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await salesRepository.findAllQuotes({
        customerId: 'CUST-001',
        status: QuoteStatus.DRAFT,
        limit: 10,
      });

      expect(result.quotes).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should update quote', async () => {
      const mockQuoteRow = {
        quote_id: 'QT-123',
        quote_number: 'QT-001',
        customer_id: 'CUST-001',
        opportunity_id: null,
        status: QuoteStatus.SENT,
        valid_until: new Date('2024-12-31'),
        subtotal: 1000,
        tax_amount: 150,
        discount_amount: 0,
        total_amount: 1150,
        notes: 'Updated notes',
        terms_and_conditions: null,
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: 'user-2',
        sent_at: null,
        accepted_at: null,
        rejected_at: null,
        converted_to_order_id: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockQuoteRow] });
      mockPool.query.mockResolvedValueOnce({ rows: [mockQuoteRow] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const quote = await salesRepository.updateQuote('QT-123', {
        status: QuoteStatus.SENT,
        notes: 'Updated notes',
        updatedBy: 'user-2',
      });

      expect(quote).toHaveProperty('status', QuoteStatus.SENT);
    });

    it('should rollback quote creation on error', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockPool.query.mockRejectedValueOnce(new Error('Database error')); // INSERT fails
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        salesRepository.createQuote({
          customerId: 'CUST-001',
          status: QuoteStatus.DRAFT,
          validUntil: new Date('2024-12-31'),
          lineItems: [],
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Database error');
    });
  });

  // ==========================================================================
  // CUSTOMER INTERACTIONS
  // ==========================================================================

  describe('Customer Interactions', () => {
    it('should create a customer interaction', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const interaction = await salesRepository.createInteraction({
        customerId: 'CUST-001',
        interactionType: 'CALL',
        subject: 'Test Call',
        notes: 'Test notes',
        createdBy: 'user-1',
      });

      expect(interaction).toHaveProperty('interactionId');
      expect(interaction).toHaveProperty('customerId', 'CUST-001');
      expect(interaction).toHaveProperty('interactionType', 'CALL');
    });

    it('should find interactions by customer', async () => {
      const mockInteractionRows = [
        {
          interaction_id: 'INT-001',
          customer_id: 'CUST-001',
          lead_id: null,
          opportunity_id: null,
          interaction_type: 'CALL',
          subject: 'Test Call',
          notes: 'Test notes',
          duration_minutes: 30,
          next_follow_up_date: new Date('2024-12-31'),
          created_at: new Date(),
          created_by: 'user-1',
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockInteractionRows });

      const interactions = await salesRepository.findInteractionsByCustomer('CUST-001', 50);

      expect(interactions).toHaveLength(1);
      expect(interactions[0]).toHaveProperty('interactionType', 'CALL');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE customer_id = $1'),
        ['CUST-001', 50]
      );
    });

    it('should find interactions with default limit', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await salesRepository.findInteractionsByCustomer('CUST-001');

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $2'), [
        'CUST-001',
        50,
      ]);
    });
  });

  // ==========================================================================
  // SALES ORDERS
  // ==========================================================================

  describe('Sales Orders', () => {
    it('should create a sales order', async () => {
      const mockOrderRow = {
        order_id: 'SO-123',
        entity_id: null,
        customer_id: 'CUST-001',
        order_number: 'SO-001',
        order_date: new Date(),
        order_status: 'PENDING',
        warehouse_id: null,
        shipping_method_id: null,
        payment_terms: 'NET30',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 1000,
        discount_amount: 0,
        discount_percent: 0,
        tax_amount: 150,
        shipping_amount: 50,
        total_amount: 1200,
        customer_po_number: null,
        requested_date: null,
        promised_date: null,
        notes: null,
        internal_notes: null,
        sales_person_id: null,
        territory_id: null,
        commission_rate: 0,
        commission_amount: 0,
        commission_paid: false,
        requires_approval: false,
        approval_status: 'APPROVED',
        source_channel: null,
        ecommerce_order_id: null,
        original_order_id: null,
        is_backorder: false,
        created_by: 'user-1',
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockOrderRow] });

      const order = await salesRepository.createSalesOrder({
        customerId: 'CUST-001',
        orderNumber: 'SO-001',
        orderDate: new Date(),
        orderStatus: 'PENDING',
        paymentTerms: 'NET30',
        currency: 'USD',
        exchangeRate: 1,
        subtotal: 1000,
        discountAmount: 0,
        discountPercent: 0,
        taxAmount: 150,
        shippingAmount: 50,
        totalAmount: 1200,
        commissionRate: 0,
        commissionAmount: 0,
        commissionPaid: false,
        requiresApproval: false,
        approvalStatus: 'APPROVED',
        isBackorder: false,
      });

      expect(order).toHaveProperty('orderId');
      expect(order).toHaveProperty('order_number', 'SO-001');
    });

    it('should create a sales order line', async () => {
      const mockLineRow = {
        line_id: 'SOL-123',
        order_id: 'SO-001',
        line_number: 1,
        sku: 'SKU-001',
        description: 'Test Product',
        quantity: 10,
        unit_price: 100,
        discount_percent: 0,
        discount_amount: 0,
        tax_code: null,
        tax_rate: 0.15,
        tax_amount: 150,
        line_total: 1000,
        quantity_picked: 0,
        quantity_shipped: 0,
        quantity_invoiced: 0,
        quantity_backordered: 0,
        status: 'PENDING',
        notes: null,
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockLineRow] });

      const line = await salesRepository.createSalesOrderLine({
        orderId: 'SO-001',
        lineNumber: 1,
        sku: 'SKU-001',
        description: 'Test Product',
        quantity: 10,
        unitPrice: 100,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: 0.15,
        taxAmount: 150,
        lineTotal: 1000,
        quantityPicked: 0,
        quantityShipped: 0,
        quantityInvoiced: 0,
        quantityBackordered: 0,
        status: 'PENDING',
      });

      expect(line).toHaveProperty('lineId');
      expect(line).toHaveProperty('sku', 'SKU-001');
    });

    it('should find sales order by ID with lines', async () => {
      const mockOrderRow = {
        order_id: 'SO-123',
        entity_id: null,
        customer_id: 'CUST-001',
        order_number: 'SO-001',
        order_date: new Date(),
        order_status: 'PENDING',
        warehouse_id: null,
        shipping_method_id: null,
        payment_terms: 'NET30',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 1000,
        discount_amount: 0,
        discount_percent: 0,
        tax_amount: 150,
        shipping_amount: 50,
        total_amount: 1200,
        customer_po_number: null,
        requested_date: null,
        promised_date: null,
        ship_date: null,
        tracking_number: null,
        notes: null,
        internal_notes: null,
        sales_person_id: null,
        territory_id: null,
        commission_rate: 0,
        commission_amount: 0,
        commission_paid: false,
        requires_approval: false,
        approval_status: 'APPROVED',
        approved_by: null,
        approved_date: null,
        approval_notes: null,
        source_channel: null,
        ecommerce_order_id: null,
        original_order_id: null,
        is_backorder: false,
        created_at: new Date(),
        created_by: null,
        updated_at: null,
        updated_by: null,
      };

      const mockLineRows = [
        {
          line_id: 'SOL-001',
          order_id: 'SO-123',
          line_number: 1,
          sku: 'SKU-001',
          description: 'Test Product',
          quantity: 10,
          unit_price: 100,
          discount_percent: 0,
          discount_amount: 0,
          tax_code: null,
          tax_rate: 0.15,
          tax_amount: 15,
          line_total: 100,
          quantity_picked: 0,
          quantity_shipped: 0,
          quantity_invoiced: 0,
          quantity_backordered: 0,
          status: 'PENDING',
          notes: null,
          created_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: [mockOrderRow] });
      mockPool.query.mockResolvedValueOnce({ rows: mockLineRows });

      const order = await salesRepository.findSalesOrderById('SO-123');

      expect(order).toHaveProperty('orderId', 'SO-123');
      expect(order.lines).toHaveLength(1);
      expect(order.lines[0]).toHaveProperty('sku', 'SKU-001');
    });

    it('should return null when sales order not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const order = await salesRepository.findSalesOrderById('NONEXISTENT');

      expect(order).toBeNull();
    });

    it('should find all sales orders with filters', async () => {
      const mockOrderRow = {
        order_id: 'SO-001',
        entity_id: null,
        customer_id: 'CUST-001',
        order_number: 'SO-001',
        order_date: new Date(),
        order_status: 'PENDING',
        warehouse_id: null,
        shipping_method_id: null,
        payment_terms: 'NET30',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 1000,
        discount_amount: 0,
        discount_percent: 0,
        tax_amount: 150,
        shipping_amount: 50,
        total_amount: 1200,
        customer_po_number: null,
        requested_date: null,
        promised_date: null,
        ship_date: null,
        tracking_number: null,
        notes: null,
        internal_notes: null,
        sales_person_id: null,
        territory_id: null,
        commission_rate: 0,
        commission_amount: 0,
        commission_paid: false,
        requires_approval: false,
        approval_status: 'APPROVED',
        approved_by: null,
        approved_date: null,
        approval_notes: null,
        source_channel: null,
        ecommerce_order_id: null,
        original_order_id: null,
        is_backorder: false,
        created_at: new Date(),
        created_by: null,
        updated_at: null,
        updated_by: null,
      };

      // Set up the mocks to return expected values for all queries
      mockPool.query.mockImplementation((query: string, params?: any[]) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        } else if (
          query.includes('FROM sales_orders') &&
          query.includes('ORDER BY order_date DESC')
        ) {
          // Main query to list sales orders
          return Promise.resolve({ rows: [mockOrderRow] });
        } else if (query.includes('WHERE order_id =') && !query.includes('sales_order_lines')) {
          // findSalesOrderById order query
          return Promise.resolve({ rows: [mockOrderRow] });
        } else if (query.includes('FROM sales_order_lines')) {
          // Lines query
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await salesRepository.findAllSalesOrders({
        customerId: 'CUST-001',
        orderStatus: 'PENDING',
        limit: 10,
      });

      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should update sales order', async () => {
      const mockOrderRow = {
        order_id: 'SO-123',
        order_number: 'SO-001',
        order_status: 'CONFIRMED',
        promised_date: new Date('2024-12-31'),
        shipping_method_id: 'SHIP-001',
        notes: 'Updated notes',
        internal_notes: 'Internal notes',
        sales_person_id: 'SALES-001',
        territory_id: 'TERR-001',
        ship_date: new Date('2024-12-15'),
        tracking_number: 'TRACK-123',
        requires_approval: false,
        approval_status: 'APPROVED',
        approved_by: null,
        approved_date: null,
        approval_notes: null,
        updated_at: new Date(),
        updated_by: 'user-2',
        customer_id: 'CUST-001',
        order_date: new Date(),
        warehouse_id: null,
        payment_terms: 'NET30',
        currency: 'USD',
        exchange_rate: 1,
        subtotal: 1000,
        discount_amount: 0,
        discount_percent: 0,
        tax_amount: 150,
        shipping_amount: 50,
        total_amount: 1200,
        customer_po_number: null,
        requested_date: null,
        created_at: new Date(),
        created_by: null,
        ecommerce_order_id: null,
        original_order_id: null,
        is_backorder: false,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockOrderRow] });
      mockPool.query.mockResolvedValueOnce({ rows: [mockOrderRow] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const order = await salesRepository.updateSalesOrder('SO-123', {
        orderStatus: 'CONFIRMED',
        promisedDate: new Date('2024-12-31'),
        shippingMethodId: 'SHIP-001',
        notes: 'Updated notes',
        internalNotes: 'Internal notes',
        salesPersonId: 'SALES-001',
        territoryId: 'TERR-001',
        shipDate: new Date('2024-12-15'),
        trackingNumber: 'TRACK-123',
        updatedBy: 'user-2',
      });

      expect(order).toHaveProperty('orderStatus', 'CONFIRMED');
    });

    it('should delete sales order', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await salesRepository.deleteSalesOrder('SO-123');

      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM sales_orders WHERE order_id = $1', [
        'SO-123',
      ]);
    });

    it('should get next sales order number', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ order_number: 'SO-2024-001' }] });

      const orderNumber = await salesRepository.get_next_sales_order_number();

      expect(orderNumber).toBe('SO-2024-001');
    });

    it('should update sales order totals', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await salesRepository.update_sales_order_totals('SO-123');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT update_sales_order_totals($1)', [
        'SO-123',
      ]);
    });

    it('should calculate sales commission', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ commission_amount: '500.00' }] });

      const commission = await salesRepository.calculate_sales_commission('SO-123');

      expect(commission).toBe(500.0);
    });

    it('should create backorder from line', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ backorder_id: 'BO-123' }] });

      const backorderId = await salesRepository.create_backorder_from_line('SOL-123', 5);

      expect(backorderId).toBe('BO-123');
    });
  });

  // ==========================================================================
  // BACKORDERS
  // ==========================================================================

  describe('Backorders', () => {
    it('should find backorder by ID', async () => {
      const mockBackorderRow = {
        backorder_id: 'BO-123',
        original_order_id: 'SO-001',
        original_line_id: 'SOL-001',
        order_id: 'SO-002',
        sku: 'SKU-001',
        description: 'Test Product',
        quantity_original: 10,
        quantity_outstanding: 5,
        quantity_fulfilled: 5,
        promised_date: new Date('2024-12-31'),
        customer_id: 'CUST-001',
        status: 'PARTIAL',
        priority: LeadPriority.HIGH,
        notes: null,
        created_at: new Date(),
        updated_at: null,
        fulfilled_date: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockBackorderRow] });

      const backorder = await salesRepository.findBackorderById('BO-123');

      expect(backorder).toHaveProperty('backorderId', 'BO-123');
      expect(backorder).toHaveProperty('sku', 'SKU-001');
    });

    it('should return null when backorder not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const backorder = await salesRepository.findBackorderById('NONEXISTENT');

      expect(backorder).toBeNull();
    });

    it('should find all backorders with filters', async () => {
      const mockBackorderRows = [
        {
          backorder_id: 'BO-001',
          original_order_id: 'SO-001',
          original_line_id: 'SOL-001',
          order_id: 'SO-002',
          sku: 'SKU-001',
          description: 'Test Product',
          quantity_original: 10,
          quantity_outstanding: 5,
          quantity_fulfilled: 5,
          promised_date: new Date('2024-12-31'),
          customer_id: 'CUST-001',
          status: 'PARTIAL',
          priority: LeadPriority.HIGH,
          notes: null,
          created_at: new Date(),
          updated_at: null,
          fulfilled_date: null,
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockBackorderRows });

      const backorders = await salesRepository.findAllBackorders({
        customerId: 'CUST-001',
        status: 'PARTIAL',
      });

      expect(backorders).toHaveLength(1);
    });

    it('should fulfill backorder', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await salesRepository.fulfillBackorder('BO-123', 5, 'user-1');

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE backorders'), [
        5,
        'BO-123',
      ]);
    });
  });

  // ==========================================================================
  // COMMISSIONS
  // ==========================================================================

  describe('Commissions', () => {
    it('should find all commissions with filters', async () => {
      const mockCommissionRows = [
        {
          commission_id: 'COMM-001',
          order_id: 'SO-001',
          line_id: 'SOL-001',
          sales_person_id: 'SALES-001',
          commission_date: new Date(),
          transaction_type: 'EARNED',
          base_amount: 1000,
          commission_rate: 0.05,
          commission_amount: 50,
          status: 'PENDING',
          paid_date: null,
          payment_id: null,
          notes: null,
          created_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockCommissionRows });

      const commissions = await salesRepository.findAllCommissions({
        salesPersonId: 'SALES-001',
        status: 'PENDING',
      });

      expect(commissions).toHaveLength(1);
      expect(commissions[0]).toHaveProperty('commissionId', 'COMM-001');
    });

    it('should pay commission', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await salesRepository.payCommission('COMM-123', new Date('2024-12-31'), 'user-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sales_commissions'),
        [new Date('2024-12-31'), expect.any(String), 'COMM-123']
      );
    });
  });

  // ==========================================================================
  // TERRITORIES
  // ==========================================================================

  describe('Territories', () => {
    it('should create a territory', async () => {
      const mockTerritoryRow = {
        territory_id: 'TERR-123',
        territory_code: 'TERR-WEST',
        territory_name: 'West Region',
        description: 'Western sales territory',
        manager_id: 'user-1',
        territory_type: 'REGION',
        parent_territory_id: null,
        is_active: true,
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockTerritoryRow] });

      const territory = await salesRepository.createTerritory({
        territoryCode: 'TERR-WEST',
        territoryName: 'West Region',
        description: 'Western sales territory',
        managerId: 'user-1',
        territoryType: 'REGION',
        parentTerritoryId: null,
        isActive: true,
      });

      expect(territory).toHaveProperty('territoryId', 'TERR-123');
      expect(territory).toHaveProperty('territoryCode', 'TERR-WEST');
    });

    it('should find territory by ID', async () => {
      const mockTerritoryRow = {
        territory_id: 'TERR-123',
        territory_code: 'TERR-WEST',
        territory_name: 'West Region',
        description: 'Western sales territory',
        manager_id: 'user-1',
        territory_type: 'REGION',
        parent_territory_id: null,
        is_active: true,
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockTerritoryRow] });

      const territory = await salesRepository.findTerritoryById('TERR-123');

      expect(territory).toHaveProperty('territoryId', 'TERR-123');
    });

    it('should return null when territory not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const territory = await salesRepository.findTerritoryById('NONEXISTENT');

      expect(territory).toBeNull();
    });

    it('should find territory by code', async () => {
      const mockTerritoryRow = {
        territory_id: 'TERR-123',
        territory_code: 'TERR-WEST',
        territory_name: 'West Region',
        description: null,
        manager_id: null,
        territory_type: 'REGION',
        parent_territory_id: null,
        is_active: true,
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockTerritoryRow] });

      const territory = await salesRepository.findTerritoryByCode('TERR-WEST');

      expect(territory).toHaveProperty('territoryCode', 'TERR-WEST');
    });

    it('should find all active territories', async () => {
      const mockTerritoryRows = [
        {
          territory_id: 'TERR-001',
          territory_code: 'TERR-WEST',
          territory_name: 'West Region',
          description: null,
          manager_id: null,
          territory_type: 'REGION',
          parent_territory_id: null,
          is_active: true,
          created_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockTerritoryRows });

      const territories = await salesRepository.findAllTerritories();

      expect(territories).toHaveLength(1);
    });

    it('should get territory metrics', async () => {
      const mockMetrics = {
        territory_id: 'TERR-123',
        total_sales: 100000,
        total_orders: 50,
        avg_order_value: 2000,
        conversion_rate: 25,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockMetrics] });

      const metrics = await salesRepository.getTerritoryMetrics('TERR-123');

      expect(metrics).toHaveProperty('total_sales', 100000);
    });

    it('should return null when territory metrics not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const metrics = await salesRepository.getTerritoryMetrics('TERR-123');

      expect(metrics).toBeNull();
    });

    it('should assign territory customer', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const assignment = await salesRepository.assignTerritoryCustomer({
        territoryId: 'TERR-123',
        customerId: 'CUST-001',
        assignedDate: new Date(),
        assignedBy: 'user-1',
        isPrimary: true,
        notes: 'Primary assignment',
      });

      expect(assignment).toHaveProperty('territoryId', 'TERR-123');
      expect(assignment).toHaveProperty('customerId', 'CUST-001');
    });

    it('should create territory quota', async () => {
      const mockQuotaRow = {
        quota_id: 'QUOTA-123',
        territory_id: 'TERR-123',
        quota_year: 2024,
        quota_month: null,
        quota_amount: 1000000,
        quota_type: 'ANNUAL',
        actual_amount: 500000,
        variance_percent: 50,
        status: 'ON_TRACK',
        notes: null,
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockQuotaRow] });

      const quota = await salesRepository.createTerritoryQuota({
        territoryId: 'TERR-123',
        quotaYear: 2024,
        quotaAmount: 1000000,
        quotaType: 'ANNUAL',
        actualAmount: 500000,
        variancePercent: 50,
        status: 'ON_TRACK',
        notes: null,
      });

      expect(quota).toHaveProperty('quotaId', 'QUOTA-123');
      expect(quota).toHaveProperty('quotaAmount', 1000000);
    });
  });

  // ==========================================================================
  // SALES ORDER METRICS
  // ==========================================================================

  describe('Sales Order Metrics', () => {
    it('should get sales order metrics', async () => {
      const mockMetrics = {
        total_orders: '100',
        pending_orders: '10',
        open_orders: '50',
        shipped_today: '5',
        total_revenue: '500000',
        revenue_this_month: '50000',
        average_order_value: '5000',
        backorder_count: '3',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockMetrics] });

      const metrics = await salesRepository.getSalesOrderMetrics();

      expect(metrics).toHaveProperty('totalOrders', 100);
      expect(metrics).toHaveProperty('pendingOrders', 10);
      expect(metrics).toHaveProperty('totalRevenue', 500000);
    });

    it('should find order activity', async () => {
      const mockActivityRows = [
        {
          activity_id: 'ACT-001',
          order_id: 'SO-123',
          activity_type: 'STATUS_CHANGE',
          activity_date: new Date(),
          user_id: 'user-1',
          field_name: 'order_status',
          old_value: 'PENDING',
          new_value: 'CONFIRMED',
          notes: 'Order confirmed',
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockActivityRows });

      const activities = await salesRepository.findOrderActivity('SO-123', 50);

      expect(activities).toHaveLength(1);
      expect(activities[0]).toHaveProperty('activityType', 'STATUS_CHANGE');
      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE order_id = $1'), [
        'SO-123',
        50,
      ]);
    });
  });

  // ==========================================================================
  // HELPER METHOD - camelToSnake
  // ==========================================================================

  describe('camelToSnake', () => {
    it('should convert camelCase to snake_case', async () => {
      // Access private method through a public method that uses it
      const mockQuoteRow = {
        quote_id: 'QT-123',
        quote_number: 'QT-001',
        customer_id: 'CUST-001',
        opportunity_id: null,
        status: QuoteStatus.DRAFT,
        valid_until: new Date('2024-12-31'),
        subtotal: 1000,
        tax_amount: 150,
        discount_amount: 0,
        total_amount: 1150,
        notes: null,
        terms_and_conditions: null,
        created_by: 'user-1',
        created_at: new Date(),
        updated_at: null,
        updated_by: null,
        sent_at: null,
        accepted_at: null,
        rejected_at: null,
        converted_to_order_id: null,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockQuoteRow] });
      mockPool.query.mockResolvedValueOnce({ rows: [mockQuoteRow] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await salesRepository.updateQuote('QT-123', { notes: 'test' });

      // The method should have been called with the snake_case version
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('notes ='),
        expect.any(Array)
      );
    });
  });
});
