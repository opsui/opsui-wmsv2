/**
 * Mock for @opsui/shared package
 *
 * This mock provides default implementations for the shared utilities
 * to allow Jest tests to run without loading the actual ES module dist files.
 */

// Mock validators - simple implementations that pass by default
export const validateOrderItems = jest.fn(() => ({ valid: true, errors: [] }));
export const validateSKU = jest.fn(() => ({ valid: true, errors: [] }));
export const validateBinLocation = jest.fn(() => ({ valid: true, errors: [] }));
export const validateQuantity = jest.fn(() => ({ valid: true, errors: [] }));

// Mock generators
export const generateId = jest.fn(() => 'test-id-' + Math.random().toString(36).slice(2, 11));
export const generateSKU = jest.fn(
  () => 'TEST-SKU-' + Math.random().toString(36).slice(2, 8).toUpperCase()
);
export const generateOrderId = jest.fn(() => 'ORD-' + Date.now());

// Mock system constants
export const WAREHOUSE_ZONES = ['A', 'B', 'C', 'D'];
export const PICK_PRIORITIES = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];
export const ORDER_STATUSES = ['PENDING', 'PICKING', 'PICKED', 'PACKED', 'SHIPPED'];

// Mock workflow guardrails
export const checkWorkflowGuardrails = jest.fn(() => ({ allowed: true, violations: [] }));
export const recordWorkflowAction = jest.fn(() => ({ success: true }));

// Mock invariants
export const checkInventoryInvariant = jest.fn(() => ({ holds: true, violation: undefined }));
export const checkOrderInvariant = jest.fn(() => ({ holds: true, violation: undefined }));

// Re-export jest mock functions
export { jest };
