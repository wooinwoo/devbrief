'use client';

import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'ko' | 'en';
const KEY = 'devbrief.lang';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LangCtx>({ lang: 'ko', setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ko');

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'ko') setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* quota 무시 */
    }
  };

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/**
 * 글의 표시 제목/부제를 언어 설정에 맞게 계산.
 * - ko: 한국어 번역 우선, 부제로 원문
 * - en: 원문 우선, 부제로 한국어 번역
 * 번역이 없는(한국어 소스) 글은 부제 없음.
 */
export function pickTitle(
  article: { title: string; titleKo?: string | null },
  lang: Lang,
): { primary: string; secondary: string | null } {
  const ko = article.titleKo ?? article.title;
  const translated = !!article.titleKo && article.title !== article.titleKo;
  if (!translated) return { primary: article.title, secondary: null };
  return lang === 'en'
    ? { primary: article.title, secondary: article.titleKo! }
    : { primary: ko, secondary: article.title };
}
