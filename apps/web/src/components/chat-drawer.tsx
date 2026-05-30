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
          {/* 외부 클릭으로 닫기 위한 transparent overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={() => chat?.close()}
          />

          {/* floating button 위에 anchored 모달 */}
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="fixed z-50 bottom-24 right-6 sm:right-8 w-[min(420px,calc(100vw-32px))] origin-bottom-right"
            style={{
              height: 'min(640px, calc(100vh - 140px))',
              transformOrigin: 'bottom right',
            }}
            role="dialog"
            aria-label="Pulse 챗봇"
          >
            <div
              className="flex flex-col h-full w-full overflow-hidden"
              style={{
                background: 'oklch(100% 0 0)',
                border: '1px solid var(--color-line)',
                borderRadius: 16,
                boxShadow:
                  '0 24px 48px -16px oklch(15% 0.01 245 / 0.22), 0 12px 24px -12px oklch(15% 0.01 245 / 0.12)',
              }}
            >
              <header
                className="px-6 pt-5 pb-4 shrink-0"
                style={{ borderBottom: '1px solid var(--color-line)' }}
              >
                <div className="flex items-center justify-between mb-2">
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
                    className="p-1 rounded-md transition-colors"
                    style={{ color: 'var(--color-fg-muted)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
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
                  className="text-[1.25rem] leading-tight tracking-[-0.01em]"
                  style={{ color: 'var(--color-fg-strong)', fontWeight: 500 }}
                >
                  자연어로 묻기
                </h2>
                <p
                  className="text-[12px] mt-1 leading-relaxed"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  수집된 글 위에서 답합니다.
                </p>
              </header>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <ChatPanel ref={ref} />
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});
