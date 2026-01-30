/**
 * Toggle Switch Component
 *
 * A reusable toggle/switch component with loading states
 */

import { classNames } from './utils';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
  id?: string;
  className?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  loading = false,
  size = 'md',
  label,
  description,
  id,
  className = '',
}: ToggleSwitchProps) {
  const sizeClasses = {
    sm: {
      switch: 'w-8 h-4',
      dot: 'w-3 h-3',
      translate: 'translate-x-4',
    },
    md: {
      switch: 'w-11 h-6',
      dot: 'w-5 h-5',
      translate: 'translate-x-5',
    },
    lg: {
      switch: 'w-14 h-8',
      dot: 'w-6 h-6',
      translate: 'translate-x-7',
    },
  };

  const isDisabled = disabled || loading;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        onClick={() => !isDisabled && onChange(!checked)}
        disabled={isDisabled}
        className={classNames(
          'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          sizeClasses[size].switch,
          checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-700',
          isDisabled && 'cursor-not-allowed opacity-50'
        )}
        role="switch"
        aria-checked={checked}
        aria-disabled={isDisabled}
      >
        <span
          aria-hidden="true"
          className={classNames(
            'pointer-events-none inline-block rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            sizeClasses[size].dot,
            checked ? sizeClasses[size].translate : 'translate-x-0',
            loading && 'animate-pulse'
          )}
        >
          {loading && (
            <svg
              className="animate-spin h-full w-full text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
        </span>
      </button>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
  );
}

/**
 * Toggle Group Component for managing multiple toggles
 */
export interface ToggleItem {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleGroup({
  items,
  size = 'md',
  className = '',
}: {
  items: ToggleItem[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex-1">
              <label
                htmlFor={item.id}
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {item.label}
              </label>
              {item.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
              )}
            </div>
            <ToggleSwitch
              id={item.id}
              checked={item.checked}
              onChange={item.onChange}
              disabled={item.disabled}
              size={size}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Toggle with Icon
 */
export function ToggleWithIcon({
  checked,
  onChange,
  disabled,
  loading,
  icon: Icon,
  label,
  size = 'md',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div
          className={classNames(
            'p-2 rounded-lg transition-colors',
            checked
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <div className="ml-auto">
        <ToggleSwitch
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          loading={loading}
          size={size}
        />
      </div>
    </div>
  );
}
