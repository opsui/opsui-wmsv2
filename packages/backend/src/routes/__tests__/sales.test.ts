/**
 * Integration tests for sales routes
 * @covers src/routes/sales.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { salesService } from '../../services/SalesService';
import { authenticate, authorize } from '../../middleware';
import { UserRole } from '@opsui/shared';

// Type definitions for enums that might not exist in shared package
type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT';
type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
type OpportunityStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';
type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'sales@example.com',
      role: UserRole.SALES,
      baseRole: UserRole.SALES,
      activeRole: null,
      effectiveRole: UserRole.SALES,
    };
    next();
  }),
  authorize: jest.fn((...allowedRoles: string[]) => (req: any, res: any, next: any) => {
    const user = req.user || { role: UserRole.SALES };
    if (allowedRoles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

// Mock the SalesService
jest.mock('../../services/SalesService', () => {
  const mockModule = jest.requireActual('../../services/SalesService');
  return {
    ...mockModule,
    salesService: {
      getDashboard: jest.fn(),
      createCustomer: jest.fn(),
      getAllCustomers: jest.fn(),
      getCustomerById: jest.fn(),
      updateCustomer: jest.fn(),
      createLead: jest.fn(),
      getAllLeads: jest.fn(),
      getLeadById: jest.fn(),
      updateLead: jest.fn(),
      convertLeadToCustomer: jest.fn(),
      createOpportunity: jest.fn(),
      getAllOpportunities: jest.fn(),
      getOpportunityById: jest.fn(),
      updateOpportunityStage: jest.fn(),
      createQuote: jest.fn(),
      getAllQuotes: jest.fn(),
      getQuoteById: jest.fn(),
      sendQuote: jest.fn(),
      acceptQuote: jest.fn(),
      logInteraction: jest.fn(),
      getCustomerInteractions: jest.fn(),
    },
  };
});

jest.mock('../../config/logger');
jest.mock('../../db/client');

// Local enum constants for testing
const CustomerStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PROSPECT: 'PROSPECT',
} as const;

const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
} as const;

const OpportunityStage = {
  PROSPECTING: 'PROSPECTING',
  QUALIFICATION: 'QUALIFICATION',
  PROPOSAL: 'PROPOSAL',
  NEGOTIATION: 'NEGOTIATION',
  CLOSED_WON: 'CLOSED_WON',
  CLOSED_LOST: 'CLOSED_LOST',
} as const;

const QuoteStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

describe('Sales Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
  });

  // ==========================================================================
  // GET /api/v1/sales/dashboard
  // ==========================================================================

  describe('GET /api/v1/sales/dashboard', () => {
    it('should get sales dashboard', async () => {
      const mockDashboard = {
        totalCustomers: 150,
        activeLeads: 25,
        openOpportunities: 18,
        pendingQuotes: 7,
        monthlyRevenue: 125000,
        conversionRate: 0.32,
      };

      (salesService.getDashboard as jest.MockedFunction<any>).mockResolvedValue(mockDashboard);

      const response = await request(app)
        .get('/api/v1/sales/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockDashboard);
    });
  });

  // ==========================================================================
  // POST /api/v1/sales/customers
  // ==========================================================================

  describe('POST /api/v1/sales/customers', () => {
    it('should create a customer', async () => {
      const customerData = {
        name: 'Acme Corporation',
        contactName: 'John Doe',
        email: 'john@acme.com',
        phone: '555-1234',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA',
        },
      };

      const mockCustomer = {
        customerId: 'customer-001',
        name: 'Acme Corporation',
        contactName: 'John Doe',
        email: 'john@acme.com',
        status: CustomerStatus.ACTIVE,
      };

      (salesService.createCustomer as jest.MockedFunction<any>).mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/v1/sales/customers')
        .set('Authorization', 'Bearer valid-token')
        .send(customerData)
        .expect(201);

      expect(response.body).toMatchObject({
        customerId: 'customer-001',
        name: 'Acme Corporation',
        status: CustomerStatus.ACTIVE,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/sales/customers
  // ==========================================================================

  describe('GET /api/v1/sales/customers', () => {
    it('should get all customers', async () => {
      const mockResult = {
        customers: [
          {
            customerId: 'customer-001',
            name: 'Acme Corporation',
            status: CustomerStatus.ACTIVE,
          },
          {
            customerId: 'customer-002',
            name: 'Globex Inc',
            status: CustomerStatus.ACTIVE,
          },
        ],
        total: 2,
      };

      (salesService.getAllCustomers as jest.MockedFunction<any>).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/sales/customers')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should filter by status', async () => {
      (salesService.getAllCustomers as jest.MockedFunction<any>).mockResolvedValue({
        customers: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/sales/customers?status=ACTIVE')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(salesService.getAllCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ status: CustomerStatus.ACTIVE })
      );
    });

    it('should support pagination', async () => {
      (salesService.getAllCustomers as jest.MockedFunction<any>).mockResolvedValue({
        customers: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/sales/customers?limit=25&offset=50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(salesService.getAllCustomers).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 50 })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/sales/customers/:customerId
  // ==========================================================================

  describe('GET /api/v1/sales/customers/:customerId', () => {
    it('should get a customer by ID', async () => {
      const mockCustomer = {
        customerId: 'customer-001',
        name: 'Acme Corporation',
        contactName: 'John Doe',
        email: 'john@acme.com',
        phone: '555-1234',
        status: CustomerStatus.ACTIVE,
      };

      (salesService.getCustomerById as jest.MockedFunction<any>).mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get('/api/v1/sales/customers/customer-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockCustomer);
    });
  });

  // ==========================================================================
  // PUT /api/v1/sales/customers/:customerId
  // ==========================================================================

  describe('PUT /api/v1/sales/customers/:customerId', () => {
    it('should update a customer', async () => {
      const updateData = {
        name: 'Acme Corporation Updated',
        contactName: 'Jane Doe',
      };

      const mockCustomer = {
        customerId: 'customer-001',
        name: 'Acme Corporation Updated',
        contactName: 'Jane Doe',
        email: 'john@acme.com',
        status: CustomerStatus.ACTIVE,
      };

      (salesService.updateCustomer as jest.MockedFunction<any>).mockResolvedValue(mockCustomer);

      const response = await request(app)
        .put('/api/v1/sales/customers/customer-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        customerId: 'customer-001',
        name: 'Acme Corporation Updated',
        contactName: 'Jane Doe',
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/sales/leads
  // ==========================================================================

  describe('POST /api/v1/sales/leads', () => {
    it('should create a lead', async () => {
      const leadData = {
        companyName: 'New Lead Corp',
        contactName: 'Sarah Smith',
        email: 'sarah@newlead.com',
        phone: '555-5678',
        source: 'WEBSITE',
        notes: 'Interested in bulk orders',
      };

      const mockLead = {
        leadId: 'lead-001',
        companyName: 'New Lead Corp',
        contactName: 'Sarah Smith',
        email: 'sarah@newlead.com',
        status: LeadStatus.NEW,
        source: 'WEBSITE',
      };

      (salesService.createLead as jest.MockedFunction<any>).mockResolvedValue(mockLead);

      const response = await request(app)
        .post('/api/v1/sales/leads')
        .set('Authorization', 'Bearer valid-token')
        .send(leadData)
        .expect(201);

      expect(response.body).toMatchObject({
        leadId: 'lead-001',
        companyName: 'New Lead Corp',
        status: LeadStatus.NEW,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/sales/leads
  // ==========================================================================

  describe('GET /api/v1/sales/leads', () => {
    it('should get all leads', async () => {
      const mockResult = {
        leads: [
          {
            leadId: 'lead-001',
            companyName: 'Acme Corp',
            status: LeadStatus.NEW,
          },
          {
            leadId: 'lead-002',
            companyName: 'Globex Inc',
            status: LeadStatus.CONTACTED,
          },
        ],
        total: 2,
      };

      (salesService.getAllLeads as jest.MockedFunction<any>).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/sales/leads')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should filter by status', async () => {
      (salesService.getAllLeads as jest.MockedFunction<any>).mockResolvedValue({
        leads: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/sales/leads?status=NEW')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(salesService.getAllLeads).toHaveBeenCalledWith(
        expect.objectContaining({ status: LeadStatus.NEW })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/sales/leads/:leadId
  // ==========================================================================

  describe('GET /api/v1/sales/leads/:leadId', () => {
    it('should get a lead by ID', async () => {
      const mockLead = {
        leadId: 'lead-001',
        companyName: 'Acme Corp',
        contactName: 'John Doe',
        email: 'john@acme.com',
        status: LeadStatus.NEW,
      };

      (salesService.getLeadById as jest.MockedFunction<any>).mockResolvedValue(mockLead);

      const response = await request(app)
        .get('/api/v1/sales/leads/lead-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockLead);
    });
  });

  // ==========================================================================
  // PUT /api/v1/sales/leads/:leadId
  // ==========================================================================

  describe('PUT /api/v1/sales/leads/:leadId', () => {
    it('should update a lead', async () => {
      const updateData = {
        companyName: 'Updated Corp',
        status: LeadStatus.CONTACTED,
      };

      const mockLead = {
        leadId: 'lead-001',
        companyName: 'Updated Corp',
        contactName: 'John Doe',
        status: LeadStatus.CONTACTED,
      };

      (salesService.updateLead as jest.MockedFunction<any>).mockResolvedValue(mockLead);

      const response = await request(app)
        .put('/api/v1/sales/leads/lead-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        leadId: 'lead-001',
        companyName: 'Updated Corp',
        status: LeadStatus.CONTACTED,
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/sales/leads/:leadId/convert
  // ==========================================================================

  describe('POST /api/v1/sales/leads/:leadId/convert', () => {
    it('should convert a lead to a customer', async () => {
      const mockCustomer = {
        customerId: 'customer-001',
        name: 'Converted from Lead',
        contactName: 'John Doe',
        status: CustomerStatus.ACTIVE,
      };

      (salesService.convertLeadToCustomer as jest.MockedFunction<any>).mockResolvedValue(
        mockCustomer
      );

      const response = await request(app)
        .post('/api/v1/sales/leads/lead-001/convert')
        .set('Authorization', 'Bearer valid-token')
        .expect(201);

      expect(response.body).toMatchObject({
        customerId: 'customer-001',
        status: CustomerStatus.ACTIVE,
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/sales/opportunities
  // ==========================================================================

  describe('POST /api/v1/sales/opportunities', () => {
    it('should create an opportunity', async () => {
      const opportunityData = {
        customerId: 'customer-001',
        title: 'Bulk Order Opportunity',
        description: 'Large order for Q4',
        estimatedValue: 50000,
        stage: OpportunityStage.PROSPECTING,
        probability: 20,
      };

      const mockOpportunity = {
        opportunityId: 'opp-001',
        customerId: 'customer-001',
        title: 'Bulk Order Opportunity',
        estimatedValue: 50000,
        stage: OpportunityStage.PROSPECTING,
      };

      (salesService.createOpportunity as jest.MockedFunction<any>).mockResolvedValue(
        mockOpportunity
      );

      const response = await request(app)
        .post('/api/v1/sales/opportunities')
        .set('Authorization', 'Bearer valid-token')
        .send(opportunityData)
        .expect(201);

      expect(response.body).toMatchObject({
        opportunityId: 'opp-001',
        title: 'Bulk Order Opportunity',
        stage: OpportunityStage.PROSPECTING,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/sales/opportunities
  // ==========================================================================

  describe('GET /api/v1/sales/opportunities', () => {
    it('should get all opportunities', async () => {
      const mockResult = {
        opportunities: [
          {
            opportunityId: 'opp-001',
            title: 'Opportunity 1',
            stage: OpportunityStage.PROPOSAL,
            estimatedValue: 25000,
          },
          {
            opportunityId: 'opp-002',
            title: 'Opportunity 2',
            stage: OpportunityStage.NEGOTIATION,
            estimatedValue: 75000,
          },
        ],
        total: 2,
      };

      (salesService.getAllOpportunities as jest.MockedFunction<any>).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/sales/opportunities')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should filter by stage', async () => {
      (salesService.getAllOpportunities as jest.MockedFunction<any>).mockResolvedValue({
        opportunities: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/sales/opportunities?stage=PROPOSAL')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(salesService.getAllOpportunities).toHaveBeenCalledWith(
        expect.objectContaining({ stage: OpportunityStage.PROPOSAL })
      );
    });

    it('should filter by customer ID', async () => {
      (salesService.getAllOpportunities as jest.MockedFunction<any>).mockResolvedValue({
        opportunities: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/sales/opportunities?customerId=customer-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(salesService.getAllOpportunities).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'customer-001' })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/sales/opportunities/:opportunityId
  // ==========================================================================

  describe('GET /api/v1/sales/opportunities/:opportunityId', () => {
    it('should get an opportunity by ID', async () => {
      const mockOpportunity = {
        opportunityId: 'opp-001',
        customerId: 'customer-001',
        title: 'Bulk Order Opportunity',
        stage: OpportunityStage.PROPOSAL,
        estimatedValue: 50000,
      };

      (salesService.getOpportunityById as jest.MockedFunction<any>).mockResolvedValue(
        mockOpportunity
      );

      const response = await request(app)
        .get('/api/v1/sales/opportunities/opp-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockOpportunity);
    });
  });

  // ==========================================================================
  // PUT /api/v1/sales/opportunities/:opportunityId/stage
  // ==========================================================================

  describe('PUT /api/v1/sales/opportunities/:opportunityId/stage', () => {
    it('should update opportunity stage', async () => {
      const updateData = {
        stage: OpportunityStage.NEGOTIATION,
      };

      const mockOpportunity = {
        opportunityId: 'opp-001',
        title: 'Bulk Order Opportunity',
        stage: OpportunityStage.NEGOTIATION,
        estimatedValue: 50000,
      };

      (salesService.updateOpportunityStage as jest.MockedFunction<any>).mockResolvedValue(
        mockOpportunity
      );

      const response = await request(app)
        .put('/api/v1/sales/opportunities/opp-001/stage')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        opportunityId: 'opp-001',
        stage: OpportunityStage.NEGOTIATION,
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/sales/quotes
  // ==========================================================================

  describe('POST /api/v1/sales/quotes', () => {
    it('should create a quote', async () => {
      const quoteData = {
        customerId: 'customer-001',
        opportunityId: 'opp-001',
        validUntil: '2026-03-01',
        items: [
          {
            sku: 'SKU-001',
            name: 'Product 1',
            quantity: 100,
            unitPrice: 50,
          },
        ],
      };

      const mockQuote = {
        quoteId: 'quote-001',
        customerId: 'customer-001',
        opportunityId: 'opp-001',
        status: QuoteStatus.DRAFT,
        totalAmount: 5000,
      };

      (salesService.createQuote as jest.MockedFunction<any>).mockResolvedValue(mockQuote);

      const response = await request(app)
        .post('/api/v1/sales/quotes')
        .set('Authorization', 'Bearer valid-token')
        .send(quoteData)
        .expect(201);

      expect(response.body).toMatchObject({
        quoteId: 'quote-001',
        status: QuoteStatus.DRAFT,
        totalAmount: 5000,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/sales/quotes
  // ==========================================================================

  describe('GET /api/v1/sales/quotes', () => {
    it('should get all quotes', async () => {
      const mockResult = {
        quotes: [
          {
            quoteId: 'quote-001',
            customerId: 'customer-001',
            status: QuoteStatus.DRAFT,
            totalAmount: 5000,
          },
          {
            quoteId: 'quote-002',
            customerId: 'customer-002',
            status: QuoteStatus.SENT,
            totalAmount: 7500,
          },
        ],
        total: 2,
      };

      (salesService.getAllQuotes as jest.MockedFunction<any>).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/sales/quotes')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should filter by status', async () => {
      (salesService.getAllQuotes as jest.MockedFunction<any>).mockResolvedValue({
        quotes: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/sales/quotes?status=DRAFT')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(salesService.getAllQuotes).toHaveBeenCalledWith(
        expect.objectContaining({ status: QuoteStatus.DRAFT })
      );
    });

    it('should filter by customer ID', async () => {
      (salesService.getAllQuotes as jest.MockedFunction<any>).mockResolvedValue({
        quotes: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/sales/quotes?customerId=customer-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(salesService.getAllQuotes).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'customer-001' })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/sales/quotes/:quoteId
  // ==========================================================================

  describe('GET /api/v1/sales/quotes/:quoteId', () => {
    it('should get a quote by ID', async () => {
      const mockQuote = {
        quoteId: 'quote-001',
        customerId: 'customer-001',
        status: QuoteStatus.DRAFT,
        totalAmount: 5000,
        items: [],
      };

      (salesService.getQuoteById as jest.MockedFunction<any>).mockResolvedValue(mockQuote);

      const response = await request(app)
        .get('/api/v1/sales/quotes/quote-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockQuote);
    });
  });

  // ==========================================================================
  // POST /api/v1/sales/quotes/:quoteId/send
  // ==========================================================================

  describe('POST /api/v1/sales/quotes/:quoteId/send', () => {
    it('should send a quote', async () => {
      const mockQuote = {
        quoteId: 'quote-001',
        status: QuoteStatus.SENT,
        sentAt: new Date(),
      };

      (salesService.sendQuote as jest.MockedFunction<any>).mockResolvedValue(mockQuote);

      const response = await request(app)
        .post('/api/v1/sales/quotes/quote-001/send')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        quoteId: 'quote-001',
        status: QuoteStatus.SENT,
        sentAt: expect.any(String),
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/sales/quotes/:quoteId/accept
  // ==========================================================================

  describe('POST /api/v1/sales/quotes/:quoteId/accept', () => {
    it('should accept a quote', async () => {
      const mockQuote = {
        quoteId: 'quote-001',
        status: QuoteStatus.ACCEPTED,
        acceptedAt: new Date(),
      };

      (salesService.acceptQuote as jest.MockedFunction<any>).mockResolvedValue(mockQuote);

      const response = await request(app)
        .post('/api/v1/sales/quotes/quote-001/accept')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        quoteId: 'quote-001',
        status: QuoteStatus.ACCEPTED,
        acceptedAt: expect.any(String),
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/sales/interactions
  // ==========================================================================

  describe('POST /api/v1/sales/interactions', () => {
    it('should log a customer interaction', async () => {
      const interactionData = {
        customerId: 'customer-001',
        type: 'CALL',
        subject: 'Follow-up call',
        notes: 'Discussed Q4 requirements',
      };

      const mockInteraction = {
        interactionId: 'interaction-001',
        customerId: 'customer-001',
        type: 'CALL',
        subject: 'Follow-up call',
        notes: 'Discussed Q4 requirements',
      };

      (salesService.logInteraction as jest.MockedFunction<any>).mockResolvedValue(mockInteraction);

      const response = await request(app)
        .post('/api/v1/sales/interactions')
        .set('Authorization', 'Bearer valid-token')
        .send(interactionData)
        .expect(201);

      expect(response.body).toMatchObject({
        interactionId: 'interaction-001',
        type: 'CALL',
        subject: 'Follow-up call',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/sales/customers/:customerId/interactions
  // ==========================================================================

  describe('GET /api/v1/sales/customers/:customerId/interactions', () => {
    it('should get customer interactions', async () => {
      const mockInteractions = [
        {
          interactionId: 'interaction-001',
          customerId: 'customer-001',
          type: 'CALL',
          subject: 'Initial contact',
        },
        {
          interactionId: 'interaction-002',
          customerId: 'customer-001',
          type: 'EMAIL',
          subject: 'Quote sent',
        },
      ];

      (salesService.getCustomerInteractions as jest.MockedFunction<any>).mockResolvedValue(
        mockInteractions
      );

      const response = await request(app)
        .get('/api/v1/sales/customers/customer-001/interactions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        interactions: mockInteractions,
        count: 2,
      });
    });

    it('should support limit parameter', async () => {
      (salesService.getCustomerInteractions as jest.MockedFunction<any>).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/sales/customers/customer-001/interactions?limit=10')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(salesService.getCustomerInteractions).toHaveBeenCalledWith('customer-001', 10);
    });
  });
});
