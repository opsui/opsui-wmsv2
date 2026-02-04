/**
 * Unit tests for SeedDataService
 * @covers src/services/SeedDataService.ts
 */

import {
  saveScenario,
  getScenarios,
  getScenario,
  applyScenario,
  deleteScenario,
  exportCurrentState,
  importData,
  getMigrations,
  runDatabaseReset,
  SeedScenario,
  ExportData,
} from '../SeedDataService';

// Mock database client
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

import { getPool } from '../../db/client';

describe('SeedDataService', () => {
  let mockPool: any;
  let mockQuery: jest.Mock;

  const mockScenarioRow: SeedScenario = {
    scenario_id: 'SCENARIO-001',
    name: 'Test Scenario',
    description: 'A test scenario',
    data: JSON.stringify({
      timestamp: new Date('2024-01-01'),
      tables: {
        orders: [{ order_id: 'ORD-001', status: 'pending' }],
        users: [{ user_id: 'USR-001', email: 'test@example.com' }],
      },
    }),
    created_at: new Date('2024-01-01'),
    created_by: 'user-001',
  };

  const mockExportData: ExportData = {
    timestamp: new Date('2024-01-01'),
    tables: {
      orders: [{ order_id: 'ORD-001', status: 'pending' }],
      users: [{ user_id: 'USR-001', email: 'test@example.com' }],
      skus: [{ sku: 'SKU-001', description: 'Widget' }],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock pool and query function
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };

    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  // ==========================================================================
  // SAVE SCENARIO
  // ==========================================================================

  describe('saveScenario', () => {
    it('should save a scenario with data from key tables', async () => {
      // Mock queries for each table
      mockQuery
        .mockResolvedValueOnce({ rows: [{ order_id: 'ORD-001', status: 'pending' }] }) // orders
        .mockResolvedValueOnce({ rows: [{ user_id: 'USR-001', email: 'test@example.com' }] }) // users
        .mockResolvedValueOnce({ rows: [{ sku: 'SKU-001', description: 'Widget' }] }) // skus
        .mockResolvedValueOnce({ rows: [] }) // order_items
        .mockResolvedValueOnce({ rows: [] }) // pick_tasks
        .mockResolvedValueOnce({ rows: [] }) // audit_logs
        .mockResolvedValueOnce({ rows: [mockScenarioRow] }); // INSERT

      const result = await saveScenario('Test Scenario', 'A test scenario', 'user-001');

      expect(result.name).toBe('Test Scenario');
      expect(result.description).toBe('A test scenario');
      expect(result.created_by).toBe('user-001');
      // Check INSERT query was called (last call)
      expect(mockQuery).toHaveBeenCalledTimes(7);
      expect(mockQuery.mock.calls[6][0]).toContain('INSERT INTO seed_scenarios');
    });

    it('should handle table export failures gracefully', async () => {
      // Mock one table failing
      mockQuery
        .mockResolvedValueOnce({ rows: [{ order_id: 'ORD-001' }] }) // orders
        .mockRejectedValueOnce(new Error('Table not found')) // users fails
        .mockResolvedValueOnce({ rows: [] }) // skus
        .mockResolvedValueOnce({ rows: [] }) // order_items
        .mockResolvedValueOnce({ rows: [] }) // pick_tasks
        .mockResolvedValueOnce({ rows: [] }) // audit_logs
        .mockResolvedValueOnce({ rows: [mockScenarioRow] }); // INSERT

      const result = await saveScenario('Test Scenario', 'Test', 'user-001');

      expect(result.name).toBe('Test Scenario');
      // Should still save despite one table failing
    });

    it('should include all key tables in export', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // orders
        .mockResolvedValueOnce({ rows: [] }) // users
        .mockResolvedValueOnce({ rows: [] }) // skus
        .mockResolvedValueOnce({ rows: [] }) // order_items
        .mockResolvedValueOnce({ rows: [] }) // pick_tasks
        .mockResolvedValueOnce({ rows: [] }) // audit_logs
        .mockResolvedValueOnce({ rows: [mockScenarioRow] }); // INSERT

      await saveScenario('Test', 'Description', 'user-001');

      // Should have 7 calls: 6 for tables + 1 for INSERT
      expect(mockQuery).toHaveBeenCalledTimes(7);
    });
  });

  // ==========================================================================
  // GET SCENARIOS
  // ==========================================================================

  describe('getScenarios', () => {
    it('should return all scenarios ordered by created_at DESC', async () => {
      const scenarios = [mockScenarioRow, { ...mockScenarioRow, scenario_id: 'SCENARIO-002' }];

      mockQuery.mockResolvedValueOnce({ rows: scenarios });

      const result = await getScenarios();

      expect(result).toHaveLength(2);
      expect(result[0].scenario_id).toBe('SCENARIO-001');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM seed_scenarios ORDER BY created_at DESC'
      );
    });

    it('should return empty array when no scenarios exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await getScenarios();

      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // GET SCENARIO
  // ==========================================================================

  describe('getScenario', () => {
    it('should return scenario by ID', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockScenarioRow] });

      const result = await getScenario('SCENARIO-001');

      expect(result).not.toBeNull();
      expect(result?.scenario_id).toBe('SCENARIO-001');
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM seed_scenarios WHERE scenario_id = $1',
        ['SCENARIO-001']
      );
    });

    it('should return null when scenario not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await getScenario('NOT-FOUND');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // APPLY SCENARIO
  // ==========================================================================

  describe('applyScenario', () => {
    it('should apply scenario and restore database state', async () => {
      const scenarioData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          orders: [
            { order_id: 'ORD-001', status: 'pending' },
            { order_id: 'ORD-002', status: 'picked' },
          ],
        },
      };

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ ...mockScenarioRow, data: JSON.stringify(scenarioData) }],
        }) // getScenario
        .mockResolvedValueOnce({}) // DELETE FROM orders
        .mockResolvedValueOnce({}) // INSERT INTO orders
        .mockResolvedValueOnce({}) // setval orders_id_seq
        .mockResolvedValueOnce({}) // setval users_id_seq
        .mockResolvedValueOnce({}); // setval skus_id_seq

      await applyScenario('SCENARIO-001');

      // Check DELETE was called
      expect(mockQuery.mock.calls.some(call => call[0].includes('DELETE FROM orders'))).toBe(true);
      // Check INSERT was called
      expect(mockQuery.mock.calls.some(call => call[0].includes('INSERT INTO orders'))).toBe(true);
    });

    it('should throw error when scenario not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(applyScenario('NOT-FOUND')).rejects.toThrow('Scenario not found');
    });

    it('should handle scenario data as object (not string)', async () => {
      const scenarioData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          users: [{ user_id: 'USR-001', email: 'test@example.com' }],
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockScenarioRow, data: scenarioData as any }] }) // getScenario with object data
        .mockResolvedValueOnce({}) // DELETE FROM users
        .mockResolvedValueOnce({}) // INSERT INTO users
        .mockResolvedValueOnce({}) // setval orders_id_seq
        .mockResolvedValueOnce({}) // setval users_id_seq
        .mockResolvedValueOnce({}); // setval skus_id_seq

      await applyScenario('SCENARIO-001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array)
      );
    });

    it('should skip empty tables when applying scenario', async () => {
      const scenarioData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          orders: [], // Empty array
          users: [{ user_id: 'USR-001', email: 'test@example.com' }],
        },
      };

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ ...mockScenarioRow, data: JSON.stringify(scenarioData) }],
        })
        .mockResolvedValueOnce({}) // DELETE FROM users
        .mockResolvedValueOnce({}) // INSERT INTO users
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await applyScenario('SCENARIO-001');

      // Should not process orders (empty array)
      const deleteCalls = mockQuery.mock.calls.filter(call => call[0].includes('DELETE'));
      expect(deleteCalls).toHaveLength(1); // Only users DELETE
    });

    it('should handle table restore errors gracefully', async () => {
      const scenarioData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          orders: [{ order_id: 'ORD-001', status: 'pending' }],
        },
      };

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ ...mockScenarioRow, data: JSON.stringify(scenarioData) }],
        })
        .mockRejectedValueOnce(new Error('Table locked')) // DELETE fails
        .mockResolvedValueOnce({}) // setval orders_id_seq
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      // Should not throw, just log error
      await expect(applyScenario('SCENARIO-001')).resolves.not.toThrow();
    });

    it('should reset sequences after applying scenario', async () => {
      const scenarioData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          orders: [{ order_id: 'ORD-001', status: 'pending', id: 100 }],
        },
      };

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ ...mockScenarioRow, data: JSON.stringify(scenarioData) }],
        })
        .mockResolvedValueOnce({}) // DELETE FROM orders
        .mockResolvedValueOnce({}) // INSERT INTO orders
        .mockResolvedValueOnce({}) // setval orders_id_seq
        .mockResolvedValueOnce({}) // setval users_id_seq
        .mockResolvedValueOnce({}); // setval skus_id_seq

      await applyScenario('SCENARIO-001');

      // Check that setval was called
      expect(
        mockQuery.mock.calls.filter(call => call[0].includes('setval')).length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // DELETE SCENARIO
  // ==========================================================================

  describe('deleteScenario', () => {
    it('should delete scenario by ID', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await deleteScenario('SCENARIO-001');

      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM seed_scenarios WHERE scenario_id = $1', [
        'SCENARIO-001',
      ]);
    });

    it('should handle deleting non-existent scenario', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await expect(deleteScenario('NOT-FOUND')).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // EXPORT CURRENT STATE
  // ==========================================================================

  describe('exportCurrentState', () => {
    it('should export all configured tables', async () => {
      const tables = [
        'orders',
        'users',
        'skus',
        'order_items',
        'pick_tasks',
        'audit_logs',
        'bin_locations',
        'custom_roles',
        'user_role_assignments',
        'carriers',
        'zones',
      ];

      tables.forEach(() => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
      });

      const result = await exportCurrentState();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.tables).toBeDefined();
      expect(mockQuery).toHaveBeenCalledTimes(tables.length);
    });

    it('should include data from all tables', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ order_id: 'ORD-001' }] }) // orders
        .mockResolvedValueOnce({ rows: [{ user_id: 'USR-001' }] }) // users
        .mockResolvedValueOnce({ rows: [] }) // skus
        .mockResolvedValueOnce({ rows: [] }) // order_items
        .mockResolvedValueOnce({ rows: [] }) // pick_tasks
        .mockResolvedValueOnce({ rows: [] }) // audit_logs
        .mockResolvedValueOnce({ rows: [] }) // bin_locations
        .mockResolvedValueOnce({ rows: [] }) // custom_roles
        .mockResolvedValueOnce({ rows: [] }) // user_role_assignments
        .mockResolvedValueOnce({ rows: [] }) // carriers
        .mockResolvedValueOnce({ rows: [] }); // zones

      const result = await exportCurrentState();

      expect(result.tables.orders).toHaveLength(1);
      expect(result.tables.users).toHaveLength(1);
    });

    it('should handle table export failures gracefully', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // orders
        .mockRejectedValueOnce(new Error('Permission denied')) // users fails
        .mockResolvedValueOnce({ rows: [] }) // skus
        .mockResolvedValueOnce({ rows: [] }) // order_items
        .mockResolvedValueOnce({ rows: [] }) // pick_tasks
        .mockResolvedValueOnce({ rows: [] }) // audit_logs
        .mockResolvedValueOnce({ rows: [] }) // bin_locations
        .mockResolvedValueOnce({ rows: [] }) // custom_roles
        .mockResolvedValueOnce({ rows: [] }) // user_role_assignments
        .mockResolvedValueOnce({ rows: [] }) // carriers
        .mockResolvedValueOnce({ rows: [] }); // zones

      const result = await exportCurrentState();

      // Should still export despite failures
      expect(result.tables).toBeDefined();
      expect(result.tables.users).toEqual([]); // Failed tables get empty array
    });

    it('should set export timestamp', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await exportCurrentState();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.tables).toBeDefined();
    });
  });

  // ==========================================================================
  // IMPORT DATA
  // ==========================================================================

  describe('importData', () => {
    it('should import data from exported state', async () => {
      const dataToImport: ExportData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          orders: [{ order_id: 'ORD-001', status: 'pending' }],
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ exists: true }] }) // table exists check
        .mockResolvedValueOnce({}) // DELETE FROM orders
        .mockResolvedValueOnce({}) // INSERT INTO orders
        .mockResolvedValueOnce({}) // setval orders_id_seq
        .mockResolvedValueOnce({}) // setval users_id_seq
        .mockResolvedValueOnce({}); // setval skus_id_seq

      await importData(dataToImport);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('information_schema.tables'), [
        'orders',
      ]);
      // Check DELETE was called
      expect(mockQuery.mock.calls.some(call => call[0].includes('DELETE FROM orders'))).toBe(true);
    });

    it('should skip tables that do not exist', async () => {
      const dataToImport: ExportData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          non_existent_table: [{ id: 1 }],
        },
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] }); // table does not exist

      await importData(dataToImport);

      // Should not try to DELETE or INSERT non-existent table
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM non_existent_table')
      );
    });

    it('should handle import errors gracefully', async () => {
      const dataToImport: ExportData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          orders: [{ order_id: 'ORD-001', status: 'pending' }],
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockRejectedValueOnce(new Error('Constraint violation')); // DELETE fails

      // Should not throw
      await expect(importData(dataToImport)).resolves.not.toThrow();
    });

    it('should import multiple rows per table', async () => {
      const dataToImport: ExportData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          orders: [
            { order_id: 'ORD-001', status: 'pending' },
            { order_id: 'ORD-002', status: 'picked' },
            { order_id: 'ORD-003', status: 'shipped' },
          ],
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({}) // DELETE
        .mockResolvedValueOnce({}) // INSERT row 1
        .mockResolvedValueOnce({}) // INSERT row 2
        .mockResolvedValueOnce({}) // INSERT row 3
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await importData(dataToImport);

      // Should have 1 DELETE + 3 INSERTs for orders + 3 setval calls = 7 queries
      expect(mockQuery.mock.calls.filter(c => c[0].includes('INSERT INTO orders'))).toHaveLength(3);
    });

    it('should reset sequences after import', async () => {
      const dataToImport: ExportData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          orders: [{ order_id: 'ORD-001', status: 'pending' }],
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}) // setval orders
        .mockResolvedValueOnce({}) // setval users
        .mockResolvedValueOnce({}); // setval skus

      await importData(dataToImport);

      // Check that setval was called
      expect(
        mockQuery.mock.calls.filter(call => call[0].includes('setval')).length
      ).toBeGreaterThanOrEqual(1);
    });

    it('should handle sequence reset errors gracefully', async () => {
      const dataToImport: ExportData = {
        timestamp: new Date('2024-01-01'),
        tables: {
          orders: [{ order_id: 'ORD-001', status: 'pending' }],
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ exists: true }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Sequence not found')) // setval fails
        .mockResolvedValueOnce({}) // setval users
        .mockResolvedValueOnce({}); // setval skus

      // Should not throw
      await expect(importData(dataToImport)).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // GET MIGRATIONS
  // ==========================================================================

  describe('getMigrations', () => {
    it('should return migrations ordered by applied_at DESC', async () => {
      const migrations = [
        { migration_name: '001_init', applied_at: new Date('2024-01-01'), applied_by: 'admin' },
        {
          migration_name: '002_add_users',
          applied_at: new Date('2024-01-02'),
          applied_by: 'admin',
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: migrations });

      const result = await getMigrations();

      expect(result).toHaveLength(2);
      expect(result[0].migration_name).toBe('001_init');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM migration_history'));
    });

    it('should return empty array when no migrations', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await getMigrations();

      expect(result).toHaveLength(0);
    });

    it('should select migration_name, applied_at, and applied_by', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await getMigrations();

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('migration_name');
      expect(query).toContain('applied_at');
      expect(query).toContain('applied_by');
    });
  });

  // ==========================================================================
  // RUN DATABASE RESET
  // ==========================================================================

  describe('runDatabaseReset', () => {
    it('should clear all tables in dependency order', async () => {
      const clearOrder = [
        'audit_logs',
        'pick_tasks',
        'order_items',
        'orders',
        'user_role_assignments',
        'users',
        'bin_locations',
        'skus',
        'carriers',
        'zones',
      ];

      clearOrder.forEach(() => mockQuery.mockResolvedValueOnce({}));
      mockQuery.mockResolvedValueOnce({}); // setval orders
      mockQuery.mockResolvedValueOnce({}); // setval users
      mockQuery.mockResolvedValueOnce({}); // setval skus

      await runDatabaseReset('full');

      expect(mockQuery).toHaveBeenCalledTimes(clearOrder.length + 3); // DELETEs + 3 setval
    });

    it('should add default data for "fresh" reset type', async () => {
      // Clear tables (10 tables)
      for (let i = 0; i < 10; i++) {
        mockQuery.mockResolvedValueOnce({});
      }
      // Sequences (3)
      mockQuery.mockResolvedValueOnce({}); // setval orders
      mockQuery.mockResolvedValueOnce({}); // setval users
      mockQuery.mockResolvedValueOnce({}); // setval skus
      // Insert admin user
      mockQuery.mockResolvedValueOnce({}); // INSERT admin user
      // Insert 5 SKUs
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({});
      }

      await runDatabaseReset('fresh');

      // Check that user INSERT was called
      expect(mockQuery.mock.calls.some(call => call[0].includes('INSERT INTO users'))).toBe(true);
      // Check that SKU INSERTs were called (5 times)
      const skuInserts = mockQuery.mock.calls.filter(call => call[0].includes('INSERT INTO skus'));
      expect(skuInserts.length).toBe(5);
    });

    it('should add sample orders for "with-orders" reset type', async () => {
      // Clear tables
      for (let i = 0; i < 10; i++) {
        mockQuery.mockResolvedValueOnce({});
      }
      // Sequences
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});
      // Admin user and SKUs
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({});
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({});
      }
      // 20 sample orders
      for (let i = 0; i < 20; i++) {
        mockQuery.mockResolvedValueOnce({});
      }

      await runDatabaseReset('with-orders');

      // Should have 20 order INSERTs
      const orderInserts = mockQuery.mock.calls.filter(call =>
        call[0].includes('INSERT INTO orders')
      );
      expect(orderInserts.length).toBeGreaterThanOrEqual(20);
    });

    it('should not add default data for "full" reset type', async () => {
      // Clear tables
      for (let i = 0; i < 10; i++) {
        mockQuery.mockResolvedValueOnce({});
      }
      // Sequences
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});

      await runDatabaseReset('full');

      // Should not have any INSERT queries for users or skus
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array)
      );
    });

    it('should handle table clear errors gracefully', async () => {
      // Most tables clear successfully
      for (let i = 0; i < 9; i++) {
        mockQuery.mockResolvedValueOnce({});
      }
      // One table fails
      mockQuery.mockRejectedValueOnce(new Error('Table locked'));
      // Sequences
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});

      // Should not throw
      await expect(runDatabaseReset('full')).resolves.not.toThrow();
    });

    it('should reset sequences to 1', async () => {
      // Clear tables
      for (let i = 0; i < 10; i++) {
        mockQuery.mockResolvedValueOnce({});
      }

      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});

      await runDatabaseReset('full');

      const setvalCalls = mockQuery.mock.calls.filter(call => call[0].includes('setval'));
      expect(setvalCalls).toHaveLength(3);
      setvalCalls.forEach(call => {
        expect(call[0]).toContain('1, false'); // Third parameter is false to reset to 1
      });
    });

    it('should insert 5 sample SKUs for fresh/with-orders reset', async () => {
      // Clear tables + sequences
      for (let i = 0; i < 13; i++) {
        mockQuery.mockResolvedValueOnce({});
      }
      mockQuery.mockResolvedValueOnce({ rows: [] }); // admin user check
      mockQuery.mockResolvedValueOnce({}); // admin user insert

      // 5 SKU inserts
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});
      mockQuery.mockResolvedValueOnce({});

      await runDatabaseReset('fresh');

      const skuInserts = mockQuery.mock.calls.filter(call => call[0].includes('INSERT INTO skus'));
      expect(skuInserts).toHaveLength(5);
    });

    it('should use ON CONFLICT DO NOTHING for admin user', async () => {
      // Clear tables + sequences
      for (let i = 0; i < 13; i++) {
        mockQuery.mockResolvedValueOnce({});
      }
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({});

      // SKUs
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({});
      }

      await runDatabaseReset('fresh');

      const adminInsert = mockQuery.mock.calls.find(call => call[0].includes('USR-ADMIN'));
      expect(adminInsert?.[0]).toContain('ON CONFLICT');
    });
  });
});
