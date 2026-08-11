'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  fetchCheckoutSession,
  removeCartTags,
  type CheckoutSession,
} from '@/lib/checkout';
import { formatDisplayPrice } from '@/lib/erpCatalog';
import BillFrame from '@/components/BillFrame';

function clearPurchased(session: CheckoutSession) {
  const tags = session.tag_numbers?.length
    ? session.tag_numbers
    : session.tag_number
      ? [session.tag_number]
      : [];
  if (tags.length) removeCartTags(tags);
}

export default function CheckoutThanks() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') || '';

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'working' | 'done' | 'error'>('working');

  useEffect(() => {
    if (!sessionId) {
      setError('Missing checkout session.');
      setPhase('error');
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const current = await fetchCheckoutSession(sessionId);
        if (cancelled) return;

        if (current.status === 'paid') {
          setSession(current);
          clearPurchased(current);
          setPhase('done');
          return;
        }
        if (
          current.status === 'failed' ||
          current.status === 'cancelled' ||
          current.status === 'expired'
        ) {
          setError(`Payment ${current.status}. Stock hold was released.`);
          setPhase('error');
          return;
        }

        // Razorpay is confirmed on /checkout/pay before navigating here.
        setError('Payment not completed yet. Return to checkout and try again.');
        setPhase('error');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load order');
          setPhase('error');
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (phase === 'working') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="flex justify-center mb-4" aria-busy="true" aria-label="Loading">
          <span className="w-10 h-10 border-2 border-[#032C5E]/15 border-t-[#032C5E] rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-500">Loading your order…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-domine text-2xl text-[#032C5E] mb-3">Payment not completed</h1>
        <p className="text-sm text-red-600 mb-8">{error}</p>
        <Link
          href="/jewellery"
          className="inline-flex bg-[#032C5E] text-white text-xs font-bold uppercase tracking-widest px-8 py-3 rounded-full"
        >
          Back to jewellery
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <p className="text-[11px] uppercase tracking-widest text-emerald-600 mb-3">Payment successful</p>
      <h1 className="font-domine text-3xl text-[#032C5E] font-bold mb-4">Thank you</h1>
      <p className="text-sm text-gray-600 mb-8">
        Your order
        {session?.tag_numbers?.length || session?.tag_number ? (
          <>
            {' '}
            for tag
            {(session.tag_numbers?.length || 0) > 1 ? 's' : ''}{' '}
            <span className="font-medium text-[#222]">
              {(session.tag_numbers?.length
                ? session.tag_numbers
                : [session.tag_number]
              ).join(', ')}
            </span>
          </>
        ) : null}{' '}
        is confirmed. Please collect from the store.
      </p>

      <div className="border border-gray-100 rounded-lg p-5 text-left bg-[#fafafa] mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Amount paid</span>
          <span className="font-bold">{formatDisplayPrice(session?.amount)}</span>
        </div>
        {session?.erp_bill_number ? (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Store bill</span>
            <span className="font-medium">{session.erp_bill_number}</span>
          </div>
        ) : null}
      </div>

      {session?.erp_bill_id ? (
        <div className="mb-10">
          <BillFrame
            billId={session.erp_bill_id}
            billNumber={session.erp_bill_number}
            size="hero"
          />
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
        {session?.erp_bill_id ? (
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/site/invoice/${session.erp_bill_id}`}
            download={`Invoice-${session.erp_bill_number || session.erp_bill_id}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-[#032C5E] text-[#032C5E] bg-white hover:bg-[#032C5E] hover:text-white transition-colors text-xs font-bold uppercase tracking-widest px-8 py-3 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download PDF
          </a>
        ) : null}
        <Link
          href="/account/orders"
          className="inline-flex bg-[#032C5E] text-white text-xs font-bold uppercase tracking-widest px-8 py-3 rounded-full"
        >
          View order history
        </Link>
        <Link
          href="/jewellery"
          className="inline-flex bg-[#f1592a] text-white text-xs font-bold uppercase tracking-widest px-8 py-3 rounded-full"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
