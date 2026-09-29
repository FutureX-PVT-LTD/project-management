import { BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

describe('AuthService temporary password completion', () => {
  async function setup(expiresAt: Date) {
    const currentPassword = 'TemporaryPassword123!';
    const user = {
      id: 'user-1',
      passwordHash: await argon2.hash(currentPassword),
      mustChangePassword: true,
      temporaryPasswordExpires: expiresAt,
    };
    const tx = {
      user: { update: jest.fn().mockResolvedValue(user) },
      session: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    return { service: new AuthService(prisma as never, {} as never), tx, currentPassword };
  }

  it('clears the forced-change state and revokes every session', async () => {
    const { service, tx, currentPassword } = await setup(new Date(Date.now() + 60_000));

    await service.changePassword('user-1', {
      currentPassword,
      newPassword: 'PrivatePassword456!A',
    });

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        passwordHash: expect.any(String),
        mustChangePassword: false,
        temporaryPasswordExpires: null,
        passwordChangedAt: expect.any(Date),
      }),
    });
    expect(tx.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { isRevoked: true },
    });
  });

  it('rejects an expired temporary password', async () => {
    const { service, currentPassword } = await setup(new Date(Date.now() - 60_000));
    await expect(service.changePassword('user-1', {
      currentPassword,
      newPassword: 'PrivatePassword456!A',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
