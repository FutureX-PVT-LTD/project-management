import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '@futurex/shared';
import { getAuthCookieOptions, getAuthCookieNames } from '../../common/security/http-security';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    // Set secure HTTP-only cookies
    const cookieOptions = getAuthCookieOptions();
    const cookieNames = getAuthCookieNames();

    res.cookie(cookieNames.accessToken, result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    const refreshDays = result.refreshExpiresInDays || (result.rememberMe ? 30 : 7);
    res.cookie(cookieNames.refreshToken, result.refreshToken, {
      ...cookieOptions,
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
    });

    return {
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ) {
    const cookieNames = getAuthCookieNames();
    const token = req.cookies?.[cookieNames.refreshToken] || bodyToken;
    const result = await this.authService.refreshToken(token);

    const cookieOptions = getAuthCookieOptions();

    res.cookie(cookieNames.accessToken, result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    const refreshDays = result.refreshExpiresInDays || 7;
    res.cookie(cookieNames.refreshToken, result.refreshToken, {
      ...cookieOptions,
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
    });

    return {
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);

    const clearOptions = getAuthCookieOptions();
    const cookieNames = getAuthCookieNames();

    res.clearCookie(cookieNames.accessToken, clearOptions);
    res.clearCookie(cookieNames.refreshToken, clearOptions);

    return { success: true, message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.forgotPassword(dto, ipAddress, userAgent);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.resetPasswordWithToken(dto, ipAddress, userAgent);
  }
}
