import { Router } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';
import { invalidateCatalogFilters } from './catalog.js';
import { getCatalogRow, toPublicItem, type CatalogStatus } from '../lib/catalogStore.js';
import { applyWebsiteDescription, getAllWebsiteItemMeta } from '../lib/websiteItemMeta.js';

/** Website hide/show for ERP pieces. Everything else about a piece comes from ERP. */
const router = Router();

const EDITABLE_STATUSES = new Set(['available', 'hidden']);

function handle(err: unknown, res: import('express').Response) {
  const status =
    typeof err === 'object' && err && 'status' in err
      ? Number((err as { status: number }).status) || 500
      : 500;
  const message = err instanceof Error ? err.message : 'Catalog item update failed';
  res.status(status).json({ error: message });
}

function paramTag(req: import('express').Request) {
  const raw = req.params.tag;
  return decodeURIComponent(Array.isArray(raw) ? String(raw[0] || '') : String(raw || '')).trim().toUpperCase();
}

async function asClientItem(row: typeof cachedCatalogItems.$inferSelect) {
  const metaMap = await getAllWebsiteItemMeta();
  return applyWebsiteDescription(toPublicItem(row), metaMap);
}

function parseStatus(value: unknown): CatalogStatus | null {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'available' || status === 'hidden') return status;
  return null;
}

/** PATCH /api/upload/catalog/items/bulk-status */
router.patch('/bulk-status', async (req, res) => {
  try {
    const status = parseStatus(req.body?.status);
    if (!status) {
      res.status(400).json({ error: 'status must be available or hidden' });
      return;
    }
    const tags: string[] = Array.isArray(req.body?.tags)
      ? [...new Set((req.body.tags as unknown[]).map((t) => String(t || '').trim().toUpperCase()).filter(Boolean))]
      : [];
    if (!tags.length) {
      res.status(400).json({ error: 'tags array is required' });
      return;
    }
    await db
      .update(cachedCatalogItems)
      .set({ status, syncedAt: new Date() })
      .where(and(inArray(cachedCatalogItems.tagNumber, tags), inArray(cachedCatalogItems.status, [...EDITABLE_STATUSES])));
    invalidateCatalogFilters();
    res.json({ data: { ok: true, status, count: tags.length } });
  } catch (err) {
    handle(err, res);
  }
});

/** PATCH /api/upload/catalog/items/:tag/status */
router.patch('/:tag/status', async (req, res) => {
  try {
    const tag = paramTag(req);
    const status = parseStatus(req.body?.status);
    if (!status) {
      res.status(400).json({ error: 'status must be available or hidden' });
      return;
    }
    const existing = await getCatalogRow(tag);
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    if (existing.status === 'sold' || existing.status === 'reserved') {
      res.status(409).json({ error: `Cannot change visibility while item is ${existing.status}` });
      return;
    }
    const [row] = await db
      .update(cachedCatalogItems)
      .set({ status, syncedAt: new Date() })
      .where(eq(cachedCatalogItems.tagNumber, tag))
      .returning();
    invalidateCatalogFilters();
    res.json({ data: await asClientItem(row) });
  } catch (err) {
    handle(err, res);
  }
});

export default router;
