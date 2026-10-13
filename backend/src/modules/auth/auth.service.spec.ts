import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

const HOUR = 3_600_000;

function setup(session: { remember: boolean; lastUsedAt: Date }) {
  const update = jest.fn();
  const prisma = {
    session: {
      findUnique: jest.fn().mockResolvedValue({
        id: 's1',
        expiresAt: new Date(Date.now() + HOUR),
        user: { id: 'u1', email: 'a@b.c', name: 'A', status: 'ACTIVE' },
        ...session,
      }),
      update,
    },
  } as unknown as PrismaService;
  return { service: new AuthService(prisma, {} as ConfigService), update };
}

describe('AuthService.authenticate', () => {
  it('renews a remembered session that was last used over an hour ago', async () => {
    const { service, update } = setup({
      remember: true,
      lastUsedAt: new Date(Date.now() - 2 * HOUR),
    });
    const result = await service.authenticate('token');
    expect(result?.cookie?.remember).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('re-issues the cookie without a database write for a recently used session', async () => {
    const { service, update } = setup({
      remember: true,
      lastUsedAt: new Date(),
    });
    expect((await service.authenticate('token'))?.cookie?.remember).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it('never renews an unticked session (hard 24 h cap)', async () => {
    const { service, update } = setup({
      remember: false,
      lastUsedAt: new Date(Date.now() - 5 * HOUR),
    });
    expect((await service.authenticate('token'))?.cookie).toBeUndefined();
    expect(update).not.toHaveBeenCalled();
  });
});
