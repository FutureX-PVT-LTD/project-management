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

@Injectable()
export class AuthService {
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

    if (!user.isActive) {
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
        'Your account has been deactivated. Please contact an administrator.',
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
    const refreshDays = isRememberMe ? 30 : 7;
    const refreshExpiresIn = isRememberMe ? '30d' : (process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRATION || '7d');
    const accessExpiresIn = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRATION || '15m';
    const jwtSecret = process.env.JWT_SECRET || 'futurex_super_secure_jwt_access_secret_key_2026_!@#';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'futurex_super_secure_jwt_refresh_secret_key_2026_!@#';

    // Generate tokens
    const payload = {
      sub: user.id,
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
    });

    // Save hashed refresh token session
    const refreshTokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.prisma.session.create({
      data: {
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

    const jwtSecret = process.env.JWT_SECRET || 'futurex_super_secure_jwt_access_secret_key_2026_!@#';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'futurex_super_secure_jwt_refresh_secret_key_2026_!@#';
    const accessExpiresIn = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRATION || '15m';

    try {
      const payload = this.jwtService.verify(token, {
        secret: jwtRefreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh session');
      }

      // Check active sessions (and recently rotated sessions within 15-second grace window)
      const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
      const sessions = await this.prisma.session.findMany({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          OR: [
            { isRevoked: false },
            { createdAt: { gte: fifteenSecondsAgo } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      let validSession = null;
      for (const session of sessions) {
        const matches = await argon2.verify(session.refreshTokenHash, token);
        if (matches) {
          validSession = session;
          break;
        }
      }

      if (!validSession) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      // If this session is not already revoked, revoke it now (Token Rotation)
      if (!validSession.isRevoked) {
        await this.prisma.session.update({
          where: { id: validSession.id },
          data: { isRevoked: true },
        });
      }

      // Calculate remaining session lifetime or default to 7 days
      const daysRemaining = Math.max(
        1,
        Math.ceil((validSession.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      );
      const newRefreshExpiresIn = `${daysRemaining}d`;

      // Create new tokens
      const newPayload = {
        sub: user.id,
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
      });

      const newHash = await argon2.hash(newRefreshToken);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + daysRemaining);

      await this.prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: newHash,
          expiresAt,
        },
      });

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
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke old sessions
    await this.prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
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

      this.logger.log(`Password reset token generated for ${user.email}`);
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Revoke all existing sessions
    await this.prisma.session.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
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
