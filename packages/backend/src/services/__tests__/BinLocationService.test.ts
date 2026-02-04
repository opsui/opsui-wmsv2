/**
 * Unit tests for BinLocationService
 * @covers src/services/BinLocationService.ts
 */

import { BinLocationService } from '../BinLocationService';
import { CreateBinLocationDTO, UpdateBinLocationDTO, BinType } from '@opsui/shared';

// Mock all dependencies
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('BinLocationService', () => {
  let binLocationService: BinLocationService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    binLocationService = new BinLocationService();

    // Setup mock pool and query function
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };

    (require('../../db/client').getPool as jest.Mock).mockResolvedValue(mockPool);
  });

  // ==========================================================================
  // CREATE BIN LOCATION
  // ==========================================================================

  describe('createBinLocation', () => {
    const validDto: CreateBinLocationDTO = {
      binId: 'A-12-03',
      zone: 'A',
      aisle: '12',
      shelf: '03',
      type: BinType.RACK,
    };

    it('should create a new bin location', async () => {
      // Check existing bin
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Insert query
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Get bin location query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-12-03',
            zone: 'A',
            aisle: '12',
            shelf: '03',
            type: 'RACK',
            active: true,
          },
        ],
      });

      const result = await binLocationService.createBinLocation(validDto);

      expect(result).toHaveProperty('binId', 'A-12-03');
      expect(result).toHaveProperty('zone', 'A');
      expect(result).toHaveProperty('aisle', '12');
      expect(result).toHaveProperty('shelf', '03');
      expect(result).toHaveProperty('type', 'RACK');
      expect(result).toHaveProperty('active', true);
    });

    it('should validate bin ID format', async () => {
      const invalidDto: CreateBinLocationDTO = {
        ...validDto,
        binId: 'INVALID',
      };

      await expect(binLocationService.createBinLocation(invalidDto)).rejects.toThrow(
        'Invalid bin ID format. Expected format: Zone-Aisle-Shelf (e.g., A-12-03)'
      );
    });

    it('should reject bin ID without leading letter', async () => {
      const invalidDto: CreateBinLocationDTO = {
        ...validDto,
        binId: '1-12-03',
      };

      await expect(binLocationService.createBinLocation(invalidDto)).rejects.toThrow(
        'Invalid bin ID format'
      );
    });

    it('should reject bin ID with lowercase letter', async () => {
      const invalidDto: CreateBinLocationDTO = {
        ...validDto,
        binId: 'a-12-03',
      };

      await expect(binLocationService.createBinLocation(invalidDto)).rejects.toThrow(
        'Invalid bin ID format'
      );
    });

    it('should throw error for duplicate bin ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ bin_id: 'A-12-03' }],
      });

      await expect(binLocationService.createBinLocation(validDto)).rejects.toThrow(
        'Bin location A-12-03 already exists'
      );
    });
  });

  // ==========================================================================
  // GET ALL BIN LOCATIONS
  // ==========================================================================

  describe('getAllBinLocations', () => {
    it('should return all bin locations without filters', async () => {
      // Count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      // Select query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-01-01',
            zone: 'A',
            aisle: '01',
            shelf: '01',
            type: 'RACK',
            active: true,
          },
          {
            bin_id: 'A-01-02',
            zone: 'A',
            aisle: '01',
            shelf: '02',
            type: 'SHELF',
            active: true,
          },
          {
            bin_id: 'B-05-03',
            zone: 'B',
            aisle: '05',
            shelf: '03',
            type: 'RACK',
            active: true,
          },
        ],
      });

      const result = await binLocationService.getAllBinLocations();

      expect(result.locations).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.locations[0]).toHaveProperty('binId', 'A-01-01');
    });

    it('should filter by zone', async () => {
      // Count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // Select query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-01-01',
            zone: 'A',
            aisle: '01',
            shelf: '01',
            type: 'RACK',
            active: true,
          },
          {
            bin_id: 'A-01-02',
            zone: 'A',
            aisle: '01',
            shelf: '02',
            type: 'SHELF',
            active: true,
          },
        ],
      });

      const result = await binLocationService.getAllBinLocations({ zone: 'A' });

      expect(result.locations).toHaveLength(2);
      expect(result.locations.every(l => l.zone === 'A')).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('zone = $'),
        expect.anything()
      );
    });

    it('should filter by type', async () => {
      // Count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // Select query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-01-02',
            zone: 'A',
            aisle: '01',
            shelf: '02',
            type: 'SHELF',
            active: true,
          },
          {
            bin_id: 'B-05-02',
            zone: 'B',
            aisle: '05',
            shelf: '02',
            type: 'SHELF',
            active: true,
          },
        ],
      });

      const result = await binLocationService.getAllBinLocations({ type: BinType.SHELF });

      expect(result.locations).toHaveLength(2);
      expect(result.locations.every(l => l.type === BinType.SHELF)).toBe(true);
    });

    it('should filter by active status', async () => {
      // Count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      // Select query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-01-01',
            zone: 'A',
            aisle: '01',
            shelf: '01',
            type: 'RACK',
            active: true,
          },
        ],
      });

      const result = await binLocationService.getAllBinLocations({ active: true });

      expect(result.locations).toHaveLength(1);
      expect(result.locations[0]).toHaveProperty('active', true);
    });

    it('should apply limit and offset', async () => {
      // Count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '100' }] });
      // Select query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-01-01',
            zone: 'A',
            aisle: '01',
            shelf: '01',
            type: 'RACK',
            active: true,
          },
        ],
      });

      await binLocationService.getAllBinLocations({ limit: 10, offset: 20 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([10, 20])
      );
    });

    it('should return empty array when no locations exist', async () => {
      // Count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      // Select query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await binLocationService.getAllBinLocations();

      expect(result.locations).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==========================================================================
  // GET BIN LOCATION
  // ==========================================================================

  describe('getBinLocation', () => {
    it('should return a specific bin location', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-12-03',
            zone: 'A',
            aisle: '12',
            shelf: '03',
            type: 'RACK',
            active: true,
          },
        ],
      });

      const result = await binLocationService.getBinLocation('A-12-03');

      expect(result).toHaveProperty('binId', 'A-12-03');
      expect(result).toHaveProperty('zone', 'A');
      expect(result).toHaveProperty('aisle', '12');
      expect(result).toHaveProperty('shelf', '03');
    });

    it('should throw error for non-existent bin location', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(binLocationService.getBinLocation('NONEXISTENT')).rejects.toThrow(
        'Bin location NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // UPDATE BIN LOCATION
  // ==========================================================================

  describe('updateBinLocation', () => {
    it('should update zone', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-12-03',
            zone: 'B',
            aisle: '12',
            shelf: '03',
            type: 'RACK',
            active: true,
          },
        ],
      });

      const updates: UpdateBinLocationDTO = { zone: 'B' };

      const result = await binLocationService.updateBinLocation('A-12-03', updates);

      expect(result).toHaveProperty('zone', 'B');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bin_locations'),
        expect.arrayContaining(['B', 'A-12-03'])
      );
    });

    it('should update aisle', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-12-03',
            zone: 'A',
            aisle: '15',
            shelf: '03',
            type: 'RACK',
            active: true,
          },
        ],
      });

      const updates: UpdateBinLocationDTO = { aisle: '15' };

      const result = await binLocationService.updateBinLocation('A-12-03', updates);

      expect(result).toHaveProperty('aisle', '15');
    });

    it('should update shelf', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-12-03',
            zone: 'A',
            aisle: '12',
            shelf: '05',
            type: 'RACK',
            active: true,
          },
        ],
      });

      const updates: UpdateBinLocationDTO = { shelf: '05' };

      const result = await binLocationService.updateBinLocation('A-12-03', updates);

      expect(result).toHaveProperty('shelf', '05');
    });

    it('should update type', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-12-03',
            zone: 'A',
            aisle: '12',
            shelf: '03',
            type: 'SHELF',
            active: true,
          },
        ],
      });

      const updates: UpdateBinLocationDTO = { type: BinType.SHELF };

      const result = await binLocationService.updateBinLocation('A-12-03', updates);

      expect(result).toHaveProperty('type', BinType.SHELF);
    });

    it('should update active status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-12-03',
            zone: 'A',
            aisle: '12',
            shelf: '03',
            type: 'RACK',
            active: false,
          },
        ],
      });

      const updates: UpdateBinLocationDTO = { active: false };

      const result = await binLocationService.updateBinLocation('A-12-03', updates);

      expect(result).toHaveProperty('active', false);
    });

    it('should update multiple fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-12-03',
            zone: 'B',
            aisle: '15',
            shelf: '05',
            type: 'SHELF',
            active: false,
          },
        ],
      });

      const updates: UpdateBinLocationDTO = {
        zone: 'B',
        aisle: '15',
        shelf: '05',
        type: BinType.SHELF,
        active: false,
      };

      const result = await binLocationService.updateBinLocation('A-12-03', updates);

      expect(result).toHaveProperty('zone', 'B');
      expect(result).toHaveProperty('aisle', '15');
      expect(result).toHaveProperty('shelf', '05');
      expect(result).toHaveProperty('type', BinType.SHELF);
      expect(result).toHaveProperty('active', false);
    });

    it('should return existing bin when no updates provided', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-12-03',
            zone: 'A',
            aisle: '12',
            shelf: '03',
            type: 'RACK',
            active: true,
          },
        ],
      });

      const result = await binLocationService.updateBinLocation('A-12-03', {});

      expect(result).toHaveProperty('binId', 'A-12-03');
      expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE bin_locations'));
    });

    it('should throw error for non-existent bin location', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        binLocationService.updateBinLocation('NONEXISTENT', { zone: 'B' })
      ).rejects.toThrow('Bin location NONEXISTENT not found');
    });
  });

  // ==========================================================================
  // DELETE BIN LOCATION
  // ==========================================================================

  describe('deleteBinLocation', () => {
    it('should delete a bin location', async () => {
      // Check inventory
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      // Delete query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await binLocationService.deleteBinLocation('A-12-03');

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM bin_locations'), [
        'A-12-03',
      ]);
    });

    it('should throw error when bin has inventory', async () => {
      // Check inventory
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await expect(binLocationService.deleteBinLocation('A-12-03')).rejects.toThrow(
        'Cannot delete bin location A-12-03 because it has 5 inventory units'
      );
    });
  });

  // ==========================================================================
  // BATCH CREATE BIN LOCATIONS
  // ==========================================================================

  describe('batchCreateBinLocations', () => {
    it('should create multiple bin locations', async () => {
      const dtos: CreateBinLocationDTO[] = [
        { binId: 'A-01-01', zone: 'A', aisle: '01', shelf: '01', type: BinType.RACK },
        { binId: 'A-01-02', zone: 'A', aisle: '01', shelf: '02', type: BinType.SHELF },
        { binId: 'B-05-03', zone: 'B', aisle: '05', shelf: '03', type: BinType.RACK },
      ];

      // Mock each creation: check existing, insert, get
      for (let i = 0; i < dtos.length; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Check existing
        mockQuery.mockResolvedValueOnce({ rows: [] }); // Insert
        mockQuery.mockResolvedValueOnce({
          // Get bin location
          rows: [
            {
              bin_id: dtos[i].binId,
              zone: dtos[i].zone,
              aisle: dtos[i].aisle,
              shelf: dtos[i].shelf,
              type: dtos[i].type,
              active: true,
            },
          ],
        });
      }

      const result = await binLocationService.batchCreateBinLocations(dtos);

      expect(result.created).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      const dtos: CreateBinLocationDTO[] = [
        { binId: 'A-01-01', zone: 'A', aisle: '01', shelf: '01', type: BinType.RACK },
        { binId: 'INVALID', zone: 'A', aisle: '01', shelf: '02', type: BinType.SHELF },
        { binId: 'B-05-03', zone: 'B', aisle: '05', shelf: '03', type: BinType.RACK },
      ];

      // First creation: success
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-01-01',
            zone: 'A',
            aisle: '01',
            shelf: '01',
            type: 'RACK',
            active: true,
          },
        ],
      });

      // Third creation: success (second one fails validation)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'B-05-03',
            zone: 'B',
            aisle: '05',
            shelf: '03',
            type: 'RACK',
            active: true,
          },
        ],
      });

      const result = await binLocationService.batchCreateBinLocations(dtos);

      expect(result.created).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toHaveProperty('dto');
      expect(result.failed[0]).toHaveProperty('error');
      expect(result.failed[0].error).toContain('Invalid bin ID format');
    });
  });

  // ==========================================================================
  // GET ZONES
  // ==========================================================================

  describe('getZones', () => {
    it('should return all active zones', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ zone: 'A' }, { zone: 'B' }, { zone: 'C' }],
      });

      const result = await binLocationService.getZones();

      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('should return empty array when no zones exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await binLocationService.getZones();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET BIN LOCATIONS BY ZONE
  // ==========================================================================

  describe('getBinLocationsByZone', () => {
    it('should return bin locations for a specific zone', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bin_id: 'A-01-01',
            zone: 'A',
            aisle: '01',
            shelf: '01',
            type: 'RACK',
            active: true,
          },
          {
            bin_id: 'A-01-02',
            zone: 'A',
            aisle: '01',
            shelf: '02',
            type: 'SHELF',
            active: true,
          },
        ],
      });

      const result = await binLocationService.getBinLocationsByZone('A');

      expect(result).toHaveLength(2);
      expect(result.every(l => l.zone === 'A')).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE zone = $1'), ['A']);
    });

    it('should return empty array for zone with no locations', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await binLocationService.getBinLocationsByZone('Z');

      expect(result).toEqual([]);
    });
  });
});
