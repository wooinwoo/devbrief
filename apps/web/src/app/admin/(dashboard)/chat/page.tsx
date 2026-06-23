import { Suspense } from 'react';
import { AdminChatClient } from './admin-chat-client';

export default function AdminChatPage() {
  return (
    <div>
      <header className="mb-8">
        <h1
          className="text-[2rem] leading-none tracking-[-0.025em] break-keep mb-2"
          style={{ color: 'var(--color-fg-strong)', fontWeight: 700 }}
        >
          RAG 챗봇
        </h1>
        <p className="text-[13px] max-w-2xl" style={{ color: 'var(--color-fg-muted)' }}>
          수집된 글에 자연어로 질문합니다. 어드민 전용 — 사용자 단가 부담이 크므로 일반 공개는 하지
          않고, 가공된 결과 (트렌드 / 다이제스트) 만 메인에 노출합니다.
        </p>
      </header>

      <Suspense fallback={null}>
        <AdminChatClient />
      </Suspense>
    </div>
  );
}
