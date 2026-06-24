import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilterSidebar } from './filter-sidebar';

afterEach(cleanup);

describe('FilterSidebar 검색 키보드', () => {
  it('검색 input 은 label 과 연결된 search 타입이다', () => {
    const { getByLabelText } = render(
      <FilterSidebar
        groups={[]}
        search={{ value: '', onChange: () => {}, placeholder: '글 검색' }}
      />,
    );
    const input = getByLabelText('글 검색') as HTMLInputElement;
    expect(input.type).toBe('search');
  });

  it('Esc 키로 검색어를 비우고 onChange("") 를 호출한다', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <FilterSidebar groups={[]} search={{ value: '리액트', onChange }} />,
    );
    const input = getByLabelText('검색') as HTMLInputElement;
    expect(input.value).toBe('리액트');

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input.value).toBe('');
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('입력값이 없으면 Esc 가 onChange 를 호출하지 않는다 (다른 Esc 동작 방해 X)', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <FilterSidebar groups={[]} search={{ value: '', onChange }} />,
    );
    const input = getByLabelText('검색') as HTMLInputElement;

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('Enter 제출 시 현재 입력값으로 onChange 를 호출한다', () => {
    const onChange = vi.fn();
    const { getByLabelText, container } = render(
      <FilterSidebar groups={[]} search={{ value: '', onChange }} />,
    );
    const input = getByLabelText('검색') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'nextjs' } });

    const form = container.querySelector('form[role="search"]') as HTMLFormElement;
    fireEvent.submit(form);

    expect(onChange).toHaveBeenLastCalledWith('nextjs');
  });
});

describe('FilterSidebar 필터 버튼 키보드', () => {
  it('필터 옵션은 표준 button(aria-pressed) 으로 키보드 도달 가능하다', () => {
    const onSelect = vi.fn();
    const { getByRole } = render(
      <FilterSidebar
        groups={[
          {
            key: 'source',
            label: '소스',
            active: null,
            onSelect,
            options: [{ value: 'hn', label: 'Hacker News' }],
          },
        ]}
      />,
    );
    const btn = getByRole('button', { name: /Hacker News/ });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith('hn');
  });
});
