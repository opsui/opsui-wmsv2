/**
 * Service index
 *
 * Exports all services for easy importing
 */

export * from './OrderService';
export * from './InventoryService';
export * from './MetricsService';
export * from './AuthService';
export * from './ModuleSubscriptionService';

// Re-export singleton instances
export { orderService } from './OrderService';
export { inventoryService } from './InventoryService';
export { metricsService } from './MetricsService';
export { authService } from './AuthService';
