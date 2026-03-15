import express from 'express';
import request from 'supertest';

const mockQuery = jest.fn();
const mockGetFile = jest.fn();
const mockAuthenticate = jest.fn((req, _res, next) => {
  (req as any).user = {
    userId: 'user-001',
    email: 'user@example.com',
    role: 'ADMIN',
    baseRole: 'ADMIN',
    effectiveRole: 'ADMIN',
  };
  next();
});

jest.mock('../../services/InventoryService', () => ({
  inventoryService: {},
}));

jest.mock('../../db/client', () => ({
  getDefaultPool: () => ({
    query: mockQuery,
  }),
}));

jest.mock('../../services/NetSuiteClient', () => ({
  NetSuiteClient: jest.fn().mockImplementation(() => ({
    getFile: mockGetFile,
  })),
}));

jest.mock('../../middleware', () => {
  const actual = jest.requireActual('../../middleware');
  return {
    ...actual,
    authenticate: mockAuthenticate,
    authorize: jest.fn(() => (_req: any, _res: any, next: any) => next()),
    asyncHandler: (fn: any) => (req: any, res: any, next: any) =>
      Promise.resolve(fn(req, res, next)).catch(next),
  };
});

import skusRouter from '../skus';

describe('SKU public image route', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use('/api/skus', skusRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({
      rows: [
        {
          configuration: {
            accountId: '7438866',
            tokenId: 'token-id',
            tokenSecret: 'token-secret',
            consumerKey: 'consumer-key',
            consumerSecret: 'consumer-secret',
          },
        },
      ],
    });
    mockGetFile.mockResolvedValue({
      id: '440200',
      contentType: 'image/png',
      data: Buffer.from('png-bytes').toString('base64'),
    });
  });

  it('serves image bytes without requiring API auth', async () => {
    const response = await request(app)
      .get('/api/skus/netsuite-image/440200?org=ORG320EDF1')
      .expect(200);

    expect(response.header['cross-origin-resource-policy']).toBe('cross-origin');
    expect(response.header['content-type']).toMatch(/image\/png/);
    expect(mockAuthenticate).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM integrations i'), [
      'ORG320EDF1',
    ]);
    expect(mockGetFile).toHaveBeenCalledWith('440200');
  });
});
