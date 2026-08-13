import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';
import { fetchErpPublic } from './erpCatalog.js';
import { applyWebsiteDescription, getAllWebsiteItemMeta } from './websiteItemMeta.js';
import { getErpVisibility } from './erpVisibility.js';
import { sql, inArray } from 'drizzle-orm';

let isSyncing = false;

export async function syncCatalogToDb(isFullReconciliation: boolean = false) {
  if (isSyncing) {
    console.log('[syncCatalog] Sync already in progress, aborting this run.');
    return;
  }
  isSyncing = true;
  console.log(`[syncCatalog] Starting background catalog sync (Full Reconciliation: ${isFullReconciliation})...`);
  try {
    const visibility = await getErpVisibility();
    const metaMap = await getAllWebsiteItemMeta();

    const seenTags = new Set<string>();
    let offset = 0;
    const limit = 200;
    let total = 1; // dummy initial value to enter loop
    let insertedOrUpdated = 0;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    while (offset < total) {
      await delay(200);
      const res = await fetchErpPublic('/catalog', { offset: String(offset), limit: String(limit) });

      if (!res?.data?.items || res.data.items.length === 0) {
        break;
      }

      total = res.data.total;

      const visibleItems = res.data.items.filter((item: any) => {
        const groupSlug = String(item.group_slug || '').toLowerCase();
        const tag = String(item.tag_number || '');
        const hasCat = visibility.visibleCategories.length > 0;
        const hasProd = visibility.visibleProducts.length > 0;

        if (hasCat || hasProd) {
          const catVisible = visibility.visibleCategories.includes(groupSlug);
          const prodVisible = visibility.visibleProducts.includes(tag);
          if (!catVisible && !prodVisible) return false;
        }
        return true;
      });

      const processedItems = visibleItems.map((item: any) => applyWebsiteDescription(item, metaMap));

      const rows = processedItems.map((item: any) => ({
        tagNumber: item.tag_number,
        id: item.id,
        groupSlug: item.group_slug,
        typeSlug: item.type_slug,
        articleSlug: item.article_slug,
        metalType: item.metal_type,
        purity: item.purity,
        displayPrice: item.display_price ? Number(item.display_price) : null,
        hasImage: !!(item.image_url || item.pos_image_url || (Array.isArray(item.website_images) && item.website_images.length > 0)),
        erpCreatedAt: item.created_at ? new Date(item.created_at) : null,
        data: item,
      }));

      // Track all visible tag numbers from this chunk
      rows.forEach((r: any) => seenTags.add(r.tagNumber));

      if (rows.length > 0) {
        // UPSERT into Postgres. The WHERE clause prevents unnecessary disk writes if data hasn't changed.
        await db.insert(cachedCatalogItems)
          .values(rows)
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
              hasImage: sql`EXCLUDED.has_image`,
              erpCreatedAt: sql`EXCLUDED.erp_created_at`,
              data: sql`EXCLUDED.data`,
              syncedAt: sql`now()`,
            },
            where: sql`EXCLUDED.data::text != cached_catalog_items.data::text`,
          });
        insertedOrUpdated += rows.length;
      }

      offset += res.data.items.length;
    }

    // Cleanup: Delete items from DB that are no longer visible or deleted in ERP
    // ONLY do this during a full reconciliation to avoid wiping DB if ERP glitch happens midway
    if (isFullReconciliation && seenTags.size > 0 && offset >= total) {
      const existingItems = await db.select({ tagNumber: cachedCatalogItems.tagNumber }).from(cachedCatalogItems);
      const tagsToDelete = existingItems.filter(item => !seenTags.has(item.tagNumber)).map(item => item.tagNumber);

      if (tagsToDelete.length > 0) {
        // Chunk deletions to avoid param limits
        const deleteChunkSize = 1000;
        for (let i = 0; i < tagsToDelete.length; i += deleteChunkSize) {
          const chunk = tagsToDelete.slice(i, i + deleteChunkSize);
          await db.delete(cachedCatalogItems).where(inArray(cachedCatalogItems.tagNumber, chunk));
        }
        console.log(`[syncCatalog] Deleted ${tagsToDelete.length} stale/hidden items.`);
      }
    }

    console.log(`[syncCatalog] Sync complete. Processed ${insertedOrUpdated} visible items in batches.`);
  } catch (error) {
    console.error('[syncCatalog] Sync failed:', error);
  } finally {
    isSyncing = false;
  }
}
