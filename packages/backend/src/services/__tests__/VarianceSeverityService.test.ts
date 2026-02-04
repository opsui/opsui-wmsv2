/**
 * Unit tests for VarianceSeverityService
 * @covers src/services/VarianceSeverityService.ts
 */

import { VarianceSeverityService, varianceSeverityService } from '../VarianceSeverityService';
import {
  VarianceSeverityConfig,
  SeverityDetermination,
  CreateSeverityConfigDTO,
  UpdateSeverityConfigDTO,
} from '../VarianceSeverityService';

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

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'abc123xyz4'),
}));

import { getPool } from '../../db/client';
import { logger } from '../../config/logger';

describe('VarianceSeverityService', () => {
  let service: VarianceSeverityService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  const mockConfigRow: any = {
    config_id: 'VSC-ABC123XYZ4',
    severity_level: 'MEDIUM',
    min_variance_percent: '2',
    max_variance_percent: '5',
    requires_approval: true,
    requires_manager_approval: false,
    auto_adjust: false,
    color_code: '#F59E0B',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuery = jest.fn();
    mockPool = { query: mockQuery };

    (getPool as jest.Mock).mockReturnValue(mockPool);
    service = new VarianceSeverityService();
  });

  // ==========================================================================
  // GET ALL SEVERITY CONFIGS
  // ==========================================================================

  describe('getAllSeverityConfigs', () => {
    it('should return all active severity configs', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockConfigRow],
      });

      const result = await service.getAllSeverityConfigs();

      expect(result).toHaveLength(1);
      expect(result[0].configId).toBe('VSC-ABC123XYZ4');
      expect(result[0].severityLevel).toBe('MEDIUM');
      expect(mockQuery).toHaveBeenCalledWith(
        `SELECT * FROM variance_severity_config
       WHERE $1 OR is_active = true
       ORDER BY min_variance_percent ASC`,
        [false]
      );
    });

    it('should include inactive configs when requested', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockConfigRow, { ...mockConfigRow, config_id: 'VSC-INACTIVE', is_active: false }],
      });

      const result = await service.getAllSeverityConfigs(true);

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE $1 OR is_active = true'),
        [true]
      );
    });

    it('should return empty array when no configs exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getAllSeverityConfigs();

      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // GET SEVERITY CONFIG
  // ==========================================================================

  describe('getSeverityConfig', () => {
    it('should return config by ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockConfigRow] });

      const result = await service.getSeverityConfig('VSC-ABC123XYZ4');

      expect(result.configId).toBe('VSC-ABC123XYZ4');
      expect(result.severityLevel).toBe('MEDIUM');
      expect(result.minVariancePercent).toBe(2);
      expect(result.maxVariancePercent).toBe(5);
      expect(result.requiresApproval).toBe(true);
      expect(result.autoAdjust).toBe(false);
    });

    it('should throw error when config not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(service.getSeverityConfig('NOT-FOUND')).rejects.toThrow(
        'Severity config NOT-FOUND not found'
      );
    });
  });

  // ==========================================================================
  // GET SEVERITY FOR VARIANCE
  // ==========================================================================

  describe('getSeverityForVariance', () => {
    it('should determine LOW severity for small variance', async () => {
      const lowConfigRow = {
        ...mockConfigRow,
        severity_level: 'LOW',
        min_variance_percent: '0',
        max_variance_percent: '2',
        color_code: '#10B981',
        requires_approval: false,
        auto_adjust: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [lowConfigRow] });

      const result = await service.getSeverityForVariance(1.5);

      expect(result.severity).toBe('LOW');
      expect(result.requiresApproval).toBe(false);
      expect(result.canAutoAdjust).toBe(true);
      expect(result.colorCode).toBe('#10B981');
    });

    it('should determine MEDIUM severity for moderate variance', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockConfigRow] });

      const result = await service.getSeverityForVariance(3.5);

      expect(result.severity).toBe('MEDIUM');
      expect(result.requiresApproval).toBe(true);
      expect(result.canAutoAdjust).toBe(false);
    });

    it('should determine HIGH severity for large variance', async () => {
      const highConfigRow = {
        ...mockConfigRow,
        severity_level: 'HIGH',
        min_variance_percent: '5',
        max_variance_percent: '10',
        color_code: '#F97316',
      };

      mockQuery.mockResolvedValueOnce({ rows: [highConfigRow] });

      const result = await service.getSeverityForVariance(7);

      expect(result.severity).toBe('HIGH');
      expect(result.colorCode).toBe('#F97316');
    });

    it('should determine CRITICAL severity for extreme variance', async () => {
      const criticalConfigRow = {
        ...mockConfigRow,
        severity_level: 'CRITICAL',
        min_variance_percent: '10',
        max_variance_percent: '999999',
        color_code: '#EF4444',
      };

      mockQuery.mockResolvedValueOnce({ rows: [criticalConfigRow] });

      const result = await service.getSeverityForVariance(25);

      expect(result.severity).toBe('CRITICAL');
      expect(result.colorCode).toBe('#EF4444');
    });

    it('should use absolute value for negative variance', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockConfigRow] });

      await service.getSeverityForVariance(-3.5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('min_variance_percent <= $1'),
        [3.5]
      );
    });

    it('should default to CRITICAL when no matching config found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getSeverityForVariance(999);

      expect(result.severity).toBe('CRITICAL');
      expect(result.requiresApproval).toBe(true);
      expect(result.canAutoAdjust).toBe(false);
      expect(result.colorCode).toBe('#EF4444');
      expect(logger.warn).toHaveBeenCalledWith(
        `No severity config found for variance 999%, defaulting to CRITICAL`
      );
    });
  });

  // ==========================================================================
  // CREATE SEVERITY CONFIG
  // ==========================================================================

  describe('createSeverityConfig', () => {
    it('should create a new severity config with all fields', async () => {
      const dto: CreateSeverityConfigDTO = {
        severityLevel: 'HIGH',
        minVariancePercent: 5,
        maxVariancePercent: 10,
        requiresApproval: true,
        requiresManagerApproval: true,
        autoAdjust: false,
        colorCode: '#F97316',
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // No overlap check
        .mockResolvedValueOnce({ rows: [mockConfigRow] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      await service.createSeverityConfig(dto);

      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(logger.info).toHaveBeenCalledWith('Severity config created', expect.any(Object));
    });

    it('should use defaults for optional fields', async () => {
      const dto: CreateSeverityConfigDTO = {
        severityLevel: 'LOW',
        minVariancePercent: 0,
        maxVariancePercent: 2,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [mockConfigRow] })
        .mockResolvedValueOnce({}); // COMMIT

      await service.createSeverityConfig(dto);

      const insertCall = mockQuery.mock.calls[2];
      expect(insertCall[1]).toContain(true); // requiresApproval default
      expect(insertCall[1]).toContain(false); // requiresManagerApproval default
      expect(insertCall[1]).toContain(false); // autoAdjust default
    });

    it('should use default color code when not provided', async () => {
      const dto: CreateSeverityConfigDTO = {
        severityLevel: 'MEDIUM',
        minVariancePercent: 2,
        maxVariancePercent: 5,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [mockConfigRow] })
        .mockResolvedValueOnce({}); // COMMIT

      await service.createSeverityConfig(dto);

      const insertCall = mockQuery.mock.calls[2];
      expect(insertCall[1]).toContain('#F59E0B'); // Default MEDIUM color
    });

    it('should throw error when variance range overlaps', async () => {
      const dto: CreateSeverityConfigDTO = {
        severityLevel: 'LOW',
        minVariancePercent: 1,
        maxVariancePercent: 3,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // Overlap found
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.createSeverityConfig(dto)).rejects.toThrow(
        'Variance range overlaps with existing configuration'
      );
    });

    it('should rollback on database error', async () => {
      const dto: CreateSeverityConfigDTO = {
        severityLevel: 'HIGH',
        minVariancePercent: 5,
        maxVariancePercent: 10,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // Overlap check fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.createSeverityConfig(dto)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating severity config',
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // UPDATE SEVERITY CONFIG
  // ==========================================================================

  describe('updateSeverityConfig', () => {
    it('should update config with new values', async () => {
      const dto: UpdateSeverityConfigDTO = {
        minVariancePercent: 3,
        maxVariancePercent: 8,
        requiresApproval: false,
      };

      const updatedRow = {
        ...mockConfigRow,
        min_variance_percent: '3',
        max_variance_percent: '8',
        requires_approval: false,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockConfigRow] }) // Get existing
        .mockResolvedValueOnce({ rows: [updatedRow] }) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.updateSeverityConfig('VSC-ABC123XYZ4', dto);

      expect(result.minVariancePercent).toBe(3);
      expect(result.maxVariancePercent).toBe(8);
      expect(logger.info).toHaveBeenCalledWith('Severity config updated', expect.any(Object));
    });

    it('should update isActive status', async () => {
      const dto: UpdateSeverityConfigDTO = {
        isActive: false,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockConfigRow] })
        .mockResolvedValueOnce({ rows: [{ ...mockConfigRow, is_active: false }] })
        .mockResolvedValueOnce({}); // COMMIT

      await service.updateSeverityConfig('VSC-ABC123XYZ4', dto);

      const updateCall = mockQuery.mock.calls[2];
      expect(updateCall[0]).toContain('is_active =');
    });

    it('should update all optional fields', async () => {
      const dto: UpdateSeverityConfigDTO = {
        minVariancePercent: 1,
        maxVariancePercent: 15,
        requiresApproval: true,
        requiresManagerApproval: true,
        autoAdjust: true,
        colorCode: '#FF0000',
        isActive: true,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockConfigRow] })
        .mockResolvedValueOnce({ rows: [mockConfigRow] })
        .mockResolvedValueOnce({}); // COMMIT

      await service.updateSeverityConfig('VSC-ABC123XYZ4', dto);

      const updateCall = mockQuery.mock.calls[2];
      expect(updateCall[0]).toContain('min_variance_percent =');
      expect(updateCall[0]).toContain('max_variance_percent =');
      expect(updateCall[0]).toContain('requires_approval =');
      expect(updateCall[0]).toContain('requires_manager_approval =');
      expect(updateCall[0]).toContain('auto_adjust =');
      expect(updateCall[0]).toContain('color_code =');
      expect(updateCall[0]).toContain('is_active =');
    });

    it('should throw error when config not found', async () => {
      const dto: UpdateSeverityConfigDTO = {
        minVariancePercent: 5,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Not found

      await expect(service.updateSeverityConfig('NOT-FOUND', dto)).rejects.toThrow(
        'Severity config NOT-FOUND not found'
      );
    });

    it('should return existing config when no updates provided', async () => {
      const dto: UpdateSeverityConfigDTO = {};

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockConfigRow] })
        .mockResolvedValueOnce({}); // ROLLBACK (no updates)

      const result = await service.updateSeverityConfig('VSC-ABC123XYZ4', dto);

      expect(result.configId).toBe('VSC-ABC123XYZ4');
    });

    it('should rollback on database error', async () => {
      const dto: UpdateSeverityConfigDTO = {
        minVariancePercent: 5,
      };

      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // Get existing fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.updateSeverityConfig('VSC-ABC123XYZ4', dto)).rejects.toThrow(
        'Database error'
      );
    });
  });

  // ==========================================================================
  // DELETE SEVERITY CONFIG
  // ==========================================================================

  describe('deleteSeverityConfig', () => {
    it('should soft delete config by setting inactive', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await service.deleteSeverityConfig('VSC-ABC123XYZ4');

      expect(mockQuery).toHaveBeenCalledWith(
        `UPDATE variance_severity_config
       SET is_active = false, updated_at = NOW()
       WHERE config_id = $1`,
        ['VSC-ABC123XYZ4']
      );
      expect(logger.info).toHaveBeenCalledWith('Severity config deleted', expect.any(Object));
    });

    it('should throw error when config not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await expect(service.deleteSeverityConfig('NOT-FOUND')).rejects.toThrow(
        'Severity config NOT-FOUND not found'
      );
    });
  });

  // ==========================================================================
  // RESET TO DEFAULTS
  // ==========================================================================

  describe('resetToDefaults', () => {
    it('should reset severity configs to defaults', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE all
        .mockResolvedValueOnce({}) // INSERT defaults
        .mockResolvedValueOnce({}); // COMMIT

      await service.resetToDefaults();

      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockQuery).toHaveBeenCalledWith(`DELETE FROM variance_severity_config`);
      expect(logger.info).toHaveBeenCalledWith('Severity configs reset to defaults');
    });

    it('should rollback on database error', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE
        .mockRejectedValueOnce(new Error('Database error')) // INSERT fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.resetToDefaults()).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith(
        'Error resetting severity configs',
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // CREATE DEFAULT SEVERITY CONFIGS
  // ==========================================================================

  describe('createDefaultSeverityConfigs', () => {
    it('should create defaults when no configs exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      jest.spyOn(service, 'resetToDefaults').mockResolvedValueOnce(undefined);

      await service.createDefaultSeverityConfigs();

      expect(service.resetToDefaults).toHaveBeenCalled();
    });

    it('should skip creating defaults when configs exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await service.createDefaultSeverityConfigs();

      expect(logger.info).not.toHaveBeenCalledWith('Severity configs reset to defaults');
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('varianceSeverityService singleton', () => {
    it('should export singleton instance', () => {
      expect(varianceSeverityService).toBeInstanceOf(VarianceSeverityService);
    });
  });
});
