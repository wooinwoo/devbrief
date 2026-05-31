'use client';

import { useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { InlineChat, type InlineChatHandle } from '@/components/inline-chat';

export function AdminChatClient() {
  const params = useSearchParams();
  const initial = params.get('q') ?? '';
  const ref = useRef<InlineChatHandle>(null);
  return <InlineChat ref={ref} initialQuery={initial} />;
}
