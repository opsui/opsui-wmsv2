/**
 * Audit Logging Middleware
 *
 * Logs ALL API requests to the audit_logs table for comprehensive tracking.
 * This ensures complete visibility into all system activity regardless of role.
 *
 * Logs captured:
 * - Every API request (GET, POST, PUT, PATCH, DELETE)
 * - Request body for write operations
 * - Response status
 * - User identity (if authenticated)
 * - IP address and user agent
 * - Request duration
 */

import { Request, Response, NextFunction } from 'express';
import { getAuditService, AuditEventType, AuditCategory } from '../services/AuditService';
import { getPool } from '../db/client';
import { AuthenticatedRequest } from './auth';

// Note: We use AuthenticatedRequest for requests that may have user information
// For unauthenticated requests, we use the regular Request type

// Store request start time
const REQUEST_START_TIME = Symbol('requestStartTime');

/**
 * Paths to exclude from audit logging (health checks, static assets, dashboard auto-refresh, etc.)
 */
const EXCLUDED_PATHS = [
  '/health',
  '/api/health',
  '/favicon.ico',
  '/public',
  // Dashboard metrics auto-refresh (excludes frequent polling endpoints)
  // Both with and without /api prefix since middleware is mounted at /api
  '/metrics/picker-activity',
  '/api/metrics/picker-activity',
  '/metrics/packer-activity',
  '/api/metrics/packer-activity',
  '/metrics/stock-controller-activity',
  '/api/metrics/stock-controller-activity',
  '/metrics/dashboard',
  '/api/metrics/dashboard',
  '/metrics/pickers/performance',
  '/api/metrics/pickers/performance',
  '/metrics/packers/performance',
  '/api/metrics/packers/performance',
  '/metrics/stock-controllers/performance',
  '/api/metrics/stock-controllers/performance',
  '/metrics/orders/throughput',
  '/api/metrics/orders/throughput',
  '/metrics/orders/status',
  '/api/metrics/orders/status',
  '/metrics/orders/status-breakdown',
  '/api/metrics/orders/status-breakdown',
  '/metrics/skus/top-picked',
  '/api/metrics/skus/top-picked',
  '/metrics/pickers',
  '/api/metrics/pickers',
  '/metrics/packers',
  '/api/metrics/packers',
  '/metrics/stock-controllers',
  '/api/metrics/stock-controllers',
  // Location capacity polling (10-15 second intervals)
  '/location-capacity/locations',
  '/api/location-capacity/locations',
  '/location-capacity/alerts',
  '/api/location-capacity/alerts',
  '/location-capacity/rules',
  '/api/location-capacity/rules',
  // Role assignments - only exclude GET requests for listing/viewing
  // POST (grant) and DELETE (revoke) should be logged as they are admin actions
  // Note: GET requests are already excluded by the method check below
  // Audit logs viewing (viewing audit logs shouldn't create more audit logs)
  '/audit/logs',
  '/api/audit/logs',
  '/audit/statistics',
  '/api/audit/statistics',
  '/audit/resource/',
  '/api/audit/resource/',
  '/audit/user/',
  '/api/audit/user/',
  '/audit/security-events',
  '/api/audit/security-events',
  '/audit/categories',
  '/api/audit/categories',
  '/audit/actions',
  '/api/audit/actions',
  '/audit/users',
  '/api/audit/users',
  '/audit/resource-types',
  '/api/audit/resource-types',
  // Role assignments - routes handle their own detailed audit logging with user names
  '/role-assignments',
  '/api/role-assignments',
  // Current view and set-idle endpoints (user activity tracking)
  '/auth/current-view',
  '/api/auth/current-view',
  '/auth/set-idle',
  '/api/auth/set-idle',
  '/auth/active-role',
  '/api/auth/active-role',
  // Token refresh (happens frequently, not useful to audit)
  '/auth/refresh',
  '/api/auth/refresh',
];

/**
 * Should this request be excluded from audit logging?
 */
function shouldExclude(req: Request): boolean {
  const fullPath = (req as any).originalUrl || req.path;
  const method = req.method;

  // Check path-based exclusions
  if (EXCLUDED_PATHS.some(path => fullPath.startsWith(path) || fullPath.includes(path))) {
    return true;
  }

  // Exclude all GET requests - they are just viewing, not actions
  if (method === 'GET') {
    return true;
  }

  // Exclude picker-status heartbeat updates
  if (fullPath.includes('/picker-status')) {
    return true;
  }

  return false;
}

/**
 * Get resource type from request path
 */
function getResourceType(path: string, _method: string): string {
  // Remove /api prefix if present
  const cleanPath = path.replace(/^\/api\//, '/');

  // Extract resource type from path
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length > 0) {
    return segments[0];
  }

  return 'unknown';
}

/**
 * Get resource ID from request path or params
 */
function getResourceId(req: Request): string | null {
  // Check for ID in path params
  if (req.params && Object.keys(req.params).length > 0) {
    const idParam =
      req.params.id ||
      req.params.orderId ||
      req.params.userId ||
      req.params.sku ||
      req.params.locationId ||
      req.params.roleId;
    if (idParam) {
      console.log('[AuditMiddleware] resourceId from params:', idParam);
      return idParam;
    }
  }

  // Extract from path directly (e.g., /api/orders/SO71004/pick -> SO71004)
  const fullPath = (req as any).originalUrl || req.path;
  const cleanPath = fullPath.replace(/^\/api\//, '/');
  console.log('[AuditMiddleware] Extracting resourceId from path:', fullPath, '->', cleanPath);

  // Match patterns like /orders/SO71004/..., /SO71004/..., etc.
  // Try multiple patterns to handle different route structures
  const patterns = [
    /\/orders\/([A-Z]+[\d-]+)/i, // /orders/SO71004/pick
    /\/([A-Z]+[\d-]+)\/pick$/, // /SO71004/pick
    /\/([A-Z]+[\d-]+)\//, // /SO71004/anything
  ];

  for (const pattern of patterns) {
    const match = cleanPath.match(pattern);
    if (match && match[1]) {
      console.log('[AuditMiddleware] resourceId matched from pattern:', pattern, '->', match[1]);
      return match[1];
    }
  }

  // Check for ID in query params
  if (req.query && typeof req.query === 'object') {
    const idParam =
      req.query.id ||
      req.query.order_id ||
      req.query.user_id ||
      (req.query as any).sku ||
      (req.query as any).location_id;
    if (idParam && typeof idParam === 'string') return idParam;
  }

  // For shipment creation, check request body for orderId
  if (req.body && typeof req.body === 'object' && (req.body as any).orderId) {
    return (req.body as any).orderId;
  }

  console.log('[AuditMiddleware] resourceId not found, returning null');
  return null;
}

/**
 * Get audit event type based on request method and path
 */
function getAuditEventType(req: Request): AuditEventType {
  // Use originalUrl to get the full path, as req.path gets modified by nested routers
  const { method, originalUrl } = req as any;
  const fullPath = originalUrl || req.path;
  const cleanPath = fullPath.replace(/^\/api\//, '/');

  // Auth events
  if (cleanPath.includes('/auth/login')) return AuditEventType.LOGIN_SUCCESS;
  if (cleanPath.includes('/auth/logout')) return AuditEventType.LOGOUT;
  // Logout without /auth prefix (some routes may be mounted differently)
  if (cleanPath === '/logout' || cleanPath.endsWith('/logout')) return AuditEventType.LOGOUT;
  // Current view updates (user tracking their current view)
  if (cleanPath.includes('/current-view')) return AuditEventType.API_ACCESS;

  // User management
  if (cleanPath.includes('/users')) {
    if (method === 'POST') return AuditEventType.USER_CREATED;
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.USER_UPDATED;
    if (method === 'DELETE') return AuditEventType.USER_DELETED;
  }

  // Role management
  if (cleanPath.includes('/roles')) {
    if (method === 'POST') return AuditEventType.CUSTOM_ROLE_CREATED;
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.CUSTOM_ROLE_UPDATED;
    if (method === 'DELETE') return AuditEventType.CUSTOM_ROLE_DELETED;
  }

  // Role assignments
  if (cleanPath.includes('/role-assignments')) {
    if (method === 'POST') return AuditEventType.ROLE_GRANTED;
    if (method === 'DELETE') return AuditEventType.ROLE_REVOKED;
  }

  // Individual item scans - picker scans an item during picking
  // IMPORTANT: Check BEFORE generic orders POST to avoid misclassifying picks as order creation
  // Routes: POST /api/orders/:orderId/pick, POST /:orderId/pick (order ID directly)
  if (cleanPath.includes('/orders/') && cleanPath.includes('/pick')) {
    if (method === 'POST' || method === 'PATCH') return AuditEventType.ITEM_SCANNED;
  }
  // Also handle direct order ID paths like /SO7136/pick
  if (cleanPath.match(/^\/[A-Z]+[\d-]+\/pick$/)) {
    if (method === 'POST' || method === 'PATCH') return AuditEventType.ITEM_SCANNED;
  }

  // Order completion - picker completes all picking for an order
  // Routes: POST /api/orders/:orderId/complete (when called by picker)
  if (cleanPath.includes('/orders') && cleanPath.endsWith('/complete')) {
    if (method === 'POST') return AuditEventType.PICK_CONFIRMED;
  }

  // Undo pick - picker undoes a pick on an order
  // Routes: POST /api/orders/:orderId/undo-pick
  if (cleanPath.includes('/orders') && cleanPath.includes('/undo-pick')) {
    if (method === 'POST' || method === 'PATCH') return AuditEventType.PICK_CONFIRMED;
  }

  // Verify packing - packer verifies an item is packed
  // Routes: POST /api/orders/:orderId/verify-packing
  if (cleanPath.includes('/orders') && cleanPath.includes('/verify-packing')) {
    if (method === 'POST') return AuditEventType.PACK_COMPLETED;
  }

  // Unclaim order - picker unclaims an order
  // CRITICAL: Check BEFORE claim check because '/unclaim' contains '/claim' as substring
  // Routes: POST /api/orders/:orderId/unclaim
  if (cleanPath.includes('/orders') && cleanPath.includes('/unclaim')) {
    if (method === 'POST') return AuditEventType.ORDER_UNCLAIMED;
  }

  // Claim order - picker claims an order for picking
  // Routes: POST /api/orders/:orderId/claim
  if (cleanPath.includes('/orders') && cleanPath.includes('/claim')) {
    if (method === 'POST') return AuditEventType.ORDER_CLAIMED;
  }

  // Continue order - picker continues working on an already claimed order
  // Routes: POST /api/orders/:orderId/continue
  if (cleanPath.includes('/orders') && cleanPath.includes('/continue')) {
    if (method === 'POST') return AuditEventType.ORDER_CONTINUED;
  }

  // Orders (generic operations)
  if (cleanPath.includes('/orders')) {
    // if (method === 'POST') return AuditEventType.ORDER_CREATED; // Disabled - order creation is not logged
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.ORDER_UPDATED;
    if (cleanPath.includes('/cancel')) return AuditEventType.ORDER_CANCELLED;
    // if (method === 'GET') return AuditEventType.ORDER_VIEWED; // Disabled - page views not logged
  }

  // Wave picking operations
  // Routes: POST /api/v1/waves/create, /api/v1/waves/:waveId/release, /api/v1/waves/:waveId/complete
  if (cleanPath.includes('/waves')) {
    if (cleanPath.includes('/create')) return AuditEventType.WAVE_CREATED;
    if (cleanPath.includes('/release')) return AuditEventType.WAVE_RELEASED;
    if (cleanPath.includes('/complete')) return AuditEventType.WAVE_COMPLETED;
  }

  // Slotting optimization
  // Routes: POST /api/slotting/implement
  if (cleanPath.includes('/slotting') && cleanPath.includes('/implement')) {
    if (method === 'POST') return AuditEventType.SLOTTING_IMPLEMENTED;
  }

  // Zone picking operations
  // Routes: POST /api/zones/assign, /api/zones/release, /api/zones/rebalance
  if (cleanPath.includes('/zones')) {
    if (cleanPath.includes('/assign')) return AuditEventType.ZONE_ASSIGNED;
    if (cleanPath.includes('/release')) return AuditEventType.ZONE_RELEASED;
    if (cleanPath.includes('/rebalance')) return AuditEventType.ZONE_REBALANCED;
  }

  // Barcode/putaway operations
  // Routes: POST /api/barcode/putaway
  if (cleanPath.includes('/barcode') && cleanPath.includes('/putaway')) {
    if (method === 'POST') return AuditEventType.PUTAWAY_COMPLETED;
  }

  // Cycle count operations
  // Routes: POST /api/cycle-count/plans, POST /api/cycle-count/plans/:planId/start
  if (cleanPath.includes('/cycle-count')) {
    if (cleanPath.includes('/plans') && method === 'POST')
      return AuditEventType.CYCLE_COUNT_PLAN_CREATED;
    if (cleanPath.includes('/start')) return AuditEventType.CYCLE_COUNT_STARTED;
    if (cleanPath.includes('/complete')) return AuditEventType.CYCLE_COUNT_COMPLETED;
    if (cleanPath.includes('/reconcile')) return AuditEventType.CYCLE_COUNT_RECONCILED;
  }

  // Bin location operations
  // Routes: POST /api/bin-locations (create), PATCH /api/bin-locations/:binId (update), DELETE /api/bin-locations/:binId
  if (cleanPath.includes('/bin-locations') || cleanPath.includes('/binLocations')) {
    if (method === 'POST') return AuditEventType.BIN_LOCATION_CREATED;
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.BIN_LOCATION_UPDATED;
    if (method === 'DELETE') return AuditEventType.BIN_LOCATION_DELETED;
  }

  // Inventory
  if (cleanPath.includes('/inventory')) {
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      return AuditEventType.INVENTORY_ADJUSTED;
    }
    // if (method === 'GET') return AuditEventType.INVENTORY_VIEWED; // Disabled - page views not logged
  }

  // Metrics and dashboard viewing
  if (cleanPath.includes('/metrics')) {
    if (cleanPath.includes('/picker-activity')) return AuditEventType.REPORT_GENERATED;
    if (cleanPath.includes('/packer-activity')) return AuditEventType.REPORT_GENERATED;
    if (cleanPath.includes('/stock-controller-activity')) return AuditEventType.REPORT_GENERATED;
    if (cleanPath.includes('/dashboard')) return AuditEventType.REPORT_GENERATED;
    return AuditEventType.REPORT_GENERATED;
  }

  // Audit logs viewing
  if (cleanPath.includes('/audit')) {
    if (method === 'GET') return AuditEventType.REPORT_GENERATED;
  }

  // Legacy pick routes for backward compatibility
  if (cleanPath.includes('/picks') || cleanPath.includes('/pick-tasks')) {
    if (method === 'POST' || method === 'PATCH') return AuditEventType.PICK_CONFIRMED;
  }

  // Packing - packer completes or verifies packing (no audit log - shipment creation handles this)
  // Routes: POST /api/orders/:orderId/complete-packing, POST /api/orders/:orderId/verify-packing

  // Shipment created - order is shipped
  // Routes: POST /api/shipping/shipments
  if (cleanPath.includes('/shipping/shipments') && method === 'POST') {
    return AuditEventType.PACK_COMPLETED;
  }

  // Reports/exports
  if (cleanPath.includes('/export') || cleanPath.includes('/report')) {
    if (cleanPath.includes('/order')) return AuditEventType.ORDERS_EXPORTED;
    if (cleanPath.includes('/inventory')) return AuditEventType.INVENTORY_EXPORTED;
    return AuditEventType.REPORT_GENERATED;
  }

  // Order ID paths (e.g., /SO7136, /ORD123) - routes that access orders directly by ID
  // Check if path looks like an order ID (starts with letter(s) followed by numbers)
  const orderIdPattern = /^\/[A-Z]+[\d-]+$/;
  if (orderIdPattern.test(cleanPath)) {
    // if (method === 'GET') return AuditEventType.ORDER_VIEWED; // Disabled - page views not logged
    if (method === 'POST' || method === 'PUT' || method === 'PATCH')
      return AuditEventType.ORDER_UPDATED;
  }

  // Order ID with pick/undo-pick (e.g., /SO7136/pick, /SO7136/undo-pick)
  if (cleanPath.match(/^\/[A-Z]+[\d-]+\/pick$/)) {
    if (method === 'POST' || method === 'PATCH') return AuditEventType.PICK_CONFIRMED;
  }
  if (cleanPath.match(/^\/[A-Z]+[\d-]+\/undo-pick$/)) {
    if (method === 'POST' || method === 'PATCH') return AuditEventType.PICK_CONFIRMED;
  }

  // Order ID with other common actions
  if (cleanPath.match(/^\/[A-Z]+[\d-]+\/complete$/)) {
    if (method === 'POST') return AuditEventType.PICK_CONFIRMED;
  }

  // Default to API_ACCESS for other operations
  return AuditEventType.API_ACCESS;
}

/**
 * Get audit category based on request path
 */
function getAuditCategory(req: Request): AuditCategory {
  const fullPath = (req as any).originalUrl || req.path;
  const cleanPath = fullPath.replace(/^\/api\//, '/');

  if (cleanPath.includes('/auth')) return AuditCategory.AUTHENTICATION;
  if (
    cleanPath.includes('/users') ||
    cleanPath.includes('/roles') ||
    cleanPath.includes('/role-assignments')
  ) {
    return AuditCategory.USER_MANAGEMENT;
  }
  if (
    cleanPath.includes('/orders') ||
    cleanPath.includes('/inventory') ||
    cleanPath.includes('/pick-tasks') ||
    cleanPath.includes('/picks') ||
    cleanPath.includes('/pack')
  ) {
    return AuditCategory.DATA_MODIFICATION;
  }
  if (cleanPath.includes('/export') || cleanPath.includes('/report')) {
    return AuditCategory.DATA_ACCESS;
  }
  if (cleanPath.includes('/config') || cleanPath.includes('/settings')) {
    return AuditCategory.CONFIGURATION;
  }

  return AuditCategory.API_ACCESS;
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeBody(body: any): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;

  const sensitiveFields = [
    'password',
    'currentPassword',
    'newPassword',
    'token',
    'apiKey',
    'secret',
  ];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Middleware to log ALL API requests to audit logs
 */
export async function auditLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Store start time
  (req as any)[REQUEST_START_TIME] = Date.now();

  // Skip audit logging for excluded paths
  if (shouldExclude(req)) {
    next();
    return;
  }

  // Track whether we've already logged this request
  let logged = false;

  // Function to log the request (idempotent)
  const doLog = async (statusCode: number, responseData: any) => {
    if (!logged) {
      logged = true;
      // Log synchronously for immediate audit trail
      try {
        await logRequest(req, statusCode, responseData);
      } catch (err) {
        // Log error but don't throw - audit logging shouldn't break requests
        console.error('[AuditMiddleware] Failed to log audit entry:', err);
      }
    }
  };

  // Capture original methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  const originalEnd = res.end.bind(res);

  // Override res.json to capture response and log
  res.json = function (body: any) {
    doLog(res.statusCode || 200, body);
    return originalJson(body);
  };

  // Override res.send to capture response and log
  res.send = function (body: any) {
    doLog(res.statusCode || 200, body);
    return originalSend(body as any);
  };

  // Override res.end to capture final status (if json/send weren't called)
  res.end = function (...args: any[]) {
    doLog(res.statusCode || 200, null);
    return originalEnd.apply(res, args as any);
  };

  next();
}

/**
 * Generate a human-readable summary for the metadata
 */
async function generateMetadataSummary(
  req: AuthenticatedRequest,
  eventType: string,
  resourceId: string | null,
  waveDetails?: Record<string, unknown> | null
): Promise<string> {
  // For login events, get email from request body since req.user isn't set yet
  const userEmail =
    eventType === AuditEventType.LOGIN_SUCCESS || eventType === AuditEventType.LOGIN_FAILED
      ? req.body?.email || 'Unknown user'
      : req.user?.email || 'Unknown user';
  // const userRole = req.user?.effectiveRole || 'Unknown role';

  switch (eventType) {
    case AuditEventType.LOGIN_SUCCESS:
      return `${userEmail} logged in`;

    case AuditEventType.LOGOUT:
      return `${userEmail} logged out`;

    case AuditEventType.ITEM_SCANNED: {
      // Individual item scan during picking
      let sku = req.body?.sku || req.body?.barcode || '';
      const orderId = resourceId || '';

      // Look up product name from SKU
      if (sku) {
        try {
          const pool = getPool();
          const skuResult = await pool.query(
            'SELECT name FROM skus WHERE sku = $1 OR barcode = $1 LIMIT 1',
            [sku]
          );
          const productName = skuResult.rows[0]?.name;
          if (productName) {
            return `Scanned ${productName} for order ${orderId}`;
          }
        } catch {
          // If lookup fails, fall back to SKU
        }
        return `Scanned item (${sku}) for order ${orderId}`;
      }
      return `Scanned item for order ${orderId}`;
    }

    case AuditEventType.PICK_CONFIRMED:
      // Check if this is an undo-pick operation
      const fullPath = (req as any).originalUrl || req.path;
      const isUndoPick = fullPath.includes('/undo-pick');
      let sku = req.body?.sku || req.body?.barcode || '';
      const orderId = resourceId || '';

      if (isUndoPick) {
        // For undo-pick, look up SKU from pickTaskId first, then get product name
        const pickTaskId = req.body?.pickTaskId || req.body?.pick_task_id;
        if (pickTaskId) {
          try {
            const pool = getPool();
            // Get SKU from pick_task
            const pickTaskResult = await pool.query(
              'SELECT sku FROM pick_tasks WHERE pick_task_id = $1',
              [pickTaskId]
            );
            sku = pickTaskResult.rows[0]?.sku || sku;
          } catch {
            // If lookup fails, continue with original sku value
          }
        }

        // Now look up product name from SKU
        if (sku) {
          try {
            const pool = getPool();
            const skuResult = await pool.query(
              'SELECT name FROM skus WHERE sku = $1 OR barcode = $1 LIMIT 1',
              [sku]
            );
            const productName = skuResult.rows[0]?.name;
            if (productName) {
              return `${userEmail} unverified ${productName}`;
            }
          } catch {
            // If lookup fails, fall back to SKU
          }
          return `${userEmail} unverified order list item (${sku})`;
        }
        return `${userEmail} unverified order list item for order ${orderId}`;
      }

      // For regular pick, look up product name
      if (sku) {
        try {
          const pool = getPool();
          const skuResult = await pool.query(
            'SELECT name FROM skus WHERE sku = $1 OR barcode = $1 LIMIT 1',
            [sku]
          );
          const productName = skuResult.rows[0]?.name;
          if (productName) {
            return `${userEmail} confirmed order list for order ${orderId}`;
          }
        } catch {
          // If lookup fails, fall back to SKU
        }
        return `${userEmail} confirmed order list for order ${orderId}`;
      }
      return `${userEmail} confirmed order list for order ${orderId}`;

    case AuditEventType.PACK_COMPLETED:
      return `${userEmail} shipped order ${resourceId || ''}`;

    case AuditEventType.ORDER_CREATED:
      return `${userEmail} created order ${resourceId || ''}`;

    case AuditEventType.ORDER_UPDATED:
      return `${userEmail} updated order ${resourceId || ''}`;

    case AuditEventType.ORDER_CLAIMED:
      return `${userEmail} claimed order ${resourceId || ''}`;

    case AuditEventType.ORDER_UNCLAIMED:
      return `${userEmail} unclaimed order ${resourceId || ''}`;

    case AuditEventType.ORDER_CONTINUED:
      return `${userEmail} continued order ${resourceId || ''}`;

    case AuditEventType.WAVE_CREATED:
      if (waveDetails?.orderCount && waveDetails.strategy) {
        return `${userEmail} created wave ${resourceId || ''} (${waveDetails.strategy}, ${waveDetails.orderCount} orders)`;
      }
      return `${userEmail} created wave ${resourceId || ''}`;

    case AuditEventType.WAVE_RELEASED:
      return `${userEmail} released wave ${resourceId || ''}`;

    case AuditEventType.WAVE_COMPLETED:
      return `${userEmail} completed wave ${resourceId || ''}`;

    case AuditEventType.SLOTTING_IMPLEMENTED:
      return `${userEmail} implemented slotting optimization`;

    case AuditEventType.ZONE_ASSIGNED:
      return `${userEmail} assigned picker to zone ${resourceId || ''}`;

    case AuditEventType.ZONE_RELEASED:
      return `${userEmail} released from zone ${resourceId || ''}`;

    case AuditEventType.ZONE_REBALANCED:
      return `${userEmail} rebalanced zones`;

    case AuditEventType.PUTAWAY_COMPLETED:
      return `${userEmail} completed putaway`;

    case AuditEventType.CUSTOM_ROLE_CREATED:
      return `${userEmail} created custom role ${resourceId || ''}`;

    case AuditEventType.CUSTOM_ROLE_UPDATED:
      return `${userEmail} updated custom role ${resourceId || ''}`;

    case AuditEventType.CUSTOM_ROLE_DELETED:
      return `${userEmail} deleted custom role ${resourceId || ''}`;

    case AuditEventType.CYCLE_COUNT_PLAN_CREATED:
      return `${userEmail} created cycle count plan ${resourceId || ''}`;

    case AuditEventType.CYCLE_COUNT_STARTED:
      return `${userEmail} started cycle count ${resourceId || ''}`;

    case AuditEventType.CYCLE_COUNT_COMPLETED:
      return `${userEmail} completed cycle count ${resourceId || ''}`;

    case AuditEventType.CYCLE_COUNT_RECONCILED:
      return `${userEmail} reconciled cycle count ${resourceId || ''}`;

    case AuditEventType.BIN_LOCATION_CREATED:
      return `${userEmail} created bin location ${resourceId || ''}`;

    case AuditEventType.BIN_LOCATION_UPDATED:
      return `${userEmail} updated bin location ${resourceId || ''}`;

    case AuditEventType.BIN_LOCATION_DELETED:
      return `${userEmail} deleted bin location ${resourceId || ''}`;

    case AuditEventType.ROLE_GRANTED:
      return `${userEmail} granted role to user`;

    case AuditEventType.ROLE_REVOKED:
      return `${userEmail} revoked role from user`;

    case AuditEventType.ORDER_VIEWED:
      return `${userEmail} viewed orders`;

    case AuditEventType.INVENTORY_ADJUSTED:
      return `${userEmail} adjusted inventory`;

    case AuditEventType.REPORT_GENERATED:
      return `${userEmail} viewed a report`;

    default:
      return `${userEmail} performed ${eventType}`;
  }
}

/**
 * Extract wave details from response data
 */
function extractWaveDetails(responseData: any): Record<string, unknown> | null {
  try {
    const wave = responseData?.data;
    if (!wave) {
      console.log('[AuditMiddleware] extractWaveDetails: No wave data in response', responseData);
      return null;
    }

    const details = {
      waveId: wave.waveId,
      name: wave.name,
      strategy: wave.criteria?.strategy,
      orderCount: wave.orderIds?.length || 0,
      estimatedTime: wave.estimatedTime ? `${Math.round(wave.estimatedTime / 60)}min` : undefined,
    };

    console.log('[AuditMiddleware] extractWaveDetails: Extracted wave details', details);
    return details;
  } catch (error) {
    console.log('[AuditMiddleware] extractWaveDetails: Error extracting wave details', error);
    return null;
  }
}

/**
 * Extract resource ID from response for operations that generate IDs
 */
function extractResourceIdFromResponse(responseData: any, eventType: string): string | null {
  // For wave creation, extract waveId from response
  if (eventType === AuditEventType.WAVE_CREATED) {
    const wave = responseData?.data;
    if (wave?.waveId) {
      return wave.waveId;
    }
  }
  return null;
}

/**
 * Extract key details from the request
 */
function extractKeyDetails(
  req: Request,
  _eventType: string,
  resourceId: string | null
): Record<string, unknown> {
  const details: Record<string, unknown> = {};

  // Extract order ID from path params
  if (resourceId) {
    details.orderId = resourceId;
  }

  // Extract query parameters for orders
  if (req.query.status) {
    details.filter = `Status: ${req.query.status}`;
  }

  // Extract request body details for meaningful fields
  if (req.body && Object.keys(req.body).length > 0) {
    // Only include meaningful fields, not sensitive data
    const meaningfulFields = [
      'status',
      'priority',
      'quantity',
      'sku',
      'barcode',
      'binLocation',
      'orderId',
      'orderTotal',
      'notes',
      'reason',
    ];

    meaningfulFields.forEach(field => {
      if (req.body[field] !== undefined) {
        details[field] = req.body[field];
      }
    });
  }

  return details;
}

/**
 * Generate human-readable action description
 */
async function generateHumanReadableDescription(
  req: Request,
  eventType: string,
  resourceId: string | null,
  waveDetails?: Record<string, unknown> | null
): Promise<string> {
  const method = req.method;
  const fullPath = (req as any).originalUrl || req.path;
  const cleanPath = fullPath.replace(/^\/api\//, '/');

  // Extract meaningful parts from the path
  const parts = cleanPath.split('/').filter(Boolean);

  switch (eventType) {
    case AuditEventType.LOGIN_SUCCESS:
      return 'Logged in';

    case AuditEventType.LOGOUT:
      return 'Logged out';

    case AuditEventType.USER_CREATED:
      return `Created user account`;

    case AuditEventType.USER_UPDATED:
      return `Updated user account`;

    case AuditEventType.USER_DELETED:
      return `Deleted user account`;

    case AuditEventType.ORDER_CREATED:
      return `Created order ${resourceId || ''}`;

    case AuditEventType.ORDER_VIEWED:
      if (cleanPath.includes('/orders')) {
        const status = req.query.status as string;
        if (status) {
          return `Viewed ${status.toLowerCase()} orders`;
        }
        return 'Viewed orders list';
      }
      return `Viewed order ${resourceId || ''}`;

    case AuditEventType.ORDER_UPDATED:
      return `Updated order ${resourceId || ''}`;

    case AuditEventType.ORDER_CLAIMED:
      return `Claimed order ${resourceId || ''}`;

    case AuditEventType.ORDER_UNCLAIMED:
      return `Unclaimed order ${resourceId || ''}`;

    case AuditEventType.ORDER_CANCELLED:
      return `Cancelled order ${resourceId || ''}`;

    case AuditEventType.ORDER_CONTINUED:
      return `Continued order ${resourceId || ''}`;

    case AuditEventType.WAVE_CREATED:
      if (waveDetails?.orderCount && waveDetails.strategy) {
        return `Created wave ${resourceId || ''} (${waveDetails.strategy}, ${waveDetails.orderCount} orders)`;
      }
      return `Created wave ${resourceId || ''}`;

    case AuditEventType.WAVE_RELEASED:
      return `Released wave ${resourceId || ''}`;

    case AuditEventType.WAVE_COMPLETED:
      return `Completed wave ${resourceId || ''}`;

    case AuditEventType.SLOTTING_IMPLEMENTED:
      return `Implemented slotting optimization`;

    case AuditEventType.ZONE_ASSIGNED:
      return `Assigned picker to zone ${resourceId || ''}`;

    case AuditEventType.ZONE_RELEASED:
      return `Released from zone ${resourceId || ''}`;

    case AuditEventType.ZONE_REBALANCED:
      return `Rebalanced zones`;

    case AuditEventType.PUTAWAY_COMPLETED:
      return `Completed putaway`;

    case AuditEventType.CYCLE_COUNT_PLAN_CREATED:
      return `Created cycle count plan ${resourceId || ''}`;

    case AuditEventType.CYCLE_COUNT_STARTED:
      return `Started cycle count ${resourceId || ''}`;

    case AuditEventType.CYCLE_COUNT_COMPLETED:
      return `Completed cycle count ${resourceId || ''}`;

    case AuditEventType.CYCLE_COUNT_RECONCILED:
      return `Reconciled cycle count ${resourceId || ''}`;

    case AuditEventType.BIN_LOCATION_CREATED:
      return `Created bin location ${resourceId || ''}`;

    case AuditEventType.BIN_LOCATION_UPDATED:
      return `Updated bin location ${resourceId || ''}`;

    case AuditEventType.BIN_LOCATION_DELETED:
      return `Deleted bin location ${resourceId || ''}`;

    case AuditEventType.CUSTOM_ROLE_CREATED:
      return `Created custom role ${resourceId || ''}`;

    case AuditEventType.CUSTOM_ROLE_UPDATED:
      return `Updated custom role ${resourceId || ''}`;

    case AuditEventType.CUSTOM_ROLE_DELETED:
      return `Deleted custom role ${resourceId || ''}`;

    case AuditEventType.ROLE_GRANTED:
      return `Granted role to user`;

    case AuditEventType.ROLE_REVOKED:
      return `Revoked role from user`;

    case AuditEventType.ITEM_SCANNED: {
      // Extract order ID from path: /orders/SO71004/pick -> parts[1] is 'SO71004'
      let orderId = resourceId;
      if (cleanPath.startsWith('/orders/') && parts.length > 1) {
        orderId = parts[1]?.toUpperCase() || resourceId;
      } else {
        orderId = parts[0]?.toUpperCase() || resourceId || 'order';
      }

      // Look up product name from SKU
      const sku = req.body?.sku || req.body?.barcode || '';
      if (sku) {
        try {
          const pool = getPool();
          const skuResult = await pool.query(
            'SELECT name FROM skus WHERE sku = $1 OR barcode = $1 LIMIT 1',
            [sku]
          );
          const productName = skuResult.rows[0]?.name;
          if (productName) {
            return `Scanned ${productName} for order ${orderId}`;
          }
        } catch {
          // If lookup fails, fall back to SKU
        }
        return `Scanned item (${sku}) for order ${orderId}`;
      }
      return `Scanned item for order ${orderId}`;
    }

    case AuditEventType.PICK_CONFIRMED:
      if (cleanPath.includes('/pick') || cleanPath.includes('/undo-pick')) {
        // Extract order ID from path: /orders/SO71004/pick -> parts[1] is 'SO71004'
        let orderId = resourceId;
        if (cleanPath.startsWith('/orders/') && parts.length > 1) {
          orderId = parts[1]?.toUpperCase() || resourceId;
        } else {
          orderId = parts[0]?.toUpperCase() || resourceId || 'order';
        }

        if (cleanPath.includes('/undo-pick')) {
          // For undo-pick, look up product name from pickTaskId
          let sku = req.body?.sku || req.body?.barcode || '';
          const pickTaskId = req.body?.pickTaskId || req.body?.pick_task_id;

          if (pickTaskId && !sku) {
            try {
              const pool = getPool();
              // Get SKU from pick_task
              const pickTaskResult = await pool.query(
                'SELECT sku FROM pick_tasks WHERE pick_task_id = $1',
                [pickTaskId]
              );
              sku = pickTaskResult.rows[0]?.sku || '';
            } catch {
              // If lookup fails, continue without sku
            }
          }

          if (sku) {
            try {
              const pool = getPool();
              const skuResult = await pool.query(
                'SELECT name FROM skus WHERE sku = $1 OR barcode = $1 LIMIT 1',
                [sku]
              );
              const productName = skuResult.rows[0]?.name;
              if (productName) {
                return `Unverified ${productName} on order ${orderId}`;
              }
            } catch {
              // If lookup fails, fall back to SKU
            }
            return `Unverified ${sku} on order ${orderId}`;
          }
          return `Unverified pick for order ${orderId}`;
        }

        // Include SKU and quantity in description for regular pick
        const sku = req.body?.sku || '';
        // const qty = req.body?.quantity || 1;
        if (sku) {
          return `Confirmed Order List for order ${orderId}`;
        }
        return `Confirmed Order List for order ${orderId}`;
      }
      return `Confirmed Order List for order ${resourceId || ''}`;

    case AuditEventType.PACK_COMPLETED:
      // Check if this is a verify-packing operation
      if (cleanPath.includes('/verify-packing')) {
        // Extract order ID from path: /orders/SO71004/verify-packing -> parts[1] is 'SO71004'
        let orderId = resourceId;
        if (cleanPath.startsWith('/orders/') && parts.length > 1) {
          orderId = parts[1]?.toUpperCase() || resourceId;
        } else {
          orderId = parts[0]?.toUpperCase() || resourceId || 'order';
        }

        // Look up item name from order_item_id
        const orderItemId = req.body?.order_item_id || req.body?.orderItemId;
        if (orderItemId) {
          try {
            const pool = getPool();
            // Get SKU from order items
            const itemResult = await pool.query(
              'SELECT sku FROM order_items WHERE order_item_id = $1',
              [orderItemId]
            );
            const sku = itemResult.rows[0]?.sku || '';
            if (sku) {
              // Get product name
              const skuResult = await pool.query(
                'SELECT name FROM skus WHERE sku = $1 OR barcode = $1 LIMIT 1',
                [sku]
              );
              const productName = skuResult.rows[0]?.name;
              if (productName) {
                return `Packed ${productName} for order ${orderId}`;
              }
              return `Packed ${sku} for order ${orderId}`;
            }
          } catch {
            // If lookup fails, fall back to generic message
          }
        }
        return `Packed item for order ${orderId}`;
      }
      // Default PACK_COMPLETED (shipment creation)
      const orderId = parts[0]?.toUpperCase() || resourceId || 'order';
      return `Shipped order ${orderId}`;

    case AuditEventType.INVENTORY_ADJUSTED:
      return `Adjusted inventory`;

    case AuditEventType.INVENTORY_VIEWED:
      return 'Viewed inventory';

    case AuditEventType.REPORT_GENERATED:
      if (cleanPath.includes('/audit')) {
        return 'Viewed audit logs';
      }
      if (cleanPath.includes('/dashboard')) {
        return 'Viewed dashboard';
      }
      if (cleanPath.includes('/picker-activity')) {
        return 'Viewed picker activity report';
      }
      if (cleanPath.includes('/packer-activity')) {
        return 'Viewed packer activity report';
      }
      if (cleanPath.includes('/stock-controller-activity')) {
        return 'Viewed stock controller activity report';
      }
      if (cleanPath.includes('/orders/throughput') || cleanPath.includes('/orders/status')) {
        return 'Viewed order metrics';
      }
      return 'Generated report';

    case AuditEventType.API_ACCESS:
      // Provide meaningful descriptions for common API endpoints
      // Auth-related
      if (cleanPath.includes('/auth/active-role')) return 'Switched active role';
      if (cleanPath.includes('/auth/current-view')) return 'Updated current view';
      if (cleanPath.includes('/auth/set-idle')) return 'Set idle status';
      // Metrics and reports
      if (cleanPath.includes('/metrics/orders/throughput'))
        return 'Viewed order throughput metrics';
      if (cleanPath.includes('/metrics/orders/status')) return 'Viewed order status breakdown';
      if (cleanPath.includes('/metrics/skus/top-picked')) return 'Viewed top SKUs report';
      if (cleanPath.includes('/metrics/picker-activity')) return 'Viewed picker activity';
      if (cleanPath.includes('/metrics/packer-activity')) return 'Viewed packer activity';
      if (cleanPath.includes('/metrics/stock-controller-activity'))
        return 'Viewed stock controller activity';
      // Orders
      if (cleanPath.includes('/orders') && method === 'GET') {
        if (cleanPath.includes('/queue')) return 'Viewed order queue';
        if (req.query.status) return `Viewed ${req.query.status} orders`;
        return 'Viewed orders list';
      }
      // Exceptions
      if (cleanPath.includes('/exceptions')) {
        if (cleanPath.includes('/summary')) return 'Viewed exceptions summary';
        if (cleanPath.includes('/open')) return 'Viewed open exceptions';
        return 'Viewed exceptions list';
      }
      // Inventory
      if (cleanPath.includes('/inventory') && method === 'GET') {
        return 'Viewed inventory list';
      }
      // Cycle counts
      if (cleanPath.includes('/cycle-count')) {
        if (cleanPath.includes('/plans')) return 'Viewed cycle count plans';
        return 'Viewed cycle count data';
      }
      // Roles
      if (cleanPath.includes('/roles') || cleanPath.includes('/role-assignments')) {
        if (method === 'POST') return 'Granted role to user';
        if (method === 'DELETE') return 'Revoked role from user';
        return 'Managed user roles';
      }
      // Fallback with more readable format
      const readableMethod =
        method === 'GET'
          ? 'Viewed'
          : method === 'POST'
            ? 'Created/Updated'
            : method === 'PUT'
              ? 'Updated'
              : method === 'PATCH'
                ? 'Modified'
                : method === 'DELETE'
                  ? 'Deleted'
                  : method;
      return `${readableMethod} ${cleanPath.split('?')[0]}`;

    default:
      return `${method} ${cleanPath}`;
  }
}

/**
 * Log the request to audit logs
 */
async function logRequest(
  req: AuthenticatedRequest,
  statusCode: number,
  responseData: any
): Promise<void> {
  try {
    const startTime = (req as any)[REQUEST_START_TIME] || Date.now();
    const duration = Date.now() - startTime;

    const auditService = getAuditService();

    const eventType = getAuditEventType(req);
    const category = getAuditCategory(req);
    const fullPath = (req as any).originalUrl || req.path;
    const resourceType = getResourceType(fullPath, req.method);
    let resourceId = getResourceId(req);

    // For wave creation, extract waveId from response since it's not in the URL
    if (eventType === AuditEventType.WAVE_CREATED && !resourceId) {
      resourceId = extractResourceIdFromResponse(responseData, eventType);
    }

    // Get user info from auth middleware or request body (for login events)
    // Note: LOGIN_SUCCESS/LOGIN_FAILED don't have req.user yet, so use req.body.email
    // LOGOUT has req.user because authenticate middleware is used
    const isAuthEvent =
      eventType === AuditEventType.LOGIN_SUCCESS ||
      eventType === AuditEventType.LOGIN_FAILED ||
      eventType === AuditEventType.LOGOUT;
    const userId = req.user?.userId || null;
    const userEmail =
      eventType === AuditEventType.LOGIN_SUCCESS || eventType === AuditEventType.LOGIN_FAILED
        ? req.body?.email || null
        : req.user?.email || null;
    const userRole = req.user?.effectiveRole || null;

    // Get IP address (consider proxy headers)
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      req.ip ||
      null;

    const userAgent = req.headers['user-agent'] || null;

    // Extract wave details from response for wave creation
    const waveDetails =
      eventType === AuditEventType.WAVE_CREATED ? extractWaveDetails(responseData) : null;

    if (eventType === AuditEventType.WAVE_CREATED) {
      console.log('[AuditMiddleware] ===== WAVE_CREATED DEBUG =====');
      console.log('[AuditMiddleware] eventType:', eventType);
      console.log('[AuditMiddleware] resourceId:', resourceId);
      console.log('[AuditMiddleware] responseData:', JSON.stringify(responseData, null, 2));
      console.log('[AuditMiddleware] waveDetails:', JSON.stringify(waveDetails, null, 2));
      console.log(
        '[AuditMiddleware] Summary will be:',
        await generateMetadataSummary(req, eventType, resourceId, waveDetails)
      );
      console.log('[AuditMiddleware] ===== END WAVE_CREATED DEBUG =====');
    }

    // Build human-readable metadata (await summary since it's now async for pick events)
    const metadata: Record<string, unknown> = {
      // Summary for quick viewing
      summary: await generateMetadataSummary(req, eventType, resourceId, waveDetails),
      // Key details extracted from the request
      details: extractKeyDetails(req, eventType, resourceId),
    };

    // Include wave details if available
    if (waveDetails) {
      metadata.details = {
        ...(metadata.details as Record<string, unknown>),
        ...waveDetails,
      };
    }

    // Only include technical details for non-authentication events (login/logout shouldn't show request data)
    if (!isAuthEvent) {
      metadata.technical = {
        method: req.method,
        endpoint: fullPath,
        duration: `${duration}ms`,
        status: statusCode,
      };
    }

    // Include request body for write operations (sanitized) - only meaningful fields
    // Skip for authentication events (login/logout) to avoid showing passwords
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !isAuthEvent) {
      // For pick events, look up the product name from SKU
      if (eventType === 'ITEM_SCANNED') {
        let sku = req.body?.sku || req.body?.barcode || '';
        const orderId = resourceId || '';

        if (sku) {
          try {
            const pool = getPool();
            const skuResult = await pool.query(
              'SELECT name FROM skus WHERE sku = $1 OR barcode = $1 LIMIT 1',
              [sku]
            );
            const productName = skuResult.rows[0]?.name;
            if (productName) {
              (metadata.details as Record<string, unknown>).item = productName;
              (metadata.details as Record<string, unknown>).order = orderId;
            }
          } catch {
            // If lookup fails, fall back to showing the SKU
            (metadata.details as Record<string, unknown>).item = sku;
            (metadata.details as Record<string, unknown>).order = orderId;
          }
        }
      } else if (eventType === 'PICK_CONFIRMED') {
        const fullPath = (req as any).originalUrl || req.path;
        const isUndoPick = fullPath.includes('/undo-pick');
        let sku = req.body?.sku || req.body?.barcode || '';

        // For undo-pick, look up SKU from pickTaskId first
        if (isUndoPick && !sku) {
          const pickTaskId = req.body?.pickTaskId || req.body?.pick_task_id;
          if (pickTaskId) {
            try {
              const pool = getPool();
              const pickTaskResult = await pool.query(
                'SELECT sku FROM pick_tasks WHERE pick_task_id = $1',
                [pickTaskId]
              );
              sku = pickTaskResult.rows[0]?.sku || '';
            } catch {
              // If lookup fails, continue with empty sku
            }
          }
        }

        if (sku) {
          try {
            const pool = getPool();
            const skuResult = await pool.query(
              'SELECT name FROM skus WHERE sku = $1 OR barcode = $1 LIMIT 1',
              [sku]
            );
            const productName = skuResult.rows[0]?.name || sku;
            (metadata.details as Record<string, unknown>).item = productName;
          } catch {
            // If lookup fails, fall back to showing the SKU
            (metadata.details as Record<string, unknown>).item = sku;
          }
        } else {
          // No SKU found - don't add item field for undo-pick without SKU
          // The summary already describes what happened
        }
      } else if (eventType === 'ORDER_UPDATED') {
        // For order updates, check if it's a claim/unclaim operation - don't show requestData
        const fullPath = (req as any).originalUrl || req.path;
        if (!fullPath.includes('/claim') && !fullPath.includes('/unclaim')) {
          const sanitizedBody = sanitizeBody(req.body);
          if (sanitizedBody && Object.keys(sanitizedBody).length > 0) {
            (metadata.details as Record<string, unknown>).requestData = sanitizedBody;
          }
        }
        // For claim/unclaim operations, don't show requestData at all - it's just pickerId which is irrelevant
      } else if (
        eventType === 'USER_CREATED' ||
        eventType === 'USER_UPDATED' ||
        eventType === 'USER_DELETED'
      ) {
        // For user management events, only show key details (name, role) - not the full request body
        if (req.body?.name) (metadata.details as Record<string, unknown>).name = req.body.name;
        if (req.body?.role) (metadata.details as Record<string, unknown>).role = req.body.role;
        // Don't show email in details for privacy (it's already in the audit log's userEmail field)
      } else if (eventType === 'PACK_COMPLETED' || eventType === 'ORDER_CANCELLED') {
        // For pack completion and order cancellation, don't show requestData - it's irrelevant
        // The summary already describes what happened
      } else {
        const sanitizedBody = sanitizeBody(req.body);
        if (sanitizedBody && Object.keys(sanitizedBody).length > 0) {
          (metadata.details as Record<string, unknown>).requestData = sanitizedBody;
        }
      }
    }

    // Include error details if request failed
    if (statusCode >= 400) {
      metadata.error = responseData?.error || responseData?.message || 'Request failed';
    }

    // Debug logging for PICK_CONFIRMED events
    if (eventType === 'PICK_CONFIRMED') {
      console.log('[AuditMiddleware] PICK_CONFIRMED debug:');
      console.log('[AuditMiddleware]   req.body:', JSON.stringify(req.body));
      console.log('[AuditMiddleware]   req.body?.sku:', req.body?.sku);
      console.log(
        '[AuditMiddleware]   summary:',
        await generateMetadataSummary(req, eventType, resourceId)
      );
      console.log(
        '[AuditMiddleware]   description:',
        await generateHumanReadableDescription(req, eventType, resourceId)
      );
    }

    // Build human-readable action description (await since it's now async for product name lookup)
    const actionDescription = await generateHumanReadableDescription(
      req,
      eventType,
      resourceId,
      waveDetails
    );

    // For pick events, enhance newValues with product name
    let newValues = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (eventType === 'PICK_CONFIRMED') {
        let sku = req.body?.sku || req.body?.barcode || '';
        const fullPath = (req as any).originalUrl || req.path;
        const isUndoPick = fullPath.includes('/undo-pick');

        // For undo-pick, look up SKU from pickTaskId
        if (isUndoPick && !sku) {
          const pickTaskId = req.body?.pickTaskId || req.body?.pick_task_id;
          if (pickTaskId) {
            try {
              const pool = getPool();
              const pickTaskResult = await pool.query(
                'SELECT sku FROM pick_tasks WHERE pick_task_id = $1',
                [pickTaskId]
              );
              sku = pickTaskResult.rows[0]?.sku || '';
            } catch {
              // If lookup fails, continue without sku
            }
          }
        }

        try {
          const pool = getPool();
          const skuResult = await pool.query(
            'SELECT name FROM skus WHERE sku = $1 OR barcode = $1 LIMIT 1',
            [sku || 'unknown']
          );
          const productName = skuResult.rows[0]?.name;
          newValues = {
            ...sanitizeBody(req.body),
            productName: productName || sku || 'Unknown item',
          };
        } catch {
          newValues = {
            ...sanitizeBody(req.body),
            productName: sku || 'Unknown item',
          };
        }
      } else if (eventType === 'ORDER_UPDATED') {
        // For order updates, check if it's a claim/unclaim operation - don't include irrelevant pickerId
        const fullPath = (req as any).originalUrl || req.path;
        if (!fullPath.includes('/claim') && !fullPath.includes('/unclaim')) {
          newValues = sanitizeBody(req.body);
        }
        // For claim/unclaim operations, don't include newValues - it's just pickerId which is irrelevant
      } else if (
        eventType === 'USER_CREATED' ||
        eventType === 'USER_UPDATED' ||
        eventType === 'USER_DELETED'
      ) {
        // For user management events, only include name and role - not the full sanitized body
        if (req.body?.name || req.body?.role) {
          newValues = {
            ...(req.body?.name && { name: req.body.name }),
            ...(req.body?.role && { role: req.body.role }),
          };
        }
      } else if (eventType === 'PACK_COMPLETED' || eventType === 'ORDER_CANCELLED') {
        // For pack completion and order cancellation, don't include newValues - it's irrelevant
        // The summary already describes what happened
      } else {
        newValues = sanitizeBody(req.body);
      }
    }

    // Log to audit service (await for immediate write)
    await auditService.log({
      userId,
      userEmail,
      userRole,
      actionType: eventType,
      actionCategory: category,
      actionDescription,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      metadata,
      oldValues: null,
      newValues,
      correlationId: null,
    });
  } catch (error) {
    // Never let audit logging break the request
    console.error('[AuditMiddleware] Error in audit logging:', error);
  }
}
