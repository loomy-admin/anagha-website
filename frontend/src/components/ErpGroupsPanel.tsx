'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchCatalog,
  fetchCatalogFilters,
  fetchGroupImages,
  groupImageForSlug,
  slugifyName,
  type CatalogFilterOption,
} from '@/lib/erpCatalog';

type Props = {
  title: string;
  description?: string;
};

export default function ErpGroupsPanel({ title, description }: Props) {
  const [groups, setGroups] = useState<CatalogFilterOption[]>([]);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [payload, images] = await Promise.all([
          fetchCatalogFilters(),
          fetchGroupImages().catch(() => ({})),
        ]);
        if (cancelled) return;
        setImageOverrides(images);
        const base = [...(payload.filters?.group || [])];
        const withExactCounts = await Promise.all(
          base.map(async (g) => {
            const slug = g.slug || slugifyName(g.name);
            try {
              const catalog = await fetchCatalog({ group: slug, limit: 1, offset: 0 });
              return { ...g, slug, count: catalog.total ?? g.count ?? 0 };
            } catch {
              return { ...g, slug, count: g.count ?? 0 };
            }
          }),
        );
        if (cancelled) return;
        withExactCounts.sort(
          (a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name),
        );
        setGroups(withExactCounts);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load ERP groups');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 border-t border-gray-100 pt-16">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-slate-400 to-gray-500" />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">{title}</h2>
          <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Live ERP</span>
        </div>
        <Link
          href="/upload/jewellery"
          className="px-4 py-1.5 rounded-full border border-navy/20 text-[10px] font-black text-navy uppercase hover:bg-navy/5"
        >
          Open jewellery admin
        </Link>
      </div>

      <p className="text-sm text-gray-500">
        {description ||
          'Driven by ERP inventory groups with available stock. Edit taxonomy in Octis ERP — not in this CMS.'}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-rose-500">{error}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-x-5 gap-y-8">
          {groups.map((g) => {
            const slug = g.slug || slugifyName(g.name);
            return (
              <Link
                key={g.id || slug}
                href={`/upload/jewellery/${slug}`}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-full aspect-square rounded-[18px] bg-[#f4f6f9] flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <img
                    src={groupImageForSlug(slug, imageOverrides)}
                    alt={g.name}
                    className="w-[75%] h-[75%] object-contain"
                  />
                </div>
                <p className="text-[11px] font-semibold text-center text-navy uppercase leading-tight">
                  {g.name}
                </p>
                <p className="text-[10px] text-gray-400">
                  {typeof g.count === 'number' ? `${g.count} items` : '—'}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
