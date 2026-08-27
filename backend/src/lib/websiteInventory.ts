import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';
import { quoteBuyGetOffer } from './buyGetOffer.js';

export type CatalogRow = typeof cachedCatalogItems.$inferSelect;

function itemPayload(row: CatalogRow) {
  const data = row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
  const qty = 1;
  const price = Number(data.display_price ?? data.mrp ?? row.displayPrice ?? 0);
  return {
    ...data,
    tag_number: row.tagNumber,
    inventory_id: row.id || data.id || null,
    quantity: qty,
    mrp: data.mrp ?? price,
    item_total: price,
    display_price: price,
    name: data.name || data.description || row.tagNumber,
    description: data.description || data.name || row.tagNumber,
  };
}

export async function getCatalogRowsByTags(tags: string[]) {
  const unique = [...new Set(tags.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  if (!unique.length) return [];
  const rows = await db
    .select()
    .from(cachedCatalogItems)
    .where(inArray(cachedCatalogItems.tagNumber, unique));
  const byTag = new Map(rows.map((row) => [row.tagNumber.toUpperCase(), row]));
  return unique.map((tag) => byTag.get(tag)).filter(Boolean) as CatalogRow[];
}

export async function reserveWebsiteTags(tags: string[]) {
  const unique = [...new Set(tags.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const reserved: CatalogRow[] = [];
  try {
    for (const tag of unique) {
      const [row] = await db
        .update(cachedCatalogItems)
        .set({ status: 'reserved', syncedAt: new Date() })
        .where(and(eq(cachedCatalogItems.tagNumber, tag), eq(cachedCatalogItems.status, 'available')))
        .returning();
      if (!row) {
        throw Object.assign(new Error(`Item ${tag} is not available`), { status: 409 });
      }
      reserved.push(row);
    }
  } catch (err) {
    if (reserved.length) {
      await releaseWebsiteTags(reserved.map((row) => row.tagNumber)).catch(() => undefined);
    }
    throw err;
  }

  const items = reserved.map(itemPayload);
  const quoted = await quoteBuyGetOffer(items);
  const totalAmount = quoted.items_amount;
  return {
    items: quoted.lines,
    total_amount: totalAmount,
    items_subtotal: quoted.items_subtotal,
    offer: quoted.applied,
    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  };
}

export async function releaseWebsiteTags(tags: string[]) {
  const unique = [...new Set(tags.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  if (!unique.length) return;
  await db
    .update(cachedCatalogItems)
    .set({ status: 'available', syncedAt: new Date() })
    .where(and(inArray(cachedCatalogItems.tagNumber, unique), eq(cachedCatalogItems.status, 'reserved')));
}

export async function markWebsiteTagsSold(tags: string[]) {
  const unique = [...new Set(tags.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  if (!unique.length) return;
  await db
    .update(cachedCatalogItems)
    .set({ status: 'sold', soldAt: new Date(), syncedAt: new Date() })
    .where(inArray(cachedCatalogItems.tagNumber, unique));
}
