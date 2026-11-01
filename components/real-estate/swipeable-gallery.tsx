'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwipeableGalleryProps {
  images: string[];
  alt: string;
  aspectClass: string;
  onOpen: () => void;
  priority?: boolean;
}

export function SwipeableGallery({ images, alt, aspectClass, onOpen, priority = false }: SwipeableGalleryProps) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideWidth = containerRef.current?.clientWidth ?? 1;
  const count = images.length;

  const goTo = useCallback((i: number) => setIndex(Math.max(0, Math.min(count - 1, i))), [count]);

  const onPointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startXRef.current);
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    const threshold = slideWidth * 0.18;
    if (dragX < -threshold && index < count - 1) setIndex(index + 1);
    else if (dragX > threshold && index > 0) setIndex(index - 1);
    setDragX(0);
    setIsDragging(false);
  };

  useEffect(() => {
    setIndex(0);
  }, [images]);

  const translateX = -index * slideWidth + dragX;
  const showArrows = count > 1;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${aspectClass} cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onOpen}
    >
      <div
        className="flex h-full will-change-transform"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        {images.map((src, i) => (
          <div key={i} className="relative h-full w-full shrink-0" style={{ flex: `0 0 ${slideWidth}px` }}>
            <Image
              src={src}
              alt={`${alt} — görsel ${i + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              priority={priority && i === 0}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          {index > 0 && (
            <button
              type="button"
              aria-label="Önceki fotoğraf"
              onClick={(e) => { e.stopPropagation(); goTo(index - 1); }}
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {index < count - 1 && (
            <button
              type="button"
              aria-label="Sonraki fotoğraf"
              onClick={(e) => { e.stopPropagation(); goTo(index + 1); }}
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </>
      )}

      {count > 1 && (
        <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/45'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
