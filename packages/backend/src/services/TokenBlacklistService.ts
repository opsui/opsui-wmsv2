/**
 * Token Blacklist Service
 *
 * Manages a blacklist of revoked JWT tokens for secure logout.
 * Uses in-memory storage with automatic cleanup of expired entries.
 *
 * @performance
 * - O(1) lookup time
 * - Automatic cleanup every 5 minutes
 * - Memory efficient with TTL-based expiration
 *
 * @security
 * - Prevents reuse of tokens after logout
 * - Tokens are blacklisted until their natural expiration
 */

import { logger } from '../config/logger';

interface BlacklistEntry {
  expiresAt: number; // Unix timestamp in milliseconds
}

class TokenBlacklistService {
  private blacklist: Map<string, BlacklistEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the blacklist service and start cleanup interval
   */
  initialize(): void {
    if (this.cleanupInterval) {
      logger.warn('TokenBlacklistService already initialized');
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);

    logger.info('TokenBlacklistService initialized', {
      cleanupInterval: `${this.cleanupIntervalMs / 1000}s`,
    });
  }

  /**
   * Add a token to the blacklist
   * @param tokenId - Unique identifier for the token (e.g., "userId:iat")
   * @param expiresAt - Token expiration timestamp in milliseconds
   */
  blacklistToken(tokenId: string, expiresAt: number): void {
    this.blacklist.set(tokenId, { expiresAt });
    logger.debug('Token blacklisted', { tokenId, expiresAt: new Date(expiresAt).toISOString() });
  }

  /**
   * Check if a token is blacklisted
   * @param tokenId - Unique identifier for the token
   * @returns true if token is blacklisted and not expired
   */
  isBlacklisted(tokenId: string): boolean {
    const entry = this.blacklist.get(tokenId);

    if (!entry) {
      return false;
    }

    // If the token has naturally expired, remove it from blacklist
    if (Date.now() > entry.expiresAt) {
      this.blacklist.delete(tokenId);
      return false;
    }

    return true;
  }

  /**
   * Remove expired entries from the blacklist
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    // Use Array.from to avoid iterator issues
    const entries = Array.from(this.blacklist.entries());
    for (const [tokenId, entry] of entries) {
      if (now > entry.expiresAt) {
        this.blacklist.delete(tokenId);
        removed++;
      }
    }

    if (removed > 0 || this.blacklist.size > 0) {
      logger.debug('TokenBlacklistService cleanup', {
        removed,
        remaining: this.blacklist.size,
      });
    }
  }

  /**
   * Get the current size of the blacklist
   */
  get size(): number {
    return this.blacklist.size;
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.blacklist.clear();
    logger.info('TokenBlacklistService shutdown');
  }
}

// Singleton instance
export const tokenBlacklistService = new TokenBlacklistService();
