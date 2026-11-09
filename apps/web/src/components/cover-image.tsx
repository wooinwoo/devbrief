'use client';
import { useState } from 'react';

// dev.to serves feed covers at 1200px; cards show them around 460px wide.
const DEV_TO_IMAGE =
  /^(https:\/\/media\d*\.dev\.to\/dynamic\/image\/width=)(\d+)((?:,|%2C)height=)(\d*)/i;

function devToSrcSet(src: string): string | undefined {
  const match = DEV_TO_IMAGE.exec(src);
  if (!match) return undefined;
  const [prefix, head, width, sep, height] = match;
  const original = Number(width);
  if (original <= 640) return undefined;
  const small = height ? String(Math.round((Number(height) * 640) / original)) : '';
  return `${head}640${sep}${small}${src.slice(prefix.length)} 640w, ${src} ${original}w`;
}
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
        srcSet={devToSrcSet(src)}
        sizes="(max-width: 768px) 100vw, 480px"
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
