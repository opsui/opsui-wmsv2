/**
 * Tabs Component
 *
 * A reusable tabbed interface component with support for icons and lazy content
 */

import { useState } from 'react';
import { classNames } from './utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  contentClassName?: string;
}

export function Tabs({
  tabs,
  defaultTab,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '',
  contentClassName = '',
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  const getTabClasses = (tabId: string) => {
    const isActive = tabId === activeTab;
    const baseClasses = 'inline-flex items-center gap-2 font-medium transition-all duration-200';

    const sizeClasses = {
      sm: 'text-sm px-3 py-1.5',
      md: 'text-sm px-4 py-2',
      lg: 'text-base px-5 py-2.5',
    };

    const variantClasses = {
      default: isActive
        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
      pills: isActive
        ? 'bg-blue-500 text-white'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
      underline: isActive
        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-b-2 border-transparent',
    };

    const widthClasses = fullWidth ? 'flex-1 justify-center' : '';

    return classNames(
      baseClasses,
      sizeClasses[size],
      variantClasses[variant],
      widthClasses,
      'cursor-pointer rounded-t-lg'
    );
  };

  return (
    <div className={className}>
      {/* Tab Headers */}
      <div
        className={classNames(
          'flex',
          variant === 'default' &&
            'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-lg overflow-hidden',
          variant === 'pills' && 'gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg',
          variant === 'underline' && 'border-b border-gray-200 dark:border-gray-700'
        )}
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={getTabClasses(tab.id)}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={classNames(
                    'inline-flex items-center justify-center rounded-full text-xs',
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className={contentClassName}>{activeTabData?.content}</div>
    </div>
  );
}

/**
 * Tab Panel Component for lazy-loaded content
 */
export function TabPanel({
  children,
  isActive,
  className = '',
}: {
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
}) {
  if (!isActive) return null;

  return <div className={className}>{children}</div>;
}

/**
 * Vertical Tabs Variant
 */
export function VerticalTabs({
  tabs,
  defaultTab,
  className = '',
}: {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className={classNames('flex gap-4', className)}>
      {/* Tab Headers - Vertical */}
      <div className="flex flex-col gap-1 w-48">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={classNames(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={classNames(
                    'ml-auto inline-flex items-center justify-center rounded-full text-xs px-2',
                    isActive
                      ? 'bg-blue-400 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1">{activeTabData?.content}</div>
    </div>
  );
}
