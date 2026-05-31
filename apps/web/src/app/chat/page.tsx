import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

// 사용자 단가 부담으로 챗봇은 어드민 전용. /chat 진입은 /admin/chat 으로 우회.
export default async function ChatRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q;
  redirect(q ? `/admin/chat?q=${encodeURIComponent(q)}` : '/admin/chat');
}
