import { useState, useEffect, useCallback } from 'react';
import { cn } from '../lib/utils';

interface BackgroundGalleryProps {
  images: string[];
  intervalMs?: number;
}

export function BackgroundGallery({ images, intervalMs = 20_000 }: BackgroundGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(1 % images.length);
  const [fading, setFading] = useState(false);

  const advance = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setCurrent(c => (c + 1) % images.length);
      setNext(n => (n + 1) % images.length);
      setFading(false);
    }, 1000);
  }, [images.length]);

  useEffect(() => {
    const id = setInterval(advance, intervalMs);
    return () => clearInterval(id);
  }, [advance, intervalMs]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Current image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${images[current]})`,
          opacity: fading ? 0 : 1,
        }}
      />
      {/* Next image preloaded beneath */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${images[next]})`,
          opacity: fading ? 1 : 0,
          transition: 'opacity 1000ms',
        }}
      />
      {/* Dark overlay to keep content readable */}
      <div className="absolute inset-0 bg-black/55 dark:bg-black/70" />
      {/* Dot navigation */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              i === current ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'
            )}
            aria-label={`Background image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
