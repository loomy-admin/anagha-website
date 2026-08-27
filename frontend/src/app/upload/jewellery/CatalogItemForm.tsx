'use client';

import { useState } from 'react';
import { createCatalogGroup, createCatalogTaxonomyValue } from '@/lib/erpCatalog';

export type CatalogFormValues = {
  tag_number: string;
  name: string;
  group: string;
  type: string;
  article: string;
  metal_type: string;
  purity: string;
  display_price: string;
  mrp: string;
  net_weight: string;
  gross_weight: string;
  total_weight: string;
  stone_weight: string;
  stone_charges: string;
  description: string;
};

export function emptyCatalogForm(partial: Partial<CatalogFormValues> = {}): CatalogFormValues {
  return {
    tag_number: '',
    name: '',
    group: '',
    type: '',
    article: '',
    metal_type: '',
    purity: '',
    display_price: '',
    mrp: '',
    net_weight: '',
    gross_weight: '',
    total_weight: '',
    stone_weight: '',
    stone_charges: '',
    description: '',
    ...partial,
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-navy outline-none focus:border-navy bg-white';

function uniqueNames(current: string, options: string[] | undefined) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [current, ...(options || [])]) {
    const name = String(raw || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

const ADD_NEW = '__add_new__';

function SelectField({
  label,
  value,
  options,
  onChange,
  required,
  persistKind,
  locked,
}: {
  label: string;
  value: string;
  options: string[] | undefined;
  onChange: (value: string) => void;
  required?: boolean;
  persistKind?: 'group' | 'type' | 'article' | 'metal' | 'purity';
  locked?: boolean;
}) {
  const [extras, setExtras] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const list = uniqueNames(value, [...(options || []), ...extras]);

  async function confirmAdd() {
    const name = draft.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      if (persistKind === 'group') {
        await createCatalogGroup(name);
      } else if (persistKind) {
        await createCatalogTaxonomyValue(persistKind, name);
      }
      setExtras((prev) => [...prev, name]);
      onChange(name);
      setDraft('');
      setAdding(false);
    } catch {
      setExtras((prev) => [...prev, name]);
      onChange(name);
      setDraft('');
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-wider text-gray-400">{label}</span>
      <select
        value={adding ? ADD_NEW : value}
        required={required && !adding}
        disabled={locked}
        onChange={(e) => {
          if (e.target.value === ADD_NEW) {
            setAdding(true);
            setDraft('');
            return;
          }
          setAdding(false);
          onChange(e.target.value);
        }}
        className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
      >
        {!value && !adding ? <option value="">Select</option> : null}
        {list.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        {locked ? null : <option value={ADD_NEW}>Add new…</option>}
      </select>
      {adding ? (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void confirmAdd();
              }
            }}
            placeholder="New name"
            className={inputClass}
            autoFocus
          />
          <button
            type="button"
            disabled={saving || !draft.trim()}
            onClick={() => void confirmAdd()}
            className="shrink-0 px-4 py-2 rounded-full bg-navy text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function CatalogItemForm({
  values,
  onChange,
  tagLocked,
  groupLocked,
  suggestions,
}: {
  values: CatalogFormValues;
  onChange: (next: CatalogFormValues) => void;
  tagLocked?: boolean;
  groupLocked?: boolean;
  suggestions?: {
    groups?: string[];
    types?: string[];
    articles?: string[];
    metals?: string[];
    purities?: string[];
  };
}) {
  function set<K extends keyof CatalogFormValues>(key: K, value: string) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Tag number">
        <input
          value={values.tag_number}
          disabled={tagLocked}
          onChange={(e) => set('tag_number', e.target.value.toUpperCase())}
          className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
          required
        />
      </Field>
      <Field label="Name">
        <input value={values.name} onChange={(e) => set('name', e.target.value)} className={inputClass} required />
      </Field>
      <SelectField
        label="Category / group"
        value={values.group}
        options={suggestions?.groups}
        onChange={(v) => set('group', v)}
        required
        persistKind="group"
        locked={groupLocked}
      />
      <SelectField
        label="Type"
        value={values.type}
        options={suggestions?.types}
        onChange={(v) => set('type', v)}
        persistKind="type"
      />
      <SelectField
        label="Article"
        value={values.article}
        options={suggestions?.articles}
        onChange={(v) => set('article', v)}
        persistKind="article"
      />
      <SelectField
        label="Metal"
        value={values.metal_type}
        options={suggestions?.metals}
        onChange={(v) => set('metal_type', v)}
        persistKind="metal"
      />
      <SelectField
        label="Purity"
        value={values.purity}
        options={suggestions?.purities}
        onChange={(v) => set('purity', v)}
        persistKind="purity"
      />
      <Field label="Display price (₹)">
        <input
          type="number"
          min="0"
          step="1"
          value={values.display_price}
          onChange={(e) => set('display_price', e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="MRP (₹)">
        <input
          type="number"
          min="0"
          step="1"
          value={values.mrp}
          onChange={(e) => set('mrp', e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Net weight (g)">
        <input
          type="number"
          min="0"
          step="0.001"
          value={values.net_weight}
          onChange={(e) => set('net_weight', e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Gross weight (g)">
        <input
          type="number"
          min="0"
          step="0.001"
          value={values.gross_weight}
          onChange={(e) => set('gross_weight', e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Total weight (g)">
        <input
          type="number"
          min="0"
          step="0.001"
          value={values.total_weight}
          onChange={(e) => set('total_weight', e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Stone weight (g)">
        <input
          type="number"
          min="0"
          step="0.001"
          value={values.stone_weight}
          onChange={(e) => set('stone_weight', e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Stone charges (₹)">
        <input
          type="number"
          min="0"
          step="1"
          value={values.stone_charges}
          onChange={(e) => set('stone_charges', e.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            rows={5}
            className={`${inputClass} resize-y min-h-[120px]`}
          />
        </Field>
      </div>
    </div>
  );
}

export function catalogItemToForm(item: {
  tag_number?: string | null;
  name?: string | null;
  group?: string | null;
  type?: string | null;
  article?: string | null;
  metal_type?: string | null;
  purity?: string | null;
  display_price?: number | null;
  mrp?: number | null;
  net_weight?: number | string | null;
  gross_weight?: number | string | null;
  total_weight?: number | string | null;
  stone_weight?: number | string | null;
  stone_charges?: number | null;
  description?: string | null;
}): CatalogFormValues {
  const num = (v: number | string | null | undefined) =>
    v == null || v === '' ? '' : String(v);
  return emptyCatalogForm({
    tag_number: item.tag_number || '',
    name: item.name || '',
    group: item.group || '',
    type: item.type || '',
    article: item.article || '',
    metal_type: item.metal_type || '',
    purity: item.purity || '',
    display_price: num(item.display_price),
    mrp: num(item.mrp),
    net_weight: num(item.net_weight),
    gross_weight: num(item.gross_weight),
    total_weight: num(item.total_weight),
    stone_weight: num(item.stone_weight),
    stone_charges: num(item.stone_charges),
    description: item.description || '',
  });
}

export function formToPayload(values: CatalogFormValues) {
  const num = (v: string) => (v.trim() === '' ? null : Number(v));
  return {
    tag_number: values.tag_number.trim().toUpperCase(),
    name: values.name.trim(),
    group: values.group.trim(),
    type: values.type.trim(),
    article: values.article.trim(),
    metal_type: values.metal_type.trim(),
    purity: values.purity.trim(),
    display_price: num(values.display_price),
    mrp: num(values.mrp),
    net_weight: num(values.net_weight),
    gross_weight: num(values.gross_weight),
    total_weight: num(values.total_weight),
    stone_weight: num(values.stone_weight),
    stone_charges: num(values.stone_charges),
    description: values.description,
  };
}
