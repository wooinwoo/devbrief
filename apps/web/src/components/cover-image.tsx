'use client';
import { useState } from 'react';
import { preload } from 'react-dom';

// dev.to serves feed covers at 1200px; cards show them around 460px wide.
const DEV_TO_IMAGE =
  /^(https:\/\/media\d*\.dev\.to\/dynamic\/image\/width=)(\d+)((?:,|%2C)height=)(\d*)/i;

function devToSrcSet(src: string): string | undefined {
  const match = DEV_TO_IMAGE.exec(src);
  if (!match) return undefined;
  const [prefix, head, width, sep, height] = match;
  const original = Number(width);
  const widths = [480, 640, 800].filter((w) => w < original);
  if (widths.length === 0) return undefined;
  const rest = src.slice(prefix.length);
  const resized = widths.map((w) => {
    const h = height ? String(Math.round((Number(height) * w) / original)) : '';
    return `${head}${w}${sep}${h}${rest} ${w}w`;
  });
  return [...resized, `${src} ${original}w`].join(', ');
}

// 휴대폰에서는 표지가 본문 폭(화면 - 좌우 여백 40px) 안에 들어간다. 100vw로 두면 한 단계 큰 사진을 받는다.
const SIZES = '(max-width: 639px) calc(100vw - 40px), (max-width: 768px) 100vw, 480px';

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
  const srcSet = devToSrcSet(src);
  // 첫 화면 표지는 <head>에서 미리 받아, 본문 HTML을 다 읽기 전에 내려받기를 시작한다.
  if (priority)
    preload(src, {
      as: 'image',
      imageSrcSet: srcSet,
      imageSizes: SIZES,
      fetchPriority: 'high',
      referrerPolicy: 'no-referrer',
    });

  return (
    <div className={`brief-cover brief-cover-${variant}`} aria-hidden="true">
      <img
        src={src}
        srcSet={srcSet}
        sizes={SIZES}
        alt=""
        width={960}
        height={600}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(src)}
      />
    </div>
  );
}
