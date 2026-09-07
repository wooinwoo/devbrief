'use client';

import { type Lang, useLang } from '@/lib/lang-context';

const ITEMS: Array<{ value: Lang; label: string }> = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: '원문' },
];

/** 한국어 번역 ⇄ 원문(영문) 전역 토글. */
export function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <div
      className="inline-flex items-center rounded-md border border-(--bar-line) p-0.5"
      role="group"
      aria-label="언어 전환"
    >
      {ITEMS.map((it) => {
        const active = lang === it.value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => setLang(it.value)}
            aria-pressed={active}
            className="min-h-11 min-w-11 px-2.5 py-1.5 rounded-sm text-[12px] transition-colors"
            style={
              active
                ? {
                    background: 'oklch(100% 0 0 / 0.95)',
                    color: 'oklch(22% 0.03 265)',
                    fontWeight: 700,
                  }
                : { color: 'var(--bar-fg-muted)', fontWeight: 600 }
            }
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
