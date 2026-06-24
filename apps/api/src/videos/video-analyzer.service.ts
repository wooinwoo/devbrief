import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { Innertube } from 'youtubei.js';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';

export interface Chapter {
  time: number; // 초
  label: string;
}

type ChapterSource = 'official' | 'description' | 'ai';

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
  private innertube?: Innertube;
  // Gemini 영상 분석은 fileData.fileUri 직접 호출이 필요해서 GoogleGenAI 인스턴스 별도 보관.
  // 텍스트/임베딩은 공용 GeminiService 사용.
  private rawGemini?: GoogleGenAI;

  constructor(
    private gemini: GeminiService,
    private prisma: PrismaService,
  ) {
    if (this.gemini.isAvailable()) {
      // 환경변수는 GeminiService 가 이미 확인 — apiKey 다시 받기 위해 process.env 직접 (생성자 외부 X)
      const key = process.env.GEMINI_API_KEY ?? '';
      if (key) this.rawGemini = new GoogleGenAI({ apiKey: key });
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

  /** YouTube URL / videoId 에서 videoId 추출. */
  static parseVideoId(input: string): string | null {
    const s = input.trim();
    // 이미 11자 id
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    const patterns = [
      /[?&]v=([A-Za-z0-9_-]{11})/, // watch?v=
      /youtu\.be\/([A-Za-z0-9_-]{11})/, // youtu.be/
      /\/embed\/([A-Za-z0-9_-]{11})/, // /embed/
      /\/shorts\/([A-Za-z0-9_-]{11})/, // /shorts/
      /\/live\/([A-Za-z0-9_-]{11})/, // /live/
    ];
    for (const re of patterns) {
      const m = re.exec(s);
      if (m) return m[1];
    }
    return null;
  }

  /**
   * YouTube URL → youtubei.js 로 메타 가져와 Video 저장 (analyze 는 호출자가 큐로).
   * YouTube Data API quota 안 씀 (innertube 무료).
   */
  async fetchAndStore(url: string): Promise<{ id: string; videoId: string }> {
    const videoId = VideoAnalyzerService.parseVideoId(url);
    if (!videoId) throw new Error('유효한 YouTube URL 이 아닙니다');

    const yt = await this.ensureInnertube();
    const info = await yt.getInfo(videoId);
    const basic = info.basic_info;

    const title = basic.title ?? '제목 없음';
    const channel = basic.author ?? '알 수 없는 채널';
    const durationSec = basic.duration ?? 0;
    const views = basic.view_count ?? 0;
    const thumb =
      basic.thumbnail?.[0]?.url ?? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const description =
      (info as unknown as { basic_info: { short_description?: string } }).basic_info
        .short_description ?? null;
    // 실제 발행일 — youtubei.js basic_info.start_timestamp(Date|null). 없으면 현재 시각 폴백.
    const startTs = (basic as unknown as { start_timestamp?: Date | string | null })
      .start_timestamp;
    const publishedAt = startTs ? new Date(startTs) : new Date();

    const video = await this.prisma.video.upsert({
      where: { videoId },
      create: {
        videoId,
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        channel,
        thumbnailUrl: thumb,
        durationSec,
        views,
        publishedAt,
        description,
      },
      // 재수집 시 publishedAt은 갱신하지 않는다 — 폴백(new Date())으로 기존 발행일을 덮어쓰지 않게.
      update: {
        title,
        channel,
        thumbnailUrl: thumb,
        durationSec,
        views,
        description,
      },
      select: { id: true, videoId: true },
    });

    return video;
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
        chapterSource: (video.chapterSource as ChapterSource | null) ?? null,
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

    // Tier 3: Gemini 로 chapters 만 추출, 요약은 설명 기반(토큰 절약)
    if (this.rawGemini && this.isRealVideoId(videoId)) {
      try {
        const chapters = await this.analyzeWithGemini(videoId, durationSec);
        const summary = summarizeDescription(description);
        this.logger.log(`[${videoId}] tier=ai chapters=${chapters.length} (요약=설명기반)`);
        return { chapters, chapterSource: 'ai', summary };
      } catch (e) {
        this.logger.warn(`[${videoId}] Gemini 분석 실패: ${(e as Error).message}`);
      }
    }

    // 모두 실패 — chapter 없어도 요약은 설명 기반으로 최대한 제공
    return { chapters: [], chapterSource: null, summary: summarizeDescription(description) };
  }

  /** 자막 트랙(timedtext)을 직접 fetch·파싱 → "[m:ss] text" 라인들. 없으면 null. */
  private async fetchTranscript(videoId: string): Promise<string | null> {
    try {
      const yt = await this.ensureInnertube();
      const info = await yt.getInfo(videoId);
      const tracks =
        (
          info as unknown as {
            captions?: {
              caption_tracks?: Array<{
                base_url?: string;
                language_code?: string;
              }>;
            };
          }
        ).captions?.caption_tracks ?? [];
      if (!tracks.length) return null;

      // 영어 우선, 없으면 첫 트랙
      const track =
        tracks.find((t) => String(t.language_code).startsWith('en')) ??
        tracks.find((t) => String(t.language_code).startsWith('ko')) ??
        tracks[0];
      if (!track?.base_url) return null;

      const res = await fetch(track.base_url);
      if (!res.ok) return null;
      const xml = await res.text();

      const matches = [...xml.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)];
      if (!matches.length) return null;

      const decode = (s: string) =>
        s
          .replace(/&amp;#39;|&#39;/g, "'")
          .replace(/&amp;quot;|&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/<[^>]+>/g, '')
          .trim();

      const lines = matches
        .map((m) => {
          const sec = Math.floor(Number(m[1]));
          const mm = Math.floor(sec / 60);
          const ss = String(sec % 60).padStart(2, '0');
          const text = decode(m[2]);
          return text ? `[${mm}:${ss}] ${text}` : '';
        })
        .filter(Boolean);
      return lines.length ? lines.join('\n') : null;
    } catch (e) {
      this.logger.debug(`[${videoId}] transcript 추출 실패: ${(e as Error).message}`);
      return null;
    }
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
      (
        info as unknown as {
          player_overlays?: { decorated_player_bar?: { chapters?: MaybeChapter[] } };
        }
      ).player_overlays?.decorated_player_bar?.chapters ??
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

  // Tier 3 는 chapters 만 Gemini 로 추출 (요약은 설명 기반으로 대체해 출력 토큰 절약)
  private async analyzeWithGemini(videoId: string, durationSec: number): Promise<Chapter[]> {
    if (!this.rawGemini) throw new Error('Gemini not configured');

    // 자막(transcript)을 텍스트로 보냄 — fileData(영상) 호출보다 인증/비용에 유리
    const transcript = await this.fetchTranscript(videoId);
    if (!transcript) throw new Error('자막 없음 — Gemini chapter 생성 불가');

    const prompt = `다음은 YouTube 영상의 자막(타임스탬프 포함)입니다. 주제 전환을 기준으로 목차(chapters)를 만들어 JSON 만 출력하세요. JSON 외 텍스트 금지.

{
  "chapters": [
    { "time": 0, "label": "장 제목 한 줄" }
  ]
}

규칙:
- chapters 는 5~10개. 주제 전환마다 끊고, 균등하게 분포.
- chapter time 은 초 단위 정수. 0 부터 ${durationSec} 사이. 자막의 타임스탬프를 근거로.
- label 은 한 줄, 30자 내외, 마침표 없음, 자연스러운 한국어.

[자막]
${transcript.slice(0, 9000)}`;

    const response = await this.rawGemini.models.generateContent({
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini 응답에 JSON 없음');
    const parsed = JSON.parse(match[0]) as {
      chapters?: Array<{ time?: number; label?: string }>;
    };

    const chapters: Chapter[] = (parsed.chapters ?? [])
      .map((c) => ({
        time: Math.max(0, Math.min(durationSec, Math.floor(Number(c.time ?? 0)))),
        label: String(c.label ?? '')
          .trim()
          .slice(0, 80),
      }))
      .filter((c) => c.label.length > 0)
      .sort((a, b) => a.time - b.time);

    // 중복 time 제거
    const seen = new Set<number>();
    return chapters.filter((c) => {
      if (seen.has(c.time)) return false;
      seen.add(c.time);
      return true;
    });
  }
}

/** 설명글로 요약 대체 — Gemini 출력 토큰 절약. 타임스탬프 줄 제거 후 앞부분. */
function summarizeDescription(desc: string | null): string | null {
  if (!desc) return null;
  const clean = desc
    .replace(/^\s*\(?\d{1,2}:\d{2}(?::\d{2})?\)?.*$/gm, '') // 타임스탬프 줄 제거
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length < 10) return null;
  if (clean.length <= 180) return clean;
  return `${clean.slice(0, 180).replace(/\s\S*$/, '')}…`;
}

// ── description 안 timestamp 추출 (apps/web 의 parse-chapters 와 동일 로직) ──
function parseChaptersFromDescription(description: string | null, durationSec: number): Chapter[] {
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

function parseTimestamp(ts: string): number | null {
  const parts = ts.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
