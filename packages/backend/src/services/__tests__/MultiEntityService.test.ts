/**
 * Unit tests for MultiEntityService
 * @covers src/services/MultiEntityService.ts
 */

import { multiEntityService } from '../MultiEntityService';
import { multiEntityRepository } from '../../repositories/MultiEntityRepository';
import {
  NotFoundError,
  EntityType,
  EntityStatus,
  IntercompanyTransactionType,
  IntercompanyTransactionStatus,
  EntityRelationshipType,
  EntityUserRole,
} from '@opsui/shared';
import type {
  Entity,
  EntityWithParent,
  CreateEntityDTO,
  UpdateEntityDTO,
  IntercompanyTransaction,
  CreateIntercompanyTransactionDTO,
  EntityRelationship,
  CreateEntityRelationshipDTO,
  EntityUser,
  AssignEntityUserDTO,
  EntityQueryFilters,
  IntercompanyTransactionQueryFilters,
  EntityHierarchyNode,
} from '@opsui/shared';

// Mock dependencies
jest.mock('../../repositories/MultiEntityRepository', () => ({
  multiEntityRepository: {
    entities: {
      queryWithFilters: jest.fn(),
      findById: jest.fn(),
      findByIdWithParent: jest.fn(),
      findByIdWithHierarchy: jest.fn(),
      findByIdOrThrow: jest.fn(),
      findByCode: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      getHierarchyTree: jest.fn(),
      findChildren: jest.fn(),
      findSubsidiaries: jest.fn(),
    },
    intercompanyTransactions: {
      queryWithFilters: jest.fn(),
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      findByIdOrThrow: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateStatus: jest.fn(),
    },
    relationships: {
      findByEntityId: jest.fn(),
      findByEntities: jest.fn(),
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    consolidation: {
      findActive: jest.fn(),
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      findByIdOrThrow: jest.fn(),
      findByParentId: jest.fn(),
      findByParentAndSubsidiary: jest.fn(),
      findBySubsidiaryId: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    exchangeRates: {
      findByEntityId: jest.fn(),
      findLatestRate: jest.fn(),
      upsertRate: jest.fn(),
    },
    auditLog: {
      findByEntityId: jest.fn(),
      log: jest.fn(),
    },
    users: {
      findByEntityId: jest.fn(),
      findByUserId: jest.fn(),
      findByEntityAndUser: jest.fn(),
      findById: jest.fn(),
      findByIdWithDetails: jest.fn(),
      findByIdOrThrow: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      setDefaultEntity: jest.fn(),
      getUserDefaultEntity: jest.fn(),
      hasPermission: jest.fn(),
    },
    settings: {
      getSettingsMap: jest.fn(),
      getValue: jest.fn(),
      upsertSetting: jest.fn(),
    },
  },
}));

describe('MultiEntityService', () => {
  // Helper to create mock entity
  const createMockEntity = (overrides: any = {}): Entity => ({
    entity_id: 'ENT-001',
    entity_code: 'ENTITY-001',
    entity_name: 'Main Company',
    parent_entity_id: null,
    entity_type: EntityType.HEAD_OFFICE,
    entity_status: EntityStatus.ACTIVE,
    legal_name: 'Main Company LLC',
    tax_id: '123456789',
    registration_number: 'REG-001',
    base_currency: 'USD',
    address_line1: '123 Main St',
    address_line2: null,
    city: 'New York',
    state_province: 'NY',
    postal_code: '10001',
    country_code: 'US',
    phone: '555-1234',
    email: 'info@maincompany.com',
    website: 'https://maincompany.com',
    fiscal_year_start_month: 1,
    hierarchy_level: 0,
    sort_order: 1,
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    created_by: 'user-123',
    ...overrides,
  });

  // Helper to create mock intercompany transaction
  const createMockTransaction = (overrides: any = {}): IntercompanyTransaction => ({
    transaction_id: 'ICT-001',
    transaction_number: 'ICT-2024-0001',
    from_entity_id: 'ENT-001',
    to_entity_id: 'ENT-002',
    transaction_date: new Date('2024-01-01'),
    transaction_type: IntercompanyTransactionType.TRANSFER_OF_GOODS,
    transaction_status: IntercompanyTransactionStatus.PENDING,
    amount: 10000,
    currency: 'USD',
    exchange_rate: 1,
    base_currency_amount: 10000,
    description: 'Intercompany transfer',
    reference_number: 'REF-001',
    from_journal_entry_id: null,
    to_journal_entry_id: null,
    elimination_journal_id: null,
    approved_by: null,
    approved_at: null,
    notes: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    created_by: 'user-123',
    ...overrides,
  });

  // Helper to create mock entity user
  const createMockEntityUser = (overrides: any = {}): EntityUser => ({
    entity_user_id: 'EUS-001',
    entity_id: 'ENT-001',
    user_id: 'USER-001',
    entity_user_role: EntityUserRole.ENTITY_ADMIN,
    is_default_entity: true,
    can_view_financials: true,
    can_edit_financials: true,
    can_approve_transactions: true,
    permissions: null,
    effective_date: new Date('2024-01-01'),
    expiry_date: null,
    is_active: true,
    created_at: new Date('2024-01-01'),
    created_by: 'user-123',
    ...overrides,
  });

  // Helper to create mock entity relationship
  const createMockRelationship = (overrides: any = {}): EntityRelationship => ({
    relationship_id: 'REL-001',
    entity_id: 'ENT-001',
    related_entity_id: 'ENT-002',
    relationship_type: EntityRelationshipType.PARENT_SUBSIDIARY,
    ownership_percentage: 100,
    is_primary_contact: true,
    effective_date: new Date('2024-01-01'),
    expiry_date: null,
    notes: null,
    created_at: new Date('2024-01-01'),
    created_by: 'user-123',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // ENTITY MANAGEMENT
  // ==========================================================================

  describe('getEntities', () => {
    it('should return all entities', async () => {
      const mockEntities = [
        createMockEntity({ entity_id: 'ENT-001' }),
        createMockEntity({ entity_id: 'ENT-002' }),
      ];
      (multiEntityRepository.entities.queryWithFilters as jest.Mock).mockResolvedValue(
        mockEntities
      );

      const result = await multiEntityService.getEntities();

      expect(result).toHaveLength(2);
      expect(multiEntityRepository.entities.queryWithFilters).toHaveBeenCalledWith({});
    });

    it('should filter entities by status', async () => {
      const mockEntities = [createMockEntity()];
      (multiEntityRepository.entities.queryWithFilters as jest.Mock).mockResolvedValue(
        mockEntities
      );

      const filters: EntityQueryFilters = { entity_status: EntityStatus.ACTIVE };
      await multiEntityService.getEntities(filters);

      expect(multiEntityRepository.entities.queryWithFilters).toHaveBeenCalledWith(filters);
    });

    it('should filter entities by type', async () => {
      const mockEntities = [createMockEntity()];
      (multiEntityRepository.entities.queryWithFilters as jest.Mock).mockResolvedValue(
        mockEntities
      );

      const filters: EntityQueryFilters = { entity_type: EntityType.HEAD_OFFICE };
      await multiEntityService.getEntities(filters);

      expect(multiEntityRepository.entities.queryWithFilters).toHaveBeenCalledWith(filters);
    });
  });

  describe('getEntityById', () => {
    it('should return entity', async () => {
      const mockEntity = createMockEntity();
      (multiEntityRepository.entities.findByIdWithParent as jest.Mock).mockResolvedValue(
        mockEntity
      );

      const result = await multiEntityService.getEntityById('ENT-001');

      expect(result).toEqual(mockEntity);
    });

    it('should throw NotFoundError when entity not found', async () => {
      (multiEntityRepository.entities.findByIdWithParent as jest.Mock).mockResolvedValue(null);

      await expect(multiEntityService.getEntityById('NONEXISTENT')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createEntity', () => {
    it('should create a new entity', async () => {
      const dto: CreateEntityDTO = {
        entity_code: 'ENTITY-001',
        entity_name: 'New Company',
        entity_type: EntityType.SUBSIDIARY,
        base_currency: 'USD',
      };

      const mockEntity = createMockEntity(dto);
      (multiEntityRepository.entities.findByCode as jest.Mock).mockResolvedValue(null);
      (multiEntityRepository.entities.findById as jest.Mock).mockResolvedValue(mockEntity);
      (multiEntityRepository.entities.insert as jest.Mock).mockResolvedValue(mockEntity);
      (multiEntityRepository.auditLog.log as jest.Mock).mockResolvedValue(undefined);

      const result = await multiEntityService.createEntity(dto, 'user-123');

      expect(result.entity_name).toBe('New Company');
    });

    it('should throw error when entity code already exists', async () => {
      const dto: CreateEntityDTO = {
        entity_code: 'EXISTING',
        entity_name: 'Duplicate',
        entity_type: EntityType.SUBSIDIARY,
        base_currency: 'USD',
      };

      (multiEntityRepository.entities.findByCode as jest.Mock).mockResolvedValue(
        createMockEntity()
      );

      await expect(multiEntityService.createEntity(dto, 'user-123')).rejects.toThrow(
        'Entity code EXISTING already exists'
      );
    });
  });

  describe('updateEntity', () => {
    it('should update an existing entity', async () => {
      const existingEntity = createMockEntity();
      const updatedEntity = createMockEntity({ entity_name: 'Updated Company' });

      (multiEntityRepository.entities.findByIdOrThrow as jest.Mock).mockResolvedValue(
        existingEntity
      );
      (multiEntityRepository.entities.update as jest.Mock).mockResolvedValue(updatedEntity);
      (multiEntityRepository.auditLog.log as jest.Mock).mockResolvedValue(undefined);

      const result = await multiEntityService.updateEntity(
        'ENT-001',
        {
          entity_name: 'Updated Company',
        },
        'user-123'
      );

      expect(result.entity_name).toBe('Updated Company');
    });

    it('should throw NotFoundError when updating non-existent entity', async () => {
      (multiEntityRepository.entities.findByIdOrThrow as jest.Mock).mockRejectedValue(
        new NotFoundError('Entity', 'NONEXISTENT')
      );

      await expect(
        multiEntityService.updateEntity('NONEXISTENT', { entity_name: 'Updated' }, 'user-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // ENTITY HIERARCHY
  // ==========================================================================

  describe('getEntityHierarchy', () => {
    it('should return entity hierarchy tree', async () => {
      const mockHierarchy: EntityHierarchyNode[] = [
        {
          entity_id: 'ENT-001',
          entity_code: 'ENTITY-001',
          entity_name: 'Parent Company',
          entity_type: EntityType.HEAD_OFFICE,
          hierarchy_level: 0,
          parent_entity_id: null,
          children: [
            {
              entity_id: 'ENT-002',
              entity_code: 'ENTITY-002',
              entity_name: 'Subsidiary',
              entity_type: EntityType.SUBSIDIARY,
              hierarchy_level: 1,
              parent_entity_id: 'ENT-001',
              children: [],
            },
          ],
        },
      ];

      (multiEntityRepository.entities.getHierarchyTree as jest.Mock).mockResolvedValue(
        mockHierarchy
      );

      const result = await multiEntityService.getEntityHierarchy();

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
    });
  });

  // ==========================================================================
  // INTERCOMPANY TRANSACTIONS
  // ==========================================================================

  describe('getIntercompanyTransactions', () => {
    it('should return all intercompany transactions', async () => {
      const mockTransactions = [
        createMockTransaction({ transaction_id: 'ICT-001' }),
        createMockTransaction({ transaction_id: 'ICT-002' }),
      ];
      (
        multiEntityRepository.intercompanyTransactions.queryWithFilters as jest.Mock
      ).mockResolvedValue(mockTransactions);

      const result = await multiEntityService.getIntercompanyTransactions();

      expect(result).toHaveLength(2);
    });

    it('should filter by from entity', async () => {
      const mockTransactions = [createMockTransaction()];
      (
        multiEntityRepository.intercompanyTransactions.queryWithFilters as jest.Mock
      ).mockResolvedValue(mockTransactions);

      const filters: IntercompanyTransactionQueryFilters = {
        from_entity_id: 'ENT-001',
      };
      await multiEntityService.getIntercompanyTransactions(filters);

      expect(multiEntityRepository.intercompanyTransactions.queryWithFilters).toHaveBeenCalledWith(
        filters
      );
    });

    it('should filter by status', async () => {
      const mockTransactions = [createMockTransaction()];
      (
        multiEntityRepository.intercompanyTransactions.queryWithFilters as jest.Mock
      ).mockResolvedValue(mockTransactions);

      const filters: IntercompanyTransactionQueryFilters = {
        transaction_status: IntercompanyTransactionStatus.PENDING,
      };
      await multiEntityService.getIntercompanyTransactions(filters);

      expect(multiEntityRepository.intercompanyTransactions.queryWithFilters).toHaveBeenCalledWith(
        filters
      );
    });
  });

  describe('createIntercompanyTransaction', () => {
    it('should create a new intercompany transaction', async () => {
      const dto: CreateIntercompanyTransactionDTO = {
        from_entity_id: 'ENT-001',
        to_entity_id: 'ENT-002',
        transaction_date: new Date('2024-01-01'),
        transaction_type: IntercompanyTransactionType.TRANSFER_OF_GOODS,
        amount: 10000,
        currency: 'USD',
        description: 'Intercompany transfer',
      };

      const mockTransaction = createMockTransaction(dto);
      const mockEntity1 = createMockEntity({ entity_id: 'ENT-001', base_currency: 'USD' });
      const mockEntity2 = createMockEntity({ entity_id: 'ENT-002', base_currency: 'USD' });
      (multiEntityRepository.entities.findByIdOrThrow as jest.Mock)
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2);
      (multiEntityRepository.intercompanyTransactions.insert as jest.Mock).mockResolvedValue(
        mockTransaction
      );

      const result = await multiEntityService.createIntercompanyTransaction(dto, 'user-123');

      expect(result.from_entity_id).toBe('ENT-001');
      expect(result.to_entity_id).toBe('ENT-002');
    });
  });

  // ==========================================================================
  // ENTITY USERS
  // ==========================================================================

  describe('getEntityUsers', () => {
    it('should return users for an entity', async () => {
      const mockUsers = [
        createMockEntityUser({ entity_user_id: 'EUS-001' }),
        createMockEntityUser({ entity_user_id: 'EUS-002' }),
      ];

      // Create a mock response
      const mockWithDetails = mockUsers.map(u => ({
        ...u,
        entity: createMockEntity({ entity_id: u.entity_id }),
        user: {
          user_id: u.user_id,
          email: 'user@example.com',
          first_name: 'Test',
          last_name: 'User',
        },
      }));

      (multiEntityRepository.users.findByEntityId as jest.Mock).mockResolvedValue(mockUsers);
      (multiEntityRepository.users.findByIdWithDetails as jest.Mock).mockImplementation(
        (id: string) => Promise.resolve(mockWithDetails.find((u: any) => u.entity_user_id === id))
      );

      const result = await multiEntityService.getEntityUsers('ENT-001');

      expect(result).toHaveLength(2);
    });
  });

  describe('assignUserToEntity', () => {
    it('should assign a user to an entity', async () => {
      const dto: AssignEntityUserDTO = {
        entity_id: 'ENT-001',
        user_id: 'USER-001',
        entity_user_role: EntityUserRole.ENTITY_ADMIN,
        is_default_entity: true,
      };

      const mockUser = createMockEntityUser(dto);
      const mockEntity = createMockEntity();
      (multiEntityRepository.entities.findByIdOrThrow as jest.Mock).mockResolvedValue(mockEntity);
      (multiEntityRepository.users.findByEntityAndUser as jest.Mock).mockResolvedValue(null);
      (multiEntityRepository.users.insert as jest.Mock).mockResolvedValue(mockUser);
      (multiEntityRepository.users.setDefaultEntity as jest.Mock).mockResolvedValue(true);

      const result = await multiEntityService.assignUserToEntity(dto, 'user-123');

      expect(result.user_id).toBe('USER-001');
      expect(result.entity_id).toBe('ENT-001');
    });
  });

  // ==========================================================================
  // ENTITY RELATIONSHIPS
  // ==========================================================================

  describe('getEntityRelationships', () => {
    it('should return relationships for an entity', async () => {
      const mockRelationships = [createMockRelationship()];
      const mockWithDetails = {
        ...mockRelationships[0],
        entity: createMockEntity({ entity_id: mockRelationships[0].entity_id }),
        related_entity: createMockEntity({ entity_id: mockRelationships[0].related_entity_id }),
      };

      (multiEntityRepository.relationships.findByEntityId as jest.Mock).mockResolvedValue(
        mockRelationships
      );
      (multiEntityRepository.relationships.findByIdWithDetails as jest.Mock).mockResolvedValue(
        mockWithDetails
      );

      const result = await multiEntityService.getEntityRelationships('ENT-001');

      expect(result).toHaveLength(1);
    });
  });

  describe('createEntityRelationship', () => {
    it('should create a new relationship', async () => {
      const dto: CreateEntityRelationshipDTO = {
        entity_id: 'ENT-001',
        related_entity_id: 'ENT-002',
        relationship_type: EntityRelationshipType.PARENT_SUBSIDIARY,
        ownership_percentage: 100,
      };

      const mockRelationship = createMockRelationship(dto);
      const mockEntity1 = createMockEntity({ entity_id: 'ENT-001' });
      const mockEntity2 = createMockEntity({ entity_id: 'ENT-002' });
      (multiEntityRepository.relationships.findByEntities as jest.Mock).mockResolvedValue(null);
      (multiEntityRepository.entities.findByIdOrThrow as jest.Mock)
        .mockResolvedValueOnce(mockEntity1)
        .mockResolvedValueOnce(mockEntity2);
      (multiEntityRepository.relationships.insert as jest.Mock).mockResolvedValue(mockRelationship);

      const result = await multiEntityService.createEntityRelationship(dto, 'user-123');

      expect(result.entity_id).toBe('ENT-001');
      expect(result.related_entity_id).toBe('ENT-002');
    });
  });
});
