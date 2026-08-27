'use client';

import { useEffect, useState } from 'react';

type Props = {
  billId: string;
  className?: string;
};

/**
 * Loads the website sales-invoice PDF via BFF, then shows it in an iframe.
 * Uses fetch (not iframe onLoad) so the spinner clears reliably in new tabs.
 */
export default function BillEmbed({ billId, className = '' }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);
      setSrc(null);

      try {
        const res = await fetch(`/api/site/invoice/${encodeURIComponent(billId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Bill not found');
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }
        setSrc(`${objectUrl}#toolbar=0&navpanes=0&scrollbar=0`);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Bill not found');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (billId) load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [billId]);

  return (
    <div className={`relative w-full h-full bg-white ${className}`}>
      {loading ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-white"
          aria-busy="true"
          aria-label="Loading bill"
        >
          <span className="w-10 h-10 border-2 border-[#032C5E]/15 border-t-[#032C5E] rounded-full animate-spin" />
        </div>
      ) : null}

      {!loading && error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="font-semibold text-[#032C5E]">Bill unavailable</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      ) : null}

      {src ? (
        <iframe src={src} title="Store bill" className="w-full h-full border-0 bg-white" />
      ) : null}
    </div>
  );
}
