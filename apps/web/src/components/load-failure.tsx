'use client';

export function LoadFailure({ feeds }: { feeds?: string[] }) {
  return (
    <section
      role="alert"
      className="my-6 rounded-xl border border-(--color-line-strong) bg-(--color-bg-elevated) p-5 sm:p-6"
    >
      <p className="text-base font-semibold text-(--color-fg-strong)">
        {feeds?.length ? `${feeds.join(' · ')} 자료` : '콘텐츠'}를 불러오지 못했어요.
      </p>
      <p className="mt-2 text-sm text-(--color-fg-default)">
        잠시 연결이 원활하지 않아요. 다시 시도해 주세요.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 min-h-11 rounded-lg border border-(--color-line-strong) bg-(--color-bg-base) px-4 text-sm font-semibold text-(--color-fg-strong)"
      >
        다시 시도
      </button>
    </section>
  );
}
