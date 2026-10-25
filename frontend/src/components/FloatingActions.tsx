'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useContactInfo } from '@/lib/contact';

const STORAGE_KEY = 'anagha_floating_actions_pos';
const MARGIN = 8;
const DRAG_THRESHOLD = 6;

/** Offset from the bottom-right corner of the viewport. */
type Position = { right: number; bottom: number };

function defaultPosition(): Position {
  const mobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  // Phones: stay above the listing page's bottom filter bar.
  return { right: 16, bottom: mobile ? 88 : 24 };
}

function clamp(pos: Position, el: HTMLElement | null): Position {
  if (typeof window === 'undefined') return pos;
  const width = el?.offsetWidth || 56;
  const height = el?.offsetHeight || 120;
  return {
    right: Math.min(Math.max(pos.right, MARGIN), window.innerWidth - width - MARGIN),
    bottom: Math.min(Math.max(pos.bottom, MARGIN), window.innerHeight - height - MARGIN),
  };
}

function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/** Draggable WhatsApp + back-to-top buttons shown on every storefront page. */
export default function FloatingActions() {
  const pathname = usePathname();
  const { whatsapp } = useContactInfo();
  const groupRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; start: Position; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [pos, setPos] = useState<Position | null>(null);
  const [showTop, setShowTop] = useState(false);
  // Set after mount so server and client render the same link first.
  const [pageUrl, setPageUrl] = useState('');

  useEffect(() => {
    setPageUrl(window.location.href);
  }, [pathname]);

  useEffect(() => {
    let initial = defaultPosition();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && Number.isFinite(saved.right) && Number.isFinite(saved.bottom)) initial = saved;
    } catch {
      /* ignore bad saved value */
    }
    setPos(clamp(initial, groupRef.current));

    const onScroll = () => setShowTop(window.scrollY > 400);
    const onResize = () => setPos((p) => (p ? clamp(p, groupRef.current) : p));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!pos) return;
      drag.current = { x: e.clientX, y: e.clientY, start: pos, moved: false };
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      // Capture only once dragging starts, so a plain tap still reaches the button.
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      d.moved = true;
    }
    setPos(clamp({ right: d.start.right - dx, bottom: d.start.bottom - dy }, groupRef.current));
  }, []);

  const onPointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    // Swallow only the click that ends this drag, then accept taps again.
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    setPos((p) => {
      if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      return p;
    });
  }, []);

  const guardClick = useCallback((e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
    return false;
  }, []);

  if (pathname?.startsWith('/upload')) return null;

  const phone = String(whatsapp || '').replace(/[^0-9]/g, '');
  const message = encodeURIComponent(`Hi Anagha Jewellers, I need help.${pageUrl ? ` (${pageUrl})` : ''}`);

  return (
    <div
      ref={groupRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      title="Drag to move"
      style={pos ? { right: pos.right, bottom: pos.bottom } : { right: 16, bottom: 24, visibility: 'hidden' }}
      className="fixed z-[65] flex flex-col items-center gap-3 touch-none select-none cursor-grab active:cursor-grabbing"
    >
      {showTop ? (
        <button
          type="button"
          aria-label="Back to top"
          onClick={(e) => {
            if (guardClick(e)) return;
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-12 h-12 rounded-full bg-[#032C5E] text-white shadow-lg flex items-center justify-center hover:bg-[#021f45] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      ) : null}
      {phone ? (
        <a
          href={`https://wa.me/${phone}?text=${message}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          draggable={false}
          onClick={(e) => {
            guardClick(e);
          }}
          className="w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center hover:bg-[#128C7E] transition-colors"
        >
          <WhatsAppIcon />
        </a>
      ) : null}
    </div>
  );
}
