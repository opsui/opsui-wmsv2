/**
 * NZC (NZ Couriers) routes
 *
 * Endpoints for NZC-specific operations including rates, shipments, and labels
 */

import { Router } from 'express';
import { nzcService } from '../services/NZCService';
import { asyncHandler, authenticate, authorize } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@opsui/shared';

const router = Router();

// All NZC routes require authentication
router.use(authenticate);

// ============================================================================
// RATE QUOTE ROUTES
// ============================================================================

/**
 * POST /api/nzc/rates
 * Get shipping rates from NZC
 *
 * Request body:
 * {
 *   "destination": {
 *     "name": "Company Name",
 *     "company": "Company Name",
 *     "addressLine1": "123 Main Street",
 *     "city": "Palmerston North",
 *     "state": "",
 *     "postalCode": "4410",
 *     "country": "NEW ZEALAND",
 *     "phone": "+64 21 123 4567",
 *     "email": "john@example.com"
 *   },
 *   "packages": [
 *     {
 *       "length": 10,   // in cm
 *       "width": 10,    // in cm
 *       "height": 10,   // in cm
 *       "weight": 5,    // in kg
 *       "units": 1
 *     }
 *   ]
 * }
 */
router.post(
  '/rates',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { destination, packages } = req.body;

    // Validate required fields
    if (!destination || !packages || packages.length === 0) {
      res.status(400).json({
        error: 'Missing required fields: destination and packages',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate destination address
    if (
      !destination.addressLine1 ||
      !destination.city ||
      !destination.postalCode ||
      !destination.country
    ) {
      res.status(400).json({
        error: 'Incomplete destination address',
        code: 'INVALID_ADDRESS',
      });
      return;
    }

    // Validate packages
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      if (!pkg.weight || pkg.weight <= 0) {
        res.status(400).json({
          error: `Package ${i + 1}: weight must be greater than 0`,
          code: 'INVALID_PACKAGE_WEIGHT',
        });
        return;
      }
    }

    // Convert to NZC format
    const nzcDestination = {
      Name: destination.company || destination.name || 'Customer',
      NameDisplay: destination.company
        ? `${destination.company} - ${destination.city}`
        : `${destination.name} - ${destination.city}`,
      Address: {
        StreetAddress: destination.addressLine1,
        Suburb: destination.city,
        Postcode: destination.postalCode,
        Country: destination.country === 'NZ' ? 'NEW ZEALAND' : destination.country,
        State: destination.state || '',
      },
      ContactPerson: destination.name,
      PhoneNumber: destination.phone || '',
      Email: destination.email || '',
    };

    const nzcPackages = packages.map((pkg: any) => ({
      Length: pkg.length || 0,
      Width: pkg.width || 0,
      Height: pkg.height || 0,
      Kg: pkg.weight,
      Units: pkg.units || 1,
    }));

    const result = await nzcService.getRates(nzcDestination, nzcPackages);
    res.json(result);
  })
);

// ============================================================================
// SHIPMENT ROUTES
// ============================================================================

/**
 * POST /api/nzc/shipments
 * Create a shipment with NZC
 *
 * Request body:
 * {
 *   "destination": { ... },  // same as rates
 *   "packages": [ ... ],     // same as rates
 *   "quoteId": "unique_quote_id_from_rates"
 * }
 */
router.post(
  '/shipments',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { destination, packages, quoteId } = req.body;

    // Validate required fields
    if (!destination || !packages || !quoteId || packages.length === 0) {
      res.status(400).json({
        error: 'Missing required fields: destination, packages, and quoteId',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate destination address
    if (
      !destination.addressLine1 ||
      !destination.city ||
      !destination.postalCode ||
      !destination.country
    ) {
      res.status(400).json({
        error: 'Incomplete destination address',
        code: 'INVALID_ADDRESS',
      });
      return;
    }

    // Convert to NZC format
    const nzcDestination = {
      Name: destination.company || destination.name || 'Customer',
      NameDisplay: destination.company
        ? `${destination.company} - ${destination.city}`
        : `${destination.name} - ${destination.city}`,
      Address: {
        StreetAddress: destination.addressLine1,
        Suburb: destination.city,
        Postcode: destination.postalCode,
        Country: destination.country === 'NZ' ? 'NEW ZEALAND' : destination.country,
        State: destination.state || '',
      },
      ContactPerson: destination.name,
      PhoneNumber: destination.phone || '',
      Email: destination.email || '',
    };

    const nzcPackages = packages.map((pkg: any) => ({
      Length: pkg.length || 0,
      Width: pkg.width || 0,
      Height: pkg.height || 0,
      Kg: pkg.weight,
      Units: pkg.units || 1,
    }));

    const result = await nzcService.createShipment(nzcDestination, nzcPackages, quoteId);
    res.status(201).json(result);
  })
);

// ============================================================================
// LABEL ROUTES
// ============================================================================

/**
 * GET /api/nzc/labels/:connote
 * Get a shipping label as base64 data
 *
 * Query params:
 * - format: LABEL_PNG_100X175 (default), LABEL_PNG_100X150, LABEL_PDF_100X175, LABEL_PDF
 */
router.get(
  '/labels/:connote',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connote } = req.params;
    const format = (req.query.format as string) || 'LABEL_PNG_100X175';

    const result = await nzcService.getLabel(connote, format as any);

    // Return the label data with content type
    res.json({
      connote,
      format: result.format,
      contentType: result.contentType,
      data: result.data,
    });
  })
);

/**
 * POST /api/nzc/labels/:connote/reprint
 * Reprint a shipping label (sends to printer)
 *
 * Request body:
 * {
 *   "copies": 1,
 *   "printerName": "Printer Name"  // optional
 * }
 */
router.post(
  '/labels/:connote/reprint',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { connote } = req.params;
    const { copies = 1, printerName } = req.body;

    await nzcService.reprintLabel(connote, copies, printerName);
    res.json({
      success: true,
      message: `Label reprint queued for ${copies} copy/copies`,
    });
  })
);

// ============================================================================
// UTILITY ROUTES
// ============================================================================

/**
 * GET /api/nzc/printers
 * Get available printers from NZC
 */
router.get(
  '/printers',
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const printers = await nzcService.getPrinters();
    res.json(printers);
  })
);

/**
 * GET /api/nzc/stocksizes
 * Get available stock sizes from NZC
 */
router.get(
  '/stocksizes',
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const stockSizes = await nzcService.getStockSizes();
    res.json(stockSizes);
  })
);

export default router;
