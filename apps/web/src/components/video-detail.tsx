'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { formatDuration } from '@/lib/format-duration';
import { parseChapters, type Chapter } from '@/lib/parse-chapters';
import type { VideoDto } from '@/lib/mock-videos';

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
  // DB 분석 결과가 있으면 그것을 우선, 없으면 description fallback
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

  const seekTo = (c: Chapter) => {
    setActiveChapter(c);
  };

  const isReal = isYouTubeId(video.videoId);
  const embedSrc = isReal
    ? `https://www.youtube.com/embed/${video.videoId}?start=${activeChapter?.time ?? 0}&autoplay=0&rel=0`
    : '';

  return (
    <article>
      <Link
        href="/?tab=videos"
        className="inline-flex items-center gap-1.5 text-[12.5px] mb-6 transition-colors"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        <span aria-hidden>←</span> 발표 영상 목록으로
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      >
        {/* 영상 임베드 — mock videoId 면 placeholder, 진짜 YouTube ID 면 iframe */}
        <div
          className="relative aspect-video overflow-hidden mb-5"
          style={{
            borderRadius: 8,
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
                  borderRadius: 3,
                  fontWeight: 600,
                }}
              >
                YouTube 에서 보기 ↗
              </a>
            </div>
          )}
        </div>

        {/* 메타 */}
        <header className="mb-8">
          <div
            className="text-[12.5px] mb-2 tracking-wide"
            style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
          >
            {video.channel}
          </div>
          <h1
            className="text-[1.625rem] sm:text-[2rem] leading-[1.2] tracking-[-0.012em] break-keep mb-3"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            {video.title}
          </h1>
          <div
            className="flex items-center gap-2 text-[12.5px] flex-wrap"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            <span>조회수 {Math.round(video.views / 1000)}K</span>
            <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
            <span>{relativeShort(video.publishedAt)}</span>
            <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
            <span className="tabular-nums">
              {formatDuration(video.durationSec)}
            </span>
            {video.topics.length > 0 && (
              <>
                <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                <span style={{ color: 'var(--color-fg-subtle)' }}>
                  {video.topics
                    .slice(0, 4)
                    .map((t) => `#${t}`)
                    .join(' ')}
                </span>
              </>
            )}
          </div>
        </header>
      </motion.div>

      {/* === AI 요약 ========================================= */}
      {video.summary && (
        <section className="mb-10">
          <div
            className="flex items-baseline gap-3 mb-3 pt-1 border-t-2"
            style={{ borderColor: 'var(--color-fg-strong)' }}
          >
            <span
              className="text-[14px] tracking-[-0.005em]"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
            >
              한눈에 요약
            </span>
            <span className="flex-1" />
            <span
              className="text-[10px] tracking-[0.22em] uppercase"
              style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
            >
              AI summary · Gemini
            </span>
          </div>
          <p
            className="text-[14.5px] leading-[1.7]"
            style={{ color: 'var(--color-fg-default)' }}
          >
            {video.summary}
          </p>
        </section>
      )}

      {/* === 타임라인 (chapters) ============================== */}
      {chapters.length > 0 ? (
        <section className="mb-12">
          <div
            className="flex items-baseline gap-3 mb-3 pt-1 border-t-2"
            style={{ borderColor: 'var(--color-fg-strong)' }}
          >
            <span
              className="text-[14px] tracking-[-0.005em]"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
            >
              타임라인
            </span>
            <span
              className="text-[11.5px] tabular-nums"
              style={{ color: 'var(--color-fg-subtle)' }}
            >
              {chapters.length}
            </span>
            {chapterSource && (
              <span
                className="text-[10px] tracking-wide px-1.5 py-px"
                style={{
                  color: 'var(--color-fg-muted)',
                  background: 'var(--color-bg-subtle)',
                  borderRadius: 2,
                  fontWeight: 600,
                }}
              >
                {SOURCE_LABEL[chapterSource].ko}
              </span>
            )}
            <span className="flex-1" />
            <span
              className="text-[10px] tracking-[0.22em] uppercase"
              style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
            >
              chapters
            </span>
          </div>

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
                  className="grid grid-cols-[auto_1fr_auto] gap-4 items-baseline py-2.5 px-2 -mx-2 border-b transition-colors"
                  style={{
                    borderColor: 'var(--color-line)',
                    background: isActive
                      ? 'var(--color-bg-elevated)'
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
                      borderRadius: 2,
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
        <p
          className="text-[13px] mb-12 py-6 text-center"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          이 영상에는 타임라인이 없어요.
        </p>
      )}

      {/* === Description 원문 ================================ */}
      {video.description && (
        <details className="mb-12">
          <summary
            className="text-[12.5px] cursor-pointer mb-2"
            style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
          >
            영상 설명 원문 보기
          </summary>
          <pre
            className="text-[12.5px] leading-[1.7] whitespace-pre-wrap font-sans"
            style={{ color: 'var(--color-fg-default)' }}
          >
            {video.description}
          </pre>
        </details>
      )}

      {/* === 관련 영상 ======================================= */}
      {related.length > 0 && (
        <section>
          <div
            className="flex items-baseline gap-3 mb-3 pt-1 border-t-2"
            style={{ borderColor: 'var(--color-fg-strong)' }}
          >
            <span
              className="text-[14px] tracking-[-0.005em]"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
            >
              관련 영상
            </span>
            <span className="flex-1" />
            <span
              className="text-[10px] tracking-[0.22em] uppercase"
              style={{ color: 'var(--color-fg-muted)', fontWeight: 600 }}
            >
              related
            </span>
          </div>
          <ul>
            {related.map((v) => (
              <li
                key={v.id}
                className="grid grid-cols-[auto_auto_1fr] gap-4 items-baseline py-2.5 border-b"
                style={{ borderColor: 'var(--color-line)' }}
              >
                <span
                  className="tabular-nums text-[11.5px] shrink-0 px-2 py-0.5"
                  style={{
                    color: 'var(--color-fg-muted)',
                    border: '1px solid var(--color-line-strong)',
                    borderRadius: 2,
                    minWidth: 52,
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  {formatDuration(v.durationSec)}
                </span>
                <span
                  className="text-[12px] shrink-0 truncate w-28"
                  style={{
                    color: 'var(--color-fg-default)',
                    fontWeight: 600,
                  }}
                  title={v.channel}
                >
                  {v.channel}
                </span>
                <Link
                  href={`/videos/${v.id}`}
                  className="min-w-0 block truncate text-[14px] hover:underline underline-offset-2"
                  style={{ color: 'var(--color-fg-strong)', fontWeight: 600 }}
                  title={v.title}
                >
                  {v.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
