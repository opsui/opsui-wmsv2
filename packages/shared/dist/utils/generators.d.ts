/**
 * ID generation utilities for WMS
 *
 * Generates unique, human-readable identifiers
 */
/**
 * Generate a unique order ID
 * Format: SO{number}
 * Example: SO6334
 * Uses random number generation for variety while keeping it short
 */
export declare function generateOrderId(): string;
/**
 * Generate a unique order item ID
 * Format: OI-XXXXXXXX
 */
export declare function generateOrderItemId(): string;
/**
 * Generate a unique pick task ID
 * Format: PT-XXXXXXXX
 */
export declare function generatePickTaskId(): string;
/**
 * Generate a unique user ID
 * Format: USR-XXXXXXXX
 */
export declare function generateUserId(): string;
/**
 * Generate a unique inventory unit ID
 * Format: IU-XXXXXXXX
 */
export declare function generateInventoryUnitId(): string;
/**
 * Generate a unique transaction ID
 * Format: TXN-YYYYMMDD-XXXX-XXXXXXXX
 */
export declare function generateTransactionId(date?: Date): string;
/**
 * Generate a unique state change ID
 * Format: OSC-YYYYMMDD-XXXXXXXXXXX-XXXX (milliseconds + random suffix)
 * Updated to prevent duplicates when multiple state changes happen quickly
 */
export declare function generateStateChangeId(date?: Date): string;
/**
 * Generate a bin location ID from zone, aisle, and shelf
 * Format: Z-A-S (already standardized)
 */
export declare function generateBinId(zone: string, aisle: string, shelf: string): string;
/**
 * Parse a bin location ID into components
 */
export declare function parseBinLocation(binId: string): {
    zone: string;
    aisle: string;
    shelf: string;
} | undefined;
/**
 * Check if a bin location is adjacent to another (for route optimization)
 */
export declare function areBinsAdjacent(bin1: string, bin2: string): boolean;
/**
 * Sort bin locations for efficient picking route
 */
export declare function sortBinsForPicking(bins: string[]): string[];
//# sourceMappingURL=generators.d.ts.map