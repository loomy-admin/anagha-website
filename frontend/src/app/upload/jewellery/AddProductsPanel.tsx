'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createCatalogItem,
  downloadCatalogTemplate,
  importCatalogSpreadsheet,
  uploadWebsiteImage,
} from '@/lib/erpCatalog';
import ProductPhotoButtons from '@/components/ProductPhotoButtons';
import { MAX_PRODUCT_IMAGES } from '@/lib/imageCapture';
import {
  CatalogItemForm,
  emptyCatalogForm,
  formToPayload,
  type CatalogFormValues,
} from './CatalogItemForm';

export const addProductsBtn =
  'bg-[#032C5E] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full disabled:opacity-50';

type Suggestions = {
  groups: string[];
  types: string[];
  articles: string[];
  metals: string[];
  purities: string[];
};

export default function AddProductsPanel({
  defaultGroup = '',
  lockGroup = false,
  suggestions,
  onMessage,
  onDone,
  onClose,
}: {
  defaultGroup?: string;
  lockGroup?: boolean;
  suggestions: Suggestions;
  onMessage: (message: string | null) => void;
  onDone: () => void;
  onClose?: () => void;
}) {
  const [innerTab, setInnerTab] = useState<'product' | 'excel'>('product');
  const [form, setForm] = useState<CatalogFormValues>(emptyCatalogForm({ group: defaultGroup }));
  const [saving, setSaving] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<Array<{ dataUrl: string; fileName: string }>>([]);
  const [sheetUploading, setSheetUploading] = useState(false);
  const sheetRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!defaultGroup) return;
    setForm((prev) => (prev.group === defaultGroup ? prev : { ...prev, group: defaultGroup }));
  }, [defaultGroup]);

  const categoryHint = lockGroup && defaultGroup ? defaultGroup : null;

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 mb-10">
      <div className="flex items-center gap-6 mb-8 border-b border-gray-100">
        {(
          [
            ['product', 'Add product'],
            ['excel', 'Excel upload'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setInnerTab(id)}
            className={`pb-3 text-[11px] font-black uppercase tracking-widest ${
              innerTab === id ? 'text-navy border-b-2 border-navy' : 'text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto mb-3 text-gray-400 hover:text-navy text-sm"
            aria-label="Close"
          >
            Close
          </button>
        ) : null}
      </div>

      {innerTab === 'product' ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            onMessage(null);
            try {
              const payload = formToPayload({
                ...form,
                group: lockGroup ? defaultGroup || form.group : form.group,
              });
              const created = await createCatalogItem(payload);
              for (const photo of pendingPhotos) {
                await uploadWebsiteImage(created.tag_number, photo);
              }
              setPendingPhotos([]);
              onMessage(`Added ${created.tag_number}`);
              setForm(emptyCatalogForm({ group: defaultGroup || form.group }));
              onDone();
            } catch (err) {
              onMessage(err instanceof Error ? err.message : 'Failed to add product');
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-6"
        >
          <p className="text-sm text-gray-500">
            {categoryHint
              ? `This product will be added to ${categoryHint}.`
              : 'Choose category in the form, or add a new one from the dropdown.'}
          </p>
          <CatalogItemForm
            values={form}
            onChange={setForm}
            suggestions={suggestions}
            groupLocked={lockGroup}
          />
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-gray-400">
              Photos ({pendingPhotos.length}/{MAX_PRODUCT_IMAGES})
            </p>
            <ProductPhotoButtons
              disabled={saving || pendingPhotos.length >= MAX_PRODUCT_IMAGES}
              onReady={(dataUrl, fileName) => {
                setPendingPhotos((prev) =>
                  prev.length >= MAX_PRODUCT_IMAGES ? prev : [...prev, { dataUrl, fileName }],
                );
              }}
            />
            {pendingPhotos.length ? (
              <ul className="flex flex-wrap gap-3">
                {pendingPhotos.map((photo, i) => (
                  <li
                    key={`${photo.fileName}-${i}`}
                    className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100"
                  >
                    <img src={photo.dataUrl} alt="" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-navy text-white text-[10px]"
                      onClick={() => setPendingPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className={addProductsBtn}>
              {saving ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </form>
      ) : null}

      {innerTab === 'excel' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {categoryHint ? (
              <>
                Template Category column is filled with <strong>{categoryHint}</strong>. Rows without a
                category, and this upload, go into that category. Required: Tag Number, Name.
              </>
            ) : (
              <>
                Download the Excel template. Keep the <strong>Category</strong> column — each row is
                placed in that category. Required: Category, Tag Number, Name.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={addProductsBtn}
              onClick={() =>
                downloadCatalogTemplate(categoryHint || undefined).catch((err) => onMessage(err.message))
              }
            >
              Download template
            </button>
            <button
              type="button"
              className={addProductsBtn}
              onClick={() => sheetRef.current?.click()}
              disabled={sheetUploading}
            >
              {sheetUploading ? 'Uploading…' : 'Choose Excel file'}
            </button>
            <input
              ref={sheetRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setSheetUploading(true);
                onMessage(null);
                try {
                  const result = await importCatalogSpreadsheet(file, {
                    defaultCategory: categoryHint || undefined,
                    forceCategory: Boolean(categoryHint),
                  });
                  onMessage([result.message, ...(result.errors || []).slice(0, 8)].filter(Boolean).join(' '));
                  onDone();
                } catch (err) {
                  onMessage(err instanceof Error ? err.message : 'Upload failed');
                } finally {
                  setSheetUploading(false);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
