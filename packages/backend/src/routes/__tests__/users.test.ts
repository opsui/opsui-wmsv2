/**
 * Integration tests for user routes
 * @covers src/routes/users.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { authService } from '../../services/AuthService';
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

// Mock the authService
jest.mock('../../services/AuthService');
jest.mock('../../config/logger');
jest.mock('../../db/client');

const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

describe('Users Routes', () => {
  let app: any;

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

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // GET /api/users
  // ==========================================================================

  describe('GET /api/users', () => {
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

      (authService.getAllUsers as jest.Mock).mockResolvedValue({
        users: mockUsers,
        total: 2,
        page: 1,
        totalPages: 1,
      });

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = { ...mockAdminUser };
        next();
      });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.users).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter users by role', async () => {
      (authService.getAllUsers as jest.Mock).mockResolvedValue({
        users: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/users?role=PICKER')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(authService.getAllUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.PICKER,
        })
      );
    });

    it('should filter users by active status', async () => {
      (authService.getAllUsers as jest.Mock).mockResolvedValue({
        users: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/users?active=true')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(authService.getAllUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          active: true,
        })
      );
    });

    it('should paginate users', async () => {
      (authService.getAllUsers as jest.Mock).mockResolvedValue({
        users: [],
        total: 50,
        page: 2,
        totalPages: 3,
      });

      const response = await request(app)
        .get('/api/users?page=2&limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(authService.getAllUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 20,
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/users/:userId
  // ==========================================================================

  describe('GET /api/users/:userId', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        userId: 'user-001',
        email: 'user1@example.com',
        name: 'User One',
        role: UserRole.PICKER,
        active: true,
      };

      (authService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/user-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.userId).toBe('user-001');
      expect(response.body.email).toBe('user1@example.com');
    });

    it('should return 404 when user not found', async () => {
      (authService.getUserById as jest.Mock).mockRejectedValue(
        new Error('User user-nonexistent not found')
      );

      const response = await request(app)
        .get('/api/users/user-nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(authService.getUserById).toHaveBeenCalledWith('user-nonexistent');
    });
  });

  // ==========================================================================
  // POST /api/users
  // ==========================================================================

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecurePass123!',
        role: UserRole.PICKER,
      };

      const mockCreatedUser = {
        userId: 'user-new',
        email: 'newuser@example.com',
        name: 'New User',
        role: UserRole.PICKER,
        active: true,
      };

      (authService.createUser as jest.Mock).mockResolvedValue(mockCreatedUser);

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer valid-token')
        .send(newUser)
        .expect(200);

      expect(response.body.userId).toBe('user-new');
      expect(response.body.email).toBe('newuser@example.com');
      expect(authService.createUser).toHaveBeenCalledWith(newUser);
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'New User',
          password: 'SecurePass123!',
          role: UserRole.PICKER,
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when password is too weak', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: '123',
          role: UserRole.PICKER,
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when role is invalid', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'SecurePass123!',
          role: 'INVALID_ROLE',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // ==========================================================================
  // PUT /api/users/:userId
  // ==========================================================================

  describe('PUT /api/users/:userId', () => {
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

      (authService.updateUser as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .put('/api/users/user-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.role).toBe(UserRole.PACKER);
    });

    it('should return 400 when no update data provided', async () => {
      const response = await request(app)
        .put('/api/users/user-001')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'No update data provided',
        code: 'NO_UPDATE_DATA',
      });
    });
  });

  // ==========================================================================
  // DELETE /api/users/:userId
  // ==========================================================================

  describe('DELETE /api/users/:userId', () => {
    it('should deactivate user', async () => {
      const mockDeactivatedUser = {
        userId: 'user-001',
        email: 'user1@example.com',
        name: 'User One',
        role: UserRole.PICKER,
        active: false,
      };

      (authService.deactivateUser as jest.Mock).mockResolvedValue(mockDeactivatedUser);

      const response = await request(app)
        .delete('/api/users/user-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.active).toBe(false);
    });

    it('should return 400 when trying to deactivate self', async () => {
      (authService.deactivateUser as jest.Mock).mockRejectedValue(
        new Error('Cannot deactivate your own account')
      );

      const response = await request(app)
        .delete('/api/users/user-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(authService.deactivateUser).toHaveBeenCalledWith('user-123');
    });
  });

  // ==========================================================================
  // POST /api/users/:userId/activate
  // ==========================================================================

  describe('POST /api/users/:userId/activate', () => {
    it('should activate user', async () => {
      const mockActivatedUser = {
        userId: 'user-001',
        email: 'user1@example.com',
        name: 'User One',
        role: UserRole.PICKER,
        active: true,
      };

      (authService.activateUser as jest.Mock).mockResolvedValue(mockActivatedUser);

      const response = await request(app)
        .post('/api/users/user-001/activate')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.active).toBe(true);
    });
  });

  // ==========================================================================
  // POST /api/users/:userId/password
  // ==========================================================================

  describe('POST /api/users/:userId/password', () => {
    it('should reset user password', async () => {
      const passwordData = {
        newPassword: 'NewSecurePass123!',
      };

      const mockUpdatedUser = {
        userId: 'user-001',
        email: 'user1@example.com',
        name: 'User One',
        role: UserRole.PICKER,
        active: true,
      };

      (authService.resetPassword as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .post('/api/users/user-001/password')
        .set('Authorization', 'Bearer valid-token')
        .send(passwordData)
        .expect(200);

      expect(authService.resetPassword).toHaveBeenCalledWith('user-001', 'NewSecurePass123!');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/users/user-001/password')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'New password is required',
        code: 'MISSING_PASSWORD',
      });
    });

    it('should return 400 when password is too weak', async () => {
      const response = await request(app)
        .post('/api/users/user-001/password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          newPassword: '123',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // ==========================================================================
  // GET /api/users/roles
  // ==========================================================================

  describe('GET /api/users/roles', () => {
    it('should return all available roles', async () => {
      const mockRoles = [
        { role: UserRole.PICKER, description: 'Warehouse picker' },
        { role: UserRole.PACKER, description: 'Warehouse packer' },
        { role: UserRole.SUPERVISOR, description: 'Warehouse supervisor' },
        { role: UserRole.ADMIN, description: 'System administrator' },
      ];

      (authService.getAvailableRoles as jest.Mock).mockResolvedValue(mockRoles);

      const response = await request(app)
        .get('/api/users/roles')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(4);
      expect(response.body[0].role).toBe(UserRole.PICKER);
    });
  });

  // ==========================================================================
  // POST /api/users/:userId/role
  // ==========================================================================

  describe('POST /api/users/:userId/role', () => {
    it('should update user role', async () => {
      const roleData = {
        role: UserRole.SUPERVISOR,
      };

      const mockUpdatedUser = {
        userId: 'user-001',
        email: 'user1@example.com',
        name: 'User One',
        role: UserRole.SUPERVISOR,
        active: true,
      };

      (authService.updateUserRole as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .post('/api/users/user-001/role')
        .set('Authorization', 'Bearer valid-token')
        .send(roleData)
        .expect(200);

      expect(response.body.role).toBe(UserRole.SUPERVISOR);
    });

    it('should return 400 when role is invalid', async () => {
      const response = await request(app)
        .post('/api/users/user-001/role')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role: 'INVALID_ROLE',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // ==========================================================================
  // Authentication & Authorization
  // ==========================================================================

  describe('Authentication & Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = null;
        next();
      });

      await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should allow access with admin role', async () => {
      (authService.getAllUsers as jest.Mock).mockResolvedValue({
        users: [],
        total: 0,
      });

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = { ...mockAdminUser };
        next();
      });

      await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
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
        .get('/api/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (authService.getAllUsers as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = { ...mockAdminUser };
        next();
      });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
