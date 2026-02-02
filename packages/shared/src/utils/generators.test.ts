/**
 * Unit tests for generators.ts
 *
 * Tests ID generation and bin location utilities
 */

import { describe, it, expect } from 'vitest';
import {
  generateOrderId,
  generateOrderItemId,
  generatePickTaskId,
  generateUserId,
  generateInventoryUnitId,
  generateTransactionId,
  generateStateChangeId,
  generateBinId,
  parseBinLocation,
  areBinsAdjacent,
  sortBinsForPicking,
} from './generators';

// ============================================================================
// ID GENERATION TESTS
// ============================================================================

describe('ID Generators', () => {
  describe('generateOrderId', () => {
    it('should generate an order ID with correct prefix', () => {
      const orderId = generateOrderId();
      expect(orderId).toMatch(/^SO\d{4}$/);
    });

    it('should generate different IDs on multiple calls', () => {
      const id1 = generateOrderId();
      const id2 = generateOrderId();
      expect(id1).not.toBe(id2);
    });

    it('should accept a custom date parameter', () => {
      const customDate = new Date('2024-01-15');
      const orderId = generateOrderId(customDate);
      expect(orderId).toMatch(/^SO\d{4}$/);
    });

    it('should generate 4-digit numbers in valid range', () => {
      const orderId = generateOrderId();
      const num = parseInt(orderId.slice(2));
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThanOrEqual(9999);
    });
  });

  describe('generateOrderItemId', () => {
    it('should generate an order item ID with correct format', () => {
      const itemId = generateOrderItemId();
      expect(itemId).toMatch(/^OI-[A-Z0-9]{8}$/);
    });

    it('should generate different IDs on multiple calls', () => {
      const id1 = generateOrderItemId();
      const id2 = generateOrderItemId();
      expect(id1).not.toBe(id2);
    });

    it('should have correct prefix', () => {
      const itemId = generateOrderItemId();
      expect(itemId.slice(0, 3)).toBe('OI-');
    });
  });

  describe('generatePickTaskId', () => {
    it('should generate a pick task ID with correct format', () => {
      const taskId = generatePickTaskId();
      expect(taskId).toMatch(/^PT-[A-Z0-9]{8}$/);
    });

    it('should generate different IDs on multiple calls', () => {
      const id1 = generatePickTaskId();
      const id2 = generatePickTaskId();
      expect(id1).not.toBe(id2);
    });

    it('should have correct prefix', () => {
      const taskId = generatePickTaskId();
      expect(taskId.slice(0, 3)).toBe('PT-');
    });
  });

  describe('generateUserId', () => {
    it('should generate a user ID with correct format', () => {
      const userId = generateUserId();
      expect(userId).toMatch(/^USR-[A-Z0-9]{8}$/);
    });

    it('should generate different IDs on multiple calls', () => {
      const id1 = generateUserId();
      const id2 = generateUserId();
      expect(id1).not.toBe(id2);
    });

    it('should have correct prefix', () => {
      const userId = generateUserId();
      expect(userId.slice(0, 4)).toBe('USR-');
    });
  });

  describe('generateInventoryUnitId', () => {
    it('should generate an inventory unit ID with correct format', () => {
      const unitId = generateInventoryUnitId();
      expect(unitId).toMatch(/^IU-[A-Z0-9]{8}$/);
    });

    it('should generate different IDs on multiple calls', () => {
      const id1 = generateInventoryUnitId();
      const id2 = generateInventoryUnitId();
      expect(id1).not.toBe(id2);
    });

    it('should have correct prefix', () => {
      const unitId = generateInventoryUnitId();
      expect(unitId.slice(0, 3)).toBe('IU-');
    });
  });

  describe('generateTransactionId', () => {
    it('should generate a transaction ID with correct format', () => {
      const txnId = generateTransactionId();
      expect(txnId).toMatch(/^TXN-\d{8}-\d{8}$/);
    });

    it('should use the current date by default', () => {
      const now = new Date();
      const txnId = generateTransactionId();
      // Format: TXN-YYYYMMDD-XXXXXXXX
      const datePart = txnId.slice(4, 12);
      const expectedDate = now.toISOString().slice(0, 10).replace(/-/g, '');
      expect(datePart).toBe(expectedDate);
    });

    it('should accept a custom date parameter', () => {
      const customDate = new Date('2024-01-15T10:30:00Z');
      const txnId = generateTransactionId(customDate);
      expect(txnId.slice(0, 13)).toBe('TXN-20240115-');
    });
  });

  describe('generateStateChangeId', () => {
    it('should generate a state change ID with correct format', () => {
      const stateId = generateStateChangeId();
      // Format: OSC-YYYYMMDD-TIMESTAMP(millis)-RANDOM
      // Millis can be 12-13 digits depending on date
      expect(stateId).toMatch(/^OSC-\d{8}-\d{12,13}-\d{4}$/);
    });

    it('should use the current date by default', () => {
      const now = new Date();
      const stateId = generateStateChangeId();
      // Format: OSC-YYYYMMDD-TIMESTAMP(millis)-RANDOM
      const datePart = stateId.slice(4, 12);
      const expectedDate = now.toISOString().slice(0, 10).replace(/-/g, '');
      expect(datePart).toBe(expectedDate);
    });

    it('should accept a custom date parameter', () => {
      const customDate = new Date('2024-01-15T10:30:00.123Z');
      const stateId = generateStateChangeId(customDate);
      expect(stateId.slice(0, 13)).toBe('OSC-20240115-');
    });

    it('should generate different IDs on multiple calls', () => {
      const id1 = generateStateChangeId();
      const id2 = generateStateChangeId();
      expect(id1).not.toBe(id2);
    });
  });
});

// ============================================================================
// BIN LOCATION TESTS
// ============================================================================

describe('Bin Location Utilities', () => {
  describe('generateBinId', () => {
    it('should generate correct format with uppercase zone', () => {
      const binId = generateBinId('a', '1', '2');
      expect(binId).toBe('A-01-02');
    });

    it('should pad aisle and shelf with zeros', () => {
      const binId = generateBinId('B', '5', '9');
      expect(binId).toBe('B-05-09');
    });

    it('should handle multi-digit aisles and shelves', () => {
      const binId = generateBinId('C', '12', '34');
      expect(binId).toBe('C-12-34');
    });

    it('should trim whitespace from zone', () => {
      const binId = generateBinId('  D  ', '1', '2');
      expect(binId).toBe('D-01-02');
    });

    it('should handle lowercase zone input', () => {
      const binId = generateBinId('e', '1', '2');
      expect(binId).toBe('E-01-02');
    });
  });

  describe('parseBinLocation', () => {
    it('should parse valid bin location correctly', () => {
      const result = parseBinLocation('A-01-02');
      expect(result).toEqual({
        zone: 'A',
        aisle: '01',
        shelf: '02',
      });
    });

    it('should parse bin location with multi-digit aisle', () => {
      const result = parseBinLocation('B-12-34');
      expect(result).toEqual({
        zone: 'B',
        aisle: '12',
        shelf: '34',
      });
    });

    it('should return undefined for invalid format', () => {
      expect(parseBinLocation('INVALID')).toBeUndefined();
      expect(parseBinLocation('A-1')).toBeUndefined();
      expect(parseBinLocation('A-01-02-03')).toBeUndefined();
      expect(parseBinLocation('')).toBeUndefined();
      expect(parseBinLocation('a-01-02')).toBeUndefined(); // lowercase zone
    });

    it('should return undefined for missing components', () => {
      expect(parseBinLocation('A-01')).toBeUndefined();
      expect(parseBinLocation('-01-02')).toBeUndefined();
      expect(parseBinLocation('A--02')).toBeUndefined();
    });
  });

  describe('areBinsAdjacent', () => {
    it('should return true for same aisle, adjacent shelf', () => {
      expect(areBinsAdjacent('A-01-02', 'A-01-03')).toBe(true);
      expect(areBinsAdjacent('B-05-10', 'B-05-11')).toBe(true);
    });

    it('should return true for adjacent aisle, same shelf', () => {
      expect(areBinsAdjacent('A-01-02', 'A-02-02')).toBe(true);
      expect(areBinsAdjacent('B-05-10', 'B-06-10')).toBe(true);
    });

    it('should return true for same bin (shelf diff of 0 is <= 1)', () => {
      // The actual implementation returns true for identical bins
      expect(areBinsAdjacent('A-01-02', 'A-01-02')).toBe(true);
    });

    it('should return false for different zones', () => {
      expect(areBinsAdjacent('A-01-02', 'B-01-02')).toBe(false);
    });

    it('should return false for non-adjacent shelves', () => {
      expect(areBinsAdjacent('A-01-02', 'A-01-05')).toBe(false);
    });

    it('should return false for non-adjacent aisles', () => {
      expect(areBinsAdjacent('A-01-02', 'A-03-02')).toBe(false);
    });

    it('should return false for invalid bin locations', () => {
      expect(areBinsAdjacent('INVALID', 'A-01-02')).toBe(false);
      expect(areBinsAdjacent('A-01-02', 'INVALID')).toBe(false);
      expect(areBinsAdjacent('INVALID', 'INVALID')).toBe(false);
    });

    it('should handle edge case of shelf difference of exactly 1', () => {
      expect(areBinsAdjacent('A-01-09', 'A-01-10')).toBe(true);
      expect(areBinsAdjacent('A-01-10', 'A-01-09')).toBe(true);
    });
  });

  describe('sortBinsForPicking', () => {
    it('should sort bins by zone, then aisle, then shelf', () => {
      const bins = ['C-02-03', 'A-01-02', 'B-05-10', 'A-02-01'];
      const sorted = sortBinsForPicking(bins);
      expect(sorted).toEqual(['A-01-02', 'A-02-01', 'B-05-10', 'C-02-03']);
    });

    it('should not modify the original array', () => {
      const bins = ['C-02-03', 'A-01-02', 'B-05-10'];
      const original = [...bins];
      sortBinsForPicking(bins);
      expect(bins).toEqual(original);
    });

    it('should handle empty array', () => {
      expect(sortBinsForPicking([])).toEqual([]);
    });

    it('should handle single element array', () => {
      expect(sortBinsForPicking(['A-01-02'])).toEqual(['A-01-02']);
    });

    it('should handle invalid locations (they maintain relative order)', () => {
      const bins = ['A-01-02', 'INVALID', 'B-05-10', ''];
      const sorted = sortBinsForPicking(bins);
      // When parsing fails, the sort returns 0, so items maintain their relative order
      // Valid locations are sorted among themselves
      expect(sorted).toEqual(['A-01-02', 'INVALID', 'B-05-10', '']);
    });

    it('should sort correctly with multi-digit aisles and shelves', () => {
      const bins = ['A-10-10', 'A-02-20', 'A-09-01', 'A-02-19'];
      const sorted = sortBinsForPicking(bins);
      expect(sorted).toEqual(['A-02-19', 'A-02-20', 'A-09-01', 'A-10-10']);
    });

    it('should maintain stable sort for equal elements', () => {
      const bins = ['A-01-02', 'A-01-02', 'B-01-01'];
      const sorted = sortBinsForPicking(bins);
      expect(sorted).toHaveLength(3);
      expect(sorted[0]).toBe('A-01-02');
      expect(sorted[1]).toBe('A-01-02');
      expect(sorted[2]).toBe('B-01-01');
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Bin Location Integration', () => {
  describe('generate and parse roundtrip', () => {
    it('should generate and parse correctly', () => {
      const binId = generateBinId('A', '1', '2');
      const parsed = parseBinLocation(binId);
      expect(parsed).toEqual({
        zone: 'A',
        aisle: '01',
        shelf: '02',
      });
    });
  });

  describe('sorting and adjacency', () => {
    it('should place adjacent bins next to each other after sorting', () => {
      const bins = ['A-01-02', 'A-01-04', 'A-01-03'];
      const sorted = sortBinsForPicking(bins);
      expect(areBinsAdjacent(sorted[0], sorted[1])).toBe(true);
      expect(areBinsAdjacent(sorted[1], sorted[2])).toBe(true);
    });
  });
});
