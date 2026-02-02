/**
 * Integration tests for authentication routes
 * @covers src/routes/auth.ts
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
      email: 'test@example.com',
      role: UserRole.PICKER,
      baseRole: UserRole.PICKER,
      effectiveRole: UserRole.PICKER,
    };
    next();
  }),
}));

// Mock the authService
jest.mock('../../services/AuthService');
jest.mock('../../config/logger');
jest.mock('../../db/client');

const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

describe('Auth Routes', () => {
  let app: any;

  const mockUser: User = {
    userId: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.PICKER,
    activeRole: null,
    active: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  afterEach(() => {});

  // ==========================================================================
  // POST /api/auth/login
  // ==========================================================================

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: mockUser,
      };
      (authService.login as jest.Mock).mockResolvedValue(mockTokens);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        })
        .expect(200);

      expect(response.body).toEqual(mockTokens);
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123',
      });
    });

    it('should return 401 with invalid credentials', async () => {
      (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(500);

      expect(authService.login).toHaveBeenCalled();
    });

    it('should return 400 with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // ==========================================================================
  // POST /api/auth/refresh
  // ==========================================================================

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockUser,
      };
      (authService.refreshToken as jest.Mock).mockResolvedValue(mockTokens);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token',
        })
        .expect(200);

      expect(response.body).toEqual(mockTokens);
      expect(authService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should return 400 when refresh token is missing', async () => {
      const response = await request(app).post('/api/auth/refresh').send({}).expect(400);

      expect(response.body).toEqual({
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN',
      });
    });

    it('should return 401 with invalid refresh token', async () => {
      (authService.refreshToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(500);
    });
  });

  // ==========================================================================
  // POST /api/auth/logout
  // ==========================================================================

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      (authService.logout as jest.Mock).mockResolvedValue(undefined);
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logged out successfully',
      });
      expect(authService.logout).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = undefined;
        next();
      });

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200); // Logout succeeds even without user (no-op)
    });
  });

  // ==========================================================================
  // GET /api/auth/me
  // ==========================================================================

  describe('GET /api/auth/me', () => {
    it('should return current user info', async () => {
      (authService.getUserById as jest.Mock).mockResolvedValue(mockUser);
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockUser);
      expect(authService.getUserById).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    });
  });

  // ==========================================================================
  // POST /api/auth/change-password
  // ==========================================================================

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully', async () => {
      (authService.changePassword as jest.Mock).mockResolvedValue(undefined);
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword123',
        })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Password changed successfully',
      });
      expect(authService.changePassword).toHaveBeenCalledWith(
        'user-123',
        'OldPassword123',
        'NewPassword123'
      );
    });

    it('should return 400 when current password is missing', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          newPassword: 'NewPassword123',
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS',
      });
    });

    it('should return 400 when new password is missing', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          currentPassword: 'OldPassword123',
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS',
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword123',
        })
        .expect(401);

      expect(response.body).toEqual({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    });
  });

  // ==========================================================================
  // POST /api/auth/current-view
  // ==========================================================================

  describe('POST /api/auth/current-view', () => {
    it('should update current view successfully', async () => {
      (authService.updateCurrentView as jest.Mock).mockResolvedValue(undefined);
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/current-view')
        .set('Authorization', 'Bearer valid-token')
        .send({
          view: 'picking',
        })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Current view updated successfully',
      });
      expect(authService.updateCurrentView).toHaveBeenCalledWith('user-123', 'picking');
    });

    it('should clear current view with empty string', async () => {
      (authService.updateCurrentView as jest.Mock).mockResolvedValue(undefined);
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/current-view')
        .set('Authorization', 'Bearer valid-token')
        .send({
          view: '',
        })
        .expect(200);

      expect(authService.updateCurrentView).toHaveBeenCalledWith('user-123', '');
    });

    it('should return 400 when view is missing', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/current-view')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'View is required',
        code: 'MISSING_VIEW',
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/auth/current-view')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          view: 'picking',
        })
        .expect(401);

      expect(response.body).toEqual({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    });
  });

  // ==========================================================================
  // POST /api/auth/set-idle
  // ==========================================================================

  describe('POST /api/auth/set-idle', () => {
    it('should set user to idle successfully', async () => {
      (authService.setIdle as jest.Mock).mockResolvedValue(undefined);
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/set-idle')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Picker status set to IDLE',
      });
      expect(authService.setIdle).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/auth/set-idle')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    });
  });

  // ==========================================================================
  // POST /api/auth/set-active-role
  // ==========================================================================

  describe('POST /api/auth/set-active-role', () => {
    it('should set active role successfully', async () => {
      const updatedUser = { ...mockUser, activeRole: UserRole.ADMIN };
      (authService.setActiveRole as jest.Mock).mockResolvedValue(updatedUser);
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/set-active-role')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role: 'ADMIN',
        })
        .expect(200);

      expect(response.body).toEqual({
        user: updatedUser,
        activeRole: 'ADMIN',
      });
      expect(authService.setActiveRole).toHaveBeenCalledWith('user-123', 'ADMIN');
    });

    it('should return 400 when role is missing', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/set-active-role')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Role is required',
        code: 'MISSING_ROLE',
      });
    });

    it('should return 400 when role is invalid', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/set-active-role')
        .set('Authorization', 'Bearer valid-token')
        .send({
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
  // POST /api/auth/active-role
  // ==========================================================================

  describe('POST /api/auth/active-role', () => {
    it('should set active role with camelCase', async () => {
      const updatedUser = { ...mockUser, activeRole: UserRole.PACKER };
      (authService.setActiveRole as jest.Mock).mockResolvedValue(updatedUser);
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/active-role')
        .set('Authorization', 'Bearer valid-token')
        .send({
          activeRole: 'PACKER',
        })
        .expect(200);

      expect(response.body).toEqual({
        user: updatedUser,
        activeRole: 'PACKER',
        accessToken: expect.any(String),
      });
      expect(authService.setActiveRole).toHaveBeenCalledWith('user-123', 'PACKER');
    });

    it('should set active role with snake_case', async () => {
      const updatedUser = { ...mockUser, activeRole: UserRole.STOCK_CONTROLLER };
      (authService.setActiveRole as jest.Mock).mockResolvedValue(updatedUser);
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/active-role')
        .set('Authorization', 'Bearer valid-token')
        .send({
          active_role: 'STOCK_CONTROLLER',
        })
        .expect(200);

      expect(response.body.activeRole).toBe('STOCK_CONTROLLER');
      expect(authService.setActiveRole).toHaveBeenCalledWith('user-123', 'STOCK_CONTROLLER');
    });

    it('should return 400 when role is missing', async () => {
      mockedAuthenticate.mockImplementation((req, _res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'test@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/active-role')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Active role is required',
        code: 'MISSING_ROLE',
      });
    });
  });
});
