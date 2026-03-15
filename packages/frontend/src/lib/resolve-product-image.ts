import { API_BASE_URL } from '@/lib/api-base-url';

const NETSUITE_FILE_PREFIX = 'netsuite-file:';

function getCurrentOrganizationId(): string | null {
  try {
    const storage = localStorage.getItem('organization-storage');
    if (!storage) {
      return null;
    }

    const parsed = JSON.parse(storage);
    return parsed?.state?.currentOrganizationId || null;
  } catch {
    return null;
  }
}

export function resolveProductImage(image?: string | null): string | null {
  const raw = typeof image === 'string' ? image.trim() : '';
  if (!raw) {
    return null;
  }

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }

  if (raw.startsWith(NETSUITE_FILE_PREFIX)) {
    const remainder = raw.slice(NETSUITE_FILE_PREFIX.length);
    const [fileIdPart, queryPart] = remainder.split('?');
    const fileId = fileIdPart?.trim();
    if (!fileId) {
      return null;
    }

    const params = new URLSearchParams(queryPart || '');
    const org = params.get('org') || getCurrentOrganizationId();
    if (!org) {
      return null;
    }

    return `${API_BASE_URL}/skus/netsuite-image/${encodeURIComponent(fileId)}?org=${encodeURIComponent(org)}`;
  }

  return raw;
}
