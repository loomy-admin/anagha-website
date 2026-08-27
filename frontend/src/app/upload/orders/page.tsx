'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { formatDisplayPrice } from '@/lib/erpCatalog';
import { formatOrderAddressLines } from '@/lib/orderAddress';
import { fetchAdminOrders, updateAdminOrder } from '@/lib/shipping';
import type { CheckoutSession } from '@/lib/checkout';

const STATUSES = [
  { id: 'paid', label: 'Paid' },
  { id: 'packed', label: 'Packed' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
];

const COURIERS = ['DTDC', 'Blue Dart', 'Delhivery', 'India Post', 'Professional Couriers', 'Other'];

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<CheckoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, {
    status: string;
    courier_name: string;
    tracking_number: string;
    tracking_url: string;
  }>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = (await fetchAdminOrders()) as CheckoutSession[];
      setOrders(rows);
      const next: typeof drafts = {};
      for (const row of rows) {
        next[row.id] = {
          status: row.status,
          courier_name: row.courier_name || '',
          tracking_number: row.tracking_number || '',
          tracking_url: row.tracking_url || '',
        };
      }
      setDrafts(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function patchDraft(id: string, patch: Partial<(typeof drafts)[string]>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function save(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    setError(null);
    try {
      const updated = (await updateAdminOrder(id, draft)) as CheckoutSession;
      setOrders((prev) => prev.map((row) => (row.id === id ? { ...row, ...updated } : row)));
      setDrafts((prev) => ({
        ...prev,
        [id]: {
          status: updated.status,
          courier_name: updated.courier_name || '',
          tracking_number: updated.tracking_number || '',
          tracking_url: updated.tracking_url || '',
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update order');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />
      <main className="flex-1 max-w-[1100px] mx-auto w-full px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/upload"
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:border-rose-100 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold text-navy">Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Pack, ship, and mark delivered. Tracking shows on the customer order page.</p>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-6">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-gray-400">Loading orders…</p>
        ) : !orders.length ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-sm text-gray-500">
            No paid orders yet.
          </div>
        ) : (
          <ul className="space-y-5">
            {orders.map((order) => {
              const draft = drafts[order.id] || {
                status: order.status,
                courier_name: '',
                tracking_number: '',
                tracking_url: '',
              };
              return (
                <li key={order.id} className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6">
                  <div className="flex flex-wrap justify-between gap-3 mb-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-gray-400">
                        {formatDate(order.created_at)}
                      </p>
                      <p className="font-domine text-lg text-navy mt-1">
                        {order.customer_name || 'Customer'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.customer_mobile} · {order.customer_email}
                      </p>
                    </div>
                    <p className="text-lg font-bold">{formatDisplayPrice(order.amount)}</p>
                  </div>

                  <p className="text-sm text-[#222] mb-2">
                    {(order.item_names || []).join(', ') || `Tags: ${(order.tag_numbers || [order.tag_number]).join(', ')}`}
                  </p>
                  <div className="text-sm text-[#222] mb-4 bg-[#fafafa] rounded-xl p-3">
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                      Delivery address
                    </p>
                    {formatOrderAddressLines(order.shipping_address).length ? (
                      formatOrderAddressLines(order.shipping_address).map((line) => (
                        <p key={line}>{line}</p>
                      ))
                    ) : (
                      <p className="text-gray-400">No delivery address on this order.</p>
                    )}
                  </div>
                  {order.shipping_method_name ? (
                    <p className="text-sm text-gray-500 mb-4">
                      {order.shipping_method_name}
                      {order.shipping_amount ? ` · ${formatDisplayPrice(order.shipping_amount)}` : ''}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="text-sm">
                      <span className="text-gray-500">Status</span>
                      <select
                        value={draft.status}
                        onChange={(e) => patchDraft(order.id, { status: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white outline-none focus:border-navy"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="text-gray-500">Courier</span>
                      <select
                        value={COURIERS.includes(draft.courier_name) ? draft.courier_name : draft.courier_name ? 'Other' : ''}
                        onChange={(e) =>
                          patchDraft(order.id, {
                            courier_name: e.target.value === 'Other' ? draft.courier_name : e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white outline-none focus:border-navy"
                      >
                        <option value="">Select</option>
                        {COURIERS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="text-gray-500">Tracking number (optional)</span>
                      <input
                        value={draft.tracking_number}
                        onChange={(e) => patchDraft(order.id, { tracking_number: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-navy"
                        placeholder="AWB / consignment no."
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-gray-500">Tracking URL (optional)</span>
                      <input
                        value={draft.tracking_url}
                        onChange={(e) => patchDraft(order.id, { tracking_url: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-navy"
                        placeholder="https://…"
                      />
                    </label>
                  </div>

                  {!COURIERS.includes(draft.courier_name) || draft.courier_name === 'Other' ? (
                    <label className="block text-sm mt-3 max-w-sm">
                      <span className="text-gray-500">Courier name</span>
                      <input
                        value={draft.courier_name === 'Other' ? '' : draft.courier_name}
                        onChange={(e) => patchDraft(order.id, { courier_name: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-navy"
                        placeholder="Courier name"
                      />
                    </label>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => save(order.id)}
                    disabled={savingId === order.id}
                    className="mt-4 bg-navy text-white text-[11px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-full disabled:opacity-60"
                  >
                    {savingId === order.id ? 'Saving…' : 'Update order'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
