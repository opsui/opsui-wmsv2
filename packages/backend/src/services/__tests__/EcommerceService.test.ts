/**
 * Unit tests for EcommerceService
 * @covers src/services/EcommerceService.ts
 */

// Define mock services BEFORE the jest.mock calls that use them
const mockShopifyService = {
  testConnection: jest.fn(),
  updateInventory: jest.fn(),
  getInventory: jest.fn(),
  fetchProducts: jest.fn(),
  fetchOrders: jest.fn(),
};

const mockWooCommerceService = {
  testConnection: jest.fn(),
  updateInventory: jest.fn(),
  getInventory: jest.fn(),
  fetchProducts: jest.fn(),
  fetchOrders: jest.fn(),
};

const mockMagentoService = {
  testConnection: jest.fn(),
  updateInventory: jest.fn(),
  getInventory: jest.fn(),
  fetchProducts: jest.fn(),
  fetchOrders: jest.fn(),
};

// Mock platform services BEFORE importing EcommerceService
jest.mock('../platforms/ShopifyService', () => ({
  ShopifyService: jest.fn().mockImplementation(() => mockShopifyService),
}));

jest.mock('../platforms/WooCommerceService', () => ({
  WooCommerceService: jest.fn().mockImplementation(() => mockWooCommerceService),
}));

jest.mock('../platforms/MagentoService', () => ({
  MagentoService: jest.fn().mockImplementation(() => mockMagentoService),
}));

// Import the service after mocking
import { EcommerceService } from '../EcommerceService';
import { query } from '../../db/client';
import { ecommerceRepository } from '../../repositories/EcommerceRepository';
import {
  EcommerceConnection,
  PlatformType,
  ProductMappingStatus,
  EcommerceSyncStatus,
  InventorySyncType,
} from '@opsui/shared';
import type {
  EcommerceProductMapping,
  EcommerceSyncLog,
  CreateEcommerceConnectionDTO,
  CreateProductMappingDTO,
  SyncInventoryRequestDTO,
  SyncProductsRequestDTO,
} from '@opsui/shared';

// Mock the query function
jest.mock('../../db/client', () => ({
  query: jest.fn(),
}));

// Mock the repository
jest.mock('../../repositories/EcommerceRepository', () => ({
  ecommerceRepository: {
    insert: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findByIdOrThrow: jest.fn(),
    findAll: jest.fn(),
    findActiveConnections: jest.fn(),
    delete: jest.fn(),
    updateRateLimit: jest.fn(),
    createProductMapping: jest.fn(),
    updateProductMapping: jest.fn(),
    findAllProductMappings: jest.fn(),
    findProductMappingBySKU: jest.fn(),
    deleteProductMapping: jest.fn(),
    createSyncLog: jest.fn(),
    updateSyncLog: jest.fn(),
    findSyncLogs: jest.fn(),
    createInventorySync: jest.fn(),
    updateLastSync: jest.fn(),
    findOrderSyncByExternalId: jest.fn(),
    createOrderSync: jest.fn(),
    updateOrderSyncStatus: jest.fn(),
    createWebhook: jest.fn(),
    updateWebhookStatus: jest.fn(),
    saveShopifySettings: jest.fn(),
    saveWooCommerceSettings: jest.fn(),
    saveMagentoSettings: jest.fn(),
    getShopifySettings: jest.fn(),
    getWooCommerceSettings: jest.fn(),
    getMagentoSettings: jest.fn(),
    getConnectionStatus: jest.fn(),
    getSyncErrors: jest.fn(),
    getPendingSyncs: jest.fn(),
  },
}));

describe('EcommerceService', () => {
  let ecommerceService: EcommerceService;

  // Helper to create mock connection
  const createMockConnection = (overrides: any = {}): EcommerceConnection => ({
    connectionId: 'ECONN-001',
    connectionName: 'Test Store',
    platformType: PlatformType.SHOPIFY,
    apiEndpoint: 'https://test.myshopify.com',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    accessToken: 'test-token',
    storeUrl: 'https://test.myshopify.com',
    apiVersion: 'v1',
    isActive: true,
    syncCustomers: true,
    syncProducts: true,
    syncInventory: true,
    syncOrders: true,
    autoImportOrders: false,
    syncFrequencyMinutes: 60,
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  // Helper to create mock product mapping
  const createMockProductMapping = (overrides: any = {}): EcommerceProductMapping => ({
    mappingId: 'MAP-001',
    connectionId: 'ECONN-001',
    internalSku: 'SKU-001',
    externalProductId: 'prod-123',
    externalVariantId: 'var-456',
    externalProductTitle: 'Test Product',
    syncStatus: ProductMappingStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  // Helper to create mock sync log
  const createMockSyncLog = (overrides: any = {}): EcommerceSyncLog => ({
    logId: 'LOG-001',
    connectionId: 'ECONN-001',
    syncType: 'PUSH',
    resourceType: 'INVENTORY',
    resourceCount: 1,
    successCount: 1,
    failureCount: 0,
    syncStatus: EcommerceSyncStatus.COMPLETED,
    startedAt: new Date(),
    completedAt: new Date(),
    createdBy: 'system',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear platform service mocks
    mockShopifyService.testConnection.mockReset();
    mockShopifyService.updateInventory.mockReset();
    mockShopifyService.getInventory.mockReset();
    mockShopifyService.fetchProducts.mockReset();
    mockShopifyService.fetchOrders.mockReset();
    mockWooCommerceService.testConnection.mockReset();
    mockWooCommerceService.updateInventory.mockReset();
    mockWooCommerceService.getInventory.mockReset();
    mockWooCommerceService.fetchProducts.mockReset();
    mockWooCommerceService.fetchOrders.mockReset();
    mockMagentoService.testConnection.mockReset();
    mockMagentoService.updateInventory.mockReset();
    mockMagentoService.getInventory.mockReset();
    mockMagentoService.fetchProducts.mockReset();
    mockMagentoService.fetchOrders.mockReset();
    ecommerceService = new EcommerceService();
  });

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  describe('createConnection', () => {
    it('should create a new e-commerce connection', async () => {
      const dto: CreateEcommerceConnectionDTO = {
        connectionName: 'Test Store',
        platformType: PlatformType.SHOPIFY,
        apiEndpoint: 'https://test.myshopify.com',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        accessToken: 'test-token',
        storeUrl: 'https://test.myshopify.com',
        createdBy: 'user-123',
      };

      const mockConnection = createMockConnection();
      (ecommerceRepository.insert as jest.Mock).mockResolvedValue(mockConnection);

      const result = await ecommerceService.createConnection(dto);

      expect(result.connectionName).toBe('Test Store');
      expect(result.platformType).toBe(PlatformType.SHOPIFY);
      expect(ecommerceRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionName: 'Test Store',
          platformType: PlatformType.SHOPIFY,
        })
      );
    });

    it('should use default values for optional fields', async () => {
      const dto: CreateEcommerceConnectionDTO = {
        connectionName: 'Test Store',
        platformType: PlatformType.WOOCOMMERCE,
        apiEndpoint: 'https://test.com',
        apiKey: 'key',
        apiSecret: 'secret',
        storeUrl: 'https://test.com',
        createdBy: 'user-123',
      };

      const mockConnection = createMockConnection({
        platformType: PlatformType.WOOCOMMERCE,
      });
      (ecommerceRepository.insert as jest.Mock).mockResolvedValue(mockConnection);

      await ecommerceService.createConnection(dto);

      expect(ecommerceRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          apiVersion: 'v1',
          isActive: true,
          syncCustomers: true,
          syncProducts: true,
          syncInventory: true,
          syncOrders: true,
          autoImportOrders: false,
          syncFrequencyMinutes: 60,
        })
      );
    });
  });

  describe('getConnection', () => {
    it('should return a connection by ID', async () => {
      const mockConnection = createMockConnection();
      (ecommerceRepository.findById as jest.Mock).mockResolvedValue(mockConnection);

      const result = await ecommerceService.getConnection('ECONN-001');

      expect(result).toEqual(mockConnection);
      expect(ecommerceRepository.findById).toHaveBeenCalledWith('ECONN-001');
    });

    it('should return null when connection not found', async () => {
      (ecommerceRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await ecommerceService.getConnection('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getAllConnections', () => {
    it('should return all connections ordered by created date', async () => {
      const mockConnections = [
        createMockConnection({ connectionId: 'ECONN-001' }),
        createMockConnection({ connectionId: 'ECONN-002' }),
      ];
      (ecommerceRepository.findAll as jest.Mock).mockResolvedValue(mockConnections);

      const result = await ecommerceService.getAllConnections();

      expect(result).toHaveLength(2);
      expect(ecommerceRepository.findAll).toHaveBeenCalledWith({
        orderBy: 'created_at',
        orderDirection: 'DESC',
      });
    });
  });

  describe('getActiveConnections', () => {
    it('should return only active connections', async () => {
      const mockConnections = [createMockConnection()];
      (ecommerceRepository.findActiveConnections as jest.Mock).mockResolvedValue(mockConnections);

      const result = await ecommerceService.getActiveConnections();

      expect(result).toHaveLength(1);
      expect(ecommerceRepository.findActiveConnections).toHaveBeenCalled();
    });
  });

  describe('deleteConnection', () => {
    it('should delete a connection', async () => {
      (ecommerceRepository.delete as jest.Mock).mockResolvedValue(true);

      const result = await ecommerceService.deleteConnection('ECONN-001');

      expect(result).toBe(true);
      expect(ecommerceRepository.delete).toHaveBeenCalledWith('ECONN-001');
    });
  });

  // ==========================================================================
  // CONNECTION TESTING
  // ==========================================================================

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const mockConnection = createMockConnection();
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      mockShopifyService.testConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful',
      });

      const result = await ecommerceService.testConnection('ECONN-001');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should update rate limit info when provided', async () => {
      const mockConnection = createMockConnection();
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      mockShopifyService.testConnection.mockResolvedValue({
        success: true,
        message: 'OK',
        rateLimitRemaining: 40,
        rateLimitResetAt: new Date(Date.now() + 3600000),
      });

      await ecommerceService.testConnection('ECONN-001');

      expect(ecommerceRepository.updateRateLimit).toHaveBeenCalledWith(
        'ECONN-001',
        40,
        expect.any(Date)
      );
    });

    it('should return failure for unsupported platforms', async () => {
      const mockConnection = createMockConnection({ platformType: PlatformType.CUSTOM });
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      const result = await ecommerceService.testConnection('ECONN-001');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Platform not supported');
    });

    it('should handle connection errors gracefully', async () => {
      const mockConnection = createMockConnection();
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      mockShopifyService.testConnection.mockRejectedValue(new Error('Network error'));

      const result = await ecommerceService.testConnection('ECONN-001');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Network error');
    });
  });

  // ==========================================================================
  // PRODUCT MAPPING
  // ==========================================================================

  describe('createProductMapping', () => {
    it('should create a product mapping', async () => {
      const dto: CreateProductMappingDTO = {
        connectionId: 'ECONN-001',
        internalSku: 'SKU-001',
        externalProductId: 'prod-123',
        externalVariantId: 'var-456',
        externalProductTitle: 'Test Product',
      };

      const mockMapping = createMockProductMapping();
      (ecommerceRepository.createProductMapping as jest.Mock).mockResolvedValue(mockMapping);

      const result = await ecommerceService.createProductMapping(dto);

      expect(result.internalSku).toBe('SKU-001');
      expect(result.syncStatus).toBe(ProductMappingStatus.ACTIVE);
      expect(ecommerceRepository.createProductMapping).toHaveBeenCalledWith({
        connectionId: 'ECONN-001',
        internalSku: 'SKU-001',
        externalProductId: 'prod-123',
        externalVariantId: 'var-456',
        externalProductTitle: 'Test Product',
        syncStatus: ProductMappingStatus.ACTIVE,
      });
    });
  });

  describe('getProductMappings', () => {
    it('should return all product mappings for a connection', async () => {
      const mockMappings = [
        createMockProductMapping({ mappingId: 'MAP-001' }),
        createMockProductMapping({ mappingId: 'MAP-002' }),
      ];
      (ecommerceRepository.findAllProductMappings as jest.Mock).mockResolvedValue(mockMappings);

      const result = await ecommerceService.getProductMappings('ECONN-001');

      expect(result).toHaveLength(2);
      expect(ecommerceRepository.findAllProductMappings).toHaveBeenCalledWith('ECONN-001');
    });
  });

  describe('deleteProductMapping', () => {
    it('should delete a product mapping', async () => {
      (ecommerceRepository.deleteProductMapping as jest.Mock).mockResolvedValue(true);

      const result = await ecommerceService.deleteProductMapping('MAP-001');

      expect(result).toBe(true);
      expect(ecommerceRepository.deleteProductMapping).toHaveBeenCalledWith('MAP-001');
    });
  });

  // ==========================================================================
  // INVENTORY SYNC
  // ==========================================================================

  describe('syncInventory', () => {
    it('should sync inventory for SKUs', async () => {
      const mockConnection = createMockConnection();
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      const mockMapping = createMockProductMapping();
      (ecommerceRepository.findProductMappingBySKU as jest.Mock).mockResolvedValue(mockMapping);

      const mockSyncLog = createMockSyncLog();
      (ecommerceRepository.createSyncLog as jest.Mock).mockResolvedValue(mockSyncLog);
      (ecommerceRepository.findSyncLogs as jest.Mock).mockResolvedValue([mockSyncLog]);

      (query as jest.Mock).mockResolvedValue({ rows: [{ quantity: 100 }] });

      mockShopifyService.updateInventory.mockResolvedValue(undefined);

      const dto: SyncInventoryRequestDTO = {
        connectionId: 'ECONN-001',
        skus: ['SKU-001'],
        syncType: InventorySyncType.PUSH,
      };

      const result = await ecommerceService.syncInventory(dto);

      expect(result.syncStatus).toBe(EcommerceSyncStatus.COMPLETED);
      expect(result.successCount).toBe(1);
    });

    it('should handle missing SKUs gracefully', async () => {
      const mockConnection = createMockConnection();
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      const mockSyncLog = createMockSyncLog();
      (ecommerceRepository.createSyncLog as jest.Mock).mockResolvedValue(mockSyncLog);

      // Mock updateSyncLog to return updated sync log with failure count
      const updatedSyncLog = {
        ...mockSyncLog,
        failureCount: 1,
        errorSummary: 'SKU SKU-NONEXISTENT not found in inventory',
      };
      (ecommerceRepository.updateSyncLog as jest.Mock).mockResolvedValue(updatedSyncLog);

      (ecommerceRepository.findSyncLogs as jest.Mock).mockResolvedValue([updatedSyncLog]);

      (query as jest.Mock).mockResolvedValue({ rows: [] });

      const dto: SyncInventoryRequestDTO = {
        connectionId: 'ECONN-001',
        skus: ['SKU-NONEXISTENT'],
        syncType: InventorySyncType.PUSH,
      };

      const result = await ecommerceService.syncInventory(dto);

      expect(result.failureCount).toBe(1);
      expect(result.errorSummary).toContain('not found in inventory');
    });

    it('should throw error for unsupported platform', async () => {
      const mockConnection = createMockConnection({ platformType: PlatformType.CUSTOM });
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      const dto: SyncInventoryRequestDTO = {
        connectionId: 'ECONN-001',
        skus: ['SKU-001'],
        syncType: InventorySyncType.PUSH,
      };

      await expect(ecommerceService.syncInventory(dto)).rejects.toThrow('Platform not supported');
    });

    it('should support bidirectional sync', async () => {
      const mockConnection = createMockConnection();
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      const mockMapping = createMockProductMapping();
      (ecommerceRepository.findProductMappingBySKU as jest.Mock).mockResolvedValue(mockMapping);

      const mockSyncLog = createMockSyncLog();
      (ecommerceRepository.createSyncLog as jest.Mock).mockResolvedValue(mockSyncLog);
      (ecommerceRepository.findSyncLogs as jest.Mock).mockResolvedValue([mockSyncLog]);

      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ quantity: 100 }] })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE query

      mockShopifyService.updateInventory.mockResolvedValue(undefined);
      mockShopifyService.getInventory.mockResolvedValue(95);

      const dto: SyncInventoryRequestDTO = {
        connectionId: 'ECONN-001',
        skus: ['SKU-001'],
        syncType: InventorySyncType.BIDIRECTIONAL,
      };

      const result = await ecommerceService.syncInventory(dto);

      expect(mockShopifyService.updateInventory).toHaveBeenCalled();
      expect(mockShopifyService.getInventory).toHaveBeenCalled();
      expect(result.successCount).toBe(1);
    });
  });

  // ==========================================================================
  // PRODUCT SYNC
  // ==========================================================================

  describe('syncProducts', () => {
    it('should sync products from platform', async () => {
      const mockConnection = createMockConnection();
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      const mockSyncLog = createMockSyncLog({ resourceType: 'PRODUCT' });
      (ecommerceRepository.createSyncLog as jest.Mock).mockResolvedValue(mockSyncLog);
      (ecommerceRepository.findSyncLogs as jest.Mock).mockResolvedValue([mockSyncLog]);

      (ecommerceRepository.findProductMappingBySKU as jest.Mock).mockResolvedValue(null);

      mockShopifyService.fetchProducts.mockResolvedValue([
        {
          externalProductId: 'prod-123',
          externalVariantId: 'var-456',
          title: 'Test Product',
          sku: 'SKU-001',
        },
      ]);

      (query as jest.Mock).mockResolvedValue({ rows: [{ sku: 'SKU-001' }] });

      const dto: SyncProductsRequestDTO = {
        connectionId: 'ECONN-001',
        skus: ['SKU-001'],
      };

      const result = await ecommerceService.syncProducts(dto);

      expect(result.resourceType).toBe('PRODUCT');
      expect(result.successCount).toBe(1);
    });

    it('should create mappings for unmapped products when includeUnmapped is true', async () => {
      const mockConnection = createMockConnection();
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      const mockSyncLog = createMockSyncLog({ resourceType: 'PRODUCT' });
      (ecommerceRepository.createSyncLog as jest.Mock).mockResolvedValue(mockSyncLog);
      (ecommerceRepository.findSyncLogs as jest.Mock).mockResolvedValue([mockSyncLog]);

      (ecommerceRepository.findProductMappingBySKU as jest.Mock).mockResolvedValue(null);
      (ecommerceRepository.createProductMapping as jest.Mock).mockResolvedValue(
        createMockProductMapping()
      );

      mockShopifyService.fetchProducts.mockResolvedValue([
        {
          externalProductId: 'prod-new',
          externalVariantId: 'var-new',
          title: 'New Product',
          sku: 'NEW-SKU',
        },
      ]);

      (query as jest.Mock).mockResolvedValue({ rows: [] }); // SKU doesn't exist in WMS

      const dto: SyncProductsRequestDTO = {
        connectionId: 'ECONN-001',
        skus: ['NEW-SKU'],
        includeUnmapped: true,
      };

      const result = await ecommerceService.syncProducts(dto);

      expect(ecommerceRepository.createProductMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          syncStatus: ProductMappingStatus.UNSYNCED,
        })
      );
      expect(result.successCount).toBe(1);
    });

    it('should throw error for unsupported platform', async () => {
      const mockConnection = createMockConnection({ platformType: PlatformType.CUSTOM });
      (ecommerceRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(mockConnection);

      const dto: SyncProductsRequestDTO = {
        connectionId: 'ECONN-001',
        skus: ['SKU-001'],
      };

      await expect(ecommerceService.syncProducts(dto)).rejects.toThrow('Platform not supported');
    });
  });
});
