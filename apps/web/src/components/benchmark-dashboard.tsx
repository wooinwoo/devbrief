'use client';

import {
  BENCHMARK_MODELS,
  BENCHMARK_SOURCE,
  type BenchModel,
  vendorColor,
  vendorLabel,
} from '@/lib/benchmark-data';
import { useState } from 'react';

type View = 'intelligence' | 'coding' | 'speed' | 'value';

const TABS: Array<{ key: View; label: string }> = [
  { key: 'intelligence', label: '종합 지능' },
  { key: 'coding', label: '코딩 (SWE-bench)' },
  { key: 'speed', label: '출력 속도' },
  { key: 'value', label: '가격 대비 성능' },
];

const VENDORS: BenchModel['vendor'][] = ['claude', 'gpt', 'gemini', 'open'];

export function BenchmarkDashboard() {
  const [view, setView] = useState<View>('intelligence');

  return (
    <section
      className="border-y py-6 sm:py-7"
      style={{
        borderColor: 'var(--color-line-strong)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-baseline justify-between gap-x-5 gap-y-2 flex-wrap mb-5">
        <h2
          className="text-[1.125rem] leading-snug tracking-[-0.015em]"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          LLM 벤치마크
        </h2>
        <a
          href={BENCHMARK_SOURCE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-[12px] leading-relaxed transition-colors hover:text-(--color-accent)"
          style={{ color: 'var(--color-fg-subtle)' }}
        >
          {BENCHMARK_SOURCE.name} · {BENCHMARK_SOURCE.updatedAt} ↗
        </a>
      </div>

      {/* 지표 토글 */}
      <div
        role="group"
        aria-label="벤치마크 지표 선택"
        className="grid grid-cols-2 sm:flex items-center gap-x-2 mb-6 border-b border-(--color-line)"
      >
        {TABS.map((t) => {
          const active = view === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setView(t.key)}
              aria-pressed={active}
              className="min-h-11 px-2 sm:px-3 py-2 border-b-2 text-[12.5px] transition-colors hover:text-(--color-fg-strong)"
              style={
                active
                  ? {
                      borderColor: 'var(--color-accent)',
                      color: 'var(--color-accent-strong)',
                      fontWeight: 600,
                    }
                  : { borderColor: 'transparent', color: 'var(--color-fg-muted)', fontWeight: 500 }
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {view === 'value' ? (
        <ScatterValue />
      ) : (
        <BarMetric metric={view as 'intelligence' | 'speed' | 'coding'} />
      )}
      <p className="text-[12px] leading-relaxed mt-5" style={{ color: 'var(--color-fg-subtle)' }}>
        {view === 'intelligence' &&
          '* Artificial Analysis Intelligence Index (0~100, 높을수록 우수)'}
        {view === 'coding' &&
          '* SWE-bench Verified (% resolved) · 일부 모델만 공개, GPT-5.5는 추정치'}
        {view === 'speed' && '* 출력 속도 중앙값 (tokens/s, 높을수록 빠름)'}
        {view === 'value' && '* 가격: 100만 토큰당 달러, 지능: Intelligence Index'}
      </p>

      {/* 범례 */}
      <div
        className="flex items-center gap-4 flex-wrap mt-5 pt-4 border-t text-[12px]"
        style={{ borderColor: 'var(--color-line)' }}
      >
        {VENDORS.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1.5"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: vendorColor(v) }}
            />
            {vendorLabel(v)}
          </span>
        ))}
      </div>
    </section>
  );
}

function BarMetric({ metric }: { metric: 'intelligence' | 'speed' | 'coding' }) {
  const unit = metric === 'speed' ? ' tok/s' : metric === 'coding' ? '%' : '';
  const data = BENCHMARK_MODELS.filter((m) => m[metric] != null).sort(
    (a, b) => (b[metric] as number) - (a[metric] as number),
  );
  const max = Math.max(...data.map((m) => m[metric] as number));

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((m) => {
        const val = m[metric] as number;
        return (
          <li
            key={m.name}
            className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[160px_minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 items-center"
          >
            <span
              className="text-[12.5px] truncate"
              style={{ color: 'var(--color-fg-default)', fontWeight: 600 }}
              title={m.name}
            >
              {m.name}
            </span>
            <span
              aria-hidden="true"
              className="col-span-2 row-start-2 sm:col-span-1 sm:row-auto h-2 sm:h-3"
              style={{ background: 'var(--color-bg-sunken)', display: 'block' }}
            >
              <span
                className="h-2 sm:h-3 block"
                style={{ width: `${(val / max) * 100}%`, background: vendorColor(m.vendor) }}
              />
            </span>
            <span
              className="row-start-1 col-start-2 sm:col-start-3 text-[12.5px] tabular-nums text-right w-16"
              style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
            >
              {val}
              {unit}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ScatterValue() {
  const data = BENCHMARK_MODELS.filter((m) => m.price != null && m.intelligence != null);
  const W = 640;
  const H = 320;
  const pad = { l: 44, r: 16, t: 16, b: 36 };
  const prices = data.map((m) => m.price as number);
  const ints = data.map((m) => m.intelligence);
  const maxP = Math.max(...prices) * 1.1;
  const minI = Math.min(...ints) - 2;
  const maxI = Math.max(...ints) + 2;
  const x = (p: number) => pad.l + (p / maxP) * (W - pad.l - pad.r);
  const y = (i: number) => H - pad.b - ((i - minI) / (maxI - minI)) * (H - pad.t - pad.b);

  return (
    <div>
      <p className="text-[11.5px] mb-2" style={{ color: 'var(--color-fg-muted)' }}>
        가격은 낮을수록, 지능 지수는 높을수록 좋습니다.
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="hidden sm:block w-full"
        style={{ maxHeight: 340 }}
        role="img"
        aria-label="LLM 가격 대비 성능 산점도. 왼쪽·위일수록 가성비가 좋습니다."
      >
        <title>LLM 가격 대비 성능 산점도</title>
        {/* 축 */}
        <line
          x1={pad.l}
          y1={H - pad.b}
          x2={W - pad.r}
          y2={H - pad.b}
          stroke="var(--color-line-strong)"
          strokeWidth="1"
        />
        <line
          x1={pad.l}
          y1={pad.t}
          x2={pad.l}
          y2={H - pad.b}
          stroke="var(--color-line-strong)"
          strokeWidth="1"
        />
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-fg-subtle)">
          가격 ($/1M tokens)
        </text>
        <text x={12} y={pad.t + 4} fontSize="11" fill="var(--color-fg-subtle)">
          지능
        </text>
        {data.map((m) => (
          <g key={m.name}>
            <circle
              cx={x(m.price as number)}
              cy={y(m.intelligence)}
              r="6"
              fill={vendorColor(m.vendor)}
              opacity="0.85"
            />
            <text
              x={x(m.price as number) + 9}
              y={y(m.intelligence) + 4}
              fontSize="11"
              fill="var(--color-fg-default)"
              fontWeight="600"
            >
              {m.name}
            </text>
          </g>
        ))}
      </svg>
      <table className="w-full table-fixed text-[13px] sm:sr-only">
        <caption className="sr-only">모델별 가격과 지능 지수</caption>
        <thead>
          <tr className="border-b border-(--color-line)">
            <th scope="col" className="w-1/2 text-left py-3">
              모델
            </th>
            <th scope="col" className="text-right py-3">
              가격
            </th>
            <th scope="col" className="text-right py-3">
              지능
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((model) => (
            <tr key={model.name} className="border-b border-(--color-line)">
              <th scope="row" className="text-left font-medium py-3 pr-2">
                {model.name}
              </th>
              <td className="text-right tabular-nums">${model.price}</td>
              <td className="text-right tabular-nums">{model.intelligence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
