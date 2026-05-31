'use client';

import { useMemo, useState } from 'react';
import { VideoCard } from '../video-card';
import { FilterSidebar, type FilterGroup } from '../filter-sidebar';
import type { VideoDto } from '@/lib/mock-videos';

export function VideosTab({ videos }: { videos: VideoDto[] }) {
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
    for (const v of videos)
      for (const t of v.topics) map.set(t, (map.get(t) ?? 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }));
  }, [videos]);

  const filtered = useMemo(() => {
    let list = videos;
    if (channel) list = list.filter((v) => v.channel === channel);
    if (topic) list = list.filter((v) => v.topics.includes(topic));
    return [...list].sort((a, b) =>
      sort === 'views'
        ? b.views - a.views
        : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }, [videos, channel, topic, sort]);

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
    <div className="flex flex-col lg:flex-row gap-8">
      <FilterSidebar groups={groups} />

      <div className="flex-1 min-w-0">
        <div
          className="flex items-baseline gap-4 mb-6 pt-1 border-t-2"
          style={{ borderColor: 'var(--color-fg-strong)' }}
        >
          <span
            className="text-[14px] tracking-[-0.005em]"
            style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
          >
            <span style={{ color: 'var(--color-accent)' }}>{filtered.length}</span> 개
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
          <p className="py-12 text-center text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
            조건에 맞는 영상이 없어요.
          </p>
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((v, i) => (
              <VideoCard key={v.id} video={v} index={i} />
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
      className="text-[12.5px] transition-colors"
      style={{
        color: active ? 'var(--color-fg-strong)' : 'var(--color-fg-muted)',
        fontWeight: active ? 700 : 500,
      }}
    >
      {children}
    </button>
  );
}
