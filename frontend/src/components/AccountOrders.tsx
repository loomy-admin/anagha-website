'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchMe, type WebsiteCustomer } from '@/lib/auth';
import { fetchMyOrders, type CheckoutSession } from '@/lib/checkout';
import { formatDisplayPrice } from '@/lib/erpCatalog';
import BillFrame from '@/components/BillFrame';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AccountOrders() {
  const router = useRouter();
  const [customer, setCustomer] = useState<WebsiteCustomer | null>(null);
  const [orders, setOrders] = useState<CheckoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openBillId, setOpenBillId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me) {
          router.replace(`/account/login?next=${encodeURIComponent('/account/orders')}`);
          return;
        }
        setCustomer(me);
        const rows = await fetchMyOrders();
        if (cancelled) return;
        setOrders(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load orders');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-gray-500">
        Loading your orders…
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-domine text-[28px] text-[#032C5E] font-bold">Order history</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/cart"
            className="text-[12px] font-semibold uppercase tracking-wide text-[#2e6da4] hover:underline"
          >
            View cart
          </Link>
          <span className="text-gray-300">·</span>
          <Link
            href="/jewellery"
            className="text-[12px] font-semibold uppercase tracking-wide text-[#2e6da4] hover:underline"
          >
            Continue shopping
          </Link>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 mb-6">
          {error}
        </p>
      ) : null}

      {!orders.length ? (
        <div className="border border-gray-100 rounded-xl bg-white p-8 text-center">
          <h2 className="font-domine text-xl text-[#032C5E] mb-2">No purchases yet</h2>
          <p className="text-sm text-gray-500 mb-6">
            When you complete a payment, your store bills will appear here.
          </p>
          <Link
            href="/jewellery"
            className="inline-flex bg-[#032C5E] text-white text-xs font-bold uppercase tracking-widest px-8 py-3 rounded-full"
          >
            Shop jewellery
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const names = (order.item_names || []).filter(Boolean);
            return (
              <li
                key={order.id}
                className="border border-gray-100 rounded-xl bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-emerald-600 font-bold">
                      Paid
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                  </div>
                  <p className="text-lg font-bold text-[#222]">
                    {formatDisplayPrice(order.amount)}
                  </p>
                </div>
                <div className="text-sm text-[#222]">
                  {names.length ? (
                    <ul className="space-y-1">
                      {names.map((name, idx) => (
                        <li key={`${order.id}-${idx}`} className="font-medium">
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500">Jewellery purchase</span>
                  )}
                </div>
                {order.erp_bill_number ? (
                  <div className="text-sm mt-2">
                    <span className="text-gray-500">Store bill: </span>
                    <span className="font-medium">{order.erp_bill_number}</span>
                  </div>
                ) : null}
                {order.erp_bill_id ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenBillId((prev) => (prev === order.id ? null : order.id))
                      }
                      className="text-[11px] font-bold uppercase tracking-widest text-[#032C5E] hover:underline"
                    >
                      {openBillId === order.id ? 'Hide bill' : 'View bill'}
                    </button>
                    {openBillId === order.id ? (
                      <div className="mt-3">
                        <BillFrame
                          billId={order.erp_bill_id}
                          billNumber={order.erp_bill_number}
                          size="compact"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
