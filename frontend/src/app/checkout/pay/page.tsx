import { Suspense } from 'react';
import CheckoutPay from '@/components/CheckoutPay';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Payment',
};

/** Blank shell — Razorpay Checkout is the only UI until processing/error. */
export default function CheckoutPayPage() {
  return (
    <main className="w-full min-h-screen bg-white">
      <Suspense fallback={<div className="min-h-screen w-full bg-white" />}>
        <CheckoutPay />
      </Suspense>
    </main>
  );
}
