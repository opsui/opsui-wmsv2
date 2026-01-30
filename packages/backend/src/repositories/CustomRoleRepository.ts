/**
 * Custom Role repository
 *
 * Handles database operations for custom roles and permissions
 */

import { BaseRepository } from './BaseRepository';
import { CustomRole, Permission } from '@opsui/shared';
import { query } from '../db/client';
import { NotFoundError, ConflictError } from '@opsui/shared';

// ============================================================================
// CUSTOM ROLE REPOSITORY
// ============================================================================

export interface RolePermissionRow {
  role_permission_id: string;
  role_id: string;
  permission: string;
  granted_at: Date;
  granted_by: string;
}

export class CustomRoleRepository extends BaseRepository<CustomRole> {
  constructor() {
    super('custom_roles', 'role_id');
  }

  // --------------------------------------------------------------------------
  // GET ALL ROLES (including system roles from UserRole enum)
  // --------------------------------------------------------------------------

  async getAllRolesWithPermissions(): Promise<Array<{ roleId: string; name: string; permissions: Permission[] }>> {
    // Get custom roles with their permissions
    const customRolesResult = await query(`
      SELECT cr.role_id, cr.name, cr.description, cr.is_system,
             COALESCE(json_agg(rp.permission ORDER BY rp.permission) FILTER (WHERE rp.permission IS NOT NULL), '[]') as permissions
      FROM custom_roles cr
      LEFT JOIN role_permissions rp ON cr.role_id = rp.role_id
      GROUP BY cr.role_id, cr.name, cr.description, cr.is_system
      ORDER BY cr.name
    `);

    const roles: Array<{ roleId: string; name: string; permissions: Permission[] }> = customRolesResult.rows.map(row => ({
      roleId: row.role_id,
      name: row.name,
      permissions: row.permissions || [],
    }));

    return roles;
  }

  // --------------------------------------------------------------------------
  // GET CUSTOM ROLE BY ID
  // --------------------------------------------------------------------------

  async getCustomRoleById(roleId: string): Promise<CustomRole | null> {
    const result = await query(
      `SELECT cr.role_id, cr.name, cr.description, cr.is_system,
              json_agg(rp.permission ORDER BY rp.permission) FILTER (WHERE rp.permission IS NOT NULL) as permissions
       FROM custom_roles cr
       LEFT JOIN role_permissions rp ON cr.role_id = rp.role_id
       WHERE cr.role_id = $1
       GROUP BY cr.role_id, cr.name, cr.description, cr.is_system`,
      [roleId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as CustomRole;
  }

  // --------------------------------------------------------------------------
  // GET CUSTOM ROLE BY ID OR THROW
  // --------------------------------------------------------------------------

  async getCustomRoleByIdOrThrow(roleId: string): Promise<CustomRole> {
    const role = await this.getCustomRoleById(roleId);

    if (!role) {
      throw new NotFoundError('CustomRole', roleId);
    }

    return role;
  }

  // --------------------------------------------------------------------------
  // CREATE CUSTOM ROLE
  // --------------------------------------------------------------------------

  async createCustomRole(data: {
    roleId: string;
    name: string;
    description: string;
    permissions: Permission[];
    grantedBy: string;
  }): Promise<CustomRole> {
    // Check if role ID already exists
      const existing = await this.findById(data.roleId);
      if (existing) {
        throw new ConflictError(`Role with ID ${data.roleId} already exists`);
      }

      // Check if name already exists
      const existingName = await query(`SELECT * FROM custom_roles WHERE name = $1`, [data.name]);
      if (existingName.rows.length > 0) {
        throw new ConflictError(`Role with name ${data.name} already exists`);
      }

    // Create the role
    const role = await this.insert({
      roleId: data.roleId,
      name: data.name,
      description: data.description,
      isSystem: false,
    } as any);

    // Grant permissions
    if (data.permissions && data.permissions.length > 0) {
      for (const permission of data.permissions) {
        await query(
          `INSERT INTO role_permissions (role_id, permission, granted_by)
           VALUES ($1, $2, $3)`,
          [data.roleId, permission, data.grantedBy]
        );
      }
    }

    // Return the role with permissions
    return await this.getCustomRoleById(data.roleId) as CustomRole;
  }

  // --------------------------------------------------------------------------
  // UPDATE CUSTOM ROLE
  // --------------------------------------------------------------------------

  async updateCustomRole(roleId: string, data: {
    name?: string;
    description?: string;
    permissions?: Permission[];
    grantedBy: string;
  }): Promise<CustomRole> {
    const existing = await this.getCustomRoleByIdOrThrow(roleId);

    // Don't allow updating system roles
    if (existing.isSystem) {
      throw new Error('Cannot update system roles');
    }

    // Update name and description if provided
    const updates: string[] = [];
    const values: (string | boolean)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined && data.name !== existing.name) {
      // Check if name already exists
      const existingName = await query(`SELECT * FROM custom_roles WHERE name = $1 AND role_id != $2`, [
        data.name,
        roleId,
      ]);
      if (existingName.rows.length > 0) {
        throw new ConflictError(`Role with name ${data.name} already exists`);
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (updates.length > 0) {
      values.push(roleId);
      await query(
        `UPDATE custom_roles SET ${updates.join(', ')}, updated_at = NOW() WHERE role_id = $${paramIndex}`,
        values
      );
    }

    // Update permissions if provided
    if (data.permissions !== undefined) {
      // Remove all existing permissions
      await query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);

      // Add new permissions
      for (const permission of data.permissions) {
        await query(
          `INSERT INTO role_permissions (role_id, permission, granted_by)
           VALUES ($1, $2, $3)`,
          [roleId, permission, data.grantedBy]
        );
      }
    }

    // Return the updated role
    return await this.getCustomRoleById(roleId) as CustomRole;
  }

  // --------------------------------------------------------------------------
  // DELETE CUSTOM ROLE
  // --------------------------------------------------------------------------

  async deleteCustomRole(roleId: string): Promise<void> {
    const existing = await this.getCustomRoleByIdOrThrow(roleId);

    // Don't allow deleting system roles
    if (existing.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    // Delete role permissions (cascade will handle this, but being explicit)
    await query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);

    // Delete the role
    await query(`DELETE FROM custom_roles WHERE role_id = $1`, [roleId]);
  }

  // --------------------------------------------------------------------------
  // GET PERMISSIONS FOR A ROLE
  // --------------------------------------------------------------------------

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const result = await query(
      `SELECT permission FROM role_permissions WHERE role_id = $1 ORDER BY permission`,
      [roleId]
    );

    return result.rows.map(row => row.permission as Permission);
  }

  // --------------------------------------------------------------------------
  // CHECK IF ROLE HAS PERMISSION
  // --------------------------------------------------------------------------

  async roleHasPermission(roleId: string, permission: Permission): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission = $2`,
      [roleId, permission]
    );

    return (result.rows.length > 0);
  }

  // --------------------------------------------------------------------------
  // GET PERMISSIONS FOR USER (including from their base role and custom roles)
  // --------------------------------------------------------------------------

  async getUserPermissions(userId: string, userRole: string): Promise<Permission[]> {
    // Get permissions from default role permissions
    const { DEFAULT_ROLE_PERMISSIONS, Permission } = await import('@opsui/shared');

    // Debug logging - check available roles
    console.log('[getUserPermissions] Available role keys:', Object.keys(DEFAULT_ROLE_PERMISSIONS));
    console.log('[getUserPermissions] userId:', userId, 'userRole:', userRole, 'userRole type:', typeof userRole);

    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[userRole as any] || [];
    console.log('[getUserPermissions] defaultPermissions count:', defaultPermissions.length);
    if (defaultPermissions.length > 0) {
      console.log('[getUserPermissions] First few permissions:', defaultPermissions.slice(0, 5));
      console.log('[getUserPermissions] PERFORM_CYCLE_COUNTS:', Permission.PERFORM_CYCLE_COUNTS);
      console.log('[getUserPermissions] Has PERFORM_CYCLE_COUNTS:', defaultPermissions.includes(Permission.PERFORM_CYCLE_COUNTS));
      console.log('[getUserPermissions] Has ADMIN_FULL_ACCESS:', defaultPermissions.includes(Permission.ADMIN_FULL_ACCESS));
    } else {
      console.log('[getUserPermissions] WARNING: No default permissions found for role:', userRole);
    }

    // Get custom role permissions that have been granted to this user
    // Cast both sides to text for proper type comparison
    const result = await query(
      `SELECT DISTINCT rp.permission
       FROM role_permissions rp
       INNER JOIN user_role_assignments ura ON rp.role_id::text = ura.role::text
       WHERE ura.user_id = $1 AND ura.active = true
       ORDER BY rp.permission`,
      [userId]
    );

    const customPermissions = result.rows.map(row => row.permission as Permission);

    // Combine and deduplicate
    const allPermissions = [...new Set([...defaultPermissions, ...customPermissions])];

    return allPermissions;
  }

  // --------------------------------------------------------------------------
  // GET SYSTEM ROLES (predefined UserRole enum)
  // --------------------------------------------------------------------------

  async getSystemRoles(): Promise<Array<{ roleId: string; name: string; permissions: Permission[]; isSystem: boolean }>> {
    const { UserRole, DEFAULT_ROLE_PERMISSIONS } = await import('@opsui/shared');

    return Object.values(UserRole).map(role => ({
      roleId: role,
      name: role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      permissions: DEFAULT_ROLE_PERMISSIONS[role] || [],
      isSystem: true,
    }));
  }
}

// Singleton instance
export const customRoleRepository = new CustomRoleRepository();
