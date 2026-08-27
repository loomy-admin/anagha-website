'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  fetchCheckoutSession,
  removeCartTags,
  orderLineItems,
  publicOrderId,
  type CheckoutSession,
} from '@/lib/checkout';
import { formatDisplayPrice } from '@/lib/erpCatalog';
import BillFrame from '@/components/BillFrame';
import { formatOrderAddressLines } from '@/lib/orderAddress';

function clearPurchased(session: CheckoutSession) {
  const tags = session.tag_numbers?.length
    ? session.tag_numbers
    : session.tag_number
      ? [session.tag_number]
      : [];
  if (tags.length) removeCartTags(tags);
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Paid — preparing for delivery',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

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

  const invoiceId = session?.erp_bill_id || session?.id || '';
  const orderId = session ? publicOrderId(session) : '';
  const lines = session ? orderLineItems(session) : [];
  const deliveryLines = session ? formatOrderAddressLines(session.shipping_address) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <p className="text-[11px] uppercase tracking-widest text-emerald-600 mb-3">Payment successful</p>
      <h1 className="font-domine text-3xl text-[#032C5E] font-bold mb-4">Thank you</h1>
      <p className="text-sm text-gray-600 mb-2">
        Your order is placed. We will deliver it to your address.
      </p>
      {orderId ? (
        <p className="text-sm text-[#032C5E] font-semibold mb-2">
          Order ID <span className="font-bold">{orderId}</span>
        </p>
      ) : null}
      {session?.status ? (
        <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-6">
          {STATUS_LABEL[session.status] || session.status}
        </p>
      ) : null}

      {lines.length ? (
        <ul className="text-sm text-[#222] mb-8 space-y-1">
          {lines.map((item) => (
            <li key={`${item.tag_number}-${item.name}`}>
              <span className="font-medium">{item.name}</span>
              {item.tag_number ? (
                <span className="text-gray-500"> · Tag {item.tag_number}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="border border-gray-100 rounded-lg p-5 text-left bg-[#fafafa] mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Amount paid</span>
          <span className="font-bold">{formatDisplayPrice(session?.amount)}</span>
        </div>
        {orderId ? (
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Order ID</span>
            <span className="font-medium">{orderId}</span>
          </div>
        ) : null}
        {session?.shipping_method_name || session?.shipping_eta ? (
          <div className="flex justify-between gap-4 text-sm mb-2">
            <span className="text-gray-500">Delivery</span>
            <span className="font-medium text-right">
              {session.shipping_method_name || 'Online delivery'}
              {session.shipping_eta ? ` · ${session.shipping_eta}` : ''}
            </span>
          </div>
        ) : null}
        {deliveryLines.length ? (
          <div className="pt-3 mt-3 border-t border-gray-200">
            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
              Deliver to
            </p>
            <div className="text-sm text-[#222] leading-relaxed">
              {deliveryLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {invoiceId ? (
        <div className="mb-10">
          <BillFrame
            billId={invoiceId}
            billNumber={session.erp_bill_number}
            size="hero"
          />
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
        {invoiceId ? (
          <a
            href={`/api/site/invoice/${encodeURIComponent(invoiceId)}`}
            download={`Invoice-${session.erp_bill_number || invoiceId}.pdf`}
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
