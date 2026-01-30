/**
 * User repository
 *
 * Handles all database operations for users
 */

import { BaseRepository } from './BaseRepository';
import { User, UserRole } from '@opsui/shared';
import { query } from '../db/client';
import { NotFoundError, ConflictError } from '@opsui/shared';
import bcrypt from 'bcrypt';

// ============================================================================
// USER REPOSITORY
// ============================================================================

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users', 'user_id');
  }

  // --------------------------------------------------------------------------
  // FIND BY EMAIL
  // --------------------------------------------------------------------------

  async findByEmail(email: string): Promise<User | null> {
    // Exclude soft-deleted users (deleted_at IS NULL)
    const result = await query<User>(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return await this.attachAdditionalRoles(user);
  }

  // --------------------------------------------------------------------------
  // FIND BY ID (override to exclude soft-deleted users)
  // --------------------------------------------------------------------------

  async findById(id: string): Promise<User | null> {
    // Exclude soft-deleted users (deleted_at IS NULL)
    const result = await query<User>(
      `SELECT * FROM users WHERE user_id = $1 AND deleted_at IS NULL`,
      [id]
    );

    const user = result.rows[0];
    return user ? await this.attachAdditionalRoles(user) : null;
  }

  // --------------------------------------------------------------------------
  // FIND BY EMAIL OR THROW
  // --------------------------------------------------------------------------

  async findByEmailOrThrow(email: string): Promise<User> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundError('User', `email: ${email}`);
    }

    return user;
  }

  // --------------------------------------------------------------------------
  // FIND BY ROLE
  // --------------------------------------------------------------------------

  async findByRole(role: UserRole, activeOnly: boolean = true): Promise<User[]> {
    const result = await query<User>(
      `SELECT * FROM users
       WHERE role = $1 ${activeOnly ? 'AND active = true' : ''}
       ORDER BY name`,
      [role]
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // FIND ACTIVE PICKERS
  // --------------------------------------------------------------------------

  async findActivePickers(): Promise<User[]> {
    const result = await query<User>(
      `SELECT DISTINCT u.*
       FROM users u
       INNER JOIN orders o ON u.user_id = o.picker_id
       WHERE u.role = 'PICKER' AND u.active = true AND o.status = 'PICKING'
       ORDER BY u.name`
    );

    return result.rows;
  }

  // --------------------------------------------------------------------------
  // VERIFY PASSWORD
  // --------------------------------------------------------------------------

  async verifyPassword(email: string, password: string): Promise<User | null> {
    // Get user with password hash (also check soft-delete)
    const result = await query(`SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const userWithHash = result.rows[0] as any;

    // Verify password (column name is already camelCased by query function)
    const isValid = await bcrypt.compare(password, userWithHash.passwordHash);

    if (!isValid) {
      return null;
    }

    // Return user without password hash - use already camelCased keys
    const { passwordHash: _, ...userWithoutPassword } = userWithHash;
    // Attach additional roles before returning
    return await this.attachAdditionalRoles(userWithoutPassword);
  }

  // --------------------------------------------------------------------------
  // CREATE USER WITH HASHED PASSWORD
  // --------------------------------------------------------------------------

  async createUserWithPassword(data: {
    userId: string;
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<User> {
    // Check if email already exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.insert({
      userId: data.userId,
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      active: true,
    } as any);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  // --------------------------------------------------------------------------
  // UPDATE PASSWORD
  // --------------------------------------------------------------------------

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [passwordHash, userId]);
  }

  // --------------------------------------------------------------------------
  // UPDATE USER ACTIVITY
  // --------------------------------------------------------------------------

  async updateLastLogin(userId: string): Promise<void> {
    await query(`UPDATE users SET last_login_at = NOW() WHERE user_id = $1`, [userId]);
  }

  // --------------------------------------------------------------------------
  // SET CURRENT TASK
  // --------------------------------------------------------------------------

  async setCurrentTask(userId: string, taskId: string | null): Promise<void> {
    await query(`UPDATE users SET current_task_id = $1 WHERE user_id = $2`, [taskId, userId]);
  }

  // --------------------------------------------------------------------------
  // GET USER WITHOUT SENSITIVE DATA
  // --------------------------------------------------------------------------

  async getUserSafe(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const result = await query(
      `SELECT * FROM users WHERE user_id = $1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) return null;

    // Attach additional roles
    return await this.attachAdditionalRoles(user);
  }

  // --------------------------------------------------------------------------
  // SET ACTIVE ROLE
  // --------------------------------------------------------------------------

  async setActiveRole(userId: string, activeRole: UserRole | null): Promise<void> {
    await query(`UPDATE users SET active_role = $1 WHERE user_id = $2`, [activeRole, userId]);
  }

  // --------------------------------------------------------------------------
  // ATTACH ADDITIONAL ROLES
  // --------------------------------------------------------------------------

  /**
   * Attach additional roles to a user object
   * This fetches granted roles from user_role_assignments table
   */
  private async attachAdditionalRoles(user: User): Promise<User> {
    const result = await query<{ role: UserRole }>(
      `SELECT role
       FROM user_role_assignments
       WHERE user_id = $1 AND active = true
       ORDER BY granted_at DESC`,
      [user.userId]
    );

    return {
      ...user,
      additionalRoles: result.rows.map(row => row.role),
    };
  }

  // --------------------------------------------------------------------------
  // GET ALL USERS
  // --------------------------------------------------------------------------

  /**
   * Get all users with their additional roles attached
   */
  async getAllUsers(): Promise<User[]> {
    const result = await query<User>(`SELECT * FROM users ORDER BY created_at DESC`);

    // Attach additional roles to each user
    const usersWithRoles = await Promise.all(
      result.rows.map(user => this.attachAdditionalRoles(user))
    );

    return usersWithRoles;
  }

  /**
   * Get users that can be assigned tasks
   * Returns basic user info (userId, name, role) for active users in specified roles
   */
  async getAssignableUsers(roles: string[]): Promise<Array<{ userId: string; name: string; role: string }>> {
    const placeholders = roles.map((_, i) => `$${i + 1}`).join(', ');

    const result = await query(
      `SELECT user_id, name, role
       FROM users
       WHERE active = true
         AND deleted_at IS NULL
         AND role IN (${placeholders})
       ORDER BY name ASC`,
      roles
    );

    return result.rows.map(row => ({
      userId: row.user_id,
      name: row.name,
      role: row.role,
    }));
  }

  // --------------------------------------------------------------------------
  // DEACTIVATE USER
  // --------------------------------------------------------------------------

  async deactivateUser(userId: string): Promise<User> {
    const result = await query(`UPDATE users SET active = false WHERE user_id = $1 RETURNING *`, [
      userId,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    return await this.attachAdditionalRoles(result.rows[0]);
  }

  // --------------------------------------------------------------------------
  // SOFT DELETE USER
  // --------------------------------------------------------------------------

  /**
   * Mark user for deletion (soft delete)
   * User will be permanently deleted after 3 days unless restored
   */
  async softDeleteUser(userId: string): Promise<User> {
    const result = await query(
      `UPDATE users SET deleted_at = NOW() WHERE user_id = $1 RETURNING *`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    return await this.attachAdditionalRoles(result.rows[0]);
  }

  // --------------------------------------------------------------------------
  // RESTORE USER
  // --------------------------------------------------------------------------

  /**
   * Restore a soft-deleted user
   * Clears the deleted_at timestamp to prevent permanent deletion
   */
  async restoreUser(userId: string): Promise<User> {
    const result = await query(
      `UPDATE users SET deleted_at = NULL WHERE user_id = $1 RETURNING *`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    return await this.attachAdditionalRoles(result.rows[0]);
  }

  // --------------------------------------------------------------------------
  // PERMANENTLY DELETE EXPIRED USERS
  // --------------------------------------------------------------------------

  /**
   * Permanently delete users past the 3-day grace period
   * This should be called by a scheduled job
   */
  async cleanupDeletedUsers(): Promise<number> {
    // Call the database function
    const result = await query<{ count: number }>(
      `SELECT cleanup_deleted_users() as count`
    );

    return result.rows[0]?.count || 0;
  }

  // --------------------------------------------------------------------------
  // ACTIVATE USER
  // --------------------------------------------------------------------------

  async activateUser(userId: string): Promise<User> {
    const result = await query(`UPDATE users SET active = true WHERE user_id = $1 RETURNING *`, [
      userId,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    return await this.attachAdditionalRoles(result.rows[0]);
  }

  // --------------------------------------------------------------------------
  // UPDATE USER
  // --------------------------------------------------------------------------

  async updateUser(userId: string, updates: {
    name?: string;
    email?: string;
    role?: UserRole;
    active?: boolean;
  }): Promise<User> {
    // Build dynamic update query
    const fields: string[] = [];
    const values: (string | boolean)[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }
    if (updates.active !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      values.push(updates.active);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(userId);

    const result = await query(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING user_id, name, email, role, active, current_task_id, created_at, last_login_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    return await this.attachAdditionalRoles(result.rows[0]);
  }
}

// Singleton instance
export const userRepository = new UserRepository();
