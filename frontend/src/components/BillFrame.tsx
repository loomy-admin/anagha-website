'use client';

import BillEmbed from '@/components/BillEmbed';

type Props = {
  billId: string;
  billNumber?: string | null;
  /** Taller frame on the thanks page; compact in order history. */
  size?: 'hero' | 'compact';
};

export default function BillFrame({ billId, billNumber, size = 'hero' }: Props) {
  const heightClass = size === 'hero' ? 'h-[70vh] min-h-[520px]' : 'h-[55vh] min-h-[420px]';
  const pageUrl = `/bill/${encodeURIComponent(billId)}`;

  return (
    <div className="w-full text-left">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">
          {billNumber ? `Bill ${billNumber}` : 'Store bill'}
        </p>
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold uppercase tracking-wide text-[#032C5E] hover:underline"
        >
          Open in new tab
        </a>
      </div>
      <div className={`w-full overflow-hidden rounded-xl border border-gray-200 bg-white ${heightClass}`}>
        <BillEmbed billId={billId} />
      </div>
    </div>
  );
}
