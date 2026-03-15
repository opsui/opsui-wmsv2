const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);
const DEFAULT_PRODUCTION_API_BASE_URL = 'https://api.opsui.app/api/v1';
const DEFAULT_PRODUCTION_WS_BASE_URL = 'https://api.opsui.app';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function resolveApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    if (!LOCAL_HOSTNAMES.has(hostname)) {
      return DEFAULT_PRODUCTION_API_BASE_URL;
    }
  }

  return '/api/v1';
}

export function resolveWebSocketBaseUrl(): string {
  const configuredWebSocketUrl = import.meta.env.VITE_WS_URL?.trim();
  if (configuredWebSocketUrl) {
    return normalizeBaseUrl(configuredWebSocketUrl);
  }

  const apiBaseUrl = resolveApiBaseUrl();
  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return new URL(apiBaseUrl).origin;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    if (!LOCAL_HOSTNAMES.has(hostname)) {
      return DEFAULT_PRODUCTION_WS_BASE_URL;
    }

    return window.location.origin;
  }

  return DEFAULT_PRODUCTION_WS_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const AUTH_API_BASE_URL = `${API_BASE_URL}/auth`;
export const WS_BASE_URL = resolveWebSocketBaseUrl();
