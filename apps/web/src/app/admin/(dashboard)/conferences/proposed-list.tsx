'use client';

import { SearchField } from '@/components/filter-sidebar';
import { Pagination } from '@/components/pagination';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface ProposedConference {
  id: string;
  name: string;
  url: string;
  startDate: string;
  endDate: string | null;
  location: string;
  topics: string[];
  imageUrl: string | null;
  brandColor: string | null;
  discoveredFromArticleId: string | null;
  discoveredAt: string | null;
  description?: string | null;
}

import { adminFetch } from '@/lib/api';
import { ensureOk } from '../ensure-ok';

export function ProposedConferenceList({ items }: { items: ProposedConference[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const needle = query.trim().toLocaleLowerCase();
  const filtered = items.filter((c) =>
    [c.name, c.location, ...c.topics].join(' ').toLocaleLowerCase().includes(needle),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, totalPages);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id);
    setError(null);
    try {
      const res = await adminFetch(`/conferences/${id}/${action}`, { method: 'POST' });
      // 실패(401/404/500)를 무피드백 refresh 로 삼키지 않게 검사한다.
      await ensureOk(res, action === 'approve' ? '승인' : '거절');
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-[14px]" style={{ color: 'var(--color-fg-muted)' }}>
        대기 중인 후보가 없어요. 다음 수집 뒤 다시 확인해 주세요.
      </p>
    );
  }

  return (
    <div>
      <SearchField
        value={query}
        onChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="행사명, 지역, 주제로 후보 검색"
      />
      <p className="my-4 text-sm" style={{ color: 'var(--color-fg-muted)' }} aria-live="polite">
        {filtered.length}개 후보 · {currentPage}/{totalPages}페이지
      </p>
      {error && (
        <p role="alert" className="mb-4 text-[14px]" style={{ color: 'oklch(50% 0.21 15)' }}>
          오류: {error}
        </p>
      )}
      <ul className="border-t border-(--color-line)">
        {filtered.slice((currentPage - 1) * 20, currentPage * 20).map((c) => {
          const isProposedUrl = c.url.startsWith('proposed://');
          return (
            <li
              key={c.id}
              className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-4 sm:gap-6 py-6 border-b"
              style={{ borderColor: 'var(--color-line)' }}
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                  <h3
                    className="text-[1.125rem] tracking-[-0.005em] break-keep"
                    style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
                  >
                    {c.name}
                  </h3>
                  {!isProposedUrl && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center text-[13px] break-all underline underline-offset-4"
                      style={{ color: 'var(--color-fg-muted)' }}
                    >
                      {c.url}
                    </a>
                  )}
                  {isProposedUrl && (
                    <span
                      className="text-[12px] tracking-wide px-2 py-0.5 rounded"
                      style={{
                        color: 'var(--color-fg-muted)',
                        background: 'var(--color-bg-sunken)',
                      }}
                    >
                      URL 미상
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] mb-3">
                  <span style={{ color: 'var(--color-fg-default)' }}>
                    {new Date(c.startDate).toLocaleDateString('ko-KR')}
                    {c.endDate &&
                      c.endDate !== c.startDate &&
                      ` ~ ${new Date(c.endDate).toLocaleDateString('ko-KR')}`}
                  </span>
                  <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                  <span style={{ color: 'var(--color-fg-muted)' }}>{c.location}</span>
                  {c.discoveredAt && (
                    <>
                      <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                      <span style={{ color: 'var(--color-fg-subtle)' }}>
                        {new Date(c.discoveredAt).toLocaleDateString('ko-KR')} 발견
                      </span>
                    </>
                  )}
                </div>
                {c.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[12px]">
                    {c.topics.slice(0, 6).map((t) => (
                      <span key={t} style={{ color: 'var(--color-fg-subtle)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                {c.discoveredFromArticleId && (
                  <p className="mt-2 text-[12px]" style={{ color: 'var(--color-fg-subtle)' }}>
                    발견 출처: {c.discoveredFromArticleId}
                  </p>
                )}
                {c.description && (
                  <p
                    className="mt-3 text-[13px] leading-relaxed break-words max-w-[75ch]"
                    style={{ color: 'var(--color-fg-muted)' }}
                  >
                    {c.description}
                  </p>
                )}
              </div>
              <div className="flex sm:flex-col gap-2 self-start">
                <button
                  type="button"
                  onClick={() => act(c.id, 'approve')}
                  disabled={busy === c.id || isPending}
                  className="min-h-11 flex-1 sm:flex-none text-[14px] px-4 py-1.5 rounded transition-opacity disabled:opacity-50"
                  style={{
                    color: 'oklch(99% 0 0)',
                    background: 'var(--color-fg-strong)',
                    fontWeight: 600,
                  }}
                >
                  {busy === c.id ? '처리 중…' : '승인'}
                </button>
                <button
                  type="button"
                  onClick={() => act(c.id, 'reject')}
                  disabled={busy === c.id || isPending}
                  className="min-h-11 flex-1 sm:flex-none text-[14px] px-4 py-1.5 rounded border transition-opacity disabled:opacity-50"
                  style={{
                    color: 'var(--color-fg-muted)',
                    borderColor: 'var(--color-line-strong)',
                  }}
                >
                  거절
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && (
        <p className="py-8 text-center">
          검색 결과가 없어요. 다른 행사명이나 지역을 입력해 주세요.
        </p>
      )}
      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
