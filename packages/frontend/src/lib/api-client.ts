/**
 * API client configuration
 *
 * Axios client with interceptors for authentication and error handling
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/authStore';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ============================================================================
// CREATE AXIOS INSTANCE
// ============================================================================

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    let token = useAuthStore.getState().accessToken;

    // Fallback: read from localStorage directly if Zustand hasn't hydrated yet
    // This prevents 401 errors during initial page load due to race condition
    if (!token) {
      try {
        const storage = localStorage.getItem('wms-auth-storage');
        if (storage) {
          const parsed = JSON.parse(storage);
          token = parsed.state.accessToken;
        }
      } catch (e) {
        // Ignore storage parsing errors
      }
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Note: We use camelCase consistently throughout the app
    // No conversion to snake_case needed

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  // Handle circular references and special objects
  try {
    return Object.keys(obj).reduce((acc: any, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {});
  } catch (error) {
    // If conversion fails, return the object as-is
    console.warn('[api-client] Failed to convert to camelCase:', error);
    return obj;
  }
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Convert snake_case to camelCase for all response data
    response.data = toCamelCase(response.data);
    return response;
  },
  async (error: AxiosError<unknown>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const data = toCamelCase(response.data);
          const {
            accessToken,
            refreshToken: newRefreshToken,
            user,
          } = data as {
            accessToken: string;
            refreshToken: string;
            user: any;
          };

          // Update auth store
          useAuthStore.getState().updateTokens(accessToken, newRefreshToken, user);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    let errorMessage = 'An unknown error occurred';

    try {
      // Safely extract error message
      const errorMsg = error?.message;
      if (typeof errorMsg === 'string') {
        errorMessage = errorMsg;
      }

      if (error.response?.data) {
        try {
          const errorData = toCamelCase(error.response.data);
          const dataError = (errorData as { error?: string }).error;
          if (typeof dataError === 'string') {
            errorMessage = dataError;
          }
        } catch (camelCaseError) {
          console.error(
            '[api-client] Failed to convert error response to camelCase:',
            camelCaseError
          );
          // Try to get raw error message
          const rawData = error.response.data as Record<string, unknown>;
          const rawError = rawData.error;
          if (rawError && typeof rawError === 'string') {
            errorMessage = rawError;
          }
        }
      }

      // Log the error for debugging (skip 404s for optional endpoints and 401s during tests)
      const isOptional404 =
        error.response?.status === 404 &&
        typeof error.config?.url === 'string' &&
        (error.config.url.includes('/developer/e2e/results') ||
          error.config.url.includes('/developer/workflows/results'));

      // Suppress 401 error logs during automated testing (Playwright/Cypress)
      const isAutomatedTest =
        typeof window !== 'undefined' &&
        ((window as any).playwright !== undefined ||
          (window as any).Cypress !== undefined ||
          navigator.webdriver ||
          // Check for Playwright's CDN markers
          !!(window as any).__PLAYWRIGHT_TEST__);

      const isTest401 = isAutomatedTest && error.response?.status === 401;

      if (!isOptional404 && !isTest401) {
        console.error('[api-client] API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          errorMessage: String(errorMessage),
        });
      }
    } catch (conversionError) {
      console.error('[api-client] Failed to parse error response:', conversionError);
    }

    // Ensure errorMessage is always a string
    const finalErrorMessage = String(errorMessage || 'An unknown error occurred');
    return Promise.reject(new Error(finalErrorMessage));
  }
);

// ============================================================================
// ERROR TYPES
// ============================================================================

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Handle API error and return standardized error object
 */
export function handleAPIError(error: unknown): APIError {
  if (error instanceof APIError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; code?: string; details?: unknown };
    return new APIError(
      data?.error || error.message,
      error.response?.status,
      data?.code,
      data?.details
    );
  }

  if (error instanceof Error) {
    return new APIError(error.message);
  }

  return new APIError('An unknown error occurred');
}
