/**
 * Unit tests for AuthService
 * @covers src/services/AuthService.ts
 */

import { AuthService, LoginCredentials } from '../AuthService';
import { User, UserRole, UnauthorizedError } from '@opsui/shared';

// Mock dependencies
jest.mock('../../repositories/UserRepository');
jest.mock('../../config/logger');
jest.mock('../../db/client');
jest.mock('bcrypt');
jest.mock('../../middleware/auth', () => ({
  generateToken: jest.fn(() => 'mock-access-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyToken: jest.fn((token: string) => {
    if (token === 'valid-refresh-token') {
      return { userId: 'user-123', email: 'test@example.com', role: UserRole.PICKER };
    }
    throw new Error('Invalid token');
  }),
}));

const { generateToken, generateRefreshToken, verifyToken } = require('../../middleware/auth');
const { userRepository } = require('../../repositories/UserRepository');
const { query } = require('../../db/client');
const { logger } = require('../../config/logger');
const bcrypt = require('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;

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
    authService = new AuthService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // LOGIN TESTS
  // ==========================================================================

  describe('login', () => {
    const validCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'ValidPassword123',
    };

    it('should successfully login with valid credentials', async () => {
      userRepository.verifyPassword.mockResolvedValue(mockUser);
      query.mockResolvedValue({ rows: [] });
      generateToken.mockReturnValue('access-token-123');
      generateRefreshToken.mockReturnValue('refresh-token-123');

      const result = await authService.login(validCredentials);

      expect(result).toEqual({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: mockUser,
      });
      expect(userRepository.verifyPassword).toHaveBeenCalledWith(
        validCredentials.email,
        validCredentials.password
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([mockUser.userId])
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Login successful',
        expect.objectContaining({
          email: validCredentials.email,
          userId: mockUser.userId,
        })
      );
    });

    it('should throw UnauthorizedError with invalid credentials', async () => {
      userRepository.verifyPassword.mockResolvedValue(null);

      await expect(authService.login(validCredentials)).rejects.toThrow(UnauthorizedError);
      await expect(authService.login(validCredentials)).rejects.toThrow(
        'Invalid email or password'
      );
      expect(logger.warn).toHaveBeenCalledWith('Login failed - invalid credentials', {
        email: validCredentials.email,
      });
    });

    it('should set user active on login', async () => {
      userRepository.verifyPassword.mockResolvedValue(mockUser);
      query.mockResolvedValue({ rows: [] });

      await authService.login(validCredentials);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SET active = true'),
        expect.arrayContaining([mockUser.userId])
      );
    });

    it('should update last_login_at on login', async () => {
      userRepository.verifyPassword.mockResolvedValue(mockUser);
      query.mockResolvedValue({ rows: [] });

      await authService.login(validCredentials);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('last_login_at = NOW()'),
        expect.arrayContaining([mockUser.userId])
      );
    });
  });

  // ==========================================================================
  // VERIFY TOKEN TESTS
  // ==========================================================================

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.PICKER,
      };
      verifyToken.mockReturnValue(mockPayload);

      const result = await authService.verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(verifyToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw error for invalid token', async () => {
      verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyToken('invalid-token')).rejects.toThrow('Invalid token');
    });
  });

  // ==========================================================================
  // REFRESH TOKEN TESTS
  // ==========================================================================

  describe('refreshToken', () => {
    it('should refresh tokens with valid refresh token', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      generateToken.mockReturnValue('new-access-token');
      generateRefreshToken.mockReturnValue('new-refresh-token');

      // Ensure verifyToken returns the expected payload for the valid token
      verifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.PICKER,
      });

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockUser,
      });
      expect(verifyToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw UnauthorizedError with invalid refresh token', async () => {
      verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedError);
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw UnauthorizedError when user not found', async () => {
      // Set verifyToken to return valid payload first
      verifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.PICKER,
      });
      userRepository.findById.mockResolvedValue(null);

      await expect(authService.refreshToken('valid-refresh-token')).rejects.toThrow(
        UnauthorizedError
      );
      await expect(authService.refreshToken('valid-refresh-token')).rejects.toThrow(
        'User not found or inactive'
      );
    });

    it('should throw UnauthorizedError when user is inactive', async () => {
      const inactiveUser = { ...mockUser, active: false };
      userRepository.findById.mockResolvedValue(inactiveUser);

      await expect(authService.refreshToken('valid-refresh-token')).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  // ==========================================================================
  // GET USER BY ID TESTS
  // ==========================================================================

  describe('getUserById', () => {
    it('should return user without sensitive data', async () => {
      const safeUser = { ...mockUser };
      userRepository.getUserSafe.mockResolvedValue(safeUser);

      const result = await authService.getUserById('user-123');

      expect(result).toEqual(safeUser);
      expect(userRepository.getUserSafe).toHaveBeenCalledWith('user-123');
    });

    it('should return null for non-existent user', async () => {
      userRepository.getUserSafe.mockResolvedValue(null);

      const result = await authService.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // SET ACTIVE ROLE TESTS
  // ==========================================================================

  describe('setActiveRole', () => {
    it('should set active role for user', async () => {
      const updatedUser = { ...mockUser, activeRole: UserRole.ADMIN };
      userRepository.setActiveRole.mockResolvedValue(undefined);
      userRepository.getUserSafe.mockResolvedValue(updatedUser);

      const result = await authService.setActiveRole('user-123', UserRole.ADMIN);

      expect(result).toEqual(updatedUser);
      expect(userRepository.setActiveRole).toHaveBeenCalledWith('user-123', UserRole.ADMIN);
    });

    it('should clear active role when passed null', async () => {
      const updatedUser = { ...mockUser, activeRole: null };
      userRepository.setActiveRole.mockResolvedValue(undefined);
      userRepository.getUserSafe.mockResolvedValue(updatedUser);

      await authService.setActiveRole('user-123', null);

      expect(userRepository.setActiveRole).toHaveBeenCalledWith('user-123', null);
    });

    it('should throw error if user not found after update', async () => {
      userRepository.setActiveRole.mockResolvedValue(undefined);
      userRepository.getUserSafe.mockResolvedValue(null);

      await expect(authService.setActiveRole('user-123', UserRole.ADMIN)).rejects.toThrow(
        'User not found'
      );
    });
  });

  // ==========================================================================
  // GET ACTIVE ROLE TESTS
  // ==========================================================================

  describe('getActiveRole', () => {
    it('should return active role if set', async () => {
      const userWithActiveRole = { ...mockUser, activeRole: UserRole.ADMIN };
      userRepository.getUserSafe.mockResolvedValue(userWithActiveRole);

      const result = await authService.getActiveRole('user-123');

      expect(result).toBe(UserRole.ADMIN);
    });

    it('should return base role if active role not set', async () => {
      userRepository.getUserSafe.mockResolvedValue(mockUser);

      const result = await authService.getActiveRole('user-123');

      expect(result).toBe(UserRole.PICKER);
    });

    it('should return PICKER as default if user not found', async () => {
      userRepository.getUserSafe.mockResolvedValue(null);

      const result = await authService.getActiveRole('user-123');

      expect(result).toBe(UserRole.PICKER);
    });
  });

  // ==========================================================================
  // LOGOUT TESTS
  // ==========================================================================

  describe('logout', () => {
    it('should clear user current view and set inactive', async () => {
      userRepository.setCurrentTask.mockResolvedValue(undefined);
      query.mockResolvedValue({ rows: [] });

      await authService.logout('user-123');

      expect(userRepository.setCurrentTask).toHaveBeenCalledWith('user-123', null);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SET current_view = NULL'),
        expect.arrayContaining(['user-123'])
      );
      expect(logger.info).toHaveBeenCalledWith(
        'User logged out - location cleared to None, orders remain assigned for resumption',
        { userId: 'user-123' }
      );
    });

    it('should set active to false on logout', async () => {
      userRepository.setCurrentTask.mockResolvedValue(undefined);
      query.mockResolvedValue({ rows: [] });

      await authService.logout('user-123');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('active = false'),
        expect.arrayContaining(['user-123'])
      );
    });
  });

  // ==========================================================================
  // CHANGE PASSWORD TESTS
  // ==========================================================================

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      userRepository.findByIdOrThrow.mockResolvedValue(mockUser);
      userRepository.verifyPassword.mockResolvedValue(mockUser);
      userRepository.updatePassword.mockResolvedValue(undefined);

      await authService.changePassword('user-123', 'OldPassword123', 'NewPassword123');

      expect(userRepository.verifyPassword).toHaveBeenCalledWith(mockUser.email, 'OldPassword123');
      expect(userRepository.updatePassword).toHaveBeenCalledWith('user-123', 'NewPassword123');
      expect(logger.info).toHaveBeenCalledWith('Password changed', { userId: 'user-123' });
    });

    it('should throw UnauthorizedError with incorrect current password', async () => {
      userRepository.findByIdOrThrow.mockResolvedValue(mockUser);
      userRepository.verifyPassword.mockResolvedValue(null);

      await expect(
        authService.changePassword('user-123', 'WrongPassword', 'NewPassword123')
      ).rejects.toThrow(UnauthorizedError);
      await expect(
        authService.changePassword('user-123', 'WrongPassword', 'NewPassword123')
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  // ==========================================================================
  // UPDATE CURRENT VIEW TESTS
  // ==========================================================================

  describe('updateCurrentView', () => {
    it('should update current view', async () => {
      query.mockResolvedValue({ rows: [] });

      await authService.updateCurrentView('user-123', 'picking');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SET current_view = $1'),
        expect.arrayContaining(['picking', 'user-123'])
      );
    });

    it('should clear current view when passed empty string', async () => {
      query.mockResolvedValue({ rows: [] });

      await authService.updateCurrentView('user-123', '');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SET current_view = NULL'),
        expect.arrayContaining(['user-123'])
      );
    });

    it('should set user active when updating view', async () => {
      query.mockResolvedValue({ rows: [] });

      await authService.updateCurrentView('user-123', 'picking');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('active = true'),
        expect.arrayContaining(['picking', 'user-123'])
      );
    });
  });

  // ==========================================================================
  // SET IDLE TESTS
  // ==========================================================================

  describe('setIdle', () => {
    it('should set user to idle', async () => {
      query.mockResolvedValue({ rows: [] });

      await authService.setIdle('user-123');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SET active = false'),
        expect.arrayContaining(['user-123'])
      );
    });

    it('should clear current view when setting idle', async () => {
      query.mockResolvedValue({ rows: [] });

      await authService.setIdle('user-123');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('current_view = NULL'),
        expect.arrayContaining(['user-123'])
      );
    });
  });

  // ==========================================================================
  // VALIDATE PASSWORD STRENGTH TESTS
  // ==========================================================================

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const result = authService.validatePasswordStrength('StrongP@ssw0rd');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = authService.validatePasswordStrength('Short1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password longer than 100 characters', () => {
      const longPassword = 'a'.repeat(101) + 'A1';
      const result = authService.validatePasswordStrength(longPassword);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be less than 100 characters');
    });

    it('should reject password without uppercase letter', () => {
      const result = authService.validatePasswordStrength('lowercase123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = authService.validatePasswordStrength('UPPERCASE123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = authService.validatePasswordStrength('NoNumbers');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return all validation errors for weak password', () => {
      const result = authService.validatePasswordStrength('weak');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // HASH PASSWORD TESTS
  // ==========================================================================

  describe('hashPassword', () => {
    it('should hash password using bcrypt', async () => {
      const hashedPassword = '$2b$10$hashedpassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await authService.hashPassword('PlainPassword');

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith('PlainPassword', 10);
    });
  });

  // ==========================================================================
  // COMPARE PASSWORD TESTS
  // ==========================================================================

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.comparePassword('PlainPassword', '$2b$10$hashed');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('PlainPassword', '$2b$10$hashed');
    });

    it('should return false for non-matching password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.comparePassword('WrongPassword', '$2b$10$hashed');

      expect(result).toBe(false);
    });
  });
});
