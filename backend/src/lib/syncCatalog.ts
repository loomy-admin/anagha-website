import { and, gt, inArray, isNull, notInArray, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cachedCatalogItems, checkoutSessions } from '../db/schema.js';
import { fetchErpPublic, getErpConfig } from './erpCatalog.js';
import { applyWebsiteDescription, getAllWebsiteItemMeta } from './websiteItemMeta.js';
import { getContent, setContent } from './content.js';
import type { CatalogStatus } from './catalogStore.js';

/** Which ERP store the website copy was last fully synced from (site_content key). */
export const ERP_SOURCE_KEY = 'catalog_erp_source';

function erpSourceKey() {
  const { base, storeSlug, branchId } = getErpConfig();
  return `${base}|${storeSlug}|${branchId}`;
}

export type CatalogSyncProgress = {
  running: boolean;
  ok: boolean | null;
  message: string;
  count: number;
  total: number;
  changed: number;
  unpublished: number;
  at: string | null;
};

export type CatalogSyncResult = {
  ok: boolean;
  message: string;
  count: number;
  total: number;
  changed: number;
  unpublished: number;
};

let isSyncing = false;

let progress: CatalogSyncProgress = {
  running: false,
  ok: null,
  message: '',
  count: 0,
  total: 0,
  changed: 0,
  unpublished: 0,
  at: null,
};

export function getCatalogSyncProgress() {
  return progress;
}

function setProgress(partial: Partial<CatalogSyncProgress>) {
  progress = { ...progress, ...partial, at: new Date().toISOString() };
}

const ERP_STATUSES = new Set<CatalogStatus>(['available', 'reserved', 'sold']);

function statusFromErp(value: unknown): CatalogStatus {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'available';
  return ERP_STATUSES.has(raw as CatalogStatus) ? (raw as CatalogStatus) : 'hidden';
}

function hasPhoto(item: Record<string, unknown>) {
  return Boolean(
    item.image_url ||
      item.pos_image_url ||
      (Array.isArray(item.images) && item.images.length > 0) ||
      (Array.isArray(item.website_images) && item.website_images.length > 0),
  );
}

/** Tags in a website checkout that is still waiting for payment. */
async function activeHoldTags() {
  const holdWindow = new Date(Date.now() - 30 * 60 * 1000);
  const rows = await db
    .select({ tagNumber: checkoutSessions.tagNumber })
    .from(checkoutSessions)
    .where(
      and(
        inArray(checkoutSessions.status, ['pending', 'payment_initiated']),
        or(
          gt(checkoutSessions.expiresAt, new Date()),
          and(isNull(checkoutSessions.expiresAt), gt(checkoutSessions.createdAt, holdWindow)),
        ),
      ),
    );
  return tagsFromSessions(rows);
}

/** Paid website orders that ERP failed to record; ERP still lists those pieces as available. */
async function unrecordedSaleTags() {
  const rows = await db
    .select({ tagNumber: checkoutSessions.tagNumber })
    .from(checkoutSessions)
    .where(
      and(
        inArray(checkoutSessions.status, ['paid', 'packed', 'shipped', 'delivered']),
        sql`${checkoutSessions.paymentPayload}->>'erp_complete_error' IS NOT NULL`,
      ),
    );
  return tagsFromSessions(rows);
}

function tagsFromSessions(rows: Array<{ tagNumber: string | null }>) {
  const tags = new Set<string>();
  for (const row of rows) {
    String(row.tagNumber || '')
      .split('|')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
      .forEach((t) => tags.add(t));
  }
  return tags;
}

/**
 * Refresh the website copy from ERP's full public catalog, then hide (status `sold`)
 * pieces ERP no longer lists. Rows are never deleted, so orders, descriptions, and
 * history stay intact; a piece that reappears in ERP is published again.
 *
 * When the ERP store changes (e.g. test → production), the first complete run hides
 * every old piece and drops old admin hide flags, then records the new source.
 */
async function runCatalogSync(): Promise<CatalogSyncResult> {
  const source = erpSourceKey();
  const lastSource = await getContent<string | null>(ERP_SOURCE_KEY, null);
  const sourceChanged = Boolean(lastSource) && lastSource !== source;
  console.log(`[catalog-sync] Starting ERP sync${sourceChanged ? ' (ERP store changed: fresh start)' : ''}...`);
  const metaMap = await getAllWebsiteItemMeta();
  const holds = await activeHoldTags();
  const unrecorded = await unrecordedSaleTags();
  const seenTags = new Set<string>();

  let offset = 0;
  const limit = 200;
  let total = 1;
  let firstTotal: number | null = null;
  let changed = 0;

  while (offset < total) {
    const res = await fetchErpPublic('/catalog', { offset: String(offset), limit: String(limit) });
    const items = Array.isArray(res?.data?.items) ? (res.data.items as Record<string, unknown>[]) : [];
    if (!items.length) break;
    total = Number(res.data.total) || total;
    if (firstTotal === null) firstTotal = total;

    const rows = [];
    for (const raw of items) {
      const tag = String(raw.tag_number || '').trim().toUpperCase();
      if (!tag || seenTags.has(tag)) continue;
      seenTags.add(tag);
      const item = applyWebsiteDescription<Record<string, unknown> & { tag_number: string }>(
        { ...raw, tag_number: tag },
        metaMap,
      );
      rows.push({
        tagNumber: tag,
        id: (item.id as string | null) || tag,
        groupSlug: (item.group_slug as string | null) || null,
        typeSlug: (item.type_slug as string | null) || null,
        articleSlug: (item.article_slug as string | null) || null,
        metalType: (item.metal_type as string | null) || null,
        purity: (item.purity as string | null) || null,
        displayPrice: item.display_price != null ? Number(item.display_price) : null,
        hasImage: hasPhoto(item),
        erpCreatedAt: item.created_at ? new Date(String(item.created_at)) : null,
        data: item,
        origin: 'erp' as const,
        status: unrecorded.has(tag)
          ? ('sold' as const)
          : holds.has(tag)
            ? ('reserved' as const)
            : statusFromErp(item.status),
      });
    }

    for (let i = 0; i < rows.length; i += 100) {
      const written = await db
        .insert(cachedCatalogItems)
        .values(rows.slice(i, i + 100))
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
            origin: sql`EXCLUDED.origin`,
            // Admin "hide" is a website setting; keep it across refreshes, but not across ERP stores.
            status: sourceChanged
              ? sql`EXCLUDED.status`
              : sql`CASE WHEN ${cachedCatalogItems.status} = 'hidden' THEN 'hidden' ELSE EXCLUDED.status END`,
            soldAt: sql`CASE WHEN EXCLUDED.status = 'sold' THEN COALESCE(${cachedCatalogItems.soldAt}, now()) ELSE NULL END`,
            syncedAt: sql`now()`,
          },
          // Skip rows ERP did not change so a 15-minute schedule stays cheap.
          ...(sourceChanged
            ? {}
            : {
                setWhere: sql`${cachedCatalogItems.data} IS DISTINCT FROM EXCLUDED.data
            OR (${cachedCatalogItems.status} <> 'hidden' AND ${cachedCatalogItems.status} IS DISTINCT FROM EXCLUDED.status)`,
              }),
        })
        .returning({ tagNumber: cachedCatalogItems.tagNumber });
      changed += written.length;
    }
    offset += items.length;

    setProgress({
      running: true,
      count: seenTags.size,
      total,
      changed,
      message: `Syncing ${Math.min(offset, total)} / ${total}`,
    });
  }

  let unpublished = 0;
  const complete = firstTotal !== null && offset >= total && total === firstTotal && seenTags.size > 0;
  if (!complete) {
    console.warn(
      `[catalog-sync] Skipping unpublish: incomplete read (read ${offset}, ERP total ${firstTotal} -> ${total}).`,
    );
  } else {
    const protectedTags = [...seenTags, ...holds];
    const [{ candidates }] = await db
      .select({ candidates: sql<number>`count(*)::int` })
      .from(cachedCatalogItems)
      .where(
        and(
          inArray(cachedCatalogItems.status, ['available', 'reserved']),
          notInArray(cachedCatalogItems.tagNumber, protectedTags),
        ),
      );
    const [{ available }] = await db
      .select({ available: sql<number>`count(*)::int` })
      .from(cachedCatalogItems)
      .where(inArray(cachedCatalogItems.status, ['available', 'reserved']));
    // A short ERP response must not empty the store (skipped once when switching ERP stores).
    if (!sourceChanged && Number(candidates) > Number(available) * 0.5) {
      console.warn(
        `[catalog-sync] Skipping unpublish: ${candidates} of ${available} pieces would be hidden.`,
      );
    } else if (Number(candidates) > 0) {
      const hidden = await db
        .update(cachedCatalogItems)
        .set({
          status: 'sold',
          soldAt: sql`COALESCE(${cachedCatalogItems.soldAt}, now())`,
          syncedAt: new Date(),
        })
        .where(
          and(
            inArray(cachedCatalogItems.status, ['available', 'reserved']),
            notInArray(cachedCatalogItems.tagNumber, protectedTags),
          ),
        )
        .returning({ tagNumber: cachedCatalogItems.tagNumber });
      unpublished = hidden.length;
    }
    // Only a complete read counts; an incomplete fresh start is retried next run.
    if (lastSource !== source) await setContent(ERP_SOURCE_KEY, source);
  }

  const message =
    (sourceChanged && complete ? 'Switched to the new ERP store. ' : '') +
    `Synced ${seenTags.size} pieces from ERP (${changed} changed)` +
    (unpublished ? `, hid ${unpublished} no longer in ERP` : '') +
    '.';
  console.log(`[catalog-sync] Complete. ${message}`);
  return { ok: true, message, count: seenTags.size, total, changed, unpublished };
}

/** Run a sync and wait for it (Cloud Scheduler). Cloud Run only gives CPU during a request. */
export async function syncCatalogFromErp(): Promise<CatalogSyncResult> {
  if (isSyncing) {
    return {
      ok: false,
      message: 'A catalog sync is already running',
      count: progress.count,
      total: progress.total,
      changed: 0,
      unpublished: 0,
    };
  }
  isSyncing = true;
  setProgress({
    running: true,
    ok: null,
    message: 'Syncing from ERP…',
    count: 0,
    total: 0,
    changed: 0,
    unpublished: 0,
  });
  try {
    const result = await runCatalogSync();
    setProgress({ ...result, running: false });
    return result;
  } catch (error) {
    console.error('[catalog-sync] Failed:', error);
    const message = error instanceof Error ? error.message : 'Catalog sync failed';
    setProgress({ running: false, ok: false, message });
    return {
      ok: false,
      message,
      count: progress.count,
      total: progress.total,
      changed: progress.changed,
      unpublished: 0,
    };
  } finally {
    isSyncing = false;
  }
}

/** Start a sync in the background (admin button, which polls progress). */
export function startCatalogSync() {
  if (isSyncing) return { started: false as const, progress };
  void syncCatalogFromErp();
  return { started: true as const, progress };
}
