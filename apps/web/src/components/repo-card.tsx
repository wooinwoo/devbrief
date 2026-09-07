'use client';
import type { RepoDto } from '@/lib/mock-repos';
import { BriefIcon } from './brief-icon';
const CATEGORY_LABEL: Record<string, string> = {
  ai: 'AI',
  web: '웹',
  infra: '인프라',
  cli: 'CLI',
  data: '데이터',
  etc: '기타',
};
function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}
export function RepoCard({ repo: r }: { repo: RepoDto }) {
  const periodLabel = r.period === 'weekly' ? '이번 주' : '오늘';
  return (
    <li className="repo-card">
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="repo-card-link"
        aria-label={`${r.fullName}${r.language ? `, ${r.language}` : ''} — ${periodLabel} 스타 ${r.periodStars.toLocaleString()} 증가, 총 ${r.stars.toLocaleString()} 스타. GitHub에서 새 탭으로 열기`}
      >
        <div className="repo-card-heading">
          <div className="repo-identity">
            <span className="repo-owner">{r.owner}/</span>
            <h3>{r.name}</h3>
          </div>
          <span className="repo-open" aria-hidden="true">
            <BriefIcon name="external" size={21} />
          </span>
        </div>
        <p className="repo-description">
          {r.description || '프로젝트의 자세한 내용은 GitHub에서 확인하세요.'}
        </p>
        <div className="repo-labels">
          {r.language && (
            <span>
              <span
                className="repo-language-dot"
                aria-hidden="true"
                style={{ background: r.languageColor ?? 'var(--fg-muted)' }}
              />
              {r.language}
            </span>
          )}
          <span>{CATEGORY_LABEL[r.category] ?? '기타'}</span>
        </div>
        <div className="repo-card-bottom">
          <div className="repo-growth">
            <span>{periodLabel} 스타 증가</span>
            <strong>
              <BriefIcon name="trending" size={20} />+{r.periodStars.toLocaleString()}
            </strong>
          </div>
          <div className="repo-totals">
            <span title={`총 스타 ${r.stars.toLocaleString()}개`}>
              <BriefIcon name="star" size={16} />
              {fmtK(r.stars)}
            </span>
            <span>포크 {fmtK(r.forks)}</span>
          </div>
        </div>
      </a>
    </li>
  );
}
