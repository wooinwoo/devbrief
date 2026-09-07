'use client';
import { useState } from 'react';
export function CoverImage({
  src,
  label,
  variant = 'article',
  priority = false,
}: {
  src?: string | null;
  label: string;
  variant?: 'article' | 'event' | 'video';
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const tone = Array.from(label).reduce((n, c) => n + c.charCodeAt(0), 0) % 3;
  return (
    <div className={`brief-cover brief-cover-${variant}`} data-tone={tone} aria-hidden="true">
      <div className="cover-art">
        <span className="cover-index">
          {variant === 'event' ? '행사 안내' : variant === 'video' ? '발표 영상' : '개발 이야기'}
        </span>
        <span className="cover-label">{label}</span>
        <span className="cover-rule" />
      </div>
      {src && failed !== src && (
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
      )}
    </div>
  );
}
