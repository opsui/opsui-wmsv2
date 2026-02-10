/**
 * Unit tests for RootCauseAnalysisService
 * @covers src/services/RootCauseAnalysisService.ts
 */

import { RootCauseAnalysisService } from '../RootCauseAnalysisService';
import { getPool } from '../../db/client';
import type {
  RootCauseCategory,
  VarianceRootCause,
  RecordRootCauseDTO,
} from '../RootCauseAnalysisService';

// Mock dependencies
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'abc123'),
}));

describe('RootCauseAnalysisService', () => {
  let rootCauseService: RootCauseAnalysisService;
  let mockClient: any;

  // Helper to create mock root cause category (database row format)
  const createMockCategoryRow = (overrides: any = {}): any => ({
    category_id: 'CAT-001',
    category_name: 'Data Entry Error',
    category_code: 'DATA_ENTRY',
    description: 'Errors in data entry',
    display_order: '1',
    is_active: true,
    created_at: new Date('2024-01-01'),
    ...overrides,
  });

  // Helper to create mock variance root cause (database row format)
  const createMockRootCauseRow = (overrides: any = {}): any => ({
    root_cause_id: 'VRC-ABC123',
    entry_id: 'ENTRY-001',
    category_id: 'CAT-001',
    additional_notes: null,
    created_by: 'user-123',
    created_at: new Date('2024-01-01'),
    ...overrides,
  });

  // Helper to create expected category (output format)
  const createMockCategory = (overrides: any = {}): RootCauseCategory => ({
    categoryId: 'CAT-001',
    categoryName: 'Data Entry Error',
    categoryCode: 'DATA_ENTRY',
    description: 'Errors in data entry',
    displayOrder: 1,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    rootCauseService = new RootCauseAnalysisService();

    mockClient = {
      query: jest.fn(),
    };

    (getPool as jest.Mock).mockResolvedValue(mockClient);
  });

  // ==========================================================================
  // ROOT CAUSE CATEGORIES
  // ==========================================================================

  describe('getAllCategories', () => {
    it('should return all active root cause categories', async () => {
      const mockRows = [
        createMockCategoryRow({ category_id: 'CAT-001', category_name: 'Data Entry Error' }),
        createMockCategoryRow({ category_id: 'CAT-002', category_name: 'Picking Error' }),
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await rootCauseService.getAllCategories();

      expect(result).toHaveLength(2);
      expect(result[0].categoryName).toBe('Data Entry Error');
      expect(result[1].categoryName).toBe('Picking Error');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = true')
      );
    });

    it('should return categories ordered by display order', async () => {
      const mockRows = [
        createMockCategoryRow({ category_id: 'CAT-001', display_order: '1' }),
        createMockCategoryRow({ category_id: 'CAT-002', display_order: '2' }),
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      await rootCauseService.getAllCategories();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY display_order ASC')
      );
    });
  });

  describe('getCategory', () => {
    it('should return a category by ID', async () => {
      const mockRow = createMockCategoryRow();
      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await rootCauseService.getCategory('CAT-001');

      expect(result.categoryId).toBe('CAT-001');
      expect(result.categoryName).toBe('Data Entry Error');
      expect(result.categoryCode).toBe('DATA_ENTRY');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE category_id = $1'),
        ['CAT-001']
      );
    });

    it('should throw error when category not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(rootCauseService.getCategory('NONEXISTENT')).rejects.toThrow(
        'Root cause category NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // RECORD ROOT CAUSE
  // ==========================================================================

  describe('recordRootCause', () => {
    it('should record a root cause for a variance entry', async () => {
      const dto: RecordRootCauseDTO = {
        entryId: 'ENTRY-001',
        categoryId: 'CAT-001',
        additionalNotes: 'User entered wrong quantity',
        createdBy: 'user-123',
      };

      const mockCategoryRow = createMockCategoryRow();
      const mockRootCauseRow = createMockRootCauseRow(dto);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCategoryRow] }) // Verify category
        .mockResolvedValueOnce({ rows: [mockRootCauseRow] }) // Insert result
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await rootCauseService.recordRootCause(dto);

      expect(result.rootCauseId).toBe('VRC-ABC123');
      expect(result.entryId).toBe('ENTRY-001');
      expect(result.categoryId).toBe('CAT-001');
      expect(result.categoryName).toBe('Data Entry Error');
    });

    it('should throw error when category not found', async () => {
      const dto: RecordRootCauseDTO = {
        entryId: 'ENTRY-001',
        categoryId: 'NONEXISTENT',
        createdBy: 'user-123',
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Category not found
      mockClient.query.mockRejectedValueOnce(
        new Error('Root cause category NONEXISTENT not found')
      );

      await expect(rootCauseService.recordRootCause(dto)).rejects.toThrow(
        'Root cause category NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // PARETO ANALYSIS
  // ==========================================================================

  describe('getRootCausePareto', () => {
    it('should return Pareto analysis data', async () => {
      const mockRows = [
        {
          category: 'Data Entry Error',
          category_code: 'DATA_ENTRY',
          count: '50',
          total_variance: '500',
        },
        {
          category: 'Picking Error',
          category_code: 'PICKING',
          count: '30',
          total_variance: '300',
        },
        {
          category: 'Receiving Error',
          category_code: 'RECEIVING',
          count: '20',
          total_variance: '200',
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await rootCauseService.getRootCausePareto(30);

      expect(result).toHaveLength(3);
      expect(result[0].cumulativePercent).toBe(50);
      expect(result[1].cumulativePercent).toBe(80);
      expect(result[2].cumulativePercent).toBe(100);
    });

    it('should use default days of 30 when not provided', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await rootCauseService.getRootCausePareto();

      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '30 days'"));
    });

    it('should use custom days parameter', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await rootCauseService.getRootCausePareto(60);

      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '60 days'"));
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should return category breakdown with trends', async () => {
      const mockRows = [
        {
          category: 'Data Entry Error',
          category_code: 'DATA_ENTRY',
          variance_count: '50',
          average_variance_percent: '5.5',
          previous_count: '35',
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await rootCauseService.getCategoryBreakdown(30);

      expect(result).toHaveLength(1);
      expect(result[0].trend).toBe('INCREASING');
      expect(result[0].recentCount).toBe(50);
      expect(result[0].previousCount).toBe(35);
    });

    it('should identify decreasing trend', async () => {
      const mockRows = [
        {
          category: 'Picking Error',
          category_code: 'PICKING',
          variance_count: '10',
          average_variance_percent: '4.0',
          previous_count: '30',
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await rootCauseService.getCategoryBreakdown(30);

      expect(result[0].trend).toBe('DECREASING');
    });

    it('should identify stable trend when change is minimal', async () => {
      const mockRows = [
        {
          category: 'Receiving Error',
          category_code: 'RECEIVING',
          variance_count: '25',
          average_variance_percent: '3.0',
          previous_count: '24',
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await rootCauseService.getCategoryBreakdown(30);

      expect(result[0].trend).toBe('STABLE');
    });
  });

  describe('getTrendingRootCauses', () => {
    it('should return trending root causes', async () => {
      const mockRows = [
        {
          category: 'Data Entry Error',
          category_code: 'DATA_ENTRY',
          current_period_count: '30',
          previous_period_count: '20',
          percent_change: '50',
        },
        {
          category: 'Picking Error',
          category_code: 'PICKING',
          current_period_count: '10',
          previous_period_count: '15',
          percent_change: '-33.33',
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await rootCauseService.getTrendingRootCauses(30);

      expect(result).toHaveLength(2);
      expect(result[0].trend).toBe('INCREASING');
      expect(result[1].trend).toBe('DECREASING');
    });

    it('should identify stable trend when change is minimal', async () => {
      const mockRows = [
        {
          category: 'Receiving Error',
          category_code: 'RECEIVING',
          current_period_count: '25',
          previous_period_count: '24',
          percent_change: '4.17',
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await rootCauseService.getTrendingRootCauses(30);

      expect(result[0].trend).toBe('STABLE');
    });
  });

  // ==========================================================================
  // ROOT CAUSE BY SKU
  // ==========================================================================

  describe('getRootCauseBySKU', () => {
    it('should return root causes grouped by SKU', async () => {
      const mockRows = [
        {
          sku: 'SKU-001',
          sku_name: 'Product A',
          category_name: 'Data Entry Error',
          category_code: 'DATA_ENTRY',
          count: '10',
        },
        {
          sku: 'SKU-001',
          sku_name: 'Product A',
          category_name: 'Picking Error',
          category_code: 'PICKING',
          count: '5',
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await rootCauseService.getRootCauseBySKU('SKU-001', 30);

      expect(result).toHaveLength(1);
      expect(result[0].sku).toBe('SKU-001');
      expect(result[0].mostFrequentCategory).toBe('Data Entry Error');
      expect(result[0].totalVarianceCount).toBe(15);
    });

    it('should pass sku and days parameters correctly', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await rootCauseService.getRootCauseBySKU('SKU-001', 60);

      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '60 days'"), [
        'SKU-001',
      ]);
    });
  });

  // ==========================================================================
  // ROOT CAUSE BY ZONE
  // ==========================================================================

  describe('getRootCauseByZone', () => {
    it('should return root causes grouped by zone', async () => {
      const mockRows = [
        {
          zone: 'A',
          category_name: 'Picking Error',
          category_code: 'PICKING',
          count: '20',
        },
        {
          zone: 'A',
          category_name: 'Damage',
          category_code: 'DAMAGE',
          count: '5',
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await rootCauseService.getRootCauseByZone('A', 30);

      expect(result).toHaveLength(1);
      expect(result[0].zone).toBe('A');
      expect(result[0].mostFrequentCategory).toBe('Picking Error');
      expect(result[0].totalVarianceCount).toBe(25);
    });

    it('should pass zone and days parameters correctly', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await rootCauseService.getRootCauseByZone('B', 60);

      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '60 days'"), [
        'B',
      ]);
    });
  });

  // ==========================================================================
  // GET ROOT CAUSE FOR ENTRY
  // ==========================================================================

  describe('getRootCauseForEntry', () => {
    it('should return root cause for a specific entry', async () => {
      const mockRow = {
        root_cause_id: 'VRC-001',
        entry_id: 'ENTRY-001',
        category_id: 'CAT-001',
        category_name: 'Data Entry Error',
        category_code: 'DATA_ENTRY',
        additional_notes: 'User entered wrong quantity',
        created_by: 'user-123',
        created_at: new Date('2024-01-01'),
      };

      mockClient.query.mockResolvedValue({ rows: [mockRow] });

      const result = await rootCauseService.getRootCauseForEntry('ENTRY-001');

      expect(result).not.toBeNull();
      expect(result?.rootCauseId).toBe('VRC-001');
      expect(result?.categoryName).toBe('Data Entry Error');
    });

    it('should return null when no root cause found for entry', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await rootCauseService.getRootCauseForEntry('NONEXISTENT');

      expect(result).toBeNull();
    });
  });
});
