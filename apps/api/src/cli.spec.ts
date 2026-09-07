import { Logger } from '@nestjs/common';
import {
  type CliServices,
  type ReanalyzeResult,
  isReanalyzeWipeout,
  missingRequiredEnvs,
  parseFlags,
  reanalyze,
  repairSummaries,
  resolveLogLevels,
  runAll,
} from './cli';
import type { EmbeddingService } from './embedding/embedding.service';
import type { PrismaService } from './prisma/prisma.service';
import type { SummarizationService } from './summarization/summarization.service';

// CLI 로거 출력이 테스트 출력을 어지럽히지 않게 억제
beforeAll(() => Logger.overrideLogger(false));

describe('parseFlags', () => {
  it('기본값: onlyMissing=false, limit=200', () => {
    expect(parseFlags([])).toEqual({ onlyMissing: false, limit: 200 });
  });

  it('--only-missing / --limit N 파싱', () => {
    expect(parseFlags(['reanalyze', '--only-missing', '--limit', '50'])).toEqual({
      onlyMissing: true,
      limit: 50,
    });
  });

  it('비정상 limit 은 200 으로 폴백', () => {
    expect(parseFlags(['--limit', 'abc']).limit).toBe(200);
    expect(parseFlags(['--limit', '-5']).limit).toBe(200);
  });
});

describe('resolveLogLevels (c36: LOG_LEVEL/CI 로그 레벨 제어)', () => {
  const env = (o: Record<string, string>) => o as NodeJS.ProcessEnv;

  it('로컬 기본은 debug 미포함', () => {
    expect(resolveLogLevels(env({}))).toEqual(['error', 'warn', 'log']);
  });

  it('GitHub Actions(GITHUB_ACTIONS)에서는 기본 debug 활성', () => {
    expect(resolveLogLevels(env({ GITHUB_ACTIONS: 'true' }))).toContain('debug');
  });

  it('CI env 로도 debug 활성', () => {
    expect(resolveLogLevels(env({ CI: 'true' }))).toContain('debug');
  });

  it('LOG_LEVEL=debug 면 로컬에서도 debug 활성', () => {
    expect(resolveLogLevels(env({ LOG_LEVEL: 'debug' }))).toContain('debug');
  });

  it('LOG_LEVEL 명시가 CI 기본값보다 우선 (warn 으로 좁히기)', () => {
    expect(resolveLogLevels(env({ CI: 'true', LOG_LEVEL: 'warn' }))).toEqual(['error', 'warn']);
  });

  it('알 수 없는 LOG_LEVEL 은 환경 기본값으로 폴백', () => {
    expect(resolveLogLevels(env({ LOG_LEVEL: 'banana' }))).toEqual(['error', 'warn', 'log']);
    expect(resolveLogLevels(env({ CI: 'true', LOG_LEVEL: 'banana' }))).toContain('debug');
  });
});

describe('missingRequiredEnvs (c42: 커맨드별 필수 env 사전 검증)', () => {
  const base = {
    DATABASE_URL: 'postgres://x',
    GEMINI_API_KEY: 'k',
  } as NodeJS.ProcessEnv;

  it('전부 설정돼 있으면 빈 배열', () => {
    expect(missingRequiredEnvs('all', base)).toEqual([]);
  });

  it('all/reanalyze 는 GEMINI_API_KEY 필수', () => {
    const env = { DATABASE_URL: 'postgres://x' } as NodeJS.ProcessEnv;
    expect(missingRequiredEnvs('all', env)).toEqual(['GEMINI_API_KEY']);
    expect(missingRequiredEnvs('reanalyze', env)).toEqual(['GEMINI_API_KEY']);
    expect(missingRequiredEnvs('conferences', env)).toEqual([]);
  });

  it('무료 경로 커맨드(ingest/extract/repos/digest/videos)는 GEMINI_API_KEY 없이 허용', () => {
    const env = { DATABASE_URL: 'postgres://x' } as NodeJS.ProcessEnv;
    for (const cmd of ['ingest', 'extract', 'repos', 'digest', 'videos']) {
      expect(missingRequiredEnvs(cmd, env)).toEqual([]);
    }
  });

  it('DATABASE_URL 은 모든 커맨드 필수', () => {
    expect(missingRequiredEnvs('ingest', {} as NodeJS.ProcessEnv)).toEqual(['DATABASE_URL']);
  });

  it('Actions 가 주입하는 빈 문자열/공백도 미설정으로 취급', () => {
    const env = {
      DATABASE_URL: 'postgres://x',
      GEMINI_API_KEY: '  ',
    } as NodeJS.ProcessEnv;
    expect(missingRequiredEnvs('all', env)).toEqual(['GEMINI_API_KEY']);
  });
});

describe('reanalyze (c51/p2: 성공/실패/스킵 분리 집계)', () => {
  let prisma: { $queryRawUnsafe: jest.Mock };
  let summarization: { summarize: jest.Mock; summarizeFree: jest.Mock };
  let embedding: { storeArticleEmbedding: jest.Mock };

  const run = (flags: { onlyMissing: boolean; limit: number }) =>
    reanalyze(
      prisma as unknown as PrismaService,
      summarization as unknown as SummarizationService,
      embedding as unknown as EmbeddingService,
      flags,
    );

  const row = (id: string, over: Partial<Record<string, unknown>> = {}) => ({
    id,
    title: `t-${id}`,
    contentSnippet: '본문',
    needSummary: false,
    needEmbedding: true,
    ...over,
  });

  beforeEach(() => {
    prisma = { $queryRawUnsafe: jest.fn() };
    summarization = {
      summarize: jest.fn().mockResolvedValue(undefined),
      summarizeFree: jest.fn().mockResolvedValue(undefined),
    };
    embedding = {
      storeArticleEmbedding: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('c51: silent-skip 은 embedded 가 아니라 embedSkipped 로 집계 (DB 사후 검증)', async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([row('a1'), row('a2')]) // 대상 행 조회
      .mockResolvedValueOnce([{ stored: 1 }]); // 실제 저장된 건수

    const r = await run({ onlyMissing: true, limit: 200 });

    expect(r).toMatchObject({
      scanned: 2,
      embedded: 1,
      embedSkipped: 1,
      embedFailed: 0,
    });
    // 사후 검증 쿼리가 시도한 행 id 로 호출됐는지
    expect(prisma.$queryRawUnsafe).toHaveBeenLastCalledWith(
      expect.stringContaining('embedding IS NOT NULL'),
      ['a1', 'a2'],
    );
  });

  it('p2: throw 실패는 summaryFailed/embedFailed 로 집계되고 성공 카운트에 안 섞임', async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([
      row('a1', { needSummary: true, needEmbedding: true }),
    ]);
    summarization.summarize.mockRejectedValue(new Error('boom'));
    embedding.storeArticleEmbedding.mockRejectedValue(new Error('boom'));

    const r = await run({ onlyMissing: true, limit: 200 });

    expect(r).toMatchObject({
      scanned: 1,
      summarized: 0,
      summaryFailed: 1,
      embedded: 0,
      embedFailed: 1,
      embedSkipped: 0,
    });
    // 시도가 전부 throw 면 사후 검증 쿼리는 불필요 (행 조회 1회뿐)
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('전부 실제 저장되면 embedded=N, skipped=0', async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([row('a1', { needSummary: true }), row('a2', { needSummary: true })])
      .mockResolvedValueOnce([{ stored: 2 }]);

    const r = await run({ onlyMissing: true, limit: 200 });

    expect(r).toMatchObject({
      scanned: 2,
      summarized: 2,
      summaryFailed: 0,
      embedded: 2,
      embedSkipped: 0,
    });
  });

  it('전체 재처리(onlyMissing=false)에서 기존 벡터가 있던 행은 검증 없이 시도 성공으로 집계', async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([row('a1', { needEmbedding: false })]);

    const r = await run({ onlyMissing: false, limit: 200 });

    expect(r).toMatchObject({ scanned: 1, embedded: 1, embedSkipped: 0 });
    // needEmbedding=false 뿐이면 사후 검증 쿼리 없음
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });
});

describe('isReanalyzeWipeout (p2: 전멸 판정)', () => {
  const r = (over: Partial<ReanalyzeResult>): ReanalyzeResult => ({
    scanned: 0,
    summarized: 0,
    summaryFailed: 0,
    embedded: 0,
    embedSkipped: 0,
    embedFailed: 0,
    ...over,
  });

  it('스캔 0건(백로그 없음)은 전멸 아님', () => {
    expect(isReanalyzeWipeout(r({}))).toBe(false);
  });

  it('전부 throw 실패면 전멸', () => {
    expect(isReanalyzeWipeout(r({ scanned: 3, summaryFailed: 2, embedFailed: 3 }))).toBe(true);
  });

  it('전부 silent-skip 이어도 전멸 (키 만료 시나리오)', () => {
    expect(isReanalyzeWipeout(r({ scanned: 5, embedSkipped: 5 }))).toBe(true);
  });

  it('하나라도 성공하면 전멸 아님', () => {
    expect(isReanalyzeWipeout(r({ scanned: 5, summarized: 1, embedSkipped: 4 }))).toBe(false);
    expect(isReanalyzeWipeout(r({ scanned: 5, embedded: 1, embedFailed: 4 }))).toBe(false);
  });
});

describe('runAll (c7: 서브스텝 실패 수집 + 계속 진행)', () => {
  const OLD_ENV = { ...process.env };
  let services: {
    prisma: { $queryRawUnsafe: jest.Mock; article: { update: jest.Mock } };
    ingestion: { ingestAll: jest.Mock };
    summarization: { summarize: jest.Mock; summarizeFree: jest.Mock };
    embedding: { storeArticleEmbedding: jest.Mock };
    youtube: { syncAllConferences: jest.Mock };
    repos: { refreshAll: jest.Mock };
    digest: { generateForToday: jest.Mock };
    conferences: { discover: jest.Mock };
    conferenceImages: { syncAll: jest.Mock };
    extractor: { extract: jest.Mock };
  };

  const asServices = () => services as unknown as CliServices;
  const flags = { onlyMissing: true, limit: 200 };

  beforeEach(() => {
    // annotate() 가 테스트 stdout 에 ::error 를 찍지 않게 (CI 에서 가짜 annotation 방지).
    // delete/undefined 대입은 함정(= "undefined" 문자열)이라 env 자체를 필터링해 교체한다.
    process.env = Object.fromEntries(
      Object.entries(OLD_ENV).filter(
        ([key]) => key !== 'GITHUB_ACTIONS' && key !== 'YOUTUBE_API_KEY',
      ),
    ) as NodeJS.ProcessEnv;
    services = {
      prisma: {
        $queryRawUnsafe: jest.fn().mockResolvedValue([]),
        article: { update: jest.fn() },
      },
      ingestion: {
        ingestAll: jest.fn().mockResolvedValue({ sourceCount: 1, newArticles: 2 }),
      },
      summarization: {
        summarize: jest.fn().mockResolvedValue(undefined),
        summarizeFree: jest.fn().mockResolvedValue(undefined),
      },
      embedding: {
        storeArticleEmbedding: jest.fn().mockResolvedValue(undefined),
      },
      youtube: {
        syncAllConferences: jest.fn().mockResolvedValue({ synced: 3 }),
      },
      repos: {
        refreshAll: jest.fn().mockResolvedValue({ daily: 1, weekly: 1 }),
      },
      digest: { generateForToday: jest.fn().mockResolvedValue({ id: 'd1' }) },
      conferences: {
        discover: jest.fn().mockResolvedValue({
          scannedArticles: 0,
          llmCalls: 0,
          proposed: 0,
          skipped: 0,
        }),
      },
      conferenceImages: {
        syncAll: jest.fn().mockResolvedValue({ total: 1, updated: 1, failed: 0, writeFailed: 0 }),
      },
      extractor: { extract: jest.fn() },
    };
  });

  afterAll(() => {
    process.env = { ...OLD_ENV };
  });

  it('전부 성공하면 실패 목록이 비어 있다', async () => {
    const failures = await runAll(asServices(), flags, 100);
    expect(failures).toEqual([]);
    expect(services.ingestion.ingestAll).toHaveBeenCalled();
    expect(services.repos.refreshAll).toHaveBeenCalled();
    expect(services.digest.generateForToday).toHaveBeenCalled();
  });

  it('한 스텝 실패는 수집되고 나머지 스텝은 계속 진행된다', async () => {
    services.repos.refreshAll.mockRejectedValue(new Error('trending 파싱 실패'));

    const failures = await runAll(asServices(), flags, 100);

    expect(failures).toEqual(['repos']);
    // repos 실패 후에도 conferences/digest 진행
    expect(services.conferences.discover).toHaveBeenCalled();
    expect(services.digest.generateForToday).toHaveBeenCalled();
  });

  it('ingest 실패도 abort 없이 수집된다 (이전엔 즉시 중단)', async () => {
    services.ingestion.ingestAll.mockRejectedValue(new Error('DB down'));

    const failures = await runAll(asServices(), flags, 100);

    expect(failures).toEqual(['ingest']);
    expect(services.repos.refreshAll).toHaveBeenCalled();
  });

  it('reanalyze 전멸은 서브스텝 실패로 집계된다 (p2)', async () => {
    services.prisma.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      if (sql.includes('needSummary')) {
        return [
          {
            id: 'a1',
            title: 't',
            contentSnippet: '',
            needSummary: true,
            needEmbedding: false,
          },
        ];
      }
      if (sql.includes('count(')) return [{ stored: 0 }];
      return [];
    });
    services.summarization.summarize.mockRejectedValue(new Error('quota'));

    const failures = await runAll(asServices(), flags, 100);

    expect(failures).toEqual(['reanalyze']);
  });

  it('YOUTUBE_API_KEY 미설정이어도 공개 영상 피드를 수집한다', async () => {
    const failures = await runAll(asServices(), flags, 100);
    expect(services.youtube.syncAllConferences).toHaveBeenCalled();
    expect(failures).toEqual([]);
  });

  it('YOUTUBE_API_KEY 설정 시 videos 실패도 수집된다', async () => {
    process.env.YOUTUBE_API_KEY = 'yt-key';
    services.youtube.syncAllConferences.mockRejectedValue(new Error('quotaExceeded'));

    const failures = await runAll(asServices(), flags, 100);

    expect(failures).toEqual(['videos']);
    expect(services.digest.generateForToday).toHaveBeenCalled();
  });

  it('여러 스텝 실패는 전부 순서대로 수집된다', async () => {
    services.repos.refreshAll.mockRejectedValue(new Error('x'));
    services.digest.generateForToday.mockRejectedValue(new Error('y'));

    const failures = await runAll(asServices(), flags, 100);

    expect(failures).toEqual(['repos', 'digest']);
  });
  it('collect fills missing summaries without generating embeddings or overwriting good summaries', async () => {
    services.prisma.$queryRawUnsafe.mockImplementation(async (sql: string) =>
      sql.includes('QUERY LENGTH LIMIT EXCEEDED')
        ? [{ id: 'broken', title: 'Original title', contentSnippet: 'Original article excerpt.' }]
        : [],
    );
    const failures = await runAll(asServices(), flags, 100, 'collect');
    expect(failures).toEqual([]);
    expect(services.summarization.summarizeFree).toHaveBeenCalledWith(
      'broken',
      'Original title',
      'Original article excerpt.',
    );
    expect(services.embedding.storeArticleEmbedding).not.toHaveBeenCalled();
    expect(services.summarization.summarize).not.toHaveBeenCalled();
  });
  it('summary repair reports write failures', async () => {
    services.prisma.$queryRawUnsafe.mockResolvedValue([
      { id: 'broken', title: 'Title', contentSnippet: null },
    ]);
    services.summarization.summarizeFree.mockRejectedValue(new Error('DB unavailable'));
    expect(await repairSummaries(asServices().prisma, asServices().summarization, 10)).toEqual({
      scanned: 1,
      repaired: 0,
      failed: 1,
    });
  });

  it('reports image write failures while continuing the digest', async () => {
    services.conferenceImages.syncAll.mockResolvedValue({
      total: 2,
      updated: 1,
      failed: 1,
      writeFailed: 1,
    });
    expect(await runAll(asServices(), flags, 100, 'collect')).toEqual(['conference-images']);
    expect(services.digest.generateForToday).toHaveBeenCalled();
  });
});
