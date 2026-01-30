/**
 * Shipping Service
 *
 * Handles shipping carriers, shipments, labels, and tracking
 */

import { getPool } from '../db/client';
import { logger } from '../config/logger';
import { nanoid } from 'nanoid';
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
import {
  notifyUser,
  broadcastEvent,
  NotificationType,
  NotificationPriority,
} from './NotificationHelper';

// ============================================================================
// SHIPPING SERVICE
// ============================================================================

export class ShippingService {
  // ==========================================================================
  // CARRIER METHODS
  // ==========================================================================

  /**
   * Get all active carriers
   */
  async getActiveCarriers(): Promise<Carrier[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM carriers WHERE is_active = true ORDER BY
        CASE
          WHEN carrier_id LIKE 'CARR-%' THEN 0
          ELSE 1
        END,
        name`,
      []
    );

    return result.rows.map(row => this.mapRowToCarrier(row));
  }

  /**
   * Get carrier by ID
   */
  async getCarrier(carrierId: string): Promise<Carrier> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM carriers WHERE carrier_id = $1`, [carrierId]);

    if (result.rows.length === 0) {
      throw new Error(`Carrier ${carrierId} not found`);
    }

    return this.mapRowToCarrier(result.rows[0]);
  }

  // ==========================================================================
  // SHIPPED ORDERS METHODS
  // ==========================================================================

  /**
   * Get all shipped orders with filters and pagination
   */
  async getShippedOrders(filters?: {
    status?: string;
    carrierId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{
    orders: Array<{
      id: string;
      orderId: string;
      customerName: string;
      status: string;
      priority: string;
      itemCount: number;
      totalValue: number;
      shippedAt: string;
      deliveredAt?: string;
      trackingNumber?: string;
      carrier?: string;
      shippingAddress: string;
      shippedBy: string;
    }>;
    stats: {
      totalShipped: number;
      totalValue: number;
      delivered: number;
      pendingDelivery: number;
    };
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const client = await getPool();
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = ["o.status = 'SHIPPED'"];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.carrierId) {
      conditions.push(`s.carrier_id = $${paramCount}`);
      params.push(filters.carrierId);
      paramCount++;
    }

    if (filters?.startDate) {
      conditions.push(`s.shipped_at >= $${paramCount}`);
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters?.endDate) {
      conditions.push(`s.shipped_at <= $${paramCount}`);
      params.push(filters.endDate);
      paramCount++;
    }

    if (filters?.search) {
      conditions.push(`(
        o.order_id ILIKE $${paramCount} OR
        s.tracking_number ILIKE $${paramCount} OR
        s.ship_to_address::text ILIKE $${paramCount}
      )`);
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    // Build ORDER BY clause
    const sortBy = filters?.sortBy || 'shipped_at';
    const sortOrder = filters?.sortOrder || 'desc';
    const orderBy = `${sortBy} ${sortOrder.toUpperCase()}`;

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count
       FROM orders o
       LEFT JOIN shipments s ON o.order_id = s.order_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    // Get orders with calculated item_count
    const result = await client.query(
      `SELECT
        o.order_id,
        o.customer_name,
        o.status,
        o.priority,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as item_count,
        0 as total_value,
        s.shipped_at,
        s.delivered_at,
        s.tracking_number,
        s.carrier_id,
        s.ship_to_address,
        s.shipped_by
       FROM orders o
       LEFT JOIN shipments s ON o.order_id = s.order_id
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const orders = result.rows.map(row => ({
      id: row.order_id,
      orderId: row.order_id,
      customerName: row.customer_name || 'N/A',
      status: row.status,
      priority: row.priority,
      itemCount: parseInt(row.item_count, 10),
      totalValue: parseFloat(row.total_value) || 0,
      shippedAt: row.shipped_at ? new Date(row.shipped_at).toISOString() : new Date().toISOString(),
      deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : undefined,
      trackingNumber: row.tracking_number,
      carrier: row.carrier_id,
      shippingAddress:
        typeof row.ship_to_address === 'string'
          ? row.ship_to_address
          : JSON.stringify(row.ship_to_address),
      shippedBy: row.shipped_by || 'System',
    }));

    // Get stats
    const statsResult = await client.query(
      `SELECT
        COUNT(*) as total_shipped,
        0 as total_value,
        COUNT(*) FILTER (WHERE s.delivered_at IS NOT NULL) as delivered,
        COUNT(*) FILTER (WHERE s.delivered_at IS NULL) as pending_delivery
       FROM orders o
       LEFT JOIN shipments s ON o.order_id = s.order_id
       WHERE o.status = 'SHIPPED'`
    );

    const stats = {
      totalShipped: parseInt(statsResult.rows[0].total_shipped, 10),
      totalValue: parseFloat(statsResult.rows[0].total_value) || 0,
      delivered: parseInt(statsResult.rows[0].delivered, 10),
      pendingDelivery: parseInt(statsResult.rows[0].pending_delivery, 10),
    };

    return {
      orders,
      stats,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Export shipped orders to CSV
   */
  async exportShippedOrdersToCSV(orderIds: string[]): Promise<string> {
    const client = await getPool();

    const result = await client.query(
      `SELECT
        o.order_id,
        o.customer_name,
        o.status,
        o.priority,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as item_count,
        0 as total_value,
        s.shipped_at,
        s.delivered_at,
        s.tracking_number,
        s.carrier_id,
        s.ship_to_address,
        s.shipped_by
       FROM orders o
       LEFT JOIN shipments s ON o.order_id = s.order_id
       WHERE o.order_id = ANY($1)
       ORDER BY s.shipped_at DESC`,
      [orderIds]
    );

    // Build CSV
    const headers = [
      'Order ID',
      'Customer Name',
      'Status',
      'Priority',
      'Item Count',
      'Total Value',
      'Shipped At',
      'Delivered At',
      'Tracking Number',
      'Carrier',
      'Shipping Address',
      'Shipped By',
    ];

    const rows = result.rows.map(row => [
      row.order_id,
      row.customer_name || 'N/A',
      row.status,
      row.priority,
      row.item_count,
      row.total_value,
      row.shipped_at || '',
      row.delivered_at || '',
      row.tracking_number || '',
      row.carrier_id || '',
      typeof row.ship_to_address === 'string'
        ? `"${row.ship_to_address.replace(/"/g, '""')}"`
        : JSON.stringify(row.ship_to_address),
      row.shipped_by || 'System',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // ==========================================================================
  // SHIPMENT METHODS
  // ==========================================================================

  /**
   * Create a new shipment
   */
  async createShipment(dto: CreateShipmentDTO): Promise<Shipment> {
    const client = await getPool();

    try {
      await client.query('BEGIN');

      // Generate shipment ID
      const shipmentId = `SHP-${nanoid(10)}`.toUpperCase();

      // Insert shipment
      const result = await client.query(
        `INSERT INTO shipments
          (shipment_id, order_id, carrier_id, service_type, shipping_method,
           ship_from_address, ship_to_address, total_weight, total_packages,
           dimensions, ship_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          shipmentId,
          dto.orderId,
          dto.carrierId,
          dto.serviceType,
          dto.shippingMethod,
          JSON.stringify(dto.shipFromAddress),
          JSON.stringify(dto.shipToAddress),
          dto.totalWeight,
          dto.totalPackages,
          dto.dimensions ? JSON.stringify(dto.dimensions) : null,
          dto.shipDate || null,
          dto.createdBy,
        ]
      );

      await client.query('COMMIT');

      logger.info('Shipment created', { shipmentId, orderId: dto.orderId });
      return await this.getShipment(shipmentId);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating shipment', error);
      throw error;
    }
  }

  /**
   * Get shipment by ID
   */
  async getShipment(shipmentId: string): Promise<Shipment> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM shipments WHERE shipment_id = $1`, [
      shipmentId,
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    const shipment = this.mapRowToShipment(result.rows[0]);

    // Get labels
    const labelsResult = await client.query(
      `SELECT * FROM shipping_labels WHERE shipment_id = $1 ORDER BY package_number`,
      [shipmentId]
    );

    shipment.labels = labelsResult.rows.map(row => this.mapRowToShippingLabel(row));

    return shipment;
  }

  /**
   * Get shipment by order ID
   */
  async getShipmentByOrderId(orderId: string): Promise<Shipment | null> {
    const client = await getPool();

    const result = await client.query(`SELECT * FROM shipments WHERE order_id = $1`, [orderId]);

    if (result.rows.length === 0) {
      return null;
    }

    const shipment = this.mapRowToShipment(result.rows[0]);

    // Get labels
    const labelsResult = await client.query(
      `SELECT * FROM shipping_labels WHERE shipment_id = $1 ORDER BY package_number`,
      [shipment.shipmentId]
    );

    shipment.labels = labelsResult.rows.map(row => this.mapRowToShippingLabel(row));

    return shipment;
  }

  /**
   * Get all shipments with optional filters
   */
  async getAllShipments(filters?: {
    status?: ShipmentStatus;
    carrierId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ shipments: Shipment[]; total: number }> {
    const client = await getPool();

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.carrierId) {
      conditions.push(`carrier_id = $${paramCount}`);
      params.push(filters.carrierId);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM shipments WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM shipments
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const shipments = await Promise.all(
      result.rows.map(async row => {
        const shipment = this.mapRowToShipment(row);
        // Get labels for each shipment
        const labelsResult = await client.query(
          `SELECT * FROM shipping_labels WHERE shipment_id = $1 ORDER BY package_number`,
          [shipment.shipmentId]
        );
        shipment.labels = labelsResult.rows.map(r => this.mapRowToShippingLabel(r));
        return shipment;
      })
    );

    return { shipments, total };
  }

  /**
   * Update shipment status
   */
  async updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus,
    userId?: string
  ): Promise<Shipment> {
    const client = await getPool();

    const updateFields: string[] = ['status = $1', 'updated_at = NOW()'];
    const updateParams: any[] = [status];
    let paramCount = 2;

    if (userId && status === ShipmentStatus.SHIPPED) {
      updateFields.push(`shipped_at = $${paramCount}`);
      updateParams.push(new Date().toISOString());
      paramCount++;
      updateFields.push(`shipped_by = $${paramCount}`);
      updateParams.push(userId);
      paramCount++;
    }

    updateParams.push(shipmentId);
    paramCount++;

    const result = await client.query(
      `UPDATE shipments
       SET ${updateFields.join(', ')}
       WHERE shipment_id = $${paramCount}
       RETURNING *`,
      updateParams
    );

    if (result.rows.length === 0) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    logger.info('Shipment status updated', { shipmentId, status, userId });

    const shipment = await this.getShipment(shipmentId);

    // Send notification when shipment is shipped
    if (status === ShipmentStatus.SHIPPED && userId) {
      await notifyUser({
        userId,
        type: NotificationType.ORDER_SHIPPED,
        title: 'Order Shipped',
        message: `Order ${shipment.orderId} has been shipped via ${shipment.carrierId}`,
        priority: NotificationPriority.NORMAL,
        data: {
          shipmentId,
          orderId: shipment.orderId,
          carrierId: shipment.carrierId,
          trackingNumber: shipment.trackingNumber,
        },
      });

      // Broadcast to all connected clients
      broadcastEvent('order:shipped' as any, {
        orderId: shipment.orderId,
        shipmentId,
        trackingNumber: shipment.trackingNumber,
      });
    }

    return shipment;
  }

  /**
   * Add tracking number to shipment
   */
  async addTrackingNumber(
    shipmentId: string,
    trackingNumber: string,
    trackingUrl?: string
  ): Promise<Shipment> {
    const client = await getPool();

    const result = await client.query(
      `UPDATE shipments
       SET tracking_number = $1,
           tracking_url = $2,
           updated_at = NOW()
       WHERE shipment_id = $3
       RETURNING *`,
      [trackingNumber, trackingUrl || null, shipmentId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    logger.info('Tracking number added', { shipmentId, trackingNumber });
    return await this.getShipment(shipmentId);
  }

  // ==========================================================================
  // SHIPPING LABEL METHODS
  // ==========================================================================

  /**
   * Create shipping labels for a shipment
   */
  async createShippingLabel(dto: CreateShippingLabelDTO): Promise<ShippingLabel> {
    const client = await getPool();

    const labelId = `LBL-${nanoid(10)}`.toUpperCase();

    const result = await client.query(
      `INSERT INTO shipping_labels
        (label_id, shipment_id, package_number, package_weight, package_dimensions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        labelId,
        dto.shipmentId,
        dto.packageNumber,
        dto.packageWeight,
        dto.packageDimensions ? JSON.stringify(dto.packageDimensions) : null,
        dto.createdBy,
      ]
    );

    // Update shipment status to LABEL_CREATED if all labels are created
    await this.updateShipmentLabelStatus(dto.shipmentId);

    logger.info('Shipping label created', { labelId, shipmentId: dto.shipmentId });
    return this.mapRowToShippingLabel(result.rows[0]);
  }

  /**
   * Mark label as printed
   */
  async markLabelPrinted(labelId: string): Promise<ShippingLabel> {
    const client = await getPool();

    const result = await client.query(
      `UPDATE shipping_labels
       SET printed_at = NOW()
       WHERE label_id = $1
       RETURNING *`,
      [labelId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Shipping label ${labelId} not found`);
    }

    return this.mapRowToShippingLabel(result.rows[0]);
  }

  /**
   * Update shipment status based on label completion
   */
  private async updateShipmentLabelStatus(shipmentId: string): Promise<void> {
    const client = await getPool();

    // Get shipment to check total packages
    const shipmentResult = await client.query(
      `SELECT total_packages FROM shipments WHERE shipment_id = $1`,
      [shipmentId]
    );

    if (shipmentResult.rows.length === 0) {
      return;
    }

    const totalPackages = parseInt(shipmentResult.rows[0].total_packages, 10);

    // Count created labels
    const labelCountResult = await client.query(
      `SELECT COUNT(*) as count FROM shipping_labels WHERE shipment_id = $1`,
      [shipmentId]
    );

    const labelCount = parseInt(labelCountResult.rows[0].count, 10);

    // If all labels created, update status
    if (labelCount >= totalPackages) {
      await client.query(
        `UPDATE shipments
         SET status = $1, updated_at = NOW()
         WHERE shipment_id = $2`,
        [ShipmentStatus.LABEL_CREATED, shipmentId]
      );
    }
  }

  // ==========================================================================
  // TRACKING EVENT METHODS
  // ==========================================================================

  /**
   * Add tracking event to shipment
   */
  async addTrackingEvent(dto: AddTrackingEventDTO): Promise<ShipmentTrackingEvent> {
    const client = await getPool();

    const eventId = `TEV-${nanoid(10)}`.toUpperCase();

    const result = await client.query(
      `INSERT INTO shipment_tracking_events
        (event_id, shipment_id, event_code, event_description, event_location, event_date, event_source, raw_event_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        eventId,
        dto.shipmentId,
        dto.eventCode,
        dto.eventDescription,
        dto.eventLocation || null,
        dto.eventDate,
        dto.eventSource,
        dto.rawEventData ? JSON.stringify(dto.rawEventData) : null,
      ]
    );

    logger.info('Tracking event added', {
      eventId,
      shipmentId: dto.shipmentId,
      eventCode: dto.eventCode,
    });

    return this.mapRowToTrackingEvent(result.rows[0]);
  }

  /**
   * Get tracking events for shipment
   */
  async getTrackingEvents(shipmentId: string): Promise<ShipmentTrackingEvent[]> {
    const client = await getPool();

    const result = await client.query(
      `SELECT * FROM shipment_tracking_events
       WHERE shipment_id = $1
       ORDER BY event_date DESC`,
      [shipmentId]
    );

    return result.rows.map(row => this.mapRowToTrackingEvent(row));
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private mapRowToCarrier(row: any): Carrier {
    return {
      carrierId: row.carrier_id,
      name: row.name,
      carrierCode: row.carrier_code,
      serviceTypes: row.service_types || [],
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      apiEndpoint: row.api_endpoint,
      isActive: row.is_active,
      requiresAccountNumber: row.requires_account_number,
      requiresPackageDimensions: row.requires_package_dimensions,
      requiresWeight: row.requires_weight,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToShipment(row: any): Shipment {
    return {
      shipmentId: row.shipment_id,
      orderId: row.order_id,
      carrierId: row.carrier_id,
      serviceType: row.service_type,
      shippingMethod: row.shipping_method,
      trackingNumber: row.tracking_number,
      trackingUrl: row.tracking_url,
      shipFromAddress: row.ship_from_address as Address,
      shipToAddress: row.ship_to_address as Address,
      totalWeight: parseFloat(row.total_weight),
      totalPackages: parseInt(row.total_packages, 10),
      dimensions: row.dimensions as any,
      shippingCost: row.shipping_cost ? parseFloat(row.shipping_cost) : undefined,
      insuranceCost: row.insurance_cost ? parseFloat(row.insurance_cost) : undefined,
      totalCost: parseFloat(row.total_cost),
      status: row.status,
      shipDate: row.ship_date ? new Date(row.ship_date) : undefined,
      estimatedDeliveryDate: row.estimated_delivery_date
        ? new Date(row.estimated_delivery_date)
        : undefined,
      actualDeliveryDate: row.actual_delivery_date ? new Date(row.actual_delivery_date) : undefined,
      carrierShipmentId: row.carrier_shipment_id,
      carrierResponse: row.carrier_response,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      shippedAt: row.shipped_at ? new Date(row.shipped_at) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
      createdBy: row.created_by,
      shippedBy: row.shipped_by,
    };
  }

  private mapRowToShippingLabel(row: any): ShippingLabel {
    return {
      labelId: row.label_id,
      shipmentId: row.shipment_id,
      labelFormat: row.label_format,
      labelUrl: row.label_url,
      labelData: row.label_data,
      packageNumber: parseInt(row.package_number, 10),
      packageWeight: parseFloat(row.package_weight),
      packageDimensions: row.package_dimensions as any,
      carrierTrackingNumber: row.carrier_tracking_number,
      createdAt: new Date(row.created_at),
      printedAt: row.printed_at ? new Date(row.printed_at) : undefined,
      createdBy: row.created_by,
    };
  }

  private mapRowToTrackingEvent(row: any): ShipmentTrackingEvent {
    return {
      eventId: row.event_id,
      shipmentId: row.shipment_id,
      eventCode: row.event_code,
      eventDescription: row.event_description,
      eventLocation: row.event_location,
      eventDate: new Date(row.event_date),
      eventSource: row.event_source,
      rawEventData: row.raw_event_data,
    };
  }
}

// Singleton instance
export const shippingService = new ShippingService();
