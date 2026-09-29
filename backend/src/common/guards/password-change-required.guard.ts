import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PasswordChangeRequiredGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    if (!request?.user?.mustChangePassword) return true;

    const path = String(request.path || request.originalUrl || '');
    const allowed = ['/auth/me', '/auth/change-password', '/auth/logout'];
    if (allowed.some((suffix) => path.endsWith(suffix))) return true;

    throw new ForbiddenException({
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Change your temporary password before continuing.',
    });
  }
}
