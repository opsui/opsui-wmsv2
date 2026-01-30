/**
 * @purpose: SMS provider service - Twilio integration for SMS notifications
 * @domain: Notifications
 * @tested: No tests yet (0% coverage)
 * @last-change: 2025-01-25 - Initial implementation
 * @dependencies: twilio, logger
 * @description: Sends SMS messages via Twilio with phone validation and rate limiting
 * @invariants: All SMS messages have valid recipient phone numbers and non-empty content
 * @performance: Rate limiting and cost tracking for bulk sends
 * @security: API keys stored in environment variables, phone numbers validated
 */

import { logger } from '../config/logger';
import { SMSParams } from '@opsui/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  cost?: number;
}

export interface SMSProviderConfig {
  accountSid: string;
  authToken: string;
  from?: string;
  rateLimitPerSecond?: number;
}

export interface SMSStats {
  sent: number;
  failed: number;
  totalCost: number;
}

// ============================================================================
// SMS PROVIDER CLASS
// ============================================================================

export class SMSProvider {
  private client: any;
  private config: SMSProviderConfig;
  private sendTimes: number[] = [];
  private stats: SMSStats = {
    sent: 0,
    failed: 0,
    totalCost: 0,
  };

  constructor(config: SMSProviderConfig) {
    this.config = config;
    this.initializeClient();
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  private initializeClient(): void {
    try {
      const twilio = require('twilio');
      this.client = twilio(this.config.accountSid, this.config.authToken);
      logger.info('Twilio SMS provider initialized');
    } catch (error) {
      logger.error('Failed to initialize Twilio provider', { error });
      throw new Error('Failed to initialize Twilio: package not installed or invalid credentials');
    }
  }

  // --------------------------------------------------------------------------
  // SEND SMS
  // --------------------------------------------------------------------------

  async sendSMS(params: SMSParams): Promise<SMSResult> {
    // Validate required fields
    if (!params.to || !params.message) {
      return {
        success: false,
        error: 'Missing required fields: to and message',
      };
    }

    // Validate and normalize phone number
    const to = this.normalizePhoneNumber(params.to);
    if (!to) {
      return {
        success: false,
        error: 'Invalid phone number format',
      };
    }

    // Rate limiting
    await this.enforceRateLimit();

    const from = params.from || this.config.from;

    if (!from) {
      return {
        success: false,
        error: 'No from number configured',
      };
    }

    try {
      const message = await this.client.messages.create({
        body: params.message,
        from: from,
        to: to,
      });

      // Update stats
      this.stats.sent++;
      if (message.price) {
        this.stats.totalCost += Math.abs(parseFloat(message.price));
      }

      logger.info('SMS sent successfully', {
        to: this.maskPhoneNumber(to),
        from: this.maskPhoneNumber(from),
        messageId: message.sid,
        cost: message.price,
      });

      return {
        success: true,
        messageId: message.sid,
        cost: message.price ? Math.abs(parseFloat(message.price)) : undefined,
      };
    } catch (error: any) {
      this.stats.failed++;

      logger.error('SMS send failed', {
        to: this.maskPhoneNumber(to),
        error: error.message,
        code: error.code,
      });

      return {
        success: false,
        error: error.message || 'SMS send failed',
        errorCode: error.code,
      };
    }
  }

  // --------------------------------------------------------------------------
  // BULK SEND
  // --------------------------------------------------------------------------

  async bulkSend(
    messages: SMSParams[],
    rateLimitMs?: number
  ): Promise<SMSResult[]> {
    const results: SMSResult[] = [];
    const actualRateLimit = rateLimitMs || this.calculateRateLimitMs();

    for (let i = 0; i < messages.length; i++) {
      const result = await this.sendSMS(messages[i]);
      results.push(result);

      // Rate limiting between sends
      if (i < messages.length - 1) {
        await this.sleep(actualRateLimit);
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // PHONE NUMBER VALIDATION
  // --------------------------------------------------------------------------

  isValidPhoneNumber(phone: string): boolean {
    const normalized = this.normalizePhoneNumber(phone);
    if (!normalized) return false;

    // Basic validation: should start with + and have 10-15 digits
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(normalized);
  }

  normalizePhoneNumber(phone: string): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If starts with 0, replace with country code (assumes NZ +64 by default)
    if (normalized.startsWith('0')) {
      normalized = '+64' + normalized.substring(1);
    }

    // If doesn't start with +, add + (assumes international format)
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    // Validate format
    if (!/^\+\d{10,15}$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  // --------------------------------------------------------------------------
  // RATE LIMITING
  // --------------------------------------------------------------------------

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const rateLimitPerSecond = this.config.rateLimitPerSecond || 5;

    // Remove timestamps older than 1 second
    this.sendTimes = this.sendTimes.filter(time => now - time < 1000);

    // If at rate limit, wait
    if (this.sendTimes.length >= rateLimitPerSecond) {
      const oldestTime = this.sendTimes[0];
      const waitTime = 1000 - (now - oldestTime);

      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
    }

    // Add current timestamp
    this.sendTimes.push(Date.now());
  }

  private calculateRateLimitMs(): number {
    const rateLimitPerSecond = this.config.rateLimitPerSecond || 5;
    return Math.ceil(1000 / rateLimitPerSecond);
  }

  // --------------------------------------------------------------------------
  // LOOKUP (VALIDATION WITH TWILIO)
  // --------------------------------------------------------------------------

  async lookupPhoneNumber(phone: string): Promise<{
    valid: boolean;
    phoneNumber?: string;
    carrier?: string;
    type?: string;
    error?: string;
  }> {
    try {
      const normalized = this.normalizePhoneNumber(phone);
      if (!normalized) {
        return { valid: false, error: 'Invalid phone number format' };
      }

      const phoneNumber = await this.client.lookups.v1
        .phoneNumbers(normalized)
        .fetch({ type: ['carrier'] });

      return {
        valid: true,
        phoneNumber: phoneNumber.phoneNumber,
        carrier: phoneNumber.carrier?.name,
        type: phoneNumber.carrier?.type,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Phone number lookup failed',
      };
    }
  }

  // --------------------------------------------------------------------------
  // STATS AND HEALTH CHECK
  // --------------------------------------------------------------------------

  getStats(): SMSStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      sent: 0,
      failed: 0,
      totalCost: 0,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try to fetch account info as a health check
      await this.client.api.accounts(this.config.accountSid).fetch();
      return true;
    } catch (error) {
      logger.error('SMS provider health check failed', { error });
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return '***';
    return phone.substring(0, 3) + '***' + phone.substring(phone.length - 2);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --------------------------------------------------------------------------
  // MESSAGE LENGTH CALCULATION
  // --------------------------------------------------------------------------

  calculateSegments(message: string): number {
    // GSM-7 encoding: 160 chars per segment (153 for concatenated)
    // UTF-16 encoding: 70 chars per segment (67 for concatenated)

    const isGSM = this.isGSMEncoding(message);
    const singleSegmentLength = isGSM ? 160 : 70;
    const multiSegmentLength = isGSM ? 153 : 67;

    if (message.length <= singleSegmentLength) {
      return 1;
    }

    return Math.ceil(message.length / multiSegmentLength);
  }

  private isGSMEncoding(message: string): boolean {
    // GSM 03.38 character set
    const gsmChars =
      '\u000A\u000C\u000D\u0020\u0021\u0022\u0023\u0024\u0025\u0026\u0027\u0028\u0029\u002A\u002B\u002C\u002D\u002E\u002F\u0030\u0031\u0032\u0033\u0034\u0035\u0036\u0037\u0038\u0039\u003A\u003B\u003C\u003D\u003E\u003F\u0040\u0041\u0042\u0043\u0044\u0045\u0046\u0047\u0048\u0049\u004A\u004B\u004C\u004D\u004E\u004F\u0050\u0051\u0052\u0053\u0054\u0055\u0056\u0057\u0058\u0059\u005A\u005B\u005C\u005D\u005E\u005F\u0060\u0061\u0062\u0063\u0064\u0065\u0066\u0067\u0068\u0069\u006A\u006B\u006C\u006D\u006E\u006F\u0070\u0071\u0072\u0073\u0074\u0075\u0076\u0077\u0078\u0079\u007A\u007B\u007C\u007D\u007E\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008\u000B\u000E\u000F\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001A\u001B\u001C\u001D\u001E\u001F\u00A1\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D7\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F7\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u00FF\u0040\u00A3\u0024\u00A5\u00E8\u00E9\u00F9\u00EC\u00F2\u00C7\u000C\u00D8\u00F8\u000D\u00C5\u00E5\u0394\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u039E\u03B4\u00A6\u00DF\u00A9\u00AE\u00A4\u00B0\u00A7\u00B4\u00B8\u00B1\u00BF\u00A2\u00B5\u00B6\u00A8\u00B9\u00AA\u00AB\u00AC\u00AD\u00F7\u00BB\u00BC\u00BD\u00BE\u00AF\u00B2\u00B3';

    for (let i = 0; i < message.length; i++) {
      if (!gsmChars.includes(message[i])) {
        return false;
      }
    }

    return true;
  }

  estimateCost(message: string, destinationCountry: string = 'NZ'): number {
    // Twilio pricing (as of 2024) - these are approximate
    const segments = this.calculateSegments(message);
    const rates: Record<string, number> = {
      NZ: 0.054, // New Zealand
      US: 0.0079, // United States
      AU: 0.045, // Australia
      GB: 0.04, // United Kingdom
      CA: 0.0075, // Canada
    };

    const rate = rates[destinationCountry] || rates.NZ;
    return rate * segments;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let smsProviderInstance: SMSProvider | null = null;

export function getSMSProvider(): SMSProvider | null {
  if (!smsProviderInstance && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    smsProviderInstance = new SMSProvider({
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      from: process.env.TWILIO_PHONE_NUMBER,
      rateLimitPerSecond: parseInt(process.env.TWILIO_RATE_LIMIT || '5', 10),
    });
    logger.info('Twilio SMS provider singleton created');
  }

  return smsProviderInstance;
}
