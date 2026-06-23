'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { formatDuration } from '@/lib/format-duration';
import { parseChapters, type Chapter } from '@/lib/parse-chapters';
import { SectionHeader } from './section-header';
import type { VideoDto } from '@/lib/mock-videos';
import { formatViews } from '@/lib/format-views';

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

const SOURCE_LABEL: Record<
  NonNullable<VideoDto['chapterSource']>,
  { ko: string; en: string }
> = {
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
    video.chapterSource ??
    (chapters.length > 0 ? ('description' as const) : null);

  const [activeChapter, setActiveChapter] = useState<Chapter | null>(
    chapters[0] ?? null,
  );
  const [copied, setCopied] = useState(false);

  const seekTo = (c: Chapter) => setActiveChapter(c);

  const isReal = isYouTubeId(video.videoId);
  const embedSrc = isReal
    ? `https://www.youtube.com/embed/${video.videoId}?start=${activeChapter?.time ?? 0}&autoplay=0&rel=0`
    : '';

  const accent = video.brand ?? 'var(--color-accent)';
  const initial = video.channel.trim().charAt(0).toUpperCase() || '▶';

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
    <article>
      <Link
        href="/?tab=videos"
        className="inline-flex items-center gap-1.5 text-[12.5px] mb-6 transition-colors hover:text-(--color-fg-default)"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        <span aria-hidden>←</span> 발표 영상 목록으로
      </Link>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-x-10 gap-y-10 items-start">
        {/* ===== 좌측: 영상 + 본문 ============================= */}
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          >
            {/* 영상 임베드 */}
            <div
              className="relative aspect-video overflow-hidden mb-5"
              style={{
                borderRadius: 10,
                background: isReal
                  ? 'oklch(92% 0.01 290)'
                  : `linear-gradient(135deg, ${video.brand ?? 'oklch(45% 0.012 245)'}, ${(video.brand ?? 'oklch(45% 0.012 245)').replace(')', ' / 0.6)')})`,
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
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                  <span
                    className="text-[11px] tracking-[0.25em] uppercase mb-3"
                    style={{ color: 'oklch(99% 0 0 / 0.7)', fontWeight: 600 }}
                  >
                    {video.channel}
                  </span>
                  <span
                    className="leading-none tabular-nums tracking-[-0.04em] mb-3"
                    style={{
                      fontSize: '4rem',
                      fontWeight: 700,
                      color: 'oklch(99% 0 0)',
                    }}
                  >
                    {formatDuration(video.durationSec)}
                  </span>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12.5px] px-3 py-1.5 transition-opacity hover:opacity-90"
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
                className="text-[1.5rem] sm:text-[1.875rem] leading-[1.22] tracking-[-0.014em] break-keep mb-3"
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
                <span className="tabular-nums">
                  {formatDuration(video.durationSec)}
                </span>
              </div>
            </header>

            {/* 토픽 칩 + 액션 바 */}
            <div className="flex items-center gap-2 flex-wrap pb-6 mb-8 border-b" style={{ borderColor: 'var(--color-line)' }}>
              {video.topics.slice(0, 5).map((t) => (
                <span
                  key={t}
                  className="text-[12px] px-2.5 py-1 rounded-full"
                  style={{
                    color: 'var(--color-fg-muted)',
                    background: 'var(--color-bg-sunken)',
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
                className="text-[12.5px] px-3 py-1.5 rounded-md transition-colors hover:bg-(--color-bg-sunken)"
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
                className="text-[12.5px] px-3 py-1.5 rounded-md transition-opacity hover:opacity-90"
                style={{
                  background: 'var(--color-accent)',
                  color: 'oklch(99% 0 0)',
                  fontWeight: 600,
                }}
              >
                YouTube ↗
              </a>
            </div>
          </motion.div>

          {/* === AI 요약 ===================================== */}
          {video.summary && (
            <section className="mb-10">
              <SectionHeader label="한눈에 요약" hint="자동 요약" />
              <p
                className="text-[14.5px] leading-[1.75]"
                style={{ color: 'var(--color-fg-default)' }}
              >
                {video.summary}
              </p>
            </section>
          )}

          {/* === 타임라인 =================================== */}
          {chapters.length > 0 ? (
            <section className="mb-10">
              <SectionHeader
                label="타임라인"
                count={chapters.length}
                hint="chapters"
              />
              {chapterSource && (
                <p
                  className="text-[11.5px] -mt-2 mb-3"
                  style={{ color: 'var(--color-fg-subtle)' }}
                >
                  {SOURCE_LABEL[chapterSource].ko}
                </p>
              )}
              <ol>
                {chapters.map((c, i) => {
                  const next = chapters[i + 1];
                  const segDur = next
                    ? next.time - c.time
                    : video.durationSec - c.time;
                  const isActive = activeChapter?.time === c.time;
                  return (
                    <li
                      key={c.time}
                      className="grid grid-cols-[auto_1fr_auto] gap-4 items-baseline py-2.5 px-2 -mx-2 rounded-md border-b transition-colors"
                      style={{
                        borderColor: 'var(--color-line)',
                        background: isActive
                          ? 'var(--color-accent-soft)'
                          : undefined,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => seekTo(c)}
                        className="tabular-nums text-[12.5px] shrink-0 px-2 py-0.5 transition-colors"
                        style={{
                          background: isActive
                            ? 'var(--color-accent)'
                            : 'transparent',
                          color: isActive
                            ? 'oklch(99% 0 0)'
                            : 'var(--color-fg-default)',
                          border: isActive
                            ? 'none'
                            : '1px solid var(--color-line-strong)',
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
                        className="text-[14px] leading-tight tracking-[-0.005em] text-left hover:underline underline-offset-2 decoration-(--color-fg-subtle)"
                        style={{
                          color: isActive
                            ? 'var(--color-fg-strong)'
                            : 'var(--color-fg-default)',
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
            <section className="mb-10">
              <SectionHeader label="타임라인" hint="chapters" />
              <div
                className="flex flex-col items-center text-center gap-3 py-10 px-6 rounded-lg"
                style={{
                  border: '1px dashed var(--color-line-strong)',
                  background: 'var(--color-bg-sunken)',
                }}
              >
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[18px]"
                  style={{
                    background: 'var(--color-bg-elevated)',
                    color: 'var(--color-fg-subtle)',
                  }}
                  aria-hidden
                >
                  ⌁
                </span>
                <p
                  className="text-[13.5px] leading-relaxed max-w-xs"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  아직 이 영상의 타임라인을 분석하지 못했어요.
                  <br />
                  전체 영상은 YouTube 에서 볼 수 있어요.
                </p>
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12.5px] px-3.5 py-1.5 rounded-md transition-opacity hover:opacity-90"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'oklch(99% 0 0)',
                    fontWeight: 600,
                  }}
                >
                  YouTube 에서 전체 보기 ↗
                </a>
              </div>
            </section>
          )}

          {/* === Description 원문 =========================== */}
          {video.description && (
            <details className="group">
              <summary
                className="text-[12.5px] cursor-pointer mb-2 inline-flex items-center gap-1.5 select-none"
                style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
              >
                <span
                  aria-hidden
                  className="transition-transform group-open:rotate-90"
                >
                  ▸
                </span>
                영상 설명 원문 보기
              </summary>
              <pre
                className="text-[12.5px] leading-[1.7] whitespace-pre-wrap font-sans mt-3 p-4 rounded-lg"
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
        <aside className="flex flex-col gap-8 lg:sticky lg:top-20">
          {/* 채널 카드 */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-line)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <span
              className="inline-flex items-center justify-center w-11 h-11 rounded-full text-[18px] shrink-0"
              style={{
                background: accent,
                color: 'oklch(99% 0 0)',
                fontWeight: 700,
              }}
              aria-hidden
            >
              {initial}
            </span>
            <div className="min-w-0">
              <div
                className="text-[14px] truncate"
                style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
                title={video.channel}
              >
                {video.channel}
              </div>
              <div
                className="text-[12px]"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                YouTube 채널
              </div>
            </div>
          </div>

          {/* 영상 정보 */}
          <div>
            <SectionHeader label="영상 정보" />
            <dl className="flex flex-col gap-0">
              {[
                ['길이', formatDuration(video.durationSec)],
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
                    <Link
                      href={`/videos/${v.id}`}
                      className="group flex gap-3 items-start"
                    >
                      <div
                        className="relative w-[104px] aspect-video shrink-0 overflow-hidden"
                        style={{
                          borderRadius: 6,
                          background: 'oklch(92% 0.01 290)',
                        }}
                      >
                        {v.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.thumbnailUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
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
                          {formatDuration(v.durationSec)}
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
