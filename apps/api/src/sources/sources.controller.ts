import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RssDiscoveryService } from './rss-discovery.service';

@Controller('sources')
export class SourcesController {
  constructor(
    private prisma: PrismaService,
    private discovery: RssDiscoveryService,
  ) {}

  @Get()
  async list() {
    return this.prisma.source.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  /** URL 입력 → 피드 자동 발견 (저장 X, 미리보기) */
  @Post('discover')
  async discover(@Body() body: { url?: string }) {
    if (!body.url) throw new BadRequestException('url 필수');
    return { feeds: await this.discovery.discover(body.url) };
  }

  /** URL 입력 → 발견된 피드 모두 자동 등록 */
  @Post('discover-and-register')
  async register(@Body() body: { url?: string }) {
    if (!body.url) throw new BadRequestException('url 필수');
    return this.discovery.discoverAndRegister(body.url);
  }

  @Patch(':id/toggle')
  async toggle(@Param('id') id: string) {
    const src = await this.prisma.source.findUnique({ where: { id } });
    if (!src) throw new BadRequestException('Source not found');
    return this.prisma.source.update({
      where: { id },
      data: { active: !src.active },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.source.delete({ where: { id } });
    return { ok: true };
  }
}
