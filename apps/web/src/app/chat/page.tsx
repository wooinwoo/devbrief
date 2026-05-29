'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { CitationGrid, type Citation } from '@/components/citation-card';
import { MOCK_ARTICLES } from '@/lib/mock-articles';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

const QUICK_PROMPTS = [
  { label: '이번 주 AI 모델 출시 소식 정리해줘', hint: 'GPT-5 / Opus / Gemini' },
  { label: 'Anthropic 관련 최근 글만', hint: '최근 7일' },
  { label: '내가 안 본 글 중 핵심만', hint: 'unread 우선 큐레이션' },
  { label: '한국 개발 블로그 핫이슈', hint: 'GeekNews / 카카오 / 토스' },
];

// Mock RAG: query 내용에 따라 mock 글에서 출처 만들기 (API 미동작 시 시각 검증용)
function buildMockCitations(query: string): Citation[] {
  const q = query.toLowerCase();
  return MOCK_ARTICLES
    .filter((a) => {
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
    return `질문에 해당하는 글을 찾지 못했어요. 다른 키워드로 다시 시도해보세요.`;
  }
  const sourceList = citations.map((c) => `[${c.index}]`).join(' ');
  return `요청하신 "${query}" 와 관련해 ${citations.length}개 글을 찾았어요. 핵심만 정리하면 다음과 같습니다 ${sourceList}.\n\n자세한 내용은 아래 출처에서 직접 확인할 수 있습니다.`;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuery);
  const [streaming, setStreaming] = useState(false);
  const autoSentRef = useRef(false);

  async function send(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    const asstId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: asstId, role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    // 1) 실제 API 시도. 실패하면 mock 답변으로 폴백.
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
            // 무시
          }
        }
      }

      if (!gotAny) throw new Error('empty stream');
    } catch {
      // mock 폴백
      const citations = buildMockCitations(text);
      const answer = buildMockAnswer(text, citations);

      for (let i = 0; i < answer.length; i += 4) {
        await new Promise((r) => setTimeout(r, 18));
        const partial = answer.slice(0, i + 4);
        setMessages((m) =>
          m.map((msg) => (msg.id === asstId ? { ...msg, content: partial } : msg)),
        );
      }

      setMessages((m) =>
        m.map((msg) => (msg.id === asstId ? { ...msg, citations } : msg)),
      );
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <main className="min-h-screen px-6 sm:px-10 lg:px-16 pt-12 pb-32 max-w-4xl mx-auto flex flex-col">
      <header className="mb-12">
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-[11px] tracking-[0.25em] uppercase"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            Pulse · Chat
          </p>
          <Link
            href="/"
            className="text-[12px] tracking-wide transition-colors"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            <span className="hover:text-(--color-fg-strong) transition-colors">
              ← 오늘의 흐름
            </span>
          </Link>
        </div>
        <h1
          className="text-[2rem] sm:text-[2.5rem] leading-[1.15] tracking-[-0.01em]"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 500 }}
        >
          자연어로 묻기
        </h1>
        <p
          className="mt-4 text-[14px] leading-relaxed max-w-xl"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          수집된 글 30개 위에서 답합니다. 본 글, 안 본 글, 출처를 구분해 보여줍니다.
        </p>
      </header>

      {messages.length === 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className="mb-12"
        >
          <p
            className="text-[11px] mb-4 tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-fg-subtle)' }}
          >
            빠른 질문
          </p>
          <ul className="space-y-1">
            {QUICK_PROMPTS.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  onClick={() => send(p.label)}
                  className="w-full group flex items-baseline gap-4 text-left py-3.5 px-1 transition-colors"
                  style={{ borderBottom: '1px solid var(--color-line)' }}
                >
                  <span
                    className="text-[15px] flex-1 transition-colors"
                    style={{ color: 'var(--color-fg-default)' }}
                  >
                    <span className="group-hover:text-(--color-fg-strong)">{p.label}</span>
                  </span>
                  <span
                    className="text-[11px] tracking-wide transition-colors opacity-60 group-hover:opacity-100"
                    style={{ color: 'var(--color-fg-subtle)' }}
                  >
                    {p.hint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </motion.section>
      ) : (
        <ul className="flex-1 space-y-10 mb-12">
          {messages.map((m) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              className={
                m.role === 'user'
                  ? 'leading-relaxed'
                  : 'leading-relaxed pl-5 relative'
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
                className="text-[11px] mb-2 tracking-[0.2em] uppercase"
                style={{ color: 'var(--color-fg-subtle)' }}
              >
                {m.role === 'user' ? 'You' : 'Pulse'}
              </p>
              <p
                className="whitespace-pre-wrap text-[15px]"
                style={{
                  color: m.role === 'user' ? 'var(--color-fg-strong)' : 'var(--color-fg-default)',
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
              {m.citations && m.citations.length > 0 && <CitationGrid citations={m.citations} />}
            </motion.li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="sticky bottom-6 mt-auto">
        <label htmlFor="chat-input" className="sr-only">
          질문
        </label>
        <div
          className="flex gap-2 pt-4 backdrop-blur-md"
          style={{
            borderTop: '1px solid var(--color-line)',
            background: 'oklch(13% 0.005 250 / 0.85)',
          }}
        >
          <input
            id="chat-input"
            type="text"
            name="query"
            placeholder="질문을 입력하세요"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            className="flex-1 bg-transparent text-base outline-none rounded-md px-4 py-3 disabled:opacity-50"
            style={{ border: '1px solid var(--color-line)', color: 'var(--color-fg-strong)' }}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-5 py-3 text-sm rounded-md disabled:opacity-40 transition-colors"
            style={{
              background: 'var(--color-fg-strong)',
              color: 'var(--bg-base)',
              fontWeight: 500,
            }}
          >
            {streaming ? '응답 중' : '보내기'}
          </button>
        </div>
      </form>
    </main>
  );
}
