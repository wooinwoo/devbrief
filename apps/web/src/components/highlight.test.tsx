import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Highlight } from './highlight';

afterEach(cleanup);

describe('Highlight', () => {
  it('query가 비면 원문 그대로, mark 없음', () => {
    const { container } = render(<Highlight text="React 19 출시" query="" />);
    expect(container.textContent).toBe('React 19 출시');
    expect(container.querySelectorAll('mark')).toHaveLength(0);
  });

  it('공백만 있는 query도 강조 안 함', () => {
    const { container } = render(<Highlight text="Next.js" query="   " />);
    expect(container.querySelectorAll('mark')).toHaveLength(0);
  });

  it('매칭 부분을 mark로 감싼다 (대소문자 무시)', () => {
    const { container } = render(<Highlight text="React and react" query="react" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0].textContent).toBe('React');
    expect(marks[1].textContent).toBe('react');
    // 전체 텍스트는 보존
    expect(container.textContent).toBe('React and react');
  });

  it('정규식 특수문자가 든 query도 리터럴로 처리 (escapeRegex)', () => {
    const { container } = render(<Highlight text="a.b.c 와 axbxc" query="a.b" />);
    const marks = container.querySelectorAll('mark');
    // 'a.b'는 'a.b'에만 매칭, 'axb'에는 매칭 안 됨
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('a.b');
  });

  it('매칭 없으면 mark 없이 원문', () => {
    const { container } = render(<Highlight text="Vue" query="React" />);
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.textContent).toBe('Vue');
  });
});
