'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import {
  fetchCatalog,
  formatDisplayPrice,
  restockCatalogItem,
  type CatalogItem,
} from '@/lib/erpCatalog';
import AdminSearchField, { textMatchesQuery } from '../AdminSearchField';
import { addProductsBtn } from '../AddProductsPanel';

export default function SoldItemsPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busyTag, setBusyTag] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchCatalog({
          status: 'sold',
          admin_bypass: 'true',
          limit: 1000000,
          offset: 0,
        });
        if (!cancelled) {
          setItems(data.items || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load sold items');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => items.filter((p) => textMatchesQuery(query, p.name, p.tag_number, p.group)),
    [items, query],
  );

  async function restock(item: CatalogItem) {
    setBusyTag(item.tag_number);
    setMessage(null);
    try {
      await restockCatalogItem(item.tag_number);
      setItems((prev) => prev.filter((p) => p.tag_number !== item.tag_number));
      setMessage(`${item.tag_number} is back in stock`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add to stock');
    } finally {
      setBusyTag(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 py-12">
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <Link
            href="/upload/jewellery"
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-navy transition-all shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jewellery Catalog</p>
            <h1 className="text-3xl font-display font-bold text-navy tracking-tight">Sold</h1>
          </div>
          {!loading && items.length > 0 ? (
            <AdminSearchField
              value={query}
              onChange={setQuery}
              placeholder="Search name or tag"
              className="max-w-xs"
            />
          ) : null}
        </div>

        {message ? <p className="text-sm text-navy mb-4">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-6">
            {loading ? 'Loading…' : `${visible.length} sold ${visible.length === 1 ? 'item' : 'items'}. Hidden from the website.`}
          </p>
          {loading ? (
            <div className="flex justify-center py-24">
              <span className="w-10 h-10 border-2 border-navy/15 border-t-navy rounded-full animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-gray-400 py-20 text-sm">
              {query.trim() ? `No sold items match “${query.trim()}”.` : 'No sold items yet.'}
            </p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((p) => (
                <li key={p.tag_number} className="border border-gray-100 rounded-2xl p-4 bg-white">
                  <Link
                    href={`/upload/jewellery/${p.group_slug || 'item'}/${encodeURIComponent(p.tag_number)}`}
                    className="flex gap-4"
                  >
                    <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-2">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                      ) : (
                        <span className="text-[9px] text-gray-300 uppercase">No img</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                        Tag {p.tag_number}
                        {p.group ? ` · ${p.group}` : ''}
                      </p>
                      <h4 className="text-sm font-bold text-navy truncate">{p.name}</h4>
                      <p className="text-rose-500 font-bold text-xs mt-1">{formatDisplayPrice(p.display_price)}</p>
                      {p.sold_at ? (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Sold {new Date(p.sold_at).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                  <button
                    type="button"
                    disabled={busyTag === p.tag_number}
                    onClick={() => void restock(p)}
                    className={`${addProductsBtn} w-full mt-3 text-center`}
                  >
                    {busyTag === p.tag_number ? 'Adding…' : 'Add to stock'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
