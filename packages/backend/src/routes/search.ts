/**
 * Global Search routes
 *
 * Provides a unified search endpoint for orders, SKUs, users, and pages
 */

import { Router } from 'express';
import { asyncHandler, authenticate } from '../middleware';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../db/client';

const router = Router();

// All search routes require authentication
router.use(authenticate);

/**
 * GET /api/search
 * Global search across orders, SKUs, users, and pages
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const q = (req.query.q as string) || '';
    const searchTerm = q.trim().toLowerCase();

    if (!searchTerm) {
      res.json({
        results: {
          orders: [],
          skus: [],
          users: [],
          pages: [],
        },
        total: 0,
      });
      return;
    }

    // Run all searches in parallel
    const [ordersResult, skusResult, usersResult] = await Promise.all([
      // Search orders
      query(
        `SELECT order_id, status, customer_name 
         FROM orders 
         WHERE LOWER(order_id) LIKE $1 
            OR LOWER(customer_name) LIKE $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [`%${searchTerm}%`]
      ),
      // Search SKUs
      query(
        `SELECT s.sku, s.name, 'No location' as bin_location
         FROM skus s
         WHERE s.active = true 
           AND (LOWER(s.sku) LIKE $1 
            OR LOWER(s.name) LIKE $1
            OR LOWER(s.barcode) LIKE $1)
         ORDER BY s.sku
         LIMIT 5`,
        [`%${searchTerm}%`]
      ),
      // Search users
      query(
        `SELECT user_id, name, role 
         FROM users 
         WHERE active = true 
           AND (LOWER(user_id) LIKE $1 
            OR LOWER(name) LIKE $1)
         ORDER BY name
         LIMIT 5`,
        [`%${searchTerm}%`]
      ),
    ]);

    // Define available pages for navigation
    const allPages = [
      { title: 'Dashboard', path: '/dashboard', icon: 'HomeIcon', keywords: ['home', 'main'] },
      {
        title: 'Order Queue',
        path: '/orders',
        icon: 'ClipboardDocumentListIcon',
        keywords: ['orders', 'pick', 'picking'],
      },
      {
        title: 'Packing Queue',
        path: '/packing',
        icon: 'ClipboardDocumentCheckIcon',
        keywords: ['pack', 'packing'],
      },
      {
        title: 'Stock Control',
        path: '/stock-control',
        icon: 'ArchiveBoxIcon',
        keywords: ['stock', 'inventory'],
      },
      {
        title: 'Inwards Goods',
        path: '/inwards',
        icon: 'TruckIcon',
        keywords: ['inbound', 'receiving', 'asn'],
      },
      {
        title: 'Shipped Orders',
        path: '/shipped-orders',
        icon: 'TruckIcon',
        keywords: ['shipped', 'dispatch'],
      },
      {
        title: 'Cycle Counting',
        path: '/cycle-counting',
        icon: 'CalculatorIcon',
        keywords: ['count', 'audit'],
      },
      {
        title: 'Exceptions',
        path: '/exceptions',
        icon: 'ExclamationTriangleIcon',
        keywords: ['exception', 'error'],
      },
      {
        title: 'Reports',
        path: '/reports',
        icon: 'ChartBarIcon',
        keywords: ['report', 'analytics'],
      },
      {
        title: 'User Roles',
        path: '/user-roles',
        icon: 'UsersIcon',
        keywords: ['user', 'role', 'permission'],
      },
      {
        title: 'Settings',
        path: '/role-settings',
        icon: 'CogIcon',
        keywords: ['setting', 'config'],
      },
      {
        title: 'Bin Locations',
        path: '/bin-locations',
        icon: 'ArchiveBoxIcon',
        keywords: ['bin', 'location'],
      },
      {
        title: 'Production',
        path: '/production',
        icon: 'BriefcaseIcon',
        keywords: ['manufacturing', 'production'],
      },
      {
        title: 'Maintenance',
        path: '/maintenance',
        icon: 'Cog6ToothIcon',
        keywords: ['maintenance', 'repair'],
      },
      { title: 'Sales', path: '/sales', icon: 'ShoppingCartIcon', keywords: ['sales', 'customer'] },
      {
        title: 'RMA',
        path: '/rma',
        icon: 'DocumentMagnifyingGlassIcon',
        keywords: ['return', 'rma'],
      },
      {
        title: 'Accounting',
        path: '/accounting',
        icon: 'CalculatorIcon',
        keywords: ['accounting', 'finance', 'financial'],
      },
      {
        title: 'Integrations',
        path: '/integrations',
        icon: 'SquaresPlusIcon',
        keywords: ['integration', 'api'],
      },
      {
        title: 'Business Rules',
        path: '/business-rules',
        icon: 'DocumentTextIcon',
        keywords: ['rule', 'automation'],
      },
      {
        title: 'Wave Picking',
        path: '/waves',
        icon: 'ClipboardDocumentListIcon',
        keywords: ['wave', 'pick'],
      },
      {
        title: 'Zone Picking',
        path: '/zones',
        icon: 'ClipboardDocumentListIcon',
        keywords: ['zone', 'pick'],
      },
      { title: 'Slotting', path: '/slotting', icon: 'FolderIcon', keywords: ['slot', 'slotting'] },
      {
        title: 'Notifications',
        path: '/notifications',
        icon: 'ExclamationTriangleIcon',
        keywords: ['notification', 'alert'],
      },
    ];

    // Filter pages based on search term
    const matchedPages = allPages
      .filter(
        page =>
          page.title.toLowerCase().includes(searchTerm) ||
          page.keywords.some(keyword => keyword.includes(searchTerm))
      )
      .slice(0, 5);

    const results = {
      orders: ordersResult.rows.map(row => ({
        orderId: row.order_id,
        status: row.status,
        customerName: row.customer_name || 'Unknown',
      })),
      skus: skusResult.rows.map(row => ({
        sku: row.sku,
        name: row.name,
        binLocation: row.bin_location || 'No location',
      })),
      users: usersResult.rows.map(row => ({
        userId: row.user_id,
        name: row.name,
        role: row.role,
      })),
      pages: matchedPages,
    };

    const total =
      results.orders.length + results.skus.length + results.users.length + results.pages.length;

    res.json({
      results,
      total,
    });
  })
);

export default router;
