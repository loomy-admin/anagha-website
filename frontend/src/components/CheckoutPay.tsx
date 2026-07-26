'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  cancelCheckoutSession,
  confirmRazorpayCheckout,
  fetchCheckoutPayment,
  removeCartTags,
  type CheckoutPayment,
  type CheckoutSession,
} from '@/lib/checkout';

function clearPurchased(session: CheckoutSession) {
  const tags = session.tag_numbers?.length
    ? session.tag_numbers
    : session.tag_number
      ? [session.tag_number]
      : [];
  if (tags.length) removeCartTags(tags);
}
import {
  canOpenRazorpayForSession,
  loadRazorpayScript,
  openRazorpayWindow,
  releaseRazorpaySession,
  teardownRazorpayCheckout,
} from '@/lib/razorpayCheckout';

function isRazorpayPayment(
  payment: CheckoutPayment | null,
): payment is Extract<CheckoutPayment, { mode: 'razorpay' }> {
  return Boolean(payment && payment.mode === 'razorpay');
}

type Phase = 'idle' | 'processing' | 'error';

/** Delayed teardown so React Strict Mode remount does not kill + re-open Razorpay. */
let pendingTeardown: ReturnType<typeof setTimeout> | null = null;

export default function CheckoutPay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = (searchParams.get('session') || '').trim();

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    if (pendingTeardown) {
      clearTimeout(pendingTeardown);
      pendingTeardown = null;
    }

    let cancelled = false;

    async function start() {
      try {
        // Already open for this session (Strict Mode remount) — keep existing modal
        if (!canOpenRazorpayForSession(sessionId)) return;

        const { session: current, payment } = await fetchCheckoutPayment(sessionId);
        if (cancelled) return;

        if (current.status === 'paid') {
          clearPurchased(current);
          router.replace(`/checkout/thanks?session=${encodeURIComponent(current.id)}`);
          return;
        }
        if (
          current.status === 'failed' ||
          current.status === 'cancelled' ||
          current.status === 'expired'
        ) {
          setError(`Payment ${current.status}.`);
          setPhase('error');
          return;
        }

        if (!isRazorpayPayment(payment)) {
          setError('Razorpay payment details missing for this session.');
          setPhase('error');
          return;
        }

        const ready = await loadRazorpayScript();
        if (!ready || cancelled) {
          if (!cancelled) {
            setError('Could not load Razorpay checkout.');
            setPhase('error');
          }
          return;
        }
        if (cancelled || !canOpenRazorpayForSession(sessionId)) return;

        openRazorpayWindow(sessionId, {
          key: payment.keyId,
          amount: payment.amountPaise,
          currency: payment.currency || 'INR',
          name: payment.displayName || 'Octis',
          description:
            (current.tag_numbers?.length || 0) > 1
              ? `${current.tag_numbers!.length} jewellery items`
              : `Tag ${current.tag_number}`,
          order_id: payment.orderId,
          prefill: payment.prefill,
          theme: { color: '#032C5E' },
          modal: {
            confirm_close: true,
            ondismiss: async () => {
              if (cancelled) return;
              releaseRazorpaySession(sessionId);
              teardownRazorpayCheckout();
              try {
                await cancelCheckoutSession(current.id);
              } catch {
                // best-effort
              }
              router.replace('/cart');
            },
          },
          handler: async (response) => {
            try {
              setPhase('processing');
              const paid = await confirmRazorpayCheckout(current.id, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              releaseRazorpaySession(sessionId);
              teardownRazorpayCheckout();
              clearPurchased(paid);
              router.replace(`/checkout/thanks?session=${encodeURIComponent(paid.id)}`);
            } catch (err) {
              releaseRazorpaySession(sessionId);
              teardownRazorpayCheckout();
              setError(err instanceof Error ? err.message : 'Payment confirmation failed');
              setPhase('error');
              try {
                await cancelCheckoutSession(current.id);
              } catch {
                // ignore
              }
            }
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not start payment');
          setPhase('error');
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      // Defer teardown so remount within the same navigation keeps the modal
      pendingTeardown = setTimeout(() => {
        teardownRazorpayCheckout(sessionId);
        pendingTeardown = null;
      }, 600);
    };
  }, [sessionId, router]);

  if (phase === 'idle') {
    return <div className="min-h-screen w-full bg-white" aria-hidden />;
  }

  if (phase === 'processing') {
    return (
      <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-4">
        <div className="w-10 h-10 border-[3px] border-[#032C5E] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-[#032C5E]">Processing payment…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-4 text-center">
      <p className="text-sm text-red-600 mb-6 max-w-sm">{error || 'Payment failed'}</p>
      <Link
        href="/checkout"
        className="inline-flex rounded-full bg-[#032C5E] px-8 py-3 text-xs font-bold uppercase tracking-widest text-white"
      >
        Back to checkout
      </Link>
    </div>
  );
}
