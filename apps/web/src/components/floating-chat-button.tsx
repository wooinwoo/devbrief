'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useChat } from './chat-context';

export function FloatingChatButton() {
  const chat = useChat();
  if (!chat) return null;
  return (
    <AnimatePresence>
      {!chat.isOpen && (
        <motion.button
          type="button"
          onClick={() => chat.open()}
          initial={{ opacity: 0, y: 12, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.92 }}
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
          className="fixed z-30 bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-full"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-line-strong)',
            boxShadow:
              '0 14px 28px -12px oklch(0% 0 0 / 0.18), 0 6px 12px -6px oklch(0% 0 0 / 0.12)',
            color: 'var(--color-fg-strong)',
          }}
          aria-label="Pulse 챗봇 열기"
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full pulse-bar"
            style={{
              background: 'var(--color-accent)',
              boxShadow: '0 0 10px var(--color-accent)',
            }}
          />
          <span className="text-[13px] tracking-wide">묻기</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
