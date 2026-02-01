/**
 * Pagination Utilities
 *
 * Provides helpers for paginated responses with metadata
 */

import { Response } from 'express';

// ============================================================================
// TYPES
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage?: number;
  previousPage?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// PAGINATION METADATA CALCULATION
// ============================================================================

/**
 * Calculate pagination metadata from total count and current params
 */
export function calculatePaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage ? page + 1 : undefined,
    previousPage: hasPreviousPage ? page - 1 : undefined,
  };
}

/**
 * Parse and validate pagination query parameters
 */
export function parsePaginationParams(
  query: any,
  defaultPage: number = 1,
  defaultLimit: number = 20,
  maxLimit: number = 100
): PaginationParams {
  const page = Math.max(defaultPage, parseInt(query.page || defaultPage.toString(), 10));
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(query.limit || defaultLimit.toString(), 10))
  );
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = (query.sortOrder || 'desc') as 'asc' | 'desc';

  return {
    page,
    limit,
    sortBy,
    sortOrder,
  };
}

/**
 * Calculate SQL offset and limit from pagination params
 */
export function calculateSqlOffset(pagination: PaginationParams): {
  offset: number;
  limit: number;
} {
  const offset = (pagination.page - 1) * pagination.limit;
  return {
    offset,
    limit: pagination.limit,
  };
}

/**
 * Send paginated response with metadata
 */
export function sendPaginatedResponse<T>(
  res: Response,
  data: T[],
  total: number,
  pagination: PaginationParams
): void {
  const paginationMeta = calculatePaginationMeta(total, pagination.page, pagination.limit);

  res.json({
    data,
    pagination: paginationMeta,
    success: true,
  } as PaginatedResponse<T>);
}

// ============================================================================
// DATABASE QUERY HELPERS
// ============================================================================

/**
 * Add ORDER BY clause to SQL query based on pagination params
 */
export function addOrderByClause(
  sql: string,
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): string {
  // Validate sortBy to prevent SQL injection
  const validSortColumns = [
    'createdAt',
    'updatedAt',
    'orderId',
    'sku',
    'status',
    'priority',
    'name',
    'quantity',
  ];

  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  return `${sql} ORDER BY ${safeSortBy} ${safeSortOrder}`;
}

/**
 * Add pagination (LIMIT/OFFSET) to SQL query
 */
export function addPaginationClause(sql: string, offset: number, _limit: number): string {
  return `${sql} LIMIT $${offset + 1} OFFSET $${offset + 2}`;
}
