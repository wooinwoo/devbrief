// dotenv 강제 로드 — Prisma Client 가 ConfigModule 초기화 전에 process.env 를 읽는다.
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CliModule } from './cli.module';
import { ConferenceDiscoveryService } from './conferences/conference-discovery.service';
import { DailyDigestService } from './digest/daily-digest.service';
import { EmbeddingService } from './embedding/embedding.service';
import { ArticleExtractService } from './ingestion/article-extract.service';
import { IngestionService } from './ingestion/ingestion.service';
import { PrismaService } from './prisma/prisma.service';
import { ReposService } from './repos/repos.service';
import { SummarizationService } from './summarization/summarization.service';
import { YouTubeSyncService } from './videos/youtube-sync.service';

const logger = new Logger('CLI');

type Flags = { onlyMissing: boolean; limit: number };

function parseFlags(args: string[]): Flags {
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 200;
  return {
    onlyMissing: args.includes('--only-missing'),
    limit: Number.isFinite(limit) && limit > 0 ? limit : 200,
  };
}

interface ReanalyzeRow {
  id: string;
  title: string;
  contentSnippet: string | null;
  needSummary: boolean;
  needEmbedding: boolean;
}

/**
 * 요약/임베딩 백필 — 큐를 거치지 않고 서비스 메서드를 직접 순차 await.
 * onlyMissing=true 면 요약 또는 임베딩이 비어있는 글만, false 면 최신 글 전체 재처리.
 */
async function reanalyze(
  prisma: PrismaService,
  summarization: SummarizationService,
  embedding: EmbeddingService,
  flags: Flags,
): Promise<{ scanned: number; summarized: number; embedded: number }> {
  const where = flags.onlyMissing ? `WHERE "summaryOneLine" IS NULL OR embedding IS NULL` : '';
  const rows = await prisma.$queryRawUnsafe<ReanalyzeRow[]>(
    `SELECT id, title, "contentSnippet",
            ("summaryOneLine" IS NULL) AS "needSummary",
            (embedding IS NULL) AS "needEmbedding"
       FROM "Article"
       ${where}
       ORDER BY "publishedAt" DESC
       LIMIT $1`,
    flags.limit,
  );

  let summarized = 0;
  let embedded = 0;
  for (const row of rows) {
    const snippet = row.contentSnippet ?? '';
    // onlyMissing 이면 비어있는 것만, 아니면 전부 재생성
    if (!flags.onlyMissing || row.needSummary) {
      try {
        await summarization.summarize(row.id, row.title, snippet);
        summarized++;
      } catch (e) {
        logger.error(`[${row.id}] summarize 실패: ${(e as Error).message}`);
      }
    }
    if (!flags.onlyMissing || row.needEmbedding) {
      try {
        await embedding.storeArticleEmbedding(row.id, row.title, snippet);
        embedded++;
      } catch (e) {
        logger.error(`[${row.id}] embedding 실패: ${(e as Error).message}`);
      }
    }
  }
  return { scanned: rows.length, summarized, embedded };
}

interface ExtractRow {
  id: string;
  url: string;
}

/**
 * 원문 본문 추출 백필 — 각 글 url 의 원문을 가져와 정제된 HTML 을 contentHtml 에 저장.
 * onlyMissing=true(기본) 면 contentHtml 이 비어있는 글만. 적당한 동시성으로 처리하고
 * 실패는 건너뛰며 로그. CLI(GitHub Actions)에서만 도는 흐름(서버 차단/부하 회피).
 */
async function extractArticles(
  prisma: PrismaService,
  extractor: ArticleExtractService,
  opts: { onlyMissing: boolean; limit: number; concurrency?: number },
): Promise<{ scanned: number; extracted: number; failed: number }> {
  const where = opts.onlyMissing ? `WHERE "contentHtml" IS NULL` : '';
  const rows = await prisma.$queryRawUnsafe<ExtractRow[]>(
    `SELECT id, url
       FROM "Article"
       ${where}
       ORDER BY "publishedAt" DESC
       LIMIT $1`,
    opts.limit,
  );

  const concurrency = Math.max(1, Math.min(opts.concurrency ?? 4, 8));
  let extracted = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < rows.length) {
      const row = rows[cursor++];
      try {
        const html = await extractor.extract(row.url);
        if (!html) {
          failed++;
          logger.debug(`[${row.id}] 추출 실패(본문 없음/짧음): ${row.url}`);
          continue;
        }
        await prisma.article.update({
          where: { id: row.id },
          data: { contentHtml: html },
        });
        extracted++;
      } catch (e) {
        failed++;
        logger.error(`[${row.id}] 추출 실패: ${(e as Error).message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { scanned: rows.length, extracted, failed };
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? 'all';
  const flags = parseFlags(argv);

  // standalone context — HTTP 리스너 없음. CliModule 은 BullModule/Processor 미포함 → Redis 불필요.
  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: ['error', 'warn', 'log'],
  });

  const prisma = app.get(PrismaService);
  const ingestion = app.get(IngestionService);
  const summarization = app.get(SummarizationService);
  const embedding = app.get(EmbeddingService);
  const youtube = app.get(YouTubeSyncService);
  const repos = app.get(ReposService);
  const digest = app.get(DailyDigestService);
  const conferences = app.get(ConferenceDiscoveryService);
  const extractor = app.get(ArticleExtractService);

  // extract 커맨드의 --limit 기본값은 100 (다른 커맨드는 200).
  const extractLimit = argv.includes('--limit') ? flags.limit : 100;

  const startedAt = Date.now();
  logger.log(`▶ command=${command} onlyMissing=${flags.onlyMissing} limit=${flags.limit}`);

  try {
    switch (command) {
      case 'ingest': {
        const r = await ingestion.ingestAll();
        logger.log(`✔ ingest: sources=${r.sourceCount} new=${r.newArticles}`);
        break;
      }
      case 'reanalyze': {
        const r = await reanalyze(prisma, summarization, embedding, flags);
        logger.log(
          `✔ reanalyze: scanned=${r.scanned} summarized=${r.summarized} embedded=${r.embedded}`,
        );
        break;
      }
      case 'extract': {
        const r = await extractArticles(prisma, extractor, {
          onlyMissing: !argv.includes('--all'),
          limit: extractLimit,
        });
        logger.log(`✔ extract: scanned=${r.scanned} extracted=${r.extracted} failed=${r.failed}`);
        break;
      }
      case 'repos': {
        const r = await repos.refreshAll();
        logger.log(`✔ repos: daily=${r.daily} weekly=${r.weekly}`);
        break;
      }
      case 'videos': {
        if (!process.env.YOUTUBE_API_KEY) {
          logger.warn('YOUTUBE_API_KEY 미설정 → videos skip');
          break;
        }
        const r = await youtube.syncAllConferences();
        logger.log(`✔ videos: synced=${r.synced}`);
        break;
      }
      case 'digest': {
        const r = await digest.generateForToday();
        logger.log(`✔ digest: ${r ? 'generated' : 'skipped(데이터 부족)'}`);
        break;
      }
      case 'conferences': {
        const r = await conferences.discoverFromRecentArticles({ days: 7, limit: 100 });
        logger.log(
          `✔ conferences: scanned=${r.scannedArticles} llm=${r.llmCalls} proposed=${r.proposed} skipped=${r.skipped}`,
        );
        break;
      }
      case 'all': {
        // 합리적 순서: 수집 → (누락분) 요약·임베딩 백필 → 레포 → 영상 → 컨퍼런스 → 다이제스트
        const ing = await ingestion.ingestAll();
        logger.log(`  · ingest: sources=${ing.sourceCount} new=${ing.newArticles}`);

        const re = await reanalyze(prisma, summarization, embedding, {
          onlyMissing: true,
          limit: flags.limit,
        });
        logger.log(`  · reanalyze(missing): summarized=${re.summarized} embedded=${re.embedded}`);

        try {
          const ex = await extractArticles(prisma, extractor, {
            onlyMissing: true,
            limit: extractLimit,
          });
          logger.log(`  · extract(missing): extracted=${ex.extracted} failed=${ex.failed}`);
        } catch (e) {
          logger.error(`  · extract 실패: ${(e as Error).message}`);
        }

        try {
          const rp = await repos.refreshAll();
          logger.log(`  · repos: daily=${rp.daily} weekly=${rp.weekly}`);
        } catch (e) {
          logger.error(`  · repos 실패: ${(e as Error).message}`);
        }

        if (process.env.YOUTUBE_API_KEY) {
          try {
            const v = await youtube.syncAllConferences();
            logger.log(`  · videos: synced=${v.synced}`);
          } catch (e) {
            logger.error(`  · videos 실패: ${(e as Error).message}`);
          }
        } else {
          logger.warn('  · videos skip (YOUTUBE_API_KEY 미설정)');
        }

        try {
          const cf = await conferences.discoverFromRecentArticles({ days: 7, limit: 100 });
          logger.log(`  · conferences: proposed=${cf.proposed} skipped=${cf.skipped}`);
        } catch (e) {
          logger.error(`  · conferences 실패: ${(e as Error).message}`);
        }

        try {
          const dg = await digest.generateForToday();
          logger.log(`  · digest: ${dg ? 'generated' : 'skipped'}`);
        } catch (e) {
          logger.error(`  · digest 실패: ${(e as Error).message}`);
        }
        logger.log('✔ all 완료');
        break;
      }
      default:
        logger.error(
          `알 수 없는 command: ${command}\n사용법: node dist/cli.js <ingest|reanalyze|extract|repos|videos|digest|conferences|all> [--only-missing] [--all] [--limit N]`,
        );
        await app.close();
        process.exit(1);
    }

    logger.log(`⏱ done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
    await app.close();
    process.exit(0);
  } catch (e) {
    logger.error(`실패: ${(e as Error).stack ?? (e as Error).message}`);
    await app.close();
    process.exit(1);
  }
}

main();
