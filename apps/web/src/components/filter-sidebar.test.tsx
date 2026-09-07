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

describe('SearchField 외부 value 동기화 (디바운스 에코)', () => {
  it('trim 만 다른 에코 value 는 입력 중 draft(후행 공백)를 되덮지 않는다', () => {
    const onChange = vi.fn();
    const { getByLabelText, rerender } = render(
      <FilterSidebar groups={[]} search={{ value: '', onChange }} />,
    );
    const input = getByLabelText('검색') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'react ' } });
    expect(input.value).toBe('react ');

    // 디바운스가 trim 된 값을 URL 에 반영하고 value prop 으로 되돌아온 상황(에코)
    rerender(<FilterSidebar groups={[]} search={{ value: 'react', onChange }} />);

    // 후행 공백이 지워지면 이어서 치는 단어가 "reacthooks" 처럼 붙어버린다.
    expect(input.value).toBe('react ');
  });

  it('진짜 외부 변경(URL 복원/뒤로가기 등)은 draft 에 반영된다', () => {
    const onChange = vi.fn();
    const { getByLabelText, rerender } = render(
      <FilterSidebar groups={[]} search={{ value: 'react', onChange }} />,
    );
    const input = getByLabelText('검색') as HTMLInputElement;

    rerender(<FilterSidebar groups={[]} search={{ value: 'vue', onChange }} />);

    expect(input.value).toBe('vue');
  });

  it('외부에서 빈 값으로 초기화하면 draft 도 비워진다', () => {
    const onChange = vi.fn();
    const { getByLabelText, rerender } = render(
      <FilterSidebar groups={[]} search={{ value: 'react', onChange }} />,
    );
    const input = getByLabelText('검색') as HTMLInputElement;

    rerender(<FilterSidebar groups={[]} search={{ value: '', onChange }} />);

    expect(input.value).toBe('');
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
