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
          {/* dim overlay (모바일에서만 보임 — 데스크톱은 transparent) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:bg-transparent lg:backdrop-blur-none"
            onClick={() => chat?.close()}
          />

          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
            className="fixed z-50 top-0 right-0 bottom-0 w-full sm:w-[420px] lg:w-[400px] flex flex-col"
            style={{
              background: 'var(--color-bg-elevated)',
              borderLeft: '1px solid var(--color-line)',
              boxShadow: '-20px 0 40px -20px oklch(0% 0 0 / 0.15)',
            }}
            role="dialog"
            aria-label="Pulse 챗봇"
          >
            <header
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--color-line)' }}
            >
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
                  className="text-[11px] tracking-[0.2em] uppercase"
                  style={{ color: 'var(--color-fg-muted)' }}
                >
                  Pulse 챗봇
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
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              <ChatPanel ref={ref} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});
