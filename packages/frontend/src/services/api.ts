/**
 * API service functions
 *
 * Functions for making API calls to backend
 */

import { apiClient, handleAPIError } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  UserRole,
  type Order,
  type OrderStatus,
  type OrderPriority,
  type CreateOrderDTO,
  type ClaimOrderDTO,
  type PickItemDTO,
  type CompleteOrderDTO,
  type CancelOrderDTO,
  type PickActionResponse,
  type DashboardMetricsResponse,
  type User,
  type LoginCredentials,
  type AuthTokens,
  type ExceptionType,
  type ExceptionStatus,
  type LogExceptionDTO,
  type ResolveExceptionDTO,
  type CycleCountStatus,
  type CycleCountType,
  type NZCRateRequest,
  type NZCRateResponse,
  type NZCShipmentRequest,
  type NZCShipmentResponse,
  type NZCLabelResponse,
  type BusinessRule,
  type RuleStatus,
  type RuleType,
  type Report,
  type ReportField,
  type ReportFilter,
  type ReportType,
  ReportStatus,
  type ReportFormat,
  type ReportExecution,
  type ReportSchedule,
  type ReportTemplate,
  type ReportGroup,
  type Dashboard,
  type ExportJob,
  type Integration,
  IntegrationType,
  IntegrationStatus,
  IntegrationProvider,
  SyncStatus,
  WebhookEventType,
} from '@opsui/shared';

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const response = await apiClient.post<AuthTokens>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  /**
   * Get current user info
   */
  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Set user to idle status
   */
  setIdle: async (): Promise<void> => {
    await apiClient.post('/auth/set-idle');
  },

  /**
   * Set active role (for multi-role users)
   */
  setActiveRole: async (activeRole: UserRole): Promise<{ user: User; activeRole: UserRole }> => {
    const response = await apiClient.post<{ user: User; activeRole: UserRole }>(
      '/auth/active-role',
      { activeRole }
    );
    return response.data;
  },

  /**
   * Get current user's additional roles
   */
  getMyRoles: async (): Promise<UserRole[]> => {
    const response = await apiClient.get<UserRole[]>('/role-assignments/my-roles');
    return response.data;
  },

  /**
   * Get all users (admin only)
   */
  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  },

  /**
   * Get assignable users (authenticated)
   * Returns basic info (userId, name, role) for users who can be assigned tasks
   */
  getAssignableUsers: async (): Promise<Array<{ userId: string; name: string; role: string }>> => {
    const response =
      await apiClient.get<Array<{ userId: string; name: string; role: string }>>(
        '/users/assignable'
      );
    return response.data;
  },

  /**
   * Create a new user (admin only)
   */
  createUser: async (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<User> => {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
  },

  /**
   * Update a user (admin only)
   */
  updateUser: async (
    userId: string,
    data: {
      name?: string;
      email?: string;
      role?: UserRole;
      active?: boolean;
    }
  ): Promise<User> => {
    const response = await apiClient.put<User>(`/users/${userId}`, data);
    return response.data;
  },

  /**
   * Delete/deactivate a user (admin only)
   */
  deleteUser: async (userId: string): Promise<User> => {
    const response = await apiClient.delete<User>(`/users/${userId}`);
    return response.data;
  },

  /**
   * Restore a soft-deleted user (admin only)
   */
  restoreUser: async (userId: string): Promise<User> => {
    const response = await apiClient.post<User>(`/users/${userId}/restore`);
    return response.data;
  },
};

// ============================================================================
// ROLE ASSIGNMENTS API
// ============================================================================

export const roleAssignmentApi = {
  /**
   * Get all role assignments (admin only)
   */
  getAllAssignments: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/role-assignments');
    return response.data;
  },

  /**
   * Get role assignments for a specific user
   */
  getUserAssignments: async (userId: string): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/role-assignments/user/${userId}`);
    return response.data;
  },

  /**
   * Grant a role to a user (admin only)
   */
  grantRole: async (userId: string, role: UserRole): Promise<any> => {
    const response = await apiClient.post<any>('/role-assignments/grant', { userId, role });
    return response.data;
  },

  /**
   * Revoke a role from a user (admin only)
   */
  revokeRole: async (userId: string, role: UserRole): Promise<void> => {
    await apiClient.delete('/role-assignments/revoke', { data: { userId, role } });
  },
};

// ============================================================================
// ORDER API
// ============================================================================

export const orderApi = {
  /**
   * Create a new order
   */
  createOrder: async (dto: CreateOrderDTO): Promise<Order> => {
    const response = await apiClient.post<Order>('/orders', dto);
    return response.data;
  },

  /**
   * Get order queue
   */
  getOrderQueue: async (params?: {
    status?: OrderStatus;
    priority?: OrderPriority;
    pickerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; total: number }> => {
    const response = await apiClient.get<{ orders: Order[]; total: number }>('/orders', { params });
    return response.data;
  },

  /**
   * Get my active orders
   */
  getMyOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders/my-orders');
    return response.data;
  },

  /**
   * Get order details
   */
  getOrder: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Claim an order
   */
  claimOrder: async (orderId: string, dto: ClaimOrderDTO): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/claim`, dto);
    return response.data;
  },

  /**
   * Continue an already claimed order (logs the continue action in audit)
   */
  continueOrder: async (orderId: string): Promise<{ orderId: string; status: string }> => {
    const response = await apiClient.post<{ orderId: string; status: string }>(
      `/orders/${orderId}/continue`
    );
    return response.data;
  },

  /**
   * Get next pick task
   */
  getNextTask: async (
    orderId: string
  ): Promise<{
    pickTaskId: string;
    sku: string;
    name: string;
    targetBin: string;
    quantity: number;
    pickedQuantity: number;
  } | null> => {
    const response = await apiClient.get(`/orders/${orderId}/next-task`);
    return response.data;
  },

  /**
   * Pick an item
   */
  pickItem: async (orderId: string, dto: PickItemDTO): Promise<PickActionResponse> => {
    const response = await apiClient.post<PickActionResponse>(`/orders/${orderId}/pick`, dto);
    return response.data;
  },

  /**
   * Complete order
   */
  completeOrder: async (orderId: string, dto: CompleteOrderDTO): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/complete`, dto);
    return response.data;
  },

  /**
   * Cancel order
   */
  cancelOrder: async (orderId: string, dto: CancelOrderDTO): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/cancel`, dto);
    return response.data;
  },

  /**
   * Skip pick task
   */
  skipTask: async (orderId: string, pickTaskId: string, reason: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/skip-task`, {
      pickTaskId,
      reason,
    });
    return response.data;
  },

  /**
   * Get order progress
   */
  getProgress: async (
    orderId: string
  ): Promise<{
    total: number;
    completed: number;
    skipped: number;
    inProgress: number;
    pending: number;
    percentage: number;
  }> => {
    const response = await apiClient.get(`/orders/${orderId}/progress`);
    return response.data;
  },
};

// ============================================================================
// INVENTORY API
// ============================================================================

export const inventoryApi = {
  /**
   * Get inventory by SKU
   */
  getBySKU: async (sku: string) => {
    const response = await apiClient.get(`/inventory/sku/${sku}`);
    return response.data;
  },

  /**
   * Get inventory by bin location
   */
  getByBin: async (binLocation: string) => {
    const response = await apiClient.get(`/inventory/bin/${binLocation}`);
    return response.data;
  },

  /**
   * Get available inventory for SKU
   */
  getAvailable: async (sku: string) => {
    const response = await apiClient.get(`/inventory/sku/${sku}/available`);
    return response.data;
  },

  /**
   * Get transaction history
   */
  getTransactions: async (params?: {
    sku?: string;
    orderId?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/inventory/transactions', { params });
    return response.data;
  },

  /**
   * Get low stock alerts
   */
  getLowStock: async (threshold?: number) => {
    const response = await apiClient.get('/inventory/alerts/low-stock', {
      params: threshold ? { threshold } : undefined,
    });
    return response.data;
  },

  /**
   * Reconcile inventory
   */
  reconcile: async (sku: string) => {
    const response = await apiClient.get(`/inventory/reconcile/${sku}`);
    return response.data;
  },

  /**
   * Adjust inventory
   */
  adjust: async (sku: string, binLocation: string, quantity: number, reason: string) => {
    const response = await apiClient.post('/inventory/adjust', {
      sku,
      binLocation,
      quantity,
      reason,
    });
    return response.data;
  },
};

// ============================================================================
// METRICS API
// ============================================================================

export const metricsApi = {
  /**
   * Get dashboard metrics
   */
  getDashboard: async (): Promise<DashboardMetricsResponse> => {
    const response = await apiClient.get<DashboardMetricsResponse>('/metrics/dashboard');
    return response.data;
  },

  /**
   * Get picker performance
   */
  getPickerPerformance: async (pickerId: string, startDate?: Date, endDate?: Date) => {
    const response = await apiClient.get(`/metrics/picker/${pickerId}`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Get all pickers performance
   */
  getAllPickersPerformance: async (startDate?: Date, endDate?: Date) => {
    const response = await apiClient.get('/metrics/pickers', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Get all packers performance
   */
  getAllPackersPerformance: async (startDate?: Date, endDate?: Date) => {
    const response = await apiClient.get('/metrics/packers', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Get all stock controllers performance
   */
  getAllStockControllersPerformance: async (startDate?: Date, endDate?: Date) => {
    const response = await apiClient.get('/metrics/stock-controllers', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Get order status breakdown
   */
  getOrderStatusBreakdown: async () => {
    const response = await apiClient.get('/metrics/orders/status-breakdown');
    return response.data;
  },

  /**
   * Get hourly throughput
   */
  getHourlyThroughput: async () => {
    const response = await apiClient.get('/metrics/orders/hourly-throughput');
    return response.data;
  },

  /**
   * Get throughput by time range
   */
  getThroughputByRange: async (
    range: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'daily'
  ) => {
    const response = await apiClient.get('/metrics/orders/throughput', {
      params: { range },
    });
    return response.data;
  },

  /**
   * Get picker activity
   */
  getPickerActivity: async () => {
    const response = await apiClient.get('/metrics/picker-activity');
    return response.data;
  },

  /**
   * Get picker orders
   */
  getPickerOrders: async (pickerId: string) => {
    const response = await apiClient.get(`/metrics/picker/${pickerId}/orders`);
    return response.data;
  },

  /**
   * Get packer activity
   */
  getPackerActivity: async () => {
    const response = await apiClient.get('/metrics/packer-activity');
    return response.data;
  },

  /**
   * Get packer orders
   */
  getPackerOrders: async (packerId: string) => {
    const response = await apiClient.get(`/metrics/packer/${packerId}/orders`);
    return response.data;
  },

  /**
   * Get stock controller activity
   */
  getStockControllerActivity: async () => {
    const response = await apiClient.get('/metrics/stock-controller-activity');
    return response.data;
  },

  /**
   * Get my performance
   */
  getMyPerformance: async (startDate?: Date, endDate?: Date) => {
    const response = await apiClient.get('/metrics/my-performance', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Get top SKUs by scan type
   */
  getTopSKUs: async (
    limit: number = 10,
    scanType: 'pick' | 'pack' | 'verify' | 'all' = 'pick',
    timePeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ) => {
    const response = await apiClient.get('/metrics/skus/top-picked', {
      params: { limit, scanType, timePeriod },
    });
    return response.data;
  },
};

// ============================================================================
// AUDIT LOGS API
// ============================================================================

export interface AuditLog {
  id?: number;
  auditId?: string;
  occurredAt?: Date | string;
  userId: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  sessionId?: string | null;
  actionType: string;
  actionCategory: string;
  actionDescription: string;
  resourceType?: string | null;
  resourceId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  changedFields?: string[] | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  status?: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  retentionUntil?: Date | string;
}

export interface AuditStatistics {
  totalLogs: number;
  byCategory: Record<string, number>;
  byAction: Record<string, number>;
  topUsers: Array<{ userEmail: string; count: number }>;
}

export const auditApi = {
  /**
   * Get audit logs with optional filters
   */
  getLogs: async (
    options: {
      userId?: string;
      username?: string;
      category?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLog[]>('/audit/logs', {
      params: options,
    });
    return response.data;
  },

  /**
   * Get a specific audit log by ID
   */
  getLogById: async (id: number): Promise<AuditLog> => {
    const response = await apiClient.get<AuditLog>(`/audit/logs/${id}`);
    return response.data;
  },

  /**
   * Get audit log statistics
   */
  getStatistics: async (startDate?: Date, endDate?: Date): Promise<AuditStatistics> => {
    const response = await apiClient.get<AuditStatistics>('/audit/statistics', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Get audit history for a specific resource
   */
  getResourceHistory: async (
    resourceType: string,
    resourceId: string,
    limit: number = 50
  ): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLog[]>(
      `/audit/resource/${resourceType}/${resourceId}`,
      {
        params: { limit },
      }
    );
    return response.data;
  },

  /**
   * Get audit history for a specific user
   */
  getUserActivity: async (userId: string, limit: number = 100): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLog[]>(`/audit/user/${userId}`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get security-related events
   */
  getSecurityEvents: async (startDate?: Date, endDate?: Date): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLog[]>('/audit/security-events', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  /**
   * Get all available audit categories
   */
  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/audit/categories');
    return response.data;
  },

  /**
   * Get all available audit event types
   */
  getActions: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/audit/actions');
    return response.data;
  },

  /**
   * Get all unique user emails from audit logs
   */
  getUsers: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/audit/users');
    return response.data;
  },

  /**
   * Get all unique resource types from audit logs
   */
  getResourceTypes: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/audit/resource-types');
    return response.data;
  },
};

// ============================================================================
// SKU API
// ============================================================================

export const skuApi = {
  /**
   * Search SKUs
   */
  search: async (query: string) => {
    const response = await apiClient.get('/skus', { params: { q: query } });
    return response.data;
  },

  /**
   * Get categories
   */
  getCategories: async () => {
    const response = await apiClient.get<string[]>('/skus/categories');
    return response.data;
  },

  /**
   * Get SKU details with inventory
   */
  getWithInventory: async (sku: string) => {
    const response = await apiClient.get(`/skus/${sku}`);
    return response.data;
  },
};

// SKU hooks
export const useSKUSearch = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['skus', 'search', query],
    queryFn: () => skuApi.search(query),
    enabled: enabled && query.length >= 2,
  });
};

export const useSKUCategories = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['skus', 'categories'],
    queryFn: skuApi.getCategories,
    enabled,
  });
};

export const useSKUWithInventory = (sku: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['skus', sku],
    queryFn: () => skuApi.getWithInventory(sku),
    enabled: enabled && !!sku,
  });
};

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

// Auth hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: authApi.login,
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

export const useUpdateCurrentView = () => {
  return useMutation({
    mutationFn: async (view: string) => {
      console.log('[useUpdateCurrentView] Calling API with view:', view);
      const response = await apiClient.post('/auth/current-view', { view });
      console.log('[useUpdateCurrentView] Success:', response.data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      console.log('[useUpdateCurrentView] onSuccess - View updated:', variables);
    },
    onError: error => {
      console.error('[useUpdateCurrentView] onError - Failed to update view:', error);
    },
  });
};

export const useSetIdle = () => {
  return useMutation({
    mutationFn: async () => {
      console.log('[useSetIdle] Setting user to idle');
      const response = await apiClient.post('/auth/set-idle');
      console.log('[useSetIdle] Success:', response.data);
      return response.data;
    },
    onError: error => {
      console.error('[useSetIdle] onError - Failed to set idle:', error);
    },
  });
};

export const useSetActiveRole = () => {
  const setActiveRole = useAuthStore(state => state.setActiveRole);
  const setUser = useAuthStore(state => state.setUser);

  return useMutation({
    mutationFn: async (activeRole: UserRole) => {
      console.log('[useSetActiveRole] Setting active role:', activeRole);
      const response = await apiClient.post('/auth/active-role', { activeRole });
      console.log('[useSetActiveRole] API response:', response.data);
      return response.data;
    },
    onSuccess: data => {
      console.log('[useSetActiveRole] Success - Updating auth store:', data);
      // Backend returns: { user, activeRole: role, accessToken: newAccessToken }
      // The user object may not have activeRole set, so we update it with the returned activeRole
      const updatedUser = data.user ? { ...data.user, activeRole: data.activeRole } : null;

      // Update user and activeRole in auth store
      if (updatedUser) {
        setUser(updatedUser);
      } else {
        // Fallback: just set activeRole if no user returned
        setActiveRole(data.activeRole);
      }

      // Update access token if provided
      if (data.accessToken) {
        useAuthStore.getState().accessToken = data.accessToken;
      }
    },
    onError: error => {
      console.error('[useSetActiveRole] Failed to set active role:', error);
      handleAPIError(error);
    },
  });
};

// ============================================================================
// ROLE ASSIGNMENTS HOOKS
// ============================================================================

export const useMyRoles = (options?: Omit<UseQueryOptions<UserRole[]>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['role-assignments', 'my-roles'],
    queryFn: authApi.getMyRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useUsers = (options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: authApi.getAllUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useAssignableUsers = (
  options?: Omit<
    UseQueryOptions<Array<{ userId: string; name: string; role: string }>>,
    'queryKey' | 'queryFn'
  >
) => {
  return useQuery({
    queryKey: ['users', 'assignable'],
    queryFn: authApi.getAssignableUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useAllRoleAssignments = () => {
  return useQuery({
    queryKey: ['role-assignments', 'all'],
    queryFn: roleAssignmentApi.getAllAssignments,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useGrantRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      roleAssignmentApi.grantRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useRevokeRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      roleAssignmentApi.revokeRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

// User management hooks
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: UserRole }) =>
      authApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: { name?: string; email?: string; role?: UserRole; active?: boolean };
    }) => authApi.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => authApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useRestoreUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => authApi.restoreUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useCurrentUser = (options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    ...options,
  });
};

// Order hooks
export const useOrderQueue = (params?: {
  status?: OrderStatus;
  priority?: OrderPriority;
  pickerId?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['orders', 'queue', params],
    queryFn: () => orderApi.getOrderQueue(params),
    enabled: params?.enabled ?? true,
  });
};

export const useMyOrders = () => {
  return useQuery({
    queryKey: ['orders', 'my'],
    queryFn: orderApi.getMyOrders,
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => orderApi.getOrder(orderId),
    enabled: !!orderId,
  });
};

export const useNextTask = (orderId: string) => {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: ['orders', orderId, 'next-task'],
    queryFn: () => {
      console.log(`[useNextTask] Fetching next task for order: ${orderId}`);
      return orderApi.getNextTask(orderId);
    },
    enabled: !!orderId,
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: 'always', // Always refetch on component mount
  });

  // Invalidate picker activity cache when next task successfully fetches
  // This ensures admin dashboard updates when picker navigates to picking page
  const { data, error, isError } = result;

  if (data !== undefined) {
    console.log(`[useNextTask] Success for order ${orderId}:`, data);
    queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
  }

  if (isError) {
    console.error(`[useNextTask] Error for order ${orderId}:`, error);
  }

  return result;
};

export const useClaimOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, dto }: { orderId: string; dto: ClaimOrderDTO }) =>
      orderApi.claimOrder(orderId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
    },
  });
};

export const useContinueOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId }: { orderId: string }) => orderApi.continueOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
    },
  });
};

export const usePickItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, dto }: { orderId: string; dto: PickItemDTO }) =>
      orderApi.pickItem(orderId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
    },
  });
};

export const useCompleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, dto }: { orderId: string; dto: CompleteOrderDTO }) =>
      orderApi.completeOrder(orderId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'picker-activity'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'my'] });
    },
  });
};

// Metrics hooks
export const useDashboardMetrics = (
  options?: Omit<UseQueryOptions<DashboardMetricsResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['metrics', 'dashboard'],
    queryFn: metricsApi.getDashboard,
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: 'always', // Refetch when window regains focus
    ...options,
  });
};

export const usePickerActivity = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  const result = useQuery({
    queryKey: ['metrics', 'picker-activity'],
    queryFn: async () => {
      const data = await metricsApi.getPickerActivity();
      return data;
    },
    refetchInterval: 1000, // Poll every 1 second for real-time updates
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data (gcTime replaced cacheTime in v5)
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: 'always', // Refetch when window regains focus
    retry: 1, // Only retry once
    ...options,
  });

  return result;
};

export const usePickerOrders = (pickerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['metrics', 'picker-orders', pickerId],
    queryFn: () => metricsApi.getPickerOrders(pickerId),
    enabled: enabled && !!pickerId,
    staleTime: 5000, // Cache for 5 seconds
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
};

export const usePackerActivity = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  const result = useQuery({
    queryKey: ['metrics', 'packer-activity'],
    queryFn: async () => {
      const data = await metricsApi.getPackerActivity();
      return data as unknown[];
    },
    refetchInterval: 1000, // Poll every 1 second for real-time updates
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data (gcTime replaced cacheTime in v5)
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: 'always', // Refetch when window regains focus
    retry: 1, // Only retry once
    ...options,
  });

  return result;
};

export const usePackerOrders = (packerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['metrics', 'packer-orders', packerId],
    queryFn: () => metricsApi.getPackerOrders(packerId),
    enabled: enabled && !!packerId,
    staleTime: 5000, // Cache for 5 seconds
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
};

// ============================================================================
// SHIPPED ORDERS
// ============================================================================

export interface ShippedOrdersFilters {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  carrier?: string;
  search?: string;
  sortBy?: 'shippedAt' | 'customerName' | 'totalValue';
  sortOrder?: 'asc' | 'desc';
}

export const useShippedOrders = (filters: ShippedOrdersFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.dateFrom) params.append('startDate', filters.dateFrom);
  if (filters.dateTo) params.append('endDate', filters.dateTo);
  if (filters.carrier) params.append('carrierId', filters.carrier);
  if (filters.search) params.append('search', filters.search);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

  return useQuery({
    queryKey: ['orders', 'shipped', filters],
    queryFn: () => apiClient.get(`/shipping/orders?${params}`),
    staleTime: 30000, // Cache for 30 seconds
  });
};

export const useExportShippedOrders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      const response = await apiClient.get(
        `/shipping/orders/export?orderIds=${orderIds.join(',')}`,
        {
          responseType: 'blob',
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'shipped'] });
    },
  });
};

export const useStockControllerActivity = (
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  const result = useQuery({
    queryKey: ['metrics', 'stock-controller-activity'],
    queryFn: async () => {
      const data = await metricsApi.getStockControllerActivity();
      return data as unknown[];
    },
    refetchInterval: 1000, // Poll every 1 second for real-time updates
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data (gcTime replaced cacheTime in v5)
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: 'always', // Refetch when window regains focus
    retry: 1, // Only retry once
    ...options,
  });

  return result;
};

/**
 * Get stock controller transactions
 */
export const getStockControllerTransactions = async (controllerId: string) => {
  const response = await apiClient.get(`/metrics/stock-controller/${controllerId}/transactions`);
  return response.data;
};

export const useStockControllerTransactions = (controllerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['metrics', 'stock-controller-transactions', controllerId],
    queryFn: () => getStockControllerTransactions(controllerId),
    enabled: enabled && !!controllerId,
    staleTime: 5000, // Cache for 5 seconds
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
};

// Unified role activity hook - works with all UserRole values
export const useRoleActivity = (
  role: UserRole | 'all',
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  const pickerActivity = usePickerActivity(options);
  const packerActivity = usePackerActivity(options);
  const stockControllerActivity = useStockControllerActivity(options);

  // If role is 'all', return all activities combined (including empty arrays for roles without endpoints)
  if (role === 'all') {
    const combinedData: Record<UserRole, unknown> = {
      [UserRole.PICKER]: pickerActivity.data,
      [UserRole.PACKER]: packerActivity.data,
      [UserRole.STOCK_CONTROLLER]: stockControllerActivity.data,
      [UserRole.INWARDS]: [],
      [UserRole.PRODUCTION]: [],
      [UserRole.SALES]: [],
      [UserRole.MAINTENANCE]: [],
      [UserRole.RMA]: [],
      [UserRole.SUPERVISOR]: [],
      [UserRole.ADMIN]: [],
    };
    return {
      data: combinedData,
      isLoading:
        pickerActivity.isLoading || packerActivity.isLoading || stockControllerActivity.isLoading,
      error: pickerActivity.error || packerActivity.error || stockControllerActivity.error,
    };
  }

  // Return specific role activity
  const roleHooks: Partial<Record<UserRole, ReturnType<typeof usePickerActivity>>> = {
    [UserRole.PICKER]: pickerActivity,
    [UserRole.PACKER]: packerActivity,
    [UserRole.STOCK_CONTROLLER]: stockControllerActivity,
    // Other roles return empty data until backend endpoints are implemented
    [UserRole.INWARDS]: { data: [], isLoading: false, error: undefined } as any,
    [UserRole.PRODUCTION]: { data: [], isLoading: false, error: undefined } as any,
    [UserRole.SALES]: { data: [], isLoading: false, error: undefined } as any,
    [UserRole.MAINTENANCE]: { data: [], isLoading: false, error: undefined } as any,
    [UserRole.RMA]: { data: [], isLoading: false, error: undefined } as any,
    [UserRole.SUPERVISOR]: { data: [], isLoading: false, error: undefined } as any,
    [UserRole.ADMIN]: { data: [], isLoading: false, error: undefined } as any,
  };

  return roleHooks[role] || { data: [], isLoading: false, error: undefined };
};

// Unified role orders/transactions hook - works with all UserRole values
export const useRoleDetails = (role: UserRole, roleId: string | null, enabled: boolean = true) => {
  const pickerOrders = usePickerOrders(
    roleId || '',
    role === UserRole.PICKER && enabled && !!roleId
  );
  const packerOrders = usePackerOrders(
    roleId || '',
    role === UserRole.PACKER && enabled && !!roleId
  );
  const controllerTransactions = useStockControllerTransactions(
    roleId || '',
    role === UserRole.STOCK_CONTROLLER && enabled && !!roleId
  );

  const roleHooks: Partial<Record<UserRole, any>> = {
    [UserRole.PICKER]: { ...pickerOrders, data: pickerOrders.data },
    [UserRole.PACKER]: { ...packerOrders, data: packerOrders.data },
    [UserRole.STOCK_CONTROLLER]: { ...controllerTransactions, data: controllerTransactions.data },
    // Other roles return empty data until backend endpoints are implemented
    [UserRole.INWARDS]: { data: [], isLoading: false, error: undefined },
    [UserRole.PRODUCTION]: { data: [], isLoading: false, error: undefined },
    [UserRole.SALES]: { data: [], isLoading: false, error: undefined },
    [UserRole.MAINTENANCE]: { data: [], isLoading: false, error: undefined },
    [UserRole.RMA]: { data: [], isLoading: false, error: undefined },
    [UserRole.SUPERVISOR]: { data: [], isLoading: false, error: undefined },
    [UserRole.ADMIN]: { data: [], isLoading: false, error: undefined },
  };

  return roleHooks[role] || { data: [], isLoading: false, error: undefined };
};

// Graph data hooks
export const useHourlyThroughput = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['metrics', 'hourly-throughput'],
    queryFn: metricsApi.getHourlyThroughput,
    refetchInterval: 60000, // Poll every minute
    staleTime: 30000, // Consider data fresh for 30 seconds
    ...options,
  });
};

export const useThroughputByRange = (
  range: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'daily',
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['metrics', 'throughput-by-range', range],
    queryFn: () => metricsApi.getThroughputByRange(range),
    refetchInterval: 60000, // Poll every minute
    staleTime: 30000, // Consider data fresh for 30 seconds
    ...options,
  });
};

export const useOrderStatusBreakdown = (
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['metrics', 'order-status-breakdown'],
    queryFn: metricsApi.getOrderStatusBreakdown,
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 15000,
    ...options,
  });
};

export const useTopSKUs = (
  limit: number = 10,
  scanType: 'pick' | 'pack' | 'verify' | 'all' = 'pick',
  timePeriod: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly',
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['metrics', 'top-skus', limit, scanType, timePeriod],
    queryFn: () => metricsApi.getTopSKUs(limit, scanType, timePeriod),
    refetchInterval: 300000, // Poll every 5 minutes
    staleTime: 180000, // Consider data fresh for 3 minutes
    ...options,
  });
};

// ============================================================================
// AUDIT LOGS HOOKS
// ============================================================================

export const useAuditLogs = (
  options: {
    userId?: string;
    username?: string;
    category?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {},
  queryOptions?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['audit', 'logs', options],
    queryFn: async (): Promise<AuditLog[]> => {
      // Defensive check: verify user has admin/supervisor role before making request
      // This prevents unauthorized API calls even if enabled: true is passed incorrectly
      const authState = useAuthStore.getState();
      const baseRole = authState.user?.role;
      const isAdminOrSupervisor = baseRole === UserRole.ADMIN || baseRole === UserRole.SUPERVISOR;

      if (!isAdminOrSupervisor) {
        console.warn(
          '[useAuditLogs] Skipping audit logs fetch - user does not have admin/supervisor role',
          { baseRole }
        );
        return [];
      }

      return auditApi.getLogs(options);
    },
    refetchInterval: 5000, // Poll every 5 seconds for near-instant updates
    staleTime: 2000,
    ...queryOptions,
  });
};

export const useAuditStatistics = (
  startDate?: Date,
  endDate?: Date,
  queryOptions?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  const startDateKey = startDate?.toISOString();
  const endDateKey = endDate?.toISOString();

  return useQuery({
    queryKey: ['audit', 'statistics', startDateKey, endDateKey],
    queryFn: async (): Promise<AuditStatistics> => auditApi.getStatistics(startDate, endDate),
    refetchInterval: 120000, // Poll every 2 minutes
    staleTime: 60000,
    ...queryOptions,
  });
};

export const useAuditCategories = () => {
  return useQuery({
    queryKey: ['audit', 'categories'],
    queryFn: auditApi.getCategories,
    staleTime: 300000, // Categories don't change often
  });
};

export const useAuditActions = () => {
  return useQuery({
    queryKey: ['audit', 'actions'],
    queryFn: auditApi.getActions,
    staleTime: 300000, // Actions don't change often
  });
};

export const useAuditUsers = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['audit', 'users'],
    queryFn: auditApi.getUsers,
    ...options,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAuditResourceTypes = (options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: ['audit', 'resource-types'],
    queryFn: auditApi.getResourceTypes,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useAllPickersPerformance = (
  startDate?: Date,
  endDate?: Date,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  // Convert dates to ISO strings for stable query keys (Date objects change on every render)
  const startDateKey = startDate?.toISOString();
  const endDateKey = endDate?.toISOString();

  return useQuery({
    queryKey: ['metrics', 'all-pickers-performance', startDateKey, endDateKey],
    queryFn: () => metricsApi.getAllPickersPerformance(startDate, endDate),
    refetchInterval: 60000, // Poll every minute
    staleTime: 30000,
    ...options,
  });
};

export const useAllPackersPerformance = (
  startDate?: Date,
  endDate?: Date,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  // Convert dates to ISO strings for stable query keys
  const startDateKey = startDate?.toISOString();
  const endDateKey = endDate?.toISOString();

  return useQuery({
    queryKey: ['metrics', 'all-packers-performance', startDateKey, endDateKey],
    queryFn: () => metricsApi.getAllPackersPerformance(startDate, endDate),
    refetchInterval: 60000,
    staleTime: 30000,
    ...options,
  });
};

export const useAllStockControllersPerformance = (
  startDate?: Date,
  endDate?: Date,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) => {
  // Convert dates to ISO strings for stable query keys
  const startDateKey = startDate?.toISOString();
  const endDateKey = endDate?.toISOString();

  return useQuery({
    queryKey: ['metrics', 'all-stock-controllers-performance', startDateKey, endDateKey],
    queryFn: () => metricsApi.getAllStockControllersPerformance(startDate, endDate),
    refetchInterval: 60000,
    staleTime: 30000,
    ...options,
  });
};

// ============================================================================
// PACKING API
// ============================================================================

export const packingApi = {
  /**
   * Claim an order for packing
   */
  claimForPacking: async (orderId: string, packerId: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/claim-for-packing`, {
      packer_id: packerId,
    });
    return response.data;
  },

  /**
   * Complete packing
   */
  completePacking: async (
    orderId: string,
    dto: { orderId: string; packerId: string }
  ): Promise<Order> => {
    const response = await apiClient.post<Order>(`/orders/${orderId}/complete-packing`, {
      orderId: dto.orderId,
      packer_id: dto.packerId,
    });
    return response.data;
  },

  /**
   * Get packing queue (orders ready for packing)
   */
  getPackingQueue: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders/packing-queue');
    return response.data;
  },
};

// Packer hooks
export const useClaimOrderForPacking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, packerId }: { orderId: string; packerId: string }) =>
      packingApi.claimForPacking(orderId, packerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });
    },
  });
};

export const useCompletePacking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      dto,
    }: {
      orderId: string;
      dto: { orderId: string; packerId: string };
    }) => packingApi.completePacking(orderId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'dashboard'] });
    },
  });
};

export const usePackingQueue = () => {
  return useQuery({
    queryKey: ['orders', 'packing-queue'],
    queryFn: packingApi.getPackingQueue,
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useUnclaimOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const response = await apiClient.post(`/orders/${orderId}/unclaim`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'packing-queue'] });
    },
  });
};

// ============================================================================
// STOCK CONTROL API
// ============================================================================

export const stockControlApi = {
  /**
   * Get stock control dashboard
   */
  getDashboard: async () => {
    const response = await apiClient.get('/stock-control/dashboard');
    return response.data;
  },

  /**
   * Get inventory list with filters
   */
  getInventoryList: async (params: {
    name?: string;
    sku?: string;
    category?: string;
    binLocation?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/stock-control/inventory', { params });
    return response.data;
  },

  /**
   * Get SKU inventory detail
   */
  getSKUInventoryDetail: async (sku: string) => {
    const response = await apiClient.get(`/stock-control/inventory/${sku}`);
    return response.data;
  },

  /**
   * Create stock count
   */
  createStockCount: async (binLocation: string, type: 'FULL' | 'CYCLE' | 'SPOT') => {
    const response = await apiClient.post('/stock-control/stock-count', { binLocation, type });
    return response.data;
  },

  /**
   * Submit stock count
   */
  submitStockCount: async (
    countId: string,
    items: Array<{ sku: string; countedQuantity: number; notes?: string }>
  ) => {
    const response = await apiClient.post(`/stock-control/stock-count/${countId}/submit`, {
      items,
    });
    return response.data;
  },

  /**
   * Get stock counts
   */
  getStockCounts: async (params?: { status?: string; limit?: number; offset?: number }) => {
    const response = await apiClient.get('/stock-control/stock-counts', { params });
    return response.data;
  },

  /**
   * Transfer stock
   */
  transferStock: async (
    sku: string,
    fromBin: string,
    toBin: string,
    quantity: number,
    reason: string
  ) => {
    const response = await apiClient.post('/stock-control/transfer', {
      sku,
      fromBin,
      toBin,
      quantity,
      reason,
    });
    return response.data;
  },

  /**
   * Adjust inventory
   */
  adjustInventory: async (sku: string, binLocation: string, quantity: number, reason: string) => {
    const response = await apiClient.post('/stock-control/adjust', {
      sku,
      binLocation,
      quantity,
      reason,
    });
    return response.data;
  },

  /**
   * Get transaction history
   */
  getTransactionHistory: async (params?: {
    sku?: string;
    binLocation?: string;
    type?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/stock-control/transactions', { params });
    return response.data;
  },

  /**
   * Get low stock report
   */
  getLowStockReport: async (threshold?: number) => {
    const response = await apiClient.get('/stock-control/reports/low-stock', {
      params: threshold ? { threshold } : undefined,
    });
    return response.data;
  },

  /**
   * Get movement report
   */
  getMovementReport: async (params?: { startDate?: string; endDate?: string; sku?: string }) => {
    const response = await apiClient.get('/stock-control/reports/movements', { params });
    return response.data;
  },

  /**
   * Reconcile discrepancies
   */
  reconcileDiscrepancies: async (
    discrepancies: Array<{
      sku: string;
      binLocation: string;
      systemQuantity: number;
      actualQuantity: number;
      variance: number;
      reason: string;
    }>
  ) => {
    const response = await apiClient.post('/stock-control/reconcile', { discrepancies });
    return response.data;
  },

  /**
   * Get bin locations
   */
  getBinLocations: async (params?: { zone?: string; active?: boolean }) => {
    const response = await apiClient.get('/stock-control/bins', { params });
    return response.data;
  },
};

// Stock control hooks
export const useStockControlDashboard = () => {
  return useQuery({
    queryKey: ['stock-control', 'dashboard'],
    queryFn: stockControlApi.getDashboard,
    refetchInterval: 5000,
  });
};

export const useStockControlInventory = (params: {
  name?: string;
  sku?: string;
  category?: string;
  binLocation?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['stock-control', 'inventory', params],
    queryFn: () => stockControlApi.getInventoryList(params),
  });
};

export const useSKUInventoryDetail = (sku: string) => {
  return useQuery({
    queryKey: ['stock-control', 'inventory', sku],
    queryFn: () => stockControlApi.getSKUInventoryDetail(sku),
    enabled: !!sku,
  });
};

export const useCreateStockCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ binLocation, type }: { binLocation: string; type: 'FULL' | 'CYCLE' | 'SPOT' }) =>
      stockControlApi.createStockCount(binLocation, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-control'] });
    },
  });
};

export const useSubmitStockCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      countId,
      items,
    }: {
      countId: string;
      items: Array<{ sku: string; countedQuantity: number; notes?: string }>;
    }) => stockControlApi.submitStockCount(countId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-control'] });
    },
  });
};

export const useStockCounts = (params?: { status?: string; limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: ['stock-control', 'stock-counts', params],
    queryFn: () => stockControlApi.getStockCounts(params),
  });
};

export const useTransferStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sku,
      fromBin,
      toBin,
      quantity,
      reason,
    }: {
      sku: string;
      fromBin: string;
      toBin: string;
      quantity: number;
      reason: string;
    }) => stockControlApi.transferStock(sku, fromBin, toBin, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-control'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useAdjustInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sku,
      binLocation,
      quantity,
      reason,
    }: {
      sku: string;
      binLocation: string;
      quantity: number;
      reason: string;
    }) => stockControlApi.adjustInventory(sku, binLocation, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-control'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useStockControlTransactions = (params?: {
  sku?: string;
  binLocation?: string;
  type?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['stock-control', 'transactions', params],
    queryFn: () => stockControlApi.getTransactionHistory(params),
  });
};

export const useLowStockReport = (threshold?: number) => {
  return useQuery({
    queryKey: ['stock-control', 'reports', 'low-stock', threshold],
    queryFn: () => stockControlApi.getLowStockReport(threshold),
  });
};

export const useMovementReport = (params?: {
  startDate?: string;
  endDate?: string;
  sku?: string;
}) => {
  return useQuery({
    queryKey: ['stock-control', 'reports', 'movements', params],
    queryFn: () => stockControlApi.getMovementReport(params),
  });
};

export const useReconcileDiscrepancies = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      discrepancies: Array<{
        sku: string;
        binLocation: string;
        systemQuantity: number;
        actualQuantity: number;
        variance: number;
        reason: string;
      }>
    ) => stockControlApi.reconcileDiscrepancies(discrepancies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-control'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

export const useBinLocations = (params?: { zone?: string; active?: boolean }) => {
  return useQuery({
    queryKey: ['stock-control', 'bins', params],
    queryFn: () => stockControlApi.getBinLocations(params),
  });
};

// ============================================================================
// ORDER EXCEPTIONS API
// ============================================================================

export const exceptionApi = {
  /**
   * Log a new exception
   */
  logException: async (dto: LogExceptionDTO) => {
    const response = await apiClient.post('/exceptions/log', dto);
    return response.data;
  },

  /**
   * Get all exceptions
   */
  getExceptions: async (params?: {
    status?: ExceptionStatus;
    orderId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/exceptions', { params });
    return response.data;
  },

  /**
   * Get open exceptions
   */
  getOpenExceptions: async (params?: {
    orderId?: string;
    sku?: string;
    type?: ExceptionType;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/exceptions/open', { params });
    return response.data;
  },

  /**
   * Get exception summary
   */
  getExceptionSummary: async () => {
    const response = await apiClient.get('/exceptions/summary');
    return response.data;
  },

  /**
   * Get exception by ID
   */
  getException: async (exceptionId: string) => {
    const response = await apiClient.get(`/exceptions/${exceptionId}`);
    return response.data;
  },

  /**
   * Resolve an exception
   */
  resolveException: async (exceptionId: string, dto: ResolveExceptionDTO) => {
    const response = await apiClient.post(`/exceptions/${exceptionId}/resolve`, dto);
    return response.data;
  },

  /**
   * Report a general problem
   */
  reportProblem: async (dto: { problemType: string; location?: string; description: string }) => {
    const response = await apiClient.post('/exceptions/report-problem', dto);
    return response.data;
  },
};

// Exception hooks
export const useLogException = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: LogExceptionDTO) => exceptionApi.logException(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useExceptions = (params?: {
  status?: ExceptionStatus;
  orderId?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['exceptions', params],
    queryFn: () => exceptionApi.getExceptions(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000, // Poll every 10 seconds
  });
};

export const useOpenExceptions = (params?: {
  orderId?: string;
  sku?: string;
  type?: ExceptionType;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['exceptions', 'open', params],
    queryFn: () => exceptionApi.getOpenExceptions(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 5000, // Poll every 5 seconds for open exceptions
  });
};

export const useExceptionSummary = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['exceptions', 'summary'],
    queryFn: exceptionApi.getExceptionSummary,
    enabled,
    refetchInterval: 15000, // Poll every 15 seconds
  });
};

export const useResolveException = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exceptionId, dto }: { exceptionId: string; dto: ResolveExceptionDTO }) =>
      exceptionApi.resolveException(exceptionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export const useReportProblem = () => {
  return useMutation({
    mutationFn: (dto: { problemType: string; location?: string; description: string }) =>
      exceptionApi.reportProblem(dto),
  });
};

// ============================================================================
// CYCLE COUNTING API
// ============================================================================

export const cycleCountApi = {
  /**
   * Get all cycle count plans
   */
  getPlans: async (params?: {
    status?: CycleCountStatus;
    countType?: CycleCountType;
    location?: string;
    countBy?: string;
    limit?: number;
    offset?: number;
  }) => {
    console.log('[cycleCountApi.getPlans] Fetching plans with params:', params);
    const response = await apiClient.get('/cycle-count/plans', { params });
    console.log('[cycleCountApi.getPlans] Response:', response.data);
    return response.data;
  },

  /**
   * Get cycle count plan by ID
   */
  getPlan: async (planId: string) => {
    const response = await apiClient.get(`/cycle-count/plans/${planId}`);
    return response.data;
  },

  /**
   * Create cycle count plan
   */
  createPlan: async (dto: {
    planName: string;
    countType: string;
    scheduledDate: string;
    location?: string;
    sku?: string;
    countBy: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/cycle-count/plans', dto);
    return response.data;
  },

  /**
   * Start cycle count plan
   */
  startPlan: async (planId: string) => {
    const response = await apiClient.post(`/cycle-count/plans/${planId}/start`);
    return response.data;
  },

  /**
   * Complete cycle count plan
   */
  completePlan: async (planId: string) => {
    const response = await apiClient.post(`/cycle-count/plans/${planId}/complete`);
    return response.data;
  },

  /**
   * Reconcile cycle count plan
   */
  reconcilePlan: async (planId: string, notes?: string) => {
    const response = await apiClient.post(`/cycle-count/plans/${planId}/reconcile`, { notes });
    return response.data;
  },

  /**
   * Create cycle count entry
   */
  createEntry: async (dto: {
    planId: string;
    sku: string;
    binLocation: string;
    countedQuantity: number;
    notes?: string;
  }) => {
    const response = await apiClient.post('/cycle-count/entries', dto);
    return response.data;
  },

  /**
   * Update variance status
   */
  updateVarianceStatus: async (entryId: string, status: string, notes?: string) => {
    const response = await apiClient.patch(`/cycle-count/entries/${entryId}/variance`, {
      status,
      notes,
    });
    return response.data;
  },

  /**
   * Bulk update variance status
   */
  bulkUpdateVarianceStatus: async (dto: {
    planId: string;
    status: string;
    notes?: string;
    autoApproveZeroVariance?: boolean;
  }) => {
    const response = await apiClient.post(
      `/cycle-count/plans/${dto.planId}/bulk-variance-update`,
      dto
    );
    return response.data;
  },

  /**
   * Get reconcile summary
   */
  getReconcileSummary: async (planId: string) => {
    const response = await apiClient.get(`/cycle-count/plans/${planId}/reconcile-summary`);
    return response.data;
  },

  /**
   * Cancel cycle count plan
   */
  cancelPlan: async (planId: string, reason?: string) => {
    const response = await apiClient.post(`/cycle-count/plans/${planId}/cancel`, { reason });
    return response.data;
  },

  /**
   * Check for collisions
   */
  checkCollisions: async (planId: string) => {
    const response = await apiClient.get(`/cycle-count/plans/${planId}/check-collisions`);
    return response.data;
  },

  /**
   * Get audit log
   */
  getAuditLog: async (planId: string) => {
    const response = await apiClient.get(`/cycle-count/plans/${planId}/audit-log`);
    return response.data;
  },

  /**
   * Export cycle count data
   */
  exportData: async (planId: string) => {
    const response = await apiClient.get(`/cycle-count/plans/${planId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get tolerance rules
   */
  getTolerances: async () => {
    const response = await apiClient.get('/cycle-count/tolerances');
    return response.data;
  },
};

// ============================================================================
// CYCLE COUNT KPI API
// ============================================================================

export const cycleCountKPIApi = {
  /**
   * Get overall KPIs
   */
  getOverallKPIs: async (filters?: {
    startDate?: string;
    endDate?: string;
    location?: string;
    countType?: string;
  }) => {
    const response = await apiClient.get('/cycle-count/kpi/overall', { params: filters });
    return response.data;
  },

  /**
   * Get accuracy trend
   */
  getAccuracyTrend: async (days: number = 30) => {
    const response = await apiClient.get('/cycle-count/kpi/accuracy-trend', { params: { days } });
    return response.data;
  },

  /**
   * Get top discrepancies
   */
  getTopDiscrepancies: async (limit: number = 10, days: number = 30) => {
    const response = await apiClient.get('/cycle-count/kpi/top-discrepancies', {
      params: { limit, days },
    });
    return response.data;
  },

  /**
   * Get user performance
   */
  getUserPerformance: async (days: number = 30) => {
    const response = await apiClient.get('/cycle-count/kpi/user-performance', { params: { days } });
    return response.data;
  },

  /**
   * Get zone performance
   */
  getZonePerformance: async (days: number = 30) => {
    const response = await apiClient.get('/cycle-count/kpi/zone-performance', { params: { days } });
    return response.data;
  },

  /**
   * Get count type effectiveness
   */
  getCountTypeEffectiveness: async (days: number = 90) => {
    const response = await apiClient.get('/cycle-count/kpi/count-type-effectiveness', {
      params: { days },
    });
    return response.data;
  },

  /**
   * Get daily stats
   */
  getDailyStats: async (days: number = 30) => {
    const response = await apiClient.get('/cycle-count/kpi/daily-stats', { params: { days } });
    return response.data;
  },

  /**
   * Get real-time dashboard data
   */
  getDashboard: async (filters?: {
    startDate?: string;
    endDate?: string;
    location?: string;
    countType?: string;
  }) => {
    const response = await apiClient.get('/cycle-count/kpi/dashboard', { params: filters });
    return response.data;
  },
};

export const useCycleCountKPIs = (filters?: {
  startDate?: string;
  endDate?: string;
  location?: string;
  countType?: string;
}) => {
  return useQuery({
    queryKey: ['cycle-count-kpi', 'overall', filters],
    queryFn: () => cycleCountKPIApi.getOverallKPIs(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useCycleCountAccuracyTrend = (days: number = 30) => {
  return useQuery({
    queryKey: ['cycle-count-kpi', 'accuracy-trend', days],
    queryFn: () => cycleCountKPIApi.getAccuracyTrend(days),
    refetchInterval: 60000, // Refresh every minute
  });
};

export const useCycleCountTopDiscrepancies = (limit: number = 10, days: number = 30) => {
  return useQuery({
    queryKey: ['cycle-count-kpi', 'top-discrepancies', limit, days],
    queryFn: () => cycleCountKPIApi.getTopDiscrepancies(limit, days),
    refetchInterval: 60000,
  });
};

export const useCycleCountUserPerformance = (days: number = 30) => {
  return useQuery({
    queryKey: ['cycle-count-kpi', 'user-performance', days],
    queryFn: () => cycleCountKPIApi.getUserPerformance(days),
    refetchInterval: 60000,
  });
};

export const useCycleCountZonePerformance = (days: number = 30) => {
  return useQuery({
    queryKey: ['cycle-count-kpi', 'zone-performance', days],
    queryFn: () => cycleCountKPIApi.getZonePerformance(days),
    refetchInterval: 60000,
  });
};

export const useCycleCountTypeEffectiveness = (days: number = 90) => {
  return useQuery({
    queryKey: ['cycle-count-kpi', 'count-type-effectiveness', days],
    queryFn: () => cycleCountKPIApi.getCountTypeEffectiveness(days),
    refetchInterval: 120000, // Refresh every 2 minutes
  });
};

export const useCycleCountDailyStats = (days: number = 30) => {
  return useQuery({
    queryKey: ['cycle-count-kpi', 'daily-stats', days],
    queryFn: () => cycleCountKPIApi.getDailyStats(days),
    refetchInterval: 60000,
  });
};

export const useCycleCountDashboard = (filters?: {
  startDate?: string;
  endDate?: string;
  location?: string;
  countType?: string;
}) => {
  return useQuery({
    queryKey: ['cycle-count-kpi', 'dashboard', filters],
    queryFn: () => cycleCountKPIApi.getDashboard(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useCycleCountPlans = (params?: {
  status?: CycleCountStatus;
  countType?: CycleCountType;
  location?: string;
  countBy?: string;
  enabled?: boolean;
}) => {
  const result = useQuery({
    queryKey: ['cycle-count', 'plans', params],
    queryFn: () => cycleCountApi.getPlans(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });

  return result;
};

export const useCycleCountPlan = (planId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['cycle-count', 'plans', planId],
    queryFn: () => cycleCountApi.getPlan(planId),
    enabled,
    refetchInterval: 5000,
  });
};

export const useCycleCountTolerances = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['cycle-count', 'tolerances'],
    queryFn: cycleCountApi.getTolerances,
    enabled,
  });
};

export const useCreateCycleCountPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cycleCountApi.createPlan,
    onSuccess: async () => {
      // Invalidate all cycle-count queries and force refetch
      await queryClient.invalidateQueries({
        predicate: query => query.queryKey[0] === 'cycle-count',
        refetchType: 'all', // Force immediate refetch
      });
    },
  });
};

export const useStartCycleCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cycleCountApi.startPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useCompleteCycleCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cycleCountApi.completePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useReconcileCycleCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, notes }: { planId: string; notes?: string }) =>
      cycleCountApi.reconcilePlan(planId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useCreateCycleCountEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cycleCountApi.createEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useUpdateVarianceStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, status, notes }: { entryId: string; status: string; notes?: string }) =>
      cycleCountApi.updateVarianceStatus(entryId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useBulkUpdateVarianceStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      planId: string;
      status: string;
      notes?: string;
      autoApproveZeroVariance?: boolean;
    }) => cycleCountApi.bulkUpdateVarianceStatus(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useReconcileSummary = (planId: string) => {
  return useQuery({
    queryKey: ['cycle-count', 'reconcile-summary', planId],
    queryFn: () => cycleCountApi.getReconcileSummary(planId),
    enabled: !!planId,
  });
};

export const useCancelCycleCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, reason }: { planId: string; reason?: string }) =>
      cycleCountApi.cancelPlan(planId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
    },
  });
};

export const useCheckCollisions = (planId: string) => {
  return useQuery({
    queryKey: ['cycle-count', 'collisions', planId],
    queryFn: () => cycleCountApi.checkCollisions(planId),
    enabled: !!planId,
    refetchInterval: 30000,
  });
};

export const useCycleCountAuditLog = (planId: string) => {
  return useQuery({
    queryKey: ['cycle-count', 'audit-log', planId],
    queryFn: () => cycleCountApi.getAuditLog(planId),
    enabled: !!planId,
  });
};

export const useExportCycleCount = () => {
  return useMutation({
    mutationFn: async (planId: string) => {
      const blob = await cycleCountApi.exportData(planId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cycle-count-${planId}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
};

// ============================================================================
// INTERLEAVED COUNTING API
// ============================================================================

export const interleavedCountApi = {
  /**
   * Create a micro-count (quick count during picking)
   */
  createMicroCount: async (dto: {
    sku: string;
    binLocation: string;
    countedQuantity: number;
    orderId?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/interleaved-count/micro', dto);
    return response.data;
  },

  /**
   * Get micro-count statistics for current user
   */
  getStats: async (days: number = 30) => {
    const response = await apiClient.get('/interleaved-count/stats', { params: { days } });
    return response.data;
  },
};

export const useCreateMicroCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: interleavedCountApi.createMicroCount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
      queryClient.invalidateQueries({ queryKey: ['interleaved-count'] });
    },
  });
};

export const useMicroCountStats = (days: number = 30) => {
  return useQuery({
    queryKey: ['interleaved-count', 'stats', days],
    queryFn: () => interleavedCountApi.getStats(days),
    refetchInterval: 60000,
  });
};

// ============================================================================
// CYCLE COUNT ENHANCEMENTS API
// ============================================================================

// Local type definitions (will be exported from shared after rebuild)
export interface VarianceSeverityConfig {
  configId: string;
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minVariancePercent: number;
  maxVariancePercent: number;
  requiresApproval: boolean;
  requiresManagerApproval: boolean;
  autoAdjust: boolean;
  colorCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringCountSchedule {
  scheduleId: string;
  scheduleName: string;
  countType: string;
  frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  frequencyInterval: number;
  location?: string;
  sku?: string;
  assignedTo: string;
  nextRunDate: Date;
  lastRunDate?: Date;
  isActive: boolean;
  createdBy: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RootCauseCategory {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface VarianceRootCause {
  rootCauseId: string;
  entryId: string;
  categoryId: string;
  additionalNotes?: string;
  createdBy: string;
  createdAt: Date;
}

export interface RootCauseParetoData {
  category: string;
  categoryId: string;
  count: number;
  cumulativePercent: number;
  totalVariance: number;
  averageVariancePercent: number;
}

export interface CategoryBreakdown {
  category: string;
  categoryId: string;
  varianceCount: number;
  averageVariancePercent: number;
  totalVariance: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  trendPercent?: number;
}

export interface TrendingRootCause {
  category: string;
  categoryId: string;
  currentPeriodCount: number;
  previousPeriodCount: number;
  percentChange: number;
  trendDirection: 'UP' | 'DOWN';
  averageVariancePercent: number;
}

export interface SKURootCauseAnalysis {
  sku: string;
  skuName?: string;
  totalVariances: number;
  rootCauses: Array<{
    category: string;
    count: number;
    percentOfTotal: number;
  }>;
  averageVariancePercent: number;
  mostCommonCause: string;
}

export interface ZoneRootCauseAnalysis {
  zone: string;
  totalVariances: number;
  rootCauses: Array<{
    category: string;
    count: number;
    percentOfTotal: number;
  }>;
  averageVariancePercent: number;
  mostCommonCause: string;
  topSKUs: Array<{
    sku: string;
    varianceCount: number;
  }>;
}

// Variance Severity API
export const varianceSeverityApi = {
  /**
   * Get all severity configurations
   */
  getAllConfigs: async (includeInactive: boolean = false) => {
    const response = await apiClient.get<VarianceSeverityConfig[]>(
      '/cycle-count/severity/configs',
      {
        params: { includeInactive },
      }
    );
    return response.data;
  },

  /**
   * Get specific severity configuration
   */
  getConfig: async (configId: string) => {
    const response = await apiClient.get<VarianceSeverityConfig>(
      `/cycle-count/severity/configs/${configId}`
    );
    return response.data;
  },

  /**
   * Create severity configuration
   */
  createConfig: async (dto: {
    severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    minVariancePercent: number;
    maxVariancePercent: number;
    requiresApproval: boolean;
    requiresManagerApproval: boolean;
    autoAdjust: boolean;
    colorCode: string;
  }) => {
    const response = await apiClient.post<VarianceSeverityConfig>(
      '/cycle-count/severity/configs',
      dto
    );
    return response.data;
  },

  /**
   * Update severity configuration
   */
  updateConfig: async (configId: string, updates: Partial<VarianceSeverityConfig>) => {
    const response = await apiClient.put<VarianceSeverityConfig>(
      `/cycle-count/severity/configs/${configId}`,
      updates
    );
    return response.data;
  },

  /**
   * Delete severity configuration
   */
  deleteConfig: async (configId: string) => {
    await apiClient.delete(`/cycle-count/severity/configs/${configId}`);
  },

  /**
   * Reset to default configurations
   */
  resetDefaults: async () => {
    await apiClient.post('/cycle-count/severity/configs/reset');
  },

  /**
   * Determine severity for a variance percentage
   */
  determineSeverity: async (variancePercent: number) => {
    const response = await apiClient.get<{
      configId: string;
      severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      requiresApproval: boolean;
      requiresManagerApproval: boolean;
      autoAdjust: boolean;
      colorCode: string;
    }>('/cycle-count/severity/determine', {
      params: { variance: variancePercent },
    });
    return response.data;
  },
};

// Recurring Schedules API
export const recurringSchedulesApi = {
  /**
   * Create recurring schedule
   */
  createSchedule: async (dto: {
    scheduleName: string;
    countType: string;
    frequencyType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
    frequencyInterval: number;
    location?: string;
    sku?: string;
    assignedTo: string;
    nextRunDate: string;
    notes?: string;
  }) => {
    const response = await apiClient.post<RecurringCountSchedule>('/cycle-count/schedules', dto);
    return response.data;
  },

  /**
   * Get all recurring schedules
   */
  getAllSchedules: async (params?: {
    isActive?: boolean;
    assignedTo?: string;
    frequencyType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  }) => {
    const response = await apiClient.get<{ schedules: RecurringCountSchedule[]; total: number }>(
      '/cycle-count/schedules',
      {
        params,
      }
    );
    return response.data.schedules;
  },

  /**
   * Get specific recurring schedule
   */
  getSchedule: async (scheduleId: string) => {
    const response = await apiClient.get<RecurringCountSchedule>(
      `/cycle-count/schedules/${scheduleId}`
    );
    return response.data;
  },

  /**
   * Update recurring schedule
   */
  updateSchedule: async (scheduleId: string, updates: Partial<RecurringCountSchedule>) => {
    const response = await apiClient.put<RecurringCountSchedule>(
      `/cycle-count/schedules/${scheduleId}`,
      updates
    );
    return response.data;
  },

  /**
   * Delete recurring schedule
   */
  deleteSchedule: async (scheduleId: string) => {
    await apiClient.delete(`/cycle-count/schedules/${scheduleId}`);
  },

  /**
   * Process due schedules (admin only)
   */
  processDueSchedules: async () => {
    await apiClient.post('/cycle-count/schedules/process');
  },
};

// Root Cause Analysis API
export const rootCauseAnalysisApi = {
  /**
   * Get all root cause categories
   */
  getAllCategories: async () => {
    const response = await apiClient.get<RootCauseCategory[]>(
      '/cycle-count/root-causes/categories'
    );
    return response.data;
  },

  /**
   * Get specific root cause category
   */
  getCategory: async (categoryId: string) => {
    const response = await apiClient.get<RootCauseCategory>(
      `/cycle-count/root-causes/categories/${categoryId}`
    );
    return response.data;
  },

  /**
   * Record root cause for a variance entry
   */
  recordRootCause: async (dto: {
    entryId: string;
    categoryId: string;
    additionalNotes?: string;
  }) => {
    const response = await apiClient.post<VarianceRootCause>('/cycle-count/root-causes', dto);
    return response.data;
  },

  /**
   * Get root cause for a specific entry
   */
  getRootCauseForEntry: async (entryId: string) => {
    const response = await apiClient.get<VarianceRootCause | null>(
      `/cycle-count/root-causes/entry/${entryId}`
    );
    return response.data;
  },

  /**
   * Get Pareto analysis of root causes
   */
  getPareto: async (days: number = 30) => {
    const response = await apiClient.get<RootCauseParetoData[]>('/cycle-count/root-causes/pareto', {
      params: { days },
    });
    return response.data;
  },

  /**
   * Get category breakdown with trends
   */
  getCategoryBreakdown: async (days: number = 30) => {
    const response = await apiClient.get<CategoryBreakdown[]>(
      '/cycle-count/root-causes/breakdown',
      {
        params: { days },
      }
    );
    return response.data;
  },

  /**
   * Get trending root causes
   */
  getTrendingRootCauses: async (days: number = 30) => {
    const response = await apiClient.get<TrendingRootCause[]>('/cycle-count/root-causes/trending', {
      params: { days },
    });
    return response.data;
  },

  /**
   * Get root cause analysis for specific SKU
   */
  getRootCauseBySKU: async (sku: string, days: number = 30) => {
    const response = await apiClient.get<SKURootCauseAnalysis>(
      `/cycle-count/root-causes/sku/${sku}`,
      {
        params: { days },
      }
    );
    return response.data;
  },

  /**
   * Get root cause analysis for specific zone
   */
  getRootCauseByZone: async (zone: string, days: number = 30) => {
    const response = await apiClient.get<ZoneRootCauseAnalysis>(
      `/cycle-count/root-causes/zone/${zone}`,
      {
        params: { days },
      }
    );
    return response.data;
  },
};

// React Query hooks for cycle count enhancements
export const useVarianceSeverityConfigs = (includeInactive: boolean = false) => {
  return useQuery({
    queryKey: ['variance-severity-configs', includeInactive],
    queryFn: () => varianceSeverityApi.getAllConfigs(includeInactive),
  });
};

export const useUpdateVarianceSeverityConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      updates,
    }: {
      configId: string;
      updates: Partial<VarianceSeverityConfig>;
    }) => varianceSeverityApi.updateConfig(configId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variance-severity-configs'] });
    },
  });
};

export const useCreateVarianceSeverityConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: varianceSeverityApi.createConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variance-severity-configs'] });
    },
  });
};

export const useDeleteVarianceSeverityConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (configId: string) => varianceSeverityApi.deleteConfig(configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variance-severity-configs'] });
    },
  });
};

export const useRecurringSchedules = (params?: {
  isActive?: boolean;
  assignedTo?: string;
  frequencyType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
}) => {
  return useQuery({
    queryKey: ['recurring-schedules', params],
    queryFn: () => recurringSchedulesApi.getAllSchedules(params),
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useCreateRecurringSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recurringSchedulesApi.createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules'] });
    },
  });
};

export const useUpdateRecurringSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      updates,
    }: {
      scheduleId: string;
      updates: Partial<RecurringCountSchedule>;
    }) => recurringSchedulesApi.updateSchedule(scheduleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules'] });
    },
  });
};

export const useDeleteRecurringSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => recurringSchedulesApi.deleteSchedule(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-schedules'] });
    },
  });
};

export const useRootCauseCategories = () => {
  return useQuery({
    queryKey: ['root-cause-categories'],
    queryFn: rootCauseAnalysisApi.getAllCategories,
  });
};

export const useRootCausePareto = (days: number = 30) => {
  return useQuery({
    queryKey: ['root-cause-pareto', days],
    queryFn: () => rootCauseAnalysisApi.getPareto(days),
    refetchInterval: 300000, // Refetch every 5 minutes
  });
};

export const useRootCauseCategoryBreakdown = (days: number = 30) => {
  return useQuery({
    queryKey: ['root-cause-breakdown', days],
    queryFn: () => rootCauseAnalysisApi.getCategoryBreakdown(days),
    refetchInterval: 300000,
  });
};

export const useRootCauseTrending = (days: number = 30) => {
  return useQuery({
    queryKey: ['root-cause-trending', days],
    queryFn: () => rootCauseAnalysisApi.getTrendingRootCauses(days),
    refetchInterval: 300000,
  });
};

export const useRecordRootCause = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rootCauseAnalysisApi.recordRootCause,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count'] });
      queryClient.invalidateQueries({ queryKey: ['root-cause'] });
    },
  });
};

export const useRootCauseBySKU = (sku: string, days: number = 30) => {
  return useQuery({
    queryKey: ['root-cause-sku', sku, days],
    queryFn: () => rootCauseAnalysisApi.getRootCauseBySKU(sku, days),
    enabled: !!sku,
  });
};

export const useRootCauseByZone = (zone: string, days: number = 30) => {
  return useQuery({
    queryKey: ['root-cause-zone', zone, days],
    queryFn: () => rootCauseAnalysisApi.getRootCauseByZone(zone, days),
    enabled: !!zone,
  });
};

// ============================================================================
// LOCATION CAPACITY API
// ============================================================================

export const locationCapacityApi = {
  /**
   * Get all capacity rules
   */
  getRules: async () => {
    const response = await apiClient.get('/location-capacity/rules');
    return response.data;
  },

  /**
   * Create capacity rule
   */
  createRule: async (dto: {
    ruleName: string;
    description?: string;
    capacityType: string;
    capacityUnit: string;
    appliesTo: string;
    zone?: string;
    locationType?: string;
    specificLocation?: string;
    maximumCapacity: number;
    warningThreshold: number;
    allowOverfill: boolean;
    overfillThreshold?: number;
    priority: number;
  }) => {
    const response = await apiClient.post('/location-capacity/rules', dto);
    return response.data;
  },

  /**
   * Update capacity rule
   */
  updateRule: async (ruleId: string, updates: any) => {
    const response = await apiClient.patch(`/location-capacity/rules/${ruleId}`, updates);
    return response.data;
  },

  /**
   * Delete capacity rule
   */
  deleteRule: async (ruleId: string) => {
    const response = await apiClient.delete(`/location-capacity/rules/${ruleId}`);
    return response.data;
  },

  /**
   * Get all location capacities
   */
  getCapacities: async (params?: {
    capacityType?: string;
    status?: string;
    showAlertsOnly?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/location-capacity/locations', { params });
    return response.data;
  },

  /**
   * Get location capacity
   */
  getLocationCapacity: async (binLocation: string) => {
    const response = await apiClient.get(`/location-capacity/locations/${binLocation}`);
    return response.data;
  },

  /**
   * Recalculate location capacity
   */
  recalculateCapacity: async (binLocation: string) => {
    const response = await apiClient.post(
      `/location-capacity/locations/${binLocation}/recalculate`
    );
    return response.data;
  },

  /**
   * Get capacity alerts
   */
  getAlerts: async (params?: {
    acknowledged?: boolean;
    alertType?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/location-capacity/alerts', { params });
    return response.data;
  },

  /**
   * Acknowledge capacity alert
   */
  acknowledgeAlert: async (alertId: string) => {
    const response = await apiClient.post(`/location-capacity/alerts/${alertId}/acknowledge`);
    return response.data;
  },
};

export const useCapacityRules = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['location-capacity', 'rules'],
    queryFn: locationCapacityApi.getRules,
    enabled,
    refetchInterval: 30000,
  });
};

export const useLocationCapacities = (params?: {
  capacityType?: string;
  status?: string;
  showAlertsOnly?: boolean;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['location-capacity', 'locations', params],
    queryFn: () => locationCapacityApi.getCapacities(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 15000,
  });
};

export const useCapacityAlerts = (params?: {
  acknowledged?: boolean;
  alertType?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['location-capacity', 'alerts', params],
    queryFn: () => locationCapacityApi.getAlerts(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useCreateCapacityRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationCapacityApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-capacity'] });
    },
  });
};

export const useUpdateCapacityRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, updates }: { ruleId: string; updates: any }) =>
      locationCapacityApi.updateRule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-capacity'] });
    },
  });
};

export const useDeleteCapacityRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationCapacityApi.deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-capacity'] });
    },
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationCapacityApi.acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-capacity', 'alerts'] });
    },
  });
};

export const useRecalculateCapacity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: locationCapacityApi.recalculateCapacity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-capacity'] });
    },
  });
};

// ============================================================================
// QUALITY CONTROL API
// ============================================================================

export const qualityControlApi = {
  /**
   * Get all inspection checklists
   */
  getChecklists: async (params?: {
    inspectionType?: string;
    sku?: string;
    category?: string;
    activeOnly?: boolean;
  }) => {
    const response = await apiClient.get('/quality-control/checklists', { params });
    return response.data;
  },

  /**
   * Get inspection checklist by ID
   */
  getChecklist: async (checklistId: string) => {
    const response = await apiClient.get(`/quality-control/checklists/${checklistId}`);
    return response.data;
  },

  /**
   * Create inspection checklist
   */
  createChecklist: async (dto: {
    checklistName: string;
    description?: string;
    inspectionType: string;
    sku?: string;
    category?: string;
    items: Array<{
      itemDescription: string;
      itemType: string;
      isRequired: boolean;
      displayOrder: number;
      options?: string[];
    }>;
  }) => {
    const response = await apiClient.post('/quality-control/checklists', dto);
    return response.data;
  },

  /**
   * Get all quality inspections
   */
  getInspections: async (params?: {
    status?: string;
    inspectionType?: string;
    referenceType?: string;
    referenceId?: string;
    sku?: string;
    inspectorId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/quality-control/inspections', { params });
    return response.data;
  },

  /**
   * Get quality inspection by ID
   */
  getInspection: async (inspectionId: string) => {
    const response = await apiClient.get(`/quality-control/inspections/${inspectionId}`);
    return response.data;
  },

  /**
   * Create quality inspection
   */
  createInspection: async (dto: {
    inspectionType: string;
    referenceType: string;
    referenceId: string;
    sku: string;
    quantityInspected: number;
    location?: string;
    lotNumber?: string;
    expirationDate?: string;
    checklistId?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/quality-control/inspections', dto);
    return response.data;
  },

  /**
   * Start inspection
   */
  startInspection: async (inspectionId: string) => {
    const response = await apiClient.post(`/quality-control/inspections/${inspectionId}/start`);
    return response.data;
  },

  /**
   * Update inspection status
   */
  updateInspectionStatus: async (
    inspectionId: string,
    dto: {
      status: string;
      quantityPassed?: number;
      quantityFailed?: number;
      defectType?: string;
      defectDescription?: string;
      dispositionAction?: string;
      dispositionNotes?: string;
      notes?: string;
    }
  ) => {
    const response = await apiClient.patch(
      `/quality-control/inspections/${inspectionId}/status`,
      dto
    );
    return response.data;
  },

  /**
   * Get inspection results
   */
  getInspectionResults: async (inspectionId: string) => {
    const response = await apiClient.get(`/quality-control/inspections/${inspectionId}/results`);
    return response.data;
  },

  /**
   * Save inspection result
   */
  saveInspectionResult: async (dto: {
    inspectionId: string;
    checklistItemId: string;
    result: string;
    passed: boolean;
    notes?: string;
    imageUrl?: string;
  }) => {
    const response = await apiClient.post('/quality-control/inspections/results', dto);
    return response.data;
  },

  /**
   * Get all return authorizations
   */
  getReturns: async (params?: {
    status?: string;
    orderId?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/quality-control/returns', { params });
    return response.data;
  },

  /**
   * Get return authorization by ID
   */
  getReturn: async (returnId: string) => {
    const response = await apiClient.get(`/quality-control/returns/${returnId}`);
    return response.data;
  },

  /**
   * Create return authorization
   */
  createReturn: async (dto: {
    orderId: string;
    customerId: string;
    customerName: string;
    returnReason: string;
    items: Array<{
      orderItemId: string;
      sku: string;
      name: string;
      quantity: number;
      returnReason: string;
      condition: string;
      refundAmount: number;
    }>;
    totalRefundAmount: number;
    restockingFee?: number;
    notes?: string;
  }) => {
    const response = await apiClient.post('/quality-control/returns', dto);
    return response.data;
  },

  /**
   * Update return status
   */
  updateReturnStatus: async (returnId: string, status: string) => {
    const response = await apiClient.patch(`/quality-control/returns/${returnId}/status`, {
      status,
    });
    return response.data;
  },
};

export const useInspectionChecklists = (params?: {
  inspectionType?: string;
  sku?: string;
  category?: string;
  activeOnly?: boolean;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['quality-control', 'checklists', params],
    queryFn: () => qualityControlApi.getChecklists(params),
    enabled: params?.enabled ?? true,
  });
};

export const useQualityInspections = (params?: {
  status?: string;
  inspectionType?: string;
  referenceId?: string;
  sku?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['quality-control', 'inspections', params],
    queryFn: () => qualityControlApi.getInspections(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useQualityInspection = (inspectionId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['quality-control', 'inspections', inspectionId],
    queryFn: () => qualityControlApi.getInspection(inspectionId),
    enabled,
    refetchInterval: 5000,
  });
};

export const useInspectionResults = (inspectionId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['quality-control', 'inspections', inspectionId, 'results'],
    queryFn: () => qualityControlApi.getInspectionResults(inspectionId),
    enabled,
  });
};

export const useReturnAuthorizations = (params?: {
  status?: string;
  orderId?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['quality-control', 'returns', params],
    queryFn: () => qualityControlApi.getReturns(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 15000,
  });
};

export const useCreateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: qualityControlApi.createInspection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control'] });
    },
  });
};

export const useUpdateInspectionStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, dto }: { inspectionId: string; dto: any }) =>
      qualityControlApi.updateInspectionStatus(inspectionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control'] });
    },
  });
};

export const useSaveInspectionResult = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: qualityControlApi.saveInspectionResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'inspections'] });
    },
  });
};

export const useCreateReturnAuthorization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: qualityControlApi.createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'returns'] });
    },
  });
};

export const useUpdateReturnStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ returnId, status }: { returnId: string; status: string }) =>
      qualityControlApi.updateReturnStatus(returnId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'returns'] });
    },
  });
};

export const useCreateChecklist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: qualityControlApi.createChecklist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'checklists'] });
    },
  });
};

export const useUpdateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, updates }: { inspectionId: string; updates: any }) =>
      qualityControlApi.updateInspectionStatus(inspectionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control'] });
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'inspections'] });
    },
  });
};

export const useDeleteChecklist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (checklistId: string) =>
      apiClient.delete(`/quality-control/checklists/${checklistId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'checklists'] });
    },
  });
};

export const useCreateReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: qualityControlApi.createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'returns'] });
    },
  });
};

export const useAcknowledgeReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ returnId, notes }: { returnId: string; notes?: string }) =>
      apiClient.post(`/quality-control/returns/${returnId}/acknowledge`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control', 'returns'] });
    },
  });
};

// ============================================================================
// INWARDS GOODS API
// ============================================================================

export const inwardsGoodsApi = {
  /**
   * Get inwards goods dashboard
   */
  getDashboard: async () => {
    const response = await apiClient.get('/inbound/dashboard');
    return response.data;
  },

  /**
   * Get all ASNs with optional filters
   */
  getASNs: async (params?: {
    status?: string;
    supplierId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/inbound/asn', { params });
    return response.data;
  },

  /**
   * Get ASN by ID
   */
  getASN: async (asnId: string) => {
    const response = await apiClient.get(`/inbound/asn/${asnId}`);
    return response.data;
  },

  /**
   * Create new ASN
   */
  createASN: async (dto: {
    supplierId: string;
    purchaseOrderNumber: string;
    expectedArrivalDate: Date;
    carrier?: string;
    trackingNumber?: string;
    shipmentNotes?: string;
    lineItems: Array<{
      sku: string;
      expectedQuantity: number;
      unitCost: number;
      lotNumber?: string;
      expirationDate?: Date;
      lineNotes?: string;
    }>;
  }) => {
    const response = await apiClient.post('/inbound/asn', dto);
    return response.data;
  },

  /**
   * Update ASN status
   */
  updateASNStatus: async (asnId: string, status: string) => {
    const response = await apiClient.patch(`/inbound/asn/${asnId}/status`, { status });
    return response.data;
  },

  /**
   * Get all receipts with optional filters
   */
  getReceipts: async (params?: {
    status?: string;
    asnId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/inbound/receipts', { params });
    return response.data;
  },

  /**
   * Get receipt by ID
   */
  getReceipt: async (receiptId: string) => {
    const response = await apiClient.get(`/inbound/receipts/${receiptId}`);
    return response.data;
  },

  /**
   * Create new receipt
   */
  createReceipt: async (dto: {
    asnId?: string;
    receiptType: string;
    lineItems: Array<{
      asnLineItemId?: string;
      sku: string;
      quantityOrdered: number;
      quantityReceived: number;
      quantityDamaged: number;
      unitCost?: number;
      lotNumber?: string;
      expirationDate?: Date;
      notes?: string;
    }>;
  }) => {
    const response = await apiClient.post('/inbound/receipts', dto);
    return response.data;
  },

  /**
   * Get putaway tasks with optional filters
   */
  getPutawayTasks: async (params?: {
    status?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/inbound/putaway', { params });
    return response.data;
  },

  /**
   * Assign putaway task to user
   */
  assignPutawayTask: async (putawayTaskId: string) => {
    const response = await apiClient.post(`/inbound/putaway/${putawayTaskId}/assign`);
    return response.data;
  },

  /**
   * Update putaway task
   */
  updatePutawayTask: async (
    putawayTaskId: string,
    dto: {
      quantityPutaway: number;
      status?: string;
    }
  ) => {
    const response = await apiClient.patch(`/inbound/putaway/${putawayTaskId}`, dto);
    return response.data;
  },
};

// Inwards goods hooks
export const useInwardsDashboard = () => {
  return useQuery({
    queryKey: ['inwards', 'dashboard'],
    queryFn: inwardsGoodsApi.getDashboard,
    refetchInterval: 5000,
  });
};

export const useASNs = (params?: { status?: string; supplierId?: string; enabled?: boolean }) => {
  return useQuery({
    queryKey: ['inwards', 'asn', params],
    queryFn: () => inwardsGoodsApi.getASNs(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useASN = (asnId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['inwards', 'asn', asnId],
    queryFn: () => inwardsGoodsApi.getASN(asnId),
    enabled,
  });
};

export const useReceipts = (params?: { status?: string; asnId?: string; enabled?: boolean }) => {
  return useQuery({
    queryKey: ['inwards', 'receipts', params],
    queryFn: () => inwardsGoodsApi.getReceipts(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useReceipt = (receiptId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['inwards', 'receipts', receiptId],
    queryFn: () => inwardsGoodsApi.getReceipt(receiptId),
    enabled,
  });
};

export const usePutawayTasks = (params?: {
  status?: string;
  assignedTo?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['inwards', 'putaway', params],
    queryFn: () => inwardsGoodsApi.getPutawayTasks(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 5000,
  });
};

export const useCreateASN = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inwardsGoodsApi.createASN,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards'] });
    },
  });
};

export const useUpdateASNStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ asnId, status }: { asnId: string; status: string }) =>
      inwardsGoodsApi.updateASNStatus(asnId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards'] });
    },
  });
};

export const useCreateReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inwardsGoodsApi.createReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards'] });
    },
  });
};

export const useAssignPutawayTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inwardsGoodsApi.assignPutawayTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'putaway'] });
    },
  });
};

export const useUpdatePutawayTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      putawayTaskId,
      dto,
    }: {
      putawayTaskId: string;
      dto: { quantityPutaway: number; status?: string };
    }) => inwardsGoodsApi.updatePutawayTask(putawayTaskId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'putaway'] });
    },
  });
};

// ============================================================================
// LICENSE PLATING API
// ============================================================================

export const licensePlateApi = {
  /**
   * Get all license plates
   */
  getAll: async (params?: {
    receiptId?: string;
    status?: string;
    stagingLocation?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/inbound/license-plates', { params });
    return response.data;
  },

  /**
   * Get license plate by ID
   */
  get: async (licensePlateId: string) => {
    const response = await apiClient.get(`/inbound/license-plates/${licensePlateId}`);
    return response.data;
  },

  /**
   * Get license plate by barcode
   */
  getByBarcode: async (barcode: string) => {
    const response = await apiClient.get(`/inbound/license-plates/barcode/${barcode}`);
    return response.data;
  },

  /**
   * Create new license plate
   */
  create: async (dto: {
    receiptId: string;
    receiptLineId: string;
    barcode: string;
    sku: string;
    quantity: number;
    lotNumber?: string;
    expirationDate?: Date;
    serialNumbers?: string[];
    stagingLocation?: string;
    sealedBy: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/inbound/license-plates', dto);
    return response.data;
  },

  /**
   * Seal license plate (mark as ready for QC/Staging)
   */
  seal: async (licensePlateId: string) => {
    const response = await apiClient.post(`/inbound/license-plates/${licensePlateId}/seal`);
    return response.data;
  },

  /**
   * Update license plate status
   */
  updateStatus: async (licensePlateId: string, status: string) => {
    const response = await apiClient.patch(`/inbound/license-plates/${licensePlateId}/status`, {
      status,
    });
    return response.data;
  },

  /**
   * Get suggested staging location for a license plate
   */
  getSuggestedStaging: async (sku: string) => {
    const response = await apiClient.get(`/inbound/license-plates/suggest-staging/${sku}`);
    return response.data;
  },
};

// License plate hooks
export const useLicensePlates = (params?: {
  receiptId?: string;
  status?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['inwards', 'license-plates', params],
    queryFn: () => licensePlateApi.getAll(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useLicensePlate = (licensePlateId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['inwards', 'license-plates', licensePlateId],
    queryFn: () => licensePlateApi.get(licensePlateId),
    enabled,
  });
};

export const useCreateLicensePlate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: licensePlateApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'license-plates'] });
    },
  });
};

export const useSealLicensePlate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: licensePlateApi.seal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'license-plates'] });
    },
  });
};

export const useUpdateLicensePlateStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ licensePlateId, status }: { licensePlateId: string; status: string }) =>
      licensePlateApi.updateStatus(licensePlateId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'license-plates'] });
    },
  });
};

// ============================================================================
// STAGING LOCATIONS API
// ============================================================================

export const stagingLocationApi = {
  /**
   * Get all staging locations
   */
  getAll: async (params?: { zone?: string; status?: string; limit?: number; offset?: number }) => {
    const response = await apiClient.get('/inbound/staging-locations', { params });
    return response.data;
  },

  /**
   * Get staging location by ID
   */
  get: async (stagingLocationId: string) => {
    const response = await apiClient.get(`/inbound/staging-locations/${stagingLocationId}`);
    return response.data;
  },

  /**
   * Assign license plate to staging location
   */
  assignLicensePlate: async (dto: {
    licensePlateId: string;
    stagingLocationId: string;
    assignedBy: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/inbound/staging-locations/assign', dto);
    return response.data;
  },

  /**
   * Release license plate from staging location
   */
  releaseLicensePlate: async (licensePlateId: string) => {
    const response = await apiClient.post(`/inbound/staging-locations/release/${licensePlateId}`);
    return response.data;
  },

  /**
   * Get staging location contents
   */
  getContents: async (stagingLocationId: string) => {
    const response = await apiClient.get(
      `/inbound/staging-locations/${stagingLocationId}/contents`
    );
    return response.data;
  },
};

// Staging location hooks
export const useStagingLocations = (params?: {
  zone?: string;
  status?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['inwards', 'staging-locations', params],
    queryFn: () => stagingLocationApi.getAll(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useStagingLocation = (stagingLocationId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['inwards', 'staging-locations', stagingLocationId],
    queryFn: () => stagingLocationApi.get(stagingLocationId),
    enabled,
  });
};

export const useAssignToStaging = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: stagingLocationApi.assignLicensePlate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'staging-locations'] });
      queryClient.invalidateQueries({ queryKey: ['inwards', 'license-plates'] });
    },
  });
};

export const useReleaseFromStaging = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: stagingLocationApi.releaseLicensePlate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'staging-locations'] });
      queryClient.invalidateQueries({ queryKey: ['inwards', 'license-plates'] });
    },
  });
};

// ============================================================================
// RECEIVING EXCEPTIONS API
// ============================================================================

export const receivingExceptionApi = {
  /**
   * Get all receiving exceptions
   */
  getAll: async (params?: {
    receiptId?: string;
    status?: string;
    exceptionType?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/inbound/exceptions', { params });
    return response.data;
  },

  /**
   * Get receiving exception by ID
   */
  get: async (exceptionId: string) => {
    const response = await apiClient.get(`/inbound/exceptions/${exceptionId}`);
    return response.data;
  },

  /**
   * Create receiving exception
   */
  create: async (dto: {
    receiptId: string;
    receiptLineId: string;
    asnId?: string;
    exceptionType: string;
    sku: string;
    expectedQuantity: number;
    actualQuantity: number;
    lotNumber?: string;
    expirationDate?: Date;
    description: string;
    reportedBy: string;
    images?: string[];
  }) => {
    const response = await apiClient.post('/inbound/exceptions', dto);
    return response.data;
  },

  /**
   * Update receiving exception status
   */
  updateStatus: async (exceptionId: string, status: string) => {
    const response = await apiClient.patch(`/inbound/exceptions/${exceptionId}/status`, { status });
    return response.data;
  },

  /**
   * Resolve receiving exception
   */
  resolve: async (
    exceptionId: string,
    dto: {
      resolution: string;
      resolutionNotes?: string;
      resolvedBy: string;
      creditAmount?: number;
    }
  ) => {
    const response = await apiClient.post(`/inbound/exceptions/${exceptionId}/resolve`, dto);
    return response.data;
  },
};

// Receiving exception hooks
export const useReceivingExceptions = (params?: {
  receiptId?: string;
  status?: string;
  exceptionType?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['inwards', 'exceptions', params],
    queryFn: () => receivingExceptionApi.getAll(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 10000,
  });
};

export const useReceivingException = (exceptionId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['inwards', 'exceptions', exceptionId],
    queryFn: () => receivingExceptionApi.get(exceptionId),
    enabled,
  });
};

export const useCreateReceivingException = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: receivingExceptionApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'exceptions'] });
    },
  });
};

export const useUpdateReceivingExceptionStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exceptionId, status }: { exceptionId: string; status: string }) =>
      receivingExceptionApi.updateStatus(exceptionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'exceptions'] });
    },
  });
};

export const useResolveReceivingException = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exceptionId, dto }: { exceptionId: string; dto: any }) =>
      receivingExceptionApi.resolve(exceptionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inwards', 'exceptions'] });
    },
  });
};

// ============================================================================
// BIN LOCATIONS API
// ============================================================================

export const binLocationApi = {
  /**
   * Get all bin locations
   */
  getAll: async (params?: {
    zone?: string;
    type?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/bin-locations', { params });
    return response.data;
  },

  /**
   * Get a specific bin location
   */
  get: async (binId: string) => {
    const response = await apiClient.get(`/bin-locations/${binId}`);
    return response.data;
  },

  /**
   * Create a new bin location
   */
  create: async (dto: {
    binId: string;
    zone: string;
    aisle: string;
    shelf: string;
    type: string;
  }) => {
    const response = await apiClient.post('/bin-locations', dto);
    return response.data;
  },

  /**
   * Batch create bin locations
   */
  batchCreate: async (
    locations: Array<{
      binId: string;
      zone: string;
      aisle: string;
      shelf: string;
      type: string;
    }>
  ) => {
    const response = await apiClient.post('/bin-locations/batch', { locations });
    return response.data;
  },

  /**
   * Update a bin location
   */
  update: async (
    binId: string,
    updates: {
      zone?: string;
      aisle?: string;
      shelf?: string;
      type?: string;
      active?: boolean;
    }
  ) => {
    const response = await apiClient.patch(`/bin-locations/${binId}`, updates);
    return response.data;
  },

  /**
   * Delete a bin location
   */
  delete: async (binId: string) => {
    const response = await apiClient.delete(`/bin-locations/${binId}`);
    return response.data;
  },

  /**
   * Get all zones
   */
  getZones: async () => {
    const response = await apiClient.get('/bin-locations/zones');
    return response.data;
  },

  /**
   * Get bin locations by zone
   */
  getByZone: async (zone: string) => {
    const response = await apiClient.get(`/bin-locations/by-zone/${zone}`);
    return response.data;
  },
};

// Bin Locations React Query hooks

export const useBinLocationsManagement = (params?: {
  zone?: string;
  type?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['bin-locations', 'all', params],
    queryFn: () => binLocationApi.getAll(params),
    enabled: params?.enabled ?? true,
    refetchInterval: 30000,
  });
};

export const useBinLocation = (binId: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ['bin-locations', binId],
    queryFn: () => binLocationApi.get(binId),
    enabled: enabled ?? true,
  });
};

export const useBinLocationZones = (enabled?: boolean) => {
  return useQuery({
    queryKey: ['bin-locations', 'zones'],
    queryFn: binLocationApi.getZones,
    enabled: enabled ?? true,
  });
};

export const useBinLocationsByZone = (zone: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ['bin-locations', 'by-zone', zone],
    queryFn: () => binLocationApi.getByZone(zone),
    enabled: enabled ?? true,
  });
};

export const useCreateBinLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: binLocationApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bin-locations'] });
    },
  });
};

export const useBatchCreateBinLocations = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: binLocationApi.batchCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bin-locations'] });
    },
  });
};

export const useUpdateBinLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ binId, updates }: { binId: string; updates: any }) =>
      binLocationApi.update(binId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bin-locations'] });
    },
  });
};

export const useDeleteBinLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: binLocationApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bin-locations'] });
    },
  });
};

// ============================================================================
// CUSTOM ROLES API
// ============================================================================

export const customRoleApi = {
  /**
   * Get all custom roles (including system roles) with permissions
   */
  getAllRoles: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/custom-roles');
    return response.data;
  },

  /**
   * Get a specific custom role by ID
   */
  getRole: async (roleId: string): Promise<any> => {
    const response = await apiClient.get<any>(`/custom-roles/${roleId}`);
    return response.data;
  },

  /**
   * Get all system roles (predefined) with their default permissions
   */
  getSystemRoles: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/custom-roles/system');
    return response.data;
  },

  /**
   * Create a new custom role
   */
  createRole: async (data: {
    name: string;
    description: string;
    permissions: string[];
  }): Promise<any> => {
    const response = await apiClient.post<any>('/custom-roles', data);
    return response.data;
  },

  /**
   * Update a custom role
   */
  updateRole: async (
    roleId: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
    }
  ): Promise<any> => {
    const response = await apiClient.put<any>(`/custom-roles/${roleId}`, data);
    return response.data;
  },

  /**
   * Delete a custom role
   */
  deleteRole: async (roleId: string): Promise<void> => {
    await apiClient.delete(`/custom-roles/${roleId}`);
  },

  /**
   * Get all available permissions
   */
  getAllPermissions: async (): Promise<any> => {
    const response = await apiClient.get<any>('/custom-roles/permissions');
    return response.data;
  },

  /**
   * Get current user's permissions
   */
  getMyPermissions: async (): Promise<{ permissions: string[] }> => {
    const response = await apiClient.get<{ permissions: string[] }>('/custom-roles/my-permissions');
    return response.data;
  },
};

// Custom Roles React Query hooks
export const useCustomRoles = () => {
  return useQuery({
    queryKey: ['custom-roles', 'all'],
    queryFn: customRoleApi.getAllRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSystemRoles = () => {
  return useQuery({
    queryKey: ['custom-roles', 'system'],
    queryFn: customRoleApi.getSystemRoles,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCustomRole = (roleId: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ['custom-roles', roleId],
    queryFn: () => customRoleApi.getRole(roleId),
    enabled: enabled ?? true,
  });
};

export const useAllPermissions = () => {
  return useQuery({
    queryKey: ['custom-roles', 'permissions'],
    queryFn: customRoleApi.getAllPermissions,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useMyPermissions = () => {
  return useQuery({
    queryKey: ['custom-roles', 'my-permissions'],
    queryFn: customRoleApi.getMyPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

export const useCreateCustomRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description: string; permissions: string[] }) =>
      customRoleApi.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useUpdateCustomRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roleId,
      data,
    }: {
      roleId: string;
      data: { name?: string; description?: string; permissions?: string[] };
    }) => customRoleApi.updateRole(roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useDeleteCustomRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) => customRoleApi.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

// ============================================================================
// BARCODE API
// ============================================================================

export const barcodeApi = {
  /**
   * Look up SKU by barcode
   */
  lookupByBarcode: async (barcode: string) => {
    const response = await apiClient.get<any>(`/barcode/lookup/${encodeURIComponent(barcode)}`);
    return response.data;
  },

  /**
   * Get SKU inventory by barcode
   */
  getInventoryByBarcode: async (barcode: string) => {
    const response = await apiClient.get<any>(`/barcode/inventory/${encodeURIComponent(barcode)}`);
    return response.data;
  },

  /**
   * Get bin location details by barcode
   */
  getBinLocationByBarcode: async (barcode: string) => {
    const response = await apiClient.get<any>(
      `/barcode/bin-location/${encodeURIComponent(barcode)}`
    );
    return response.data;
  },

  /**
   * Bulk barcode lookup
   */
  bulkLookup: async (barcodes: string[]) => {
    const response = await apiClient.post<any>('/barcode/bulk', { barcodes });
    return response.data;
  },
};

// Barcode React Query hooks (kept for cycle counting and micro-count features)
export const useBarcodeLookup = (barcode: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ['barcode', 'lookup', barcode],
    queryFn: () => barcodeApi.lookupByBarcode(barcode),
    enabled: enabled && !!barcode,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useBarcodeInventory = (barcode: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ['barcode', 'inventory', barcode],
    queryFn: () => barcodeApi.getInventoryByBarcode(barcode),
    enabled: enabled && !!barcode,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useBarcodeBinLocation = (barcode: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ['barcode', 'bin-location', barcode],
    queryFn: () => barcodeApi.getBinLocationByBarcode(barcode),
    enabled: enabled && !!barcode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================================
// WAVE PICKING API
// ============================================================================

export const waveApi = {
  /**
   * Create a new wave
   */
  createWave: async (criteria: {
    strategy: string;
    maxOrdersPerWave?: number;
    priority?: string;
    carrier?: string;
    zone?: string;
    deadline?: string;
  }) => {
    const response = await apiClient.post<any>('/waves/create', criteria);
    return response.data;
  },

  /**
   * Release a wave
   */
  releaseWave: async (waveId: string) => {
    const response = await apiClient.post<any>(`/waves/${waveId}/release`);
    return response.data;
  },

  /**
   * Get wave status
   */
  getWaveStatus: async (waveId: string) => {
    const response = await apiClient.get<any>(`/waves/${waveId}/status`);
    return response.data;
  },

  /**
   * Get active waves for a picker
   */
  getPickerWaves: async (pickerId: string) => {
    const response = await apiClient.get<any>(`/waves/picker/${pickerId}`);
    return response.data;
  },

  /**
   * Complete a wave
   */
  completeWave: async (waveId: string) => {
    const response = await apiClient.post<any>(`/waves/${waveId}/complete`);
    return response.data;
  },

  /**
   * Get wave strategies
   */
  getStrategies: async () => {
    const response = await apiClient.get<any>('/waves/strategies');
    return response.data;
  },
};

// Wave React Query hooks
export const useWaveStrategies = () => {
  return useQuery({
    queryKey: ['waves', 'strategies'],
    queryFn: waveApi.getStrategies,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const usePickerWaves = (pickerId: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ['waves', 'picker', pickerId],
    queryFn: () => waveApi.getPickerWaves(pickerId),
    enabled: enabled && !!pickerId,
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
    staleTime: 5 * 1000, // 5 seconds
  });
};

export const useWaveStatus = (waveId: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ['waves', 'status', waveId],
    queryFn: () => waveApi.getWaveStatus(waveId),
    enabled: enabled && !!waveId,
    refetchInterval: 5 * 1000, // Refetch every 5 seconds
    staleTime: 3 * 1000, // 3 seconds
  });
};

export const useCreateWave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: waveApi.createWave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waves'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useReleaseWave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: waveApi.releaseWave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waves'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useCompleteWave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: waveApi.completeWave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waves'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

// ============================================================================
// ZONE PICKING API
// ============================================================================

export const zoneApi = {
  /**
   * Get all zones
   */
  getAllZones: async () => {
    const response = await apiClient.get<any>('/zones');
    return response.data.data;
  },

  /**
   * Get zone statistics
   */
  getZoneStats: async (zoneId: string) => {
    const response = await apiClient.get<any>(`/zones/${zoneId}/stats`);
    return response.data.data;
  },

  /**
   * Get all zone statistics
   */
  getAllZoneStats: async () => {
    const response = await apiClient.get<any>('/zones/stats/all');
    return response.data.data;
  },

  /**
   * Assign picker to zone
   */
  assignPickerToZone: async (pickerId: string, zoneId: string) => {
    const response = await apiClient.post<any>('/zones/assign', { pickerId, zoneId });
    return response.data;
  },

  /**
   * Release picker from zone
   */
  releasePickerFromZone: async (pickerId: string) => {
    const response = await apiClient.post<any>('/zones/release', { pickerId });
    return response.data;
  },

  /**
   * Rebalance pickers across zones
   */
  rebalancePickers: async () => {
    const response = await apiClient.post<any>('/zones/rebalance');
    return response.data;
  },

  /**
   * Get zone pick tasks
   */
  getZonePickTasks: async (zoneId: string, status?: string) => {
    const params = status ? { status } : {};
    const response = await apiClient.get<any>(`/zones/${zoneId}/tasks`, { params });
    return response.data.data;
  },
};

// Zone React Query hooks
export const useZones = () => {
  return useQuery({
    queryKey: ['zones'],
    queryFn: zoneApi.getAllZones,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useZoneStats = (zoneId: string, enabled?: boolean) => {
  return useQuery({
    queryKey: ['zones', 'stats', zoneId],
    queryFn: () => zoneApi.getZoneStats(zoneId),
    enabled: enabled && !!zoneId,
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
    staleTime: 10 * 1000, // 10 seconds
  });
};

export const useAllZoneStats = () => {
  return useQuery({
    queryKey: ['zones', 'stats', 'all'],
    queryFn: zoneApi.getAllZoneStats,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    staleTime: 15 * 1000, // 15 seconds
  });
};

export const useZonePickTasks = (zoneId: string, status?: string) => {
  return useQuery({
    queryKey: ['zones', 'tasks', zoneId, status],
    queryFn: () => zoneApi.getZonePickTasks(zoneId, status),
    enabled: !!zoneId && zoneId.length > 0, // Only fetch when zoneId is provided
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
    staleTime: 5 * 1000, // 5 seconds
  });
};

export const useAssignPickerToZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pickerId, zoneId }: { pickerId: string; zoneId: string }) =>
      zoneApi.assignPickerToZone(pickerId, zoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useReleasePickerFromZone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pickerId: string) => zoneApi.releasePickerFromZone(pickerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useRebalancePickers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: zoneApi.rebalancePickers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

// ============================================================================
// SLOTTING OPTIMIZATION API
// ============================================================================

export const slottingApi = {
  /**
   * Run ABC analysis
   */
  runAnalysis: async (days: number = 90) => {
    const response = await apiClient.get<any>('/slotting/analysis', {
      params: { days },
    });
    return response.data;
  },

  /**
   * Get slotting recommendations
   */
  getRecommendations: async (options?: { minPriority?: string; maxRecommendations?: number }) => {
    const response = await apiClient.get<any>('/slotting/recommendations', {
      params: options,
    });
    return response.data;
  },

  /**
   * Implement a slotting recommendation
   */
  implementRecommendation: async (data: {
    sku: string;
    fromLocation: string;
    toLocation: string;
  }) => {
    const response = await apiClient.post<any>('/slotting/implement', data);
    return response.data;
  },

  /**
   * Get velocity data for an SKU
   */
  getVelocityData: async (sku: string, days: number = 90) => {
    const response = await apiClient.get<any>(`/slotting/velocity/${encodeURIComponent(sku)}`, {
      params: { days },
    });
    return response.data;
  },

  /**
   * Get slotting statistics
   */
  getStats: async () => {
    const response = await apiClient.get<any>('/slotting/stats');
    return response.data;
  },

  /**
   * Get ABC class definitions
   */
  getClasses: async () => {
    const response = await apiClient.get<any>('/slotting/classes');
    return response.data;
  },
};

// Slotting React Query hooks
export const useSlottingAnalysis = (days: number = 90, enabled?: boolean) => {
  return useQuery({
    queryKey: ['slotting', 'analysis', days],
    queryFn: () => slottingApi.runAnalysis(days),
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useSlottingRecommendations = (options?: {
  minPriority?: string;
  maxRecommendations?: number;
}) => {
  return useQuery({
    queryKey: ['slotting', 'recommendations', options],
    queryFn: () => slottingApi.getRecommendations(options),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useSlottingStats = () => {
  return useQuery({
    queryKey: ['slotting', 'stats'],
    queryFn: slottingApi.getStats,
    refetchInterval: 60 * 1000, // Refetch every minute
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSlottingClasses = () => {
  return useQuery({
    queryKey: ['slotting', 'classes'],
    queryFn: slottingApi.getClasses,
    staleTime: 60 * 60 * 1000, // 1 hour (static data)
  });
};

export const useSkuVelocity = (sku: string, days: number = 90, enabled?: boolean) => {
  return useQuery({
    queryKey: ['slotting', 'velocity', sku, days],
    queryFn: () => slottingApi.getVelocityData(sku, days),
    enabled: enabled && !!sku,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useImplementSlotting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: slottingApi.implementRecommendation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slotting'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useRunSlottingAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (days?: number) => slottingApi.runAnalysis(days || 90),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slotting'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

// ============================================================================
// NZC (NZ COURIERS) API
// ============================================================================

export const nzcApi = {
  /**
   * Get shipping rates from NZC
   */
  getRates: async (request: NZCRateRequest): Promise<NZCRateResponse> => {
    const response = await apiClient.post<NZCRateResponse>('/nzc/rates', request);
    return response.data;
  },

  /**
   * Create a shipment with NZC
   */
  createShipment: async (request: NZCShipmentRequest): Promise<NZCShipmentResponse> => {
    const response = await apiClient.post<NZCShipmentResponse>('/nzc/shipments', request);
    return response.data;
  },

  /**
   * Get a shipping label as base64 data
   */
  getLabel: async (connote: string, format?: string): Promise<NZCLabelResponse> => {
    const params = format ? `?format=${format}` : '';
    const response = await apiClient.get<NZCLabelResponse>(`/nzc/labels/${connote}${params}`);
    return response.data;
  },

  /**
   * Reprint a shipping label (sends to printer)
   */
  reprintLabel: async (
    connote: string,
    copies?: number,
    printerName?: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/nzc/labels/${connote}/reprint`,
      { copies, printerName }
    );
    return response.data;
  },

  /**
   * Get available printers from NZC
   */
  getPrinters: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/nzc/printers');
    return response.data;
  },

  /**
   * Get available stock sizes from NZC
   */
  getStockSizes: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/nzc/stocksizes');
    return response.data;
  },
};

// NZC React Query hooks

export const useNZCRates = (request: NZCRateRequest, enabled = true) => {
  return useQuery({
    queryKey: ['nzc', 'rates', request],
    queryFn: () => nzcApi.getRates(request),
    enabled: enabled && !!request.destination && !!request.packages && request.packages.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useNZCCreateShipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: nzcApi.createShipment,
    onSuccess: () => {
      // Invalidate related queries if needed
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useNZCGetLabel = (connote: string, format?: string, enabled = true) => {
  return useQuery({
    queryKey: ['nzc', 'label', connote, format],
    queryFn: () => nzcApi.getLabel(connote, format),
    enabled: enabled && !!connote,
    staleTime: 60 * 60 * 1000, // 1 hour - labels don't change
  });
};

export const useNZCReprintLabel = () => {
  return useMutation({
    mutationFn: ({
      connote,
      copies,
      printerName,
    }: {
      connote: string;
      copies?: number;
      printerName?: string;
    }) => nzcApi.reprintLabel(connote, copies, printerName),
    onError: error => {
      handleAPIError(error);
    },
  });
};

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export const notificationsApi = {
  /**
   * Get current user's notifications
   */
  listNotifications: async (params: {
    type?: string;
    status?: string;
    channel?: string;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  /**
   * Get notification statistics
   */
  getStats: async (): Promise<any> => {
    const response = await apiClient.get('/notifications/stats');
    return response.data;
  },

  /**
   * Get a specific notification
   */
  getNotification: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/notifications/${id}`);
    return response.data;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string): Promise<any> => {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<any> => {
    const response = await apiClient.put('/notifications/read-all');
    return response.data;
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },

  /**
   * Send a notification (admin only)
   */
  sendNotification: async (data: {
    userId: string;
    type: string;
    channel: string;
    title: string;
    message: string;
    data?: any;
    priority?: string;
    scheduledFor?: string;
  }): Promise<any> => {
    const response = await apiClient.post('/notifications/send', data);
    return response.data;
  },

  /**
   * Send bulk notifications (admin only)
   */
  bulkSend: async (data: {
    userIds: string[];
    type: string;
    channels: string[];
    title: string;
    message: string;
    data?: any;
    priority?: string;
  }): Promise<any> => {
    const response = await apiClient.post('/notifications/bulk', data);
    return response.data;
  },

  /**
   * Get notification preferences
   */
  getPreferences: async (): Promise<any> => {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  /**
   * Update notification preferences
   */
  updatePreferences: async (data: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
    inAppEnabled?: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursTimezone?: string;
    smsPhone?: string;
    typePreferences?: Record<string, any>;
  }): Promise<any> => {
    const response = await apiClient.put('/notifications/preferences', data);
    return response.data;
  },
};

// Notifications React Query hooks

export const useNotifications = (
  params: {
    type?: string;
    status?: string;
    channel?: string;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.listNotifications(params),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useNotificationStats = () => {
  return useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: notificationsApi.getStats,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useSendNotification = () => {
  return useMutation({
    mutationFn: notificationsApi.sendNotification,
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useBulkSendNotification = () => {
  return useMutation({
    mutationFn: notificationsApi.bulkSend,
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useNotificationPreferences = () => {
  return useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: notificationsApi.getPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

// ============================================================================
// BUSINESS RULES API
// ============================================================================

export const businessRulesApi = {
  /**
   * Get all business rules
   */
  listRules: async (
    params: {
      status?: RuleStatus;
      ruleType?: RuleType;
      includeInactive?: boolean;
    } = {}
  ) => {
    const response = await apiClient.get('/business-rules', { params });
    return response.data.data;
  },

  /**
   * Get a specific business rule
   */
  getRule: async (ruleId: string): Promise<BusinessRule> => {
    const response = await apiClient.get(`/business-rules/${ruleId}`);
    return response.data.data.rule;
  },

  /**
   * Create a new business rule
   */
  createRule: async (rule: Partial<BusinessRule>): Promise<BusinessRule> => {
    const response = await apiClient.post('/business-rules', rule);
    return response.data.data.rule;
  },

  /**
   * Update a business rule
   */
  updateRule: async (ruleId: string, updates: Partial<BusinessRule>): Promise<BusinessRule> => {
    const response = await apiClient.put(`/business-rules/${ruleId}`, updates);
    return response.data.data.rule;
  },

  /**
   * Delete a business rule
   */
  deleteRule: async (ruleId: string): Promise<void> => {
    await apiClient.delete(`/business-rules/${ruleId}`);
  },

  /**
   * Test a business rule
   */
  testRule: async (
    ruleId: string,
    testData: {
      entity?: any;
      entityType?: string;
      entityId?: string;
    }
  ): Promise<any> => {
    const response = await apiClient.post(`/business-rules/${ruleId}/test`, testData);
    return response.data.data;
  },

  /**
   * Activate a business rule
   */
  activateRule: async (ruleId: string): Promise<BusinessRule> => {
    const response = await apiClient.post(`/business-rules/${ruleId}/activate`);
    return response.data.data.rule;
  },

  /**
   * Deactivate a business rule
   */
  deactivateRule: async (ruleId: string): Promise<BusinessRule> => {
    const response = await apiClient.post(`/business-rules/${ruleId}/deactivate`);
    return response.data.data.rule;
  },

  /**
   * Get business rules statistics
   */
  getStats: async (): Promise<any> => {
    const response = await apiClient.get('/business-rules/stats/summary');
    return response.data.data;
  },
};

// Business Rules React Query hooks

export const useBusinessRules = (
  params: {
    status?: RuleStatus;
    ruleType?: RuleType;
    includeInactive?: boolean;
  } = {}
) => {
  return useQuery({
    queryKey: ['business-rules', params],
    queryFn: () => businessRulesApi.listRules(params),
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useBusinessRule = (ruleId: string, enabled = true) => {
  return useQuery({
    queryKey: ['business-rules', ruleId],
    queryFn: () => businessRulesApi.getRule(ruleId),
    enabled: enabled && !!ruleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateBusinessRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: businessRulesApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useUpdateBusinessRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, updates }: { ruleId: string; updates: Partial<BusinessRule> }) =>
      businessRulesApi.updateRule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useDeleteBusinessRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: businessRulesApi.deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useTestBusinessRule = () => {
  return useMutation({
    mutationFn: ({ ruleId, testData }: { ruleId: string; testData: any }) =>
      businessRulesApi.testRule(ruleId, testData),
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useActivateBusinessRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: businessRulesApi.activateRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useDeactivateBusinessRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: businessRulesApi.deactivateRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-rules'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useBusinessRulesStats = () => {
  return useQuery({
    queryKey: ['business-rules', 'stats'],
    queryFn: businessRulesApi.getStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================================
// REPORTS API
// ============================================================================

export const reportsApi = {
  /**
   * Get all reports
   */
  getReports: async (params?: {
    type?: ReportType;
    status?: ReportStatus;
    category?: string;
    isPublic?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ reports: Report[]; total: number }> => {
    const response = await apiClient.get<{ reports: Report[]; total: number }>('/reports', {
      params,
    });
    return response.data;
  },

  /**
   * Get a specific report by ID
   */
  getReport: async (reportId: string): Promise<Report> => {
    const response = await apiClient.get<Report>(`/reports/${reportId}`);
    return response.data;
  },

  /**
   * Create a new report
   */
  createReport: async (
    report: Omit<Report, 'reportId' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<Report> => {
    const response = await apiClient.post<Report>('/reports', report);
    return response.data;
  },

  /**
   * Update a report
   */
  updateReport: async (reportId: string, updates: Partial<Report>): Promise<Report> => {
    const response = await apiClient.put<Report>(`/reports/${reportId}`, updates);
    return response.data;
  },

  /**
   * Delete a report
   */
  deleteReport: async (reportId: string): Promise<void> => {
    await apiClient.delete(`/reports/${reportId}`);
  },

  /**
   * Execute a report with parameters
   */
  executeReport: async (
    reportId: string,
    parameters?: Record<string, any>
  ): Promise<ReportExecution> => {
    const response = await apiClient.post<ReportExecution>(`/reports/${reportId}/execute`, {
      parameters,
    });
    return response.data;
  },

  /**
   * Get report execution history
   */
  getExecutionHistory: async (
    reportId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ executions: ReportExecution[]; total: number }> => {
    const response = await apiClient.get<{ executions: ReportExecution[]; total: number }>(
      `/reports/${reportId}/executions`,
      { params }
    );
    return response.data;
  },

  /**
   * Export report execution
   */
  exportReport: async (
    executionId: string,
    format: ReportFormat
  ): Promise<{ downloadUrl: string }> => {
    const response = await apiClient.post<{ downloadUrl: string }>(
      `/reports/executions/${executionId}/export`,
      { format }
    );
    return response.data;
  },

  /**
   * Schedule a report
   */
  scheduleReport: async (
    schedule: Omit<
      ReportSchedule,
      'scheduleId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'nextRunAt' | 'lastRunAt'
    >
  ): Promise<ReportSchedule> => {
    const response = await apiClient.post<ReportSchedule>('/reports/schedules', schedule);
    return response.data;
  },

  /**
   * Get report schedules
   */
  getSchedules: async (reportId?: string): Promise<ReportSchedule[]> => {
    const response = await apiClient.get<ReportSchedule[]>('/reports/schedules', {
      params: { reportId },
    });
    return response.data;
  },

  /**
   * Update schedule
   */
  updateSchedule: async (
    scheduleId: string,
    updates: Partial<ReportSchedule>
  ): Promise<ReportSchedule> => {
    const response = await apiClient.put<ReportSchedule>(
      `/reports/schedules/${scheduleId}`,
      updates
    );
    return response.data;
  },

  /**
   * Delete schedule
   */
  deleteSchedule: async (scheduleId: string): Promise<void> => {
    await apiClient.delete(`/reports/schedules/${scheduleId}`);
  },

  /**
   * Toggle schedule enabled/disabled
   */
  toggleSchedule: async (scheduleId: string, enabled: boolean): Promise<ReportSchedule> => {
    const response = await apiClient.patch<ReportSchedule>(
      `/reports/schedules/${scheduleId}/toggle`,
      { enabled }
    );
    return response.data;
  },

  /**
   * Get dashboards
   */
  getDashboards: async (params?: { isPublic?: boolean }): Promise<Dashboard[]> => {
    const response = await apiClient.get<Dashboard[]>('/reports/dashboards', { params });
    return response.data;
  },

  /**
   * Get a specific dashboard
   */
  getDashboard: async (dashboardId: string): Promise<Dashboard> => {
    const response = await apiClient.get<Dashboard>(`/reports/dashboards/${dashboardId}`);
    return response.data;
  },

  /**
   * Create a dashboard
   */
  createDashboard: async (
    dashboard: Omit<Dashboard, 'dashboardId' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<Dashboard> => {
    const response = await apiClient.post<Dashboard>('/reports/dashboards', dashboard);
    return response.data;
  },

  /**
   * Update a dashboard
   */
  updateDashboard: async (dashboardId: string, updates: Partial<Dashboard>): Promise<Dashboard> => {
    const response = await apiClient.put<Dashboard>(`/reports/dashboards/${dashboardId}`, updates);
    return response.data;
  },

  /**
   * Delete a dashboard
   */
  deleteDashboard: async (dashboardId: string): Promise<void> => {
    await apiClient.delete(`/reports/dashboards/${dashboardId}`);
  },

  /**
   * Get report templates
   */
  getTemplates: async (category?: string): Promise<ReportTemplate[]> => {
    const response = await apiClient.get<ReportTemplate[]>('/reports/templates', {
      params: { category },
    });
    return response.data;
  },

  /**
   * Create report from template
   */
  createFromTemplate: async (templateId: string, name: string): Promise<Report> => {
    const response = await apiClient.post<Report>(`/reports/templates/${templateId}/create`, {
      name,
    });
    return response.data;
  },

  /**
   * Get available fields for report builder
   */
  getAvailableFields: async (entityType: string): Promise<ReportField[]> => {
    const response = await apiClient.get<ReportField[]>(`/reports/fields/${entityType}`);
    return response.data;
  },

  /**
   * Preview report results
   */
  previewReport: async (definition: {
    fields: ReportField[];
    filters: ReportFilter[];
    groups: ReportGroup[];
    limit?: number;
  }): Promise<{ data: any[]; total: number }> => {
    const response = await apiClient.post<{ data: any[]; total: number }>(
      '/reports/preview',
      definition
    );
    return response.data;
  },

  /**
   * Get export jobs
   */
  getExportJobs: async (params?: {
    status?: ReportStatus;
    page?: number;
    limit?: number;
  }): Promise<{ jobs: ExportJob[]; total: number }> => {
    const response = await apiClient.get<{ jobs: ExportJob[]; total: number }>('/reports/exports', {
      params,
    });
    return response.data;
  },

  /**
   * Create export job
   */
  createExportJob: async (
    job: Omit<
      ExportJob,
      | 'jobId'
      | 'createdAt'
      | 'completedAt'
      | 'status'
      | 'createdBy'
      | 'fileUrl'
      | 'fileSizeBytes'
      | 'recordCount'
      | 'errorMessage'
    >
  ): Promise<ExportJob> => {
    const response = await apiClient.post<ExportJob>('/reports/exports', job);
    return response.data;
  },

  /**
   * Get export job status
   */
  getExportJob: async (jobId: string): Promise<ExportJob> => {
    const response = await apiClient.get<ExportJob>(`/reports/exports/${jobId}`);
    return response.data;
  },

  /**
   * Cancel export job
   */
  cancelExportJob: async (jobId: string): Promise<void> => {
    await apiClient.post(`/reports/exports/${jobId}/cancel`);
  },
};

// ============================================================================
// REPORTS REACT QUERY HOOKS
// ============================================================================

export const useReports = (params?: {
  type?: ReportType;
  status?: ReportStatus;
  category?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportsApi.getReports(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useReport = (reportId: string) => {
  return useQuery({
    queryKey: ['reports', reportId],
    queryFn: () => reportsApi.getReport(reportId),
    enabled: !!reportId,
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.createReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useUpdateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, updates }: { reportId: string; updates: Partial<Report> }) =>
      reportsApi.updateReport(reportId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports', variables.reportId] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useDeleteReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useExecuteReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      parameters,
    }: {
      reportId: string;
      parameters?: Record<string, any>;
    }) => reportsApi.executeReport(reportId, parameters),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports', variables.reportId, 'executions'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useReportExecutions = (
  reportId: string,
  params?: { page?: number; limit?: number }
) => {
  return useQuery({
    queryKey: ['reports', reportId, 'executions', params],
    queryFn: () => reportsApi.getExecutionHistory(reportId, params),
    enabled: !!reportId,
  });
};

export const useExportReport = () => {
  return useMutation({
    mutationFn: ({ executionId, format }: { executionId: string; format: ReportFormat }) =>
      reportsApi.exportReport(executionId, format),
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useSchedules = (reportId?: string) => {
  return useQuery({
    queryKey: ['reports', 'schedules', reportId],
    queryFn: () => reportsApi.getSchedules(reportId),
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.scheduleReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      scheduleId,
      updates,
    }: {
      scheduleId: string;
      updates: Partial<ReportSchedule>;
    }) => reportsApi.updateSchedule(scheduleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useToggleSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scheduleId, enabled }: { scheduleId: string; enabled: boolean }) =>
      reportsApi.toggleSchedule(scheduleId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useDashboards = (params?: { isPublic?: boolean }) => {
  return useQuery({
    queryKey: ['reports', 'dashboards', params],
    queryFn: () => reportsApi.getDashboards(params),
  });
};

export const useDashboard = (dashboardId: string) => {
  return useQuery({
    queryKey: ['reports', 'dashboards', dashboardId],
    queryFn: () => reportsApi.getDashboard(dashboardId),
    enabled: !!dashboardId,
  });
};

export const useCreateDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.createDashboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'dashboards'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useUpdateDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dashboardId, updates }: { dashboardId: string; updates: Partial<Dashboard> }) =>
      reportsApi.updateDashboard(dashboardId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'dashboards', variables.dashboardId] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useDeleteDashboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.deleteDashboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'dashboards'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useTemplates = (category?: string) => {
  return useQuery({
    queryKey: ['reports', 'templates', category],
    queryFn: () => reportsApi.getTemplates(category),
  });
};

export const useCreateFromTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, name }: { templateId: string; name: string }) =>
      reportsApi.createFromTemplate(templateId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useAvailableFields = (entityType: string) => {
  return useQuery({
    queryKey: ['reports', 'fields', entityType],
    queryFn: () => reportsApi.getAvailableFields(entityType),
    enabled: !!entityType,
  });
};

export const usePreviewReport = () => {
  return useMutation({
    mutationFn: (definition: {
      fields: ReportField[];
      filters: ReportFilter[];
      groups: ReportGroup[];
      limit?: number;
    }) => reportsApi.previewReport(definition),
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useExportJobs = (params?: {
  status?: ReportStatus;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['reports', 'exports', params],
    queryFn: () => reportsApi.getExportJobs(params),
  });
};

export const useCreateExportJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.createExportJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'exports'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useExportJob = (jobId: string) => {
  return useQuery({
    queryKey: ['reports', 'exports', jobId],
    queryFn: () => reportsApi.getExportJob(jobId),
    enabled: !!jobId,
    refetchInterval: query => {
      // Poll until job is completed or failed
      const job = query.state.data;
      if (
        job &&
        (job.status === ReportStatus.COMPLETED ||
          job.status === ReportStatus.FAILED ||
          job.status === ReportStatus.CANCELLED)
      ) {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
};

export const useCancelExportJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportsApi.cancelExportJob,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'exports', variables] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

// ============================================================================
// INTEGRATIONS API
// ============================================================================

export const integrationsApi = {
  /**
   * Get all integrations
   */
  getIntegrations: async (params?: {
    type?: IntegrationType;
    status?: IntegrationStatus;
    provider?: IntegrationProvider;
  }): Promise<{ integrations: Integration[]; total: number }> => {
    const response = await apiClient.get<{ integrations: Integration[]; total: number }>(
      '/integrations',
      { params }
    );
    return response.data;
  },

  /**
   * Get a specific integration
   */
  getIntegration: async (integrationId: string): Promise<Integration> => {
    const response = await apiClient.get<Integration>(`/integrations/${integrationId}`);
    return response.data;
  },

  /**
   * Create a new integration
   */
  createIntegration: async (
    integration: Omit<Integration, 'integrationId' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<Integration> => {
    const response = await apiClient.post<Integration>('/integrations', integration);
    return response.data;
  },

  /**
   * Update an integration
   */
  updateIntegration: async (
    integrationId: string,
    updates: Partial<Integration>
  ): Promise<Integration> => {
    const response = await apiClient.put<Integration>(`/integrations/${integrationId}`, updates);
    return response.data;
  },

  /**
   * Delete an integration
   */
  deleteIntegration: async (integrationId: string): Promise<void> => {
    await apiClient.delete(`/integrations/${integrationId}`);
  },

  /**
   * Test connection to an integration
   */
  testConnection: async (
    integrationId: string
  ): Promise<{ success: boolean; message?: string; latency?: number }> => {
    const response = await apiClient.post<{ success: boolean; message?: string; latency?: number }>(
      `/integrations/${integrationId}/test`
    );
    return response.data;
  },

  /**
   * Enable/disable an integration
   */
  toggleIntegration: async (integrationId: string, enabled: boolean): Promise<Integration> => {
    const response = await apiClient.patch<Integration>(`/integrations/${integrationId}/toggle`, {
      enabled,
    });
    return response.data;
  },

  /**
   * Trigger a sync
   */
  triggerSync: async (integrationId: string): Promise<{ syncId: string; status: SyncStatus }> => {
    const response = await apiClient.post<{ syncId: string; status: SyncStatus }>(
      `/integrations/${integrationId}/sync`
    );
    return response.data;
  },

  /**
   * Get sync history
   */
  getSyncHistory: async (
    integrationId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ syncs: any[]; total: number }> => {
    const response = await apiClient.get<{ syncs: any[]; total: number }>(
      `/integrations/${integrationId}/syncs`,
      { params }
    );
    return response.data;
  },

  /**
   * Get webhook events
   */
  getWebhookEvents: async (params?: {
    integrationId?: string;
    eventType?: WebhookEventType;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ events: any[]; total: number }> => {
    const response = await apiClient.get<{ events: any[]; total: number }>(
      '/integrations/webhooks/events',
      { params }
    );
    return response.data;
  },

  /**
   * Retry failed webhook event
   */
  retryWebhookEvent: async (eventId: string): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>(
      `/integrations/webhooks/events/${eventId}/retry`
    );
    return response.data;
  },

  /**
   * Get integration providers
   */
  getProviders: async (): Promise<{
    providers: IntegrationProvider[];
    templates: Record<IntegrationProvider, any>;
  }> => {
    const response = await apiClient.get<{
      providers: IntegrationProvider[];
      templates: Record<IntegrationProvider, any>;
    }>('/integrations/providers');
    return response.data;
  },

  /**
   * Get integration schema
   */
  getSchema: async (
    provider: IntegrationProvider
  ): Promise<{ configSchema: any; authSchema: any }> => {
    const response = await apiClient.get<{ configSchema: any; authSchema: any }>(
      `/integrations/providers/${provider}/schema`
    );
    return response.data;
  },
};

// ============================================================================
// INTEGRATIONS REACT QUERY HOOKS
// ============================================================================

export const useIntegrations = (params?: {
  type?: IntegrationType;
  status?: IntegrationStatus;
  provider?: IntegrationProvider;
}) => {
  return useQuery({
    queryKey: ['integrations', params],
    queryFn: () => integrationsApi.getIntegrations(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useIntegration = (integrationId: string) => {
  return useQuery({
    queryKey: ['integrations', integrationId],
    queryFn: () => integrationsApi.getIntegration(integrationId),
    enabled: !!integrationId,
  });
};

export const useCreateIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.createIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useUpdateIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      updates,
    }: {
      integrationId: string;
      updates: Partial<Integration>;
    }) => integrationsApi.updateIntegration(integrationId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.integrationId] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useDeleteIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.deleteIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useTestConnection = () => {
  return useMutation({
    mutationFn: integrationsApi.testConnection,
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useToggleIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ integrationId, enabled }: { integrationId: string; enabled: boolean }) =>
      integrationsApi.toggleIntegration(integrationId, enabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({
        queryKey: ['integrations', (variables as { integrationId: string }).integrationId],
      });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useTriggerSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (integrationId: string) => integrationsApi.triggerSync(integrationId),
    onSuccess: (_, integrationId) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['integrations', integrationId, 'syncs'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useSyncHistory = (
  integrationId: string,
  params?: { page?: number; limit?: number }
) => {
  return useQuery({
    queryKey: ['integrations', integrationId, 'syncs', params],
    queryFn: () => integrationsApi.getSyncHistory(integrationId, params),
    enabled: !!integrationId,
  });
};

export const useWebhookEvents = (params?: {
  integrationId?: string;
  eventType?: WebhookEventType;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['integrations', 'webhooks', 'events', params],
    queryFn: () => integrationsApi.getWebhookEvents(params),
    refetchInterval: 30000, // Poll every 30 seconds for new events
  });
};

export const useRetryWebhookEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: integrationsApi.retryWebhookEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'webhooks', 'events'] });
    },
    onError: error => {
      handleAPIError(error);
    },
  });
};

export const useProviders = () => {
  return useQuery({
    queryKey: ['integrations', 'providers'],
    queryFn: integrationsApi.getProviders,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
};

export const useIntegrationSchema = (provider: IntegrationProvider) => {
  return useQuery({
    queryKey: ['integrations', 'providers', provider, 'schema'],
    queryFn: () => integrationsApi.getSchema(provider),
    enabled: !!provider,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
};

// ============================================================================
// PRODUCTION MANAGEMENT API
// ============================================================================

export const useProductionOrders = (params?: {
  status?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['production', 'orders', params],
    queryFn: async () => {
      const response = await apiClient.get('/production/orders', { params });
      return response.data;
    },
  });
};

export const useProductionOrder = (orderId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['production', 'orders', orderId],
    queryFn: async () => {
      const response = await apiClient.get(`/production/orders/${orderId}`);
      return response.data;
    },
    enabled: enabled && !!orderId,
  });
};

export const useBOMs = (params?: { productId?: string; status?: string }) => {
  return useQuery({
    queryKey: ['production', 'bom', params],
    queryFn: async () => {
      const response = await apiClient.get('/production/bom', { params });
      return response.data;
    },
  });
};

export const useBOM = (bomId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['production', 'bom', bomId],
    queryFn: async () => {
      const response = await apiClient.get(`/production/bom/${bomId}`);
      return response.data;
    },
    enabled: enabled && !!bomId,
  });
};

export const useProductionJournal = (orderId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['production', 'orders', orderId, 'journal'],
    queryFn: async () => {
      const response = await apiClient.get(`/production/orders/${orderId}/journal`);
      return response.data;
    },
    enabled: enabled && !!orderId,
  });
};

export const useCreateProductionOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/production/orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'orders'] });
    },
  });
};

export const useUpdateProductionOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: any }) => {
      const response = await apiClient.put(`/production/orders/${orderId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'orders', variables.orderId] });
    },
  });
};

export const useProductionDashboard = () => {
  return useQuery({
    queryKey: ['production', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/production/dashboard');
      return response.data;
    },
  });
};

// BOM Mutations
export const useCreateBOM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/production/bom', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'bom'] });
    },
  });
};

export const useUpdateBOM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bomId, data }: { bomId: string; data: any }) => {
      const response = await apiClient.put(`/production/bom/${bomId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'bom'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'bom', variables.bomId] });
    },
  });
};

export const useActivateBOM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bomId: string) => {
      const response = await apiClient.post(`/production/bom/${bomId}/activate`);
      return response.data;
    },
    onSuccess: (_, bomId) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'bom'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'bom', bomId] });
    },
  });
};

export const useDeleteBOM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bomId: string) => {
      await apiClient.delete(`/production/bom/${bomId}`);
      return bomId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production', 'bom'] });
    },
  });
};

// Production Order Workflow Mutations
export const useCancelProductionOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post(`/production/orders/${orderId}/cancel`);
      return response.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production', 'dashboard'] });
    },
  });
};

export const useHoldProductionOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post(`/production/orders/${orderId}/hold`);
      return response.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production', 'dashboard'] });
    },
  });
};

export const useResumeProductionOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post(`/production/orders/${orderId}/resume`);
      return response.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production', 'dashboard'] });
    },
  });
};

export const useReleaseProductionOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post(`/production/orders/${orderId}/release`);
      return response.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production', 'dashboard'] });
    },
  });
};

export const useStartProductionOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post(`/production/orders/${orderId}/start`);
      return response.data;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'orders', orderId] });
      queryClient.invalidateQueries({ queryKey: ['production', 'dashboard'] });
    },
  });
};

export const useRecordProductionOutput = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: any }) => {
      const response = await apiClient.post(`/production/orders/${orderId}/output`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'orders', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['production', 'dashboard'] });
    },
  });
};

// Material Management Mutations
export const useIssueMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: any }) => {
      const response = await apiClient.post(`/production/orders/${orderId}/materials/issue`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'orders', variables.orderId] });
    },
  });
};

export const useReturnMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: any }) => {
      const response = await apiClient.post(`/production/orders/${orderId}/materials/return`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['production', 'orders', variables.orderId] });
    },
  });
};

// ============================================================================
// MAINTENANCE & ASSETS API
// ============================================================================

export const useAssets = (params?: {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['maintenance', 'assets', params],
    queryFn: async () => {
      const response = await apiClient.get('/maintenance/assets', { params });
      return response.data;
    },
  });
};

export const useAsset = (assetId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['maintenance', 'assets', assetId],
    queryFn: async () => {
      const response = await apiClient.get(`/maintenance/assets/${assetId}`);
      return response.data;
    },
    enabled: enabled && !!assetId,
  });
};

export const useMaintenanceWorkOrders = (params?: {
  status?: string;
  assetId?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['maintenance', 'work-orders', params],
    queryFn: async () => {
      const response = await apiClient.get('/maintenance/work-orders', { params });
      return response.data;
    },
  });
};

export const useMaintenanceWorkOrder = (workOrderId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['maintenance', 'work-orders', workOrderId],
    queryFn: async () => {
      const response = await apiClient.get(`/maintenance/work-orders/${workOrderId}`);
      return response.data;
    },
    enabled: enabled && !!workOrderId,
  });
};

export const useMaintenanceSchedules = (params?: { assetId?: string; active?: boolean }) => {
  return useQuery({
    queryKey: ['maintenance', 'schedules', params],
    queryFn: async () => {
      const response = await apiClient.get('/maintenance/schedules', { params });
      return response.data;
    },
  });
};

export const useCreateAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/maintenance/assets', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'assets'] });
    },
  });
};

export const useCreateWorkOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/maintenance/work-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
    },
  });
};

export const useUpdateWorkOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workOrderId, data }: { workOrderId: string; data: any }) => {
      const response = await apiClient.put(`/maintenance/work-orders/${workOrderId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
      queryClient.invalidateQueries({
        queryKey: ['maintenance', 'work-orders', variables.workOrderId],
      });
    },
  });
};

export const useMaintenanceDashboard = () => {
  return useQuery({
    queryKey: ['maintenance', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/maintenance/dashboard');
      return response.data;
    },
  });
};

// ============================================================================
// SALES & CRM API
// ============================================================================

export const useCustomers = (params?: {
  status?: string;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['sales', 'customers', params],
    queryFn: async () => {
      const response = await apiClient.get('/sales/customers', { params });
      return response.data;
    },
  });
};

export const useCustomer = (customerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['sales', 'customers', customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/sales/customers/${customerId}`);
      return response.data;
    },
    enabled: enabled && !!customerId,
  });
};

export const useLeads = (params?: { status?: string; assignedTo?: string; limit?: number }) => {
  return useQuery({
    queryKey: ['sales', 'leads', params],
    queryFn: async () => {
      const response = await apiClient.get('/sales/leads', { params });
      return response.data;
    },
  });
};

export const useLead = (leadId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['sales', 'leads', leadId],
    queryFn: async () => {
      const response = await apiClient.get(`/sales/leads/${leadId}`);
      return response.data;
    },
    enabled: enabled && !!leadId,
  });
};

export const useOpportunities = (params?: {
  stage?: string;
  assignedTo?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['sales', 'opportunities', params],
    queryFn: async () => {
      const response = await apiClient.get('/sales/opportunities', { params });
      return response.data;
    },
  });
};

export const useOpportunity = (opportunityId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['sales', 'opportunities', opportunityId],
    queryFn: async () => {
      const response = await apiClient.get(`/sales/opportunities/${opportunityId}`);
      return response.data;
    },
    enabled: enabled && !!opportunityId,
  });
};

export const useQuotes = (params?: { status?: string; customerId?: string; limit?: number }) => {
  return useQuery({
    queryKey: ['sales', 'quotes', params],
    queryFn: async () => {
      const response = await apiClient.get('/sales/quotes', { params });
      return response.data;
    },
  });
};

export const useQuote = (quoteId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['sales', 'quotes', quoteId],
    queryFn: async () => {
      const response = await apiClient.get(`/sales/quotes/${quoteId}`);
      return response.data;
    },
    enabled: enabled && !!quoteId,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/sales/customers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'customers'] });
    },
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/sales/leads', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'leads'] });
    },
  });
};

export const useCreateOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/sales/opportunities', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'opportunities'] });
    },
  });
};

export const useCreateQuote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/sales/quotes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'quotes'] });
    },
  });
};

export const useSalesDashboard = () => {
  return useQuery({
    queryKey: ['sales', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/sales/dashboard');
      return response.data;
    },
  });
};

// ============================================================================
// ROUTE OPTIMIZATION API
// ============================================================================

export const useOptimizeRoute = () => {
  return useMutation({
    mutationFn: async (data: { locations: string[]; startPoint?: string; algorithm?: string }) => {
      const response = await apiClient.post('/route-optimization/optimize', data);
      return response.data;
    },
  });
};

export const useCompareRoutes = () => {
  return useMutation({
    mutationFn: async (data: { locations: string[]; startPoint?: string }) => {
      const response = await apiClient.post('/route-optimization/compare', data);
      return response.data;
    },
  });
};

export const usePredictOrderDuration = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/route-optimization/predict-duration', data);
      return response.data;
    },
  });
};

export const useForecastDemand = () => {
  return useMutation({
    mutationFn: async (data: {
      sku_id: string;
      historical_data: number[];
      forecast_horizon_days?: number;
    }) => {
      const response = await apiClient.post('/route-optimization/forecast-demand', data);
      return response.data;
    },
  });
};

export const useRouteOptimizationConfig = () => {
  return useQuery({
    queryKey: ['route-optimization', 'config'],
    queryFn: async () => {
      const response = await apiClient.get('/route-optimization/config');
      return response.data;
    },
  });
};

export const useModelStatus = () => {
  return useQuery({
    queryKey: ['route-optimization', 'model-status'],
    queryFn: async () => {
      const response = await apiClient.get('/route-optimization/model-status');
      return response.data;
    },
  });
};

// ============================================================================
// ACCOUNTING API
// ============================================================================

export const accountingApi = {
  /**
   * Get financial metrics
   */
  getFinancialMetrics: async (params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get('/accounting/metrics', { params });
    return response.data;
  },

  /**
   * Get profit & loss statement
   */
  getProfitLoss: async (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const response = await apiClient.get('/accounting/profit-loss', { params });
    return response.data;
  },

  /**
   * Get inventory valuation
   */
  getInventoryValuation: async (params?: { category?: string; zone?: string; sku?: string }) => {
    const response = await apiClient.get('/accounting/inventory/valuation', { params });
    return response.data;
  },

  /**
   * Get labor costs
   */
  getLaborCosts: async (params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    role?: string;
  }) => {
    const response = await apiClient.get('/accounting/labor-costs', { params });
    return response.data;
  },

  /**
   * Get vendor financial performance
   */
  getVendorFinancial: async (
    vendorId: string,
    params?: {
      period?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const response = await apiClient.get(`/accounting/vendors/${vendorId}/financial`, { params });
    return response.data;
  },

  /**
   * Get customer financial summary
   */
  getCustomerFinancial: async (
    customerId: string,
    params?: {
      period?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const response = await apiClient.get(`/accounting/customers/${customerId}/financial`, {
      params,
    });
    return response.data;
  },

  /**
   * Get transactions
   */
  getTransactions: async (params?: {
    type?: string;
    referenceType?: string;
    customerId?: string;
    vendorId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get('/accounting/transactions', { params });
    return response.data;
  },

  /**
   * Create transaction
   */
  createTransaction: async (data: {
    transactionType: string;
    amount: number;
    currency?: string;
    referenceType: string;
    referenceId: string;
    description: string;
    customerId?: string;
    vendorId?: string;
    account: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/accounting/transactions', data);
    return response.data;
  },
};

// Accounting query hooks
export const useFinancialMetrics = (params?: {
  period?: string;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['accounting', 'metrics', params],
    queryFn: () => accountingApi.getFinancialMetrics(params),
    enabled: params?.enabled ?? true,
    retry: 1,
    staleTime: 60000,
  });
};

export const useProfitLossStatement = (params?: {
  period?: string;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['accounting', 'profit-loss', params],
    queryFn: () => accountingApi.getProfitLoss(params),
    enabled: params?.enabled ?? true,
    retry: 1,
    staleTime: 60000,
  });
};

export const useInventoryValuation = (params?: {
  category?: string;
  zone?: string;
  sku?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['accounting', 'inventory-valuation', params],
    queryFn: () => accountingApi.getInventoryValuation(params),
    enabled: params?.enabled ?? true,
    retry: 1,
    staleTime: 60000,
  });
};

export const useLaborCosts = (params?: {
  period?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  role?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['accounting', 'labor-costs', params],
    queryFn: () => accountingApi.getLaborCosts(params),
    enabled: params?.enabled ?? true,
  });
};

export const useVendorFinancial = (
  vendorId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: ['accounting', 'vendor-financial', vendorId, params],
    queryFn: () => accountingApi.getVendorFinancial(vendorId, params),
    enabled: (params?.enabled ?? true) && !!vendorId,
  });
};

export const useCustomerFinancial = (
  customerId: string,
  params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
    enabled?: boolean;
  }
) => {
  return useQuery({
    queryKey: ['accounting', 'customer-financial', customerId, params],
    queryFn: () => accountingApi.getCustomerFinancial(customerId, params),
    enabled: (params?.enabled ?? true) && !!customerId,
  });
};

export const useTransactions = (params?: {
  type?: string;
  referenceType?: string;
  customerId?: string;
  vendorId?: string;
  status?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ['accounting', 'transactions', params],
    queryFn: () => accountingApi.getTransactions(params),
    enabled: params?.enabled ?? true,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountingApi.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'transactions'] });
    },
  });
};

// ============================================================================
// ROLE PERMISSIONS API
// ============================================================================

export const rolePermissionsApi = {
  /**
   * Get role permissions matrix
   */
  getPermissionsMatrix: async () => {
    const response = await apiClient.get('/accounting/roles/permissions');
    return response.data;
  },
};

export const useRolePermissionsMatrix = () => {
  return useQuery({
    queryKey: ['roles', 'permissions-matrix'],
    queryFn: rolePermissionsApi.getPermissionsMatrix,
  });
};
