/**
 * Unit tests for InboundReceivingService
 * @covers src/services/InboundReceivingService.ts
 */

import { InboundReceivingService } from '../InboundReceivingService';
import {
  ASNStatus,
  ASNLineStatus,
  ReceiptType,
  ReceiptStatus,
  QualityStatus,
  PutawayStatus,
} from '@opsui/shared';

// Mock dependencies
jest.mock('../../config/logger');
jest.mock('../../db/client');
// Note: nanoid is already mocked in jest.setup.cjs

const { logger } = require('../../config/logger');
const { getPool } = require('../../db/client');

describe('InboundReceivingService', () => {
  let inboundReceivingService: InboundReceivingService;

  const mockUser = {
    userId: 'user-123',
    name: 'Test User',
  };

  beforeEach(() => {
    inboundReceivingService = new InboundReceivingService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // GET DASHBOARD METRICS TESTS
  // ==========================================================================

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // pending ASNs
          .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // in transit ASNs
          .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // active receipts
          .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // pending putaway
          .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // in progress putaway
          .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // today putaway
          .mockResolvedValueOnce({ rows: [{ count: '8' }] }), // today received
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getDashboardMetrics();

      expect(result).toEqual({
        pendingASNs: 5,
        inTransitASNs: 3,
        activeReceipts: 2,
        pendingPutaway: 10,
        inProgressPutaway: 5,
        todayReceived: 8,
        todayPutaway: 15,
      });
    });

    it('should handle database errors', async () => {
      getPool.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(inboundReceivingService.getDashboardMetrics()).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  // ==========================================================================
  // ASN METHODS TESTS
  // ==========================================================================

  describe('createASN', () => {
    it('should create a new ASN with line items', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [
              {
                asn_id: 'ASN-AAAAAAAAAA',
                supplier_id: 'SUP-001',
                status: ASNStatus.PENDING,
                ...{},
              },
            ],
          }) // insert ASN
          .mockResolvedValueOnce({ rows: [] }) // insert line item 1
          .mockResolvedValueOnce({ rows: [] }) // insert line item 2
          .mockResolvedValueOnce({ rows: [] }) // COMMIT
          .mockResolvedValueOnce({
            rows: [
              {
                asn_id: 'ASN-AAAAAAAAAA',
                supplier_id: 'SUP-001',
                status: ASNStatus.PENDING,
                ...{},
              },
            ],
          }) // get ASN
          .mockResolvedValueOnce({
            rows: [
              { line_item_id: 'ASNL-1', ...{} },
              { line_item_id: 'ASNL-2', ...{} },
            ],
          }), // line items
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        supplierId: 'SUP-001',
        purchaseOrderNumber: 'PO-123',
        expectedArrivalDate: new Date('2025-02-01'),
        carrier: 'FedEx',
        trackingNumber: 'TRACK123',
        shipmentNotes: 'Test notes',
        createdBy: mockUser.userId,
        lineItems: [
          {
            sku: 'SKU001',
            expectedQuantity: 100,
            unitCost: 10.5,
            lotNumber: 'LOT001',
            expirationDate: new Date('2026-01-01'),
            lineNotes: 'Item notes',
          },
          {
            sku: 'SKU002',
            expectedQuantity: 50,
            unitCost: 25.0,
          },
        ],
      };

      const result = await inboundReceivingService.createASN(dto);

      expect(result.asnId).toBe('ASN-AAAAAAAAAA');
      expect(result.supplierId).toBe('SUP-001');
      expect(result.status).toBe(ASNStatus.PENDING);
      expect(result.lineItems).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(logger.info).toHaveBeenCalledWith('ASN created', expect.any(Object));
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(new Error('Insert failed')) // insert fails
          .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        supplierId: 'SUP-001',
        purchaseOrderNumber: 'PO-123',
        expectedArrivalDate: new Date(),
        createdBy: mockUser.userId,
        lineItems: [],
      };

      await expect(inboundReceivingService.createASN(dto)).rejects.toThrow('Insert failed');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalledWith('Error creating ASN', expect.any(Error));
    });
  });

  describe('getASN', () => {
    it('should return ASN with line items', async () => {
      const mockASN = {
        asn_id: 'ASN-001',
        supplier_id: 'SUP-001',
        purchase_order_number: 'PO-123',
        status: ASNStatus.PENDING,
        expected_arrival_date: '2025-02-01',
        actual_arrival_date: null,
        carrier: 'FedEx',
        tracking_number: 'TRACK123',
        shipment_notes: 'Notes',
        created_at: '2025-01-30T10:00:00Z',
        updated_at: '2025-01-30T10:00:00Z',
        received_at: null,
        created_by: 'user-123',
      };

      const mockLineItems = [
        {
          line_item_id: 'ASNL-001',
          asn_id: 'ASN-001',
          sku: 'SKU001',
          expected_quantity: '100',
          received_quantity: '0',
          unit_cost: '10.50',
          lot_number: 'LOT001',
          expiration_date: '2026-01-01',
          receiving_status: ASNLineStatus.PENDING,
          line_notes: 'Notes',
        },
      ];

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockASN] })
          .mockResolvedValueOnce({ rows: mockLineItems }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getASN('ASN-001');

      expect(result.asnId).toBe('ASN-001');
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0].sku).toBe('SKU001');
    });

    it('should throw error for non-existent ASN', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      };

      getPool.mockResolvedValue(mockClient);

      await expect(inboundReceivingService.getASN('NONEXISTENT')).rejects.toThrow(
        'ASN NONEXISTENT not found'
      );
    });
  });

  describe('getAllASNs', () => {
    it('should return all ASNs with pagination', async () => {
      const mockASNs = [
        {
          asn_id: 'ASN-001',
          supplier_id: 'SUP-001',
          status: ASNStatus.PENDING,
          expected_arrival_date: '2025-02-01',
          ...{},
        },
        {
          asn_id: 'ASN-002',
          supplier_id: 'SUP-002',
          status: ASNStatus.RECEIVED,
          expected_arrival_date: '2025-02-02',
          ...{},
        },
      ];

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // total count
          .mockResolvedValueOnce({ rows: mockASNs }) // ASNs
          .mockResolvedValueOnce({ rows: [{ line_item_id: 'ASNL-001', ...{} }] }) // line items for ASN-001
          .mockResolvedValueOnce({ rows: [{ line_item_id: 'ASNL-002', ...{} }] }), // line items for ASN-002
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getAllASNs({ limit: 10, offset: 0 });

      expect(result.asns).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.asns[0].lineItems).toBeDefined();
    });

    it('should filter by status', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({
            rows: [{ asn_id: 'ASN-001', status: ASNStatus.PENDING, ...{} }],
          })
          .mockResolvedValueOnce({ rows: [] }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getAllASNs({
        status: ASNStatus.PENDING,
        limit: 10,
        offset: 0,
      });

      expect(result.asns).toHaveLength(1);
      expect(result.asns[0].status).toBe(ASNStatus.PENDING);
    });

    it('should filter by supplier', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: [{ asn_id: 'ASN-001', supplier_id: 'SUP-001', ...{} }] })
          .mockResolvedValueOnce({ rows: [] }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getAllASNs({
        supplierId: 'SUP-001',
        limit: 10,
        offset: 0,
      });

      expect(result.asns).toHaveLength(1);
      expect(result.asns[0].supplierId).toBe('SUP-001');
    });
  });

  describe('updateASNStatus', () => {
    it('should update ASN status', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({
            rows: [{ asn_id: 'ASN-001', status: ASNStatus.IN_TRANSIT, ...{} }],
          })
          .mockResolvedValueOnce({
            rows: [{ asn_id: 'ASN-001', status: ASNStatus.IN_TRANSIT, ...{} }],
          })
          .mockResolvedValueOnce({ rows: [] }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.updateASNStatus('ASN-001', ASNStatus.IN_TRANSIT);

      expect(result.status).toBe(ASNStatus.IN_TRANSIT);
      expect(logger.info).toHaveBeenCalledWith('ASN status updated', expect.any(Object));
    });

    it('should throw error for non-existent ASN', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      };

      getPool.mockResolvedValue(mockClient);

      await expect(
        inboundReceivingService.updateASNStatus('NONEXISTENT', ASNStatus.RECEIVED)
      ).rejects.toThrow('ASN NONEXISTENT not found');
    });
  });

  // ==========================================================================
  // RECEIPT METHODS TESTS
  // ==========================================================================

  describe('createReceipt', () => {
    it('should create a new receipt with line items', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [
              {
                receipt_id: 'RCP-AAAAAAAAAA',
                receipt_type: ReceiptType.PO,
                asn_id: 'ASN-001',
                status: ReceiptStatus.RECEIVING,
                ...{},
              },
            ],
          }) // insert receipt
          .mockResolvedValueOnce({ rows: [] }) // insert receipt line item
          .mockResolvedValueOnce({ rows: [{ bin_locations: ['A-01-01', 'B-02-02'] }] }) // create putaway tasks (query SKU bins)
          .mockResolvedValueOnce({ rows: [] }) // create putaway tasks (insert task)
          .mockResolvedValueOnce({ rows: [] }) // COMMIT
          .mockResolvedValueOnce({
            rows: [
              {
                receipt_id: 'RCP-AAAAAAAAAA',
                receipt_type: ReceiptType.PO,
                asn_id: 'ASN-001',
                status: ReceiptStatus.RECEIVING,
                ...{},
              },
            ],
          }) // get receipt
          .mockResolvedValueOnce({ rows: [{ receipt_line_id: 'RCPL-AAAAAAAAAA', ...{} }] }), // line items
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        asnId: 'ASN-001',
        receiptType: ReceiptType.PO,
        receivedBy: mockUser.userId,
        lineItems: [
          {
            asnLineItemId: 'ASNL-001',
            sku: 'SKU001',
            quantityOrdered: 100,
            quantityReceived: 95,
            quantityDamaged: 5,
            unitCost: 10.5,
            lotNumber: 'LOT001',
            expirationDate: new Date('2026-01-01'),
            notes: 'Item notes',
          },
        ],
      };

      const result = await inboundReceivingService.createReceipt(dto);

      expect(result.receiptId).toMatch(/^RCP-/);
      expect(result.status).toBe(ReceiptStatus.RECEIVING);
      expect(result.lineItems).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(logger.info).toHaveBeenCalledWith('Receipt created', expect.any(Object));
    });

    it('should create receipt without ASN', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({
            rows: [
              {
                receipt_id: 'RCP-AAAAAAAAAA',
                receipt_type: ReceiptType.RETURN,
                asn_id: null,
                status: ReceiptStatus.RECEIVING,
                ...{},
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [] }) // insert receipt line
          .mockResolvedValueOnce({ rows: [{ bin_locations: ['A-01-01'] }] }) // SKU bins
          .mockResolvedValueOnce({ rows: [] }) // insert putaway task
          .mockResolvedValueOnce({ rows: [] }) // COMMIT
          .mockResolvedValueOnce({
            rows: [
              {
                receipt_id: 'RCP-AAAAAAAAAA',
                receipt_type: ReceiptType.RETURN,
                asn_id: null,
                status: ReceiptStatus.RECEIVING,
                ...{},
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [{ receipt_line_id: 'RCPL-AAAAAAAAAA', ...{} }] }),
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        receiptType: ReceiptType.RETURN,
        receivedBy: mockUser.userId,
        lineItems: [
          {
            sku: 'SKU001',
            quantityOrdered: 10,
            quantityReceived: 10,
            quantityDamaged: 0,
          },
        ],
      };

      const result = await inboundReceivingService.createReceipt(dto);

      expect(result.receiptType).toBe(ReceiptType.RETURN);
      expect(result.asnId).toBeNull();
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(new Error('Insert failed'))
          .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        receiptType: ReceiptType.PO,
        receivedBy: mockUser.userId,
        lineItems: [],
      };

      await expect(inboundReceivingService.createReceipt(dto)).rejects.toThrow('Insert failed');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalledWith('Error creating receipt', expect.any(Error));
    });
  });

  describe('getReceipt', () => {
    it('should return receipt with line items', async () => {
      const mockReceipt = {
        receipt_id: 'RCP-001',
        asn_id: 'ASN-001',
        receipt_date: '2025-01-30',
        receipt_type: ReceiptType.PO,
        status: ReceiptStatus.RECEIVING,
        created_at: '2025-01-30T10:00:00Z',
        completed_at: null,
        received_by: 'user-123',
      };

      const mockLineItems = [
        {
          receipt_line_id: 'RCPL-001',
          receipt_id: 'RCP-001',
          asn_line_item_id: 'ASNL-001',
          sku: 'SKU001',
          quantity_ordered: '100',
          quantity_received: '95',
          quantity_damaged: '5',
          quality_status: QualityStatus.PENDING,
          putaway_status: PutawayStatus.PENDING,
          unit_cost: '10.50',
          total_cost: '1050.00',
          lot_number: 'LOT001',
          expiration_date: '2026-01-01',
          notes: 'Notes',
        },
      ];

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockReceipt] })
          .mockResolvedValueOnce({ rows: mockLineItems }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getReceipt('RCP-001');

      expect(result.receiptId).toBe('RCP-001');
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0].sku).toBe('SKU001');
      expect(result.lineItems[0].quantityOrdered).toBe(100);
    });

    it('should throw error for non-existent receipt', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      };

      getPool.mockResolvedValue(mockClient);

      await expect(inboundReceivingService.getReceipt('NONEXISTENT')).rejects.toThrow(
        'Receipt NONEXISTENT not found'
      );
    });
  });

  describe('getAllReceipts', () => {
    it('should return all receipts with pagination', async () => {
      const mockReceipts = [
        {
          receipt_id: 'RCP-001',
          asn_id: 'ASN-001',
          receipt_type: ReceiptType.PO,
          status: ReceiptStatus.RECEIVING,
          ...{},
        },
      ];

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: mockReceipts })
          .mockResolvedValueOnce({ rows: [{ receipt_line_id: 'RCPL-001', ...{} }] }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getAllReceipts({ limit: 10, offset: 0 });

      expect(result.receipts).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({
            rows: [{ receipt_id: 'RCP-001', status: ReceiptStatus.RECEIVING, ...{} }],
          })
          .mockResolvedValueOnce({ rows: [] }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getAllReceipts({
        status: ReceiptStatus.RECEIVING,
        limit: 10,
        offset: 0,
      });

      expect(result.receipts).toHaveLength(1);
    });

    it('should filter by ASN', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: [{ receipt_id: 'RCP-001', asn_id: 'ASN-001', ...{} }] })
          .mockResolvedValueOnce({ rows: [] }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getAllReceipts({
        asnId: 'ASN-001',
        limit: 10,
        offset: 0,
      });

      expect(result.receipts).toHaveLength(1);
    });

    it('should filter by receipt type', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({
            rows: [{ receipt_id: 'RCP-001', receipt_type: ReceiptType.PO, ...{} }],
          })
          .mockResolvedValueOnce({ rows: [] }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getAllReceipts({
        receiptType: ReceiptType.PO,
        limit: 10,
        offset: 0,
      });

      expect(result.receipts).toHaveLength(1);
    });
  });

  // ==========================================================================
  // PUTAWAY METHODS TESTS
  // ==========================================================================

  describe('getPutawayTasks', () => {
    it('should return putaway tasks with pagination', async () => {
      const mockTasks = [
        {
          putaway_task_id: 'PTA-001',
          receipt_line_id: 'RCPL-001',
          sku: 'SKU001',
          quantity_to_putaway: '100',
          quantity_putaway: '50',
          target_bin_location: 'A-01-01',
          status: PutawayStatus.IN_PROGRESS,
          assigned_to: 'user-123',
          assigned_at: '2025-01-30T10:00:00Z',
          completed_at: null,
          completed_by: null,
          priority: 'NORMAL',
          created_at: '2025-01-30T09:00:00Z',
          updated_at: '2025-01-30T10:00:00Z',
          notes: null,
        },
      ];

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: mockTasks }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getPutawayTasks({ limit: 10, offset: 0 });

      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.tasks[0].sku).toBe('SKU001');
      expect(result.tasks[0].status).toBe(PutawayStatus.IN_PROGRESS);
    });

    it('should filter by status', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '5' }] })
          .mockResolvedValueOnce({
            rows: [
              {
                putaway_task_id: 'PTA-001',
                status: PutawayStatus.PENDING,
                quantity_to_putaway: '100',
                quantity_putaway: '0',
                ...{},
              },
            ],
          }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getPutawayTasks({
        status: PutawayStatus.PENDING,
        limit: 10,
        offset: 0,
      });

      expect(result.tasks.length).toBeGreaterThan(0);
      result.tasks.forEach(task => {
        expect(task.status).toBe(PutawayStatus.PENDING);
      });
    });

    it('should filter by assigned user', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '3' }] })
          .mockResolvedValueOnce({
            rows: [
              {
                putaway_task_id: 'PTA-001',
                assigned_to: 'user-123',
                ...{},
              },
            ],
          }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.getPutawayTasks({
        assignedTo: 'user-123',
        limit: 10,
        offset: 0,
      });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].assignedTo).toBe('user-123');
    });
  });

  describe('assignPutawayTask', () => {
    it('should assign putaway task to user', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [
            {
              putaway_task_id: 'PTA-001',
              assigned_to: 'user-123',
              status: PutawayStatus.IN_PROGRESS,
              assigned_at: '2025-01-30T10:00:00Z',
              ...{},
            },
          ],
        }),
      };

      getPool.mockResolvedValue(mockClient);

      const result = await inboundReceivingService.assignPutawayTask('PTA-001', 'user-123');

      expect(result.putawayTaskId).toBe('PTA-001');
      expect(result.assignedTo).toBe('user-123');
      expect(result.status).toBe(PutawayStatus.IN_PROGRESS);
      expect(logger.info).toHaveBeenCalledWith('Putaway task assigned', expect.any(Object));
    });

    it('should throw error for non-existent task', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      };

      getPool.mockResolvedValue(mockClient);

      await expect(
        inboundReceivingService.assignPutawayTask('NONEXISTENT', 'user-123')
      ).rejects.toThrow('Putaway task NONEXISTENT not found');
    });
  });

  describe('updatePutawayTask', () => {
    it('should partially complete putaway task', async () => {
      const mockCurrentTask = {
        putaway_task_id: 'PTA-001',
        receipt_line_id: 'RCPL-001',
        quantity_to_putaway: '100',
        quantity_putaway: '50',
        status: PutawayStatus.IN_PROGRESS,
      };

      const mockUpdatedTask = {
        putaway_task_id: 'PTA-001',
        quantity_to_putaway: '100',
        quantity_putaway: '75',
        status: PutawayStatus.IN_PROGRESS,
        ...{},
      };

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockCurrentTask] }) // FOR UPDATE
          .mockResolvedValueOnce({ rows: [mockUpdatedTask] }) // UPDATE
          .mockResolvedValueOnce({ rows: [] }) // COMMIT
          .mockResolvedValueOnce({ rows: [] }), // update receipt line (not executed because not completed)
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        putawayTaskId: 'PTA-001',
        quantityPutaway: 25,
        userId: 'user-123',
      };

      const result = await inboundReceivingService.updatePutawayTask(dto);

      expect(result.quantityPutaway).toBe(75);
      expect(result.status).toBe(PutawayStatus.IN_PROGRESS);
      expect(logger.info).toHaveBeenCalledWith('Putaway task updated', expect.any(Object));
    });

    it('should complete putaway task when fully putaway', async () => {
      const mockCurrentTask = {
        putaway_task_id: 'PTA-001',
        receipt_line_id: 'RCPL-001',
        quantity_to_putaway: '100',
        quantity_putaway: '95',
        status: PutawayStatus.IN_PROGRESS,
      };

      const mockUpdatedTask = {
        putaway_task_id: 'PTA-001',
        quantity_to_putaway: '100',
        quantity_putaway: '100',
        status: PutawayStatus.COMPLETED,
        completed_at: '2025-01-30T11:00:00Z',
        completed_by: 'user-123',
        ...{},
      };

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockCurrentTask] })
          .mockResolvedValueOnce({ rows: [mockUpdatedTask] })
          .mockResolvedValueOnce({ rows: [] }) // UPDATE receipt line
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        putawayTaskId: 'PTA-001',
        quantityPutaway: 5,
        userId: 'user-123',
      };

      const result = await inboundReceivingService.updatePutawayTask(dto);

      expect(result.quantityPutaway).toBe(100);
      expect(result.status).toBe(PutawayStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
      expect(result.completedBy).toBe('user-123');
    });

    it('should throw error for non-existent task', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }), // FOR UPDATE - no rows
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        putawayTaskId: 'NONEXISTENT',
        quantityPutaway: 10,
        userId: 'user-123',
      };

      await expect(inboundReceivingService.updatePutawayTask(dto)).rejects.toThrow(
        'Putaway task NONEXISTENT not found'
      );
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(new Error('Database error'))
          .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        putawayTaskId: 'PTA-001',
        quantityPutaway: 10,
        userId: 'user-123',
      };

      await expect(inboundReceivingService.updatePutawayTask(dto)).rejects.toThrow(
        'Database error'
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalledWith('Error updating putaway task', expect.any(Error));
    });
  });

  // ==========================================================================
  // PRIVATE HELPER METHODS TESTS
  // ==========================================================================

  describe('createPutawayTasksForReceiptLine (via createReceipt)', () => {
    it('should create putaway task with default bin location from SKU', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ receipt_id: 'RCP-AAAA', ...{} }] }) // insert receipt
          .mockResolvedValueOnce({ rows: [] }) // insert receipt line
          .mockResolvedValueOnce({ rows: [{ bin_locations: ['A-01-01', 'A-01-02'] }] }) // get SKU bins
          .mockResolvedValueOnce({ rows: [] }) // insert putaway task
          .mockResolvedValueOnce({ rows: [] }) // COMMIT
          .mockResolvedValueOnce({ rows: [{ receipt_id: 'RCP-AAAA', ...{} }] })
          .mockResolvedValueOnce({ rows: [{ receipt_line_id: 'RCPL-AAAA', ...{} }] }),
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        receiptType: ReceiptType.PO,
        receivedBy: mockUser.userId,
        lineItems: [
          {
            asnLineItemId: 'ASNL-001',
            sku: 'SKU001',
            quantityOrdered: 100,
            quantityReceived: 100,
            quantityDamaged: 0,
          },
        ],
      };

      const result = await inboundReceivingService.createReceipt(dto);

      // Verify putaway task was created with first bin location
      const putawayInsertCall = mockClient.query.mock.calls.find(call =>
        call[0]?.includes?.('INSERT INTO putaway_tasks')
      );

      expect(putawayInsertCall).toBeDefined();
      expect(putawayInsertCall[1][4]).toBe('A-01-01'); // target_bin_location parameter
    });

    it('should throw error when SKU not found for putaway task', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [{ receipt_id: 'RCP-AAAA', ...{} }] })
          .mockResolvedValueOnce({ rows: [] }) // insert receipt line
          .mockResolvedValueOnce({ rows: [] }) // SKU not found
          .mockResolvedValueOnce({ rows: [] }), // ROLLBACK
      };

      getPool.mockResolvedValue(mockClient);

      const dto = {
        receiptType: ReceiptType.PO,
        receivedBy: mockUser.userId,
        lineItems: [
          {
            asnLineItemId: 'ASNL-001',
            sku: 'SKU001',
            quantityOrdered: 100,
            quantityReceived: 100,
            quantityDamaged: 0,
          },
        ],
      };

      await expect(inboundReceivingService.createReceipt(dto)).rejects.toThrow(
        'SKU SKU001 not found'
      );
    });
  });
});
