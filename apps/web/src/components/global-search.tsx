'use client';
import { API_BASE } from '@/lib/api';
import { pickTitle, useLang } from '@/lib/lang-context';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ArticleDto } from './article-card';
import { BriefIcon } from './brief-icon';
export function GlobalSearch() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ArticleDto[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const { lang } = useLang();
  const show = () => {
    dialog.current?.showModal();
    setOpen(true);
    requestAnimationFrame(() => input.current?.focus());
  };
  const close = () => {
    dialog.current?.close();
    setOpen(false);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dialog.current?.showModal();
        setOpen(true);
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (!open || query.trim().length < 2) {
      setItems([]);
      setState('idle');
      return () => controller.abort();
    }
    setState('loading');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/articles?limit=8&q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error('Search unavailable');
        const rows = await res.json();
        if (!Array.isArray(rows)) throw new Error('Invalid results');
        if (!controller.signal.aborted) {
          setItems(rows);
          setState('done');
        }
      } catch {
        if (!controller.signal.aborted) setState('error');
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);
  return (
    <>
      <button
        className="global-search-trigger"
        type="button"
        aria-label="개발 글 검색"
        onClick={show}
      >
        <BriefIcon name="search" size={18} />
        <span>개발 글 검색</span>
        <kbd>Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="search-dialog"
        aria-label="개발 글 검색"
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="search-dialog-inner">
          <div className="search-dialog-heading">
            <div>
              <h2>어떤 기술이 궁금하세요?</h2>
            </div>
            <button type="button" className="icon-button" aria-label="검색 닫기" onClick={close}>
              <BriefIcon name="close" />
            </button>
          </div>
          <label className="global-search-field">
            <BriefIcon name="search" />
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="기술, 주제, 궁금한 키워드"
              aria-label="전체 개발 글 검색"
            />
          </label>
          <div className="search-results" aria-live="polite">
            {state === 'idle' ? (
              <p className="search-hint">두 글자 이상 입력하면 전체 개발 글에서 찾아드려요.</p>
            ) : state === 'loading' ? (
              <p className="search-hint">관련 글을 찾고 있어요…</p>
            ) : state === 'error' ? (
              <p className="search-hint">검색을 불러오지 못했어요. 잠시 후 다시 입력해 주세요.</p>
            ) : items.length ? (
              <ul>
                {items.map((a) => (
                  <li key={a.id}>
                    <Link href={`/articles/${a.id}`} onClick={close}>
                      <span>{a.source?.name}</span>
                      <strong>{pickTitle(a, lang).primary}</strong>
                      <BriefIcon name="arrow" size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="search-hint">일치하는 글이 없어요. 다른 키워드를 입력해 보세요.</p>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
