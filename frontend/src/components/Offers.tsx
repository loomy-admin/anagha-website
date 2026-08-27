'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cmsSrc } from '@/lib/cmsAsset';

const DEFAULTS = [
  '/images/offers/offer_4.jpg',
  '/images/offers/offer_3.jpg',
  '/images/offers/offer_2.jpg',
  '/images/offers/offer_1.jpg',
];

interface Props {
  live: (string | null)[];
}

export default function Offers({ live }: Props) {
  const slides = (live.length > 0
    ? live.map((filename, i) => (filename ? cmsSrc(filename) : DEFAULTS[i] || ''))
    : DEFAULTS
  ).filter(Boolean);

  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (!slides.length) return;
      setCurrent((c) => (c + dir + slides.length) % slides.length);
    },
    [slides.length],
  );

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    go(dx < 0 ? 1 : -1);
  }

  if (!slides.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="w-full bg-white relative z-10"
    >
      <div
        className="relative w-full overflow-hidden select-none touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex w-full transition-transform duration-500 ease-in-out will-change-transform"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="relative w-full min-w-0 shrink-0 grow-0 basis-full bg-gray-100"
            >
              <img
                src={src}
                alt={`Offer ${i + 1}`}
                className="block w-full h-auto"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute left-1.5 sm:left-4 top-1/2 -translate-y-1/2 z-10
                w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-md
                flex items-center justify-center
                hover:bg-white transition-all active:scale-90"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute right-1.5 sm:right-4 top-1/2 -translate-y-1/2 z-10
                w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-md
                flex items-center justify-center
                hover:bg-white transition-all active:scale-90"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`rounded-full transition-all duration-300 shadow-sm
                    ${i === current ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/70 hover:bg-white'}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </motion.section>
  );
}
