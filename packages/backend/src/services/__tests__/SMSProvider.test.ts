/**
 * Unit tests for SMSProvider service
 * @covers src/services/SMSProvider.ts
 */

import { SMSProvider, SMSProviderConfig, getSMSProvider } from '../SMSProvider';
import { SMSParams } from '@opsui/shared';

// Mock all dependencies
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Twilio module
const mockMessagesCreate = jest.fn();
const mockLookupsV1PhoneNumbersFetch = jest.fn();
const mockAPIAccountsFetch = jest.fn();

const mockTwilio = jest.fn(() => ({
  messages: {
    create: mockMessagesCreate,
  },
  lookups: {
    v1: {
      phoneNumbers: (phone: string) => ({
        fetch: mockLookupsV1PhoneNumbersFetch,
      }),
    },
  },
  api: {
    accounts: (sid: string) => ({
      fetch: mockAPIAccountsFetch,
    }),
  },
}));

jest.mock('twilio', () => mockTwilio);

describe('SMSProvider', () => {
  let smsProvider: SMSProvider;
  let config: SMSProviderConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset all mocks
    mockMessagesCreate.mockReset();
    mockLookupsV1PhoneNumbersFetch.mockReset();
    mockAPIAccountsFetch.mockReset();

    config = {
      accountSid: 'test-account-sid',
      authToken: 'test-auth-token',
      from: '+1234567890',
      rateLimitPerSecond: 5,
    };

    smsProvider = new SMSProvider(config);
  });

  // ==========================================================================
  // CONSTRUCTOR & INITIALIZATION
  // ==========================================================================

  describe('Constructor', () => {
    it('should initialize Twilio client with config', () => {
      expect(mockTwilio).toHaveBeenCalledWith('test-account-sid', 'test-auth-token');
    });

    it('should initialize with default rate limit', () => {
      const minimalConfig: SMSProviderConfig = {
        accountSid: 'test-sid',
        authToken: 'test-token',
      };

      const provider = new SMSProvider(minimalConfig);
      expect(provider).toBeInstanceOf(SMSProvider);
    });
  });

  // ==========================================================================
  // SEND SMS
  // ==========================================================================

  describe('sendSMS', () => {
    const validSMSParams: SMSParams = {
      to: '+6421234567',
      message: 'Test message',
    };

    it('should send SMS successfully', async () => {
      mockMessagesCreate.mockResolvedValue({
        sid: 'msg-sid-123',
        price: '-0.054',
      });

      const result = await smsProvider.sendSMS(validSMSParams);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-sid-123');
      expect(result.cost).toBe(0.054);
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        body: 'Test message',
        from: '+1234567890',
        to: '+6421234567',
      });
    });

    it('should use custom from number when provided', async () => {
      mockMessagesCreate.mockResolvedValue({
        sid: 'msg-sid-456',
      });

      const params: SMSParams = {
        ...validSMSParams,
        from: '+9876543210',
      };

      await smsProvider.sendSMS(params);

      expect(mockMessagesCreate).toHaveBeenCalledWith({
        body: 'Test message',
        from: '+9876543210',
        to: '+6421234567',
      });
    });

    it('should return error when missing required fields', async () => {
      const result = await smsProvider.sendSMS({ to: '', message: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required fields: to and message');
    });

    it('should return error for invalid phone number', async () => {
      const result = await smsProvider.sendSMS({
        to: 'invalid-phone',
        message: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });

    it('should return error when no from number configured', async () => {
      const providerWithoutFrom = new SMSProvider({
        accountSid: 'test-sid',
        authToken: 'test-token',
        // No from number
      });

      mockMessagesCreate.mockResolvedValue({ sid: 'msg-123' });

      const result = await providerWithoutFrom.sendSMS(validSMSParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No from number configured');
    });

    it('should handle SMS send failure', async () => {
      mockMessagesCreate.mockRejectedValue({
        message: 'Twilio error',
        code: '21614',
      });

      const result = await smsProvider.sendSMS(validSMSParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Twilio error');
      expect(result.errorCode).toBe('21614');
    });

    it('should normalize phone number', async () => {
      mockMessagesCreate.mockResolvedValue({
        sid: 'msg-123',
      });

      await smsProvider.sendSMS({
        to: '021234567',
        message: 'Test',
      });

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+6421234567',
        })
      );
    });
  });

  // ==========================================================================
  // BULK SEND
  // ==========================================================================

  describe('bulkSend', () => {
    it('should send multiple SMS messages', async () => {
      mockMessagesCreate.mockResolvedValue({ sid: 'msg-1' });

      const messages: SMSParams[] = [
        { to: '+6421111111', message: 'Message 1' },
        { to: '+6422222222', message: 'Message 2' },
        { to: '+6423333333', message: 'Message 3' },
      ];

      const results = await smsProvider.bulkSend(messages);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
    });

    it('should apply rate limiting between sends', async () => {
      mockMessagesCreate.mockResolvedValue({ sid: 'msg-1' });

      const messages: SMSParams[] = [
        { to: '+6421111111', message: 'Message 1' },
        { to: '+6422222222', message: 'Message 2' },
      ];

      const startTime = Date.now();
      await smsProvider.bulkSend(messages, 100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should handle partial failures', async () => {
      mockMessagesCreate
        .mockResolvedValueOnce({ sid: 'msg-1' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ sid: 'msg-2' });

      const messages: SMSParams[] = [
        { to: '+6421111111', message: 'Message 1' },
        { to: '+6422222222', message: 'Message 2' },
        { to: '+6423333333', message: 'Message 3' },
      ];

      const results = await smsProvider.bulkSend(messages);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should use default rate limit when not specified', async () => {
      mockMessagesCreate.mockResolvedValue({ sid: 'msg-1' });

      const messages: SMSParams[] = [
        { to: '+6421111111', message: 'Message 1' },
        { to: '+6422222222', message: 'Message 2' },
      ];

      await smsProvider.bulkSend(messages);

      expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', async () => {
      const results = await smsProvider.bulkSend([]);

      expect(results).toEqual([]);
    });
  });

  // ==========================================================================
  // PHONE NUMBER VALIDATION
  // ==========================================================================

  describe('isValidPhoneNumber', () => {
    it('should return true for valid phone numbers', () => {
      expect(smsProvider.isValidPhoneNumber('+6421234567')).toBe(true);
      expect(smsProvider.isValidPhoneNumber('+12345678901')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(smsProvider.isValidPhoneNumber('invalid')).toBe(false);
      expect(smsProvider.isValidPhoneNumber('+123')).toBe(false); // Too short
      expect(smsProvider.isValidPhoneNumber('+1234567890123456')).toBe(false); // Too long
      expect(smsProvider.isValidPhoneNumber('')).toBe(false);
    });

    it('should normalize and validate phone numbers', () => {
      expect(smsProvider.isValidPhoneNumber('021234567')).toBe(true); // Gets normalized
      expect(smsProvider.isValidPhoneNumber('6421234567')).toBe(true); // Gets normalized
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should normalize NZ local numbers', () => {
      expect(smsProvider.normalizePhoneNumber('021234567')).toBe('+6421234567');
      expect(smsProvider.normalizePhoneNumber('0221234567')).toBe('+64221234567');
    });

    it('should add + prefix if missing', () => {
      expect(smsProvider.normalizePhoneNumber('6421234567')).toBe('+6421234567');
      expect(smsProvider.normalizePhoneNumber('12345678901')).toBe('+12345678901');
    });

    it('should keep properly formatted numbers', () => {
      expect(smsProvider.normalizePhoneNumber('+6421234567')).toBe('+6421234567');
      expect(smsProvider.normalizePhoneNumber('+12345678901')).toBe('+12345678901');
    });

    it('should return null for invalid input', () => {
      expect(smsProvider.normalizePhoneNumber('')).toBeNull();
      expect(smsProvider.normalizePhoneNumber('abc')).toBeNull();
      expect(smsProvider.normalizePhoneNumber('+123')).toBeNull(); // Too short
      expect(smsProvider.normalizePhoneNumber('+1234567890123456')).toBeNull(); // Too long
    });
  });

  // ==========================================================================
  // LOOKUP PHONE NUMBER
  // ==========================================================================

  describe('lookupPhoneNumber', () => {
    it('should return phone number info for valid number', async () => {
      mockLookupsV1PhoneNumbersFetch.mockResolvedValue({
        phoneNumber: '+6421234567',
        carrier: {
          name: 'Spark NZ',
          type: 'mobile',
        },
      });

      const result = await smsProvider.lookupPhoneNumber('+6421234567');

      expect(result.valid).toBe(true);
      expect(result.phoneNumber).toBe('+6421234567');
      expect(result.carrier).toBe('Spark NZ');
      expect(result.type).toBe('mobile');
    });

    it('should return error for invalid phone number', async () => {
      const result = await smsProvider.lookupPhoneNumber('invalid');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
    });

    it('should return error when lookup fails', async () => {
      mockLookupsV1PhoneNumbersFetch.mockRejectedValue({
        message: 'Phone number not found',
      });

      const result = await smsProvider.lookupPhoneNumber('+6421234567');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Phone number not found');
    });
  });

  // ==========================================================================
  // STATS
  // ==========================================================================

  describe('getStats', () => {
    it('should return current stats', async () => {
      mockMessagesCreate.mockResolvedValue({
        sid: 'msg-1',
        price: '-0.054',
      });

      await smsProvider.sendSMS({ to: '+6421234567', message: 'Test' });

      const stats = smsProvider.getStats();

      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.totalCost).toBe(0.054);
    });

    it('should return copy of stats (not reference)', () => {
      const stats1 = smsProvider.getStats();
      const stats2 = smsProvider.getStats();

      expect(stats1).not.toBe(stats2);
      expect(stats1).toEqual(stats2);
    });
  });

  describe('resetStats', () => {
    it('should reset all stats to zero', async () => {
      mockMessagesCreate.mockResolvedValue({
        sid: 'msg-1',
        price: '-0.054',
      });

      await smsProvider.sendSMS({ to: '+6421234567', message: 'Test' });
      smsProvider.resetStats();

      const stats = smsProvider.getStats();

      expect(stats.sent).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.totalCost).toBe(0);
    });
  });

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  describe('healthCheck', () => {
    it('should return true when Twilio is accessible', async () => {
      mockAPIAccountsFetch.mockResolvedValue({ sid: 'test-account-sid' });

      const result = await smsProvider.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when Twilio is not accessible', async () => {
      mockAPIAccountsFetch.mockRejectedValue(new Error('Network error'));

      const result = await smsProvider.healthCheck();

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // MESSAGE LENGTH CALCULATION
  // ==========================================================================

  describe('calculateSegments', () => {
    it('should return 1 for short GSM messages', () => {
      expect(smsProvider.calculateSegments('Hello World')).toBe(1);
      expect(smsProvider.calculateSegments('A'.repeat(160))).toBe(1);
    });

    it('should calculate segments for long GSM messages', () => {
      // GSM encoding: 160 chars for single segment, 153 for multi-segment
      expect(smsProvider.calculateSegments('A'.repeat(154))).toBe(1); // <= 160
      expect(smsProvider.calculateSegments('A'.repeat(161))).toBe(2); // > 160, ceil(161/153) = 2
      expect(smsProvider.calculateSegments('A'.repeat(153))).toBe(1); // <= 160
      expect(smsProvider.calculateSegments('A'.repeat(306))).toBe(2); // ceil(306/153) = 2
      expect(smsProvider.calculateSegments('A'.repeat(307))).toBe(3); // ceil(307/153) = 3
    });

    it('should use UTF-16 segment calculation for non-GSM characters', () => {
      // UTF-16 encoding: 70 chars for single segment, 67 for multi-segment
      expect(smsProvider.calculateSegments('Hello 世界')).toBe(1); // <= 70
      expect(smsProvider.calculateSegments('世'.repeat(67))).toBe(1); // <= 70
      expect(smsProvider.calculateSegments('世'.repeat(71))).toBe(2); // > 70, ceil(71/67) = 2
      expect(smsProvider.calculateSegments('世'.repeat(134))).toBe(2); // ceil(134/67) = 2
      expect(smsProvider.calculateSegments('世'.repeat(135))).toBe(3); // ceil(135/67) = 3
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for NZ numbers', () => {
      const cost = smsProvider.estimateCost('Hello World', 'NZ');
      expect(cost).toBe(0.054);
    });

    it('should estimate cost for US numbers', () => {
      const cost = smsProvider.estimateCost('Hello World', 'US');
      expect(cost).toBe(0.0079);
    });

    it('should estimate cost for AU numbers', () => {
      const cost = smsProvider.estimateCost('Hello World', 'AU');
      expect(cost).toBe(0.045);
    });

    it('should estimate cost for multi-segment messages', () => {
      const cost = smsProvider.estimateCost('A'.repeat(200), 'NZ');
      expect(cost).toBe(0.054 * 2);
    });

    it('should use NZ rate for unknown countries', () => {
      const cost = smsProvider.estimateCost('Hello World', 'XX');
      expect(cost).toBe(0.054);
    });
  });

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe('getSMSProvider singleton', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should create singleton when env vars are set', () => {
      process.env.TWILIO_ACCOUNT_SID = 'test-sid';
      process.env.TWILIO_AUTH_TOKEN = 'test-token';
      process.env.TWILIO_PHONE_NUMBER = '+1234567890';

      // Need to re-import to get fresh singleton
      jest.resetModules();
      const SMSModule = require('../SMSProvider');

      const provider = SMSModule.getSMSProvider();

      expect(provider).toBeTruthy();
      expect(provider).toHaveProperty('sendSMS');
    });

    it('should return null when env vars are not set', () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;

      jest.resetModules();
      const SMSModule = require('../SMSProvider');

      const provider = SMSModule.getSMSProvider();

      expect(provider).toBeNull();
    });

    it('should return same instance on multiple calls', () => {
      process.env.TWILIO_ACCOUNT_SID = 'test-sid';
      process.env.TWILIO_AUTH_TOKEN = 'test-token';

      jest.resetModules();
      const SMSModule = require('../SMSProvider');

      const provider1 = SMSModule.getSMSProvider();
      const provider2 = SMSModule.getSMSProvider();

      expect(provider1).toBe(provider2);
    });
  });
});
