'use client';

import type { VideoDto } from '@/lib/mock-videos';
import { useMemo, useState } from 'react';
import { type FilterGroup, FilterSidebar } from '../filter-sidebar';
import { VideoCard } from '../video-card';

export function VideosTab({ videos }: { videos: VideoDto[] }) {
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [sort, setSort] = useState<'recent' | 'views'>('recent');

  const channelOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of videos) map.set(v.channel, (map.get(v.channel) ?? 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }));
  }, [videos]);

  const topicOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of videos) for (const t of v.topics) map.set(t, (map.get(t) ?? 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }));
  }, [videos]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    let list = videos.filter((v) =>
      [v.title, v.channel, ...v.topics].join(' ').toLocaleLowerCase().includes(needle),
    );
    if (channel) list = list.filter((v) => v.channel === channel);
    if (topic) list = list.filter((v) => v.topics.includes(topic));
    return [...list].sort((a, b) =>
      sort === 'views'
        ? b.views - a.views
        : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }, [videos, query, channel, topic, sort]);

  const resetFilters = () => {
    setQuery('');
    setChannel(null);
    setTopic(null);
  };

  const groups: FilterGroup[] = [
    {
      key: 'channel',
      label: '채널',
      options: channelOptions,
      active: channel,
      onSelect: setChannel,
    },
    {
      key: 'topic',
      label: '주제',
      options: topicOptions,
      active: topic,
      onSelect: setTopic,
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 xl:gap-10">
      <FilterSidebar
        groups={groups}
        search={{ value: query, onChange: setQuery, placeholder: '발표 제목, 채널, 주제로 검색' }}
      />

      <div className="flex-1 min-w-0">
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6 pb-3 border-b"
          style={{ borderColor: 'var(--color-line-strong)' }}
        >
          <span
            className="text-[14px] tracking-[-0.005em] shrink-0"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            영상 <span className="tabular-nums">{filtered.length}</span>개
          </span>
          <span className="flex-1" />
          <SortLink active={sort === 'recent'} onClick={() => setSort('recent')}>
            최신순
          </SortLink>
          <SortLink active={sort === 'views'} onClick={() => setSort('views')}>
            조회수순
          </SortLink>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center" style={{ color: 'var(--color-fg-muted)' }}>
            <p className="text-[16px]">조건에 맞는 영상이 없어요.</p>
            {(query.trim() || channel || topic) && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 min-h-11 px-3 text-[16px] text-(--color-accent) underline underline-offset-4"
              >
                검색·필터 초기화
              </button>
            )}
          </div>
        ) : (
          <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SortLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="min-h-11 px-2 text-[13px] transition-colors"
      style={{
        color: active ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
        fontWeight: active ? 700 : 500,
      }}
    >
      {children}
    </button>
  );
}
