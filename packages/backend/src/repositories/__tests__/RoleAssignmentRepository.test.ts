import { UserRole } from '@opsui/shared';
import { getPool } from '../../db/client';
import { RoleAssignmentRepository } from '../RoleAssignmentRepository';

jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

describe('RoleAssignmentRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the active pool at call time instead of the startup pool', async () => {
    const startupPool = {
      query: jest.fn(),
    };
    const tenantPool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [
            {
              assignmentId: 'URA-20260315-0001',
              userId: 'user-001',
              role: UserRole.PICKER,
              grantedBy: 'admin-123',
              grantedAt: '2026-03-15T00:00:00.000Z',
              active: true,
            },
          ],
          rowCount: 1,
        }),
    };

    const getPoolMock = getPool as jest.MockedFunction<typeof getPool>;
    getPoolMock.mockReturnValue(startupPool as any);

    const repository = new RoleAssignmentRepository();

    getPoolMock.mockReturnValue(tenantPool as any);

    const result = await repository.grantRole(
      { userId: 'user-001', role: UserRole.PICKER },
      'admin-123'
    );

    expect(startupPool.query).not.toHaveBeenCalled();
    expect(tenantPool.query).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      userId: 'user-001',
      role: UserRole.PICKER,
      grantedBy: 'admin-123',
      active: true,
    });
  });
});
