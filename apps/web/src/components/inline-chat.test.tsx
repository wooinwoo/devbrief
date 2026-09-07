import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/lib/mocks-enabled', () => ({
  get MOCKS_ENABLED() {
    return mockState.enabled;
  },
}));

import { InlineChat } from './inline-chat';

/** SSE 이벤트 문자열들을 순서대로 흘려주는 가짜 Response */
function sseResponse(events: string[]): Response {
  const enc = new TextEncoder();
  let i = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () =>
          i < events.length
            ? { done: false, value: enc.encode(events[i++]) }
            : { done: true, value: undefined },
      }),
    },
  } as unknown as Response;
}

function ask(container: HTMLElement, query: string) {
  const input = container.querySelector('#inline-chat-input') as HTMLInputElement;
  fireEvent.change(input, { target: { value: query } });
  const form = container.querySelector('form') as HTMLFormElement;
  fireEvent.submit(form);
}

/**
 * send() 가 완전히 끝날 때까지 대기 — 스트리밍 중 입력이 disabled 라 이걸 기준으로 삼는다.
 * 텍스트 등장만 기다리고 테스트를 끝내면 send() 의 잔여 finally(setState)가
 * jsdom 티어다운 이후에 실행돼 unhandled rejection 이 난다.
 */
async function waitForIdle(container: HTMLElement) {
  await waitFor(() => {
    const input = container.querySelector('#inline-chat-input') as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  mockState.enabled = false;
});

describe('InlineChat 인용 칩 (c59)', () => {
  it('citations 데이터가 없으면 [n] 은 클릭 칩이 아닌 플레인 텍스트로 렌더한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          sseResponse(['data: {"delta":"근거는 [1] 입니다."}\n\n', 'data: [DONE]\n\n']),
        ),
    );
    const { container, queryByRole } = render(<InlineChat />);
    ask(container, '테스트 질문');
    await waitFor(() => {
      expect(container.textContent).toContain('근거는 [1] 입니다.');
    });
    // 죽은 버튼 방지: 인용 근거가 없으므로 [1] 칩 버튼이 없어야 한다
    expect(queryByRole('button', { name: '출처 1 보기' })).toBeNull();
    await waitForIdle(container);
  });

  it('스트림으로 citations 이벤트가 오면 [n] 칩이 클릭 가능해지고 출처 그리드가 렌더된다', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'data: {"citations":[{"index":1,"title":"인용 글 제목","url":"https://example.com","sourceName":"출처","publishedAt":"2026-07-01T00:00:00Z"}]}\n\n',
            'data: {"delta":"근거는 [1] 입니다."}\n\n',
            'data: [DONE]\n\n',
          ]),
        ),
    );
    const { container, getByRole, getByText } = render(<InlineChat />);
    ask(container, '테스트 질문');
    await waitFor(() => {
      expect(getByRole('button', { name: '출처 1 보기' })).toBeTruthy();
    });
    expect(getByText('인용 글 제목')).toBeTruthy();
    await waitForIdle(container);
  });
});

describe('InlineChat mock 폴백 격리 (c75 연계)', () => {
  it('프로덕션: API 실패 시 가짜 답변 대신 실패 안내를 보여준다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const { container } = render(<InlineChat />);
    ask(container, '테스트 질문');
    await waitFor(() => {
      expect(container.textContent).toContain('지금은 답변을 가져오지 못했어요');
    });
    // mock 인용 카드가 붙지 않아야 한다
    expect(container.textContent).not.toContain('출처');
    await waitForIdle(container);
  });

  it('개발(MOCKS_ENABLED): API 실패 시 기존 mock 폴백 답변을 유지한다', async () => {
    mockState.enabled = true;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const { container } = render(<InlineChat />);
    // mock 글과 매칭되지 않는 질문 → 짧은 폴백 문구
    ask(container, 'zzzz');
    await waitFor(
      () => {
        expect(container.textContent).toContain('질문에 해당하는 글을 찾지 못했어요');
      },
      { timeout: 3000 },
    );
    await waitForIdle(container);
  });
});

describe('InlineChat 출처 연결 회귀', () => {
  it('후속 답변의 인용은 자기 출처로 이동하고 없는 번호는 버튼이 되지 않는다', async () => {
    const response = () =>
      sseResponse([
        `data: ${JSON.stringify({ citations: [{ index: 1, title: '근거 글', url: 'https://example.com/article', sourceName: '출처', sourceProvider: 'rss_generic', publishedAt: '2026-07-01T00:00:00Z' }] })}\n\n`,
        'data: {"delta":"근거 [1], 알 수 없는 번호 [99]."}\n\n',
        'data: [DONE]\n\n',
      ]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => response()),
    );
    const { container, getAllByRole, queryByRole } = render(<InlineChat />);
    ask(container, '첫 질문');
    await waitForIdle(container);
    ask(container, '두 번째 질문');
    await waitForIdle(container);

    const cards = Array.from(container.querySelectorAll<HTMLElement>('li[id$="-cite-1"]'));
    expect(cards).toHaveLength(2);
    expect(new Set(cards.map((card) => card.id)).size).toBe(2);
    const firstScroll = vi.fn();
    const secondScroll = vi.fn();
    cards[0].scrollIntoView = firstScroll;
    cards[1].scrollIntoView = secondScroll;
    fireEvent.click(getAllByRole('button', { name: '출처 1 보기' })[1]);
    expect(secondScroll).toHaveBeenCalled();
    expect(firstScroll).not.toHaveBeenCalled();
    expect(queryByRole('button', { name: '출처 99 보기' })).toBeNull();
    expect(getAllByRole('link')[1].getAttribute('href')).toBe('https://example.com/article');
  });

  it('출처 수신 뒤 스트림이 실패하면 불완전한 답변과 출처를 지운다', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'data: {"citations":[{"index":1,"title":"부분 출처","url":"https://example.com","sourceName":"출처","publishedAt":"2026-07-01T00:00:00Z"}]}\n\n',
            'data: {"delta":"작성 중 [1]"}\n\n',
            'data: {"error":"일시적 오류가 발생했습니다."}\n\n',
          ]),
        ),
    );
    const { container, queryByRole } = render(<InlineChat />);
    ask(container, '질문');
    await waitForIdle(container);
    expect(container.textContent).toContain('지금은 답변을 가져오지 못했어요');
    expect(container.textContent).not.toContain('작성 중');
    expect(queryByRole('link')).toBeNull();
  });
});
