'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CitationGrid, type Citation } from './citation-card';
import { AnswerText } from './answer-text';
import { MOCK_ARTICLES } from '@/lib/mock-articles';

export interface InlineChatHandle {
  ask(text: string): void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

const QUICK_PROMPTS: Array<{ label: string; hint: string; tone: string }> = [
  {
    label: '이번 주 AI 모델 출시 소식만',
    hint: 'GPT-5 / Opus 4.8 / Gemini',
    tone: 'oklch(55% 0.17 60)',
  },
  {
    label: 'Anthropic 관련 최근 글',
    hint: '최근 7일',
    tone: 'oklch(55% 0.17 60)',
  },
  {
    label: '내가 안 본 글 중 핵심만',
    hint: 'unread 우선 큐레이션',
    tone: 'oklch(48% 0.16 160)',
  },
  {
    label: '한국 개발 블로그 핫이슈',
    hint: 'GeekNews · 카카오 · 토스',
    tone: 'oklch(48% 0.16 160)',
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

  function handleCitationClick(msgId: string, index: number) {
    setHighlightCite({ msgId, index });
    const el = document.getElementById(`cite-${index}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightCite(null), 2200);
  }

  async function send(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    const asstId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: asstId, role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('http://localhost:4000/api/v1/chat/stream', {
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
          try {
            const obj = JSON.parse(payload) as { delta?: string; error?: string };
            if (obj.delta) {
              gotAny = true;
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === asstId ? { ...msg, content: msg.content + obj.delta } : msg,
                ),
              );
            }
            if (obj.error) throw new Error(obj.error);
          } catch {
            // ignore
          }
        }
      }
      if (!gotAny) throw new Error('empty stream');
    } catch {
      const citations = buildMockCitations(text);
      const answer = buildMockAnswer(text, citations);
      for (let i = 0; i < answer.length; i += 4) {
        await new Promise((r) => setTimeout(r, 18));
        setMessages((m) =>
          m.map((msg) =>
            msg.id === asstId ? { ...msg, content: answer.slice(0, i + 4) } : msg,
          ),
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
      <p
        className="text-[11px] mb-3 tracking-[0.2em] uppercase"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        오늘 무엇이 궁금하세요?
      </p>

      <form onSubmit={onSubmit}>
        <label htmlFor="inline-chat-input" className="sr-only">
          질문
        </label>
        <div
          className="flex gap-2 rounded-xl px-2 py-2"
          style={{
            border: '1px solid var(--color-line-strong)',
            background:
              'linear-gradient(to right, var(--color-accent-glow), transparent 60%), var(--color-bg-elevated)',
          }}
        >
          <input
            id="inline-chat-input"
            type="text"
            name="query"
            placeholder="자연어로 물어보세요. 예: 이번 주 AI 모델 출시 소식만"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            className="flex-1 bg-transparent outline-none px-3 py-2 text-[15px] disabled:opacity-50"
            style={{ color: 'var(--color-fg-strong)' }}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-4 py-2 text-[13px] rounded-md disabled:opacity-40 transition-colors"
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
        <div className="mt-5">
          <p
            className="text-[10px] mb-3 tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            빠른 질문
          </p>
          <ul className="space-y-1.5">
            {QUICK_PROMPTS.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  onClick={() => send(p.label)}
                  className="group relative w-full text-left pl-3 pr-3 py-2.5 transition-all motion-safe:hover:-translate-y-px"
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--color-line)',
                    background: 'var(--color-bg-base)',
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-2 bottom-2 w-[2px] opacity-50 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: p.tone,
                      boxShadow: `0 0 6px ${p.tone}`,
                    }}
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="text-[14px] transition-colors"
                      style={{ color: 'var(--color-fg-default)' }}
                    >
                      <span className="group-hover:text-(--color-fg-strong)">{p.label}</span>
                    </span>
                    <span
                      className="text-[11px] tracking-wide shrink-0"
                      style={{ color: 'var(--color-fg-subtle)' }}
                    >
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
            className="mt-6 space-y-6 overflow-hidden"
          >
            {messages.map((m) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                className={
                  m.role === 'user' ? 'leading-relaxed' : 'leading-relaxed pl-4 relative'
                }
              >
                {m.role === 'assistant' && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1 bottom-1 w-px"
                    style={{
                      background:
                        'linear-gradient(to bottom, var(--color-accent), transparent 80%)',
                    }}
                  />
                )}
                <p
                  className="text-[10px] mb-1.5 tracking-[0.2em] uppercase"
                  style={{ color: 'var(--color-fg-subtle)' }}
                >
                  {m.role === 'user' ? 'You' : 'Pulse'}
                </p>
                {m.role === 'assistant' && !streaming && m.content ? (
                  <AnswerText
                    text={m.content}
                    onCitationClick={(idx) => handleCitationClick(m.id, idx)}
                  />
                ) : (
                  <p
                    className="whitespace-pre-wrap text-[15px] leading-relaxed"
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
                className="text-[11px] transition-colors"
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
