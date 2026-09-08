'use client';
import { useState } from 'react';
export function CoverImage({
  src,
  variant = 'article',
  priority = false,
}: {
  src?: string | null;
  label: string;
  variant?: 'article' | 'event' | 'video';
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return null;

  return (
    <div className={`brief-cover brief-cover-${variant}`} aria-hidden="true">
      <img
        src={src}
        alt=""
        width={960}
        height={600}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(src)}
      />
    </div>
  );
}
