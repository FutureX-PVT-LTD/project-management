import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@futurex/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Owner has global superuser access
    if (user.globalRole === UserRole.OWNER) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.globalRole);
    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Requires one of roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
