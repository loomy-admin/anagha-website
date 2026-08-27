import { Router } from 'express';
import multer from 'multer';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';
import { invalidateCatalogFilters } from './catalog.js';
import {
  buildItemData,
  getCatalogRow,
  saveCatalogRow,
  toPublicItem,
  type CatalogStatus,
} from '../lib/catalogStore.js';
import { applyWebsiteDescription, getAllWebsiteItemMeta } from '../lib/websiteItemMeta.js';
import { parseCatalogSpreadsheet, spreadsheetTemplateXlsx } from '../lib/catalogSpreadsheet.js';
import { createCatalogGroup } from '../lib/catalogTaxonomy.js';

const router = Router();
const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

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

/** POST /api/upload/catalog/items — create a website-owned tag */
router.post('/', async (req, res) => {
  try {
    const tag = String(req.body?.tag_number || '').trim().toUpperCase();
    if (!tag) {
      res.status(400).json({ error: 'tag_number is required' });
      return;
    }
    const existing = await getCatalogRow(tag);
    if (existing) {
      res.status(409).json({ error: `Tag ${tag} already exists` });
      return;
    }
    const name = String(req.body?.name || '').trim();
    const group = String(req.body?.group || '').trim();
    if (!name || !group) {
      res.status(400).json({ error: 'name and group are required' });
      return;
    }
    const data = buildItemData(req.body);
    const status = parseStatus(req.body?.status) || 'available';
    const row = await saveCatalogRow(data, { origin: 'website', status });
    invalidateCatalogFilters();
    res.status(201).json({ data: await asClientItem(row) });
  } catch (err) {
    handle(err, res);
  }
});

router.get('/template.xlsx', (req, res) => {
  const category = String(req.query.category || '').trim();
  const file = spreadsheetTemplateXlsx(category || undefined);
  const suffix = category ? `-${category.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 40)}` : '';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="anagha-catalog-template${suffix}.xlsx"`);
  res.send(file);
});

router.get('/template.csv', (_req, res) => {
  const file = spreadsheetTemplateXlsx();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="anagha-catalog-template.xlsx"');
  res.send(file);
});

router.post('/import', spreadsheetUpload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ error: 'Spreadsheet file is required' });
      return;
    }
    const defaultCategory = String(req.body?.defaultCategory || req.body?.category || '').trim();
    const forceCategory = String(req.body?.forceCategory || '') === 'true' && Boolean(defaultCategory);
    const rows = parseCatalogSpreadsheet(req.file.buffer, req.file.originalname || 'upload.csv', {
      defaultCategory,
      forceCategory,
    });
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const groups = new Set<string>();
    for (const row of rows) {
      const tag = String(row.tag_number || '').trim().toUpperCase();
      const name = String(row.name || '').trim();
      const group = String(row.group || row.category || '').trim();
      if (!tag || !name || !group) {
        errors.push(`${tag || name || 'row'}: Category, Tag Number, and Name are required`);
        continue;
      }
      const existing = await getCatalogRow(tag);
      if (existing) {
        skipped += 1;
        continue;
      }
      if (!groups.has(group.toLowerCase())) {
        try {
          await createCatalogGroup(group);
        } catch {
          /* already exists */
        }
        groups.add(group.toLowerCase());
      }
      const data = buildItemData({
        tag_number: tag,
        name,
        group,
        type: row.type,
        article: row.article,
        metal_type: row.metal_type,
        purity: row.purity,
        display_price: row.display_price,
        mrp: row.mrp,
        net_weight: row.net_weight,
        gross_weight: row.gross_weight,
        total_weight: row.total_weight,
        stone_weight: row.stone_weight,
        stone_charges: row.stone_charges,
        description: row.description,
      });
      await saveCatalogRow(data, { origin: 'website', status: 'available' });
      created += 1;
    }
    invalidateCatalogFilters();
    res.json({
      data: {
        created,
        skipped,
        errors,
        message: `Added ${created} piece(s). ${skipped} existing tag(s) skipped.`,
      },
    });
  } catch (err) {
    handle(err, res);
  }
});

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

/** PATCH /api/upload/catalog/items/:tag */
router.patch('/:tag', async (req, res) => {
  try {
    const tag = paramTag(req);
    const existing = await getCatalogRow(tag);
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const current = toPublicItem(existing);
    const data = buildItemData({ ...req.body, tag_number: tag }, current);
    const row = await saveCatalogRow(data, {
      origin: 'website',
      status: existing.status as CatalogStatus,
      soldAt: existing.soldAt,
    });
    invalidateCatalogFilters();
    res.json({ data: await asClientItem(row) });
  } catch (err) {
    handle(err, res);
  }
});

/** POST /api/upload/catalog/items/:tag/restock — sold → available */
router.post('/:tag/restock', async (req, res) => {
  try {
    const tag = paramTag(req);
    const existing = await getCatalogRow(tag);
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    if (existing.status !== 'sold') {
      res.status(409).json({ error: 'Only sold items can be added back to stock' });
      return;
    }
    const [row] = await db
      .update(cachedCatalogItems)
      .set({
        status: 'available',
        soldAt: null,
        origin: 'website',
        syncedAt: new Date(),
      })
      .where(eq(cachedCatalogItems.tagNumber, tag))
      .returning();
    invalidateCatalogFilters();
    res.json({ data: await asClientItem(row) });
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
