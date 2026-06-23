import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Pagination } from './pagination';

afterEach(cleanup);

describe('Pagination', () => {
  it('totalPages <= 1 이면 렌더하지 않음', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('적은 페이지는 모두 노출 (생략 없음)', () => {
    const { container } = render(<Pagination page={1} totalPages={3} onChange={() => {}} />);
    // 숫자 버튼 1,2,3
    const labels = [...container.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).toContain('1');
    expect(labels).toContain('2');
    expect(labels).toContain('3');
    expect(container.textContent).not.toContain('…');
  });

  it('현재 페이지에 aria-current="page"', () => {
    const { container } = render(<Pagination page={2} totalPages={5} onChange={() => {}} />);
    const current = container.querySelector('[aria-current="page"]');
    expect(current?.textContent).toBe('2');
  });

  it('멀리 떨어진 페이지는 … 으로 생략', () => {
    const { container } = render(<Pagination page={5} totalPages={20} onChange={() => {}} />);
    // 1 … 4 5 6 … 20 형태 → … 두 개
    expect(container.textContent).toContain('…');
    const labels = [...container.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).toContain('1');
    expect(labels).toContain('20');
    expect(labels).toContain('5');
    expect(labels).not.toContain('10');
  });

  it('이전 버튼은 첫 페이지에서 비활성', () => {
    const { container } = render(<Pagination page={1} totalPages={5} onChange={() => {}} />);
    const prev = container.querySelector('[aria-label="이전 페이지"]') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it('다음 버튼은 마지막 페이지에서 비활성', () => {
    const { container } = render(<Pagination page={5} totalPages={5} onChange={() => {}} />);
    const next = container.querySelector('[aria-label="다음 페이지"]') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it('페이지 번호 클릭 시 onChange(번호) 호출', () => {
    const onChange = vi.fn();
    // page=2 → 1 2 3 … 5 (현재±1이 보임)
    const { container } = render(<Pagination page={2} totalPages={5} onChange={onChange} />);
    const three = [...container.querySelectorAll('button')].find((b) => b.textContent === '3');
    expect(three).toBeDefined();
    fireEvent.click(three as HTMLButtonElement);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('다음 버튼 클릭 시 onChange(page+1)', () => {
    const onChange = vi.fn();
    const { container } = render(<Pagination page={2} totalPages={5} onChange={onChange} />);
    const next = container.querySelector('[aria-label="다음 페이지"]') as HTMLButtonElement;
    fireEvent.click(next);
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
