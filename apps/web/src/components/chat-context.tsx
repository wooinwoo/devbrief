'use client';

import { createContext, useContext } from 'react';

interface ChatContextValue {
  ask(text: string): void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({
  children,
  ask,
}: {
  children: React.ReactNode;
  ask: (text: string) => void;
}) {
  return <ChatContext.Provider value={{ ask }}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue | null {
  return useContext(ChatContext);
}
