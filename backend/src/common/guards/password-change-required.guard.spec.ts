import { ForbiddenException } from '@nestjs/common';
import { PasswordChangeRequiredGuard } from './password-change-required.guard';

describe('PasswordChangeRequiredGuard', () => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
  const guard = new PasswordChangeRequiredGuard(reflector as never);

  function context(path: string, mustChangePassword: boolean) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ path, user: { mustChangePassword } }) }),
    } as never;
  }

  it('blocks workspace APIs until the temporary password is replaced', () => {
    expect(() => guard.canActivate(context('/api/v1/tasks', true))).toThrow(ForbiddenException);
  });

  it.each(['/api/v1/auth/me', '/api/v1/auth/change-password', '/api/v1/auth/logout'])('allows %s during setup', (path) => {
    expect(guard.canActivate(context(path, true))).toBe(true);
  });

  it('allows normal accounts', () => {
    expect(guard.canActivate(context('/api/v1/tasks', false))).toBe(true);
  });
});
