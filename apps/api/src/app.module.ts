import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { GeminiModule } from './ai/gemini.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticlesModule } from './articles/articles.module';
import { ChatModule } from './chat/chat.module';
import { ConferencesModule } from './conferences/conferences.module';
import { DigestModule } from './digest/digest.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReposModule } from './repos/repos.module';
import { SourcesModule } from './sources/sources.module';
import { StatsModule } from './stats/stats.module';
import { SummarizationModule } from './summarization/summarization.module';
import { VideosModule } from './videos/videos.module';
import { bullRootImports } from './common/bullmq.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // REDIS_URL 있을 때만 BullMQ 연결. 없으면 빈 배열 → 워커 미로드(Redis 무한 재시도 방지).
    ...bullRootImports(),
    PrismaModule,
    GeminiModule,
    IngestionModule,
    SummarizationModule,
    EmbeddingModule,
    ArticlesModule,
    ConferencesModule,
    VideosModule,
    ReposModule,
    SourcesModule,
    StatsModule,
    ChatModule,
    DigestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
