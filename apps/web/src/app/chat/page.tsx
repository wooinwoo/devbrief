import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function ChatRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q;
  if (q) {
    redirect(`/?q=${encodeURIComponent(q)}#chat`);
  }
  redirect('/');
}
