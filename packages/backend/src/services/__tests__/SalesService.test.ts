/**
 * Unit tests for SalesService
 * @covers src/services/SalesService.ts
 */

import { SalesService } from '../SalesService';
import {
  Customer,
  Lead,
  Opportunity,
  Quote,
  CustomerInteraction,
  CreateCustomerDTO,
  CreateLeadDTO,
  CreateOpportunityDTO,
  CreateQuoteDTO,
  CustomerStatus,
  LeadStatus,
  LeadPriority,
  OpportunityStage,
  QuoteStatus,
  NotFoundError,
} from '@opsui/shared';

// Define Address type inline to avoid conflicts between the generic Address type and sales-crm Address
type SalesAddress = {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

// Mock all dependencies
jest.mock('../../repositories/SalesRepository', () => ({
  salesRepository: {
    createCustomer: jest.fn(),
    findCustomerById: jest.fn(),
    findAllCustomers: jest.fn(),
    updateCustomer: jest.fn(),
    createLead: jest.fn(),
    findLeadById: jest.fn(),
    findAllLeads: jest.fn(),
    updateLead: jest.fn(),
    createOpportunity: jest.fn(),
    findOpportunityById: jest.fn(),
    findAllOpportunities: jest.fn(),
    updateOpportunity: jest.fn(),
    createQuote: jest.fn(),
    findQuoteById: jest.fn(),
    findAllQuotes: jest.fn(),
    updateQuote: jest.fn(),
    createInteraction: jest.fn(),
    findInteractionsByCustomer: jest.fn(),
  },
}));

describe('SalesService', () => {
  let salesService: SalesService;

  // Helper to create mock customer
  const createMockCustomer = (overrides: any = {}): Customer => ({
    customerId: 'CUST-001',
    customerNumber: 'CUST-00001',
    companyName: 'Test Company',
    contactName: 'John Doe',
    email: 'john@test.com',
    phone: '+1234567890',
    billingAddress: {
      street1: '123 Main St',
      city: 'Auckland',
      state: 'Auckland',
      postalCode: '1010',
      country: 'NZ',
    } as any, // Use 'as any' because Address type conflicts
    status: CustomerStatus.PROSPECT,
    createdBy: 'user-123',
    createdAt: new Date(),
    ...overrides,
  });

  // Helper to create mock lead
  const createMockLead = (overrides: any = {}): Lead => ({
    leadId: 'LEAD-001',
    customerName: 'Test Customer',
    contactName: 'Jane Doe',
    email: 'jane@test.com',
    phone: '+1234567890',
    company: 'Test Company',
    status: LeadStatus.NEW,
    priority: LeadPriority.MEDIUM,
    source: 'Website',
    assignedTo: 'user-123',
    createdBy: 'user-123',
    createdAt: new Date(),
    ...overrides,
  });

  // Helper to create mock opportunity
  const createMockOpportunity = (overrides: any = {}): Opportunity => ({
    opportunityId: 'OPP-001',
    opportunityNumber: 'OPP-00001',
    customerId: 'CUST-001',
    name: 'Test Opportunity',
    stage: OpportunityStage.PROSPECTING,
    amount: 10000,
    probability: 50,
    expectedCloseDate: new Date('2024-12-31'),
    source: 'Website',
    assignedTo: 'user-123',
    createdBy: 'user-123',
    createdAt: new Date(),
    ...overrides,
  });

  // Helper to create mock quote
  const createMockQuote = (overrides: any = {}): Quote => ({
    quoteId: 'QUOTE-001',
    quoteNumber: 'QT-00001',
    customerId: 'CUST-001',
    status: QuoteStatus.DRAFT,
    validUntil: new Date('2024-12-31'),
    lineItems: [
      {
        lineItemId: 'LINE-001',
        quoteId: 'QUOTE-001',
        sku: 'SKU-001',
        description: 'Test Product',
        quantity: 10,
        unitPrice: 100,
        discount: 0,
        taxRate: 0.15,
        lineNumber: 1,
        total: 1150,
      },
    ],
    subtotal: 1000,
    taxAmount: 150,
    discountAmount: 0,
    totalAmount: 1150,
    createdBy: 'user-123',
    createdAt: new Date(),
    ...overrides,
  });

  // Helper to create mock interaction
  const createMockInteraction = (overrides: any = {}): CustomerInteraction => ({
    interactionId: 'INT-001',
    customerId: 'CUST-001',
    interactionType: 'CALL',
    subject: 'Test Subject',
    notes: 'Test notes',
    createdBy: 'user-123',
    createdAt: new Date(),
    ...overrides,
  });

  // Helper to create valid address
  const createValidAddress = (): SalesAddress => ({
    street1: '123 Main St',
    city: 'Auckland',
    state: 'Auckland',
    postalCode: '1010',
    country: 'NZ',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    salesService = new SalesService();
  });

  // ==========================================================================
  // CUSTOMERS
  // ==========================================================================

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const dto: CreateCustomerDTO = {
        companyName: 'Test Company',
        contactName: 'John Doe',
        email: 'john@test.com',
        phone: '+1234567890',
        billingAddress: createValidAddress(),
      };

      const mockCustomer = createMockCustomer({ companyName: 'Test Company' });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.createCustomer.mockResolvedValue(mockCustomer);

      const result = await salesService.createCustomer(dto, 'user-123');

      expect(result.companyName).toBe('Test Company');
      expect(result.status).toBe(CustomerStatus.PROSPECT);
      expect(salesRepository.createCustomer).toHaveBeenCalledWith({
        ...dto,
        status: CustomerStatus.PROSPECT,
        createdBy: 'user-123',
      });
    });

    it('should throw error when company name is missing', async () => {
      const dto: CreateCustomerDTO = {
        companyName: '',
        billingAddress: createValidAddress(),
      };

      await expect(salesService.createCustomer(dto, 'user-123')).rejects.toThrow(
        'Company name is required'
      );
    });

    it('should throw error when billing address is missing', async () => {
      const dto: CreateCustomerDTO = {
        companyName: 'Test Company',
        billingAddress: undefined as any,
      };

      await expect(salesService.createCustomer(dto, 'user-123')).rejects.toThrow(
        'Billing address is required'
      );
    });
  });

  describe('getCustomerById', () => {
    it('should return a customer by ID', async () => {
      const mockCustomer = createMockCustomer();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(mockCustomer);

      const result = await salesService.getCustomerById('CUST-001');

      expect(result).toEqual(mockCustomer);
      expect(salesRepository.findCustomerById).toHaveBeenCalledWith('CUST-001');
    });

    it('should throw NotFoundError when customer not found', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(null);

      await expect(salesService.getCustomerById('NONEXISTENT')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllCustomers', () => {
    it('should return all customers', async () => {
      const mockCustomers = [createMockCustomer(), createMockCustomer({ customerId: 'CUST-002' })];
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllCustomers.mockResolvedValue({
        customers: mockCustomers,
        total: 2,
      });

      const result = await salesService.getAllCustomers();

      expect(result.customers).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter customers by status', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllCustomers.mockResolvedValue({
        customers: [],
        total: 0,
      });

      await salesService.getAllCustomers({ status: CustomerStatus.ACTIVE });

      expect(salesRepository.findAllCustomers).toHaveBeenCalledWith({
        status: CustomerStatus.ACTIVE,
      });
    });

    it('should support pagination', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllCustomers.mockResolvedValue({
        customers: [],
        total: 0,
      });

      await salesService.getAllCustomers({ limit: 10, offset: 20 });

      expect(salesRepository.findAllCustomers).toHaveBeenCalledWith({
        limit: 10,
        offset: 20,
      });
    });
  });

  describe('updateCustomer', () => {
    it('should update a customer', async () => {
      const existingCustomer = createMockCustomer();
      const updatedCustomer = createMockCustomer({ companyName: 'Updated Company' });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(existingCustomer);
      salesRepository.updateCustomer.mockResolvedValue(updatedCustomer);

      const result = await salesService.updateCustomer(
        'CUST-001',
        { companyName: 'Updated Company' },
        'user-123'
      );

      expect(result.companyName).toBe('Updated Company');
      expect(salesRepository.updateCustomer).toHaveBeenCalledWith('CUST-001', {
        companyName: 'Updated Company',
        updatedBy: 'user-123',
      });
    });

    it('should throw NotFoundError when updating non-existent customer', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(null);

      await expect(
        salesService.updateCustomer('NONEXISTENT', { companyName: 'Test' }, 'user-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // LEADS
  // ==========================================================================

  describe('createLead', () => {
    it('should create a lead successfully', async () => {
      const dto: CreateLeadDTO = {
        customerName: 'Test Customer',
        contactName: 'Jane Doe',
        email: 'jane@test.com',
        phone: '+1234567890',
        company: 'Test Company',
        source: 'Website',
        assignedTo: 'user-123',
      };

      const mockLead = createMockLead();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.createLead.mockResolvedValue(mockLead);

      const result = await salesService.createLead(dto, 'user-123');

      expect(result.customerName).toBe('Test Customer');
      expect(result.status).toBe(LeadStatus.NEW);
      expect(result.priority).toBe(LeadPriority.MEDIUM);
    });

    it('should throw error when customer name is missing', async () => {
      const dto: CreateLeadDTO = {
        customerName: '',
        source: 'Website',
        assignedTo: 'user-123',
      };

      await expect(salesService.createLead(dto, 'user-123')).rejects.toThrow(
        'Customer name is required'
      );
    });

    it('should throw error when source is missing', async () => {
      const dto: CreateLeadDTO = {
        customerName: 'Test Customer',
        source: '',
        assignedTo: 'user-123',
      };

      await expect(salesService.createLead(dto, 'user-123')).rejects.toThrow(
        'Lead source is required'
      );
    });

    it('should throw error when assignedTo is missing', async () => {
      const dto: CreateLeadDTO = {
        customerName: 'Test Customer',
        source: 'Website',
        assignedTo: '',
      };

      await expect(salesService.createLead(dto, 'user-123')).rejects.toThrow(
        'Lead must be assigned to a user'
      );
    });

    it('should parse expected close date when provided', async () => {
      const dto: CreateLeadDTO = {
        customerName: 'Test Customer',
        source: 'Website',
        assignedTo: 'user-123',
        expectedCloseDate: '2024-12-31',
      };

      const mockLead = createMockLead({
        expectedCloseDate: new Date('2024-12-31'),
      });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.createLead.mockResolvedValue(mockLead);

      await salesService.createLead(dto, 'user-123');

      expect(salesRepository.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedCloseDate: expect.any(Date),
        })
      );
    });
  });

  describe('getLeadById', () => {
    it('should return a lead by ID', async () => {
      const mockLead = createMockLead();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findLeadById.mockResolvedValue(mockLead);

      const result = await salesService.getLeadById('LEAD-001');

      expect(result).toEqual(mockLead);
    });

    it('should throw NotFoundError when lead not found', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findLeadById.mockResolvedValue(null);

      await expect(salesService.getLeadById('NONEXISTENT')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllLeads', () => {
    it('should return all leads', async () => {
      const mockLeads = [createMockLead(), createMockLead({ leadId: 'LEAD-002' })];
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllLeads.mockResolvedValue({
        leads: mockLeads,
        total: 2,
      });

      const result = await salesService.getAllLeads();

      expect(result.leads).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter leads by status', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllLeads.mockResolvedValue({
        leads: [],
        total: 0,
      });

      await salesService.getAllLeads({ status: LeadStatus.NEW });

      expect(salesRepository.findAllLeads).toHaveBeenCalledWith({
        status: LeadStatus.NEW,
      });
    });
  });

  describe('updateLead', () => {
    it('should update a lead', async () => {
      const existingLead = createMockLead();
      const updatedLead = createMockLead({ customerName: 'Updated Customer' });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findLeadById.mockResolvedValue(existingLead);
      salesRepository.updateLead.mockResolvedValue(updatedLead);

      const result = await salesService.updateLead(
        'LEAD-001',
        { customerName: 'Updated Customer' },
        'user-123'
      );

      expect(result.customerName).toBe('Updated Customer');
    });

    it('should throw NotFoundError when updating non-existent lead', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findLeadById.mockResolvedValue(null);

      await expect(
        salesService.updateLead('NONEXISTENT', { customerName: 'Test' }, 'user-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('convertLeadToCustomer', () => {
    it('should convert a lead to a customer', async () => {
      const mockLead = createMockLead({
        leadId: 'LEAD-001',
        company: 'Test Company',
        customerName: 'Test Customer',
        status: LeadStatus.NEW,
      });
      const mockCustomer = createMockCustomer({
        companyName: 'Test Company',
        contactName: 'Test Customer',
      });

      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findLeadById.mockResolvedValue(mockLead);
      salesRepository.createCustomer.mockResolvedValue(mockCustomer);
      salesRepository.updateLead.mockResolvedValue(mockLead);

      const result = await salesService.convertLeadToCustomer('LEAD-001', 'user-123');

      expect(result.companyName).toBe('Test Company');
      expect(salesRepository.createCustomer).toHaveBeenCalled();
      expect(salesRepository.updateLead).toHaveBeenCalledWith('LEAD-001', {
        status: LeadStatus.WON,
        updatedBy: 'user-123',
      });
    });

    it('should throw error when lead is already converted', async () => {
      const mockLead = createMockLead({ status: LeadStatus.WON });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findLeadById.mockResolvedValue(mockLead);

      await expect(salesService.convertLeadToCustomer('LEAD-001', 'user-123')).rejects.toThrow(
        'Lead already converted'
      );
    });

    it('should use company name if available, otherwise customerName', async () => {
      const mockLead = createMockLead({
        company: 'Test Company',
        customerName: 'Test Customer',
        status: LeadStatus.NEW,
      });
      const mockCustomer = createMockCustomer({ companyName: 'Test Company' });

      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findLeadById.mockResolvedValue(mockLead);
      salesRepository.createCustomer.mockResolvedValue(mockCustomer);
      salesRepository.updateLead.mockResolvedValue(mockLead);

      await salesService.convertLeadToCustomer('LEAD-001', 'user-123');

      expect(salesRepository.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Test Company',
        })
      );
    });

    it('should fall back to customerName when company is not provided', async () => {
      const mockLead = createMockLead({
        company: undefined,
        customerName: 'Test Customer',
        status: LeadStatus.NEW,
      });
      const mockCustomer = createMockCustomer({ companyName: 'Test Customer' });

      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findLeadById.mockResolvedValue(mockLead);
      salesRepository.createCustomer.mockResolvedValue(mockCustomer);
      salesRepository.updateLead.mockResolvedValue(mockLead);

      await salesService.convertLeadToCustomer('LEAD-001', 'user-123');

      expect(salesRepository.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Test Customer',
        })
      );
    });
  });

  // ==========================================================================
  // OPPORTUNITIES
  // ==========================================================================

  describe('createOpportunity', () => {
    it('should create an opportunity successfully', async () => {
      const dto: CreateOpportunityDTO = {
        customerId: 'CUST-001',
        name: 'Test Opportunity',
        amount: 10000,
        expectedCloseDate: '2024-12-31',
        stage: OpportunityStage.PROSPECTING,
        source: 'Website',
        assignedTo: 'user-123',
      };

      const mockOpportunity = createMockOpportunity();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.createOpportunity.mockResolvedValue(mockOpportunity);

      const result = await salesService.createOpportunity(dto, 'user-123');

      expect(result.name).toBe('Test Opportunity');
      expect(result.amount).toBe(10000);
    });

    it('should use default probability of 50 when not provided', async () => {
      const dto: CreateOpportunityDTO = {
        name: 'Test Opportunity',
        amount: 10000,
        expectedCloseDate: '2024-12-31',
        stage: OpportunityStage.PROSPECTING,
        source: 'Website',
        assignedTo: 'user-123',
      };

      const mockOpportunity = createMockOpportunity({ probability: 50 });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.createOpportunity.mockResolvedValue(mockOpportunity);

      await salesService.createOpportunity(dto, 'user-123');

      expect(salesRepository.createOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          probability: 50,
        })
      );
    });

    it('should use provided probability when specified', async () => {
      const dto: CreateOpportunityDTO = {
        name: 'Test Opportunity',
        amount: 10000,
        expectedCloseDate: '2024-12-31',
        stage: OpportunityStage.PROSPECTING,
        probability: 75,
        source: 'Website',
        assignedTo: 'user-123',
      };

      const mockOpportunity = createMockOpportunity({ probability: 75 });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.createOpportunity.mockResolvedValue(mockOpportunity);

      await salesService.createOpportunity(dto, 'user-123');

      expect(salesRepository.createOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          probability: 75,
        })
      );
    });

    it('should throw error when name is missing', async () => {
      const dto: CreateOpportunityDTO = {
        name: '',
        amount: 10000,
        expectedCloseDate: '2024-12-31',
        stage: OpportunityStage.PROSPECTING,
        source: 'Website',
        assignedTo: 'user-123',
      };

      await expect(salesService.createOpportunity(dto, 'user-123')).rejects.toThrow(
        'Opportunity name is required'
      );
    });

    it('should throw error when amount is zero or negative', async () => {
      const dto: CreateOpportunityDTO = {
        name: 'Test Opportunity',
        amount: 0,
        expectedCloseDate: '2024-12-31',
        stage: OpportunityStage.PROSPECTING,
        source: 'Website',
        assignedTo: 'user-123',
      };

      await expect(salesService.createOpportunity(dto, 'user-123')).rejects.toThrow(
        'Amount must be greater than 0'
      );
    });

    it('should throw error when expectedCloseDate is missing', async () => {
      const dto: CreateOpportunityDTO = {
        name: 'Test Opportunity',
        amount: 10000,
        expectedCloseDate: '',
        stage: OpportunityStage.PROSPECTING,
        source: 'Website',
        assignedTo: 'user-123',
      } as any;

      await expect(salesService.createOpportunity(dto, 'user-123')).rejects.toThrow(
        'Expected close date is required'
      );
    });

    it('should throw error when assignedTo is missing', async () => {
      const dto: CreateOpportunityDTO = {
        name: 'Test Opportunity',
        amount: 10000,
        expectedCloseDate: '2024-12-31',
        stage: OpportunityStage.PROSPECTING,
        source: 'Website',
        assignedTo: '',
      };

      await expect(salesService.createOpportunity(dto, 'user-123')).rejects.toThrow(
        'Opportunity must be assigned to a user'
      );
    });
  });

  describe('getOpportunityById', () => {
    it('should return an opportunity by ID', async () => {
      const mockOpportunity = createMockOpportunity();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findOpportunityById.mockResolvedValue(mockOpportunity);

      const result = await salesService.getOpportunityById('OPP-001');

      expect(result).toEqual(mockOpportunity);
    });

    it('should throw NotFoundError when opportunity not found', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findOpportunityById.mockResolvedValue(null);

      await expect(salesService.getOpportunityById('NONEXISTENT')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllOpportunities', () => {
    it('should return all opportunities', async () => {
      const mockOpportunities = [
        createMockOpportunity(),
        createMockOpportunity({ opportunityId: 'OPP-002' }),
      ];
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllOpportunities.mockResolvedValue({
        opportunities: mockOpportunities,
        total: 2,
      });

      const result = await salesService.getAllOpportunities();

      expect(result.opportunities).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter opportunities by stage', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllOpportunities.mockResolvedValue({
        opportunities: [],
        total: 0,
      });

      await salesService.getAllOpportunities({ stage: OpportunityStage.PROPOSAL });

      expect(salesRepository.findAllOpportunities).toHaveBeenCalledWith({
        stage: OpportunityStage.PROPOSAL,
      });
    });
  });

  describe('updateOpportunityStage', () => {
    it('should update opportunity stage', async () => {
      const existingOpp = createMockOpportunity({
        stage: OpportunityStage.PROSPECTING,
      });
      const updatedOpp = createMockOpportunity({
        stage: OpportunityStage.PROPOSAL,
      });

      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findOpportunityById.mockResolvedValue(existingOpp);
      salesRepository.updateOpportunity.mockResolvedValue(updatedOpp);

      const result = await salesService.updateOpportunityStage(
        'OPP-001',
        OpportunityStage.PROPOSAL,
        'user-123'
      );

      expect(result.stage).toBe(OpportunityStage.PROPOSAL);
      expect(salesRepository.updateOpportunity).toHaveBeenCalledWith('OPP-001', {
        stage: OpportunityStage.PROPOSAL,
        updatedBy: 'user-123',
      });
    });

    it('should set closedAt and closedBy when closing as won', async () => {
      const existingOpp = createMockOpportunity({
        stage: OpportunityStage.NEGOTIATION,
      });
      const updatedOpp = createMockOpportunity({
        stage: OpportunityStage.CLOSED_WON,
        closedAt: new Date(),
        closedBy: 'user-123',
      });

      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findOpportunityById.mockResolvedValue(existingOpp);
      salesRepository.updateOpportunity.mockResolvedValue(updatedOpp);

      await salesService.updateOpportunityStage('OPP-001', OpportunityStage.CLOSED_WON, 'user-123');

      expect(salesRepository.updateOpportunity).toHaveBeenCalledWith('OPP-001', {
        stage: OpportunityStage.CLOSED_WON,
        updatedBy: 'user-123',
        closedAt: expect.any(Date),
        closedBy: 'user-123',
      });
    });

    it('should set closedAt and closedBy when closing as lost', async () => {
      const existingOpp = createMockOpportunity({
        stage: OpportunityStage.NEGOTIATION,
      });
      const updatedOpp = createMockOpportunity({
        stage: OpportunityStage.CLOSED_LOST,
        closedAt: new Date(),
        closedBy: 'user-123',
      });

      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findOpportunityById.mockResolvedValue(existingOpp);
      salesRepository.updateOpportunity.mockResolvedValue(updatedOpp);

      await salesService.updateOpportunityStage(
        'OPP-001',
        OpportunityStage.CLOSED_LOST,
        'user-123'
      );

      expect(salesRepository.updateOpportunity).toHaveBeenCalledWith('OPP-001', {
        stage: OpportunityStage.CLOSED_LOST,
        updatedBy: 'user-123',
        closedAt: expect.any(Date),
        closedBy: 'user-123',
      });
    });

    it('should not set closedAt and closedBy for non-closing stages', async () => {
      const existingOpp = createMockOpportunity({
        stage: OpportunityStage.PROSPECTING,
      });
      const updatedOpp = createMockOpportunity({
        stage: OpportunityStage.PROPOSAL,
      });

      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findOpportunityById.mockResolvedValue(existingOpp);
      salesRepository.updateOpportunity.mockResolvedValue(updatedOpp);

      await salesService.updateOpportunityStage('OPP-001', OpportunityStage.PROPOSAL, 'user-123');

      const updateCall = salesRepository.updateOpportunity.mock.calls[0][1];
      expect(updateCall.closedAt).toBeUndefined();
      expect(updateCall.closedBy).toBeUndefined();
    });

    it('should throw NotFoundError when updating non-existent opportunity', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findOpportunityById.mockResolvedValue(null);

      await expect(
        salesService.updateOpportunityStage('NONEXISTENT', OpportunityStage.PROPOSAL, 'user-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // QUOTES
  // ==========================================================================

  describe('createQuote', () => {
    it('should create a quote successfully', async () => {
      const dto: CreateQuoteDTO = {
        customerId: 'CUST-001',
        validUntil: '2024-12-31',
        lineItems: [
          {
            sku: 'SKU-001',
            description: 'Test Product',
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxRate: 0.15,
            lineNumber: 1,
          },
        ],
      };

      const mockCustomer = createMockCustomer();
      const mockQuote = createMockQuote();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(mockCustomer);
      salesRepository.createQuote.mockResolvedValue(mockQuote);

      const result = await salesService.createQuote(dto, 'user-123');

      expect(result.status).toBe(QuoteStatus.DRAFT);
    });

    it('should throw error when customerId is missing', async () => {
      const dto: CreateQuoteDTO = {
        customerId: '',
        validUntil: '2024-12-31',
        lineItems: [
          {
            sku: 'SKU-001',
            description: 'Test Product',
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxRate: 0.15,
            lineNumber: 1,
          },
        ],
      };

      await expect(salesService.createQuote(dto, 'user-123')).rejects.toThrow(
        'Customer ID is required'
      );
    });

    it('should throw error when validUntil is missing', async () => {
      const dto: CreateQuoteDTO = {
        customerId: 'CUST-001',
        validUntil: '',
        lineItems: [
          {
            sku: 'SKU-001',
            description: 'Test Product',
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxRate: 0.15,
            lineNumber: 1,
          },
        ],
      } as any;

      await expect(salesService.createQuote(dto, 'user-123')).rejects.toThrow(
        'Valid until date is required'
      );
    });

    it('should throw error when line items are empty', async () => {
      const dto: CreateQuoteDTO = {
        customerId: 'CUST-001',
        validUntil: '2024-12-31',
        lineItems: [],
      };

      await expect(salesService.createQuote(dto, 'user-123')).rejects.toThrow(
        'Quote must have at least one line item'
      );
    });

    it('should throw error when customer not found', async () => {
      const dto: CreateQuoteDTO = {
        customerId: 'NONEXISTENT',
        validUntil: '2024-12-31',
        lineItems: [
          {
            sku: 'SKU-001',
            description: 'Test Product',
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxRate: 0.15,
            lineNumber: 1,
          },
        ],
      };

      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(null);

      await expect(salesService.createQuote(dto, 'user-123')).rejects.toThrow(NotFoundError);
    });

    it('should throw error when line item quantity is zero', async () => {
      const dto: CreateQuoteDTO = {
        customerId: 'CUST-001',
        validUntil: '2024-12-31',
        lineItems: [
          {
            sku: 'SKU-001',
            description: 'Test Product',
            quantity: 0,
            unitPrice: 100,
            discount: 0,
            taxRate: 0.15,
            lineNumber: 1,
          },
        ],
      };

      const mockCustomer = createMockCustomer();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(mockCustomer);

      await expect(salesService.createQuote(dto, 'user-123')).rejects.toThrow(
        'Line item quantity must be greater than 0'
      );
    });

    it('should throw error when line item unit price is negative', async () => {
      const dto: CreateQuoteDTO = {
        customerId: 'CUST-001',
        validUntil: '2024-12-31',
        lineItems: [
          {
            sku: 'SKU-001',
            description: 'Test Product',
            quantity: 10,
            unitPrice: -10,
            discount: 0,
            taxRate: 0.15,
            lineNumber: 1,
          },
        ],
      };

      const mockCustomer = createMockCustomer();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(mockCustomer);

      await expect(salesService.createQuote(dto, 'user-123')).rejects.toThrow(
        'Line item unit price cannot be negative'
      );
    });
  });

  describe('getQuoteById', () => {
    it('should return a quote by ID', async () => {
      const mockQuote = createMockQuote();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findQuoteById.mockResolvedValue(mockQuote);

      const result = await salesService.getQuoteById('QUOTE-001');

      expect(result).toEqual(mockQuote);
    });

    it('should throw NotFoundError when quote not found', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findQuoteById.mockResolvedValue(null);

      await expect(salesService.getQuoteById('NONEXISTENT')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllQuotes', () => {
    it('should return all quotes', async () => {
      const mockQuotes = [createMockQuote(), createMockQuote({ quoteId: 'QUOTE-002' })];
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllQuotes.mockResolvedValue({
        quotes: mockQuotes,
        total: 2,
      });

      const result = await salesService.getAllQuotes();

      expect(result.quotes).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter quotes by status', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllQuotes.mockResolvedValue({
        quotes: [],
        total: 0,
      });

      await salesService.getAllQuotes({ status: QuoteStatus.SENT });

      expect(salesRepository.findAllQuotes).toHaveBeenCalledWith({
        status: QuoteStatus.SENT,
      });
    });

    it('should filter quotes by customer', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllQuotes.mockResolvedValue({
        quotes: [],
        total: 0,
      });

      await salesService.getAllQuotes({ customerId: 'CUST-001' });

      expect(salesRepository.findAllQuotes).toHaveBeenCalledWith({
        customerId: 'CUST-001',
      });
    });
  });

  describe('sendQuote', () => {
    it('should send a DRAFT quote', async () => {
      const mockQuote = createMockQuote({ status: QuoteStatus.DRAFT });
      const mockCustomer = createMockCustomer();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findQuoteById.mockResolvedValue(mockQuote);
      salesRepository.updateCustomer.mockResolvedValue(mockCustomer);

      const result = await salesService.sendQuote('QUOTE-001', 'user-123');

      expect(result.status).toBe(QuoteStatus.DRAFT);
      expect(salesRepository.updateCustomer).toHaveBeenCalledWith('CUST-001', {
        lastContactDate: expect.any(Date),
        updatedBy: 'user-123',
      });
    });

    it('should throw error when quote is not in DRAFT status', async () => {
      const mockQuote = createMockQuote({ status: QuoteStatus.SENT });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findQuoteById.mockResolvedValue(mockQuote);

      await expect(salesService.sendQuote('QUOTE-001', 'user-123')).rejects.toThrow(
        'Only DRAFT quotes can be sent'
      );
    });
  });

  describe('acceptQuote', () => {
    it('should accept a SENT quote', async () => {
      const mockQuote = createMockQuote({ status: QuoteStatus.SENT });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findQuoteById.mockResolvedValue(mockQuote);

      const result = await salesService.acceptQuote('QUOTE-001', 'user-123');

      expect(result.status).toBe(QuoteStatus.SENT);
    });

    it('should throw error when quote is not in SENT status', async () => {
      const mockQuote = createMockQuote({ status: QuoteStatus.DRAFT });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findQuoteById.mockResolvedValue(mockQuote);

      await expect(salesService.acceptQuote('QUOTE-001', 'user-123')).rejects.toThrow(
        'Only SENT quotes can be accepted'
      );
    });
  });

  // ==========================================================================
  // CUSTOMER INTERACTIONS
  // ==========================================================================

  describe('logInteraction', () => {
    it('should log a customer interaction', async () => {
      const dto: Omit<CustomerInteraction, 'interactionId' | 'createdAt'> = {
        customerId: 'CUST-001',
        interactionType: 'CALL',
        subject: 'Test Subject',
        notes: 'Test notes',
        createdBy: 'user-123',
      };

      const mockInteraction = createMockInteraction();
      const mockCustomer = createMockCustomer();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.createInteraction.mockResolvedValue(mockInteraction);
      salesRepository.findCustomerById.mockResolvedValue(mockCustomer);
      salesRepository.updateCustomer.mockResolvedValue(mockCustomer);

      const result = await salesService.logInteraction(dto);

      expect(result.subject).toBe('Test Subject');
      expect(salesRepository.updateCustomer).toHaveBeenCalledWith('CUST-001', {
        lastContactDate: expect.any(Date),
        updatedBy: 'user-123',
      });
    });

    it('should throw error when subject is missing', async () => {
      const dto: Omit<CustomerInteraction, 'interactionId' | 'createdAt'> = {
        customerId: 'CUST-001',
        interactionType: 'CALL',
        subject: '',
        notes: 'Test notes',
        createdBy: 'user-123',
      };

      await expect(salesService.logInteraction(dto)).rejects.toThrow('Subject is required');
    });

    it('should throw error when notes are missing', async () => {
      const dto: Omit<CustomerInteraction, 'interactionId' | 'createdAt'> = {
        customerId: 'CUST-001',
        interactionType: 'CALL',
        subject: 'Test Subject',
        notes: '',
        createdBy: 'user-123',
      };

      await expect(salesService.logInteraction(dto)).rejects.toThrow('Notes are required');
    });

    it('should not update customer when interaction has no customerId', async () => {
      const dto: Omit<CustomerInteraction, 'interactionId' | 'createdAt'> = {
        leadId: 'LEAD-001',
        interactionType: 'CALL',
        subject: 'Test Subject',
        notes: 'Test notes',
        createdBy: 'user-123',
      };

      const mockInteraction = createMockInteraction({ customerId: undefined });
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.createInteraction.mockResolvedValue(mockInteraction);

      await salesService.logInteraction(dto);

      expect(salesRepository.updateCustomer).not.toHaveBeenCalled();
    });

    it('should support all interaction types', async () => {
      const interactionTypes: Array<'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'OTHER'> = [
        'CALL',
        'EMAIL',
        'MEETING',
        'NOTE',
        'OTHER',
      ];

      for (const type of interactionTypes) {
        const dto: Omit<CustomerInteraction, 'interactionId' | 'createdAt'> = {
          customerId: 'CUST-001',
          interactionType: type,
          subject: `Test ${type}`,
          notes: 'Test notes',
          createdBy: 'user-123',
        };

        const mockInteraction = createMockInteraction({ interactionType: type });
        const mockCustomer = createMockCustomer();
        const { salesRepository } = require('../../repositories/SalesRepository');
        salesRepository.createInteraction.mockResolvedValue(mockInteraction);
        salesRepository.findCustomerById.mockResolvedValue(mockCustomer);
        salesRepository.updateCustomer.mockResolvedValue(mockCustomer);

        const result = await salesService.logInteraction(dto);
        expect(result.interactionType).toBe(type);
      }
    });
  });

  describe('getCustomerInteractions', () => {
    it('should return customer interactions', async () => {
      const mockInteractions = [
        createMockInteraction(),
        createMockInteraction({ interactionId: 'INT-002' }),
      ];
      const mockCustomer = createMockCustomer();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(mockCustomer);
      salesRepository.findInteractionsByCustomer.mockResolvedValue(mockInteractions);

      const result = await salesService.getCustomerInteractions('CUST-001');

      expect(result).toHaveLength(2);
      expect(salesRepository.findInteractionsByCustomer).toHaveBeenCalledWith('CUST-001', 50);
    });

    it('should use default limit of 50', async () => {
      const mockCustomer = createMockCustomer();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(mockCustomer);
      salesRepository.findInteractionsByCustomer.mockResolvedValue([]);

      await salesService.getCustomerInteractions('CUST-001');

      expect(salesRepository.findInteractionsByCustomer).toHaveBeenCalledWith('CUST-001', 50);
    });

    it('should use custom limit when provided', async () => {
      const mockCustomer = createMockCustomer();
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(mockCustomer);
      salesRepository.findInteractionsByCustomer.mockResolvedValue([]);

      await salesService.getCustomerInteractions('CUST-001', 100);

      expect(salesRepository.findInteractionsByCustomer).toHaveBeenCalledWith('CUST-001', 100);
    });

    it('should throw NotFoundError when customer not found', async () => {
      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findCustomerById.mockResolvedValue(null);

      await expect(salesService.getCustomerInteractions('NONEXISTENT')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  describe('getDashboard', () => {
    it('should return dashboard statistics', async () => {
      const mockCustomers = [createMockCustomer()];
      const mockLeads = [createMockLead()];
      const mockOpportunities = [createMockOpportunity()];
      const mockQuotes = [createMockQuote()];

      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllCustomers.mockResolvedValue({ customers: mockCustomers, total: 1 });
      salesRepository.findAllLeads.mockResolvedValue({ leads: mockLeads, total: 1 });
      salesRepository.findAllOpportunities.mockResolvedValue({
        opportunities: mockOpportunities,
        total: 1,
      });
      salesRepository.findAllQuotes.mockResolvedValue({ quotes: mockQuotes, total: 1 });

      const result = await salesService.getDashboard();

      expect(result.totalCustomers).toBe(1);
      expect(result.activeLeads).toBe(1);
      expect(result.openOpportunities).toBe(1);
      expect(result.pendingQuotes).toBe(1);
      expect(typeof result.totalPipeline).toBe('number');
    });

    it('should calculate total pipeline from open opportunities', async () => {
      const mockOpportunities = [
        createMockOpportunity({
          opportunityId: 'OPP-001',
          stage: OpportunityStage.PROPOSAL,
          amount: 5000,
        }),
        createMockOpportunity({
          opportunityId: 'OPP-002',
          stage: OpportunityStage.NEGOTIATION,
          amount: 10000,
        }),
        createMockOpportunity({
          opportunityId: 'OPP-003',
          stage: OpportunityStage.CLOSED_WON,
          amount: 20000, // Should not be included
        }),
        createMockOpportunity({
          opportunityId: 'OPP-004',
          stage: OpportunityStage.CLOSED_LOST,
          amount: 30000, // Should not be included
        }),
      ];

      const { salesRepository } = require('../../repositories/SalesRepository');
      salesRepository.findAllCustomers.mockResolvedValue({ customers: [], total: 0 });
      salesRepository.findAllLeads.mockResolvedValue({ leads: [], total: 0 });
      salesRepository.findAllOpportunities.mockResolvedValue({
        opportunities: mockOpportunities,
        total: 4,
      });
      salesRepository.findAllQuotes.mockResolvedValue({ quotes: [], total: 0 });
      salesRepository.findAllOpportunities.mockResolvedValue({
        opportunities: mockOpportunities,
        total: 4,
      });

      const result = await salesService.getDashboard();

      expect(result.totalPipeline).toBe(15000); // 5000 + 10000
    });
  });
});
