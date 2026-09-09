import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.prisma.session.findFirst({ select: { id: true, lastSeenAt: true } });
    } catch (e) {
      throw new ServiceUnavailableException('Service temporarily unavailable');
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'futurex-portal-api',
      version: '1.0.0',
      database: 'healthy',
      uptime: process.uptime(),
    };
  }
}
