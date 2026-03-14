const EXCLUDED_QUEUE_CUSTOMER_PATTERNS = ['telfer electrical'];

function normalizeCustomerName(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isExcludedQueueCustomerName(value: string | null | undefined): boolean {
  const normalized = normalizeCustomerName(value);
  if (!normalized) {
    return false;
  }

  return EXCLUDED_QUEUE_CUSTOMER_PATTERNS.some(pattern => normalized.includes(pattern));
}

export function appendExcludedQueueCustomerConditions(
  conditions: string[],
  params: any[],
  paramIndex: number
): number {
  for (const pattern of EXCLUDED_QUEUE_CUSTOMER_PATTERNS) {
    conditions.push(`LOWER(COALESCE(o.customer_name, '')) NOT LIKE $${paramIndex++}`);
    params.push(`%${pattern}%`);
  }

  return paramIndex;
}
