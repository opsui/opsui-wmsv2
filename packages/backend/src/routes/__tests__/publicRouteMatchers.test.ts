import { isPublicV1Route } from '../publicRouteMatchers';

describe('isPublicV1Route', () => {
  it('treats auth routes as public', () => {
    expect(isPublicV1Route('/auth/login')).toBe(true);
  });

  it('treats NetSuite image routes as public', () => {
    expect(isPublicV1Route('/skus/netsuite-image/440200')).toBe(true);
    expect(isPublicV1Route('/skus/netsuite-image/440200?org=ORG320EDF1')).toBe(true);
  });

  it('keeps regular SKU routes protected', () => {
    expect(isPublicV1Route('/skus/PW-KEYPAD-XK1')).toBe(false);
    expect(isPublicV1Route('/orders/full')).toBe(false);
  });
});
