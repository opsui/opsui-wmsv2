/**
 * Unit tests for OrderExceptionService
 * @covers src/services/OrderExceptionService.ts
 */

import { OrderExceptionService, orderExceptionService } from '../OrderExceptionService';
import {
  OrderException,
  LogExceptionDTO,
  ResolveExceptionDTO,
  ExceptionType,
  ExceptionStatus,
  ExceptionResolution,
} from '@opsui/shared';

// Mock database client
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

// Mock logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock NotificationHelper
jest.mock('../NotificationHelper', () => ({
  notifyExceptionReported: jest.fn(),
}));

import { getPool } from '../../db/client';
import { logger } from '../../config/logger';
import { notifyExceptionReported } from '../NotificationHelper';

describe('OrderExceptionService', () => {
  let service: OrderExceptionService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  const mockExceptionRow = {
    exception_id: 'EXC-ABC123XYZ',
    order_id: 'ORD-001',
    order_item_id: 'OI-001',
    sku: 'SKU-001',
    type: ExceptionType.SHORT_PICK,
    status: ExceptionStatus.OPEN,
    resolution: null,
    quantity_expected: '100',
    quantity_actual: '95',
    quantity_short: '5',
    reason: 'Insufficient stock',
    reported_by: 'user-001',
    reported_at: '2024-01-01T00:00:00Z',
    reviewed_by: null,
    reviewed_at: null,
    resolved_by: null,
    resolved_at: null,
    resolution_notes: null,
    substitute_sku: null,
    cycle_count_entry_id: null,
    cycle_count_plan_id: null,
    bin_location: 'A-01-01',
    system_quantity: '100',
    counted_quantity: '95',
    variance_percent: '5',
    variance_reason_code: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuery = jest.fn();
    mockPool = { query: mockQuery };

    (getPool as jest.Mock).mockReturnValue(mockPool);
    service = new OrderExceptionService();

    (notifyExceptionReported as jest.Mock).mockResolvedValue(undefined);
  });

  // ==========================================================================
  // LOG EXCEPTION
  // ==========================================================================

  describe('logException', () => {
    it('should log a short pick exception', async () => {
      const dto: LogExceptionDTO = {
        orderId: 'ORD-001',
        orderItemId: 'OI-001',
        sku: 'SKU-001',
        type: ExceptionType.SHORT_PICK,
        quantityExpected: 100,
        quantityActual: 95,
        reason: 'Insufficient stock',
        reportedBy: 'user-001',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockExceptionRow] });

      const result = await service.logException(dto);

      expect(result.exceptionId).toMatch(/^EXC-/);
      expect(result.status).toBe(ExceptionStatus.OPEN);
      expect(logger.info).toHaveBeenCalledWith('Exception logged', expect.any(Object));
      expect(notifyExceptionReported).toHaveBeenCalledWith({
        exceptionId: expect.stringMatching(/^EXC-/),
        orderId: 'ORD-001',
        type: ExceptionType.SHORT_PICK,
        description: 'Insufficient stock',
        userId: 'user-001',
      });
    });

    it('should set status to REVIEWING for backorders', async () => {
      const dto: LogExceptionDTO = {
        orderId: 'ORD-001',
        orderItemId: 'OI-001',
        sku: 'SKU-001',
        type: ExceptionType.SHORT_PICK_BACKORDER,
        quantityExpected: 100,
        quantityActual: 0,
        reason: 'Out of stock',
        reportedBy: 'user-001',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockExceptionRow,
            status: ExceptionStatus.REVIEWING,
            type: ExceptionType.SHORT_PICK_BACKORDER,
          },
        ],
      });

      const result = await service.logException(dto);

      expect(result.status).toBe(ExceptionStatus.REVIEWING);
    });

    it('should handle substitute SKU', async () => {
      const dto: LogExceptionDTO = {
        orderId: 'ORD-001',
        orderItemId: 'OI-001',
        sku: 'SKU-001',
        type: ExceptionType.SUBSTITUTION,
        quantityExpected: 100,
        quantityActual: 100,
        reason: 'Customer requested substitute',
        reportedBy: 'user-001',
        substituteSku: 'SKU-002',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockExceptionRow] });

      await service.logException(dto);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO order_exceptions'),
        expect.any(Array)
      );
    });
  });

  // ==========================================================================
  // GET EXCEPTION
  // ==========================================================================

  describe('getException', () => {
    it('should return exception by ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockExceptionRow] });

      const result = await service.getException('EXC-ABC123XYZ');

      expect(result.exceptionId).toBe('EXC-ABC123XYZ');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM order_exceptions WHERE exception_id = $1',
        ['EXC-ABC123XYZ']
      );
    });

    it('should throw error when exception not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.getException('NOT-FOUND')).rejects.toThrow(
        'Exception NOT-FOUND not found'
      );
    });
  });

  // ==========================================================================
  // GET OPEN EXCEPTIONS
  // ==========================================================================

  describe('getOpenExceptions', () => {
    it('should return open exceptions without filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [mockExceptionRow] });

      const result = await service.getOpenExceptions();

      expect(result.exceptions).toHaveLength(1);
      expect(result.total).toBe(10);
    });

    it('should filter by orderId', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [mockExceptionRow] });

      await service.getOpenExceptions({ orderId: 'ORD-001' });

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('order_id =');
      expect(query).toContain("status = 'OPEN'");
    });

    it('should filter by sku', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [mockExceptionRow] });

      await service.getOpenExceptions({ sku: 'SKU-001' });

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('sku =');
    });

    it('should filter by type', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '7' }] })
        .mockResolvedValueOnce({ rows: [mockExceptionRow] });

      await service.getOpenExceptions({ type: ExceptionType.DAMAGE });

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('type =');
    });

    it('should apply pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [mockExceptionRow] });

      await service.getOpenExceptions({ limit: 10, offset: 20 });

      const selectCall = mockQuery.mock.calls[1];
      expect(selectCall[1]).toContain(10);
      expect(selectCall[1]).toContain(20);
    });
  });

  // ==========================================================================
  // GET ALL EXCEPTIONS
  // ==========================================================================

  describe('getAllExceptions', () => {
    it('should return all exceptions without filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [mockExceptionRow] });

      const result = await service.getAllExceptions();

      expect(result.exceptions).toHaveLength(1);
      expect(result.total).toBe(50);
    });

    it('should filter by status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '15' }] })
        .mockResolvedValueOnce({ rows: [mockExceptionRow] });

      await service.getAllExceptions({ status: ExceptionStatus.RESOLVED });

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('status =');
    });

    it('should filter by orderId', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '8' }] })
        .mockResolvedValueOnce({ rows: [mockExceptionRow] });

      await service.getAllExceptions({ orderId: 'ORD-001' });

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('order_id =');
    });
  });

  // ==========================================================================
  // RESOLVE EXCEPTION
  // ==========================================================================

  describe('resolveException', () => {
    it('should resolve exception with SUBSTITUTE resolution', async () => {
      const dto: ResolveExceptionDTO = {
        exceptionId: 'EXC-ABC123XYZ',
        resolution: ExceptionResolution.SUBSTITUTE,
        notes: 'Approved substitute',
        resolvedBy: 'supervisor-001',
        substituteSku: 'SKU-002',
      };

      const currentRow = { ...mockExceptionRow, order_id: 'ORD-001', order_item_id: 'OI-001' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [currentRow] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE order_items
        .mockResolvedValueOnce({
          rows: [{ ...mockExceptionRow, status: ExceptionStatus.RESOLVED }],
        }) // UPDATE exception
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.resolveException(dto);

      expect(result.status).toBe(ExceptionStatus.RESOLVED);
      expect(logger.info).toHaveBeenCalledWith('Exception resolved', expect.any(Object));
    });

    it('should resolve exception with CANCEL_ITEM', async () => {
      const dto: ResolveExceptionDTO = {
        exceptionId: 'EXC-ABC123XYZ',
        resolution: ExceptionResolution.CANCEL_ITEM,
        notes: 'Item damaged',
        resolvedBy: 'supervisor-001',
      };

      const currentRow = { ...mockExceptionRow, order_id: 'ORD-001', order_item_id: 'OI-001' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [currentRow] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE order_items
        .mockResolvedValueOnce({
          rows: [{ ...mockExceptionRow, status: ExceptionStatus.RESOLVED }],
        })
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.resolveException(dto);

      expect(result.status).toBe(ExceptionStatus.RESOLVED);
    });

    it('should resolve exception with CANCEL_ORDER', async () => {
      const dto: ResolveExceptionDTO = {
        exceptionId: 'EXC-ABC123XYZ',
        resolution: ExceptionResolution.CANCEL_ORDER,
        notes: 'Entire order cancelled',
        resolvedBy: 'supervisor-001',
      };

      const currentRow = { ...mockExceptionRow, order_id: 'ORD-001' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [currentRow] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE orders
        .mockResolvedValueOnce({
          rows: [{ ...mockExceptionRow, status: ExceptionStatus.RESOLVED }],
        })
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.resolveException(dto);

      expect(result.status).toBe(ExceptionStatus.RESOLVED);
    });

    it('should resolve exception with ADJUST_QUANTITY', async () => {
      const dto: ResolveExceptionDTO = {
        exceptionId: 'EXC-ABC123XYZ',
        resolution: ExceptionResolution.ADJUST_QUANTITY,
        notes: 'Adjusted to actual quantity',
        resolvedBy: 'supervisor-001',
        newQuantity: 95,
      };

      const currentRow = { ...mockExceptionRow, order_id: 'ORD-001', order_item_id: 'OI-001' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [currentRow] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE order_items
        .mockResolvedValueOnce({
          rows: [{ ...mockExceptionRow, status: ExceptionStatus.RESOLVED }],
        })
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.resolveException(dto);

      expect(result.status).toBe(ExceptionStatus.RESOLVED);
    });

    it('should resolve exception with TRANSFER_BIN', async () => {
      const dto: ResolveExceptionDTO = {
        exceptionId: 'EXC-ABC123XYZ',
        resolution: ExceptionResolution.TRANSFER_BIN,
        notes: 'Item found in different bin',
        resolvedBy: 'supervisor-001',
        newBinLocation: 'B-02-02',
      };

      const currentRow = { ...mockExceptionRow, order_id: 'ORD-001', order_item_id: 'OI-001' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [currentRow] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE order_items
        .mockResolvedValueOnce({
          rows: [{ ...mockExceptionRow, status: ExceptionStatus.RESOLVED }],
        })
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.resolveException(dto);

      expect(result.status).toBe(ExceptionStatus.RESOLVED);
    });

    it('should resolve exception with BACKORDER', async () => {
      const dto: ResolveExceptionDTO = {
        exceptionId: 'EXC-ABC123XYZ',
        resolution: ExceptionResolution.BACKORDER,
        notes: 'Place on backorder',
        resolvedBy: 'supervisor-001',
      };

      const currentRow = { ...mockExceptionRow, order_id: 'ORD-001' };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [currentRow] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE orders
        .mockResolvedValueOnce({
          rows: [{ ...mockExceptionRow, status: ExceptionStatus.RESOLVED }],
        })
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.resolveException(dto);

      expect(result.status).toBe(ExceptionStatus.RESOLVED);
    });

    it('should rollback and throw error on exception not found', async () => {
      const dto: ResolveExceptionDTO = {
        exceptionId: 'NOT-FOUND',
        resolution: ExceptionResolution.WRITE_OFF,
        notes: 'Write off',
        resolvedBy: 'supervisor-001',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE returns no rows
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.resolveException(dto)).rejects.toThrow('Exception NOT-FOUND not found');
    });

    it('should rollback on database error', async () => {
      const dto: ResolveExceptionDTO = {
        exceptionId: 'EXC-ABC123XYZ',
        resolution: ExceptionResolution.WRITE_OFF,
        notes: 'Write off',
        resolvedBy: 'supervisor-001',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // SELECT fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.resolveException(dto)).rejects.toThrow('Database error');
    });
  });

  // ==========================================================================
  // GET EXCEPTION SUMMARY
  // ==========================================================================

  describe('getExceptionSummary', () => {
    it('should return exception summary', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '100', open: '30', resolved: '70' }] })
        .mockResolvedValueOnce({
          rows: [
            { type: 'SHORT_PICK', count: '40' },
            { type: 'DAMAGE', count: '20' },
            { type: 'DEFECTIVE', count: '15' },
          ],
        });

      const result = await service.getExceptionSummary();

      expect(result.total).toBe(100);
      expect(result.open).toBe(30);
      expect(result.resolved).toBe(70);
      expect(result.byType).toEqual({
        SHORT_PICK: 40,
        DAMAGE: 20,
        DEFECTIVE: 15,
      });
    });

    it('should return empty byType when no exceptions', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0', open: '0', resolved: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getExceptionSummary();

      expect(result.total).toBe(0);
      expect(result.byType).toEqual({});
    });
  });

  // ==========================================================================
  // REPORT PROBLEM
  // ==========================================================================

  describe('reportProblem', () => {
    it('should report a general problem', async () => {
      const dto = {
        problemType: 'EQUIPMENT_FAILURE',
        location: 'Zone A',
        description: 'Forklift not working',
        reportedBy: 'user-001',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{}] });

      const result = await service.reportProblem(dto);

      expect(result.problemId).toMatch(/^PROB-/);
      expect(result.problemType).toBe('EQUIPMENT_FAILURE');
      expect(result.status).toBe('OPEN');
      expect(logger.info).toHaveBeenCalledWith('Problem reported', expect.any(Object));
      expect(notifyExceptionReported).toHaveBeenCalled();
    });

    it('should handle problem without location', async () => {
      const dto = {
        problemType: 'SAFETY_HAZARD',
        description: 'Spill in aisle 3',
        reportedBy: 'user-001',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{}] });

      const result = await service.reportProblem(dto);

      expect(result.location).toBeNull();
    });

    it('should handle database errors', async () => {
      const dto = {
        problemType: 'EQUIPMENT_FAILURE',
        description: 'Forklift broken',
        reportedBy: 'user-001',
      };

      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.reportProblem(dto)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error reporting problem', expect.any(Error));
    });
  });

  // ==========================================================================
  // GET PROBLEM REPORTS
  // ==========================================================================

  describe('getProblemReports', () => {
    it('should return problem reports', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] }).mockResolvedValueOnce({
        rows: [
          {
            exception_id: 'PROB-001',
            type: 'PROBLEM_EQUIPMENT_FAILURE',
            reason: 'Forklift broken',
            reported_by: 'user-001',
            reported_at: '2024-01-01T00:00:00Z',
            status: 'OPEN',
          },
        ],
      });

      const result = await service.getProblemReports();

      expect(result.problems).toHaveLength(1);
      expect(result.total).toBe(5);
      expect(result.problems[0].problemType).toBe('EQUIPMENT FAILURE');
    });

    it('should filter by status', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getProblemReports({ status: 'RESOLVED' });

      expect(mockQuery.mock.calls[0][0]).toContain('status =');
    });

    it('should filter by problemType', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getProblemReports({ problemType: 'EQUIPMENT_FAILURE' });

      expect(mockQuery.mock.calls[0][0]).toContain('LIKE');
      expect(mockQuery.mock.calls[0][1]).toContain('PROBLEM_EQUIPMENT_FAILURE%');
    });

    it('should apply pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getProblemReports({ limit: 10, offset: 5 });

      const selectCall = mockQuery.mock.calls[1];
      expect(selectCall[1]).toContain(10);
      expect(selectCall[1]).toContain(5);
    });
  });

  // ==========================================================================
  // RESOLVE PROBLEM REPORT
  // ==========================================================================

  describe('resolveProblemReport', () => {
    it('should resolve a problem report', async () => {
      const dto = {
        problemId: 'PROB-001',
        resolution: 'Repaired forklift',
        notes: 'Maintenance completed',
        resolvedBy: 'supervisor-001',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ ...mockExceptionRow, status: 'RESOLVED' }] });

      const result = await service.resolveProblemReport(dto);

      expect(result.status).toBe('RESOLVED');
      expect(result.problemId).toBe('PROB-001');
      expect(logger.info).toHaveBeenCalledWith('Problem report resolved', expect.any(Object));
    });

    it('should throw error when problem not found', async () => {
      const dto = {
        problemId: 'NOT-FOUND',
        resolution: 'Fixed',
        notes: 'Test',
        resolvedBy: 'user-001',
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.resolveProblemReport(dto)).rejects.toThrow(
        'Problem report NOT-FOUND not found'
      );
    });

    it('should handle database errors', async () => {
      const dto = {
        problemId: 'PROB-001',
        resolution: 'Fixed',
        notes: 'Test',
        resolvedBy: 'user-001',
      };

      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(service.resolveProblemReport(dto)).rejects.toThrow('Database error');
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('orderExceptionService singleton', () => {
    it('should export singleton instance', () => {
      expect(orderExceptionService).toBeInstanceOf(OrderExceptionService);
    });
  });
});
