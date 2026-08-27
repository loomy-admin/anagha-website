'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchMe, type WebsiteCustomer } from '@/lib/auth';
import { fetchMyOrders, orderLineItems, publicOrderId, type CheckoutSession } from '@/lib/checkout';
import { formatDisplayPrice } from '@/lib/erpCatalog';
import { formatOrderAddressLines } from '@/lib/orderAddress';
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

const STATUS_LABEL: Record<string, string> = {
  paid: 'Paid — preparing for delivery',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const STATUS_CLASS: Record<string, string> = {
  paid: 'text-amber-700',
  packed: 'text-blue-700',
  shipped: 'text-[#032C5E]',
  delivered: 'text-emerald-600',
};

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
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-domine text-xl text-[#032C5E] font-bold">Order History</h2>
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
            const lines = orderLineItems(order);
            const orderId = publicOrderId(order);
            const fromOrder = formatOrderAddressLines(order.shipping_address);
            const deliveryLines = fromOrder.length
              ? fromOrder
              : formatOrderAddressLines(customer.shippingAddress);
            return (
              <li
                key={order.id}
                className="border border-gray-100 rounded-xl bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className={`text-[11px] uppercase tracking-widest font-bold ${STATUS_CLASS[order.status] || 'text-gray-600'}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </p>
                    <p className="text-sm font-semibold text-[#032C5E] mt-1">Order {orderId}</p>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                  </div>
                  <p className="text-lg font-bold text-[#222]">
                    {formatDisplayPrice(order.amount)}
                  </p>
                </div>
                <div className="text-sm text-[#222]">
                  {lines.length ? (
                    <ul className="space-y-1">
                      {lines.map((item) => (
                        <li key={`${order.id}-${item.tag_number}`} className="font-medium">
                          {item.name}
                          {item.tag_number ? (
                            <span className="text-gray-500 font-normal"> · Tag {item.tag_number}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500">Jewellery purchase</span>
                  )}
                </div>
                {order.shipping_method_name || order.shipping_eta ? (
                  <p className="text-sm mt-2 text-gray-500">
                    Delivery:{' '}
                    <span className="font-medium text-[#222]">
                      {order.shipping_method_name || 'Online'}
                      {order.shipping_eta ? ` · ${order.shipping_eta}` : ''}
                    </span>
                    {order.shipping_amount ? ` · ${formatDisplayPrice(order.shipping_amount)}` : ''}
                  </p>
                ) : null}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                    Delivery address
                  </p>
                  {deliveryLines.length ? (
                    <div className="text-sm text-[#222] leading-relaxed">
                      {deliveryLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No delivery address on this order.</p>
                  )}
                </div>
                {order.tracking_number ? (
                  <div className="text-sm mt-2">
                    <span className="text-gray-500">Tracking: </span>
                    <span className="font-medium">{order.courier_name ? `${order.courier_name} · ` : ''}{order.tracking_number}</span>
                    {order.tracking_url ? (
                      <>
                        {' '}
                        <a
                          href={order.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#032C5E] underline"
                        >
                          Track
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : null}
                {order.erp_bill_number ? (
                  <div className="text-sm mt-2">
                    <span className="text-gray-500">Store bill: </span>
                    <span className="font-medium">{order.erp_bill_number}</span>
                  </div>
                ) : null}
                {order.erp_bill_id || order.id ? (
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
                          billId={order.erp_bill_id || order.id}
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
