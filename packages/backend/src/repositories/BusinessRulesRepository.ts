/**
 * Business Rules Repository
 *
 * Handles database operations for business rules, conditions, actions,
 * and execution logs.
 */

import { getPool } from '../db/client';

const pool = getPool();
import {
  BusinessRule,
  RuleCondition,
  RuleAction,
  RuleExecutionLog,
  RuleStatus,
  RuleType,
  RuleEventType,
} from '@opsui/shared';

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

export class BusinessRulesRepository {
  // =========================================================================
  // BUSINESS RULES
  // =========================================================================

  /**
   * Get all business rules with optional filtering
   */
  async findAll(filters?: {
    status?: RuleStatus;
    ruleType?: RuleType;
    includeInactive?: boolean;
  }): Promise<BusinessRule[]> {
    let query = `
      SELECT
        r.rule_id,
        r.name,
        r.description,
        r.rule_type,
        r.status,
        r.priority,
        r.start_date,
        r.end_date,
        r.created_by,
        r.created_at,
        r.updated_by,
        r.updated_at,
        r.version,
        r.last_executed_at,
        r.execution_count,
        COALESCE(json_agg(
          json_build_object(
            'event', rre.event_type
          ) ORDER BY rre.event_type
        ) FILTER (WHERE rre.event_type IS NOT NULL), '[]') as trigger_events
      FROM business_rules r
      LEFT JOIN rule_trigger_events rre ON r.rule_id = rre.rule_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND r.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.ruleType) {
      query += ` AND r.rule_type = $${paramIndex++}`;
      params.push(filters.ruleType);
    }

    if (!filters?.includeInactive) {
      query += ` AND r.status != 'ARCHIVED'`;
    }

    query += `
      GROUP BY r.rule_id
      ORDER BY r.priority DESC, r.created_at DESC
    `;

    const result = await pool.query(query, params);

    // For each rule, fetch its conditions and actions
    const rules: BusinessRule[] = [];
    for (const row of result.rows) {
      const conditions = await this.findConditionsByRuleId(row.rule_id);
      const actions = await this.findActionsByRuleId(row.rule_id);

      rules.push({
        ruleId: row.rule_id,
        name: row.name,
        description: row.description,
        ruleType: row.rule_type,
        status: row.status,
        priority: row.priority,
        triggerEvents: row.trigger_events.map((te: any) => te.event),
        conditions,
        actions,
        startDate: row.start_date,
        endDate: row.end_date,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at,
        version: row.version,
        lastExecutedAt: row.last_executed_at,
        executionCount: row.execution_count,
      });
    }

    return rules;
  }

  /**
   * Find a business rule by ID
   */
  async findById(ruleId: string): Promise<BusinessRule | null> {
    const query = `
      SELECT
        r.rule_id,
        r.name,
        r.description,
        r.rule_type,
        r.status,
        r.priority,
        r.start_date,
        r.end_date,
        r.created_by,
        r.created_at,
        r.updated_by,
        r.updated_at,
        r.version,
        r.last_executed_at,
        r.execution_count,
        COALESCE(json_agg(
          json_build_object(
            'event', rre.event_type
          ) ORDER BY rre.event_type
        ) FILTER (WHERE rre.event_type IS NOT NULL), '[]') as trigger_events
      FROM business_rules r
      LEFT JOIN rule_trigger_events rre ON r.rule_id = rre.rule_id
      WHERE r.rule_id = $1
      GROUP BY r.rule_id
    `;

    const result = await pool.query(query, [ruleId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const conditions = await this.findConditionsByRuleId(ruleId);
    const actions = await this.findActionsByRuleId(ruleId);

    return {
      ruleId: row.rule_id,
      name: row.name,
      description: row.description,
      ruleType: row.rule_type,
      status: row.status,
      priority: row.priority,
      triggerEvents: row.trigger_events.map((te: any) => te.event),
      conditions,
      actions,
      startDate: row.start_date,
      endDate: row.end_date,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      version: row.version,
      lastExecutedAt: row.last_executed_at,
      executionCount: row.execution_count,
    };
  }

  /**
   * Create a new business rule
   */
  async create(
    rule: Omit<BusinessRule, 'ruleId' | 'createdAt' | 'executionCount' | 'version'>
  ): Promise<BusinessRule> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate rule ID
      const ruleId = `RULE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      // Insert main rule record
      const ruleQuery = `
        INSERT INTO business_rules (
          rule_id, name, description, rule_type, status, priority,
          start_date, end_date, created_by, created_at, version, execution_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 0)
        RETURNING *
      `;

      await client.query(ruleQuery, [
        ruleId,
        rule.name,
        rule.description,
        rule.ruleType,
        rule.status,
        rule.priority,
        rule.startDate || null,
        rule.endDate || null,
        rule.createdBy,
        now,
      ]);

      // Insert trigger events
      for (const eventType of rule.triggerEvents) {
        await client.query(
          'INSERT INTO rule_trigger_events (rule_id, event_type) VALUES ($1, $2)',
          [ruleId, eventType]
        );
      }

      // Insert conditions
      for (const condition of rule.conditions) {
        const conditionId = `COND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.query(
          `
          INSERT INTO rule_conditions (
            condition_id, rule_id, field, operator, value, value2,
            logical_operator, "order"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [
            conditionId,
            ruleId,
            condition.field,
            condition.operator,
            JSON.stringify(condition.value),
            condition.value2 ? JSON.stringify(condition.value2) : null,
            condition.logicalOperator || null,
            condition.order,
          ]
        );
      }

      // Insert actions
      for (const action of rule.actions) {
        const actionId = `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.query(
          `
          INSERT INTO rule_actions (
            action_id, rule_id, action_type, parameters, "order"
          ) VALUES ($1, $2, $3, $4, $5)
        `,
          [actionId, ruleId, action.actionType, JSON.stringify(action.parameters), action.order]
        );
      }

      await client.query('COMMIT');

      return this.findById(ruleId) as Promise<BusinessRule>;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing business rule
   */
  async update(ruleId: string, updates: Partial<BusinessRule>): Promise<BusinessRule | null> {
    const existing = await this.findById(ruleId);
    if (!existing) return null;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update main rule record
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.priority !== undefined) {
        setClauses.push(`priority = $${paramIndex++}`);
        values.push(updates.priority);
      }
      if (updates.startDate !== undefined) {
        setClauses.push(`start_date = $${paramIndex++}`);
        values.push(updates.startDate);
      }
      if (updates.endDate !== undefined) {
        setClauses.push(`end_date = $${paramIndex++}`);
        values.push(updates.endDate);
      }
      if (updates.updatedBy !== undefined) {
        setClauses.push(`updated_by = $${paramIndex++}`);
        values.push(updates.updatedBy);
      }

      setClauses.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      setClauses.push(`version = version + 1`);

      values.push(ruleId);

      if (setClauses.length > 0) {
        const query = `
          UPDATE business_rules
          SET ${setClauses.join(', ')}
          WHERE rule_id = $${paramIndex}
        `;
        await client.query(query, values);
      }

      // Update trigger events if provided
      if (updates.triggerEvents) {
        await client.query('DELETE FROM rule_trigger_events WHERE rule_id = $1', [ruleId]);
        for (const eventType of updates.triggerEvents) {
          await client.query(
            'INSERT INTO rule_trigger_events (rule_id, event_type) VALUES ($1, $2)',
            [ruleId, eventType]
          );
        }
      }

      // Update conditions if provided
      if (updates.conditions) {
        await client.query('DELETE FROM rule_conditions WHERE rule_id = $1', [ruleId]);
        for (const condition of updates.conditions) {
          const conditionId = `COND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await client.query(
            `
            INSERT INTO rule_conditions (
              condition_id, rule_id, field, operator, value, value2,
              logical_operator, "order"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
            [
              conditionId,
              ruleId,
              condition.field,
              condition.operator,
              JSON.stringify(condition.value),
              condition.value2 ? JSON.stringify(condition.value2) : null,
              condition.logicalOperator || null,
              condition.order,
            ]
          );
        }
      }

      // Update actions if provided
      if (updates.actions) {
        await client.query('DELETE FROM rule_actions WHERE rule_id = $1', [ruleId]);
        for (const action of updates.actions) {
          const actionId = `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await client.query(
            `
            INSERT INTO rule_actions (
              action_id, rule_id, action_type, parameters, "order"
            ) VALUES ($1, $2, $3, $4, $5)
          `,
            [actionId, ruleId, action.actionType, JSON.stringify(action.parameters), action.order]
          );
        }
      }

      await client.query('COMMIT');

      return this.findById(ruleId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a business rule
   */
  async delete(ruleId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM business_rules WHERE rule_id = $1', [ruleId]);
    return (result.rowCount ?? 0) > 0;
  }

  // =========================================================================
  // CONDITIONS
  // =========================================================================

  /**
   * Find all conditions for a rule
   */
  private async findConditionsByRuleId(ruleId: string): Promise<RuleCondition[]> {
    const query = `
      SELECT
        condition_id,
        rule_id,
        field,
        operator,
        value,
        value2,
        logical_operator,
        "order"
      FROM rule_conditions
      WHERE rule_id = $1
      ORDER BY "order" ASC
    `;

    const result = await pool.query(query, [ruleId]);

    return result.rows.map(row => ({
      conditionId: row.condition_id,
      ruleId: row.rule_id,
      field: row.field,
      operator: row.operator,
      value: JSON.parse(row.value),
      value2: row.value2 ? JSON.parse(row.value2) : undefined,
      logicalOperator: row.logical_operator,
      order: row.order,
    }));
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================

  /**
   * Find all actions for a rule
   */
  private async findActionsByRuleId(ruleId: string): Promise<RuleAction[]> {
    const query = `
      SELECT
        action_id,
        rule_id,
        action_type,
        parameters,
        "order"
      FROM rule_actions
      WHERE rule_id = $1
      ORDER BY "order" ASC
    `;

    const result = await pool.query(query, [ruleId]);

    return result.rows.map(row => ({
      actionId: row.action_id,
      ruleId: row.rule_id,
      actionType: row.action_type,
      parameters: JSON.parse(row.parameters),
      order: row.order,
    }));
  }

  // =========================================================================
  // EXECUTION LOGS
  // =========================================================================

  /**
   * Log rule execution
   */
  async createExecutionLog(log: Omit<RuleExecutionLog, 'logId'>): Promise<RuleExecutionLog> {
    const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO rule_execution_logs (
        log_id, rule_id, event_type, entity_id, entity_type,
        triggered_at, triggered_by, conditions_met, execution_time_ms,
        error_message, execution_results
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await pool.query(query, [
      logId,
      log.ruleId,
      log.eventType,
      log.entityId,
      log.entityType,
      log.triggeredAt,
      log.triggeredBy,
      log.conditionsMet,
      log.executionTimeMs,
      log.errorMessage || null,
      JSON.stringify(log.executionResults),
    ]);

    // Update rule execution stats
    await pool.query(
      `
      UPDATE business_rules
      SET last_executed_at = $1,
          execution_count = execution_count + 1
      WHERE rule_id = $2
    `,
      [log.triggeredAt, log.ruleId]
    );

    return {
      logId: result.rows[0].log_id,
      ruleId: result.rows[0].rule_id,
      eventType: result.rows[0].event_type,
      entityId: result.rows[0].entity_id,
      entityType: result.rows[0].entity_type,
      triggeredAt: result.rows[0].triggered_at,
      triggeredBy: result.rows[0].triggered_by,
      conditionsMet: result.rows[0].conditions_met,
      executionResults: log.executionResults,
      executionTimeMs: result.rows[0].execution_time_ms,
      errorMessage: result.rows[0].error_message,
    };
  }

  /**
   * Get execution logs for a rule
   */
  async findExecutionLogs(ruleId: string, limit = 100): Promise<RuleExecutionLog[]> {
    const query = `
      SELECT
        log_id, rule_id, event_type, entity_id, entity_type,
        triggered_at, triggered_by, conditions_met, execution_time_ms,
        error_message, execution_results
      FROM rule_execution_logs
      WHERE rule_id = $1
      ORDER BY triggered_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [ruleId, limit]);

    return result.rows.map(row => ({
      logId: row.log_id,
      ruleId: row.rule_id,
      eventType: row.event_type,
      entityId: row.entity_id,
      entityType: row.entity_type,
      triggeredAt: row.triggered_at,
      triggeredBy: row.triggered_by,
      conditionsMet: row.conditions_met,
      executionResults: JSON.parse(row.execution_results),
      executionTimeMs: row.execution_time_ms,
      errorMessage: row.error_message,
    }));
  }

  /**
   * Find active rules for a specific event type
   */
  async findActiveRulesByEventType(eventType: RuleEventType): Promise<BusinessRule[]> {
    const query = `
      SELECT DISTINCT r.rule_id
      FROM business_rules r
      INNER JOIN rule_trigger_events rte ON r.rule_id = rte.rule_id
      WHERE r.status = 'ACTIVE'
        AND rte.event_type = $1
        AND (r.start_date IS NULL OR r.start_date <= NOW())
        AND (r.end_date IS NULL OR r.end_date >= NOW())
      ORDER BY r.priority DESC
    `;

    const result = await pool.query(query, [eventType]);

    const rules: BusinessRule[] = [];
    for (const row of result.rows) {
      const rule = await this.findById(row.rule_id);
      if (rule) {
        rules.push(rule);
      }
    }

    return rules;
  }
}

export const businessRulesRepository = new BusinessRulesRepository();
