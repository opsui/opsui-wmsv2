/**
 * Integration tests for custom roles routes
 * @covers src/routes/customRoles.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { authenticate } from '../../middleware/auth';
import { getAuditService } from '../../services/AuditService';
import { Permission } from '@opsui/shared';
import { nanoid } from 'nanoid';

// Mock all dependencies
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'admin-123',
      email: 'admin@example.com',
      role: 'ADMIN',
      baseRole: 'ADMIN',
      effectiveRole: 'ADMIN',
    };
    next();
  }),
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'abc12345'),
}));

jest.mock('../../services/AuditService', () => {
  const mockAuditServiceInstance = {
    logAuthorization: jest.fn().mockResolvedValue(undefined),
    logDataModification: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue(undefined),
  };
  return {
    getAuditService: jest.fn(() => mockAuditServiceInstance),
    AuditEventType: {
      CUSTOM_ROLE_CREATED: 'CUSTOM_ROLE_CREATED',
      CUSTOM_ROLE_UPDATED: 'CUSTOM_ROLE_UPDATED',
      CUSTOM_ROLE_DELETED: 'CUSTOM_ROLE_DELETED',
    },
    AuditCategory: {
      AUTHORIZATION: 'AUTHORIZATION',
    },
  };
});

// Mock the repositories
jest.mock('../../repositories/CustomRoleRepository', () => {
  return {
    CustomRoleRepository: jest.fn().mockImplementation(() => ({
      getAllRolesWithPermissions: jest.fn().mockResolvedValue([
        {
          roleId: 'custom_abc12345',
          name: 'Custom Role',
          description: 'A custom role',
          permissions: ['VIEW_ORDERS'],
          createdAt: '2024-01-01T10:00:00Z',
          grantedBy: 'admin-123',
        },
      ]),
      getSystemRoles: jest.fn().mockResolvedValue([
        {
          roleId: 'ADMIN',
          name: 'Administrator',
          description: 'Full system access',
          permissions: [
            'VIEW_ORDERS',
            'EDIT_ORDERS',
            'DELETE_ORDERS',
            'VIEW_INVENTORY',
            'EDIT_INVENTORY',
          ],
          isSystemRole: true,
        },
      ]),
      getCustomRoleById: jest.fn().mockImplementation((roleId: string) => {
        if (roleId === 'non-existent') return Promise.resolve(null);
        return Promise.resolve({
          roleId: 'custom_abc12345',
          name: 'Custom Role',
          description: 'A custom role',
          permissions: ['VIEW_ORDERS'],
          createdAt: '2024-01-01T10:00:00Z',
          grantedBy: 'admin-123',
        });
      }),
      createCustomRole: jest.fn().mockResolvedValue({
        roleId: 'custom_abc12345',
        name: 'New Role',
        description: 'A new custom role',
        permissions: ['VIEW_ORDERS'],
        createdAt: '2024-01-01T10:00:00Z',
        grantedBy: 'admin-123',
      }),
      updateCustomRole: jest.fn().mockResolvedValue({
        roleId: 'custom_abc12345',
        name: 'Updated Role',
        description: 'Updated description',
        permissions: ['VIEW_ORDERS', 'EDIT_ORDERS'],
        updatedAt: '2024-01-01T11:00:00Z',
        grantedBy: 'admin-123',
      }),
      deleteCustomRole: jest.fn().mockResolvedValue(true),
      getUserPermissions: jest.fn().mockResolvedValue(['VIEW_ORDERS']),
    })),
  };
});

jest.mock('../../repositories/UserRepository', () => {
  return {
    UserRepository: jest.fn().mockImplementation(() => ({
      findById: jest.fn().mockResolvedValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
      }),
    })),
  };
});

// Mock @opsui/shared for PERMISSION_GROUPS
jest.mock('@opsui/shared', () => ({
  Permission: {
    VIEW_ORDERS: 'VIEW_ORDERS',
    EDIT_ORDERS: 'EDIT_ORDERS',
    DELETE_ORDERS: 'DELETE_ORDERS',
    VIEW_INVENTORY: 'VIEW_INVENTORY',
    EDIT_INVENTORY: 'EDIT_INVENTORY',
  },
  PERMISSION_GROUPS: {
    ORDERS: {
      name: 'Order Management',
      permissions: ['VIEW_ORDERS', 'EDIT_ORDERS', 'DELETE_ORDERS'],
    },
    INVENTORY: {
      name: 'Inventory Management',
      permissions: ['VIEW_INVENTORY', 'EDIT_INVENTORY'],
    },
  },
  UserRole: {
    ADMIN: 'ADMIN',
    SUPERVISOR: 'SUPERVISOR',
    PICKER: 'PICKER',
  },
  PlatformType: {
    SHOPIFY: 'SHOPIFY',
    WOOCOMMERCE: 'WOOCOMMERCE',
    MAGENTO: 'MAGENTO',
    BIGCOMMERCE: 'BIGCOMMERCE',
    CUSTOM: 'CUSTOM',
  },
}));

describe('Custom Roles Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/custom-roles
  // ==========================================================================

  describe('GET /api/v1/custom-roles', () => {
    it('should get all custom roles with system roles', async () => {
      const response = await request(app)
        .get('/api/v1/custom-roles')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // GET /api/v1/custom-roles/system
  // ==========================================================================

  describe('GET /api/v1/custom-roles/system', () => {
    it('should get system roles', async () => {
      const response = await request(app)
        .get('/api/v1/custom-roles/system')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((r: any) => r.isSystemRole)).toBe(true);
    });
  });

  // ==========================================================================
  // GET /api/v1/custom-roles/permissions
  // ==========================================================================

  describe('GET /api/v1/custom-roles/permissions', () => {
    it('should get all available permissions', async () => {
      const response = await request(app)
        .get('/api/v1/custom-roles/permissions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('permissions');
      expect(response.body).toHaveProperty('groups');
      expect(Array.isArray(response.body.permissions)).toBe(true);
      expect(typeof response.body.groups).toBe('object');
    });
  });

  // ==========================================================================
  // GET /api/v1/custom-roles/my-permissions
  // ==========================================================================

  describe('GET /api/v1/custom-roles/my-permissions', () => {
    it('should get current user permissions', async () => {
      const response = await request(app)
        .get('/api/v1/custom-roles/my-permissions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('permissions');
      expect(Array.isArray(response.body.permissions)).toBe(true);
    });
  });

  // ==========================================================================
  // GET /api/v1/custom-roles/:roleId
  // ==========================================================================

  describe('GET /api/v1/custom-roles/:roleId', () => {
    it('should get a custom role by ID', async () => {
      const response = await request(app)
        .get('/api/v1/custom-roles/custom_abc12345')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('roleId');
      expect(response.body).toHaveProperty('name');
    });

    it('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .get('/api/v1/custom-roles/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Role not found');
    });
  });

  // ==========================================================================
  // POST /api/v1/custom-roles
  // ==========================================================================

  describe('POST /api/v1/custom-roles', () => {
    it('should create a new custom role', async () => {
      const newRoleData = {
        name: 'Test Role',
        description: 'A test custom role',
        permissions: [Permission.VIEW_ORDERS],
      };

      const response = await request(app)
        .post('/api/v1/custom-roles')
        .set('Authorization', 'Bearer valid-token')
        .send(newRoleData)
        .expect(201);

      expect(response.body).toHaveProperty('roleId');
      expect(response.body).toHaveProperty('name', 'New Role');
      expect(nanoid).toHaveBeenCalled();
    });

    it('should return 400 for missing name', async () => {
      const invalidData = {
        description: 'No name provided',
        permissions: [Permission.VIEW_ORDERS],
      };

      const response = await request(app)
        .post('/api/v1/custom-roles')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Name and description are required');
    });

    it('should return 400 for invalid name length', async () => {
      const invalidData = {
        name: 'ab', // Too short
        description: 'A test role',
        permissions: [Permission.VIEW_ORDERS],
      };

      const response = await request(app)
        .post('/api/v1/custom-roles')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Name must be between 3 and 100 characters');
    });

    it('should return 400 for missing permissions', async () => {
      const invalidData = {
        name: 'Test Role',
        description: 'A test role',
        // Missing permissions
      };

      const response = await request(app)
        .post('/api/v1/custom-roles')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'At least one permission is required');
    });
  });

  // ==========================================================================
  // PUT /api/v1/custom-roles/:roleId
  // ==========================================================================

  describe('PUT /api/v1/custom-roles/:roleId', () => {
    it('should update a custom role', async () => {
      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const response = await request(app)
        .put('/api/v1/custom-roles/custom_abc12345')
        .set('Authorization', 'Bearer valid-token')
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('name');
    });

    it('should return 400 for invalid name length', async () => {
      const invalidData = {
        name: 'ab', // Too short
      };

      const response = await request(app)
        .put('/api/v1/custom-roles/custom_abc12345')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Name must be between 3 and 100 characters');
    });

    it('should return 400 for invalid permissions', async () => {
      const invalidData = {
        permissions: ['INVALID_PERMISSION'],
      };

      const response = await request(app)
        .put('/api/v1/custom-roles/custom_abc12345')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid permissions');
    });
  });

  // ==========================================================================
  // DELETE /api/v1/custom-roles/:roleId
  // ==========================================================================

  describe('DELETE /api/v1/custom-roles/:roleId', () => {
    it('should delete a custom role', async () => {
      const response = await request(app)
        .delete('/api/v1/custom-roles/custom_abc12345')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Role deleted successfully');
    });
  });
});
