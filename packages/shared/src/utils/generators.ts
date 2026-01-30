/**
 * ID generation utilities for WMS
 *
 * Generates unique, human-readable identifiers
 */

// ============================================================================
// ID GENERATORS
// ============================================================================

/**
 * Generate a unique order ID
 * Format: SO{number}
 * Example: SO6334
 * Uses random number generation for variety while keeping it short
 */
export function generateOrderId(date: Date = new Date()): string {
  // Generate a random 4-digit number (1000-9999)
  const orderNum = Math.floor(Math.random() * 9000) + 1000;
  return `SO${orderNum}`;
}

/**
 * Generate a unique order item ID
 * Format: OI-XXXXXXXX
 */
export function generateOrderItemId(): string {
  return `OI-${generateRandomString(8)}`;
}

/**
 * Generate a unique pick task ID
 * Format: PT-XXXXXXXX
 */
export function generatePickTaskId(): string {
  return `PT-${generateRandomString(8)}`;
}

/**
 * Generate a unique user ID
 * Format: USR-XXXXXXXX
 */
export function generateUserId(): string {
  return `USR-${generateRandomString(8)}`;
}

/**
 * Generate a unique inventory unit ID
 * Format: IU-XXXXXXXX
 */
export function generateInventoryUnitId(): string {
  return `IU-${generateRandomString(8)}`;
}

/**
 * Generate a unique transaction ID
 * Format: TXN-YYYYMMDD-XXXX-XXXXXXXX
 */
export function generateTransactionId(date: Date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const time = Date.now().toString().slice(-8);
  return `TXN-${dateStr}-${time}`;
}

/**
 * Generate a unique state change ID
 * Format: OSC-YYYYMMDD-XXXXXXXXXXX-XXXX (milliseconds + random suffix)
 * Updated to prevent duplicates when multiple state changes happen quickly
 */
export function generateStateChangeId(date: Date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const millis = Math.floor(date.getTime()).toString().padStart(11, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `OSC-${dateStr}-${millis}-${random}`;
}

/**
 * Generate a bin location ID from zone, aisle, and shelf
 * Format: Z-A-S (already standardized)
 */
export function generateBinId(zone: string, aisle: string, shelf: string): string {
  const normalizedZone = zone.toUpperCase().trim();
  const normalizedAisle = aisle.padStart(2, '0');
  const normalizedShelf = shelf.padStart(2, '0');
  return `${normalizedZone}-${normalizedAisle}-${normalizedShelf}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Parse a bin location ID into components
 */
export function parseBinLocation(binId: string): {
  zone: string;
  aisle: string;
  shelf: string;
} | null {
  const match = binId.match(/^([A-Z])-([0-9]{1,3})-([0-9]{2})$/);
  if (!match) return null;

  return {
    zone: match[1],
    aisle: match[2],
    shelf: match[3],
  };
}

/**
 * Check if a bin location is adjacent to another (for route optimization)
 */
export function areBinsAdjacent(bin1: string, bin2: string): boolean {
  const parsed1 = parseBinLocation(bin1);
  const parsed2 = parseBinLocation(bin2);

  if (!parsed1 || !parsed2) return false;
  if (parsed1.zone !== parsed2.zone) return false;

  // Same aisle, adjacent shelf
  if (parsed1.aisle === parsed2.aisle) {
    const shelfDiff = Math.abs(parseInt(parsed1.shelf) - parseInt(parsed2.shelf));
    return shelfDiff <= 1;
  }

  // Adjacent aisles, same shelf
  const aisleDiff = Math.abs(parseInt(parsed1.aisle) - parseInt(parsed2.aisle));
  if (aisleDiff === 1 && parsed1.shelf === parsed2.shelf) {
    return true;
  }

  return false;
}

/**
 * Sort bin locations for efficient picking route
 */
export function sortBinsForPicking(bins: string[]): string[] {
  return [...bins].sort((a, b) => {
    const parsedA = parseBinLocation(a);
    const parsedB = parseBinLocation(b);

    if (!parsedA || !parsedB) return 0;

    // Sort by zone first
    if (parsedA.zone !== parsedB.zone) {
      return parsedA.zone.localeCompare(parsedB.zone);
    }

    // Then by aisle
    const aisleA = parseInt(parsedA.aisle);
    const aisleB = parseInt(parsedB.aisle);
    if (aisleA !== aisleB) {
      return aisleA - aisleB;
    }

    // Then by shelf
    const shelfA = parseInt(parsedA.shelf);
    const shelfB = parseInt(parsedB.shelf);
    return shelfA - shelfB;
  });
}
