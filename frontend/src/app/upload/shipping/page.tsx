'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import {
  fetchAllShippingMethods,
  saveShippingMethods,
  type ShippingMethod,
} from '@/lib/shipping';

function blankMethod(): ShippingMethod {
  return {
    id: `method-${Date.now()}`,
    name: '',
    charge: 0,
    eta: '',
    enabled: true,
  };
}

export default function AdminShippingPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAllShippingMethods()
      .then(setMethods)
      .catch(() => setMethods([]))
      .finally(() => setLoading(false));
  }, []);

  async function onSave() {
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveShippingMethods(
        methods.map((m) => ({
          ...m,
          id: m.id.trim() || `method-${Date.now()}`,
          name: m.name.trim() || 'Delivery',
          charge: Number(m.charge) || 0,
        })),
      );
      setMethods(saved);
      setMessage('Shipping methods saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  function update(idx: number, patch: Partial<ShippingMethod>) {
    setMethods((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />
      <main className="flex-1 max-w-[800px] mx-auto w-full px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/upload"
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:border-rose-100 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-display font-bold text-navy">Shipping methods</h1>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Customers pick one of these at checkout. The charge is added to the Razorpay total.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-gray-100 space-y-5">
            {methods.map((method, idx) => (
              <div key={method.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={method.enabled}
                      onChange={(e) => update(idx, { enabled: e.target.checked })}
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    className="text-xs text-red-500"
                    onClick={() => setMethods((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
                <label className="block text-sm">
                  <span className="text-gray-500">Name</span>
                  <input
                    value={method.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-navy"
                    placeholder="Standard Delivery"
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="text-gray-500">Charge (₹)</span>
                    <input
                      type="number"
                      min={0}
                      value={method.charge}
                      onChange={(e) => update(idx, { charge: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-navy"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-500">Delivery time</span>
                    <input
                      value={method.eta}
                      onChange={(e) => update(idx, { eta: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-navy"
                      placeholder="5–7 business days"
                    />
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setMethods((prev) => [...prev, blankMethod()])}
              className="text-sm font-semibold text-navy"
            >
              + Add method
            </button>

            {message ? <p className="text-sm text-gray-600">{message}</p> : null}

            <button
              type="button"
              onClick={onSave}
              disabled={saving || !methods.length}
              className="w-full sm:w-auto bg-navy text-white font-bold text-[12px] uppercase tracking-widest px-8 py-3 rounded-full disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save methods'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
