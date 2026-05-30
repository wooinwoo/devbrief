'use client';

import { createContext, useContext } from 'react';

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
  return (
    <ChatContext.Provider value={{ ask, open, close, isOpen }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue | null {
  return useContext(ChatContext);
}
