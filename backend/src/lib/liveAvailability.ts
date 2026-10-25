import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';
import { fetchErpItemStatus, type ErpItemStatus } from './erpCatalog.js';

export type LiveAvailability = {
  /** null when ERP could not be reached; the page should not block the customer. */
  available: boolean | null;
  status: ErpItemStatus;
};

const CACHE_MS = 30 * 1000;
const CONCURRENCY = 4;
const cache = new Map<string, { status: ErpItemStatus; at: number }>();

async function statusFor(tag: string): Promise<ErpItemStatus> {
  const hit = cache.get(tag);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.status;
  const status = await fetchErpItemStatus(tag);
  if (status !== 'unknown') cache.set(tag, { status, at: Date.now() });
  return status;
}

/**
 * Ask ERP whether each tag can still be bought, and hide sold or held pieces in the
 * website copy immediately. Never re-publishes a piece; the scheduled sync does that.
 */
export async function checkLiveAvailability(tags: string[]) {
  const unique = [...new Set(tags.map((t) => String(t || '').trim().toUpperCase()).filter(Boolean))];
  const result: Record<string, LiveAvailability> = {};
  const goneTags: string[] = [];
  const heldTags: string[] = [];

  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    const statuses = await Promise.all(batch.map(statusFor));
    batch.forEach((tag, idx) => {
      const status = statuses[idx];
      result[tag] = {
        status,
        available: status === 'unknown' ? null : status === 'available',
      };
      if (status === 'sold' || status === 'missing') goneTags.push(tag);
      if (status === 'reserved') heldTags.push(tag);
    });
  }

  let changed = 0;
  if (goneTags.length) {
    const rows = await db
      .update(cachedCatalogItems)
      .set({ status: 'sold', soldAt: new Date(), syncedAt: new Date() })
      .where(
        and(
          inArray(cachedCatalogItems.tagNumber, goneTags),
          inArray(cachedCatalogItems.status, ['available', 'reserved']),
        ),
      )
      .returning({ tag: cachedCatalogItems.tagNumber });
    changed += rows.length;
  }
  if (heldTags.length) {
    const rows = await db
      .update(cachedCatalogItems)
      .set({ status: 'reserved', syncedAt: new Date() })
      .where(and(inArray(cachedCatalogItems.tagNumber, heldTags), eq(cachedCatalogItems.status, 'available')))
      .returning({ tag: cachedCatalogItems.tagNumber });
    changed += rows.length;
  }

  return { result, changed };
}
