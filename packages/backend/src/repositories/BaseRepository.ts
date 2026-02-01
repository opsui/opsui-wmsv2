/**
 * Base repository
 *
 * Provides common CRUD operations for all repositories
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../db/client';
import { NotFoundError } from '@opsui/shared';

// ============================================================================
// COLUMN NAME MAPPING
// ============================================================================

/**
 * Convert snake_case to camelCase
 */
// @ts-expect-error
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// ============================================================================
// GENERIC QUERY RESULT
// ============================================================================

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export type QueryOptions = {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
};

// ============================================================================
// BASE REPOSITORY
// ============================================================================

export abstract class BaseRepository<T extends Record<string, any>> {
  protected tableName: string;
  protected primaryKey: string;

  constructor(tableName: string, primaryKey: string) {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  // --------------------------------------------------------------------------
  // FIND BY ID
  // --------------------------------------------------------------------------

  async findById(id: string): Promise<T | null> {
    const result = await query<T>(`SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`, [
      id,
    ]);

    return result.rows[0] || null;
  }

  async findByIdOrThrow(id: string): Promise<T> {
    const entity = await this.findById(id);

    if (!entity) {
      throw new NotFoundError(this.tableName, id);
    }

    return entity;
  }

  // --------------------------------------------------------------------------
  // FIND MANY
  // --------------------------------------------------------------------------

  async findAll(options: QueryOptions = {}): Promise<T[]> {
    const { limit = 100, offset = 0, orderBy = this.primaryKey, orderDirection = 'ASC' } = options;

    const result = await query<T>(
      `SELECT * FROM ${this.tableName}
       ORDER BY ${orderBy} ${orderDirection}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  async findManyByColumn<K extends keyof T>(
    column: K,
    value: T[K],
    options: QueryOptions = {}
  ): Promise<T[]> {
    const { limit = 100, offset = 0, orderBy = this.primaryKey, orderDirection = 'ASC' } = options;

    const result = await query<T>(
      `SELECT * FROM ${this.tableName}
       WHERE ${column as string} = $1
       ORDER BY ${orderBy} ${orderDirection}
       LIMIT $2 OFFSET $3`,
      [value, limit, offset]
    );

    return result.rows;
  }

  async findOneByColumn<K extends keyof T>(column: K, value: T[K]): Promise<T | null> {
    const result = await query<T>(
      `SELECT * FROM ${this.tableName} WHERE ${column as string} = $1 LIMIT 1`,
      [value]
    );

    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // COUNT
  // --------------------------------------------------------------------------

  async count(whereClause?: string, params?: any[]): Promise<number> {
    const sql = whereClause
      ? `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`
      : `SELECT COUNT(*) FROM ${this.tableName}`;

    const result = await query<{ count: string }>(sql, params);

    return parseInt(result.rows[0].count, 10);
  }

  async exists(whereClause: string, params: any[]): Promise<boolean> {
    const count = await this.count(whereClause, params);
    return count > 0;
  }

  // --------------------------------------------------------------------------
  // INSERT
  // --------------------------------------------------------------------------

  async insert(data: Partial<T>, client?: PoolClient): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const snakeColumns = columns.map(toSnakeCase);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${this.tableName} (${snakeColumns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = client ? await client.query<T>(sql, values) : await query<T>(sql, values);

    return result.rows[0];
  }

  async insertMany(data: Partial<T>[], client?: PoolClient): Promise<T[]> {
    if (data.length === 0) return [];

    const columns = Object.keys(data[0]);
    const snakeColumns = columns.map(toSnakeCase);
    const placeholders = data
      .map((_, i) => {
        const rowPlaceholders = columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ');
        return `(${rowPlaceholders})`;
      })
      .join(', ');

    const values = data.flatMap(Object.values);

    const sql = `
      INSERT INTO ${this.tableName} (${snakeColumns.join(', ')})
      VALUES ${placeholders}
      RETURNING *
    `;

    const result = client ? await client.query<T>(sql, values) : await query<T>(sql, values);

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // UPDATE
  // --------------------------------------------------------------------------

  async update(id: string, data: Partial<T>, client?: PoolClient): Promise<T | null> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${toSnakeCase(col)} = $${i + 2}`).join(', ');

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE ${this.primaryKey} = $1
      RETURNING *
    `;

    const result = client
      ? await client.query<T>(sql, [id, ...values])
      : await query<T>(sql, [id, ...values]);

    return result.rows[0] || null;
  }

  async updateOrThrow(id: string, data: Partial<T>, client?: PoolClient): Promise<T> {
    const entity = await this.update(id, data, client);

    if (!entity) {
      throw new NotFoundError(this.tableName, id);
    }

    return entity;
  }

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const result = client
      ? await client.query(`DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`, [id])
      : await query(`DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`, [id]);

    return (result.rowCount || 0) > 0;
  }

  async deleteMany(ids: string[], client?: PoolClient): Promise<number> {
    if (ids.length === 0) return 0;

    const result = client
      ? await client.query(`DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ANY($1)`, [
          ids,
        ])
      : await query(`DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ANY($1)`, [ids]);

    return result.rowCount || 0;
  }

  // --------------------------------------------------------------------------
  // RAW QUERY
  // --------------------------------------------------------------------------

  async rawQuery(sql: string, params: any[] = []): Promise<T[]> {
    const result = await query<T>(sql, params);
    return result.rows;
  }

  async rawQueryOne(sql: string, params: any[] = []): Promise<T | null> {
    const result = await query<T>(sql, params);
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // TRANSACTION HELPERS
  // --------------------------------------------------------------------------

  async withTransaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
    return transaction(callback);
  }
}
