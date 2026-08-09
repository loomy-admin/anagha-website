import { Suspense } from 'react';
import AccountAddress from '@/components/AccountAddress';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shipping Address | Anagha',
};

export default function AccountAddressPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-gray-500">Loading address…</div>}>
      <AccountAddress />
    </Suspense>
  );
}
