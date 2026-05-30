'use client';

import { createContext, useContext, useMemo } from 'react';

interface ChatContextValue {
  ask(text: string): void;
  open(): void;
  close(): void;
  isOpen: boolean;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({
  children,
  ask,
  open,
  close,
  isOpen,
}: {
  children: React.ReactNode;
  ask: (text: string) => void;
  open: () => void;
  close: () => void;
  isOpen: boolean;
}) {
  const value = useMemo(
    () => ({ ask, open, close, isOpen }),
    [ask, open, close, isOpen],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue | null {
  return useContext(ChatContext);
}
