import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('articles')
export class ArticlesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('source') source?: string, @Query('limit') limitStr?: string) {
    const limit = Math.min(Number(limitStr) || 30, 100);
    return this.prisma.article.findMany({
      where: source ? { source: { provider: source } } : undefined,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: { source: { select: { name: true, provider: true } } },
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.prisma.article.findUnique({
      where: { id },
      include: { source: true },
    });
  }
}
