'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { fetchCatalogFilters } from '@/lib/erpCatalog';
import {
  blankOffer,
  fetchAdminCartOffers,
  saveAdminCartOffers,
  type BuyGetOffer,
} from '@/lib/cartOffers';

export default function AdminCartOffersPage() {
  const [offers, setOffers] = useState<BuyGetOffer[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [articles, setArticles] = useState<string[]>([]);
  const [metals, setMetals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetchAdminCartOffers().catch(() => [] as BuyGetOffer[]),
      fetchCatalogFilters({ admin_bypass: 'true' }).catch(() => null),
    ])
      .then(([saved, filters]) => {
        setOffers(saved);
        setGroups((filters?.filters?.group || []).map((g) => g.slug || g.name).filter(Boolean) as string[]);
        setArticles((filters?.filters?.article || []).map((g) => g.slug || g.name).filter(Boolean) as string[]);
        setMetals((filters?.filters?.metal_type || []).map((g) => g.name).filter(Boolean) as string[]);
      })
      .finally(() => setLoading(false));
  }, []);

  function update(idx: number, patch: Partial<BuyGetOffer>) {
    setOffers((prev) => prev.map((offer, i) => (i === idx ? { ...offer, ...patch } : offer)));
  }

  function updateTier(offerIdx: number, tierIdx: number, patch: { buy?: number; get?: number }) {
    setOffers((prev) =>
      prev.map((offer, i) => {
        if (i !== offerIdx) return offer;
        return {
          ...offer,
          tiers: offer.tiers.map((tier, t) => (t === tierIdx ? { ...tier, ...patch } : tier)),
        };
      }),
    );
  }

  function toggleFilter(idx: number, key: 'groups' | 'articles' | 'metal_types', value: string) {
    setOffers((prev) =>
      prev.map((offer, i) => {
        if (i !== idx) return offer;
        const list = offer[key];
        const has = list.some((entry) => entry.toLowerCase() === value.toLowerCase());
        return {
          ...offer,
          [key]: has ? list.filter((entry) => entry.toLowerCase() !== value.toLowerCase()) : [...list, value],
        };
      }),
    );
  }

  async function onSave() {
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveAdminCartOffers(offers);
      setOffers(saved);
      setMessage('Offers saved. They apply on cart and checkout immediately.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />
      <main className="flex-1 max-w-[860px] mx-auto w-full px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/upload"
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:border-rose-100 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-display font-bold text-navy">Buy X Get Y</h1>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Cart-size offer: Buy is paid pieces, Get is extra free pieces. The cart needs Buy + Get
          eligible items before a tier applies. Highest matching tier wins; groups do not repeat.
          Example: Buy 2 Get 1 needs 3 items (cheapest free). Buy 3 Get 2 needs 5 items.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-5">
            {offers.map((offer, idx) => (
              <div key={offer.id} className="bg-white rounded-[24px] p-6 border border-gray-100 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={offer.active}
                      onChange={(e) => update(idx, { active: e.target.checked })}
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    className="text-xs text-red-500"
                    onClick={() => setOffers((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
                <label className="block text-sm">
                  <span className="text-gray-500">Name</span>
                  <input
                    value={offer.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-navy"
                    placeholder="Buy 2 Get 1"
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="text-gray-500">Starts</span>
                    <input
                      type="date"
                      value={offer.starts_at || ''}
                      onChange={(e) => update(idx, { starts_at: e.target.value || null })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-navy"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-500">Ends</span>
                    <input
                      type="date"
                      value={offer.ends_at || ''}
                      onChange={(e) => update(idx, { ends_at: e.target.value || null })}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-navy"
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="text-gray-500">Max discount (₹, optional)</span>
                  <input
                    type="number"
                    min={0}
                    value={offer.max_discount ?? ''}
                    onChange={(e) =>
                      update(idx, {
                        max_discount: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-navy"
                    placeholder="No cap"
                  />
                </label>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Tiers</p>
                  <div className="space-y-2">
                    {offer.tiers.map((tier, tIdx) => (
                      <div key={`${offer.id}-tier-${tIdx}`} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-8">Buy</span>
                        <input
                          type="number"
                          min={1}
                          value={tier.buy}
                          onChange={(e) => updateTier(idx, tIdx, { buy: Number(e.target.value) || 1 })}
                          className="w-20 rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-navy"
                        />
                        <span className="text-xs text-gray-400">Get</span>
                        <input
                          type="number"
                          min={1}
                          value={tier.get}
                          onChange={(e) => updateTier(idx, tIdx, { get: Number(e.target.value) || 1 })}
                          className="w-20 rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-navy"
                        />
                        <span className="text-xs text-gray-400">
                          needs {tier.buy + tier.get} items
                        </span>
                        {offer.tiers.length > 1 ? (
                          <button
                            type="button"
                            className="text-xs text-red-500 ml-auto"
                            onClick={() =>
                              update(idx, { tiers: offer.tiers.filter((_, i) => i !== tIdx) })
                            }
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="text-sm font-semibold text-navy mt-2"
                    onClick={() =>
                      update(idx, { tiers: [...offer.tiers, { buy: 3, get: 2 }] })
                    }
                  >
                    + Add tier
                  </button>
                </div>

                <FilterGroup
                  label="Categories (optional)"
                  options={groups}
                  selected={offer.groups}
                  onToggle={(value) => toggleFilter(idx, 'groups', value)}
                />
                <FilterGroup
                  label="Articles (optional)"
                  options={articles}
                  selected={offer.articles}
                  onToggle={(value) => toggleFilter(idx, 'articles', value)}
                />
                <FilterGroup
                  label="Metal (optional)"
                  options={metals}
                  selected={offer.metal_types}
                  onToggle={(value) => toggleFilter(idx, 'metal_types', value)}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={() => setOffers((prev) => [...prev, blankOffer()])}
              className="text-sm font-semibold text-navy"
            >
              + Add offer
            </button>

            {message ? <p className="text-sm text-gray-600">{message}</p> : null}

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="w-full sm:w-auto bg-navy text-white font-bold text-[12px] uppercase tracking-widest px-8 py-3 rounded-full disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save offers'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (!options.length) return null;
  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.some((entry) => entry.toLowerCase() === option.toLowerCase());
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-full border ${
                on ? 'bg-navy text-white border-navy' : 'bg-white text-gray-500 border-gray-200'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
