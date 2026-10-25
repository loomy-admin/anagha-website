'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { formatDisplayPrice } from '@/lib/erpCatalog';
import { formatOrderAddressLines } from '@/lib/orderAddress';
import { fetchAdminOrders, updateAdminOrder } from '@/lib/shipping';
import { orderLineItems, publicOrderId, type CheckoutSession } from '@/lib/checkout';
import DateRangeCalendar from '@/components/DateRangeCalendar';

const STATUSES = [
  { id: 'paid', label: 'Paid' },
  { id: 'packed', label: 'Packed' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
];

const COURIERS = ['DTDC', 'Blue Dart', 'Delhivery', 'India Post', 'Professional Couriers', 'Other'];

type Draft = {
  status: string;
  courier_name: string;
  tracking_number: string;
  tracking_url: string;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** yyyy-mm-dd in the browser's local time zone (what <input type="date"> uses). */
function toInputDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDay(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function endOfDay(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] bg-white outline-none focus:border-navy';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<CheckoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [mode, setMode] = useState<'all' | 'today' | 'month' | 'range'>('all');
  const [rangeOpen, setRangeOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rangeOpen) return;
    const onDown = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setRangeOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [rangeOpen]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = (await fetchAdminOrders()) as CheckoutSession[];
      setOrders(rows);
      const next: Record<string, Draft> = {};
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

  function patchDraft(id: string, patch: Partial<Draft>) {
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

  function choose(next: 'today' | 'month' | 'range') {
    setRangeOpen(false);
    // Clicking the selected option again goes back to all orders.
    if (mode === next) {
      setMode('all');
      setFromDate('');
      setToDate('');
      return;
    }
    const now = new Date();
    const today = toInputDate(now);
    setMode(next);
    if (next === 'today') {
      setFromDate(today);
      setToDate(today);
    } else if (next === 'month') {
      setFromDate(toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      setToDate(today);
    } else {
      // Date range: wait for dates from the calendar button.
      setFromDate('');
      setToDate('');
    }
  }

  function applyRange(from: string, to: string) {
    setFromDate(from);
    setToDate(to);
    setRangeOpen(false);
  }

  function clearRange() {
    setFromDate('');
    setToDate('');
    setRangeOpen(false);
  }

  const rangeLabel =
    mode === 'range' && fromDate
      ? fromDate === toDate
        ? formatDate(`${fromDate}T00:00:00`)
        : `${formatDate(`${fromDate}T00:00:00`)} – ${formatDate(`${toDate}T00:00:00`)}`
      : '';

  const filtered = useMemo(() => {
    const from = fromDate ? startOfDay(fromDate) : null;
    const to = toDate ? endOfDay(toDate) : null;
    return orders.filter((order) => {
      if (from === null && to === null) return true;
      const at = order.created_at ? new Date(order.created_at).getTime() : NaN;
      if (Number.isNaN(at)) return false;
      if (from !== null && at < from) return false;
      if (to !== null && at > to) return false;
      return true;
    });
  }, [orders, fromDate, toDate]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
    [filtered],
  );

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />
      <main className="flex-1 max-w-[1500px] mx-auto w-full px-4 py-12">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
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
              <p className="text-sm text-gray-500 mt-1">
                Pack, ship, and mark delivered. Tracking shows on the customer order page.
              </p>
            </div>
          </div>

          <div ref={filterRef} className="relative flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              {mode === 'range' ? (
                <button
                  type="button"
                  aria-label="Open calendar"
                  title="Pick one date or a date range"
                  onClick={() => setRangeOpen((open) => !open)}
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
                    rangeOpen
                      ? 'bg-navy border-navy text-white'
                      : 'bg-white border-navy/30 text-navy hover:border-navy'
                  }`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
                    <path d="M3 9.5h18M8 3v3M16 3v3" />
                  </svg>
                </button>
              ) : null}
              <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                {(
                  [
                    ['today', 'Today'],
                    ['month', 'This month'],
                    ['range', 'Date range'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => choose(id)}
                    className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                      mode === id ? 'bg-navy text-white' : 'text-navy/70 hover:text-navy hover:bg-navy/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {mode === 'range' ? (
              <p className="text-[11px] text-gray-500">
                {rangeLabel || 'Tap the calendar to pick dates'}
              </p>
            ) : null}

            {mode === 'range' && rangeOpen ? (
              <div className="absolute right-0 top-full mt-2 z-20">
                <DateRangeCalendar from={fromDate} to={toDate} onApply={applyRange} onClear={clearRange} />
              </div>
            ) : null}
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
          <>
            <p className="text-[12px] text-gray-500 mb-3">
              {filtered.length} order{filtered.length === 1 ? '' : 's'}
              {fromDate || toDate ? ' in this period' : ''} · Total {formatDisplayPrice(filteredTotal)}
            </p>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
              <table className="min-w-[1300px] w-full text-left text-[12px] align-top">
                <thead className="bg-[#fafafa] text-[10px] uppercase tracking-widest text-gray-500">
                  <tr>
                    <th className="px-3 py-3 font-bold">Date</th>
                    <th className="px-3 py-3 font-bold">Order</th>
                    <th className="px-3 py-3 font-bold">Customer</th>
                    <th className="px-3 py-3 font-bold">Items</th>
                    <th className="px-3 py-3 font-bold">Delivery address</th>
                    <th className="px-3 py-3 font-bold text-right">Amount</th>
                    <th className="px-3 py-3 font-bold w-[120px]">Status</th>
                    <th className="px-3 py-3 font-bold w-[160px]">Courier</th>
                    <th className="px-3 py-3 font-bold w-[190px]">Tracking</th>
                    <th className="px-3 py-3 font-bold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-10 text-center text-gray-400">
                        No orders between these dates.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((order) => {
                      const draft = drafts[order.id] || {
                        status: order.status,
                        courier_name: '',
                        tracking_number: '',
                        tracking_url: '',
                      };
                      const lines = orderLineItems(order);
                      const address = formatOrderAddressLines(order.shipping_address);
                      const customCourier =
                        !COURIERS.includes(draft.courier_name) || draft.courier_name === 'Other';
                      return (
                        <tr key={order.id} className="align-top hover:bg-[#fffbfa]">
                          <td className="px-3 py-3 whitespace-nowrap">
                            <p className="text-[#222]">{formatDate(order.created_at)}</p>
                            <p className="text-gray-400">{formatTime(order.created_at)}</p>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <p className="font-semibold text-navy">{publicOrderId(order)}</p>
                            {order.shipping_method_name || order.shipping_eta ? (
                              <p className="text-gray-400 mt-0.5">
                                {order.shipping_method_name || 'Online delivery'}
                                {order.shipping_eta ? ` · ${order.shipping_eta}` : ''}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-[#222] font-medium">{order.customer_name || 'Customer'}</p>
                            <p className="text-gray-500">{order.customer_mobile}</p>
                            <p className="text-gray-500 break-all">{order.customer_email}</p>
                          </td>
                          <td className="px-3 py-3">
                            {lines.length ? (
                              lines.map((item) => (
                                <p key={`${order.id}-${item.tag_number}`} className="text-[#222]">
                                  {item.name}
                                  {item.tag_number ? <span className="text-gray-400"> · {item.tag_number}</span> : null}
                                </p>
                              ))
                            ) : (
                              <p>{(order.tag_numbers || [order.tag_number]).join(', ')}</p>
                            )}
                          </td>
                          <td className="px-3 py-3 max-w-[240px] text-gray-600">
                            {address.length ? (
                              address.map((line) => <p key={line}>{line}</p>)
                            ) : (
                              <p className="text-gray-400">No address</p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <p className="font-bold text-[#222]">{formatDisplayPrice(order.amount)}</p>
                            {order.shipping_amount ? (
                              <p className="text-gray-400">incl. {formatDisplayPrice(order.shipping_amount)} shipping</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={draft.status}
                              onChange={(e) => patchDraft(order.id, { status: e.target.value })}
                              className={inputClass}
                            >
                              {STATUSES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3 space-y-1.5">
                            <select
                              value={
                                COURIERS.includes(draft.courier_name)
                                  ? draft.courier_name
                                  : draft.courier_name
                                    ? 'Other'
                                    : ''
                              }
                              onChange={(e) =>
                                patchDraft(order.id, {
                                  courier_name: e.target.value === 'Other' ? draft.courier_name : e.target.value,
                                })
                              }
                              className={inputClass}
                            >
                              <option value="">Select</option>
                              {COURIERS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            {customCourier ? (
                              <input
                                value={draft.courier_name === 'Other' ? '' : draft.courier_name}
                                onChange={(e) => patchDraft(order.id, { courier_name: e.target.value })}
                                className={inputClass}
                                placeholder="Courier name"
                              />
                            ) : null}
                          </td>
                          <td className="px-3 py-3 space-y-1.5">
                            <input
                              value={draft.tracking_number}
                              onChange={(e) => patchDraft(order.id, { tracking_number: e.target.value })}
                              className={inputClass}
                              placeholder="AWB / consignment no."
                            />
                            <input
                              value={draft.tracking_url}
                              onChange={(e) => patchDraft(order.id, { tracking_url: e.target.value })}
                              className={inputClass}
                              placeholder="Tracking URL"
                            />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => save(order.id)}
                              disabled={savingId === order.id}
                              className="bg-navy text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full disabled:opacity-60"
                            >
                              {savingId === order.id ? 'Saving…' : 'Update'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
