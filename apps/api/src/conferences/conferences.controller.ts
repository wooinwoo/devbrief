import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('conferences')
export class ConferencesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('upcoming') upcoming?: string) {
    const where = upcoming === '1' ? { startDate: { gte: new Date() } } : {};
    return this.prisma.conference.findMany({
      where,
      orderBy: { startDate: 'asc' },
      take: 50,
    });
  }
}
