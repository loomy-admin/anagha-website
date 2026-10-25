import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';

/**
 * ERP owns stock. These only mirror ERP checkout holds on the website copy so a
 * reserved or sold piece disappears right away instead of at the next sync.
 */
function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((t) => t.trim().toUpperCase()).filter(Boolean))];
}

export async function markTagsReserved(tags: string[]) {
  const unique = normalizeTags(tags);
  if (!unique.length) return;
  await db
    .update(cachedCatalogItems)
    .set({ status: 'reserved', syncedAt: new Date() })
    .where(and(inArray(cachedCatalogItems.tagNumber, unique), eq(cachedCatalogItems.status, 'available')));
}

export async function markTagsReleased(tags: string[]) {
  const unique = normalizeTags(tags);
  if (!unique.length) return;
  await db
    .update(cachedCatalogItems)
    .set({ status: 'available', syncedAt: new Date() })
    .where(and(inArray(cachedCatalogItems.tagNumber, unique), eq(cachedCatalogItems.status, 'reserved')));
}

export async function markTagsSold(tags: string[]) {
  const unique = normalizeTags(tags);
  if (!unique.length) return;
  await db
    .update(cachedCatalogItems)
    .set({ status: 'sold', soldAt: new Date(), syncedAt: new Date() })
    .where(inArray(cachedCatalogItems.tagNumber, unique));
}
