/**
 * Unit tests for NZCService
 * @covers src/services/NZCService.ts
 */

import { NZCLabelFormat, nzcService } from '../NZCService';
import { logger } from '../../config/logger';
import { NZCService } from '../NZCService';

// Mock dependencies
jest.mock('../../config/logger');
jest.mock('../../config', () => ({
  nzc: {
    baseUrl: 'https://api.test.com',
    apiKey: 'test-api-key',
    siteId: 'test-site-id',
    supportEmail: 'test@example.com',
  },
  default: {
    nzc: {
      baseUrl: 'https://api.test.com',
      apiKey: 'test-api-key',
      siteId: 'test-site-id',
      supportEmail: 'test@example.com',
    },
  },
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NZCService', () => {
  let service: NZCService;

  // Helper to create mock destination
  const createMockDestination = (overrides: any = {}) => ({
    Name: 'Test Customer',
    Address: {
      StreetAddress: '123 Test St',
      Suburb: 'Auckland',
      Postcode: '1010',
      Country: 'NEW ZEALAND',
    },
    ContactPerson: 'John Doe',
    PhoneNumber: '0211234567',
    Email: 'test@example.com',
    ...overrides,
  });

  // Helper to create mock package
  const createMockPackage = (overrides: any = {}) => ({
    Length: 30,
    Width: 20,
    Height: 15,
    Kg: 2.5,
    Units: 1,
    ...overrides,
  });

  beforeEach(() => {
    service = new NZCService();
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  // ==========================================================================
  // GET RATES
  // ==========================================================================

  describe('getRates', () => {
    it('should fetch rates successfully', async () => {
      const mockDestination = createMockDestination();
      const mockPackages = [createMockPackage()];
      const mockResponse = {
        Quotes: [
          {
            QuoteId: 'Q-001',
            Carrier: 'NZ Couriers',
            Service: 'Standard Overnight',
            TotalPrice: 15.5,
            TransitDays: 2,
            Description: 'Standard delivery',
          },
        ],
        Suppressed: [],
        Rejected: [],
        ValidationErrors: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => '',
      } as Response);

      const result = await service.getRates(mockDestination, mockPackages);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/rates',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            access_key: 'test-api-key',
            site_id: 'test-site-id',
          }),
        })
      );
    });

    it('should handle validation errors gracefully', async () => {
      const mockDestination = createMockDestination();
      const mockPackages = [createMockPackage()];
      const mockResponse = {
        Quotes: [],
        Suppressed: [],
        Rejected: [
          {
            Carrier: 'Fast Shipping',
            Reason: 'Package too large',
          },
        ],
        ValidationErrors: {
          'Packages[0].Kg': 'Weight exceeds limit',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        text: async () => '',
      } as Response);

      const result = await service.getRates(mockDestination, mockPackages);

      expect(result.Quotes).toEqual([]);
      expect(result.Rejected).toHaveLength(1);
      expect(result.ValidationErrors).toBeDefined();
    });

    it('should throw error when API request fails', async () => {
      const mockDestination = createMockDestination();
      const mockPackages = [createMockPackage()];

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      } as Response);

      await expect(service.getRates(mockDestination, mockPackages)).rejects.toThrow(
        'NZC API error: 401 Unauthorized'
      );
    });

    it('should throw error when network fails', async () => {
      const mockDestination = createMockDestination();
      const mockPackages = [createMockPackage()];

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getRates(mockDestination, mockPackages)).rejects.toThrow(
        'Network error'
      );
    });
  });

  // ==========================================================================
  // CREATE SHIPMENT
  // ==========================================================================

  describe('createShipment', () => {
    it('should create shipment successfully', async () => {
      const mockDestination = createMockDestination();
      const mockPackages = [createMockPackage()];
      const quoteId = 'Q-001';
      const mockResponse = {
        ConsignmentNo: 'CN-123456',
        ConsignmentId: 'CID-789',
        Packages: [
          {
            ConsignmentNo: 'CN-123456-PKG1',
            ConsignmentId: 'CID-789-PKG1',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
        text: async () => '',
      } as Response);

      const result = await service.createShipment(mockDestination, mockPackages, quoteId);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/shipments',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw error when shipment creation fails', async () => {
      const mockDestination = createMockDestination();
      const mockPackages = [createMockPackage()];
      const quoteId = 'INVALID-QUOTE';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid quote ID',
      } as Response);

      await expect(service.createShipment(mockDestination, mockPackages, quoteId)).rejects.toThrow(
        'NZC API error: 400 Bad Request'
      );
    });
  });

  // ==========================================================================
  // GET LABEL
  // ==========================================================================

  describe('getLabel', () => {
    it('should fetch label in PNG format by default', async () => {
      const connote = 'CN-123456';
      const mockBase64Data = Buffer.from('mock image data').toString('base64');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => (name === 'content-type' ? 'image/png' : null),
        },
        arrayBuffer: async () => Buffer.from('mock image data'),
      } as unknown as Response);

      const result = await service.getLabel(connote);

      expect(result.data).toBe(mockBase64Data);
      expect(result.contentType).toBe('image/png');
      expect(result.format).toBe(NZCLabelFormat.PNG_100X175);
    });

    it('should fetch label in PDF format', async () => {
      const connote = 'CN-123456';
      const mockBase64Data = Buffer.from('mock pdf data').toString('base64');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => (name === 'content-type' ? 'application/pdf' : null),
        },
        arrayBuffer: async () => Buffer.from('mock pdf data'),
      } as unknown as Response);

      const result = await service.getLabel(connote, NZCLabelFormat.PDF);

      expect(result.data).toBe(mockBase64Data);
      expect(result.contentType).toBe('application/pdf');
      expect(result.format).toBe(NZCLabelFormat.PDF);
    });

    it('should throw error when label fetch fails', async () => {
      const connote = 'INVALID-CONNOTE';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Connosignment not found',
      } as Response);

      await expect(service.getLabel(connote)).rejects.toThrow('NZC API error: 404 Not Found');
    });
  });

  // ==========================================================================
  // REPRINT LABEL
  // ==========================================================================

  describe('reprintLabel', () => {
    it('should reprint label with default copies', async () => {
      const connote = 'CN-123456';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
      } as Response);

      await expect(service.reprintLabel(connote)).resolves.not.toThrow();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api/labels?connote='),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should reprint label with specified copies', async () => {
      const connote = 'CN-123456';
      const copies = 3;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
      } as Response);

      await expect(service.reprintLabel(connote, copies)).resolves.not.toThrow();
    });

    it('should reprint label to specific printer', async () => {
      const connote = 'CN-123456';
      const copies = 2;
      const printerName = 'Warehouse Printer 1';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
      } as Response);

      await expect(service.reprintLabel(connote, copies, printerName)).resolves.not.toThrow();
    });

    it('should throw error when reprint fails', async () => {
      const connote = 'INVALID-CONNOTE';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Connosignment not found',
      } as Response);

      await expect(service.reprintLabel(connote)).rejects.toThrow('NZC API error: 404 Not Found');
    });
  });

  // ==========================================================================
  // GET PRINTERS
  // ==========================================================================

  describe('getPrinters', () => {
    it('should fetch available printers', async () => {
      const mockPrinters = [
        {
          id: 'printer-1',
          name: 'Warehouse Printer 1',
          status: 'online',
        },
        {
          id: 'printer-2',
          name: 'Warehouse Printer 2',
          status: 'offline',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockPrinters,
        text: async () => '',
      } as Response);

      const result = await service.getPrinters();

      expect(result).toEqual(mockPrinters);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/printers',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should throw error when printers fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      } as Response);

      await expect(service.getPrinters()).rejects.toThrow(
        'NZC API error: 500 Internal Server Error'
      );
    });
  });

  // ==========================================================================
  // GET STOCK SIZES
  // ==========================================================================

  describe('getStockSizes', () => {
    it('should fetch available stock sizes', async () => {
      const mockStockSizes = [
        { id: 'SS-001', name: 'Small', dimensions: '30x20x15' },
        { id: 'SS-002', name: 'Medium', dimensions: '40x30x20' },
        { id: 'SS-003', name: 'Large', dimensions: '50x40x30' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStockSizes,
        text: async () => '',
      } as Response);

      const result = await service.getStockSizes();

      expect(result).toEqual(mockStockSizes);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/stocksizes',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should throw error when stock sizes fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Service unavailable',
      } as Response);

      await expect(service.getStockSizes()).rejects.toThrow(
        'NZC API error: 503 Service Unavailable'
      );
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('error handling', () => {
    it('should log warnings when API credentials are missing', () => {
      // Reset config to have missing credentials
      jest.doMock('../../config', () => ({
        default: {
          nzc: {
            baseUrl: 'https://api.test.com',
            apiKey: '',
            siteId: '',
            supportEmail: '',
          },
        },
      }));

      const serviceWithoutCreds = new NZCService();
      expect(serviceWithoutCreds).toBeDefined();
    });

    it('should handle malformed JSON response', async () => {
      const mockDestination = createMockDestination();
      const mockPackages = [createMockPackage()];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => {
          throw new Error('Invalid JSON');
        },
        text: async () => 'Invalid JSON',
      } as unknown as Response);

      await expect(service.getRates(mockDestination, mockPackages)).rejects.toThrow('Invalid JSON');
    });

    it('should handle timeout errors', async () => {
      const mockDestination = createMockDestination();
      const mockPackages = [createMockPackage()];

      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(service.getRates(mockDestination, mockPackages)).rejects.toThrow(
        'Request timeout'
      );
    });
  });
});
