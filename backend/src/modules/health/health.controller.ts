import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let dbStatus = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'unreachable';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'futurex-portal-api',
      version: '1.0.0',
      database: dbStatus,
      uptime: process.uptime(),
    };
  }
}
