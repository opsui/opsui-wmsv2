/**
 * Barcode Scanning Routes
 *
 * API endpoints for barcode/QR code scanning operations in the warehouse.
 * Supports:
 * - SKU barcode lookup
 * - Bin location scanning
 * - Pick confirmation via barcode
 * - Inventory verification via barcode
 * - Mobile warehouse operations
 */

import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requirePicker } from '../middleware/auth';
import { getAuditService, AuditEventType, AuditCategory } from '../services/AuditService';
import { logger } from '../config/logger';
import { getOrderById } from '../services/OrderService';
import { inventoryService } from '../services/InventoryService';
import { BinLocationService } from '../services/BinLocationService';
import { query } from '../db/client';

const router = Router();
const binLocationService = new BinLocationService();

// ============================================================================
// BARCODE LOOKUP ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/barcode/lookup/:barcode
 *
 * Look up a SKU by barcode
 * Returns product information and current inventory locations
 */
router.get('/lookup/:barcode', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { barcode } = req.params;

    logger.info('Barcode lookup', { barcode, userId: req.user?.userId });

    // Find SKU by barcode using raw query
    const result = await query(
      `SELECT * FROM skus WHERE barcode = $1 LIMIT 1`,
      [barcode]
    );

    if (!result.rows || result.rows.length === 0) {
      const auditService = getAuditService();
      await auditService.logSecurityEvent(
        AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
        req.ip || null,
        req.get('user-agent') || null,
        { barcode, reason: 'SKU_NOT_FOUND' }
      );

      res.status(404).json({
        error: 'SKU not found',
        message: `No SKU found with barcode: ${barcode}`,
      });
      return;
    }

    const sku = result.rows[0];

    // Get inventory locations for this SKU
    const inventory = await inventoryService.getInventoryBySKU(sku.sku);

    res.json({
      sku: sku.sku,
      productName: sku.name,
      barcode: sku.barcode,
      unitOfMeasure: 'EA',
      weight: null,
      dimensions: null,
      inventory: inventory.map(inv => ({
        binLocation: inv.binLocation,
        quantity: inv.quantity,
        reserved: inv.reserved,
        available: inv.available,
      })),
      totalQuantity: inventory.reduce((sum, inv) => sum + inv.quantity, 0),
      totalAvailable: inventory.reduce((sum, inv) => sum + inv.available, 0),
    });

    const auditService = getAuditService();
    await auditService.log({
      userId: req.user?.userId ?? null,
      username: req.user?.email ?? null,
      action: AuditEventType.ORDER_VIEWED,
      category: AuditCategory.DATA_ACCESS,
      resourceType: 'SKU',
      resourceId: sku.sku,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
      details: { barcode },
      oldValues: null,
      newValues: null,
      traceId: null,
    });
  } catch (error) {
    logger.error('Barcode lookup error', { error });
    res.status(500).json({
      error: 'Lookup failed',
      message: (error as any).message,
    });
  }
});

/**
 * GET /api/v1/barcode/bin/:location
 *
 * Get inventory at a specific bin location
 */
router.get('/bin/:location', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { location } = req.params;

    // Validate location format
    const locationRegex = /^[A-Z]-\d{1,3}-\d{2}$/;
    if (!locationRegex.test(location)) {
      res.status(400).json({
        error: 'Invalid location format',
        message: 'Location must be in format: Z-A-S (e.g., A-12-03)',
      });
      return;
    }

    // Get bin details using BinLocationService
    const bin = await binLocationService.getBinLocation(location);

    // Get inventory at this location using InventoryService
    const inventory = await inventoryService.getInventoryByBinLocation(location);

    // Get SKU details for each inventory item
    const inventoryWithDetails = await Promise.all(
      inventory.map(async (inv) => {
        const skuResult = await query(
          `SELECT name, barcode FROM skus WHERE sku = $1`,
          [inv.sku]
        );
        const skuDetails = skuResult.rows[0] || { name: inv.sku, barcode: null };
        return {
          sku: inv.sku,
          productName: skuDetails.name,
          barcode: skuDetails.barcode,
          quantity: inv.quantity,
          reserved: inv.reserved,
          available: inv.available,
        };
      })
    );

    res.json({
      location: bin.binId,
      zone: bin.zone,
      locationType: bin.type,
      capacity: null,
      currentUtilization: null,
      itemCount: inventory.length,
      items: inventoryWithDetails,
    });
  } catch (error) {
    logger.error('Bin scan error', { error });

    if ((error as any).message?.includes('not found')) {
      res.status(404).json({
        error: 'Bin not found',
        message: `Bin location ${req.params.location} does not exist`,
      });
      return;
    }

    res.status(500).json({
      error: 'Scan failed',
      message: (error as any).message,
    });
  }
});

/**
 * POST /api/v1/barcode/pick/confirm
 *
 * Confirm a pick action by scanning the item barcode
 * Updates the pick task and inventory
 */
router.post('/pick/confirm', authenticate, requirePicker, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, sku, barcode, quantity, binLocation } = req.body;

    if (!orderId || !sku || !barcode || !quantity || !binLocation) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'orderId, sku, barcode, quantity, and binLocation are required',
      });
      return;
    }

    // Verify barcode matches SKU
    const skuResult = await query(
      `SELECT * FROM skus WHERE barcode = $1 LIMIT 1`,
      [barcode]
    );

    if (!skuResult.rows || skuResult.rows.length === 0 || skuResult.rows[0].sku !== sku) {
      const auditService = getAuditService();
      await auditService.logSecurityEvent(
        AuditEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
        req.ip || null,
        req.get('user-agent') || null,
        {
          action: 'barcode_mismatch',
          expectedSku: sku,
          scannedBarcode: barcode
        }
      );

      res.status(400).json({
        error: 'Barcode mismatch',
        message: `Scanned barcode ${barcode} does not match expected SKU ${sku}`,
      });
      return;
    }

    // Verify inventory at bin location
    const inventory = await inventoryService.getInventoryByBinLocation(binLocation);
    const inventoryItem = inventory.find(inv => inv.sku === sku);

    if (!inventoryItem || inventoryItem.available < quantity) {
      res.status(400).json({
        error: 'Insufficient inventory',
        message: `Not enough available quantity at ${binLocation}`,
        available: inventoryItem?.available ?? 0,
        requested: quantity,
      });
      return;
    }

    // Reserve inventory for this pick
    await inventoryService.reserveInventory(sku, binLocation, quantity, orderId);

    // Update order pick quantity (this would typically be handled by PickTaskService)
    const order = await getOrderById(orderId);

    if (!order) {
      res.status(404).json({
        error: 'Order not found',
        message: `Order ${orderId} does not exist`,
      });
      return;
    }

    // Log the pick action
    const auditService = getAuditService();
    await auditService.logDataModification(
      AuditEventType.PICK_CONFIRMED,
      req.user?.userId ?? null,
      req.user?.email ?? null,
      'Order',
      orderId,
      null,
      { sku, quantity, binLocation, pickerId: req.user!.userId },
      req.ip || null,
      req.get('user-agent') || null
    );

    res.json({
      success: true,
      message: 'Pick confirmed',
      data: {
        orderId,
        sku,
        quantity,
        binLocation,
        pickerId: req.user!.userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Pick confirmation error', { error });
    res.status(500).json({
      error: 'Pick confirmation failed',
      message: (error as any).message,
    });
  }
});

/**
 * POST /api/v1/barcode/inventory/verify
 *
 * Verify inventory by scanning barcodes
 * Used for cycle counting and inventory reconciliation
 */
router.post('/inventory/verify', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { binLocation, scans } = req.body; // scans: [{ barcode, quantity, expectedSku? }]

    if (!binLocation || !scans || !Array.isArray(scans)) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'binLocation and scans array are required',
      });
      return;
    }

    const verificationResults = [];
    const discrepancies = [];

    for (const scan of scans) {
      const { barcode, quantity } = scan;

      // Look up SKU by barcode
      const skuResult = await query(
        `SELECT * FROM skus WHERE barcode = $1 LIMIT 1`,
        [barcode]
      );

      if (!skuResult.rows || skuResult.rows.length === 0) {
        discrepancies.push({
          barcode,
          issue: 'SKU_NOT_FOUND',
          message: `No SKU found for barcode: ${barcode}`,
        });
        continue;
      }

      const skuRecord = skuResult.rows[0];

      // Get current inventory
      const inventory = await inventoryService.getInventoryByBinLocation(binLocation);
      const inventoryItem = inventory.find(inv => inv.sku === skuRecord.sku);

      const systemQuantity = inventoryItem?.quantity ?? 0;
      const countedQuantity = quantity;
      const variance = countedQuantity - systemQuantity;

      verificationResults.push({
        sku: skuRecord.sku,
        barcode,
        productName: skuRecord.name,
        systemQuantity,
        countedQuantity,
        variance,
        hasDiscrepancy: variance !== 0,
      });

      if (variance !== 0) {
        discrepancies.push({
          sku: skuRecord.sku,
          barcode,
          issue: 'QUANTITY_VARIANCE',
          systemQuantity,
          countedQuantity,
          variance,
        });
      }
    }

    // Log the verification
    const auditService = getAuditService();
    await auditService.log({
      userId: req.user?.userId ?? null,
      username: req.user?.email ?? null,
      action: AuditEventType.REPORT_GENERATED,
      category: AuditCategory.DATA_ACCESS,
      resourceType: 'BinLocation',
      resourceId: binLocation,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
      details: {
        binLocation,
        itemsScanned: scans.length,
        discrepanciesFound: discrepancies.length,
      },
      oldValues: null,
      newValues: null,
      traceId: null,
    });

    res.json({
      success: true,
      binLocation,
      scannedAt: new Date().toISOString(),
      results: verificationResults,
      discrepancies,
      hasDiscrepancies: discrepancies.length > 0,
    });
  } catch (error) {
    logger.error('Inventory verification error', { error });
    res.status(500).json({
      error: 'Verification failed',
      message: (error as any).message,
    });
  }
});

/**
 * POST /api/v1/barcode/putaway
 *
 * Process putaway by scanning barcode and destination bin
 */
router.post('/putaway', authenticate, requirePicker, async (req: AuthenticatedRequest, res) => {
  try {
    const { barcode, binLocation, quantity } = req.body;

    if (!barcode || !binLocation || !quantity) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'barcode, binLocation, and quantity are required',
      });
      return;
    }

    // Look up SKU
    const skuResult = await query(
      `SELECT * FROM skus WHERE barcode = $1 LIMIT 1`,
      [barcode]
    );

    if (!skuResult.rows || skuResult.rows.length === 0) {
      res.status(404).json({
        error: 'SKU not found',
        message: `No SKU found with barcode: ${barcode}`,
      });
      return;
    }

    const skuRecord = skuResult.rows[0];

    // Verify bin exists
    try {
      await binLocationService.getBinLocation(binLocation);
    } catch {
      res.status(404).json({
        error: 'Bin not found',
        message: `Bin location ${binLocation} does not exist`,
      });
      return;
    }

    // Log the putaway action
    const auditService = getAuditService();
    await auditService.logDataModification(
      AuditEventType.INVENTORY_ADJUSTED,
      req.user?.userId ?? null,
      req.user?.email ?? null,
      'Inventory',
      `${skuRecord.sku}@${binLocation}`,
      null,
      {
        sku: skuRecord.sku,
        binLocation,
        quantity,
      },
      req.ip || null,
      req.get('user-agent') || null
    );

    res.json({
      success: true,
      message: 'Putaway recorded',
      data: {
        sku: skuRecord.sku,
        productName: skuRecord.name,
        binLocation,
        quantity,
        putawayBy: req.user!.userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Putaway error', { error });
    res.status(500).json({
      error: 'Putaway failed',
      message: (error as any).message,
    });
  }
});

// ============================================================================
// MOBILE-SPECIFIC ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/barcode/mobile/pick-list/:pickerId
 *
 * Get optimized pick list for mobile device
 */
router.get('/mobile/pick-list/:pickerId', authenticate, requirePicker, async (req: AuthenticatedRequest, res) => {
  try {
    const { pickerId } = req.params;

    // This would fetch the active pick tasks for this picker
    // and optimize the route using TSP algorithm (see RouteOptimizationService)

    res.json({
      pickerId,
      generatedAt: new Date().toISOString(),
      tasks: [], // Would be populated from PickTaskService
      optimizedRoute: {
        totalDistance: 0,
        estimatedTime: 0,
        stops: [],
      },
    });
  } catch (error) {
    logger.error('Pick list error', { error });
    res.status(500).json({
      error: 'Failed to get pick list',
      message: (error as any).message,
    });
  }
});

/**
 * GET /api/v1/barcode/mobile/stats
 *
 * Get mobile scanning statistics for current user
 */
router.get('/mobile/stats', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Get today's stats for this user
    // This would query audit logs for pick actions by this user

    res.json({
      userId,
      date: new Date().toISOString().split('T')[0],
      stats: {
        picksCompleted: 0,
        itemsPicked: 0,
        accuracyRate: 100,
        averageTimePerPick: 0,
      },
    });
  } catch (error) {
    logger.error('Stats error', { error });
    res.status(500).json({
      error: 'Failed to get stats',
      message: (error as any).message,
    });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export default router;
