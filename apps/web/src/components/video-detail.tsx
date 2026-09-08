'use client';

import { formatDuration, formatVideoDuration } from '@/lib/format-duration';
import { formatViews } from '@/lib/format-views';
import type { VideoDto } from '@/lib/mock-videos';
import { type Chapter, parseChapters } from '@/lib/parse-chapters';
import Link from 'next/link';
import { useState } from 'react';
import { SectionHeader } from './section-header';

interface Props {
  video: VideoDto;
  related: VideoDto[];
}

function relativeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (day < 1) return '오늘';
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  return `${Math.floor(day / 30)}개월 전`;
}

function isYouTubeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{8,15}$/.test(id) && !id.startsWith('mock-');
}

const SOURCE_LABEL: Record<NonNullable<VideoDto['chapterSource']>, { ko: string; en: string }> = {
  official: { ko: '유튜버 직접 표시', en: 'official' },
  description: { ko: '영상 설명에서 추출', en: 'from description' },
  ai: { ko: 'AI 자동 생성 (Gemini)', en: 'AI generated' },
};

export function VideoDetail({ video, related }: Props) {
  // DB 분석 결과가 있으면 우선, 없으면 description fallback
  const chapters: Chapter[] =
    video.chapters && video.chapters.length > 0
      ? video.chapters
      : parseChapters(video.description, video.durationSec);
  const chapterSource =
    video.chapterSource ?? (chapters.length > 0 ? ('description' as const) : null);

  const [activeChapter, setActiveChapter] = useState<Chapter | null>(chapters[0] ?? null);
  const [copied, setCopied] = useState(false);

  const seekTo = (c: Chapter) => setActiveChapter(c);

  const isReal = isYouTubeId(video.videoId);
  // mock 데이터 여부 — mock 상세는 개발 환경(MOCKS_ENABLED)에서만 렌더되므로 이 라벨은 프로덕션에 도달하지 않는다.
  const isMock = video.videoId.startsWith('mock-');
  const embedSrc = isReal
    ? `https://www.youtube.com/embed/${video.videoId}?start=${activeChapter?.time ?? 0}&autoplay=0&rel=0`
    : '';

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : video.url;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      /* 사용자가 취소 — 무시 */
    }
  };

  return (
    <article className="video-detail-surface">
      <Link
        href="/?tab=videos"
        className="inline-flex items-center gap-1.5 min-h-11 text-[13px] mb-6 transition-colors hover:text-(--color-fg-default)"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        <span aria-hidden>←</span> 발표 영상 목록으로
      </Link>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_280px] gap-x-12 gap-y-12 items-start">
        {/* ===== 좌측: 영상 + 본문 ============================= */}
        <div className="min-w-0">
          <div>
            {/* 영상 임베드 */}
            <div
              className="relative aspect-video overflow-hidden mb-5"
              style={{
                borderRadius: 6,
                background: '#20242b',
                minHeight: isReal ? undefined : 208,
              }}
            >
              {isReal ? (
                <iframe
                  src={embedSrc}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 py-8 sm:p-8">
                  {isMock && (
                    <span
                      className="absolute top-3 left-3 text-[10.5px] tracking-[0.08em] px-2 py-0.5"
                      style={{
                        background: 'oklch(20% 0 0 / 0.55)',
                        color: 'oklch(94% 0.005 250)',
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      개발용 샘플 데이터
                    </span>
                  )}
                  <span
                    className="text-[13px] mb-3"
                    style={{ color: 'oklch(99% 0 0 / 0.7)', fontWeight: 600 }}
                  >
                    {video.channel}
                  </span>
                  <span
                    className="leading-none tabular-nums tracking-[-0.04em] mb-3"
                    style={{
                      fontSize: 'clamp(1.25rem, 5vw, 2rem)',
                      fontWeight: 700,
                      color: 'oklch(99% 0 0)',
                    }}
                  >
                    {formatVideoDuration(video.durationSec)}
                  </span>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center min-h-11 text-[12.5px] px-3 py-1.5 transition-opacity hover:opacity-90"
                    style={{
                      background: 'oklch(99% 0 0 / 0.18)',
                      color: 'oklch(99% 0 0)',
                      borderRadius: 4,
                      fontWeight: 600,
                    }}
                  >
                    YouTube 에서 보기 ↗
                  </a>
                </div>
              )}
            </div>

            {/* 제목 + 메타 */}
            <header className="mb-5">
              <h1
                className="text-[1.5rem] sm:text-[2rem] leading-[1.35] tracking-[-0.025em] break-keep mb-3"
                style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
              >
                {video.title}
              </h1>
              <div
                className="flex items-center gap-2 text-[12.5px] flex-wrap"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                <span>조회수 {formatViews(video.views)}회</span>
                <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                <span>{relativeShort(video.publishedAt)}</span>
                <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                <span className="tabular-nums">{formatVideoDuration(video.durationSec)}</span>
              </div>
            </header>

            {/* 토픽 칩 + 액션 바 */}
            <div
              className="flex items-center gap-2 flex-wrap pb-6 mb-8 border-b"
              style={{ borderColor: 'var(--color-line)' }}
            >
              {video.topics.slice(0, 5).map((t) => (
                <span
                  key={t}
                  className="text-[12px] py-1 mr-2"
                  style={{
                    color: 'var(--color-fg-muted)',
                    fontWeight: 500,
                  }}
                >
                  #{t}
                </span>
              ))}
              <span className="flex-1" />
              <button
                type="button"
                onClick={onShare}
                aria-label={copied ? '링크가 복사되었습니다' : '링크 공유'}
                className="inline-flex items-center min-h-11 text-[12.5px] px-3 py-1.5 rounded-md transition-colors hover:bg-(--color-bg-sunken)"
                style={{
                  color: 'var(--color-fg-default)',
                  border: '1px solid var(--color-line-strong)',
                  fontWeight: 600,
                }}
              >
                <span aria-live="polite">{copied ? '✓ 링크 복사됨' : '공유'}</span>
              </button>
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center min-h-11 text-[12.5px] px-3 py-1.5 rounded-md transition-opacity hover:opacity-90"
                style={{
                  background: 'var(--color-accent)',
                  color: 'oklch(99% 0 0)',
                  fontWeight: 600,
                }}
              >
                YouTube ↗
              </a>
            </div>
          </div>

          {/* === AI 요약 ===================================== */}
          {video.summary && (
            <section className="mb-10">
              <SectionHeader label="한눈에 요약" hint="자동 요약" />
              <p
                className="text-[16px] leading-[1.85] max-w-[70ch]"
                style={{ color: 'var(--color-fg-default)' }}
              >
                {video.summary}
              </p>
            </section>
          )}

          {/* === 타임라인 =================================== */}
          {chapters.length > 0 ? (
            <section className="mb-10">
              <SectionHeader label="타임라인" count={chapters.length} />
              {chapterSource && (
                <p className="text-[11.5px] -mt-2 mb-3" style={{ color: 'var(--color-fg-subtle)' }}>
                  {SOURCE_LABEL[chapterSource].ko}
                </p>
              )}
              <ol>
                {chapters.map((c, i) => {
                  const next = chapters[i + 1];
                  const segDur = next ? next.time - c.time : video.durationSec - c.time;
                  const isActive = activeChapter?.time === c.time;
                  return (
                    <li
                      key={c.time}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 sm:gap-4 items-baseline py-2.5 px-2 -mx-2 rounded-md border-b transition-colors"
                      style={{
                        borderColor: 'var(--color-line)',
                        background: isActive ? 'var(--color-accent-soft)' : undefined,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => seekTo(c)}
                        className="min-h-11 tabular-nums text-[12.5px] shrink-0 px-2 py-0.5 transition-colors"
                        style={{
                          background: isActive ? 'var(--color-accent)' : 'transparent',
                          color: isActive ? 'oklch(99% 0 0)' : 'var(--color-fg-default)',
                          border: isActive ? 'none' : '1px solid var(--color-line-strong)',
                          fontWeight: 600,
                          borderRadius: 4,
                          minWidth: 56,
                          textAlign: 'center',
                        }}
                      >
                        {formatDuration(c.time)}
                      </button>
                      <button
                        type="button"
                        onClick={() => seekTo(c)}
                        className="min-w-0 min-h-11 text-[14px] leading-relaxed tracking-[-0.005em] text-left hover:underline underline-offset-2 decoration-(--color-fg-subtle)"
                        style={{
                          color: isActive ? 'var(--color-fg-strong)' : 'var(--color-fg-default)',
                          fontWeight: isActive ? 700 : 500,
                        }}
                      >
                        {c.label}
                      </button>
                      <span
                        className="tabular-nums text-[11.5px] shrink-0"
                        style={{ color: 'var(--color-fg-subtle)' }}
                      >
                        {formatDuration(segDur)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <p
              className="mb-6 text-[14px] leading-relaxed"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              아직 이 영상의 타임라인이 없어요.
            </p>
          )}

          {/* === Description 원문 =========================== */}
          {video.description && (
            <details className="group">
              <summary
                className="min-h-11 text-[12.5px] cursor-pointer mb-2 inline-flex items-center gap-1.5 select-none"
                style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
              >
                <span aria-hidden className="transition-transform group-open:rotate-90">
                  ▸
                </span>
                영상 설명 원문 보기
              </summary>
              <pre
                className="text-[13px] leading-[1.8] whitespace-pre-wrap break-words font-sans mt-3 p-4 rounded-lg"
                style={{
                  color: 'var(--color-fg-default)',
                  background: 'var(--color-bg-sunken)',
                }}
              >
                {video.description}
              </pre>
            </details>
          )}
        </div>

        {/* ===== 우측: 사이드바 =============================== */}
        <aside className="flex min-w-0 flex-col gap-8 xl:sticky xl:top-20">
          <div className="border-t pt-5" style={{ borderColor: 'var(--color-line-strong)' }}>
            <p
              className="text-[18px] leading-snug break-words"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
            >
              {video.channel}
            </p>
            <p className="mt-1 text-[12px]" style={{ color: 'var(--color-fg-muted)' }}>
              YouTube 채널
            </p>
          </div>

          {/* 영상 정보 */}
          <div>
            <SectionHeader label="영상 정보" />
            <dl className="flex flex-col gap-0">
              {[
                ['길이', formatVideoDuration(video.durationSec)],
                ['조회수', `${formatViews(video.views)}회`],
                ['게시', relativeShort(video.publishedAt)],
                [
                  '타임라인',
                  chapters.length > 0
                    ? `${chapters.length}개${chapterSource ? ` · ${SOURCE_LABEL[chapterSource].ko}` : ''}`
                    : '없음',
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-baseline justify-between gap-3 py-2 border-b text-[13px]"
                  style={{ borderColor: 'var(--color-line)' }}
                >
                  <dt style={{ color: 'var(--color-fg-muted)' }}>{k}</dt>
                  <dd
                    className="tabular-nums text-right"
                    style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}
                  >
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 관련 영상 */}
          {related.length > 0 && (
            <div>
              <SectionHeader label="관련 영상" count={related.length} />
              <ul className="flex flex-col gap-3">
                {related.map((v) => (
                  <li key={v.id}>
                    <Link href={`/videos/${v.id}`} className="group flex gap-3 items-start">
                      <div
                        className="relative w-[104px] aspect-video shrink-0 overflow-hidden"
                        style={{
                          borderRadius: 6,
                          background: 'var(--color-bg-sunken)',
                        }}
                      >
                        {v.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.thumbnailUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : null}
                        <span
                          className="absolute bottom-1 right-1 px-1 py-px text-[10px] tabular-nums rounded"
                          style={{
                            background: 'oklch(20% 0 0 / 0.78)',
                            color: 'oklch(99% 0 0)',
                            fontWeight: 600,
                          }}
                        >
                          {formatVideoDuration(v.durationSec)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[13px] leading-[1.35] line-clamp-2 group-hover:underline underline-offset-2"
                          style={{
                            color: 'var(--color-fg-strong)',
                            fontWeight: 600,
                          }}
                        >
                          {v.title}
                        </p>
                        <p
                          className="text-[11.5px] mt-1 truncate"
                          style={{ color: 'var(--color-fg-muted)' }}
                        >
                          {v.channel}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
