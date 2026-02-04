/**
 * Tests for pagination utilities
 * @covers src/utils/pagination.ts
 */

import {
  calculatePaginationMeta,
  parsePaginationParams,
  calculateSqlOffset,
  addOrderByClause,
  addPaginationClause,
  sendPaginatedResponse,
  PaginationParams,
} from '../pagination';

// Mock Response for sendPaginatedResponse
const mockResponse = () => {
  const res: any = {
    json: jest.fn(),
  };
  return res;
};

describe('Pagination Utilities', () => {
  // ==========================================================================
  // calculatePaginationMeta
  // ==========================================================================

  describe('calculatePaginationMeta', () => {
    it('should calculate pagination meta correctly for middle page', () => {
      const result = calculatePaginationMeta(100, 2, 20);

      expect(result).toEqual({
        page: 2,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
        nextPage: 3,
        previousPage: 1,
      });
    });

    it('should calculate pagination meta for first page', () => {
      const result = calculatePaginationMeta(100, 1, 20);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
        nextPage: 2,
        previousPage: undefined,
      });
    });

    it('should calculate pagination meta for last page', () => {
      const result = calculatePaginationMeta(95, 5, 20);

      expect(result).toEqual({
        page: 5,
        limit: 20,
        total: 95,
        totalPages: 5,
        hasNextPage: false,
        hasPreviousPage: true,
        nextPage: undefined,
        previousPage: 4,
      });
    });

    it('should handle single page results', () => {
      const result = calculatePaginationMeta(10, 1, 20);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        nextPage: undefined,
        previousPage: undefined,
      });
    });

    it('should handle empty results', () => {
      const result = calculatePaginationMeta(0, 1, 20);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        nextPage: undefined,
        previousPage: undefined,
      });
    });

    it('should handle exact page division', () => {
      const result = calculatePaginationMeta(100, 5, 20);

      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(false);
    });
  });

  // ==========================================================================
  // parsePaginationParams
  // ==========================================================================

  describe('parsePaginationParams', () => {
    it('should parse valid pagination params', () => {
      const query = {
        page: '2',
        limit: '50',
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const result = parsePaginationParams(query);

      expect(result).toEqual({
        page: 2,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });

    it('should use defaults when params are missing', () => {
      const query = {};

      const result = parsePaginationParams(query, 1, 20, 100);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should enforce max limit', () => {
      const query = { limit: '200' };

      const result = parsePaginationParams(query, 1, 20, 100);

      expect(result.limit).toBe(100);
    });

    it('should enforce minimum limit of 1', () => {
      const query = { limit: '0' };

      const result = parsePaginationParams(query);

      expect(result.limit).toBe(1);
    });

    it('should enforce minimum page of defaultPage', () => {
      const query = { page: '0' };

      const result = parsePaginationParams(query, 1, 20, 100);

      expect(result.page).toBe(1);
    });

    it('should return NaN for non-numeric values', () => {
      const query = {
        page: 'abc',
        limit: 'xyz',
      };

      const result = parsePaginationParams(query, 1, 20, 100);

      // When parsing non-numeric strings, parseInt returns NaN
      expect(result.page).toBeNaN();
      expect(result.limit).toBeNaN();
    });

    it('should use custom defaults', () => {
      const query = {};

      const result = parsePaginationParams(query, 5, 50, 200);

      expect(result).toEqual({
        page: 5,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('should accept desc sortOrder', () => {
      const query = { sortOrder: 'desc' };

      const result = parsePaginationParams(query);

      expect(result.sortOrder).toBe('desc');
    });
  });

  // ==========================================================================
  // calculateSqlOffset
  // ==========================================================================

  describe('calculateSqlOffset', () => {
    it('should calculate offset for first page', () => {
      const pagination: PaginationParams = { page: 1, limit: 20 };

      const result = calculateSqlOffset(pagination);

      expect(result).toEqual({
        offset: 0,
        limit: 20,
      });
    });

    it('should calculate offset for second page', () => {
      const pagination: PaginationParams = { page: 2, limit: 20 };

      const result = calculateSqlOffset(pagination);

      expect(result).toEqual({
        offset: 20,
        limit: 20,
      });
    });

    it('should calculate offset for tenth page', () => {
      const pagination: PaginationParams = { page: 10, limit: 50 };

      const result = calculateSqlOffset(pagination);

      expect(result).toEqual({
        offset: 450,
        limit: 50,
      });
    });
  });

  // ==========================================================================
  // addOrderByClause
  // ==========================================================================

  describe('addOrderByClause', () => {
    it('should add valid sort by column with ASC order', () => {
      const sql = 'SELECT * FROM orders';
      const result = addOrderByClause(sql, 'createdAt', 'asc');

      expect(result).toBe('SELECT * FROM orders ORDER BY createdAt ASC');
    });

    it('should add valid sort by column with DESC order', () => {
      const sql = 'SELECT * FROM orders';
      const result = addOrderByClause(sql, 'status', 'desc');

      expect(result).toBe('SELECT * FROM orders ORDER BY status DESC');
    });

    it('should default to DESC when sortOrder is not specified', () => {
      const sql = 'SELECT * FROM orders';
      const result = addOrderByClause(sql, 'orderId');

      expect(result).toBe('SELECT * FROM orders ORDER BY orderId DESC');
    });

    it('should fallback to createdAt for invalid sortBy', () => {
      const sql = 'SELECT * FROM orders';
      const result = addOrderByClause(sql, 'malicious; DROP TABLE users; --', 'asc');

      expect(result).toBe('SELECT * FROM orders ORDER BY createdAt ASC');
    });

    it('should handle all valid sort columns', () => {
      const validColumns = [
        'createdAt',
        'updatedAt',
        'orderId',
        'sku',
        'status',
        'priority',
        'name',
        'quantity',
      ];

      validColumns.forEach(column => {
        const sql = 'SELECT * FROM products';
        const result = addOrderByClause(sql, column, 'asc');
        expect(result).toContain(`ORDER BY ${column} ASC`);
      });
    });

    it('should preserve existing SQL when appending ORDER BY', () => {
      const sql = 'SELECT id, name FROM products WHERE category = "widgets"';
      const result = addOrderByClause(sql, 'name', 'asc');

      expect(result).toBe(
        'SELECT id, name FROM products WHERE category = "widgets" ORDER BY name ASC'
      );
    });
  });

  // ==========================================================================
  // addPaginationClause
  // ==========================================================================

  describe('addPaginationClause', () => {
    it('should add LIMIT and OFFSET with parameterized placeholders', () => {
      const sql = 'SELECT * FROM orders';
      const result = addPaginationClause(sql, 0, 20);

      expect(result).toBe('SELECT * FROM orders LIMIT $1 OFFSET $2');
    });

    it('should use correct parameter index based on offset', () => {
      const sql = 'SELECT * FROM orders WHERE status = $1';
      const result = addPaginationClause(sql, 1, 20);

      expect(result).toBe('SELECT * FROM orders WHERE status = $1 LIMIT $2 OFFSET $3');
    });

    it('should handle larger offset values', () => {
      const sql = 'SELECT * FROM orders';
      const result = addPaginationClause(sql, 100, 50);

      expect(result).toBe('SELECT * FROM orders LIMIT $101 OFFSET $102');
    });
  });

  // ==========================================================================
  // sendPaginatedResponse (integration test)
  // ==========================================================================

  describe('sendPaginatedResponse', () => {
    it('should send paginated response with metadata', () => {
      const res = mockResponse();
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const pagination: PaginationParams = { page: 1, limit: 20 };

      sendPaginatedResponse(res, data, 3, pagination);

      expect(res.json).toHaveBeenCalledWith({
        data,
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          nextPage: undefined,
          previousPage: undefined,
        },
        success: true,
      });
    });

    it('should handle large datasets with multiple pages', () => {
      const res = mockResponse();
      const data = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
      const pagination: PaginationParams = { page: 1, limit: 20 };

      sendPaginatedResponse(res, data, 100, pagination);

      const expectedCall = res.json as jest.Mock;
      const responseBody = expectedCall.mock.calls[0][0];

      expect(responseBody.pagination.totalPages).toBe(5);
      expect(responseBody.pagination.hasNextPage).toBe(true);
      expect(responseBody.pagination.hasPreviousPage).toBe(false);
      expect(responseBody.pagination.nextPage).toBe(2);
    });
  });
});
