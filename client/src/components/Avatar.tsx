import { useLayoutEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  name: string;
}

type Status = 'loading' | 'loaded' | 'failed';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function hue(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

export function Avatar({ src, name }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const imgRef = useRef<HTMLImageElement>(null);

  // A cached image can be complete before React attaches onLoad; check before first paint.
  useLayoutEffect(() => {
    const img = imgRef.current;
    setStatus(img?.complete && img.naturalWidth > 0 ? 'loaded' : 'loading');
  }, [src]);

  return (
    <div
      role="img"
      aria-label={`${name} avatar`}
      className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-semibold text-white"
      style={{ backgroundColor: `hsl(${hue(name)} 55% 45%)` }}
    >
      {initials(name)}
      {status !== 'failed' && (
        <img
          ref={imgRef}
          src={src}
          alt=""
          decoding="async"
          width={56}
          height={56}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('failed')}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
