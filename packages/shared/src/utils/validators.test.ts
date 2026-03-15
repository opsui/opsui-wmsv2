import { describe, expect, it } from 'vitest';
import { ValidationError } from '../types';
import { validateSKU } from './validators';

describe('validateSKU', () => {
  it('accepts SKUs with spaces and mixed punctuation used in production', () => {
    expect(() => validateSKU('EC-TOUCH W')).not.toThrow();
    expect(() => validateSKU('INFINITY LINK')).not.toThrow();
    expect(() => validateSKU('EC-KIT @SOURCE-2')).not.toThrow();
  });

  it('normalizes repeated spaces before validation', () => {
    expect(() => validateSKU('  EC-TOUCH   W  ')).not.toThrow();
  });

  it('still rejects clearly invalid SKU values', () => {
    expect(() => validateSKU('')).toThrow(ValidationError);
    expect(() => validateSKU('***')).toThrow(ValidationError);
  });
});
