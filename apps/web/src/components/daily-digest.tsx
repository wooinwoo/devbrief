'use client';

import Link from 'next/link';

interface DigestItem {
  articleId: string;
  headline: string;
  takeaway: string;
}

export interface DigestDto {
  date: string;
  intro: string | null;
  items: DigestItem[];
}

/** 수집된 당일 다이제스트를 제목과 핵심 내용 중심으로 읽는다. */
export function DailyDigest({ digest }: { digest: DigestDto | null }) {
  if (!digest?.items.length) return null;
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-5 pb-3 border-b border-(--color-line-strong)">
        <h2 className="text-xl font-semibold leading-snug tracking-[-0.02em] text-(--color-fg-strong)">
          오늘의 핵심
        </h2>
        <span className="text-xs tabular-nums text-(--color-fg-muted)">{digest.items.length}</span>
      </div>
      {digest.intro && (
        <p className="mb-5 max-w-[68ch] text-base leading-relaxed text-(--color-fg-default)">
          {digest.intro}
        </p>
      )}
      <ol className="grid md:grid-cols-2 gap-x-10">
        {digest.items.map((item) => (
          <li key={item.articleId} className="border-b border-(--color-line)">
            <Link href={`/articles/${item.articleId}`} className="group block py-5">
              <h3 className="text-base font-semibold leading-snug text-(--color-fg-strong) group-hover:underline underline-offset-4">
                {item.headline}
              </h3>
              {item.takeaway && (
                <p className="mt-2 text-sm leading-relaxed text-(--color-fg-muted)">
                  {item.takeaway}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
