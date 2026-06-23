'use client';

import { InlineChat, type InlineChatHandle } from '@/components/inline-chat';
import { useSearchParams } from 'next/navigation';
import { useRef } from 'react';

export function AdminChatClient() {
  const params = useSearchParams();
  const initial = params.get('q') ?? '';
  const ref = useRef<InlineChatHandle>(null);
  return <InlineChat ref={ref} initialQuery={initial} />;
}
