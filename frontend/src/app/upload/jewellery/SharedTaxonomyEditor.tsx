'use client';

import { useState } from 'react';
import {
  createCatalogTaxonomyValue,
  deleteCatalogTaxonomyValue,
  renameCatalogTaxonomy,
  slugifyName,
} from '@/lib/erpCatalog';

type Kind = 'type' | 'article' | 'metal' | 'purity';

function valueKey(kind: Kind, name: string) {
  return kind === 'metal' || kind === 'purity' ? name : slugifyName(name);
}

function Row({
  kind,
  name,
  onRenamed,
  onDeleted,
}: {
  kind: Kind;
  name: string;
  onRenamed: (from: string, to: string) => void;
  onDeleted: (name: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm text-navy outline-none focus:border-navy"
        />
        <button
          type="button"
          disabled={busy || !draft.trim() || draft.trim() === name}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const result = await renameCatalogTaxonomy(kind, valueKey(kind, name), draft.trim());
              onRenamed(name, result.name);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Update failed');
            } finally {
              setBusy(false);
            }
          }}
          className="shrink-0 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-navy text-white disabled:opacity-30"
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm(`Remove “${name}”? Products keep their other fields; this label is cleared.`)) return;
            setBusy(true);
            setError(null);
            try {
              await deleteCatalogTaxonomyValue(kind, valueKey(kind, name));
              onDeleted(name);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Delete failed');
            } finally {
              setBusy(false);
            }
          }}
          className="shrink-0 px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-rose-600 border border-rose-100 disabled:opacity-30"
        >
          Delete
        </button>
      </div>
      {error ? <p className="text-xs text-rose-600 mt-1">{error}</p> : null}
    </li>
  );
}

const TABS: Array<{ id: Kind; label: string; key: 'types' | 'articles' | 'metals' | 'purities' }> = [
  { id: 'type', label: 'Types', key: 'types' },
  { id: 'article', label: 'Articles', key: 'articles' },
  { id: 'metal', label: 'Metal', key: 'metals' },
  { id: 'purity', label: 'Purity', key: 'purities' },
];

export default function SharedTaxonomyEditor({
  types,
  articles,
  metals,
  purities,
  onChange,
  onClose,
}: {
  types: string[];
  articles: string[];
  metals: string[];
  purities: string[];
  onChange: (patch: Partial<{ types: string[]; articles: string[]; metals: string[]; purities: string[] }>) => void;
  onClose?: () => void;
}) {
  const [tab, setTab] = useState<Kind>('type');
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const lists = { types, articles, metals, purities };
  const current = TABS.find((t) => t.id === tab)!;
  const names = lists[current.key];

  function setNames(next: string[]) {
    onChange({ [current.key]: next });
  }

  return (
    <div className="bg-white rounded-[24px] p-6 border border-gray-100 mb-8">
        <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-navy">Labels</h2>
          <p className="text-sm text-gray-500">Types, articles, metal, and purity — shared by every category.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setDraft('');
                setAddError(null);
              }}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                tab === t.id ? 'bg-navy text-white' : 'text-gray-400 border border-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
          {onClose ? (
            <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-navy ml-2">
              Close
            </button>
          ) : null}
        </div>
      </div>

      <form
        className="flex gap-2 mb-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const name = draft.trim();
          if (!name || adding) return;
          setAdding(true);
          setAddError(null);
          try {
            const created = await createCatalogTaxonomyValue(tab, name);
            if (!names.some((n) => n.toLowerCase() === created.name.toLowerCase())) {
              setNames([...names, created.name]);
            }
            setDraft('');
          } catch (err) {
            setAddError(err instanceof Error ? err.message : 'Add failed');
          } finally {
            setAdding(false);
          }
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`New ${current.label.toLowerCase().replace(/s$/, '')}`}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm text-navy outline-none focus:border-navy"
        />
        <button
          type="submit"
          disabled={adding || !draft.trim()}
          className="px-5 py-2.5 rounded-full bg-[#032C5E] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      </form>
      {addError ? <p className="text-xs text-rose-600 mb-3">{addError}</p> : null}

      {names.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No {current.label.toLowerCase()} yet.</p>
      ) : (
        <ul>
          {names.map((name) => (
            <Row
              key={`${tab}-${name}`}
              kind={tab}
              name={name}
              onRenamed={(from, to) => setNames(names.map((n) => (n === from ? to : n)))}
              onDeleted={(removed) => setNames(names.filter((n) => n !== removed))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
