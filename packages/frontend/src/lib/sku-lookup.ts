const SKU_LOOKUP_PATTERN = /^[A-Z0-9][A-Z0-9 .@&()+/_-]{1,79}$/i;

export function normalizeSkuLookupValue(value?: string | null): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function getSkuLookupKey(value?: string | null): string {
  return normalizeSkuLookupValue(value).toUpperCase();
}

export function canLookupSku(value?: string | null): boolean {
  const normalized = normalizeSkuLookupValue(value);
  return normalized.length >= 2 && normalized.length <= 80 && SKU_LOOKUP_PATTERN.test(normalized);
}
