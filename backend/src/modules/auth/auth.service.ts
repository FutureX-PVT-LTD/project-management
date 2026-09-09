import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/login.dto';
import { UserRole, AuditAction } from '@futurex/shared';
import { getJwtAccessSecret, getJwtRefreshSecret } from './auth-secrets';
import { ACCESS_SECONDS, IDLE_MS, SESSION_MS, REMEMBER_MS, tokenHash } from './session-policy';

@Injectable()
export class AuthService {
  private readonly dummyHash = argon2.hash(crypto.randomBytes(32));
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase().trim() },
    });

    if (!user) {
      await argon2.verify(await this.dummyHash, loginDto.password);
      await this.recordAudit(
        null,
        AuditAction.USER_LOGIN_FAILED,
        'User',
        loginDto.email,
        ipAddress,
        userAgent,
        { reason: 'User not found', email: loginDto.email },
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive || user.deletedAt) {
      await argon2.verify(user.passwordHash, loginDto.password);
      await this.recordAudit(
        user.id,
        AuditAction.USER_LOGIN_FAILED,
        'User',
        user.id,
        ipAddress,
        userAgent,
        { reason: 'Account disabled' },
      );
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, loginDto.password);
    if (!isPasswordValid) {
      await this.recordAudit(
        user.id,
        AuditAction.USER_LOGIN_FAILED,
        'User',
        user.id,
        ipAddress,
        userAgent,
        { reason: 'Invalid password' },
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    // Determine expiration based on rememberMe
    const isRememberMe = Boolean(loginDto.rememberMe);
    const lifetime = isRememberMe ? REMEMBER_MS : SESSION_MS;
    const refreshDays = lifetime / 86400000;
    const refreshExpiresIn = lifetime / 1000;
    const accessExpiresIn = ACCESS_SECONDS;
    const sessionId = crypto.randomUUID();
    const jwtSecret = getJwtAccessSecret();
    const jwtRefreshSecret = getJwtRefreshSecret();

    // Generate tokens
    const payload = {
      sub: user.id,
      sid: sessionId,
      email: user.email,
      role: user.globalRole,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtRefreshSecret,
      expiresIn: refreshExpiresIn,
      jwtid: crypto.randomUUID(),
    });

    // Save hashed refresh token session
    const refreshTokenHash = tokenHash(refreshToken);
    const expiresAt = new Date(Date.now() + lifetime);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        expiresAt,
      },
    });

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Record login audit
    await this.recordAudit(
      user.id,
      AuditAction.USER_LOGIN,
      'User',
      user.id,
      ipAddress,
      userAgent,
      { rememberMe: isRememberMe },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        jobTitle: user.jobTitle,
        avatarUrl: user.avatarUrl,
        globalRole: user.globalRole as UserRole,
        isActive: user.isActive,
      },
      accessToken,
      refreshToken,
      rememberMe: isRememberMe,
      refreshExpiresInDays: refreshDays,
    };
  }

  async refreshToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('No refresh token provided');
    }

    const jwtSecret = getJwtAccessSecret();
    const jwtRefreshSecret = getJwtRefreshSecret();
    const accessExpiresIn = ACCESS_SECONDS;

    try {
      const payload = this.jwtService.verify(token, {
        secret: jwtRefreshSecret,
        algorithms: ['HS256'],
      });
      if (typeof payload.sid !== 'string' || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Invalid refresh session');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedException('Invalid refresh session');
      }

      const idleCutoff = new Date(Date.now() - IDLE_MS);
      const sessions = await this.prisma.session.findMany({
        where: {
          userId: user.id,
          id: payload.sid,
          expiresAt: { gt: new Date() },
          isRevoked: false,
          lastSeenAt: { gt: idleCutoff },
        },
        orderBy: { createdAt: 'desc' },
      });

      let validSession = null;
      for (const session of sessions) {
        const matches = session.refreshTokenHash === tokenHash(token);
        if (matches) {
          validSession = session;
          break;
        }
      }

      if (!validSession) {
        await this.prisma.session.updateMany({
          where: { id: payload.sid, userId: user.id }, data: { isRevoked: true },
        });
        throw new UnauthorizedException('Session expired or revoked');
      }

      // Rotation preserves the original absolute lifetime.
      const secondsRemaining = Math.floor((validSession.expiresAt.getTime() - Date.now()) / 1000);
      if (secondsRemaining <= 0) throw new UnauthorizedException('Session expired');
      const daysRemaining = secondsRemaining / 86400;
      const newRefreshExpiresIn = secondsRemaining;

      // Create new tokens
      const newPayload = {
        sub: user.id,
        sid: validSession.id,
        email: user.email,
        role: user.globalRole,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        secret: jwtSecret,
        expiresIn: accessExpiresIn,
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: jwtRefreshSecret,
        expiresIn: newRefreshExpiresIn,
        jwtid: crypto.randomUUID(),
      });

      const rotated = await this.prisma.session.updateMany({
        where: {
          id: validSession.id, isRevoked: false,
          refreshTokenHash: validSession.refreshTokenHash,
          expiresAt: { gt: new Date() },
        },
        data: { refreshTokenHash: tokenHash(newRefreshToken), lastSeenAt: new Date() },
      });
      if (rotated.count !== 1) throw new UnauthorizedException('Refresh already used');

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          avatarUrl: user.avatarUrl,
          globalRole: user.globalRole as UserRole,
          isActive: user.isActive,
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        refreshExpiresInDays: daysRemaining,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    // Revoke active sessions for user
    await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    return { success: true, message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: {
        passwordHash: newHash, resetPasswordToken: null, resetPasswordExpires: null,
      } });
      await tx.session.updateMany({ where: { userId }, data: { isRevoked: true } });
    });

    await this.recordAudit(userId, AuditAction.PASSWORD_RESET, 'User', userId);

    return { success: true, message: 'Password updated successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (user && user.isActive) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 1); // 1 hour expiration

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetTokenHash,
          resetPasswordExpires: expires,
        },
      });

      await this.recordAudit(
        user.id,
        AuditAction.PASSWORD_RESET,
        'User',
        user.id,
        ipAddress,
        userAgent,
        { action: 'FORGOT_PASSWORD_REQUESTED', email: user.email },
      );

      this.logger.log('Password reset requested');
    }

    return {
      success: true,
      message:
        'If an active account exists with that work email, password reset instructions have been generated.',
    };
  }

  async resetPasswordWithToken(dto: ResetPasswordDto, ipAddress?: string, userAgent?: string) {
    const resetTokenHash = crypto.createHash('sha256').update(dto.token.trim()).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: { gt: new Date() },
        isActive: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Password reset link is invalid or has expired. Please request a new link.',
      );
    }

    const newHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
    const consumed = await tx.user.updateMany({
      where: { id: user.id, resetPasswordToken: resetTokenHash, resetPasswordExpires: { gt: new Date() }, isActive: true, deletedAt: null },
      data: {
        passwordHash: newHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    if (consumed.count !== 1) throw new BadRequestException('Reset link invalid or expired');
    // Revoke all existing sessions
    await tx.session.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });
    });

    await this.recordAudit(
      user.id,
      AuditAction.PASSWORD_RESET,
      'User',
      user.id,
      ipAddress,
      userAgent,
      { action: 'PASSWORD_RESET_TOKEN_COMPLETED' },
    );

    return {
      success: true,
      message: 'Your password has been successfully reset. You may now sign in with your new password.',
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMemberships: {
          include: { team: true },
        },
        projectMemberships: {
          include: {
            project: {
              select: { id: true, key: true, name: true, status: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: user.jobTitle,
      avatarUrl: user.avatarUrl,
      globalRole: user.globalRole as UserRole,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      teams: user.teamMemberships.map((tm) => ({
        id: tm.team.id,
        name: tm.team.name,
      })),
      projects: user.projectMemberships.map((pm) => ({
        id: pm.project.id,
        key: pm.project.key,
        name: pm.project.name,
        role: pm.role,
      })),
    };
  }

  private async recordAudit(
    actorId: string | null,
    action: AuditAction,
    entityType: string,
    entityId?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
    details?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          entityType,
          entityId: entityId || undefined,
          ipAddress: ipAddress || undefined,
          userAgent: userAgent || undefined,
          detailsJson: details ? JSON.stringify(details) : undefined,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to record audit log: ${e}`);
    }
  }
}
