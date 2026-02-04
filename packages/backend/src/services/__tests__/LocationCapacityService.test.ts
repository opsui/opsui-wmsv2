/**
 * Unit tests for LocationCapacityService
 * @covers src/services/LocationCapacityService.ts
 */

import { LocationCapacityService } from '../LocationCapacityService';
import {
  CapacityRule,
  LocationCapacity,
  CapacityAlert,
  CreateCapacityRuleDTO,
  AcknowledgeCapacityAlertDTO,
  CapacityType,
  CapacityUnit,
  CapacityRuleStatus,
  BinType,
} from '@opsui/shared';

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

describe('LocationCapacityService', () => {
  let locationCapacityService: LocationCapacityService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock pool and query function
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };

    (require('../../db/client').getPool as jest.Mock).mockReturnValue(mockPool);

    locationCapacityService = new LocationCapacityService();
  });

  // ==========================================================================
  // CREATE CAPACITY RULE
  // ==========================================================================

  describe('createCapacityRule', () => {
    const mockCapacityRuleRow = {
      rule_id: 'CRULE-ABC123',
      rule_name: 'Test Rule',
      description: 'Test description',
      capacity_type: 'QUANTITY',
      capacity_unit: 'UNITS',
      applies_to: 'ALL',
      zone: null,
      location_type: null,
      specific_location: null,
      maximum_capacity: '100',
      warning_threshold: '80',
      allow_overfill: false,
      overfill_threshold: null,
      is_active: true,
      priority: 1,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };

    it('should create a capacity rule', async () => {
      const dto: CreateCapacityRuleDTO = {
        ruleName: 'Test Rule',
        description: 'Test description',
        capacityType: CapacityType.QUANTITY,
        capacityUnit: CapacityUnit.UNITS,
        appliesTo: 'ALL',
        maximumCapacity: 100,
        warningThreshold: 80,
        allowOverfill: false,
        priority: 1,
        createdBy: 'user-123',
      };

      // INSERT query for creating the rule
      mockQuery.mockResolvedValueOnce({ rows: [mockCapacityRuleRow] });

      // applyCapacityRuleToLocations calls getCapacityRule - but rule is not active or we mock to skip
      // getCapacityRule in applyCapacityRuleToLocations - need to return the created rule
      mockQuery.mockResolvedValueOnce({ rows: [{ ...mockCapacityRuleRow, is_active: true }] });

      // Get locations matching the rule (applies_to='ALL' so query bin_locations)
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No matching locations

      const result = await locationCapacityService.createCapacityRule(dto);

      expect(result.ruleName).toBe('Test Rule');
      expect(result.capacityType).toBe('QUANTITY');
      expect(result.maximumCapacity).toBe(100);
      expect(result.warningThreshold).toBe(80);
    });

    it('should create a rule with zone-based application', async () => {
      const dto: CreateCapacityRuleDTO = {
        ruleName: 'Zone A Rule',
        capacityType: CapacityType.QUANTITY,
        capacityUnit: CapacityUnit.UNITS,
        appliesTo: 'ZONE',
        zone: 'A',
        maximumCapacity: 100,
        warningThreshold: 80,
        allowOverfill: false,
        priority: 1,
        createdBy: 'user-123',
      };

      // INSERT query - return the created row with proper applies_to
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockCapacityRuleRow, rule_name: 'Zone A Rule', zone: 'A', applies_to: 'ZONE' }],
      });
      // getCapacityRule in applyCapacityRuleToLocations
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockCapacityRuleRow,
            rule_name: 'Zone A Rule',
            zone: 'A',
            applies_to: 'ZONE',
            is_active: true,
          },
        ],
      });
      // Get matching locations
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await locationCapacityService.createCapacityRule(dto);

      expect(result.zone).toBe('A');
      expect(result.appliesTo).toBe('ZONE');
    });

    it('should create a rule with location type application', async () => {
      const dto: CreateCapacityRuleDTO = {
        ruleName: 'Shelf Rule',
        capacityType: CapacityType.QUANTITY,
        capacityUnit: CapacityUnit.UNITS,
        appliesTo: 'LOCATION_TYPE',
        locationType: BinType.SHELF,
        maximumCapacity: 100,
        warningThreshold: 80,
        allowOverfill: false,
        priority: 1,
        createdBy: 'user-123',
      };

      // INSERT query
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockCapacityRuleRow, rule_name: 'Shelf Rule', location_type: 'SHELF' }],
      });
      // getCapacityRule in applyCapacityRuleToLocations
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockCapacityRuleRow,
            rule_name: 'Shelf Rule',
            location_type: 'SHELF',
            is_active: true,
          },
        ],
      });
      // Get matching locations
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await locationCapacityService.createCapacityRule(dto);

      expect(result.locationType).toBe('SHELF');
    });

    it('should create a rule for a specific location', async () => {
      const dto: CreateCapacityRuleDTO = {
        ruleName: 'A-01-01 Rule',
        capacityType: CapacityType.QUANTITY,
        capacityUnit: CapacityUnit.UNITS,
        appliesTo: 'SPECIFIC_LOCATION',
        specificLocation: 'A-01-01',
        maximumCapacity: 100,
        warningThreshold: 80,
        allowOverfill: false,
        priority: 1,
        createdBy: 'user-123',
      };

      // INSERT query
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockCapacityRuleRow, rule_name: 'A-01-01 Rule', specific_location: 'A-01-01' }],
      });
      // getCapacityRule in applyCapacityRuleToLocations
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockCapacityRuleRow,
            rule_name: 'A-01-01 Rule',
            specific_location: 'A-01-01',
            is_active: true,
          },
        ],
      });
      // Get matching locations
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await locationCapacityService.createCapacityRule(dto);

      expect(result.specificLocation).toBe('A-01-01');
    });

    it('should handle allowOverfill with threshold', async () => {
      const dto: CreateCapacityRuleDTO = {
        ruleName: 'Overfill Rule',
        capacityType: CapacityType.QUANTITY,
        capacityUnit: CapacityUnit.UNITS,
        appliesTo: 'ALL',
        maximumCapacity: 100,
        warningThreshold: 80,
        allowOverfill: true,
        overfillThreshold: 110,
        priority: 1,
        createdBy: 'user-123',
      };

      // INSERT query
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockCapacityRuleRow, allow_overfill: true, overfill_threshold: '110' }],
      });
      // getCapacityRule in applyCapacityRuleToLocations
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockCapacityRuleRow,
            allow_overfill: true,
            overfill_threshold: '110',
            is_active: true,
          },
        ],
      });
      // Get matching locations
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await locationCapacityService.createCapacityRule(dto);

      expect(result.allowOverfill).toBe(true);
      expect(result.overfillThreshold).toBe(110);
    });

    it('should apply rule to matching locations after creation', async () => {
      const dto: CreateCapacityRuleDTO = {
        ruleName: 'Zone Rule',
        capacityType: CapacityType.QUANTITY,
        capacityUnit: CapacityUnit.UNITS,
        appliesTo: 'ZONE',
        zone: 'A',
        maximumCapacity: 100,
        warningThreshold: 80,
        allowOverfill: false,
        priority: 1,
        createdBy: 'user-123',
      };

      // INSERT query
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockCapacityRuleRow, rule_name: 'Zone Rule', zone: 'A', applies_to: 'ZONE' }],
      });

      // getCapacityRule call in applyCapacityRuleToLocations - need to return with applies_to='ZONE'
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            ...mockCapacityRuleRow,
            rule_name: 'Zone Rule',
            zone: 'A',
            applies_to: 'ZONE',
            is_active: true,
          },
        ],
      });

      // Get matching locations (ZONE='A') - should include zone in WHERE clause
      mockQuery.mockResolvedValueOnce({ rows: [{ bin_id: 'A-01-01' }, { bin_id: 'A-01-02' }] });

      // For each location: recalculateLocationCapacity is called
      // Location 1: A-01-01
      mockQuery.mockResolvedValueOnce({ rows: [{ total_quantity: '50' }] }); // inventory
      mockQuery.mockResolvedValueOnce({ rows: [{ zone: 'A', type: 'SHELF', bin_id: 'A-01-01' }] }); // location details
      mockQuery.mockResolvedValueOnce({ rows: [] }); // getApplicableCapacityRules
      mockQuery.mockResolvedValueOnce({ rows: [] }); // location_capacities check (for default)

      // Insert default capacity for location 1
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // getLocationCapacity in createDefaultLocationCapacity
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            capacity_id: 'LCAP-1',
            bin_location: 'A-01-01',
            capacity_type: 'QUANTITY',
            maximum_capacity: '100',
            current_utilization: '50',
            available_capacity: '50',
            utilization_percent: '50',
            capacity_unit: 'UNITS',
            status: 'ACTIVE',
            warning_threshold: '80',
            exceeded_at: null,
            last_updated: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      // Location 2: A-01-02
      mockQuery.mockResolvedValueOnce({ rows: [{ total_quantity: '60' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ zone: 'A', type: 'SHELF', bin_id: 'A-01-02' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            capacity_id: 'LCAP-2',
            bin_location: 'A-01-02',
            capacity_type: 'QUANTITY',
            maximum_capacity: '100',
            current_utilization: '60',
            available_capacity: '40',
            utilization_percent: '60',
            capacity_unit: 'UNITS',
            status: 'ACTIVE',
            warning_threshold: '80',
            exceeded_at: null,
            last_updated: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      await locationCapacityService.createCapacityRule(dto);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT bin_id FROM bin_locations'),
        expect.arrayContaining(['A'])
      );
    });
  });

  // ==========================================================================
  // GET ALL CAPACITY RULES
  // ==========================================================================

  describe('getAllCapacityRules', () => {
    it('should return all capacity rules ordered by priority', async () => {
      const mockRows = [
        { rule_id: 'CRULE-2', rule_name: 'High Priority', priority: '10' },
        { rule_id: 'CRULE-1', rule_name: 'Low Priority', priority: '1' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await locationCapacityService.getAllCapacityRules();

      expect(result).toHaveLength(2);
      expect(result[0].ruleId).toBe('CRULE-2'); // Higher priority first
      expect(result[1].ruleId).toBe('CRULE-1');
    });

    it('should return empty array when no rules exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await locationCapacityService.getAllCapacityRules();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET CAPACITY RULE
  // ==========================================================================

  describe('getCapacityRule', () => {
    it('should return a capacity rule by ID', async () => {
      const mockRow = {
        rule_id: 'CRULE-123',
        rule_name: 'Test Rule',
        description: 'Description',
        capacity_type: 'QUANTITY',
        capacity_unit: 'UNITS',
        applies_to: 'ALL',
        zone: null,
        location_type: null,
        specific_location: null,
        maximum_capacity: '100',
        warning_threshold: '80',
        allow_overfill: false,
        overfill_threshold: null,
        is_active: true,
        priority: '1',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await locationCapacityService.getCapacityRule('CRULE-123');

      expect(result.ruleId).toBe('CRULE-123');
      expect(result.ruleName).toBe('Test Rule');
    });

    it('should throw error when rule not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(locationCapacityService.getCapacityRule('NONEXISTENT')).rejects.toThrow(
        'Capacity rule NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // UPDATE CAPACITY RULE
  // ==========================================================================

  describe('updateCapacityRule', () => {
    it('should update rule name', async () => {
      const updatedRow = {
        rule_id: 'CRULE-123',
        rule_name: 'Updated Name',
        maximum_capacity: '100',
        warning_threshold: '80',
        is_active: true,
        priority: '1',
        applies_to: 'ALL',
        zone: null,
        location_type: null,
        specific_location: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      // getCapacityRule call in applyCapacityRuleToLocations
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      // Get matching locations
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // getCapacityRule to return at end
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await locationCapacityService.updateCapacityRule('CRULE-123', {
        ruleName: 'Updated Name',
      });

      expect(result.ruleName).toBe('Updated Name');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE capacity_rules'),
        expect.arrayContaining(['Updated Name', 'CRULE-123'])
      );
    });

    it('should update maximum capacity', async () => {
      const updatedRow = {
        rule_id: 'CRULE-123',
        rule_name: 'Test',
        maximum_capacity: '200',
        warning_threshold: '80',
        is_active: true,
        priority: '1',
        applies_to: 'ALL',
        zone: null,
        location_type: null,
        specific_location: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await locationCapacityService.updateCapacityRule('CRULE-123', {
        maximumCapacity: 200,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('maximum_capacity = $'),
        expect.arrayContaining([200, 'CRULE-123'])
      );
    });

    it('should update warning threshold', async () => {
      const updatedRow = {
        rule_id: 'CRULE-123',
        rule_name: 'Test',
        maximum_capacity: '100',
        warning_threshold: '90',
        is_active: true,
        priority: '1',
        applies_to: 'ALL',
        zone: null,
        location_type: null,
        specific_location: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await locationCapacityService.updateCapacityRule('CRULE-123', {
        warningThreshold: 90,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('warning_threshold = $'),
        expect.arrayContaining([90, 'CRULE-123'])
      );
    });

    it('should update allowOverfill setting', async () => {
      const updatedRow = {
        rule_id: 'CRULE-123',
        rule_name: 'Test',
        maximum_capacity: '100',
        warning_threshold: '80',
        allow_overfill: true,
        is_active: true,
        priority: '1',
        applies_to: 'ALL',
        zone: null,
        location_type: null,
        specific_location: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await locationCapacityService.updateCapacityRule('CRULE-123', {
        allowOverfill: true,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('allow_overfill = $'),
        expect.arrayContaining([true, 'CRULE-123'])
      );
    });

    it('should update priority', async () => {
      const updatedRow = {
        rule_id: 'CRULE-123',
        rule_name: 'Test',
        maximum_capacity: '100',
        warning_threshold: '80',
        is_active: true,
        priority: '5',
        applies_to: 'ALL',
        zone: null,
        location_type: null,
        specific_location: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await locationCapacityService.updateCapacityRule('CRULE-123', {
        priority: 5,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('priority = $'),
        expect.arrayContaining([5, 'CRULE-123'])
      );
    });

    it('should update isActive status', async () => {
      const updatedRow = {
        rule_id: 'CRULE-123',
        rule_name: 'Test',
        maximum_capacity: '100',
        warning_threshold: '80',
        is_active: false,
        priority: '1',
        applies_to: 'ALL',
        zone: null,
        location_type: null,
        specific_location: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // UPDATE query
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      // getCapacityRule in applyCapacityRuleToLocations - returns early when isActive=false
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      // getCapacityRule at end of updateCapacityRule
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await locationCapacityService.updateCapacityRule('CRULE-123', {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });

    it('should update multiple fields at once', async () => {
      const updatedRow = {
        rule_id: 'CRULE-123',
        rule_name: 'Updated',
        maximum_capacity: '200',
        warning_threshold: '90',
        allow_overfill: true,
        priority: '5',
        is_active: true,
        applies_to: 'ALL',
        zone: null,
        location_type: null,
        specific_location: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await locationCapacityService.updateCapacityRule('CRULE-123', {
        ruleName: 'Updated',
        maximumCapacity: 200,
        warningThreshold: 90,
        allowOverfill: true,
        priority: 5,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE capacity_rules'),
        expect.arrayContaining([200, 90, true, 5, 'CRULE-123'])
      );
    });

    it('should throw error when rule not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        locationCapacityService.updateCapacityRule('NONEXISTENT', { ruleName: 'New' })
      ).rejects.toThrow('Capacity rule NONEXISTENT not found');
    });
  });

  // ==========================================================================
  // DELETE CAPACITY RULE
  // ==========================================================================

  describe('deleteCapacityRule', () => {
    it('should delete a capacity rule', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await locationCapacityService.deleteCapacityRule('CRULE-123');

      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM capacity_rules WHERE rule_id = $1', [
        'CRULE-123',
      ]);
    });

    it('should not throw when deleting non-existent rule', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await expect(
        locationCapacityService.deleteCapacityRule('NONEXISTENT')
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // GET LOCATION CAPACITY
  // ==========================================================================

  describe('getLocationCapacity', () => {
    it('should return location capacity', async () => {
      const mockRow = {
        capacity_id: 'LCAP-123',
        bin_location: 'A-01-01',
        capacity_type: 'QUANTITY',
        maximum_capacity: '100',
        current_utilization: '75',
        available_capacity: '25',
        utilization_percent: '75',
        capacity_unit: 'UNITS',
        status: 'ACTIVE',
        warning_threshold: '80',
        exceeded_at: null,
        last_updated: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await locationCapacityService.getLocationCapacity('A-01-01');

      expect(result.binLocation).toBe('A-01-01');
      expect(result.currentUtilization).toBe(75);
      expect(result.utilizationPercent).toBe(75);
    });

    it('should throw error when location capacity not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(locationCapacityService.getLocationCapacity('NONEXISTENT')).rejects.toThrow(
        'Location capacity for NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // GET ALL LOCATION CAPACITIES
  // ==========================================================================

  describe('getAllLocationCapacities', () => {
    it('should return all location capacities', async () => {
      const mockRows = [
        { bin_location: 'A-01-01', utilization_percent: '90', status: 'WARNING' },
        { bin_location: 'A-01-02', utilization_percent: '50', status: 'ACTIVE' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await locationCapacityService.getAllLocationCapacities();

      expect(result.capacities).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by capacity type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ capacity_type: 'QUANTITY' }] });

      const result = await locationCapacityService.getAllLocationCapacities({
        capacityType: CapacityType.QUANTITY,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('capacity_type = $'),
        expect.arrayContaining(['QUANTITY'])
      );
    });

    it('should filter by status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ status: 'EXCEEDED' }] });

      const result = await locationCapacityService.getAllLocationCapacities({
        status: CapacityRuleStatus.EXCEEDED,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $'),
        expect.arrayContaining(['EXCEEDED'])
      );
    });

    it('should filter to show only alerts', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ status: 'WARNING' }, { status: 'EXCEEDED' }] });

      const result = await locationCapacityService.getAllLocationCapacities({
        showAlertsOnly: true,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status IN ('WARNING', 'EXCEEDED')"),
        expect.anything()
      );
    });

    it('should apply limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '100' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await locationCapacityService.getAllLocationCapacities({
        limit: 20,
        offset: 10,
      });

      // Should match the second call (the SELECT query, not the COUNT query)
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        expect.anything()
      );
    });

    it('should order by utilization percent descending', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await locationCapacityService.getAllLocationCapacities();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY utilization_percent DESC'),
        expect.anything()
      );
    });
  });

  // ==========================================================================
  // RECALCULATE LOCATION CAPACITY
  // ==========================================================================

  describe('recalculateLocationCapacity', () => {
    it('should recalculate capacity with existing rules', async () => {
      // Get inventory
      mockQuery.mockResolvedValueOnce({ rows: [{ total_quantity: '75' }] });

      // Get location details (in getApplicableCapacityRules)
      mockQuery.mockResolvedValueOnce({
        rows: [{ zone: 'A', type: 'SHELF', bin_id: 'A-01-01' }],
      });

      // Get applicable rules
      const mockRule = {
        rule_id: 'CRULE-1',
        capacity_type: 'QUANTITY',
        capacity_unit: 'UNITS',
        maximum_capacity: '100',
        warning_threshold: '80',
        allow_overfill: false,
        overfill_threshold: null,
        is_active: true,
        priority: '1',
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockRule] });

      // Check existing capacity record
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing

      // Insert new capacity record
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Get primary capacity for return
      const mockCapacityRow = {
        capacity_id: 'LCAP-123',
        bin_location: 'A-01-01',
        capacity_type: 'QUANTITY',
        maximum_capacity: '100',
        current_utilization: '75',
        available_capacity: '25',
        utilization_percent: '75',
        capacity_unit: 'UNITS',
        status: 'ACTIVE',
        warning_threshold: '80',
        exceeded_at: null,
        last_updated: new Date(),
        updated_at: new Date(),
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockCapacityRow] });

      const result = await locationCapacityService.recalculateLocationCapacity('A-01-01');

      expect(result.currentUtilization).toBe(75);
      expect(result.utilizationPercent).toBe(75);
    });

    it('should create WARNING status when over threshold', async () => {
      // Get inventory
      mockQuery.mockResolvedValueOnce({ rows: [{ total_quantity: '85' }] });

      // Get location details
      mockQuery.mockResolvedValueOnce({
        rows: [{ zone: 'A', type: 'SHELF', bin_id: 'A-01-01' }],
      });

      // Get applicable rules
      const mockRule = {
        rule_id: 'CRULE-1',
        capacity_type: 'QUANTITY',
        capacity_unit: 'UNITS',
        maximum_capacity: '100',
        warning_threshold: '80',
        allow_overfill: false,
        overfill_threshold: null,
        is_active: true,
        priority: '1',
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockRule] });

      // Check existing capacity record
      mockQuery.mockResolvedValueOnce({ rows: [] }); // No existing

      // Insert new capacity record
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Check for existing alert (for createCapacityAlert)
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Insert new alert
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Get primary capacity for return
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            capacity_type: 'QUANTITY',
            maximum_capacity: '100',
            current_utilization: '85',
            available_capacity: '15',
            utilization_percent: '85',
            capacity_unit: 'UNITS',
            status: 'WARNING',
            warning_threshold: '80',
            exceeded_at: null,
            last_updated: new Date(),
            updated_at: new Date(),
            capacity_id: 'LCAP-123',
            bin_location: 'A-01-01',
          },
        ],
      });

      const result = await locationCapacityService.recalculateLocationCapacity('A-01-01');

      expect(result.status).toBe('WARNING');
    });

    it('should create EXCEEDED status when at 100%+', async () => {
      // Get inventory
      mockQuery.mockResolvedValueOnce({ rows: [{ total_quantity: '105' }] });

      // Get location details
      mockQuery.mockResolvedValueOnce({
        rows: [{ zone: 'A', type: 'SHELF', bin_id: 'A-01-01' }],
      });

      // Get applicable rules
      const mockRule = {
        rule_id: 'CRULE-1',
        capacity_type: 'QUANTITY',
        capacity_unit: 'UNITS',
        maximum_capacity: '100',
        warning_threshold: '80',
        allow_overfill: false,
        overfill_threshold: null,
        is_active: true,
        priority: '1',
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockRule] });

      // Check existing capacity record
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Insert new capacity record
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Check for existing alert
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Insert new alert
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Get primary capacity for return
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            capacity_type: 'QUANTITY',
            maximum_capacity: '100',
            current_utilization: '105',
            available_capacity: '0',
            utilization_percent: '105',
            capacity_unit: 'UNITS',
            status: 'EXCEEDED',
            warning_threshold: '80',
            exceeded_at: new Date(),
            last_updated: new Date(),
            updated_at: new Date(),
            capacity_id: 'LCAP-123',
            bin_location: 'A-01-01',
          },
        ],
      });

      const result = await locationCapacityService.recalculateLocationCapacity('A-01-01');

      expect(result.status).toBe('EXCEEDED');
    });

    it('should update existing capacity record', async () => {
      // Get inventory
      mockQuery.mockResolvedValueOnce({ rows: [{ total_quantity: '50' }] });

      // Get location details
      mockQuery.mockResolvedValueOnce({
        rows: [{ zone: 'A', type: 'SHELF', bin_id: 'A-01-01' }],
      });

      // Get applicable rules
      const mockRule = {
        rule_id: 'CRULE-1',
        capacity_type: 'QUANTITY',
        capacity_unit: 'UNITS',
        maximum_capacity: '100',
        warning_threshold: '80',
        allow_overfill: false,
        overfill_threshold: null,
        is_active: true,
        priority: '1',
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockRule] });

      // Check existing capacity record - EXISTS
      mockQuery.mockResolvedValueOnce({
        rows: [{ capacity_id: 'LCAP-123' }],
      });

      // Update existing
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Get primary capacity for return
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            capacity_type: 'QUANTITY',
            maximum_capacity: '100',
            current_utilization: '50',
            available_capacity: '50',
            utilization_percent: '50',
            capacity_unit: 'UNITS',
            status: 'ACTIVE',
            warning_threshold: '80',
            exceeded_at: null,
            last_updated: new Date(),
            updated_at: new Date(),
            capacity_id: 'LCAP-123',
            bin_location: 'A-01-01',
          },
        ],
      });

      const result = await locationCapacityService.recalculateLocationCapacity('A-01-01');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE location_capacities'),
        expect.anything()
      );
    });

    it('should create default capacity when no rules apply', async () => {
      // Get inventory
      mockQuery.mockResolvedValueOnce({ rows: [{ total_quantity: '25' }] });

      // Get location details
      mockQuery.mockResolvedValueOnce({
        rows: [{ zone: 'A', type: 'SHELF', bin_id: 'A-01-01' }],
      });

      // Get applicable rules - NONE
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Get primary capacity (bin_location + capacity_type='QUANTITY') - returns empty, goes to createDefault
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Insert default capacity record
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Get newly created capacity (in createDefaultLocationCapacity -> getLocationCapacity)
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            capacity_id: 'LCAP-123',
            bin_location: 'A-01-01',
            capacity_type: 'QUANTITY',
            maximum_capacity: '100',
            current_utilization: '25',
            available_capacity: '75',
            utilization_percent: '25',
            capacity_unit: 'UNITS',
            status: 'ACTIVE',
            warning_threshold: '80',
            exceeded_at: null,
            last_updated: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const result = await locationCapacityService.recalculateLocationCapacity('A-01-01');

      expect(result.maximumCapacity).toBe(100); // Default
    });
  });

  // ==========================================================================
  // GET ALL CAPACITY ALERTS
  // ==========================================================================

  describe('getAllCapacityAlerts', () => {
    it('should return all capacity alerts', async () => {
      const mockRows = [
        { alert_id: 'CALT-1', bin_location: 'A-01-01', acknowledged: false },
        { alert_id: 'CALT-2', bin_location: 'A-01-02', acknowledged: true },
      ];

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await locationCapacityService.getAllCapacityAlerts();

      expect(result.alerts).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by acknowledged status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ acknowledged: false }] });

      const result = await locationCapacityService.getAllCapacityAlerts({
        acknowledged: false,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('acknowledged = $'),
        expect.arrayContaining([false])
      );
    });

    it('should filter by alert type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ alert_type: 'EXCEEDED' }] });

      const result = await locationCapacityService.getAllCapacityAlerts({
        alertType: 'EXCEEDED',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('alert_type = $'),
        expect.arrayContaining(['EXCEEDED'])
      );
    });

    it('should apply limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '50' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await locationCapacityService.getAllCapacityAlerts({
        limit: 10,
        offset: 5,
      });

      // Should match the second call (the SELECT query, not the COUNT query)
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        expect.anything()
      );
    });

    it('should order by created_at descending', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await locationCapacityService.getAllCapacityAlerts();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.anything()
      );
    });
  });

  // ==========================================================================
  // ACKNOWLEDGE CAPACITY ALERT
  // ==========================================================================

  describe('acknowledgeCapacityAlert', () => {
    it('should acknowledge a capacity alert', async () => {
      const mockRow = {
        alert_id: 'CALT-123',
        bin_location: 'A-01-01',
        acknowledged: true,
        acknowledged_by: 'user-123',
        acknowledged_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const dto: AcknowledgeCapacityAlertDTO = {
        alertId: 'CALT-123',
        acknowledgedBy: 'user-123',
      };

      const result = await locationCapacityService.acknowledgeCapacityAlert(dto);

      expect(result.acknowledged).toBe(true);
      expect(result.acknowledgedBy).toBe('user-123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE capacity_alerts'),
        expect.arrayContaining(['user-123', 'CALT-123'])
      );
    });

    it('should throw error when alert not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const dto: AcknowledgeCapacityAlertDTO = {
        alertId: 'NONEXISTENT',
        acknowledgedBy: 'user-123',
      };

      await expect(locationCapacityService.acknowledgeCapacityAlert(dto)).rejects.toThrow(
        'Capacity alert NONEXISTENT not found'
      );
    });
  });
});
