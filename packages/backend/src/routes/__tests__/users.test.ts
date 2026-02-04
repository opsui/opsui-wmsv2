/**
 * Integration tests for user routes
 * @covers src/routes/users.ts
 */

import request from 'supertest';
import { authenticate } from '../../middleware/auth';
import { User, UserRole } from '@opsui/shared';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      userId: 'user-123',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      baseRole: UserRole.ADMIN,
      effectiveRole: UserRole.ADMIN,
    };
    next();
  }),
}));

// Mock the UserRepository BEFORE importing routes
const mockUserRepoInstance = {
  getAllUsers: jest.fn().mockResolvedValue([]),
  getAssignableUsers: jest.fn().mockResolvedValue([]),
  getUserSafe: jest.fn().mockResolvedValue(null),
  createUserWithPassword: jest.fn().mockResolvedValue(null),
  updateUser: jest.fn().mockResolvedValue(null),
  softDeleteUser: jest.fn().mockResolvedValue(null),
  restoreUser: jest.fn().mockResolvedValue(null),
};

jest.mock('../../repositories/UserRepository', () => ({
  UserRepository: jest.fn().mockImplementation(() => mockUserRepoInstance),
}));

jest.mock('../../config/logger');
jest.mock('../../db/client');

const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

describe('Users Routes', () => {
  const mockAdminUser: User = {
    userId: 'user-123',
    email: 'admin@example.com',
    name: 'Test Admin',
    role: UserRole.ADMIN,
    activeRole: null,
    active: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  let app: any;
  let createApp: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock implementations
    mockUserRepoInstance.getAllUsers.mockResolvedValue([]);
    mockUserRepoInstance.getAssignableUsers.mockResolvedValue([]);
    mockUserRepoInstance.getUserSafe.mockResolvedValue(null);
    mockUserRepoInstance.createUserWithPassword.mockResolvedValue(null);
    mockUserRepoInstance.updateUser.mockResolvedValue(null);
    mockUserRepoInstance.softDeleteUser.mockResolvedValue(null);
    mockUserRepoInstance.restoreUser.mockResolvedValue(null);

    // Import createApp after mocks are set up
    createApp = require('../../app').createApp;
    app = createApp();
  });

  // ==========================================================================
  // GET /api/v1/users
  // ==========================================================================

  describe('GET /api/v1/users', () => {
    it('should return users with default filters', async () => {
      const mockUsers = [
        {
          userId: 'user-001',
          email: 'user1@example.com',
          name: 'User One',
          role: UserRole.PICKER,
          active: true,
        },
        {
          userId: 'user-002',
          email: 'user2@example.com',
          name: 'User Two',
          role: UserRole.PACKER,
          active: true,
        },
      ];

      mockUserRepoInstance.getAllUsers.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('should return empty array when no users', async () => {
      mockUserRepoInstance.getAllUsers.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  // ==========================================================================
  // POST /api/v1/users
  // ==========================================================================

  describe('POST /api/v1/users', () => {
    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          role: UserRole.PICKER,
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'name, email, and password are required',
        code: 'MISSING_FIELDS',
      });
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'New User',
          password: 'SecurePass123!',
          role: UserRole.PICKER,
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'name, email, and password are required',
        code: 'MISSING_FIELDS',
      });
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          role: UserRole.PICKER,
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'name, email, and password are required',
        code: 'MISSING_FIELDS',
      });
    });

    it('should return 400 when password is too weak (less than 6 chars)', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: '123',
          role: UserRole.PICKER,
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Password must be at least 6 characters long',
        code: 'INVALID_PASSWORD',
      });
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'not-an-email',
          name: 'New User',
          password: 'SecurePass123!',
          role: UserRole.PICKER,
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    });

    it('should return 400 when role is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'SecurePass123!',
          role: 'INVALID_ROLE',
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid role',
        code: 'INVALID_ROLE',
      });
    });
  });

  // ==========================================================================
  // PATCH /api/v1/users/:userId
  // ==========================================================================

  describe('PATCH /api/v1/users/:userId', () => {
    it('should update user', async () => {
      const updateData = {
        name: 'Updated Name',
        role: UserRole.PACKER,
      };

      const mockUpdatedUser = {
        userId: 'user-001',
        email: 'user1@example.com',
        name: 'Updated Name',
        role: UserRole.PACKER,
        active: true,
      };

      mockUserRepoInstance.updateUser.mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .patch('/api/v1/users/user-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.role).toBe(UserRole.PACKER);
    });
  });

  // ==========================================================================
  // DELETE /api/v1/users/:userId
  // ==========================================================================

  describe('DELETE /api/v1/users/:userId', () => {
    it('should soft delete user', async () => {
      const mockDeletedUser = {
        userId: 'user-001',
        email: 'user1@example.com',
        name: 'User One',
        role: UserRole.PICKER,
        active: false,
        deletedAt: new Date(),
      };

      mockUserRepoInstance.softDeleteUser.mockResolvedValue(mockDeletedUser);

      const response = await request(app)
        .delete('/api/v1/users/user-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.userId).toBe('user-001');
    });
  });

  // ==========================================================================
  // POST /api/v1/users/:userId/restore
  // ==========================================================================

  describe('POST /api/v1/users/:userId/restore', () => {
    it('should restore soft-deleted user', async () => {
      const mockRestoredUser = {
        userId: 'user-001',
        email: 'user1@example.com',
        name: 'User One',
        role: UserRole.PICKER,
        active: true,
      };

      mockUserRepoInstance.restoreUser.mockResolvedValue(mockRestoredUser);

      const response = await request(app)
        .post('/api/v1/users/user-001/restore')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.userId).toBe('user-001');
    });
  });

  // ==========================================================================
  // Authentication & Authorization
  // ==========================================================================

  describe('Authentication & Authorization', () => {
    it('should return 403 when not authenticated (req.user is null)', async () => {
      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = null;
        next();
      });

      await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
    });

    it('should deny access for non-admin users', async () => {
      const nonAdminUser = {
        userId: 'user-456',
        email: 'picker@example.com',
        role: UserRole.PICKER,
        baseRole: UserRole.PICKER,
        effectiveRole: UserRole.PICKER,
      };

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = nonAdminUser;
        next();
      });

      await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
    });
  });
});
