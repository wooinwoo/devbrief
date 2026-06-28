import { getQueueToken } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiModule } from './ai/gemini.module';
import { CommonModule } from './common/common.module';
import { ConferenceDiscoveryService } from './conferences/conference-discovery.service';
import { DailyDigestService } from './digest/daily-digest.service';
import { EmbeddingService } from './embedding/embedding.service';
import { ArticleExtractService } from './ingestion/article-extract.service';
import { IngestionService } from './ingestion/ingestion.service';
import { RssParserService } from './ingestion/rss-parser.service';
import { PrismaModule } from './prisma/prisma.module';
import { GithubTrendingService } from './repos/github-trending.service';
import { ReposService } from './repos/repos.service';
import { ArticleFetchService } from './summarization/article-fetch.service';
import { SummarizationService } from './summarization/summarization.service';
import { TranslationModule } from './translation/translation.module';
import { YouTubeSyncService } from './videos/youtube-sync.service';

/**
 * CLI 전용 경량 모듈 — GitHub Actions 등에서 Redis/HTTP 없이 수집·분석을 돌린다.
 *
 * Redis 우회 전략:
 * - AppModule 은 BullModule.forRootAsync 로 Redis 에 붙고, 각 *.processor.ts 의
 *   `@Processor` 가 모듈 init 시점에 BullMQ Worker 를 띄워 Redis 에 즉시 접속한다.
 *   → standalone context 로 AppModule 을 부팅하면 Redis 가 없을 때 멈춘다.
 * - 그래서 BullModule / Processor / Controller / Cron 을 전부 제외하고, 수집·분석에
 *   필요한 "서비스 프로바이더"만 직접 등록한다.
 * - IngestionService 가 주입받는 summarization/embedding 큐는 no-op 스텁으로 대체한다.
 *   (`ingest` 는 글만 적재하고, 요약/임베딩 백필은 `reanalyze` 가 서비스 메서드를
 *    직접 호출해 처리한다 → 큐 불필요.)
 */
const noopQueue = {
  // BullMQ Queue.add 시그니처만 흉내내는 no-op. CLI 에서는 큐를 타지 않는다.
  add: async () => undefined,
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GeminiModule,
    TranslationModule,
    CommonModule,
  ],
  providers: [
    // 수집
    IngestionService,
    RssParserService,
    // 원문 본문 추출(extract 커맨드) — Redis 불필요
    ArticleExtractService,
    // 요약 / 임베딩 (reanalyze 가 직접 호출)
    SummarizationService,
    ArticleFetchService,
    EmbeddingService,
    // 영상 / 레포 / 다이제스트 / 컨퍼런스
    YouTubeSyncService,
    ReposService,
    GithubTrendingService,
    DailyDigestService,
    ConferenceDiscoveryService,
    // IngestionService 가 주입받는 큐 → no-op 스텁 (Redis 불필요)
    { provide: getQueueToken('summarization'), useValue: noopQueue },
    { provide: getQueueToken('embedding'), useValue: noopQueue },
  ],
})
export class CliModule {}
