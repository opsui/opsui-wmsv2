/**
 * Unit tests for FeatureFlagService
 * @covers src/services/FeatureFlagService.ts
 */

import {
  getFlag,
  isFlagEnabled,
  getAllFlags,
  getFlagsByCategory,
  setFlag,
  createFlag,
  deleteFlag,
  getCategorySummary,
  invalidateFlagCache,
  type FeatureFlag,
  type CreateFlagDTO,
} from '../FeatureFlagService';

// Mock all dependencies
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

describe('FeatureFlagService', () => {
  let mockPool: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateFlagCache();

    // Setup mock pool and query function
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };

    (require('../../db/client').getPool as jest.Mock).mockReturnValue(mockPool);
  });

  // ==========================================================================
  // GET FLAG
  // ==========================================================================

  describe('getFlag', () => {
    it('should return a feature flag by key', async () => {
      const mockFlag: FeatureFlag = {
        flag_id: 'flag-001',
        flag_key: 'new_picking_ui',
        name: 'New Picking UI',
        description: 'Enable the new picking interface',
        is_enabled: true,
        category: 'picking',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockFlag],
      });

      const result = await getFlag('new_picking_ui');

      expect(result).toEqual(mockFlag);
    });

    it('should return null for non-existent flag', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getFlag('non_existent_flag');

      expect(result).toBeNull();
    });

    it('should use cached flag on subsequent calls', async () => {
      const mockFlag: FeatureFlag = {
        flag_id: 'flag-001',
        flag_key: 'cached_flag',
        name: 'Cached Flag',
        description: null,
        is_enabled: true,
        category: 'experimental',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockFlag],
      });

      // First call - queries database
      await getFlag('cached_flag');
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Second call - uses cache, no additional query
      await getFlag('cached_flag');
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // IS FLAG ENABLED
  // ==========================================================================

  describe('isFlagEnabled', () => {
    it('should return true for enabled flag', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            flag_id: 'flag-001',
            flag_key: 'enabled_flag',
            name: 'Enabled Flag',
            description: null,
            is_enabled: true,
            category: 'picking',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const result = await isFlagEnabled('enabled_flag');

      expect(result).toBe(true);
    });

    it('should return false for disabled flag', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            flag_id: 'flag-002',
            flag_key: 'disabled_flag',
            name: 'Disabled Flag',
            description: null,
            is_enabled: false,
            category: 'picking',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const result = await isFlagEnabled('disabled_flag');

      expect(result).toBe(false);
    });

    it('should return false for non-existent flag', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await isFlagEnabled('non_existent_flag');

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // GET ALL FLAGS
  // ==========================================================================

  describe('getAllFlags', () => {
    it('should return all flags sorted by category then name', async () => {
      const mockFlags: FeatureFlag[] = [
        {
          flag_id: 'flag-001',
          flag_key: 'zebra_flag',
          name: 'Zebra Flag',
          description: null,
          is_enabled: true,
          category: 'picking',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          flag_id: 'flag-002',
          flag_key: 'apple_flag',
          name: 'Apple Flag',
          description: null,
          is_enabled: false,
          category: 'experimental',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          flag_id: 'flag-003',
          flag_key: 'banana_flag',
          name: 'Banana Flag',
          description: null,
          is_enabled: true,
          category: 'experimental',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockFlags,
      });

      const result = await getAllFlags();

      expect(result).toHaveLength(3);
      // Should be sorted by category first, then name
      expect(result[0].category).toBe('experimental');
      expect(result[0].flag_key).toBe('apple_flag');
      expect(result[1].category).toBe('experimental');
      expect(result[1].flag_key).toBe('banana_flag');
      expect(result[2].category).toBe('picking');
      expect(result[2].flag_key).toBe('zebra_flag');
    });

    it('should return empty array when no flags exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getAllFlags();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET FLAGS BY CATEGORY
  // ==========================================================================

  describe('getFlagsByCategory', () => {
    it('should return flags for specific category', async () => {
      const mockFlags: FeatureFlag[] = [
        {
          flag_id: 'flag-001',
          flag_key: 'picking_flag_1',
          name: 'Picking Flag 1',
          description: null,
          is_enabled: true,
          category: 'picking',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          flag_id: 'flag-002',
          flag_key: 'inventory_flag',
          name: 'Inventory Flag',
          description: null,
          is_enabled: false,
          category: 'inventory',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          flag_id: 'flag-003',
          flag_key: 'picking_flag_2',
          name: 'Picking Flag 2',
          description: null,
          is_enabled: true,
          category: 'picking',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockFlags,
      });

      const result = await getFlagsByCategory('picking');

      expect(result).toHaveLength(2);
      expect(result.every(f => f.category === 'picking')).toBe(true);
    });

    it('should return empty array for category with no flags', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getFlagsByCategory('shipping');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // SET FLAG
  // ==========================================================================

  describe('setFlag', () => {
    it('should enable a flag', async () => {
      const updatedFlag: FeatureFlag = {
        flag_id: 'flag-001',
        flag_key: 'toggle_flag',
        name: 'Toggle Flag',
        description: null,
        is_enabled: true,
        category: 'picking',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedFlag],
      });

      const result = await setFlag('toggle_flag', true);

      expect(result).toEqual(updatedFlag);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE feature_flags'), [
        true,
        'toggle_flag',
      ]);
    });

    it('should disable a flag', async () => {
      const updatedFlag: FeatureFlag = {
        flag_id: 'flag-001',
        flag_key: 'toggle_flag',
        name: 'Toggle Flag',
        description: null,
        is_enabled: false,
        category: 'picking',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedFlag],
      });

      const result = await setFlag('toggle_flag', false);

      expect(result).toEqual(updatedFlag);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE feature_flags'), [
        false,
        'toggle_flag',
      ]);
    });

    it('should throw error for non-existent flag', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await expect(setFlag('non_existent_flag', true)).rejects.toThrow(
        "Feature flag 'non_existent_flag' not found"
      );
    });

    it('should invalidate cache after setting flag', async () => {
      const updatedFlag: FeatureFlag = {
        flag_id: 'flag-001',
        flag_key: 'cache_test',
        name: 'Cache Test',
        description: null,
        is_enabled: true,
        category: 'picking',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedFlag],
      });

      // Initialize cache first
      mockQuery.mockResolvedValueOnce({ rows: [updatedFlag] });
      await getFlag('cache_test');
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Set flag (should invalidate cache)
      mockQuery.mockResolvedValueOnce({ rows: [updatedFlag] });
      await setFlag('cache_test', true);

      // Get flag again (should re-query database)
      mockQuery.mockResolvedValueOnce({ rows: [updatedFlag] });
      await getFlag('cache_test');
      expect(mockQuery).toHaveBeenCalledTimes(3); // init + set + init again
    });
  });

  // ==========================================================================
  // CREATE FLAG
  // ==========================================================================

  describe('createFlag', () => {
    it('should create a new flag with all fields', async () => {
      const data: CreateFlagDTO = {
        flag_key: 'new_feature',
        name: 'New Feature',
        description: 'Enable the new feature',
        category: 'experimental',
        is_enabled: true,
      };

      const createdFlag: FeatureFlag = {
        flag_id: 'flag-001',
        flag_key: 'new_feature',
        name: 'New Feature',
        description: 'Enable the new feature',
        is_enabled: true,
        category: 'experimental',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Check for existing flag
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Insert new flag
      mockQuery.mockResolvedValueOnce({ rows: [createdFlag] });

      const result = await createFlag(data);

      expect(result).toEqual(createdFlag);
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT flag_key FROM feature_flags'),
        ['new_feature']
      );
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO feature_flags'),
        ['new_feature', 'New Feature', 'Enable the new feature', true, 'experimental']
      );
    });

    it('should create a new flag with default is_enabled false', async () => {
      const data: CreateFlagDTO = {
        flag_key: 'new_flag',
        name: 'New Flag',
        category: 'picking',
      };

      const createdFlag: FeatureFlag = {
        flag_id: 'flag-001',
        flag_key: 'new_flag',
        name: 'New Flag',
        description: null,
        is_enabled: false,
        category: 'picking',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [createdFlag] });

      const result = await createFlag(data);

      expect(result.is_enabled).toBe(false);
    });

    it('should throw error for duplicate flag key', async () => {
      const data: CreateFlagDTO = {
        flag_key: 'existing_flag',
        name: 'Existing Flag',
        category: 'picking',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ flag_key: 'existing_flag' }],
      });

      await expect(createFlag(data)).rejects.toThrow(
        "Feature flag with key 'existing_flag' already exists"
      );
    });

    it('should invalidate cache after creating flag', async () => {
      const data: CreateFlagDTO = {
        flag_key: 'new_flag',
        name: 'New Flag',
        category: 'picking',
      };

      const createdFlag: FeatureFlag = {
        flag_id: 'flag-001',
        flag_key: 'new_flag',
        name: 'New Flag',
        description: null,
        is_enabled: false,
        category: 'picking',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Initialize cache
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await getAllFlags();

      // Create flag (check existing + insert)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [createdFlag] });
      await createFlag(data);

      // Get all flags again (should re-query)
      mockQuery.mockResolvedValueOnce({ rows: [createdFlag] });
      await getAllFlags();

      // Should have queried 3 times (init + create check + init after create)
      expect(mockQuery).toHaveBeenCalledTimes(4); // init + check exists + insert + init again
    });
  });

  // ==========================================================================
  // DELETE FLAG
  // ==========================================================================

  describe('deleteFlag', () => {
    it('should delete a flag', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ flag_key: 'flag_to_delete' }],
      });

      await deleteFlag('flag_to_delete');

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM feature_flags'), [
        'flag_to_delete',
      ]);
    });

    it('should throw error for non-existent flag', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await expect(deleteFlag('non_existent_flag')).rejects.toThrow(
        "Feature flag 'non_existent_flag' not found"
      );
    });

    it('should invalidate cache after deleting flag', async () => {
      const mockFlag: FeatureFlag = {
        flag_id: 'flag-001',
        flag_key: 'delete_test',
        name: 'Delete Test',
        description: null,
        is_enabled: true,
        category: 'picking',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Initialize cache
      mockQuery.mockResolvedValueOnce({ rows: [mockFlag] });
      await getFlag('delete_test');

      // Delete flag
      mockQuery.mockResolvedValueOnce({ rows: [{ flag_key: 'delete_test' }] });
      await deleteFlag('delete_test');

      // Get flag again (should re-query database)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await getFlag('delete_test');

      expect(mockQuery).toHaveBeenCalledTimes(3); // init + delete + init again
    });
  });

  // ==========================================================================
  // GET CATEGORY SUMMARY
  // ==========================================================================

  describe('getCategorySummary', () => {
    it('should return category summary with counts', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { category: 'picking', count: '5', enabled: '3' },
          { category: 'packing', count: '3', enabled: '2' },
          { category: 'inventory', count: '4', enabled: '1' },
        ],
      });

      const result = await getCategorySummary();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        category: 'picking',
        count: '5',
        enabled: '3',
      });
    });

    it('should return empty array when no categories exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getCategorySummary();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // INVALIDATE FLAG CACHE
  // ==========================================================================

  describe('invalidateFlagCache', () => {
    it('should clear the flag cache', async () => {
      const mockFlag: FeatureFlag = {
        flag_id: 'flag-001',
        flag_key: 'cache_flag',
        name: 'Cache Flag',
        description: null,
        is_enabled: true,
        category: 'picking',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Initialize cache
      mockQuery.mockResolvedValueOnce({ rows: [mockFlag] });
      await getFlag('cache_flag');

      // Invalidate cache
      invalidateFlagCache();

      // Get flag again (should re-query)
      mockQuery.mockResolvedValueOnce({ rows: [mockFlag] });
      await getFlag('cache_flag');

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });
});
