// dotenv 강제 로드 — Prisma Client 가 ConfigModule 초기화 전에 process.env 를 읽는다.
import 'dotenv/config';
import { type LogLevel, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CliModule } from './cli.module';
import { ConferenceDiscoveryService } from './conferences/conference-discovery.service';
import { ConferenceImageSyncService } from './conferences/conference-image-sync.service';
import { DailyDigestService } from './digest/daily-digest.service';
import { EmbeddingService } from './embedding/embedding.service';
import { ArticleExtractService } from './ingestion/article-extract.service';
import { IngestionService } from './ingestion/ingestion.service';
import { PrismaService } from './prisma/prisma.service';
import { ReposService } from './repos/repos.service';
import { SummarizationService } from './summarization/summarization.service';
import { YouTubeSyncService } from './videos/youtube-sync.service';

const logger = new Logger('CLI');

export type Flags = { onlyMissing: boolean; limit: number };

export function parseFlags(args: string[]): Flags {
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 200;
  return {
    onlyMissing: args.includes('--only-missing'),
    limit: Number.isFinite(limit) && limit > 0 ? limit : 200,
  };
}

/**
 * CLI 로그 레벨 — LOG_LEVEL env 로 제어하고, GitHub Actions(CI)에서는 기본 debug.
 * 배치 실패의 원인 로그(원문 fetch/NER/임베딩 skip 등) 다수가 debug 레벨이라,
 * 운영 배치에서 debug 가 꺼져 있으면 `proposed=0` 같은 결과의 원인 추적이 불가능하다.
 */
export function resolveLogLevels(env: NodeJS.ProcessEnv = process.env): LogLevel[] {
  const order: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
  const fallback: LogLevel = env.GITHUB_ACTIONS || env.CI ? 'debug' : 'log';
  const wanted = (env.LOG_LEVEL ?? fallback).toLowerCase() as LogLevel;
  const idx = order.indexOf(wanted);
  return order.slice(0, (idx >= 0 ? idx : order.indexOf(fallback)) + 1);
}

/**
 * 커맨드별 필수 env — 무료 폴백만으로 도는 커맨드는 GEMINI_API_KEY 없이도 허용한다.
 * (GitHub Actions 는 미정의 secret 을 빈 문자열로 주입하므로 공백 값도 미설정으로 취급.)
 */
const REQUIRED_ENVS: Record<string, readonly string[]> = {
  ingest: ['DATABASE_URL'],
  extract: ['DATABASE_URL'],
  repos: ['DATABASE_URL'],
  videos: ['DATABASE_URL'], // YOUTUBE_API_KEY 부재는 기존대로 warn + skip
  digest: ['DATABASE_URL'], // Gemini 없으면 휴리스틱 폴백 → 키 비필수
  reanalyze: ['DATABASE_URL', 'GEMINI_API_KEY'], // 임베딩은 무료 대안 없음
  'conference-images': ['DATABASE_URL'],
  conferences: ['DATABASE_URL'], // 공개 행사 피드는 Gemini 없이도 수집
  all: ['DATABASE_URL', 'GEMINI_API_KEY'],
  collect: ['DATABASE_URL'],
  'repair-summaries': ['DATABASE_URL'],
};

/** 커맨드 실행에 필요한 env 중 비어 있는 키 목록. */
export function missingRequiredEnvs(
  command: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const required = REQUIRED_ENVS[command] ?? ['DATABASE_URL'];
  return required.filter((key) => !env[key]?.trim());
}

/** GitHub Actions run 페이지에 annotation 을 남긴다 (Actions 밖에서는 no-op). */
function annotate(kind: 'error' | 'warning', title: string, message: string): void {
  if (!process.env.GITHUB_ACTIONS) return;
  // 워크플로 커맨드는 로거 프리픽스 없이 stdout 에 raw 로 찍혀야 인식된다.
  console.log(`::${kind} title=${title}::${message.replace(/\r?\n/g, ' ')}`);
}

interface ReanalyzeRow {
  id: string;
  title: string;
  contentSnippet: string | null;
  needSummary: boolean;
  needEmbedding: boolean;
}

export interface ReanalyzeResult {
  scanned: number;
  summarized: number;
  summaryFailed: number;
  /** 실제로 DB 에 벡터가 저장된 건수 (silent-skip 은 제외) */
  embedded: number;
  /** storeArticleEmbedding 이 조용히 skip 한 건수 (키 미설정/만료/형식 오류) */
  embedSkipped: number;
  embedFailed: number;
}

function formatReanalyze(r: ReanalyzeResult): string {
  return (
    `scanned=${r.scanned} summarized=${r.summarized} embedded=${r.embedded} ` +
    `summaryFailed=${r.summaryFailed} embedFailed=${r.embedFailed} embedSkipped=${r.embedSkipped}`
  );
}

/**
 * 전멸 판정 — 스캔은 했는데 성공(요약/임베딩 저장)이 0이고 실패·스킵만 남았다면
 * 키 만료/한도 초과 같은 구성 장애로 보고 배치 실패로 취급한다.
 * (백로그가 비어 scanned=0 인 정상 상태와 로그·종료코드 양쪽에서 구분된다.)
 */
export function isReanalyzeWipeout(r: ReanalyzeResult): boolean {
  const attempted = r.summarized + r.summaryFailed + r.embedded + r.embedFailed + r.embedSkipped;
  return r.scanned > 0 && attempted > 0 && r.summarized + r.embedded === 0;
}

/**
 * 요약/임베딩 백필 — 큐를 거치지 않고 서비스 메서드를 직접 순차 await.
 * onlyMissing=true 면 요약 또는 임베딩이 비어있는 글만, false 면 최신 글 전체 재처리.
 *
 * 카운트는 성공/실패/스킵을 분리 집계한다. storeArticleEmbedding 은 Gemini
 * 미설정/호출 실패 시 throw 없이 조용히 return 하므로(무료 대안 없음), 호출 성공을
 * 그대로 embedded 로 세면 과대 보고가 된다 — NULL 이던 행이 실제로 채워졌는지
 * DB 를 다시 확인해 silent-skip 을 embedSkipped 로 분리한다.
 */
export async function reanalyze(
  prisma: PrismaService,
  summarization: SummarizationService,
  embedding: EmbeddingService,
  flags: Flags,
): Promise<ReanalyzeResult> {
  // summarySource='free' — Gemini 장애로 무료 추출요약이 채워진 글도 키 복구 후 승격 대상
  const where = flags.onlyMissing
    ? `WHERE "summaryOneLine" IS NULL OR "summarySource" = 'free' OR embedding IS NULL`
    : '';
  const rows = await prisma.$queryRawUnsafe<ReanalyzeRow[]>(
    `SELECT id, title, "contentSnippet",
            ("summaryOneLine" IS NULL OR "summarySource" = 'free') AS "needSummary",
            (embedding IS NULL) AS "needEmbedding"
       FROM "Article"
       ${where}
       ORDER BY "publishedAt" DESC
       LIMIT $1`,
    flags.limit,
  );

  let summarized = 0;
  let summaryFailed = 0;
  let embedFailed = 0;
  // 사후 검증 대상: 호출 전 embedding 이 NULL 이던 행 (여전히 NULL 이면 silent-skip)
  const embedTriedNullIds: string[] = [];
  // 전체 재처리에서 기존 값이 있던 행은 저장 여부를 구분할 수 없어 시도 성공으로 간주
  let embedTriedNonNull = 0;
  for (const row of rows) {
    const snippet = row.contentSnippet ?? '';
    // onlyMissing 이면 비어있는 것만, 아니면 전부 재생성
    if (!flags.onlyMissing || row.needSummary) {
      try {
        await summarization.summarize(row.id, row.title, snippet);
        summarized++;
      } catch (e) {
        summaryFailed++;
        logger.error(`[${row.id}] summarize 실패: ${(e as Error).message}`);
      }
    }
    if (!flags.onlyMissing || row.needEmbedding) {
      try {
        await embedding.storeArticleEmbedding(row.id, row.title, snippet);
        if (row.needEmbedding) embedTriedNullIds.push(row.id);
        else embedTriedNonNull++;
      } catch (e) {
        embedFailed++;
        logger.error(`[${row.id}] embedding 실패: ${(e as Error).message}`);
      }
    }
  }

  let embedded = embedTriedNonNull;
  let embedSkipped = 0;
  if (embedTriedNullIds.length > 0) {
    const [{ stored }] = await prisma.$queryRawUnsafe<[{ stored: number }]>(
      `SELECT count(*)::int AS stored FROM "Article" WHERE id = ANY($1) AND embedding IS NOT NULL`,
      embedTriedNullIds,
    );
    embedded += Number(stored);
    embedSkipped = embedTriedNullIds.length - Number(stored);
  }
  if (embedSkipped > 0 && embedded === 0) {
    logger.warn(
      `embedding ${embedSkipped}건 전량 skip — GEMINI_API_KEY 설정/만료/한도 여부를 확인하세요`,
    );
  }
  return {
    scanned: rows.length,
    summarized,
    summaryFailed,
    embedded,
    embedSkipped,
    embedFailed,
  };
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

export interface CliServices {
  prisma: PrismaService;
  ingestion: IngestionService;
  summarization: SummarizationService;
  embedding: EmbeddingService;
  youtube: YouTubeSyncService;
  repos: ReposService;
  digest: DailyDigestService;
  conferences: ConferenceDiscoveryService;
  conferenceImages: ConferenceImageSyncService;
  extractor: ArticleExtractService;
}

/**
 * 'all' — 서브스텝 실패를 삼키지 않고 수집한다. 실패해도 나머지 스텝은 계속 진행해
 * 부분 성공을 유지하고, 호출부가 실패 목록을 보고 exit code 를 결정한다.
 * (이전엔 실패가 logger.error 한 줄로 삼켜져 스케줄 실행이 영구 초록색이었다.)
 */
export async function runAll(
  s: CliServices,
  flags: Flags,
  extractLimit: number,
  mode: 'all' | 'collect' = 'all',
): Promise<string[]> {
  const failures: string[] = [];
  const runStep = async (name: string, fn: () => Promise<void>): Promise<void> => {
    try {
      await fn();
    } catch (e) {
      failures.push(name);
      logger.error(`  · ${name} 실패: ${(e as Error).message}`);
      annotate('error', `ingest ${name} 실패`, (e as Error).message);
    }
  };

  // 합리적 순서: 수집 → (누락분) 요약·임베딩 백필 → 본문 추출 → 레포 → 영상 → 컨퍼런스 → 다이제스트
  await runStep('ingest', async () => {
    const r = await s.ingestion.ingestAll();
    logger.log(
      `  · ingest: sources=${r.sourceCount} new=${r.newArticles} failed=${r.failedSources ?? 0}`,
    );
    if (r.failedSources > 0) throw new Error(`RSS source failures: ${r.failedSources}`);
  });

  if (mode === 'collect') {
    logger.log(
      '  · collect: public metadata and extractive summaries; AI embeddings are not generated',
    );
    await runStep('repair-summaries', async () => {
      const r = await repairSummaries(s.prisma, s.summarization, flags.limit);
      logger.log(
        `  · repair-summaries: scanned=${r.scanned} repaired=${r.repaired} failed=${r.failed}`,
      );
      if (r.failed > 0) throw new Error(`Summary repair failures: ${r.failed}`);
    });
  } else
    await runStep('reanalyze', async () => {
      const r = await reanalyze(s.prisma, s.summarization, s.embedding, {
        onlyMissing: true,
        limit: flags.limit,
      });
      logger.log(`  · reanalyze(missing): ${formatReanalyze(r)}`);
      if (isReanalyzeWipeout(r)) {
        throw new Error(`전멸 — ${formatReanalyze(r)} (GEMINI_API_KEY 상태 확인)`);
      }
    });

  await runStep('extract', async () => {
    const r = await extractArticles(s.prisma, s.extractor, {
      onlyMissing: true,
      limit: extractLimit,
    });
    logger.log(`  · extract(missing): extracted=${r.extracted} failed=${r.failed}`);
  });

  await runStep('repos', async () => {
    const r = await s.repos.refreshAll();
    logger.log(`  · repos: daily=${r.daily} weekly=${r.weekly}`);
    if (r.daily === 0 || r.weekly === 0)
      throw new Error('Trending refresh returned no records; previous data retained');
  });

  await runStep('videos', async () => {
    const r = await s.youtube.syncAllConferences();
    logger.log(`  · videos: synced=${r.synced} failed=${r.failed ?? 0}`);
    if (r.failed > 0) throw new Error(`Video feed failures: ${r.failed}`);
  });

  await runStep('conferences', async () => {
    const r = await s.conferences.discover({
      days: 7,
      limit: 100,
    });
    logger.log(`  · conferences: proposed=${r.proposed} skipped=${r.skipped}`);
    if (r.failedSources > 0 || r.failed > 0)
      throw new Error(`행사 수집 일부 실패: sources=${r.failedSources} writes=${r.failed}`);
  });

  await runStep('conference-images', async () => {
    const r = await s.conferenceImages.syncAll({ limit: 1000, concurrency: 6, imagesOnly: true });
    logger.log(`  · conference-images: ${JSON.stringify(r)}`);
    if (r.writeFailed > 0) throw new Error(`Event image write failures: ${r.writeFailed}`);
  });

  await runStep('digest', async () => {
    const r = await s.digest.generateForToday();
    // null 은 데이터 부족 skip — 실패로 세지 않는다
    logger.log(`  · digest: ${r ? 'generated' : 'skipped(데이터 부족)'}`);
  });

  return failures;
}

export async function repairSummaries(
  prisma: PrismaService,
  summarization: SummarizationService,
  limit: number,
) {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; title: string; contentSnippet: string | null }>
  >(
    `SELECT id, title, "contentSnippet" FROM "Article"
     WHERE "summaryOneLine" IS NULL OR concat("titleKo", "summaryOneLine", "summaryThreeLine")
       ~* 'QUERY LENGTH LIMIT EXCEEDED|MYMEMORY WARNING|USED ALL AVAILABLE FREE TRANSLATIONS'
     ORDER BY ("summaryOneLine" IS NOT NULL) DESC, "publishedAt" DESC LIMIT $1`,
    limit,
  );
  let repaired = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await summarization.summarizeFree(row.id, row.title, row.contentSnippet ?? '');
      repaired++;
    } catch {
      failed++;
      logger.error(`Summary repair failed: ${row.id}`);
    }
  }
  return { scanned: rows.length, repaired, failed };
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? 'all';
  const flags = parseFlags(argv);

  // 부트 전에 커맨드별 필수 env 를 검증 — secret 누락/오타(빈 문자열 주입)가
  // 조용한 no-op 성공으로 흘러가지 않게 한다.
  const missing = missingRequiredEnvs(command);
  if (missing.length > 0) {
    logger.error(
      `필수 env 미설정: ${missing.join(', ')} (command=${command}). GitHub Actions 면 repo secrets, 로컬이면 .env 를 확인하세요. Gemini 없이 무료 경로만 쓰려면 ingest/extract/repos/digest 커맨드를 사용하세요.`,
    );
    annotate(
      'error',
      'cli env 검증 실패',
      `필수 env 미설정: ${missing.join(', ')} (command=${command})`,
    );
    process.exit(1);
  }

  // standalone context — HTTP 리스너 없음. CliModule 은 BullModule/Processor 미포함 → Redis 불필요.
  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: resolveLogLevels(),
  });

  const services: CliServices = {
    prisma: app.get(PrismaService),
    ingestion: app.get(IngestionService),
    summarization: app.get(SummarizationService),
    embedding: app.get(EmbeddingService),
    youtube: app.get(YouTubeSyncService),
    repos: app.get(ReposService),
    digest: app.get(DailyDigestService),
    conferences: app.get(ConferenceDiscoveryService),
    conferenceImages: app.get(ConferenceImageSyncService),
    extractor: app.get(ArticleExtractService),
  };

  // extract 커맨드의 --limit 기본값은 100 (다른 커맨드는 200).
  const extractLimit = argv.includes('--limit') ? flags.limit : 100;

  const startedAt = Date.now();
  logger.log(`▶ command=${command} onlyMissing=${flags.onlyMissing} limit=${flags.limit}`);

  let exitCode = 0;
  try {
    switch (command) {
      case 'ingest': {
        const r = await services.ingestion.ingestAll();
        logger.log(
          `✔ ingest: sources=${r.sourceCount} new=${r.newArticles} failed=${r.failedSources}`,
        );
        if (r.failedSources > 0) exitCode = 1;
        break;
      }
      case 'reanalyze': {
        const r = await reanalyze(
          services.prisma,
          services.summarization,
          services.embedding,
          flags,
        );
        logger.log(`✔ reanalyze: ${formatReanalyze(r)}`);
        if (isReanalyzeWipeout(r)) {
          logger.error('reanalyze 전멸 — 성공 0건. GEMINI_API_KEY 상태(만료/한도)를 확인하세요.');
          annotate('error', 'reanalyze 전멸', formatReanalyze(r));
          exitCode = 1;
        }
        break;
      }
      case 'extract': {
        const r = await extractArticles(services.prisma, services.extractor, {
          onlyMissing: !argv.includes('--all'),
          limit: extractLimit,
        });
        logger.log(`✔ extract: scanned=${r.scanned} extracted=${r.extracted} failed=${r.failed}`);
        break;
      }
      case 'repos': {
        const r = await services.repos.refreshAll();
        logger.log(`✔ repos: daily=${r.daily} weekly=${r.weekly}`);
        break;
      }
      case 'videos': {
        const r = await services.youtube.syncAllConferences();
        logger.log(`✔ videos: synced=${r.synced} failed=${r.failed}`);
        if (r.failed > 0) exitCode = 1;
        break;
      }
      case 'digest': {
        const r = await services.digest.generateForToday();
        logger.log(`✔ digest: ${r ? 'generated' : 'skipped(데이터 부족)'}`);
        break;
      }
      case 'conferences': {
        const r = await services.conferences.discover({
          days: 7,
          limit: 100,
        });
        logger.log(
          `✔ conferences: scanned=${r.scannedArticles} llm=${r.llmCalls} proposed=${r.proposed} skipped=${r.skipped} sourceFailures=${r.failedSources} writeFailures=${r.failed}`,
        );
        if (r.failedSources > 0 || r.failed > 0) exitCode = 1;
        break;
      }
      case 'conference-images': {
        const r = await services.conferenceImages.syncAll({
          limit: flags.limit,
          concurrency: 6,
          imagesOnly: true,
        });
        logger.log(`✔ conference-images: ${JSON.stringify(r)}`);
        if (r.writeFailed > 0 || (r.total > 0 && r.updated === 0)) exitCode = 1;
        break;
      }
      case 'repair-summaries': {
        const r = await repairSummaries(services.prisma, services.summarization, flags.limit);
        logger.log(
          `✔ repair-summaries: scanned=${r.scanned} repaired=${r.repaired} failed=${r.failed}`,
        );
        if (r.failed > 0) exitCode = 1;
        break;
      }
      case 'collect':
      case 'all': {
        const failures = await runAll(services, flags, extractLimit, command);
        if (failures.length > 0) {
          logger.error(`✖ ${command} 완료 — 실패 서브스텝: ${failures.join(', ')}`);
          exitCode = 1;
        } else {
          logger.log(`✔ ${command} 완료`);
        }
        break;
      }
      default:
        logger.error(
          `알 수 없는 command: ${command}\n사용법: node dist/cli.js <collect|ingest|repair-summaries|reanalyze|extract|repos|videos|digest|conferences|conference-images|all> [--only-missing] [--all] [--limit N]`,
        );
        await app.close();
        process.exit(1);
    }

    logger.log(`⏱ done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
    await app.close();
    process.exit(exitCode);
  } catch (e) {
    logger.error(`실패: ${(e as Error).stack ?? (e as Error).message}`);
    await app.close();
    process.exit(1);
  }
}

// 직접 실행일 때만 부팅 — jest 등에서 import 될 때 main 이 돌지 않게 한다.
if (require.main === module) {
  void main();
}
