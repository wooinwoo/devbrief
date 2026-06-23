import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { VideoAnalyzeJobData } from './video-analysis.processor';
import { VideoAnalyzerService } from './video-analyzer.service';
import { YouTubeSyncService } from './youtube-sync.service';

@Controller('videos')
export class VideosController {
  constructor(
    private prisma: PrismaService,
    private youtube: YouTubeSyncService,
    private analyzer: VideoAnalyzerService,
    @InjectQueue('video-analyze')
    private analyzeQueue: Queue<VideoAnalyzeJobData>,
  ) {}

  @Get()
  async list(@Query('limit') limitStr?: string) {
    const limit = Math.min(Number(limitStr) || 20, 100);
    return this.prisma.video.findMany({
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: { conference: { select: { name: true, brandColor: true } } },
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: { conference: { select: { name: true, brandColor: true } } },
    });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  /** 어드민 — YouTube URL 붙여넣기로 영상 추가 + 자동 분석 큐. */
  @Post('add')
  async addByUrl(@Body() body: { url?: string }) {
    if (!body.url) throw new BadRequestException('url 필수');
    const video = await this.analyzer.fetchAndStore(body.url);
    await this.analyzeQueue.add('analyze', { videoDbId: video.id });
    return { ...video, queuedForAnalysis: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.video.delete({ where: { id } });
    return { ok: true };
  }

  @Post('sync')
  async sync() {
    const result = await this.youtube.syncAllConferences();
    // sync 직후 모든 미분석 영상에 analyze 잡 enqueue
    const fresh = await this.prisma.video.findMany({
      where: { analyzedAt: null },
      select: { id: true },
      take: 200,
    });
    for (const v of fresh) {
      await this.analyzeQueue.add('analyze', { videoDbId: v.id });
    }
    return { ...result, queuedForAnalysis: fresh.length };
  }

  /** 동기 분석 (DB 즉시 업데이트). force=1 이면 기존 결과 무시하고 재분석. */
  @Post(':id/analyze')
  async analyzeOne(@Param('id') id: string, @Query('force') force?: string) {
    return this.analyzer.analyzeOne(id, { force: force === '1' });
  }

  /** 전체 미분석 영상 일괄 enqueue */
  @Post('analyze-all')
  async analyzeAll(@Query('force') force?: string) {
    const where = force === '1' ? {} : { analyzedAt: null };
    const targets = await this.prisma.video.findMany({
      where,
      select: { id: true },
      take: 500,
    });
    for (const v of targets) {
      await this.analyzeQueue.add('analyze', {
        videoDbId: v.id,
        force: force === '1',
      });
    }
    return { queued: targets.length };
  }
}
