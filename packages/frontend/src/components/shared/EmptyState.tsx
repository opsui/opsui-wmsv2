/**
 * EmptyState Component
 *
 * Reusable empty state illustrations and messages
 */

import {
  DocumentTextIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  UserGroupIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

/**
 * Empty state component with illustrations
 */
export function EmptyState({
  type = 'no-data',
  title,
  description,
  action,
  className,
}: {
  type?:
    | 'no-data'
    | 'no-results'
    | 'no-items'
    | 'no-users'
    | 'no-orders'
    | 'error'
    | 'success'
    | 'loading';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}) {
  const icons = {
    'no-data': DocumentTextIcon,
    'no-results': MagnifyingGlassIcon,
    'no-items': InboxIcon,
    'no-users': UserGroupIcon,
    'no-orders': CubeIcon,
    error: ExclamationCircleIcon,
    success: CheckCircleIcon,
    loading: ArrowPathIcon,
  };

  const colors = {
    'no-data': 'text-gray-500',
    'no-results': 'text-gray-500',
    'no-items': 'text-gray-500',
    'no-users': 'text-gray-500',
    'no-orders': 'text-gray-500',
    error: 'text-error-500',
    success: 'text-success-500',
    loading: 'text-primary-500 animate-spin',
  };

  const bgColors = {
    'no-data': 'bg-gray-500/10',
    'no-results': 'bg-gray-500/10',
    'no-items': 'bg-gray-500/10',
    'no-users': 'bg-gray-500/10',
    'no-orders': 'bg-gray-500/10',
    error: 'bg-error-500/10',
    success: 'bg-success-500/10',
    loading: 'bg-primary-500/10',
  };

  const IconComponent = icons[type];

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className || ''}`}>
      {/* Icon */}
      <div
        className={`flex items-center justify-center w-16 h-16 rounded-full mb-4 ${bgColors[type]}`}
      >
        <IconComponent className={`h-8 w-8 ${colors[type]}`} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-400 text-center mb-6 max-w-md">{description}</p>
      )}

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            action.variant === 'primary'
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// SPECIALIZED EMPTY STATES
// ============================================================================

/**
 * Empty state for search results
 */
export function NoSearchResults({
  searchTerm,
  onClear,
}: {
  searchTerm: string;
  onClear: () => void;
}) {
  return (
    <EmptyState
      type="no-results"
      title="No results found"
      description={`We couldn't find anything matching "${searchTerm}"`}
      action={{
        label: 'Clear search',
        onClick: onClear,
        variant: 'secondary',
      }}
    />
  );
}

/**
 * Empty state for no data
 */
export function NoData({
  message = 'No data available',
  action,
}: {
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <EmptyState
      type="no-data"
      title={message}
      description="Get started by adding your first item"
      action={action}
    />
  );
}

/**
 * Empty state for errors
 */
export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      type="error"
      title="Error"
      description={message}
      action={
        onRetry
          ? {
              label: 'Try again',
              onClick: onRetry,
              variant: 'primary',
            }
          : undefined
      }
    />
  );
}

/**
 * Empty state for loading
 */
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <ArrowPathIcon className="h-12 w-12 text-primary-500 animate-spin mb-4" />
      <p className="text-gray-400">{message}</p>
    </div>
  );
}

export default EmptyState;
