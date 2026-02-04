/**
 * Unit tests for EmailProvider service
 * @covers src/services/EmailProvider.ts
 */

import { EmailProvider, EmailProviderConfig, getEmailProvider } from '../EmailProvider';
import { EmailParams } from '@opsui/shared';

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock external dependencies
const mockSendGrid = {
  setApiKey: jest.fn(),
  sendMultiple: jest.fn(),
};

const mockPostmarkClient = {
  sendEmail: jest.fn(),
};

const mockPostmark = {
  ServerClient: jest.fn(() => mockPostmarkClient),
};

const mockSESClient = {
  send: jest.fn(),
};

const mockSES = {
  SESClient: jest.fn(() => mockSESClient),
  SendEmailCommand: jest.fn((params: any) => ({ params })),
};

describe('EmailProvider Service', () => {
  let emailProvider: EmailProvider;
  let config: EmailProviderConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks
    mockSendGrid.sendMultiple.mockResolvedValue([
      { headers: { 'x-message-id': 'sg-message-123' } },
    ]);
    mockPostmarkClient.sendEmail.mockResolvedValue({
      MessageID: 'postmark-message-123',
    });
    mockSESClient.send.mockResolvedValue({
      MessageId: 'ses-message-123',
    });

    // Mock require for dynamic imports
    jest.doMock('@sendgrid/mail', () => mockSendGrid);
    jest.doMock('postmark', () => mockPostmark);
    jest.doMock('@aws-sdk/client-ses', () => mockSES);

    config = {
      sendgrid: {
        apiKey: 'sg-test-key',
        from: 'noreply@example.com',
      },
      postmark: {
        apiKey: 'pm-test-key',
        from: 'noreply@example.com',
      },
      ses: {
        region: 'us-east-1',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        from: 'noreply@example.com',
      },
    };

    // Create provider instance
    emailProvider = new EmailProvider(config);
  });

  // ==========================================================================
  // CONSTRUCTOR & INITIALIZATION
  // ==========================================================================

  describe('Constructor', () => {
    it('should initialize all configured providers', () => {
      const provider = new EmailProvider(config);
      const available = provider.getAvailableProviders();

      expect(available).toContain('sendgrid');
      expect(available).toContain('postmark');
      expect(available).toContain('ses');
    });

    it('should only initialize providers with valid config', () => {
      const partialConfig: EmailProviderConfig = {
        sendgrid: {
          apiKey: 'sg-test-key',
        },
      };

      const provider = new EmailProvider(partialConfig);
      const available = provider.getAvailableProviders();

      expect(available).toContain('sendgrid');
      expect(available).not.toContain('postmark');
      expect(available).not.toContain('ses');
    });

    it('should handle empty config gracefully', () => {
      const emptyConfig: EmailProviderConfig = {};
      const provider = new EmailProvider(emptyConfig);
      const available = provider.getAvailableProviders();

      expect(available).toEqual([]);
    });
  });

  // ==========================================================================
  // SEND EMAIL
  // ==========================================================================

  describe('sendEmail', () => {
    const validEmailParams: EmailParams = {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>This is a test email</p>',
      text: 'This is a test email',
    };

    it('should send email successfully via SendGrid', async () => {
      const result = await emailProvider.sendEmail(validEmailParams);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('sendgrid');
      expect(result.messageId).toBe('sg-message-123');
      expect(mockSendGrid.sendMultiple).toHaveBeenCalled();
    });

    it('should send email with HTML content', async () => {
      const params: EmailParams = {
        ...validEmailParams,
        html: '<h1>Test HTML</h1>',
      };

      const result = await emailProvider.sendEmail(params);

      expect(result.success).toBe(true);
    });

    it('should handle multiple recipients', async () => {
      const params: EmailParams = {
        ...validEmailParams,
        to: ['test1@example.com', 'test2@example.com'],
      };

      const result = await emailProvider.sendEmail(params);

      expect(result.success).toBe(true);
    });

    it('should handle custom from and reply-to', async () => {
      const params: EmailParams = {
        ...validEmailParams,
        from: 'custom@example.com',
        replyTo: 'replyto@example.com',
      };

      const result = await emailProvider.sendEmail(params);

      expect(result.success).toBe(true);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidParams = {
        to: 'test@example.com',
        // missing subject and body
      } as EmailParams;

      const result = await emailProvider.sendEmail(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should return 400 for missing recipients', async () => {
      const invalidParams: EmailParams = {
        to: [],
        subject: 'Test',
        html: '<p>Test body</p>',
        text: 'Test body',
      };

      const result = await emailProvider.sendEmail(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid email addresses');
    });

    it('should filter out invalid email addresses', async () => {
      const params: EmailParams = {
        ...validEmailParams,
        to: ['valid@example.com', 'invalid-email', 'another@example.com'],
      };

      const result = await emailProvider.sendEmail(params);

      expect(result.success).toBe(true);
    });

    it('should fallback to Postmark if SendGrid fails', async () => {
      mockSendGrid.sendMultiple.mockRejectedValue(new Error('SendGrid failed'));

      const result = await emailProvider.sendEmail(validEmailParams);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('postmark');
      expect(mockPostmarkClient.sendEmail).toHaveBeenCalled();
    });

    it('should fallback to SES if SendGrid and Postmark fail', async () => {
      mockSendGrid.sendMultiple.mockRejectedValue(new Error('SendGrid failed'));
      mockPostmarkClient.sendEmail.mockRejectedValue(new Error('Postmark failed'));

      const result = await emailProvider.sendEmail(validEmailParams);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('ses');
      expect(mockSESClient.send).toHaveBeenCalled();
    });

    it('should return failure if all providers fail', async () => {
      mockSendGrid.sendMultiple.mockRejectedValue(new Error('SendGrid failed'));
      mockPostmarkClient.sendEmail.mockRejectedValue(new Error('Postmark failed'));
      mockSESClient.send.mockRejectedValue(new Error('SES failed'));

      const result = await emailProvider.sendEmail(validEmailParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('All providers failed');
    });

    it('should handle no providers initialized', async () => {
      const emptyProvider = new EmailProvider({});
      const result = await emptyProvider.sendEmail(validEmailParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('All providers failed');
    });
  });

  // ==========================================================================
  // BULK SEND
  // ==========================================================================

  describe('bulkSend', () => {
    it('should send multiple emails sequentially', async () => {
      const emails: EmailParams[] = [
        { to: 'test1@example.com', subject: 'Test 1', html: '<p>Body 1</p>', text: 'Body 1' },
        { to: 'test2@example.com', subject: 'Test 2', html: '<p>Body 2</p>', text: 'Body 2' },
        { to: 'test3@example.com', subject: 'Test 3', html: '<p>Body 3</p>', text: 'Body 3' },
      ];

      const results = await emailProvider.bulkSend(emails);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should apply rate limiting between sends', async () => {
      const emails: EmailParams[] = [
        { to: 'test1@example.com', subject: 'Test 1', html: '<p>Body 1</p>', text: 'Body 1' },
        { to: 'test2@example.com', subject: 'Test 2', html: '<p>Body 2</p>', text: 'Body 2' },
      ];

      const startTime = Date.now();
      await emailProvider.bulkSend(emails, 100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should handle mixed success/failure in bulk sends', async () => {
      // Create a new provider instance for this test
      const testProvider = new EmailProvider({
        sendgrid: {
          apiKey: 'sg-test-key',
          from: 'noreply@example.com',
        },
      });

      // Mock to only have one provider, and make it fail on second call
      const mockSG = {
        setApiKey: jest.fn(),
        sendMultiple: jest
          .fn()
          .mockResolvedValueOnce([{ headers: { 'x-message-id': 'msg-1' } }])
          .mockRejectedValueOnce(new Error('SendGrid failed'))
          .mockResolvedValueOnce([{ headers: { 'x-message-id': 'msg-3' } }]),
      };

      // Manually set the provider's internal provider
      (testProvider as any).providers.set('sendgrid', mockSG);
      (testProvider as any).preferredOrder = ['sendgrid'];

      const emails: EmailParams[] = [
        { to: 'test1@example.com', subject: 'Test 1', html: '<p>Body 1</p>', text: 'Body 1' },
        { to: 'test2@example.com', subject: 'Test 2', html: '<p>Body 2</p>', text: 'Body 2' },
        { to: 'test3@example.com', subject: 'Test 3', html: '<p>Body 3</p>', text: 'Body 3' },
      ];

      const results = await testProvider.bulkSend(emails);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should handle empty array', async () => {
      const results = await emailProvider.bulkSend([]);

      expect(results).toEqual([]);
    });
  });

  // ==========================================================================
  // TEMPLATE RENDERING
  // ==========================================================================

  describe('renderTemplate', () => {
    it('should replace variable placeholders', () => {
      const template = 'Hello {{name}}, your order {{orderId}} is ready.';
      const variables = { name: 'John', orderId: '12345' };

      const result = emailProvider.renderTemplate(template, variables);

      expect(result).toBe('Hello John, your order 12345 is ready.');
    });

    it('should handle multiple occurrences of the same variable', () => {
      const template = '{{greeting}} {{name}}, {{greeting}} again!';
      const variables = { greeting: 'Hello', name: 'Jane' };

      const result = emailProvider.renderTemplate(template, variables);

      expect(result).toBe('Hello Jane, Hello again!');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{name}}, from {{company}}';
      const variables = { name: 'Bob' };

      const result = emailProvider.renderTemplate(template, variables);

      expect(result).toBe('Hello Bob, from {{company}}');
    });

    it('should convert values to strings', () => {
      const template = 'Your total is ${{amount}}';
      const variables = { amount: 100 };

      const result = emailProvider.renderTemplate(template, variables);

      expect(result).toBe('Your total is $100');
    });

    it('should handle empty variables object', () => {
      const template = 'Hello World';
      const variables = {};

      const result = emailProvider.renderTemplate(template, variables);

      expect(result).toBe('Hello World');
    });
  });

  // ==========================================================================
  // EMAIL VALIDATION
  // ==========================================================================

  describe('Email Validation', () => {
    it('should validate correct email formats', async () => {
      const validEmails = ['test@example.com', 'user.name@example.com', 'user+tag@example.co.uk'];

      for (const email of validEmails) {
        const result = await emailProvider.sendEmail({
          to: email,
          subject: 'Test',
          html: '<p>Body</p>',
          text: 'Body',
        });

        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = ['invalid', '@example.com', 'user@', 'user @example.com'];

      for (const email of invalidEmails) {
        const result = await emailProvider.sendEmail({
          to: email,
          subject: 'Test',
          html: '<p>Body</p>',
          text: 'Body',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('No valid email addresses');
      }
    });
  });

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  describe('healthCheck', () => {
    it('should return status of all initialized providers', async () => {
      const health = await emailProvider.healthCheck();

      expect(health).toHaveProperty('sendgrid', true);
      expect(health).toHaveProperty('postmark', true);
      expect(health).toHaveProperty('ses', true);
    });

    it('should only return initialized providers', async () => {
      const partialProvider = new EmailProvider({
        sendgrid: { apiKey: 'sg-key' },
      });

      const health = await partialProvider.healthCheck();

      expect(health).toHaveProperty('sendgrid', true);
      expect(health).not.toHaveProperty('postmark');
      expect(health).not.toHaveProperty('ses');
    });
  });

  // ==========================================================================
  // GET AVAILABLE PROVIDERS
  // ==========================================================================

  describe('getAvailableProviders', () => {
    it('should return list of initialized providers', () => {
      const providers = emailProvider.getAvailableProviders();

      expect(providers).toContain('sendgrid');
      expect(providers).toContain('postmark');
      expect(providers).toContain('ses');
    });
  });

  // ==========================================================================
  // SINGLETON FUNCTION
  // ==========================================================================

  describe('getEmailProvider singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const provider1 = getEmailProvider();
      const provider2 = getEmailProvider();

      expect(provider1).toBe(provider2);
    });

    it('should create provider from environment variables', () => {
      const provider = getEmailProvider();
      const providers = provider.getAvailableProviders();

      // Provider should be created (may or may not have actual providers depending on env)
      expect(provider).toBeInstanceOf(EmailProvider);
    });
  });

  // ==========================================================================
  // ATTACHMENTS
  // ==========================================================================

  describe('Email Attachments', () => {
    it('should send email with attachments', async () => {
      const attachment = {
        filename: 'test.pdf',
        content: 'base64content',
        type: 'application/pdf',
      };

      const params: EmailParams = {
        to: 'test@example.com',
        subject: 'Email with attachment',
        html: '<p>Please find attached file</p>',
        text: 'Please find attached file',
        attachments: [attachment],
      };

      const result = await emailProvider.sendEmail(params);

      expect(result.success).toBe(true);
      expect(mockSendGrid.sendMultiple).toHaveBeenCalled();
    });
  });
});
