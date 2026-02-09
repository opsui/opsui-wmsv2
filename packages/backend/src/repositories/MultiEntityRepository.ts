/**
 * Multi-Entity Repository
 *
 * Data access layer for multi-company, multi-subsidiary ERP operations
 * Handles entities, inter-company transactions, consolidation rules, and entity user assignments
 */

import { query, transaction } from '../db/client';
import { BaseRepository } from './BaseRepository';
import type {
  Entity,
  EntityWithParent,
  IntercompanyTransaction,
  IntercompanyTransactionWithDetails,
  EntityRelationship,
  EntityRelationshipWithDetails,
  EntitySetting,
  EntityUser,
  EntityUserWithDetails,
  ConsolidationRule,
  ConsolidationRuleWithDetails,
  EntityExchangeRate,
  EntityAuditLog,
  EntityHierarchyNode,
  EntityQueryFilters,
  IntercompanyTransactionQueryFilters,
} from '@opsui/shared';

// ============================================================================
// ENTITY REPOSITORY
// ============================================================================

export class EntityRepository extends BaseRepository<Entity> {
  constructor() {
    super('entities', 'entity_id');
  }

  // Find by code
  async findByCode(code: string): Promise<Entity | null> {
    const result = await query<Entity>(`SELECT * FROM ${this.tableName} WHERE entity_code = $1`, [
      code,
    ]);
    return result.rows[0] || null;
  }

  // Find with parent details
  async findByIdWithParent(entityId: string): Promise<EntityWithParent | null> {
    const entity = await this.findById(entityId);
    if (!entity) return null;

    let parentEntity: Entity | null = null;
    if (entity.parent_entity_id) {
      parentEntity = await this.findById(entity.parent_entity_id);
    }

    return {
      ...entity,
      parent_entity: parentEntity,
    };
  }

  // Find with hierarchy path
  async findByIdWithHierarchy(entityId: string): Promise<EntityWithParent | null> {
    const result = await query<Entity>(`SELECT * FROM get_entity_hierarchy_path($1)`, [entityId]);

    if (result.rows.length === 0) return null;

    const entity = await this.findByIdWithParent(entityId);
    if (!entity) return null;

    return {
      ...entity,
      hierarchy_path: result.rows,
    };
  }

  // Find children
  async findChildren(parentId: string): Promise<Entity[]> {
    const result = await query<Entity>(
      `SELECT * FROM ${this.tableName} WHERE parent_entity_id = $1 ORDER BY sort_order, entity_name`,
      [parentId]
    );
    return result.rows;
  }

  // Find all subsidiaries (recursive)
  async findSubsidiaries(entityId: string, includeChildren = true): Promise<Entity[]> {
    const result = await query<Entity>(`SELECT * FROM get_entity_subsidiaries($1, $2)`, [
      entityId,
      includeChildren,
    ]);
    return result.rows;
  }

  // Build hierarchy tree
  async getHierarchyTree(rootEntityId?: string): Promise<EntityHierarchyNode[]> {
    let sql = `
      WITH RECURSIVE entity_tree AS (
        -- Root entities (no parent)
        SELECT e.*, NULL::TEXT as parent_path
        FROM entities e
        WHERE e.parent_entity_id IS NULL AND e.is_active = true
        ${rootEntityId ? 'AND e.entity_id = $1' : ''}

        UNION ALL

        -- Add children
        SELECT e.*, CONCAT(et.parent_path, '>', e.entity_id)
        FROM entities e
        INNER JOIN entity_tree et ON e.parent_entity_id = et.entity_id
        WHERE e.is_active = true
      )
      SELECT
        et.*,
        (
          SELECT json_agg(json_build_object(
            'entity_id', child.entity_id,
            'entity_code', child.entity_code,
            'entity_name', child.entity_name,
            'entity_type', child.entity_type,
            'hierarchy_level', child.hierarchy_level,
            'parent_entity_id', child.parent_entity_id,
            'children', NULL
          ))
          FROM entities child
          WHERE child.parent_entity_id = et.entity_id AND child.is_active = true
        ) as children
      FROM entity_tree et
      WHERE et.parent_entity_id IS NULL
      ORDER BY et.sort_order, et.entity_name
    `;

    const params = rootEntityId ? [rootEntityId] : [];
    const result = await query<any>(sql, params);

    // Transform into proper tree structure
    const buildTree = (entities: any[]): EntityHierarchyNode[] => {
      return entities.map(e => ({
        entity_id: e.entity_id,
        entity_code: e.entity_code,
        entity_name: e.entity_name,
        entity_type: e.entity_type,
        hierarchy_level: e.hierarchy_level,
        parent_entity_id: e.parent_entity_id,
        children: e.children ? buildTree(e.children) : [],
      }));
    };

    return buildTree(result.rows);
  }

  // Query with filters
  async queryWithFilters(filters: EntityQueryFilters = {}): Promise<Entity[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.entity_type) {
      conditions.push(`entity_type = $${paramIndex++}`);
      params.push(filters.entity_type);
    }
    if (filters.entity_status) {
      conditions.push(`entity_status = $${paramIndex++}`);
      params.push(filters.entity_status);
    }
    if (filters.parent_entity_id !== undefined) {
      if (filters.parent_entity_id === null) {
        conditions.push(`parent_entity_id IS NULL`);
      } else {
        conditions.push(`parent_entity_id = $${paramIndex++}`);
        params.push(filters.parent_entity_id);
      }
    }
    if (filters.base_currency) {
      conditions.push(`base_currency = $${paramIndex++}`);
      params.push(filters.base_currency);
    }
    if (filters.country_code) {
      conditions.push(`country_code = $${paramIndex++}`);
      params.push(filters.country_code);
    }
    if (filters.is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      params.push(filters.is_active);
    }
    if (filters.search) {
      conditions.push(`(
        entity_name ILIKE $${paramIndex++} OR
        entity_code ILIKE $${paramIndex++} OR
        legal_name ILIKE $${paramIndex++}
      )`);
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY hierarchy_level, sort_order, entity_name
    `;

    const result = await query<Entity>(sql, params);
    return result.rows;
  }

  // Soft delete
  async softDelete(entityId: string): Promise<boolean> {
    const result = await query(
      `UPDATE ${this.tableName} SET entity_status = 'CLOSED', is_active = false, updated_at = NOW() WHERE ${this.primaryKey} = $1`,
      [entityId]
    );
    return (result.rowCount || 0) > 0;
  }
}

// ============================================================================
// INTER-COMPANY TRANSACTION REPOSITORY
// ============================================================================

export class IntercompanyTransactionRepository extends BaseRepository<IntercompanyTransaction> {
  constructor() {
    super('intercompany_transactions', 'transaction_id');
  }

  // Find by number
  async findByNumber(transactionNumber: string): Promise<IntercompanyTransaction | null> {
    const result = await query<IntercompanyTransaction>(
      `SELECT * FROM ${this.tableName} WHERE transaction_number = $1`,
      [transactionNumber]
    );
    return result.rows[0] || null;
  }

  // Find with details
  async findByIdWithDetails(
    transactionId: string
  ): Promise<IntercompanyTransactionWithDetails | null> {
    const transaction = await this.findById(transactionId);
    if (!transaction) return null;

    const [fromEntity, toEntity] = await Promise.all([
      query<Entity>('SELECT * FROM entities WHERE entity_id = $1', [transaction.from_entity_id]),
      query<Entity>('SELECT * FROM entities WHERE entity_id = $1', [transaction.to_entity_id]),
    ]);

    return {
      ...transaction,
      from_entity: fromEntity.rows[0],
      to_entity: toEntity.rows[0],
    };
  }

  // Query with filters
  async queryWithFilters(
    filters: IntercompanyTransactionQueryFilters = {}
  ): Promise<IntercompanyTransaction[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.entity_id) {
      conditions.push(`(from_entity_id = $${paramIndex++} OR to_entity_id = $${paramIndex++})`);
      params.push(filters.entity_id, filters.entity_id);
    } else {
      if (filters.from_entity_id) {
        conditions.push(`from_entity_id = $${paramIndex++}`);
        params.push(filters.from_entity_id);
      }
      if (filters.to_entity_id) {
        conditions.push(`to_entity_id = $${paramIndex++}`);
        params.push(filters.to_entity_id);
      }
    }
    if (filters.transaction_type) {
      conditions.push(`transaction_type = $${paramIndex++}`);
      params.push(filters.transaction_type);
    }
    if (filters.transaction_status) {
      conditions.push(`transaction_status = $${paramIndex++}`);
      params.push(filters.transaction_status);
    }
    if (filters.date_from) {
      conditions.push(`transaction_date >= $${paramIndex++}`);
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push(`transaction_date <= $${paramIndex++}`);
      params.push(filters.date_to);
    }
    if (filters.search) {
      conditions.push(`(
        transaction_number ILIKE $${paramIndex++} OR
        description ILIKE $${paramIndex++} OR
        reference_number ILIKE $${paramIndex++}
      )`);
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY transaction_date DESC, created_at DESC
    `;

    const result = await query<IntercompanyTransaction>(sql, params);
    return result.rows;
  }

  // Get pending transactions
  async findPending(entityId?: string): Promise<IntercompanyTransaction[]> {
    const sql = entityId
      ? `SELECT * FROM ${this.tableName} WHERE transaction_status = 'PENDING' AND (from_entity_id = $1 OR to_entity_id = $1)`
      : `SELECT * FROM ${this.tableName} WHERE transaction_status = 'PENDING'`;
    const result = await query<IntercompanyTransaction>(sql, entityId ? [entityId] : []);
    return result.rows;
  }

  // Update status
  async updateStatus(transactionId: string, status: string, approvedBy?: string): Promise<boolean> {
    const updates = ['transaction_status = $1', 'updated_at = NOW()'];
    const params: any[] = [status];

    if (approvedBy) {
      updates.push(`approved_by = $${params.length + 1}`);
      params.push(approvedBy);
      updates.push(`approved_at = NOW()`);
    }

    params.push(transactionId);

    const result = await query(
      `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE ${this.primaryKey} = $${params.length}`,
      params
    );
    return (result.rowCount || 0) > 0;
  }
}

// ============================================================================
// ENTITY RELATIONSHIP REPOSITORY
// ============================================================================

export class EntityRelationshipRepository extends BaseRepository<EntityRelationship> {
  constructor() {
    super('entity_relationships', 'relationship_id');
  }

  // Find by entities
  async findByEntities(
    entityId: string,
    relatedEntityId: string
  ): Promise<EntityRelationship | null> {
    const result = await query<EntityRelationship>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 AND related_entity_id = $2`,
      [entityId, relatedEntityId]
    );
    return result.rows[0] || null;
  }

  // Find with details
  async findByIdWithDetails(relationshipId: string): Promise<EntityRelationshipWithDetails | null> {
    const relationship = await this.findById(relationshipId);
    if (!relationship) return null;

    const [entity, relatedEntity] = await Promise.all([
      query<Entity>('SELECT * FROM entities WHERE entity_id = $1', [relationship.entity_id]),
      query<Entity>('SELECT * FROM entities WHERE entity_id = $1', [
        relationship.related_entity_id,
      ]),
    ]);

    return {
      ...relationship,
      entity: entity.rows[0],
      related_entity: relatedEntity.rows[0],
    };
  }

  // Find all relationships for an entity
  async findByEntityId(entityId: string): Promise<EntityRelationship[]> {
    const result = await query<EntityRelationship>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 OR related_entity_id = $1`,
      [entityId]
    );
    return result.rows;
  }

  // Find active relationships
  async findActive(entityId?: string): Promise<EntityRelationship[]> {
    const sql = entityId
      ? `SELECT * FROM ${this.tableName} WHERE (entity_id = $1 OR related_entity_id = $1) AND (expiry_date IS NULL OR expiry_date > NOW())`
      : `SELECT * FROM ${this.tableName} WHERE expiry_date IS NULL OR expiry_date > NOW()`;
    const result = await query<EntityRelationship>(sql, entityId ? [entityId] : []);
    return result.rows;
  }
}

// ============================================================================
// ENTITY SETTINGS REPOSITORY
// ============================================================================

export class EntitySettingsRepository extends BaseRepository<EntitySetting> {
  constructor() {
    super('entity_settings', 'setting_id');
  }

  // Find by entity and key
  async findByEntityAndKey(entityId: string, key: string): Promise<EntitySetting | null> {
    const result = await query<EntitySetting>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 AND setting_key = $2`,
      [entityId, key]
    );
    return result.rows[0] || null;
  }

  // Find all settings for an entity
  async findByEntityId(entityId: string): Promise<EntitySetting[]> {
    const result = await query<EntitySetting>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 ORDER BY setting_key`,
      [entityId]
    );
    return result.rows;
  }

  // Get setting value
  async getValue(entityId: string, key: string, defaultValue?: string): Promise<string | null> {
    const setting = await this.findByEntityAndKey(entityId, key);
    return setting?.setting_value ?? defaultValue ?? null;
  }

  // Upsert setting
  async upsertSetting(
    entityId: string,
    key: string,
    value: string,
    type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' = 'STRING',
    updatedBy?: string
  ): Promise<EntitySetting> {
    const existing = await this.findByEntityAndKey(entityId, key);

    const data = {
      entity_id: entityId,
      setting_key: key,
      setting_value: value,
      setting_type: type,
      updated_by: updatedBy || null,
      updated_at: new Date(),
    };

    if (existing) {
      return (await this.update(existing.setting_id, data)) as EntitySetting;
    } else {
      return await this.insert(data as EntitySetting);
    }
  }

  // Get multiple settings as key-value map
  async getSettingsMap(entityId: string): Promise<Record<string, string>> {
    const settings = await this.findByEntityId(entityId);
    const map: Record<string, string> = {};
    for (const setting of settings) {
      map[setting.setting_key] = setting.setting_value || '';
    }
    return map;
  }
}

// ============================================================================
// ENTITY USERS REPOSITORY
// ============================================================================

export class EntityUsersRepository extends BaseRepository<EntityUser> {
  constructor() {
    super('entity_users', 'entity_user_id');
  }

  // Find by entity and user
  async findByEntityAndUser(entityId: string, userId: string): Promise<EntityUser | null> {
    const result = await query<EntityUser>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 AND user_id = $2`,
      [entityId, userId]
    );
    return result.rows[0] || null;
  }

  // Find with details
  async findByIdWithDetails(entityUserId: string): Promise<EntityUserWithDetails | null> {
    const entityUser = await this.findById(entityUserId);
    if (!entityUser) return null;

    const [entity, user] = await Promise.all([
      query<Entity>('SELECT * FROM entities WHERE entity_id = $1', [entityUser.entity_id]),
      query<any>(`SELECT user_id, email, first_name, last_name FROM users WHERE user_id = $1`, [
        entityUser.user_id,
      ]),
    ]);

    return {
      ...entityUser,
      entity: entity.rows[0],
      user: user.rows[0],
    };
  }

  // Find all entities for a user
  async findByUserId(userId: string): Promise<EntityUser[]> {
    const result = await query<EntityUser>(
      `SELECT * FROM ${this.tableName} WHERE user_id = $1 AND is_active = true ORDER BY is_default_entity DESC, entity_id`,
      [userId]
    );
    return result.rows;
  }

  // Find all users for an entity
  async findByEntityId(entityId: string): Promise<EntityUser[]> {
    const result = await query<EntityUser>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 AND is_active = true ORDER BY entity_user_role, user_id`,
      [entityId]
    );
    return result.rows;
  }

  // Get user's default entity
  async getUserDefaultEntity(userId: string): Promise<Entity | null> {
    const result = await query<any>(
      `SELECT e.* FROM ${this.tableName} eu
       INNER JOIN entities e ON e.entity_id = eu.entity_id
       WHERE eu.user_id = $1 AND eu.is_default_entity = true AND eu.is_active = true
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  // Set default entity for user
  async setDefaultEntity(userId: string, entityId: string): Promise<boolean> {
    return await transaction(async client => {
      try {
        // Unset previous default
        await client.query(
          `UPDATE ${this.tableName} SET is_default_entity = false WHERE user_id = $1`,
          [userId]
        );

        // Set new default
        const result = await client.query(
          `UPDATE ${this.tableName} SET is_default_entity = true WHERE entity_id = $2 AND user_id = $1`,
          [userId, entityId]
        );

        return (result.rowCount || 0) > 0;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  // Check if user has permission on entity
  async hasPermission(userId: string, entityId: string, permission: string): Promise<boolean> {
    const result = await query<{ has_permission: boolean }>(
      `SELECT
        CASE
          WHEN eu.is_active = false THEN false
          WHEN eu.entity_user_role = 'ENTITY_ADMIN' THEN true
          WHEN eu.permissions::jsonb ? $2 THEN (eu.permissions->>$2)::boolean
          ELSE false
        END as has_permission
       FROM ${this.tableName} eu
       WHERE eu.user_id = $1 AND eu.entity_id = $3`,
      [userId, permission, entityId]
    );
    return result.rows[0]?.has_permission || false;
  }
}

// ============================================================================
// CONSOLIDATION RULE REPOSITORY
// ============================================================================

export class ConsolidationRuleRepository extends BaseRepository<ConsolidationRule> {
  constructor() {
    super('consolidation_rules', 'rule_id');
  }

  // Find by parent and subsidiary
  async findByParentAndSubsidiary(
    parentId: string,
    subsidiaryId: string
  ): Promise<ConsolidationRule | null> {
    const result = await query<ConsolidationRule>(
      `SELECT * FROM ${this.tableName} WHERE parent_entity_id = $1 AND subsidiary_entity_id = $2`,
      [parentId, subsidiaryId]
    );
    return result.rows[0] || null;
  }

  // Find with details
  async findByIdWithDetails(ruleId: string): Promise<ConsolidationRuleWithDetails | null> {
    const rule = await this.findById(ruleId);
    if (!rule) return null;

    const [parentEntity, subsidiaryEntity] = await Promise.all([
      query<Entity>('SELECT * FROM entities WHERE entity_id = $1', [rule.parent_entity_id]),
      query<Entity>('SELECT * FROM entities WHERE entity_id = $1', [rule.subsidiary_entity_id]),
    ]);

    return {
      ...rule,
      parent_entity: parentEntity.rows[0],
      subsidiary_entity: subsidiaryEntity.rows[0],
    };
  }

  // Find by parent entity
  async findByParentId(parentId: string): Promise<ConsolidationRule[]> {
    const result = await query<ConsolidationRule>(
      `SELECT * FROM ${this.tableName} WHERE parent_entity_id = $1 AND is_active = true ORDER BY ownership_percentage DESC`,
      [parentId]
    );
    return result.rows;
  }

  // Find by subsidiary entity
  async findBySubsidiaryId(subsidiaryId: string): Promise<ConsolidationRule[]> {
    const result = await query<ConsolidationRule>(
      `SELECT * FROM ${this.tableName} WHERE subsidiary_entity_id = $1 AND is_active = true`,
      [subsidiaryId]
    );
    return result.rows;
  }

  // Find active rules (excluding expired)
  async findActive(parentId?: string): Promise<ConsolidationRule[]> {
    const sql = parentId
      ? `SELECT * FROM ${this.tableName} WHERE parent_entity_id = $1 AND is_active = true AND (expiry_date IS NULL OR expiry_date > NOW())`
      : `SELECT * FROM ${this.tableName} WHERE is_active = true AND (expiry_date IS NULL OR expiry_date > NOW())`;
    const result = await query<ConsolidationRule>(sql, parentId ? [parentId] : []);
    return result.rows;
  }
}

// ============================================================================
// ENTITY EXCHANGE RATE REPOSITORY
// ============================================================================

export class EntityExchangeRateRepository extends BaseRepository<EntityExchangeRate> {
  constructor() {
    super('entity_exchange_rates', 'rate_id');
  }

  // Find by entity, currencies, and date
  async findByEntityAndCurrenciesAndDate(
    entityId: string,
    fromCurrency: string,
    toCurrency: string,
    rateDate: Date
  ): Promise<EntityExchangeRate | null> {
    const result = await query<EntityExchangeRate>(
      `SELECT * FROM ${this.tableName}
       WHERE entity_id = $1 AND from_currency = $2 AND to_currency = $3 AND rate_date = $4 AND is_active = true`,
      [entityId, fromCurrency, toCurrency, rateDate]
    );
    return result.rows[0] || null;
  }

  // Find latest rate for currencies
  async findLatestRate(
    entityId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<EntityExchangeRate | null> {
    const result = await query<EntityExchangeRate>(
      `SELECT * FROM ${this.tableName}
       WHERE entity_id = $1 AND from_currency = $2 AND to_currency = $3 AND is_active = true
       ORDER BY rate_date DESC
       LIMIT 1`,
      [entityId, fromCurrency, toCurrency]
    );
    return result.rows[0] || null;
  }

  // Find all rates for an entity
  async findByEntityId(entityId: string): Promise<EntityExchangeRate[]> {
    const result = await query<EntityExchangeRate>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 AND is_active = true ORDER BY rate_date DESC, from_currency, to_currency`,
      [entityId]
    );
    return result.rows;
  }

  // Upsert rate
  async upsertRate(
    entityId: string,
    fromCurrency: string,
    toCurrency: string,
    rateDate: Date,
    exchangeRate: number,
    createdBy: string,
    isOverride = false
  ): Promise<EntityExchangeRate> {
    const existing = await this.findByEntityAndCurrenciesAndDate(
      entityId,
      fromCurrency,
      toCurrency,
      rateDate
    );

    if (existing) {
      return (await this.update(existing.rate_id, {
        exchange_rate: exchangeRate,
        is_override: isOverride,
      })) as EntityExchangeRate;
    } else {
      return await this.insert({
        entity_id: entityId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate_date: rateDate,
        exchange_rate: exchangeRate,
        is_override: isOverride,
        is_active: true,
        created_by: createdBy,
        created_at: new Date(),
      } as EntityExchangeRate);
    }
  }
}

// ============================================================================
// ENTITY AUDIT LOG REPOSITORY
// ============================================================================

export class EntityAuditLogRepository extends BaseRepository<EntityAuditLog> {
  constructor() {
    super('entity_audit_log', 'audit_id');
  }

  // Find by entity
  async findByEntityId(entityId: string, limit = 100): Promise<EntityAuditLog[]> {
    const result = await query<EntityAuditLog>(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [entityId, limit]
    );
    return result.rows;
  }

  // Find by action type
  async findByAction(action: string, limit = 100): Promise<EntityAuditLog[]> {
    const result = await query<EntityAuditLog>(
      `SELECT * FROM ${this.tableName} WHERE action = $1 ORDER BY created_at DESC LIMIT $2`,
      [action, limit]
    );
    return result.rows;
  }

  // Find by user
  async findByUserId(userId: string, limit = 100): Promise<EntityAuditLog[]> {
    const result = await query<EntityAuditLog>(
      `SELECT * FROM ${this.tableName} WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  // Log audit entry
  async log(
    entityId: string | null,
    action: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    userId: string | null,
    ipAddress?: string,
    userAgent?: string,
    relatedEntityId?: string | null
  ): Promise<EntityAuditLog> {
    return await this.insert({
      entity_id: entityId,
      action,
      old_values: oldValues,
      new_values: newValues,
      related_entity_id: relatedEntityId,
      user_id: userId,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      created_at: new Date(),
    } as EntityAuditLog);
  }
}

// ============================================================================
// REPOSITORY EXPORT
// ============================================================================

export const multiEntityRepository = {
  entities: new EntityRepository(),
  intercompanyTransactions: new IntercompanyTransactionRepository(),
  relationships: new EntityRelationshipRepository(),
  settings: new EntitySettingsRepository(),
  users: new EntityUsersRepository(),
  consolidation: new ConsolidationRuleRepository(),
  exchangeRates: new EntityExchangeRateRepository(),
  auditLog: new EntityAuditLogRepository(),
};
