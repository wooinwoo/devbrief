import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Innertube } from 'youtubei.js';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';

export interface Chapter {
  time: number; // 초
  label: string;
}

export type ChapterSource = 'official' | 'description' | 'ai';

export interface AnalysisResult {
  chapters: Chapter[];
  chapterSource: ChapterSource | null;
  summary: string | null;
}

/**
 * 3-tier hybrid 영상 분석.
 *
 *  1. youtubei.js → info.chapters (유튜버가 직접 박은 공식 chapter) — 무료
 *  2. description 안 timestamp 정규식 추출 — 무료
 *  3. Gemini 2.5 Flash 에 YouTube URL 직접 전달 → chapter + 요약 JSON — ~$0.06/영상
 *
 * Gemini 키 없으면 1+2 만 사용, 자동 분석은 skip.
 */
@Injectable()
export class VideoAnalyzerService {
  private readonly logger = new Logger(VideoAnalyzerService.name);
  private readonly geminiKey: string;
  private gemini?: GoogleGenAI;
  private innertube?: Innertube;

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.geminiKey = config.get<string>('GEMINI_API_KEY') ?? '';
    if (this.geminiKey) {
      this.gemini = new GoogleGenAI({ apiKey: this.geminiKey });
    } else {
      this.logger.warn(
        'GEMINI_API_KEY 미설정 — AI 자동 chapter/요약 skip. 공식/description chapter 만 사용.',
      );
    }
  }

  private async ensureInnertube(): Promise<Innertube> {
    if (!this.innertube) {
      this.innertube = await Innertube.create({
        retrieve_player: false, // 빠른 메타데이터만 필요
      });
    }
    return this.innertube;
  }

  /** mock-* videoId 는 skip. 진짜 YouTube ID 만 시도. */
  private isRealVideoId(videoId: string): boolean {
    return /^[A-Za-z0-9_-]{8,15}$/.test(videoId) && !videoId.startsWith('mock-');
  }

  /**
   * 단일 영상 분석 → DB 저장.
   * 이미 analyzedAt 있고 force=false 면 skip.
   */
  async analyzeOne(
    videoDbId: string,
    opts: { force?: boolean } = {},
  ): Promise<AnalysisResult & { skipped?: boolean }> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoDbId },
    });
    if (!video) throw new Error(`Video ${videoDbId} not found`);

    if (video.analyzedAt && !opts.force) {
      return {
        chapters: (video.chapters as unknown as Chapter[]) ?? [],
        chapterSource:
          (video.chapterSource as ChapterSource | null) ?? null,
        summary: video.summary,
        skipped: true,
      };
    }

    const result = await this.analyze(video.videoId, video.description, video.durationSec);

    await this.prisma.video.update({
      where: { id: videoDbId },
      data: {
        chapters: result.chapters as never,
        chapterSource: result.chapterSource,
        summary: result.summary,
        analyzedAt: new Date(),
      },
    });

    return result;
  }

  /** 순수 분석 (저장 X) */
  async analyze(
    videoId: string,
    description: string | null,
    durationSec: number,
  ): Promise<AnalysisResult> {
    // Tier 1: 공식 chapters (youtubei.js)
    if (this.isRealVideoId(videoId)) {
      try {
        const official = await this.fetchOfficialChapters(videoId);
        if (official.length > 0) {
          this.logger.log(`[${videoId}] tier=official chapters=${official.length}`);
          return {
            chapters: official,
            chapterSource: 'official',
            summary: null,
          };
        }
      } catch (e) {
        this.logger.debug(`[${videoId}] official chapter fetch 실패: ${(e as Error).message}`);
      }
    }

    // Tier 2: description timestamp 파싱
    const fromDesc = parseChaptersFromDescription(description, durationSec);
    if (fromDesc.length > 0) {
      this.logger.log(`[${videoId}] tier=description chapters=${fromDesc.length}`);
      return {
        chapters: fromDesc,
        chapterSource: 'description',
        summary: null,
      };
    }

    // Tier 3: Gemini Flash 로 영상 URL 직접 분석
    if (this.gemini && this.isRealVideoId(videoId)) {
      try {
        const ai = await this.analyzeWithGemini(videoId, durationSec);
        this.logger.log(`[${videoId}] tier=ai chapters=${ai.chapters.length} summary=${ai.summary?.length ?? 0}자`);
        return { ...ai, chapterSource: 'ai' };
      } catch (e) {
        this.logger.warn(`[${videoId}] Gemini 분석 실패: ${(e as Error).message}`);
      }
    }

    // 모두 실패 — chapter 없음. 그래도 summary 라도 description 기반으로 만들면 좋지만 일단 null.
    return { chapters: [], chapterSource: null, summary: null };
  }

  private async fetchOfficialChapters(videoId: string): Promise<Chapter[]> {
    const yt = await this.ensureInnertube();
    const info = await yt.getInfo(videoId);

    // youtubei.js 의 chapters 위치는 버전 따라 다를 수 있어 여러 후보 체크
    interface MaybeChapter {
      time_range_start_millis?: number | string;
      timeRangeStart?: number | string;
      title?: { text?: string } | string;
    }
    const rawChapters =
      (info as unknown as { chapters?: MaybeChapter[] }).chapters ??
      ((info as unknown as { player_overlays?: { decorated_player_bar?: { chapters?: MaybeChapter[] } } })
        .player_overlays?.decorated_player_bar?.chapters) ??
      [];

    const out: Chapter[] = [];
    for (const c of rawChapters) {
      const startMs = Number(c.time_range_start_millis ?? c.timeRangeStart ?? 0);
      const labelRaw = typeof c.title === 'string' ? c.title : c.title?.text;
      if (!labelRaw) continue;
      out.push({ time: Math.floor(startMs / 1000), label: labelRaw.trim() });
    }
    return out.sort((a, b) => a.time - b.time);
  }

  private async analyzeWithGemini(
    videoId: string,
    durationSec: number,
  ): Promise<Omit<AnalysisResult, 'chapterSource'>> {
    if (!this.gemini) throw new Error('Gemini not configured');

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const prompt = `이 YouTube 영상을 분석해 다음 JSON 만 출력하세요. JSON 외 텍스트 금지.

{
  "summary": "이 영상이 다루는 핵심 내용 3줄. em dash 금지, 자연스러운 한국어.",
  "chapters": [
    { "time": 0, "label": "장 제목 한 줄" }
  ]
}

규칙:
- chapters 는 5~10개. 주제 전환마다 끊고, 균등하게 분포.
- chapter time 은 초 단위 정수. 0 부터 ${durationSec} 사이.
- 영상이 짧으면 chapter 수 줄이고, 영상이 길면 늘림.
- label 은 한 줄, 30자 내외, 마침표 없음.
- summary 는 마침표 포함 3 문장.`;

    const response = await this.gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { fileData: { fileUri: youtubeUrl, mimeType: 'video/*' } },
            { text: prompt },
          ],
        },
      ],
    });

    const text = response.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini 응답에 JSON 없음');
    const parsed = JSON.parse(match[0]) as {
      summary?: string;
      chapters?: Array<{ time?: number; label?: string }>;
    };

    const chapters: Chapter[] = (parsed.chapters ?? [])
      .map((c) => ({
        time: Math.max(0, Math.min(durationSec, Math.floor(Number(c.time ?? 0)))),
        label: String(c.label ?? '').trim().slice(0, 80),
      }))
      .filter((c) => c.label.length > 0)
      .sort((a, b) => a.time - b.time);

    // 중복 time 제거
    const seen = new Set<number>();
    const dedup = chapters.filter((c) => {
      if (seen.has(c.time)) return false;
      seen.add(c.time);
      return true;
    });

    return {
      chapters: dedup,
      summary: parsed.summary?.trim() ?? null,
    };
  }
}

// ── description 안 timestamp 추출 (apps/web 의 parse-chapters 와 동일 로직) ──
export function parseChaptersFromDescription(
  description: string | null,
  durationSec: number,
): Chapter[] {
  if (!description) return [];
  const lines = description.split('\n');
  const RE = /^[\s\[\-(]*((?:\d{1,2}:)?\d{1,2}:\d{2})[\s\)\]\-:.|]*(.+)$/;
  const out: Chapter[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = RE.exec(line);
    if (!m) continue;
    const time = parseTimestamp(m[1]);
    if (time === null) continue;
    if (time > durationSec) continue;
    const label = m[2].trim().replace(/[\s\-—–|·:]+$/g, '');
    if (!label) continue;
    out.push({ time, label });
  }
  const seen = new Set<number>();
  return out
    .filter((c) => {
      if (seen.has(c.time)) return false;
      seen.add(c.time);
      return true;
    })
    .sort((a, b) => a.time - b.time);
}

export function parseTimestamp(ts: string): number | null {
  const parts = ts.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
