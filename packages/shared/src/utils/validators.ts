/**
 * Validation utilities for WMS
 *
 * These validators are shared between frontend and backend
 */

import { ValidationError } from '../types';

// ============================================================================
// SKU VALIDATION
// ============================================================================

const SKU_PATTERN = /^[A-Z0-9-]{2,50}$/;

export function validateSKU(sku: string): void {
  if (!sku || typeof sku !== 'string') {
    throw new ValidationError('SKU is required');
  }

  const trimmed = sku.trim().toUpperCase();

  if (!SKU_PATTERN.test(trimmed)) {
    throw new ValidationError(
      'Invalid SKU format. Must be 2-50 alphanumeric characters (A-Z, 0-9, hyphens)'
    );
  }
}

// ============================================================================
// BIN LOCATION VALIDATION
// ============================================================================

/**
 * Bin location format: ZONE-AISLE-SHELF
 * Example: A-12-03
 */
const BIN_LOCATION_PATTERN = /^[A-Z]-[0-9]{1,3}-[0-9]{2}$/;

export function validateBinLocation(binLocation: string): void {
  if (!binLocation || typeof binLocation !== 'string') {
    throw new ValidationError('Bin location is required');
  }

  const trimmed = binLocation.trim().toUpperCase();

  if (!BIN_LOCATION_PATTERN.test(trimmed)) {
    throw new ValidationError(
      'Invalid bin location format. Expected format: ZONE-AISLE-SHELF (e.g., A-12-03)'
    );
  }
}

// ============================================================================
// ORDER VALIDATION
// ============================================================================

function validateSingleOrderItem(
  item: { sku: string; quantity: number },
  seenSKUs: Set<string>
): void {
  if (!item.sku || typeof item.sku !== 'string') {
    throw new ValidationError('Each item must have a valid SKU');
  }

  validateSKU(item.sku);

  if (seenSKUs.has(item.sku)) {
    throw new ValidationError(`Duplicate SKU in order: ${item.sku}`);
  }

  seenSKUs.add(item.sku);
  validateItemQuantity(item);
}

function validateItemQuantity(item: { sku: string; quantity: number }): void {
  if (typeof item.quantity !== 'number' || item.quantity <= 0) {
    throw new ValidationError(`Invalid quantity for SKU ${item.sku}. Must be a positive number`);
  }

  if (!Number.isInteger(item.quantity)) {
    throw new ValidationError(`Invalid quantity for SKU ${item.sku}. Must be a whole number`);
  }

  if (item.quantity > 1000) {
    throw new ValidationError(`Invalid quantity for SKU ${item.sku}. Maximum quantity is 1000`);
  }
}

export function validateOrderItems(items: Array<{ sku: string; quantity: number }>): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Order must have at least one item');
  }

  const seenSKUs = new Set<string>();

  for (const item of items) {
    validateSingleOrderItem(item, seenSKUs);
  }
}

// ============================================================================
// PICK VALIDATION
// ============================================================================

export function validatePickQuantity(
  quantity: number,
  orderQuantity: number,
  alreadyPicked: number
): void {
  if (typeof quantity !== 'number' || quantity <= 0) {
    throw new ValidationError('Pick quantity must be a positive number');
  }

  if (!Number.isInteger(quantity)) {
    throw new ValidationError('Pick quantity must be a whole number');
  }

  const remaining = orderQuantity - alreadyPicked;

  if (quantity > remaining) {
    throw new ValidationError(
      `Cannot pick more than remaining quantity. Remaining: ${remaining}, attempted: ${quantity}`
    );
  }
}

export function validatePickSKU(scannedSKU: string, expectedSKU: string): void {
  const normalizedScanned = scannedSKU.trim().toUpperCase();
  const normalizedExpected = expectedSKU.trim().toUpperCase();

  if (normalizedScanned !== normalizedExpected) {
    throw new ValidationError(
      `Wrong SKU scanned. Expected: ${expectedSKU}, scanned: ${scannedSKU}`
    );
  }
}

// ============================================================================
// USER VALIDATION
// ============================================================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required');
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

export function validateUserName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Name is required');
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    throw new ValidationError('Name must be at least 2 characters');
  }

  if (trimmed.length > 100) {
    throw new ValidationError('Name must be less than 100 characters');
  }
}

// ============================================================================
// QUANTITY VALIDATION
// ============================================================================

export function validateQuantity(quantity: number, fieldName = 'Quantity'): void {
  if (typeof quantity !== 'number') {
    throw new ValidationError(`${fieldName} must be a number`);
  }

  if (!Number.isInteger(quantity)) {
    throw new ValidationError(`${fieldName} must be a whole number`);
  }

  if (quantity < 0) {
    throw new ValidationError(`${fieldName} cannot be negative`);
  }

  if (quantity > 1000000) {
    throw new ValidationError(`${fieldName} is too large`);
  }
}

// ============================================================================
// ID VALIDATION
// ============================================================================

export function validateId(id: string, fieldName = 'ID'): void {
  if (!id || typeof id !== 'string') {
    throw new ValidationError(`${fieldName} is required`);
  }

  const trimmed = id.trim();

  if (trimmed.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  if (trimmed.length > 100) {
    throw new ValidationError(`${fieldName} is too long`);
  }
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateBatch(
  items: Array<{ sku: string; quantity: number; binLocation?: string }>
): ValidationResult {
  const errors: string[] = [];

  for (const [index, item] of items.entries()) {
    try {
      validateSKU(item.sku);
      validateQuantity(item.quantity);

      if ('binLocation' in item && item.binLocation !== undefined) {
        validateBinLocation(item.binLocation);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(`Item ${index + 1}: ${error.message}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
