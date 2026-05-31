import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { GeminiModule } from './ai/gemini.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { SummarizationModule } from './summarization/summarization.module';
import { ArticlesModule } from './articles/articles.module';
import { ConferencesModule } from './conferences/conferences.module';
import { VideosModule } from './videos/videos.module';
import { SourcesModule } from './sources/sources.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { ChatModule } from './chat/chat.module';
import { DigestModule } from './digest/digest.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        if (url) {
          const parsed = new URL(url);
          return {
            connection: {
              host: parsed.hostname,
              port: Number(parsed.port) || 6379,
              username: parsed.username || undefined,
              password: parsed.password || undefined,
              tls: parsed.protocol === 'rediss:' ? {} : undefined,
              maxRetriesPerRequest: null,
            },
          };
        }
        return {
          connection: {
            host: 'localhost',
            port: 6379,
            maxRetriesPerRequest: null,
            lazyConnect: true,
          },
        };
      },
    }),
    PrismaModule,
    GeminiModule,
    IngestionModule,
    SummarizationModule,
    EmbeddingModule,
    ArticlesModule,
    ConferencesModule,
    VideosModule,
    SourcesModule,
    ChatModule,
    DigestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
