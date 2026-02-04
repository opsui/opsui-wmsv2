/**
 * Integration tests for role assignment routes
 * @covers src/routes/roleAssignments.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { UserRole } from '@opsui/shared';

// Mock all dependencies
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'admin-123',
      email: 'admin@example.com',
      role: 'ADMIN',
    };
    next();
  }),
  asyncHandler: (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next),
}));

// Mock AuditService with factory function
jest.mock('../../services/AuditService', () => {
  const mockAuditServiceInstance = {
    logAuthorization: jest.fn().mockResolvedValue(undefined),
    logDataModification: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue(undefined),
  };
  return {
    getAuditService: jest.fn(() => mockAuditServiceInstance),
    AuditEventType: {
      ROLE_GRANTED: 'ROLE_GRANTED',
      ROLE_REVOKED: 'ROLE_REVOKED',
    },
    AuditCategory: {
      AUTHORIZATION: 'AUTHORIZATION',
    },
  };
});

// Mock repositories with factory functions
jest.mock('../../repositories/RoleAssignmentRepository', () => {
  const mockRepo = {
    getAllRoleAssignments: jest.fn().mockResolvedValue([
      {
        userId: 'user-001',
        role: 'SUPERVISOR',
        grantedBy: 'admin-123',
        grantedAt: '2024-01-01T10:00:00Z',
      },
      {
        userId: 'user-002',
        role: 'PICKER',
        grantedBy: 'admin-123',
        grantedAt: '2024-01-01T10:00:00Z',
      },
    ]),
    getRoleAssignmentsForUser: jest.fn().mockResolvedValue([
      {
        userId: 'user-001',
        role: 'SUPERVISOR',
        grantedBy: 'admin-123',
        grantedAt: '2024-01-01T10:00:00Z',
      },
    ]),
    getUserRoleAssignments: jest.fn().mockResolvedValue([
      {
        userId: 'user-001',
        role: 'SUPERVISOR',
        grantedBy: 'admin-123',
        grantedAt: '2024-01-01T10:00:00Z',
      },
    ]),
    grantRole: jest.fn().mockResolvedValue({
      userId: 'user-001',
      role: 'SUPERVISOR',
      grantedBy: 'admin-123',
      grantedAt: '2024-01-01T10:00:00Z',
    }),
    revokeRole: jest.fn().mockResolvedValue(undefined),
  };

  return {
    RoleAssignmentRepository: jest.fn().mockImplementation(() => mockRepo),
  };
});

jest.mock('../../repositories/UserRepository', () => {
  const mockUser = {
    userId: 'user-001',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'STOCK_CONTROLLER',
  };

  return {
    UserRepository: jest.fn().mockImplementation(() => ({
      findById: jest.fn().mockResolvedValue(mockUser),
    })),
  };
});

describe('Role Assignment Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/role-assignments
  // ==========================================================================

  describe('GET /api/v1/role-assignments', () => {
    it('should get all role assignments', async () => {
      const response = await request(app)
        .get('/api/v1/role-assignments')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ==========================================================================
  // GET /api/v1/role-assignments/user/:userId
  // ==========================================================================

  describe('GET /api/v1/role-assignments/user/:userId', () => {
    it('should get role assignments for a user (admin)', async () => {
      const response = await request(app)
        .get('/api/v1/role-assignments/user/user-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ==========================================================================
  // GET /api/v1/role-assignments/my-roles
  // ==========================================================================

  describe('GET /api/v1/role-assignments/my-roles', () => {
    it('should get current user role assignments', async () => {
      const response = await request(app)
        .get('/api/v1/role-assignments/my-roles')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ==========================================================================
  // POST /api/v1/role-assignments/grant
  // ==========================================================================

  describe('POST /api/v1/role-assignments/grant', () => {
    it('should grant a role to a user', async () => {
      const grantData = {
        userId: 'user-001',
        role: UserRole.SUPERVISOR,
      };

      const response = await request(app)
        .post('/api/v1/role-assignments/grant')
        .set('Authorization', 'Bearer valid-token')
        .send(grantData)
        .expect(201);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('role');
    });

    it('should accept user_id field (snake_case)', async () => {
      const grantData = {
        user_id: 'user-001',
        role: UserRole.PICKER,
      };

      await request(app)
        .post('/api/v1/role-assignments/grant')
        .set('Authorization', 'Bearer valid-token')
        .send(grantData)
        .expect(201);
    });

    it('should return 400 for missing userId', async () => {
      const invalidData = {
        role: UserRole.SUPERVISOR,
      };

      const response = await request(app)
        .post('/api/v1/role-assignments/grant')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'userId and role are required');
    });

    it('should return 400 for missing role', async () => {
      const invalidData = {
        userId: 'user-001',
      };

      const response = await request(app)
        .post('/api/v1/role-assignments/grant')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'userId and role are required');
    });

    it('should return 400 for invalid role', async () => {
      const invalidData = {
        userId: 'user-001',
        role: 'INVALID_ROLE',
      };

      const response = await request(app)
        .post('/api/v1/role-assignments/grant')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid role');
    });
  });

  // ==========================================================================
  // DELETE /api/v1/role-assignments/revoke
  // ==========================================================================

  describe('DELETE /api/v1/role-assignments/revoke', () => {
    it('should revoke a role from a user', async () => {
      const revokeData = {
        userId: 'user-001',
        role: UserRole.SUPERVISOR,
      };

      const response = await request(app)
        .delete('/api/v1/role-assignments/revoke')
        .set('Authorization', 'Bearer valid-token')
        .send(revokeData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Role revoked successfully');
    });

    it('should accept user_id field (snake_case)', async () => {
      const revokeData = {
        user_id: 'user-001',
        role: UserRole.PICKER,
      };

      await request(app)
        .delete('/api/v1/role-assignments/revoke')
        .set('Authorization', 'Bearer valid-token')
        .send(revokeData)
        .expect(200);
    });

    it('should return 400 for missing userId', async () => {
      const invalidData = {
        role: UserRole.SUPERVISOR,
      };

      const response = await request(app)
        .delete('/api/v1/role-assignments/revoke')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'userId and role are required');
    });

    it('should return 400 for missing role', async () => {
      const invalidData = {
        userId: 'user-001',
      };

      const response = await request(app)
        .delete('/api/v1/role-assignments/revoke')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'userId and role are required');
    });
  });
});
