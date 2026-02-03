/**
 * Shipping Service Tests
 *
 * Tests for shipping carriers, shipments, labels, and tracking
 */

import { ShippingService, shippingService } from '../ShippingService';
import { logger } from '../../config/logger';
import {
  ShipmentStatus,
  LabelFormat,
  Carrier,
  Shipment,
  ShippingLabel,
  ShipmentTrackingEvent,
  CreateShipmentDTO,
  CreateShippingLabelDTO,
  AddTrackingEventDTO,
  Address,
} from '@opsui/shared';

// Mock dependencies
jest.mock('../../config/logger');
jest.mock('../NotificationHelper');

describe('ShippingService', () => {
  let service: ShippingService;

  beforeEach(() => {
    service = new ShippingService();

    // Reset global mockPool.query
    global.mockPool.query = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // CARRIER METHODS
  // ==========================================================================

  describe('getActiveCarriers', () => {
    it('should return all active carriers ordered correctly', async () => {
      const mockCarriers = [
        {
          carrier_id: 'CARR-001',
          name: 'FedEx',
          carrier_code: 'FEDEX',
          service_types: ['express', 'ground'],
          contact_email: 'support@fedex.com',
          contact_phone: '1-800-FEDEX',
          api_endpoint: 'https://api.fedex.com',
          is_active: true,
          requires_account_number: true,
          requires_package_dimensions: true,
          requires_weight: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          carrier_id: 'CARR-002',
          name: 'UPS',
          carrier_code: 'UPS',
          service_types: ['express', 'ground', 'saver'],
          contact_email: 'support@ups.com',
          contact_phone: '1-800-UPS',
          api_endpoint: 'https://api.ups.com',
          is_active: true,
          requires_account_number: true,
          requires_package_dimensions: true,
          requires_weight: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockCarriers });

      const result = await service.getActiveCarriers();

      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM carriers WHERE is_active = true'),
        []
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        carrierId: 'CARR-001',
        name: 'FedEx',
        carrierCode: 'FEDEX',
        serviceTypes: ['express', 'ground'],
        contactEmail: 'support@fedex.com',
        contactPhone: '1-800-FEDEX',
        apiEndpoint: 'https://api.fedex.com',
        isActive: true,
        requiresAccountNumber: true,
        requiresPackageDimensions: true,
        requiresWeight: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should return empty array when no active carriers exist', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getActiveCarriers();

      expect(result).toEqual([]);
    });
  });

  describe('getCarrier', () => {
    it('should return carrier by ID', async () => {
      const mockCarrier = {
        carrier_id: 'CARR-001',
        name: 'FedEx',
        carrier_code: 'FEDEX',
        service_types: ['express'],
        contact_email: 'support@fedex.com',
        contact_phone: '1-800-FEDEX',
        api_endpoint: 'https://api.fedex.com',
        is_active: true,
        requires_account_number: true,
        requires_package_dimensions: true,
        requires_weight: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockCarrier] });

      const result = await service.getCarrier('CARR-001');

      expect(result.carrierId).toBe('CARR-001');
      expect(result.name).toBe('FedEx');
    });

    it('should throw error when carrier not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getCarrier('NONEXISTENT')).rejects.toThrow(
        'Carrier NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // SHIPMENT METHODS
  // ==========================================================================

  describe('createShipment', () => {
    it('should create a new shipment successfully', async () => {
      const dto: CreateShipmentDTO = {
        orderId: 'ORD-001',
        carrierId: 'CARR-001',
        serviceType: 'express',
        shippingMethod: 'ground',
        shipFromAddress: {
          name: 'Warehouse',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        } as Address,
        shipToAddress: {
          name: 'Customer',
          addressLine1: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90001',
          country: 'US',
        } as Address,
        totalWeight: 10.5,
        totalPackages: 2,
        dimensions: { length: 12, width: 10, height: 8, unit: 'IN' },
        createdBy: 'user-123',
      };

      const mockCreatedShipment = {
        shipment_id: 'SHP-TEST001',
        order_id: 'ORD-001',
        carrier_id: 'CARR-001',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCreatedShipment] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Mock getShipment call
      global.mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            ...mockCreatedShipment,
            service_type: 'express',
            shipping_method: 'ground',
            tracking_number: null,
            tracking_url: null,
            ship_from_address: JSON.stringify(dto.shipFromAddress),
            ship_to_address: JSON.stringify(dto.shipToAddress),
            total_weight: '10.5',
            total_packages: '2',
            dimensions: JSON.stringify(dto.dimensions),
            total_cost: '0',
          },
        ],
      });

      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // labels

      const result = await service.createShipment(dto);

      // Verify BEGIN was called
      const beginCall = mockClient.query.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('BEGIN')
      );
      expect(beginCall).toBeDefined();

      // Verify INSERT was called with correct parameters
      const insertCall = mockClient.query.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && call[0].includes('INSERT INTO shipments')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toContain('ORD-001');
      expect(insertCall[1]).toContain('CARR-001');

      expect(logger.info).toHaveBeenCalledWith(
        'Shipment created',
        expect.objectContaining({
          shipmentId: expect.any(String),
          orderId: 'ORD-001',
        })
      );
    });

    it('should rollback on error', async () => {
      const dto: CreateShipmentDTO = {
        orderId: 'ORD-001',
        carrierId: 'CARR-001',
        serviceType: 'express',
        shippingMethod: 'ground',
        shipFromAddress: {} as Address,
        shipToAddress: {} as Address,
        totalWeight: 10,
        totalPackages: 1,
        createdBy: 'user-123',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // INSERT

      await expect(service.createShipment(dto)).rejects.toThrow('Database error');

      // Verify ROLLBACK was called
      const rollbackCall = mockClient.query.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('ROLLBACK')
      );
      expect(rollbackCall).toBeDefined();
      expect(logger.error).toHaveBeenCalledWith('Error creating shipment', expect.any(Error));
    });
  });

  describe('getShipment', () => {
    it('should return shipment with labels', async () => {
      const mockShipmentRow = {
        shipment_id: 'SHP-001',
        order_id: 'ORD-001',
        carrier_id: 'CARR-001',
        service_type: 'express',
        shipping_method: 'ground',
        tracking_number: 'TRK123456',
        tracking_url: 'https://track.com/TRK123456',
        ship_from_address: JSON.stringify({ name: 'Warehouse' }),
        ship_to_address: JSON.stringify({ name: 'Customer' }),
        total_weight: '10.5',
        total_packages: '2',
        dimensions: null,
        shipping_cost: '15.99',
        insurance_cost: '2.00',
        total_cost: '17.99',
        status: ShipmentStatus.SHIPPED,
        ship_date: '2024-01-01T00:00:00Z',
        estimated_delivery_date: '2024-01-05T00:00:00Z',
        actual_delivery_date: null,
        carrier_shipment_id: 'CARR-SHP-001',
        carrier_response: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        shipped_at: '2024-01-01T01:00:00Z',
        delivered_at: null,
        created_by: 'user-123',
        shipped_by: 'user-456',
      };

      const mockLabelRow = {
        label_id: 'LBL-001',
        shipment_id: 'SHP-001',
        label_format: LabelFormat.PDF,
        label_url: 'https://labels.com/LBL-001.pdf',
        label_data: null,
        package_number: '1',
        package_weight: '5.25',
        package_dimensions: null,
        carrier_tracking_number: 'TRK123456',
        created_at: '2024-01-01T00:00:00Z',
        printed_at: '2024-01-01T00:30:00Z',
        created_by: 'user-123',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockShipmentRow] })
        .mockResolvedValueOnce({ rows: [mockLabelRow] });

      const result = await service.getShipment('SHP-001');

      expect(result.shipmentId).toBe('SHP-001');
      expect(result.orderId).toBe('ORD-001');
      expect(result.trackingNumber).toBe('TRK123456');
      expect(result.labels).toHaveLength(1);
      expect(result.labels[0].labelId).toBe('LBL-001');
    });

    it('should throw error when shipment not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getShipment('NONEXISTENT')).rejects.toThrow(
        'Shipment NONEXISTENT not found'
      );
    });
  });

  describe('getShipmentByOrderId', () => {
    it('should return shipment for order ID', async () => {
      const mockShipmentRow = {
        shipment_id: 'SHP-001',
        order_id: 'ORD-001',
        carrier_id: 'CARR-001',
        service_type: 'express',
        shipping_method: 'ground',
        tracking_number: null,
        tracking_url: null,
        ship_from_address: '{}',
        ship_to_address: '{}',
        total_weight: '10',
        total_packages: '1',
        dimensions: null,
        shipping_cost: null,
        insurance_cost: null,
        total_cost: '0',
        status: ShipmentStatus.PENDING,
        ship_date: null,
        estimated_delivery_date: null,
        actual_delivery_date: null,
        carrier_shipment_id: null,
        carrier_response: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        shipped_at: null,
        delivered_at: null,
        created_by: 'user-123',
        shipped_by: null,
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockShipmentRow] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getShipmentByOrderId('ORD-001');

      expect(result).not.toBeNull();
      expect(result?.orderId).toBe('ORD-001');
    });

    it('should return null when no shipment exists for order', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getShipmentByOrderId('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getAllShipments', () => {
    it('should return paginated shipments with filters', async () => {
      const mockShipments = [
        {
          shipment_id: 'SHP-001',
          order_id: 'ORD-001',
          carrier_id: 'CARR-001',
          service_type: 'express',
          shipping_method: 'ground',
          tracking_number: 'TRK001',
          tracking_url: null,
          ship_from_address: '{}',
          ship_to_address: '{}',
          total_weight: '10',
          total_packages: '1',
          dimensions: null,
          shipping_cost: null,
          insurance_cost: null,
          total_cost: '0',
          status: ShipmentStatus.SHIPPED,
          ship_date: null,
          estimated_delivery_date: null,
          actual_delivery_date: null,
          carrier_shipment_id: null,
          carrier_response: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          shipped_at: null,
          delivered_at: null,
          created_by: 'user-123',
          shipped_by: null,
        },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count
        .mockResolvedValueOnce({ rows: mockShipments }); // data

      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // labels

      const result = await service.getAllShipments({
        status: ShipmentStatus.SHIPPED,
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(1);
      expect(result.shipments).toHaveLength(1);
      expect(result.shipments[0].status).toBe(ShipmentStatus.SHIPPED);
    });

    it('should apply carrier filter', async () => {
      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getAllShipments({
        carrierId: 'CARR-001',
      });

      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('carrier_id ='),
        expect.arrayContaining(['CARR-001'])
      );
    });
  });

  describe('updateShipmentStatus', () => {
    it('should update shipment status to shipped', async () => {
      const mockUpdatedRow = {
        shipment_id: 'SHP-001',
        order_id: 'ORD-001',
        carrier_id: 'CARR-001',
        status: ShipmentStatus.SHIPPED,
        updated_at: '2024-01-01T00:00:00Z',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockUpdatedRow] });

      // Mock getShipment call
      global.mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            shipment_id: 'SHP-001',
            order_id: 'ORD-001',
            carrier_id: 'CARR-001',
            service_type: 'express',
            shipping_method: 'ground',
            tracking_number: 'TRK123456',
            tracking_url: 'https://track.com/TRK123456',
            ship_from_address: '{}',
            ship_to_address: '{}',
            total_weight: '10',
            total_packages: '1',
            dimensions: null,
            shipping_cost: null,
            insurance_cost: null,
            total_cost: '0',
            status: ShipmentStatus.SHIPPED,
            ship_date: null,
            estimated_delivery_date: null,
            actual_delivery_date: null,
            carrier_shipment_id: null,
            carrier_response: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            shipped_at: '2024-01-01T01:00:00Z',
            delivered_at: null,
            created_by: 'user-123',
            shipped_by: 'user-123',
          },
        ],
      });

      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // labels

      const result = await service.updateShipmentStatus(
        'SHP-001',
        ShipmentStatus.SHIPPED,
        'user-123'
      );

      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shipments'),
        expect.arrayContaining([ShipmentStatus.SHIPPED, expect.any(String), 'user-123', 'SHP-001'])
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Shipment status updated',
        expect.objectContaining({
          shipmentId: 'SHP-001',
          status: ShipmentStatus.SHIPPED,
        })
      );
    });

    it('should throw error when shipment not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.updateShipmentStatus('NONEXISTENT', ShipmentStatus.SHIPPED)
      ).rejects.toThrow('Shipment NONEXISTENT not found');
    });
  });

  describe('addTrackingNumber', () => {
    it('should add tracking number to shipment', async () => {
      const mockUpdatedRow = {
        shipment_id: 'SHP-001',
        tracking_number: 'TRK123456',
        tracking_url: 'https://track.com/TRK123456',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockUpdatedRow] });

      // Mock getShipment call
      global.mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            shipment_id: 'SHP-001',
            order_id: 'ORD-001',
            tracking_number: 'TRK123456',
            tracking_url: 'https://track.com/TRK123456',
            ship_from_address: '{}',
            ship_to_address: '{}',
            total_weight: '10',
            total_packages: '1',
            total_cost: '0',
            status: ShipmentStatus.PENDING,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            carrier_id: 'CARR-001',
            service_type: 'express',
            shipping_method: 'ground',
            dimensions: null,
            shipping_cost: null,
            insurance_cost: null,
            ship_date: null,
            estimated_delivery_date: null,
            actual_delivery_date: null,
            carrier_shipment_id: null,
            carrier_response: null,
            shipped_at: null,
            delivered_at: null,
            created_by: null,
            shipped_by: null,
          },
        ],
      });

      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // labels

      const result = await service.addTrackingNumber(
        'SHP-001',
        'TRK123456',
        'https://track.com/TRK123456'
      );

      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shipments'),
        ['TRK123456', 'https://track.com/TRK123456', 'SHP-001']
      );
      expect(logger.info).toHaveBeenCalledWith('Tracking number added', {
        shipmentId: 'SHP-001',
        trackingNumber: 'TRK123456',
      });
    });

    it('should throw error when shipment not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.addTrackingNumber('NONEXISTENT', 'TRK123456')).rejects.toThrow(
        'Shipment NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // SHIPPING LABEL METHODS
  // ==========================================================================

  describe('createShippingLabel', () => {
    it('should create shipping label successfully', async () => {
      const dto: CreateShippingLabelDTO = {
        shipmentId: 'SHP-001',
        packageNumber: 1,
        packageWeight: 5.25,
        packageDimensions: { length: 12, width: 10, height: 8, unit: 'IN' },
        createdBy: 'user-123',
      };

      const mockLabel = {
        label_id: 'LBL-001',
        shipment_id: 'SHP-001',
        label_format: LabelFormat.PDF,
        label_url: null,
        label_data: null,
        package_number: '1',
        package_weight: '5.25',
        package_dimensions: JSON.stringify(dto.packageDimensions),
        carrier_tracking_number: null,
        created_at: '2024-01-01T00:00:00Z',
        printed_at: null,
        created_by: 'user-123',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockLabel] });

      // Mock updateShipmentLabelStatus calls
      global.mockPool.query.mockResolvedValueOnce({ rows: [{ total_packages: '2' }] });
      global.mockPool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await service.createShippingLabel(dto);

      expect(result.labelId).toBe('LBL-001');
      expect(result.packageNumber).toBe(1);
      expect(result.packageWeight).toBe(5.25);
      expect(logger.info).toHaveBeenCalledWith('Shipping label created', {
        labelId: 'LBL-001',
        shipmentId: 'SHP-001',
      });
    });

    it('should update shipment status when all labels created', async () => {
      const dto: CreateShippingLabelDTO = {
        shipmentId: 'SHP-001',
        packageNumber: 2,
        packageWeight: 5,
        createdBy: 'user-123',
      };

      const mockLabel = {
        label_id: 'LBL-002',
        shipment_id: 'SHP-001',
        label_format: LabelFormat.PDF,
        label_url: null,
        label_data: null,
        package_number: '2',
        package_weight: '5',
        package_dimensions: null,
        carrier_tracking_number: null,
        created_at: '2024-01-01T00:00:00Z',
        printed_at: null,
        created_by: 'user-123',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockLabel] });

      // Mock updateShipmentLabelStatus - all labels created
      global.mockPool.query.mockResolvedValueOnce({ rows: [{ total_packages: '2' }] });
      global.mockPool.query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // UPDATE shipments

      await service.createShippingLabel(dto);

      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shipments'),
        expect.arrayContaining([ShipmentStatus.LABEL_CREATED, 'SHP-001'])
      );
    });
  });

  describe('markLabelPrinted', () => {
    it('should mark label as printed', async () => {
      const mockLabel = {
        label_id: 'LBL-001',
        shipment_id: 'SHP-001',
        label_format: LabelFormat.PDF,
        label_url: null,
        label_data: null,
        package_number: '1',
        package_weight: '5',
        package_dimensions: null,
        carrier_tracking_number: null,
        created_at: '2024-01-01T00:00:00Z',
        printed_at: '2024-01-01T00:30:00Z',
        created_by: 'user-123',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockLabel] });

      const result = await service.markLabelPrinted('LBL-001');

      expect(result.printedAt).toEqual(expect.any(Date));
      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shipping_labels'),
        ['LBL-001']
      );
    });

    it('should throw error when label not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.markLabelPrinted('NONEXISTENT')).rejects.toThrow(
        'Shipping label NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // TRACKING EVENT METHODS
  // ==========================================================================

  describe('addTrackingEvent', () => {
    it('should add tracking event successfully', async () => {
      const dto: AddTrackingEventDTO = {
        shipmentId: 'SHP-001',
        eventCode: 'IN_TRANSIT',
        eventDescription: 'Package is in transit',
        eventLocation: 'Distribution Center, NY',
        eventDate: new Date('2024-01-02T10:00:00Z'),
        eventSource: 'CARRIER_API',
        rawEventData: { carrierCode: 'FEDEX', statusCode: 'IT' },
      };

      const mockEvent = {
        event_id: 'TEV-001',
        shipment_id: 'SHP-001',
        event_code: 'IN_TRANSIT',
        event_description: 'Package is in transit',
        event_location: 'Distribution Center, NY',
        event_date: '2024-01-02T10:00:00Z',
        event_source: 'CARRIER_API',
        raw_event_data: JSON.stringify(dto.rawEventData),
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockEvent] });

      const result = await service.addTrackingEvent(dto);

      expect(result.eventId).toBe('TEV-001');
      expect(result.eventCode).toBe('IN_TRANSIT');
      expect(logger.info).toHaveBeenCalledWith(
        'Tracking event added',
        expect.objectContaining({
          shipmentId: 'SHP-001',
          eventCode: 'IN_TRANSIT',
        })
      );
    });
  });

  describe('getTrackingEvents', () => {
    it('should return tracking events ordered by date', async () => {
      const mockEvents = [
        {
          event_id: 'TEV-001',
          shipment_id: 'SHP-001',
          event_code: 'DELIVERED',
          event_description: 'Package delivered',
          event_location: 'Front door',
          event_date: '2024-01-05T15:00:00Z',
          event_source: 'CARRIER_API',
          raw_event_data: null,
        },
        {
          event_id: 'TEV-002',
          shipment_id: 'SHP-001',
          event_code: 'IN_TRANSIT',
          event_description: 'Package in transit',
          event_location: 'Distribution Center',
          event_date: '2024-01-02T10:00:00Z',
          event_source: 'CARRIER_API',
          raw_event_data: null,
        },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockEvents });

      const result = await service.getTrackingEvents('SHP-001');

      expect(result).toHaveLength(2);
      expect(result[0].eventCode).toBe('DELIVERED'); // Most recent first
      expect(result[1].eventCode).toBe('IN_TRANSIT');
    });

    it('should return empty array when no events exist', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getTrackingEvents('SHP-001');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle null dimensions gracefully', async () => {
      const mockShipmentRow = {
        shipment_id: 'SHP-001',
        order_id: 'ORD-001',
        carrier_id: 'CARR-001',
        dimensions: null,
        ship_from_address: '{}',
        ship_to_address: '{}',
        total_weight: '10',
        total_packages: '1',
        total_cost: '0',
        status: ShipmentStatus.PENDING,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        service_type: 'express',
        shipping_method: 'ground',
        tracking_number: null,
        tracking_url: null,
        shipping_cost: null,
        insurance_cost: null,
        ship_date: null,
        estimated_delivery_date: null,
        actual_delivery_date: null,
        carrier_shipment_id: null,
        carrier_response: null,
        shipped_at: null,
        delivered_at: null,
        created_by: null,
        shipped_by: null,
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockShipmentRow] });
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getShipment('SHP-001');

      expect(result.dimensions).toBeNull();
    });

    it('should handle optional shipment date', async () => {
      const dto: CreateShipmentDTO = {
        orderId: 'ORD-001',
        carrierId: 'CARR-001',
        serviceType: 'ground',
        shippingMethod: 'ground',
        shipFromAddress: {} as Address,
        shipToAddress: {} as Address,
        totalWeight: 10,
        totalPackages: 1,
        createdBy: 'user-123',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              shipment_id: 'SHP-001',
              order_id: 'ORD-001',
              carrier_id: 'CARR-001',
              status: 'pending',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      global.mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            shipment_id: 'SHP-001',
            order_id: 'ORD-001',
            ship_date: null,
            ship_from_address: '{}',
            ship_to_address: '{}',
            total_weight: '10',
            total_packages: '1',
            total_cost: '0',
            status: 'pending',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            carrier_id: 'CARR-001',
            service_type: 'ground',
            shipping_method: 'ground',
            tracking_number: null,
            tracking_url: null,
            dimensions: null,
            shipping_cost: null,
            insurance_cost: null,
            estimated_delivery_date: null,
            actual_delivery_date: null,
            carrier_shipment_id: null,
            carrier_response: null,
            shipped_at: null,
            delivered_at: null,
            created_by: null,
            shipped_by: null,
          },
        ],
      });
      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // labels

      await service.createShipment(dto);

      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO shipments'),
        expect.arrayContaining([null]) // ship_date should be null
      );
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(shippingService).toBeInstanceOf(ShippingService);
    });
  });
});
