/**
 * Organization Switcher Component
 *
 * Dropdown component for switching between organizations.
 */

import { cn } from '@/lib/utils';
import { organizationApi } from '@/services/organizationApi';
import {
  useCurrentOrganizationId,
  useOrganizationStore,
  useUserOrganizations,
} from '@/stores/organizationStore';
import {
  BuildingOffice2Icon,
  CheckIcon,
  ChevronDownIcon,
  CogIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface OrganizationSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function OrganizationSwitcher({ className, compact = false }: OrganizationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const currentOrganizationId = useCurrentOrganizationId();
  const userOrganizations = useUserOrganizations();
  const { setCurrentOrganizationId, setLoading } = useOrganizationStore();

  const currentOrg = userOrganizations.find(o => o.organizationId === currentOrganizationId);

  // Load user organizations on mount
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setIsLoading(true);
        const result = await organizationApi.getMyOrganizations();
        useOrganizationStore.getState().setUserOrganizations(
          result.organizations.map(o => ({
            organizationId: o.organizationId,
            organizationName: o.organizationName,
            slug: o.slug,
            role: o.role,
            isPrimary: o.isPrimary,
            logoUrl: o.logoUrl,
          }))
        );
      } catch (error) {
        console.error('Failed to load organizations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userOrganizations.length === 0) {
      loadOrganizations();
    }
  }, []);

  const handleSwitchOrganization = async (organizationId: string) => {
    if (organizationId === currentOrganizationId) {
      setIsOpen(false);
      return;
    }

    try {
      setLoading(true);
      await organizationApi.setPrimary(organizationId);
      setCurrentOrganizationId(organizationId);
      setIsOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = () => {
    setIsOpen(false);
    navigate('/organizations/create');
  };

  const handleManageOrganizations = () => {
    setIsOpen(false);
    navigate('/organizations');
  };

  if (isLoading && userOrganizations.length === 0) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-10 w-48 bg-gray-200 rounded-md" />
      </div>
    );
  }

  if (userOrganizations.length === 0) {
    return (
      <button
        onClick={handleCreateOrganization}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
          'bg-blue-600 text-white hover:bg-blue-700 transition-colors',
          className
        )}
      >
        <PlusIcon className="h-4 w-4" />
        {!compact && <span>Create Organization</span>}
      </button>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
          'bg-white border border-gray-200 hover:bg-gray-50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        )}
      >
        {currentOrg?.logoUrl ? (
          <img
            src={currentOrg.logoUrl}
            alt={currentOrg.organizationName}
            className="h-5 w-5 rounded"
          />
        ) : (
          <BuildingOffice2Icon className="h-4 w-4 text-gray-500" />
        )}
        {!compact && (
          <>
            <span className="truncate max-w-[150px]">
              {currentOrg?.organizationName || 'Select Organization'}
            </span>
            <ChevronDownIcon
              className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')}
            />
          </>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className={cn(
              'absolute z-20 mt-1 w-64 rounded-md bg-white shadow-lg',
              'border border-gray-200 py-1',
              'right-0 md:left-0'
            )}
          >
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Your Organizations
            </div>

            <div className="max-h-60 overflow-y-auto">
              {userOrganizations.map(org => (
                <button
                  key={org.organizationId}
                  onClick={() => handleSwitchOrganization(org.organizationId)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm',
                    'hover:bg-gray-50 transition-colors',
                    org.organizationId === currentOrganizationId && 'bg-blue-50'
                  )}
                >
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.organizationName} className="h-5 w-5 rounded" />
                  ) : (
                    <BuildingOffice2Icon className="h-5 w-5 text-gray-400" />
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">{org.organizationName}</div>
                    <div className="text-xs text-gray-500">
                      {org.role === 'ORG_OWNER' && 'Owner'}
                      {org.role === 'ORG_ADMIN' && 'Admin'}
                      {org.role === 'ORG_MEMBER' && 'Member'}
                      {org.role === 'ORG_VIEWER' && 'Viewer'}
                      {org.isPrimary && ' · Primary'}
                    </div>
                  </div>
                  {org.organizationId === currentOrganizationId && (
                    <CheckIcon className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={handleCreateOrganization}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm',
                  'hover:bg-gray-50 transition-colors text-gray-700'
                )}
              >
                <PlusIcon className="h-4 w-4" />
                Create Organization
              </button>
              <button
                onClick={handleManageOrganizations}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm',
                  'hover:bg-gray-50 transition-colors text-gray-700'
                )}
              >
                <CogIcon className="h-4 w-4" />
                Manage Organizations
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OrganizationSwitcher;
