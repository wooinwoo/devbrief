'use client';

import { MOCK_ARTICLES } from '@/lib/mock-articles';
import { MOCKS_ENABLED } from '@/lib/mocks-enabled';
import { AnimatePresence, motion } from 'motion/react';
import {
  type FormEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { AnswerText } from './answer-text';
import { type Citation, CitationGrid } from './citation-card';

export interface InlineChatHandle {
  ask(text: string): void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

const QUICK_PROMPTS: Array<{ label: string; hint: string }> = [
  {
    label: '이번 주 AI 모델 출시 소식만',
    hint: '수집된 모델 출시 글',
  },
  {
    label: 'Anthropic 관련 최근 글',
    hint: '최근 7일',
  },
  {
    label: '수집된 글 중 핵심만',
    hint: '주요 내용을 출처와 함께',
  },
  {
    label: '한국 개발 블로그 핫이슈',
    hint: 'GeekNews · 카카오 · 토스',
  },
];

function buildMockCitations(query: string): Citation[] {
  const q = query.toLowerCase();
  return MOCK_ARTICLES.filter((a) => {
    const hay = `${a.title} ${a.summaryOneLine ?? ''} ${a.tags.join(' ')}`.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    return tokens.some((t) => hay.includes(t));
  })
    .slice(0, 4)
    .map((a, i) => ({
      index: i + 1,
      title: a.title,
      url: a.url,
      sourceName: a.source.name,
      sourceProvider: a.source.provider,
      publishedAt: a.publishedAt,
      snippet: a.summaryOneLine ?? undefined,
    }));
}

function buildMockAnswer(query: string, citations: Citation[]): string {
  if (citations.length === 0) {
    return '질문에 해당하는 글을 찾지 못했어요. 다른 키워드로 다시 시도해보세요.';
  }
  const sourceList = citations.map((c) => `[${c.index}]`).join(' ');
  return `요청하신 "${query}" 와 관련해 ${citations.length}개 글을 찾았어요. 핵심만 정리하면 다음과 같습니다 ${sourceList}.\n\n자세한 내용은 아래 출처에서 직접 확인할 수 있습니다.`;
}

interface Props {
  initialQuery?: string;
}

export const InlineChat = forwardRef<InlineChatHandle, Props>(function InlineChat(
  { initialQuery = '' },
  ref,
) {
  const sectionRef = useRef<HTMLElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuery);
  const [streaming, setStreaming] = useState(false);
  const [highlightCite, setHighlightCite] = useState<{ msgId: string; index: number } | null>(null);
  const autoSentRef = useRef(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  function handleCitationClick(msgId: string, index: number) {
    setHighlightCite({ msgId, index });
    const el = document.getElementById(`${msgId}-cite-${index}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightCite(null), 2200);
  }

  async function send(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    const asstId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: asstId, role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      // 어드민 세션 프록시 경유 — 백엔드 chat 은 AdminGuard 로 보호된다.
      const res = await fetch('/api/admin/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      if (!res.ok || !res.body) throw new Error('api unavailable');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let gotAny = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          const payload = part.slice(6).trim();
          if (payload === '[DONE]') continue;
          let obj: { delta?: string; error?: string; citations?: Citation[] };
          try {
            obj = JSON.parse(payload) as {
              delta?: string;
              error?: string;
              citations?: Citation[];
            };
          } catch (err) {
            console.warn('[inline-chat] SSE 파싱 실패, 청크 건너뜀', err, payload);
            continue;
          }
          // 서버 에러는 catch 바깥에서 throw → 폴백 답변으로 전환
          if (obj.error) throw new Error(obj.error);
          // 인용 근거 이벤트 — delta 없이 citations 만 오면 답변으로 치지 않는다(gotAny 미설정).
          if (Array.isArray(obj.citations)) {
            const citations = obj.citations.map((c) => ({
              ...c,
              sourceProvider: c.sourceProvider ?? 'rss_generic',
            }));
            setMessages((m) => m.map((msg) => (msg.id === asstId ? { ...msg, citations } : msg)));
          }
          if (obj.delta) {
            gotAny = true;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === asstId ? { ...msg, content: msg.content + obj.delta } : msg,
              ),
            );
          }
        }
      }
      if (!gotAny) throw new Error('empty stream');
    } catch {
      if (!MOCKS_ENABLED) {
        // 프로덕션: 가짜 답변으로 위장하지 않고 실패를 그대로 알린다.
        setMessages((m) =>
          m.map((msg) =>
            msg.id === asstId
              ? {
                  ...msg,
                  content: '지금은 답변을 가져오지 못했어요. 잠시 후 다시 시도해주세요.',
                  citations: undefined,
                }
              : msg,
          ),
        );
        return;
      }
      const citations = buildMockCitations(text);
      const answer = buildMockAnswer(text, citations);
      for (let i = 0; i < answer.length; i += 4) {
        await new Promise((r) => setTimeout(r, 18));
        setMessages((m) =>
          m.map((msg) => (msg.id === asstId ? { ...msg, content: answer.slice(0, i + 4) } : msg)),
        );
      }
      setMessages((m) => m.map((msg) => (msg.id === asstId ? { ...msg, citations } : msg)));
    } finally {
      setStreaming(false);
    }
  }

  useEffect(() => {
    if (!autoSentRef.current && initialQuery) {
      autoSentRef.current = true;
      send(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useImperativeHandle(ref, () => ({
    ask(text: string) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      send(text);
    },
  }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  const hasConversation = messages.length > 0;

  return (
    <section ref={sectionRef} className="mb-14 scroll-mt-4">
      <h2
        className="text-[20px] font-semibold mb-4 tracking-[-0.02em]"
        style={{ color: 'var(--color-fg-strong)' }}
      >
        오늘 무엇이 궁금하세요?
      </h2>

      <form onSubmit={onSubmit}>
        <label htmlFor="inline-chat-input" className="sr-only">
          질문
        </label>
        <div
          className="flex gap-2 rounded-lg p-2"
          style={{
            border: '1px solid var(--color-line-strong)',
            background: 'var(--color-bg-elevated)',
          }}
        >
          <input
            id="inline-chat-input"
            type="text"
            name="query"
            placeholder="자연어로 물어보세요. 예: 이번 주 AI 모델 출시"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            className="min-w-0 flex-1 bg-transparent outline-none px-3 py-2.5 text-[16px] disabled:opacity-50 placeholder:text-[var(--color-fg-subtle)]"
            style={{ color: 'var(--color-fg-strong)' }}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="shrink-0 min-h-11 px-4 py-2 text-[14px] rounded-md disabled:opacity-40 transition-colors hover:opacity-80"
            style={{
              background: 'var(--color-fg-strong)',
              color: 'var(--bg-base)',
              fontWeight: 500,
            }}
          >
            {streaming ? '응답 중' : '묻기'}
          </button>
        </div>
      </form>

      {!hasConversation && (
        <div className="mt-8">
          <p
            className="text-[14px] mb-3"
            style={{ color: 'var(--color-fg-muted)', fontWeight: 500 }}
          >
            빠른 질문
          </p>
          <ul className="divide-y divide-(--color-line) border-y border-(--color-line)">
            {QUICK_PROMPTS.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  onClick={() => send(p.label)}
                  className="group min-h-11 w-full text-left py-4 transition-colors hover:bg-(--color-bg-sunken)"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span
                      className="text-[16px] transition-colors"
                      style={{ color: 'var(--color-fg-default)', fontWeight: 500 }}
                    >
                      <span className="group-hover:text-(--color-fg-strong)">{p.label}</span>
                    </span>
                    <span className="text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
                      {p.hint}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AnimatePresence>
        {hasConversation && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
            className="mt-8 space-y-8 overflow-hidden"
          >
            {messages.map((m) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                className={
                  m.role === 'user'
                    ? 'leading-relaxed border-b border-(--color-line) pb-5'
                    : 'leading-relaxed'
                }
              >
                <p
                  className="text-[13px] font-semibold mb-3"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  {m.role === 'user' ? 'You' : 'Devbrief'}
                </p>
                {/* [n] 인용 칩은 citations 데이터가 실제로 있을 때만 클릭 가능 — 없으면 플레인 텍스트(죽은 버튼 방지) */}
                {m.role === 'assistant' && !streaming && m.content && m.citations?.length ? (
                  <AnswerText
                    text={m.content}
                    citationIndices={m.citations.map((c) => c.index)}
                    onCitationClick={(idx) => handleCitationClick(m.id, idx)}
                  />
                ) : (
                  <p
                    className="max-w-[75ch] whitespace-pre-wrap text-[16px] leading-[1.8]"
                    style={{
                      color:
                        m.role === 'user' ? 'var(--color-fg-strong)' : 'var(--color-fg-default)',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {m.content || (streaming && m.role === 'assistant' ? '…' : '')}
                    {streaming && m.role === 'assistant' && m.content && (
                      <span
                        aria-hidden
                        className="ml-0.5 inline-block w-1.5 h-4 align-text-bottom"
                        style={{
                          background: 'var(--color-accent)',
                          animation: 'pulse-glow 1.2s ease-in-out infinite',
                        }}
                      />
                    )}
                  </p>
                )}
                {m.citations && m.citations.length > 0 && (
                  <CitationGrid
                    idPrefix={m.id}
                    citations={m.citations}
                    highlightIndex={highlightCite?.msgId === m.id ? highlightCite.index : null}
                  />
                )}
              </motion.li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setMessages([])}
                className="min-h-11 px-3 text-[14px] border border-(--color-line) rounded-md transition-colors hover:bg-(--color-bg-sunken)"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                <span className="hover:text-(--color-fg-default)">대화 지우기</span>
              </button>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
});
