import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload, UserRole } from '@futurex/shared';
import { getJwtAccessSecret } from '../auth-secrets';
import { IDLE_MS } from '../session-policy';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['access_token'];
          }
          if (!token && req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
              token = parts[1];
            }
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: getJwtAccessSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sid || typeof payload.sid !== 'string' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Session invalid');
    }
    const now = new Date();
    const session = await this.prisma.session.updateMany({
      where: {
        id: payload.sid, userId: payload.sub, isRevoked: false,
        expiresAt: { gt: now }, lastSeenAt: { gt: new Date(now.getTime() - IDLE_MS) },
      },
      data: { lastSeenAt: now },
    });
    if (session.count !== 1) throw new UnauthorizedException('Session expired or revoked');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        avatarUrl: true,
        globalRole: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or session invalid');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return {
      ...user,
      globalRole: user.globalRole as UserRole,
    };
  }
}
