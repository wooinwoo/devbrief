'use client';

import { forwardRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChatPanel } from './chat-panel';
import { type InlineChatHandle } from './inline-chat';
import { useChat } from './chat-context';

export const ChatDrawer = forwardRef<InlineChatHandle>(function ChatDrawer(_, ref) {
  const chat = useChat();
  const isOpen = chat?.isOpen ?? false;

  // ESC 로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') chat?.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, chat]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* dim overlay (메인 콘텐츠 살짝 fade) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 cursor-pointer"
            style={{
              background: 'oklch(15% 0.01 245 / 0.18)',
              backdropFilter: 'blur(2px)',
            }}
            onClick={() => chat?.close()}
          />

          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
            className="fixed z-50 top-0 right-0 bottom-0 w-full sm:w-[440px] lg:w-[480px] xl:w-[520px]"
            style={{
              boxShadow: '-30px 0 60px -20px oklch(15% 0.01 245 / 0.22)',
            }}
            role="dialog"
            aria-label="Pulse 챗봇"
          >
            <div
              className="flex flex-col h-full w-full"
              style={{
                background: 'oklch(100% 0 0)',
                borderLeft: '1px solid var(--color-line)',
              }}
            >
            <header
              className="px-7 pt-7 pb-5"
              style={{ borderBottom: '1px solid var(--color-line)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block w-1.5 h-1.5 rounded-full pulse-bar"
                    style={{
                      background: 'var(--color-accent)',
                      boxShadow: '0 0 8px var(--color-accent)',
                    }}
                  />
                  <p
                    className="text-[10px] tracking-[0.25em] uppercase"
                    style={{ color: 'var(--color-fg-subtle)' }}
                  >
                    Pulse · Chat
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => chat?.close()}
                  aria-label="닫기"
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <path
                      d="M4 4L14 14M14 4L4 14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <h2
                className="text-[1.625rem] leading-tight tracking-[-0.01em]"
                style={{ color: 'var(--color-fg-strong)', fontWeight: 500 }}
              >
                자연어로 묻기
              </h2>
              <p
                className="text-[13px] mt-1.5 leading-relaxed"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                수집된 글 위에서 답합니다. 본 글 / 안 본 글 / 출처를 구분해서요.
              </p>
            </header>

            <div className="flex-1 overflow-y-auto px-7 py-6">
              <ChatPanel ref={ref} />
            </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});
