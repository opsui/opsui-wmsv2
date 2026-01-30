/**
 * JWT Decoder Component
 *
 * Displays JWT token payload with pretty formatting
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared';
import { KeyIcon, ClockIcon } from '@heroicons/react/24/outline';

export interface JwtPayload {
  userId: string;
  email: string;
  baseRole: string;
  effectiveRole: string;
  activeRole?: string | null;
  iat?: number;
  exp?: number;
}

interface JwtDecoderProps {
  token?: string | null;
  payload?: JwtPayload | null;
  showTimestamps?: boolean;
  className?: string;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded) as JwtPayload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleString();
}

function getTimeRemaining(exp?: number): string {
  if (!exp) return 'N/A';
  const now = Math.floor(Date.now() / 1000);
  const remaining = exp - now;

  if (remaining <= 0) return 'Expired';

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function JwtDecoder({ token, payload, showTimestamps = true, className = '' }: JwtDecoderProps) {
  let decodedPayload: JwtPayload | null = payload || null;

  if (token && !decodedPayload) {
    decodedPayload = decodeJwt(token);
  }

  if (!decodedPayload) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
          <KeyIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No JWT token to display</p>
        </CardContent>
      </Card>
    );
  }

  const entries = Object.entries(decodedPayload).filter(([key]) =>
    ['userId', 'email', 'baseRole', 'effectiveRole', 'activeRole', 'iat', 'exp'].includes(key)
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyIcon className="h-5 w-5" />
          JWT Token Payload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 font-mono text-sm">
          {entries.map(([key, value]) => {
            const isTimestamp = key === 'iat' || key === 'exp';
            const displayValue = isTimestamp && showTimestamps
              ? `${formatTimestamp(value as number)} (${getTimeRemaining(value as number)})`
              : String(value ?? 'null');

            return (
              <div
                key={key}
                className="flex items-start gap-2 p-2 rounded bg-gray-50 dark:bg-gray-800"
              >
                <span className="text-blue-600 dark:text-blue-400 font-semibold min-w-[100px]">
                  {key}:
                </span>
                <span className="text-gray-900 dark:text-gray-100 break-all">
                  {displayValue}
                </span>
              </div>
            );
          })}
        </div>

        {decodedPayload.exp && showTimestamps && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Token expires in{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {getTimeRemaining(decodedPayload.exp)}
                </span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact JWT viewer for inline display
 */
export function JwtViewer({ payload }: { payload?: JwtPayload | null }) {
  if (!payload) {
    return <span className="text-gray-500">Not logged in</span>;
  }

  return (
    <div className="inline-flex items-center gap-3 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
      <span className="font-mono text-gray-600 dark:text-gray-400">{payload.userId}</span>
      <span className="text-gray-400">•</span>
      <span className="text-gray-900 dark:text-white">{payload.email}</span>
      <span className="text-gray-400">•</span>
      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
        {payload.effectiveRole}
      </span>
    </div>
  );
}

/**
 * JWT permission matrix viewer
 */
export function JwtPermissionMatrix({ payload }: { payload?: JwtPayload | null }) {
  if (!payload) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No user session data available
        </CardContent>
      </Card>
    );
  }

  const rolePermissions: Record<string, string[]> = {
    PICKER: ['Claim orders', 'Pick items', 'Update pick tasks', 'View own audit logs'],
    PACKER: ['Pack orders', 'Ship orders', 'Update packing status', 'View own audit logs'],
    SUPERVISOR: ['View all orders', 'Cancel orders', 'View users', 'View metrics', 'View all audit logs'],
    STOCK_CONTROLLER: ['Manage SKUs', 'Adjust inventory', 'Manage bin locations', 'View audit logs'],
    ADMIN: ['Full system access', 'Manage users', 'Manage roles', 'All permissions'],
  };

  const permissions = rolePermissions[payload.effectiveRole] || [];
  const isAdmin = payload.effectiveRole === 'ADMIN';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Role Permissions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Current Role</span>
          <p className="text-xl font-bold dark:text-white">{payload.effectiveRole}</p>
        </div>

        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Permissions</span>
          {isAdmin ? (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                Full administrative access to all system resources
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {permissions.map((permission, i) => (
                <li key={i} className="flex items-center gap-2 text-sm dark:text-gray-300">
                  <span className="text-green-500">✓</span>
                  {permission}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
