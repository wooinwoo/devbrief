'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  '이번 주 AI 모델 출시 소식 정리해줘',
  'Anthropic 관련 최근 글만',
  '내가 안 본 글 중 핵심만',
  '한국 개발 블로그 핫이슈',
];

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

    try {
      const res = await fetch('http://localhost:4000/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      if (!res.body) throw new Error('No stream body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === asstId
                    ? { ...msg, content: msg.content + obj.delta }
                    : msg,
                ),
              );
            }
            if (obj.error) {
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === asstId
                    ? { ...msg, content: `에러: ${obj.error}` }
                    : msg,
                ),
              );
            }
          } catch {
            // 무시
          }
        }
      }
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === asstId
            ? { ...msg, content: `에러: ${(e as Error).message}` }
            : msg,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  // URL ?q= 로 들어오면 1회 자동 전송
  useEffect(() => {
    if (!autoSentRef.current && initialQuery) {
      autoSentRef.current = true;
      send(initialQuery);
    }
    // initialQuery 만 의존성. send 자체는 안정 함수처럼 동작 (각 호출 독립)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <main className="min-h-screen px-6 sm:px-12 py-12 max-w-3xl mx-auto flex flex-col">
      <header className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 tracking-widest uppercase">Pulse · Chat</p>
          <Link
            href="/"
            className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors tracking-wide"
          >
            ← 오늘의 흐름
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">자연어로 묻기</h1>
        <p className="text-zinc-500 mt-3 text-sm leading-relaxed">
          수집된 글 위에서 답합니다. 본 글과 안 본 글, 출처를 구분해서 보여줍니다.
        </p>
      </header>

      {messages.length === 0 ? (
        <section className="mb-10">
          <p className="text-xs text-zinc-500 mb-3 tracking-wide uppercase">빠른 질문</p>
          <div className="flex flex-col gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className="text-left text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/50 px-4 py-3 rounded-md border border-zinc-900 hover:border-zinc-700 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <ul className="flex-1 space-y-8 mb-10">
          {messages.map((m) => (
            <li
              key={m.id}
              className={
                m.role === 'user'
                  ? 'leading-relaxed text-zinc-100'
                  : 'leading-relaxed text-zinc-300 pl-4 border-l border-zinc-800'
              }
            >
              <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">
                {m.role === 'user' ? 'you' : 'pulse'}
              </p>
              <p className="whitespace-pre-wrap">
                {m.content || (streaming && m.role === 'assistant' ? '…' : '')}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="sticky bottom-6 mt-auto">
        <label htmlFor="chat-input" className="sr-only">
          질문
        </label>
        <div className="flex gap-2 border-t border-zinc-800 pt-4 bg-black/80 backdrop-blur-md">
          <input
            id="chat-input"
            type="text"
            name="query"
            placeholder="질문을 입력하세요"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
            className="flex-1 bg-transparent text-base outline-none border border-zinc-800 rounded-md px-4 py-3 focus:border-zinc-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="px-5 py-3 text-sm font-medium rounded-md bg-zinc-100 text-zinc-900 disabled:opacity-40"
          >
            {streaming ? '응답 중' : '보내기'}
          </button>
        </div>
      </form>
    </main>
  );
}
