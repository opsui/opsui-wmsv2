import { describe, expect, it } from 'vitest';
import { canLookupSku, getSkuLookupKey, normalizeSkuLookupValue } from './sku-lookup';

describe('sku lookup helpers', () => {
  it('preserves valid SKUs with spaces for API requests', () => {
    expect(normalizeSkuLookupValue('  EC-TOUCH   W  ')).toBe('EC-TOUCH W');
    expect(canLookupSku('EC-TOUCH W')).toBe(true);
  });

  it('builds a stable map key without losing the original request casing', () => {
    expect(getSkuLookupKey('EC-IoT')).toBe('EC-IOT');
    expect(normalizeSkuLookupValue('EC-IoT')).toBe('EC-IoT');
  });
});
