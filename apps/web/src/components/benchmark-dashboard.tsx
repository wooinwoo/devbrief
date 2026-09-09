'use client';

import {
  BENCHMARK_FEED_URL,
  BENCHMARK_SNAPSHOT,
  type BenchModel,
  type BenchmarkMetric,
  isBenchmarkStale,
  parseBenchmarkSnapshot,
  selectBenchmarkModels,
  vendorColor,
} from '@/lib/benchmark-data';
import { useEffect, useState } from 'react';

const TABS: Array<{ key: BenchmarkMetric; label: string }> = [
  { key: 'intelligence', label: '종합 지능' },
  { key: 'speed', label: '출력 속도' },
  { key: 'costPerTask', label: '작업당 비용' },
];

export function BenchmarkDashboard() {
  const [snapshot, setSnapshot] = useState(BENCHMARK_SNAPSHOT);
  const [view, setView] = useState<BenchmarkMetric>('intelligence');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    fetch(BENCHMARK_FEED_URL, { signal: controller.signal, credentials: 'omit' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Benchmark feed unavailable');
        const next = parseBenchmarkSnapshot(await response.json());
        if (
          !controller.signal.aborted &&
          Date.parse(next.checkedAt) > Date.parse(BENCHMARK_SNAPSHOT.checkedAt)
        )
          setSnapshot(next);
      })
      .catch(() => {
        /* Keep the last verified snapshot and its original checkedAt. */
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const update = () => setStale(isBenchmarkStale(snapshot.checkedAt));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [snapshot.checkedAt]);

  const data = selectBenchmarkModels(snapshot.models, view, query);
  const visible = data.slice(0, limit);
  return (
    <section
      aria-label="LLM 벤치마크"
      className="border-y border-(--color-line-strong) py-6 sm:py-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-(--color-fg-strong)">
            LLM 벤치마크
          </h2>
          <p className="mt-1 text-sm text-(--color-fg-muted)">
            Intelligence Index v{snapshot.indexVersion}
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <time dateTime={snapshot.checkedAt}>
              {snapshot.checkedAt.slice(0, 10).replaceAll('-', '.')}
            </time>
            {' 확인'}
          </p>
        </div>
        <a
          href={snapshot.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-sm font-medium text-(--color-accent-strong) hover:underline"
        >
          Artificial Analysis 원문 ↗
        </a>
      </div>
      {stale && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-(--color-line-strong) bg-(--color-bg-sunken) px-4 py-3 text-sm text-(--color-fg-default)"
        >
          갱신이 지연되고 있어요. 위 확인일의 자료이며, 최신 수치는 원문에서 확인할 수 있어요.
        </p>
      )}
      <div
        role="group"
        aria-label="벤치마크 지표 선택"
        className="flex flex-wrap gap-1 mb-4 border-b border-(--color-line)"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={view === tab.key}
            onClick={() => {
              setView(tab.key);
              setLimit(10);
            }}
            className="min-h-11 px-3 py-2 border-b-2 text-sm transition-colors"
            style={
              view === tab.key
                ? {
                    borderColor: 'var(--color-accent)',
                    color: 'var(--color-accent-strong)',
                    fontWeight: 700,
                  }
                : { borderColor: 'transparent', color: 'var(--color-fg-muted)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="w-full sm:w-64">
          <span className="sr-only">벤치마크 모델 검색</span>
          <input
            type="search"
            value={query}
            placeholder="모델·개발사 검색"
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(10);
            }}
            className="min-h-11 w-full rounded-lg border border-(--color-line-strong) bg-(--color-bg-elevated) px-3 text-sm text-(--color-fg-default)"
          />
        </label>
        <p className="text-[13px] text-(--color-fg-muted)">
          {view === 'costPerTask'
            ? '비용 낮은 순'
            : view === 'speed'
              ? '출력 빠른 순'
              : '지능 높은 순'}
          {' · '}
          {data.length}개 설정 중 {visible.length}개
        </p>
      </div>
      {visible.length === 0 ? (
        <p role="status" className="py-8 text-center text-sm text-(--color-fg-muted)">
          해당 지표에서 검색 결과가 없어요.
        </p>
      ) : view === 'costPerTask' ? (
        <CostTable models={visible} />
      ) : (
        <BarMetric models={visible} metric={view} />
      )}
      {visible.length < data.length && (
        <button
          type="button"
          onClick={() => setLimit((value) => value + 10)}
          className="mt-5 min-h-11 w-full rounded-lg border border-(--color-line-strong) text-sm font-medium text-(--color-fg-default) hover:bg-(--color-bg-sunken)"
        >
          10개 더 보기
        </button>
      )}
      <div className="mt-5 space-y-1 border-t border-(--color-line) pt-4 text-[13px] leading-relaxed text-(--color-fg-muted)">
        <p>
          {view === 'intelligence' &&
            '종합 지능은 높을수록 우수합니다. 평가 버전이 다른 점수와 직접 비교할 수 없어요.'}
          {view === 'speed' &&
            '출력 속도는 초당 생성 토큰의 중앙값입니다. 답변 시작 전 대기 시간은 포함하지 않아요.'}
          {view === 'costPerTask' &&
            '비용은 종합 지능 평가 작업 1개당 가중 평균 달러(USD)입니다. 100만 토큰당 API 요금과는 달라요.'}
        </p>
        <p>
          모델의 추론 설정별 결과입니다. 불완전한 지능 점수와 미측정 항목은 제외하며, 매일 갱신을
          확인합니다.
        </p>
      </div>
    </section>
  );
}

function ModelLabel({ model }: { model: BenchModel }) {
  const configuration = model.name.match(/^(.*?)\s+(\([^)]*\))$/);
  return (
    <a
      href={`https://artificialanalysis.ai/models/${model.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="min-w-0 text-sm leading-snug hover:underline"
    >
      <span className="block font-semibold text-(--color-fg-default) wrap-break-word">
        {configuration?.[1] ?? model.name}
      </span>
      <span className="mt-0.5 block text-xs leading-relaxed text-(--color-fg-muted) wrap-break-word">
        {model.creator}
        {configuration ? ` · ${configuration[2].slice(1, -1)}` : ''}
      </span>
    </a>
  );
}

function BarMetric({ models, metric }: { models: BenchModel[]; metric: 'intelligence' | 'speed' }) {
  const maximum = Math.max(1, ...models.map((model) => model[metric] ?? 0));
  return (
    <ul
      aria-label={metric === 'intelligence' ? '종합 지능 순위' : '출력 속도 순위'}
      className="flex flex-col gap-3"
    >
      {models.map((model) => (
        <li
          key={model.slug}
          className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(180px,0.8fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-1"
        >
          <ModelLabel model={model} />
          <span
            aria-hidden="true"
            className="col-span-2 row-start-2 sm:col-span-1 sm:row-auto block h-2.5 rounded-sm bg-(--color-bg-sunken)"
          >
            <span
              className="block h-2.5 rounded-sm"
              style={{
                width: `${((model[metric] ?? 0) / maximum) * 100}%`,
                background: vendorColor(model.creator),
              }}
            />
          </span>
          <span className="row-start-1 col-start-2 sm:col-start-3 text-right text-sm font-bold tabular-nums text-(--color-fg-strong)">
            {model[metric]}
            {metric === 'speed' && <span className="ml-1 text-xs font-normal">tok/s</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CostTable({ models }: { models: BenchModel[] }) {
  return (
    <table className="w-full table-fixed text-sm">
      <caption className="sr-only">모델별 작업당 비용과 종합 지능</caption>
      <thead>
        <tr className="border-b border-(--color-line) text-(--color-fg-muted)">
          <th scope="col" className="w-1/2 py-3 text-left font-medium">
            모델
          </th>
          <th scope="col" className="py-3 text-right font-medium">
            작업당 비용
          </th>
          <th scope="col" className="w-1/5 py-3 text-right font-medium">
            지능
          </th>
        </tr>
      </thead>
      <tbody>
        {models.map((model) => (
          <tr key={model.slug} className="border-b border-(--color-line)">
            <th scope="row" className="py-3 pr-3 text-left font-normal">
              <ModelLabel model={model} />
            </th>
            <td className="text-right tabular-nums text-(--color-fg-strong)">
              {model.costPerTask === 0 ? '< $0.01' : '
            </td>
            <td className="text-right tabular-nums">{model.intelligence}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
 + model.costPerTask?.toFixed(2)}
            </td>
            <td className="text-right tabular-nums">{model.intelligence}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
