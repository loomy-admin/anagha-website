import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';
import { fetchErpPublic } from './erpCatalog.js';
import { applyWebsiteDescription, getAllWebsiteItemMeta } from './websiteItemMeta.js';
import { relocateItemMedia } from './copyErpImages.js';
import { gcsConfigured } from './objectStorage.js';
import { sql, inArray } from 'drizzle-orm';

let isSyncing = false;

export type CatalogImportProgress = {
  running: boolean;
  ok: boolean | null;
  message: string;
  count: number;
  total: number;
  at: string | null;
};

let progress: CatalogImportProgress = {
  running: false,
  ok: null,
  message: '',
  count: 0,
  total: 0,
  at: null,
};

export function getCatalogImportProgress() {
  return progress;
}

/** ERP public catalog includes stock `status`. Website sold/available is Neon-only. */
function stripErpStockFields(item: Record<string, unknown>) {
  const {
    status: _status,
    sold_at: _soldAt,
    available: _available,
    in_stock: _inStock,
    stock_status: _stockStatus,
    ...rest
  } = item;
  return rest;
}

function setProgress(partial: Partial<CatalogImportProgress>) {
  progress = { ...progress, ...partial, at: new Date().toISOString() };
}

export function startCatalogImportFromErp() {
  if (isSyncing) {
    return { started: false as const, progress };
  }
  isSyncing = true;
  setProgress({
    running: true,
    ok: null,
    message: 'Importing from ERP…',
    count: 0,
    total: 0,
  });
  void runCatalogImport();
  return { started: true as const, progress };
}

async function runCatalogImport() {
  console.log(
    `[catalog-import] Starting ERP import (catalog JSON + image copy to ${gcsConfigured() ? 'GCS' : 'local /uploads'}; no runtime ERP after this)...`,
  );
  try {
    const metaMap = await getAllWebsiteItemMeta();

    let offset = 0;
    const limit = 200;
    let total = 1;
    let insertedOrUpdated = 0;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    while (offset < total) {
      await delay(200);
      const res = await fetchErpPublic('/catalog', { offset: String(offset), limit: String(limit) });

      if (!res?.data?.items || res.data.items.length === 0) {
        break;
      }

      total = Number(res.data.total) || total;

      const processedItems = res.data.items
        .filter((item: { tag_number?: string }) => Boolean(item.tag_number))
        .map((item: Record<string, unknown>) =>
          applyWebsiteDescription(stripErpStockFields(item), metaMap),
        );

      const uniqueItems: Record<string, unknown>[] = [];
      const seen = new Set<string>();
      for (const item of processedItems) {
        const tag = String(item.tag_number).trim().toUpperCase();
        if (seen.has(tag)) continue;
        seen.add(tag);
        uniqueItems.push({ ...item, tag_number: tag });
      }

      const existingRows = uniqueItems.length
        ? await db
            .select()
            .from(cachedCatalogItems)
            .where(
              inArray(
                cachedCatalogItems.tagNumber,
                uniqueItems.map((item) => String(item.tag_number)),
              ),
            )
        : [];
      const existingByTag = new Map(existingRows.map((row) => [row.tagNumber.toUpperCase(), row]));

      const skipStatus = new Set(['sold', 'hidden', 'reserved']);
      const uniqueRows = [];
      for (const item of uniqueItems) {
        const tag = String(item.tag_number);
        const existing = existingByTag.get(tag);
        if (existing && (existing.origin === 'website' || skipStatus.has(existing.status))) {
          continue;
        }
        const existingData =
          existing?.data && typeof existing.data === 'object'
            ? (existing.data as Record<string, unknown>)
            : null;
        const data = await relocateItemMedia(tag, item, existingData);
        const image_url = typeof data.image_url === 'string' ? data.image_url : null;
        uniqueRows.push({
          tagNumber: tag,
          id: item.id as string | null,
          groupSlug: item.group_slug as string | null,
          typeSlug: item.type_slug as string | null,
          articleSlug: item.article_slug as string | null,
          metalType: item.metal_type as string | null,
          purity: item.purity as string | null,
          displayPrice: item.display_price ? Number(item.display_price) : null,
          hasImage: Boolean(
            image_url ||
              (Array.isArray(data.images) && data.images.length) ||
              (Array.isArray(data.website_images) && data.website_images.length),
          ),
          erpCreatedAt: item.created_at ? new Date(String(item.created_at)) : null,
          data,
          origin: 'erp' as const,
          status: 'available' as const,
        });
      }

      const chunkSize = 40;
      if (uniqueRows.length) {
      for (let i = 0; i < uniqueRows.length; i += chunkSize) {
        const chunk = uniqueRows.slice(i, i + chunkSize);
        await db
          .insert(cachedCatalogItems)
          .values(chunk)
          .onConflictDoUpdate({
            target: cachedCatalogItems.tagNumber,
            set: {
              id: sql`EXCLUDED.id`,
              groupSlug: sql`EXCLUDED.group_slug`,
              typeSlug: sql`EXCLUDED.type_slug`,
              articleSlug: sql`EXCLUDED.article_slug`,
              metalType: sql`EXCLUDED.metal_type`,
              purity: sql`EXCLUDED.purity`,
              displayPrice: sql`EXCLUDED.display_price`,
              hasImage: sql`EXCLUDED.has_image OR COALESCE(cached_catalog_items.has_image, false)`,
              erpCreatedAt: sql`EXCLUDED.erp_created_at`,
              data: sql`EXCLUDED.data`,
              origin: sql`EXCLUDED.origin`,
              syncedAt: sql`now()`,
            },
            where: sql`cached_catalog_items.origin = 'erp' AND cached_catalog_items.status NOT IN ('sold', 'hidden', 'reserved')`,
          });
      }
      }
      insertedOrUpdated += uniqueRows.length;

      offset += res.data.items.length;
      setProgress({
        running: true,
        count: insertedOrUpdated,
        total,
        message: `Importing ${Math.min(offset, total)} / ${total}`,
      });
      console.log(`[catalog-import] ${Math.min(offset, total)}/${total}`);
    }

    const [{ dbCount }] = await db
      .select({ dbCount: sql<number>`count(*)::int` })
      .from(cachedCatalogItems);

    const message = `Imported ${insertedOrUpdated} from ERP. Website catalog now has ${dbCount} items.`;
    setProgress({
      running: false,
      ok: true,
      count: Number(dbCount) || insertedOrUpdated,
      total,
      message,
    });
    console.log(`[catalog-import] Complete. ERP pages ${insertedOrUpdated}/${total}. DB rows ${dbCount}.`);
  } catch (error) {
    console.error('[catalog-import] Failed:', error);
    setProgress({
      running: false,
      ok: false,
      message: error instanceof Error ? error.message : 'Import failed',
    });
  } finally {
    isSyncing = false;
  }
}

export async function importCatalogFromErp() {
  const { started, progress: current } = startCatalogImportFromErp();
  if (!started) {
    return { ok: false, message: current.message || 'Import already in progress', count: current.count };
  }
  while (getCatalogImportProgress().running) {
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  const done = getCatalogImportProgress();
  return { ok: Boolean(done.ok), message: done.message, count: done.count };
}

/** @deprecated Use importCatalogFromErp — kept so old admin token route still compiles until removed. */
export async function syncCatalogToDb(_isFullReconciliation: boolean = false) {
  return importCatalogFromErp();
}
