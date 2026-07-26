'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchCatalogFilters,
  slugifyName,
  type CatalogFilterOption,
} from '@/lib/erpCatalog';

const MAX_HEADER_TABS = 8;
const MAX_ARTICLES = 5;

type HeaderArticle = { name: string; slug?: string };
type HeaderCallout = { title: string; desc: string; image: string };
type SelectedGroup = {
  slug: string;
  label: string;
  dropdown: {
    articles: HeaderArticle[];
    callout: HeaderCallout;
  };
};

function emptyDropdown() {
  return {
    articles: [] as HeaderArticle[],
    callout: { title: '', desc: '', image: '' },
  };
}

function sortByCountDesc(groups: CatalogFilterOption[]) {
  return [...groups].sort(
    (a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name),
  );
}

function toTab(g: CatalogFilterOption, prev?: SelectedGroup): SelectedGroup {
  const slug = (g.slug || slugifyName(g.name)).toLowerCase();
  return {
    slug,
    label: String(g.name).toUpperCase(),
    dropdown: prev?.dropdown || emptyDropdown(),
  };
}

export default function HeaderNavPicker() {
  const [allGroups, setAllGroups] = useState<CatalogFilterOption[]>([]);
  const [selected, setSelected] = useState<SelectedGroup[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [articlePool, setArticlePool] = useState<CatalogFilterOption[]>([]);
  const [articleLoading, setArticleLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const uploadSlugRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [filters, saved] = await Promise.all([
          fetchCatalogFilters(),
          fetch('/api/upload/header', { cache: 'no-store' }).then((r) => r.json()),
        ]);
        if (cancelled) return;

        const groups = sortByCountDesc(filters.filters?.group || []).map((g) => ({
          ...g,
          slug: (g.slug || slugifyName(g.name)).toLowerCase(),
        }));
        setAllGroups(groups);
        const bySlug = new Map(groups.map((g) => [g.slug!, g]));

        const savedGroups: SelectedGroup[] = Array.isArray(saved?.selectedGroups)
          ? saved.selectedGroups
          : [];

        const fromSaved = savedGroups
          .map((g) => {
            const live = bySlug.get(String(g.slug || '').toLowerCase());
            if (!live) return null;
            return toTab(live, {
              slug: live.slug!,
              label: String(live.name).toUpperCase(),
              dropdown: g.dropdown || emptyDropdown(),
            });
          })
          .filter(Boolean) as SelectedGroup[];

        // Seed UI with top 8 by stock when nothing saved yet (matches storefront default).
        setSelected(
          fromSaved.length
            ? fromSaved
            : groups.slice(0, MAX_HEADER_TABS).map((g) => toTab(g)),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load header settings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!expanded) {
      setArticlePool([]);
      return;
    }
    let cancelled = false;
    setArticleLoading(true);
    fetchCatalogFilters({ group: expanded })
      .then((payload) => {
        if (cancelled) return;
        setArticlePool(payload.filters?.article || []);
      })
      .catch(() => {
        if (!cancelled) setArticlePool([]);
      })
      .finally(() => {
        if (!cancelled) setArticleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded]);

  const selectedSlugs = useMemo(() => new Set(selected.map((s) => s.slug)), [selected]);

  const available = useMemo(
    () => allGroups.filter((g) => g.slug && !selectedSlugs.has(g.slug)),
    [allGroups, selectedSlugs],
  );

  function addGroup(g: CatalogFilterOption) {
    const slug = (g.slug || slugifyName(g.name)).toLowerCase();
    if (!slug || selectedSlugs.has(slug) || selected.length >= MAX_HEADER_TABS) return;
    setSelected((prev) => [...prev, toTab(g)]);
    setExpanded(slug);
    setSavedMsg(null);
  }

  function removeAt(index: number) {
    const slug = selected[index]?.slug;
    setSelected((prev) => prev.filter((_, i) => i !== index));
    if (expanded === slug) setExpanded(null);
    setSavedMsg(null);
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    setSelected((prev) => {
      if (from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setSavedMsg(null);
  }

  function updateTab(slug: string, patch: (tab: SelectedGroup) => SelectedGroup) {
    setSelected((prev) => prev.map((t) => (t.slug === slug ? patch(t) : t)));
    setSavedMsg(null);
  }

  function addArticle(tabSlug: string, article: CatalogFilterOption) {
    updateTab(tabSlug, (tab) => {
      if (tab.dropdown.articles.length >= MAX_ARTICLES) return tab;
      if (tab.dropdown.articles.some((a) => a.name.toLowerCase() === article.name.toLowerCase())) {
        return tab;
      }
      return {
        ...tab,
        dropdown: {
          ...tab.dropdown,
          articles: [
            ...tab.dropdown.articles,
            { name: article.name, slug: article.slug || slugifyName(article.name) },
          ],
        },
      };
    });
  }

  function removeArticle(tabSlug: string, name: string) {
    updateTab(tabSlug, (tab) => ({
      ...tab,
      dropdown: {
        ...tab.dropdown,
        articles: tab.dropdown.articles.filter((a) => a.name !== name),
      },
    }));
  }

  async function onCalloutFile(file: File | null) {
    const slug = uploadSlugRef.current;
    if (!file || !slug) return;
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(
        `/api/upload/header?action=upload-callout-image&slug=${encodeURIComponent(slug)}`,
        { method: 'POST', body: fd },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Upload failed');
      updateTab(slug, (tab) => ({
        ...tab,
        dropdown: {
          ...tab.dropdown,
          callout: { ...tab.dropdown.callout, image: String(body.image || '') },
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await fetch('/api/upload/header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedGroups: selected }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Save failed');
      try {
        localStorage.removeItem('anagha_header_nav_v1');
      } catch {
        /* ignore */
      }
      setSavedMsg('Header saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await fetch('/api/upload/header', { method: 'DELETE' });
      if (!res.ok) throw new Error('Reset failed');
      setSelected(allGroups.slice(0, MAX_HEADER_TABS).map((g) => toTab(g)));
      setExpanded(null);
      setSavedMsg('Reset to top categories by stock.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  }

  const expandedTab = selected.find((t) => t.slug === expanded) || null;
  const usedArticleNames = new Set(
    (expandedTab?.dropdown.articles || []).map((a) => a.name.toLowerCase()),
  );

  return (
    <div className="space-y-6 border-t border-gray-100 pt-16">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500" />
          <h2 className="text-xl font-display font-bold text-navy uppercase tracking-widest">
            Header
          </h2>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            ({selected.length} tabs)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetAll}
            disabled={saving || loading}
            className="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-navy disabled:opacity-50"
          >
            Reset all
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="px-4 py-1.5 rounded-full border border-navy/20 text-[10px] font-black text-navy uppercase hover:bg-navy/5 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save header'}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onCalloutFile(e.target.files?.[0] || null)}
      />

      {error ? (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded px-3 py-2">
          {error}
        </p>
      ) : null}
      {savedMsg ? (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
          {savedMsg}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-navy">
              Shown in header ({selected.length})
            </h3>
            {selected.map((item, index) => {
              const open = expanded === item.slug;
              const isDragging = dragIndex === index;
              const isOver = dragOverIndex === index && dragIndex !== index;
              return (
                <div
                  key={item.slug}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex != null) reorder(dragIndex, index);
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-colors ${
                    isDragging
                      ? 'border-navy/40 opacity-60'
                      : isOver
                        ? 'border-navy border-dashed'
                        : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        setDragIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(index));
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      className="text-gray-300 text-lg leading-none cursor-grab active:cursor-grabbing select-none px-1 -ml-1 touch-none"
                      aria-label={`Drag to reorder ${item.label}`}
                      title="Drag to reorder"
                    >
                      ⋮⋮
                    </button>
                    <span className="flex-1 text-[13px] font-bold text-navy uppercase tracking-wide">
                      {item.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : item.slug)}
                      className="text-[10px] font-black uppercase tracking-wider text-navy border border-navy/15 rounded-full px-3 py-1 hover:bg-navy/5"
                    >
                      {open ? 'Collapse ▲' : 'Edit dropdown ▾'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>

                  {open ? (
                    <div className="border-t border-gray-100 px-4 py-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#fafbfd]">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-navy">
                            By categories
                          </h4>
                          <span className="text-[10px] text-gray-400">
                            {item.dropdown.articles.length}/{MAX_ARTICLES}
                          </span>
                        </div>
                        <ul className="space-y-2 mb-3">
                          {item.dropdown.articles.map((a, i) => (
                            <li
                              key={a.name}
                              className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2"
                            >
                              <span className="text-[11px] text-gray-400 w-4">{i + 1}</span>
                              <span className="flex-1 text-[13px] text-navy font-medium">{a.name}</span>
                              <button
                                type="button"
                                onClick={() => removeArticle(item.slug, a.name)}
                                className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold"
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                        {item.dropdown.articles.length < MAX_ARTICLES ? (
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {articleLoading ? (
                              <p className="text-[12px] text-gray-400">Loading articles…</p>
                            ) : (
                              articlePool
                                .filter((a) => !usedArticleNames.has(a.name.toLowerCase()))
                                .slice(0, 40)
                                .map((a) => (
                                  <button
                                    key={a.id || a.name}
                                    type="button"
                                    onClick={() => addArticle(item.slug, a)}
                                    className="w-full text-left text-[12px] px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-navy/30"
                                  >
                                    + {a.name}
                                  </button>
                                ))
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-navy mb-3">
                          Callout
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            uploadSlugRef.current = item.slug;
                            fileRef.current?.click();
                          }}
                          className="w-full mb-3 flex items-center gap-3 border border-dashed border-gray-300 rounded-xl p-3 bg-white hover:border-navy/40 text-left"
                        >
                          <div className="w-16 h-16 rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                            {item.dropdown.callout.image ? (
                              <img
                                src={item.dropdown.callout.image}
                                alt=""
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] text-gray-300">Img</span>
                            )}
                          </div>
                          <span className="text-[12px] text-gray-500">
                            Click to upload callout image
                          </span>
                        </button>
                        <label className="block mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Callout title
                          </span>
                          <input
                            value={item.dropdown.callout.title}
                            onChange={(e) =>
                              updateTab(item.slug, (tab) => ({
                                ...tab,
                                dropdown: {
                                  ...tab.dropdown,
                                  callout: { ...tab.dropdown.callout, title: e.target.value },
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-navy"
                            placeholder="Buy Solitaire Rings"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Callout description
                          </span>
                          <input
                            value={item.dropdown.callout.desc}
                            onChange={(e) =>
                              updateTab(item.slug, (tab) => ({
                                ...tab,
                                dropdown: {
                                  ...tab.dropdown,
                                  callout: { ...tab.dropdown.callout, desc: e.target.value },
                                },
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-navy"
                            placeholder="Starting at Rs. 30,000/-"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-navy mb-3">
              Available ERP categories
              {selected.length >= MAX_HEADER_TABS ? ' (max reached)' : ''}
            </h3>
            <div className="max-h-[560px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {available.map((g) => {
                const slug = g.slug || slugifyName(g.name);
                const disabled = selected.length >= MAX_HEADER_TABS;
                return (
                  <button
                    key={slug}
                    type="button"
                    disabled={disabled}
                    onClick={() => addGroup(g)}
                    className="w-full flex items-center justify-between gap-3 bg-[#f8fafc] hover:bg-white border border-gray-100 rounded-xl px-4 py-3 text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="text-[13px] font-semibold text-navy uppercase">{g.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {typeof g.count === 'number' ? `${g.count} items` : ''} · Add
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
