import { Router, type Request, type Response } from 'express';
import {
  getWebsiteItemMeta,
  setWebsiteItemDescription,
} from '../lib/websiteItemMeta.js';
import {
  buildItemData,
  getCatalogRow,
  saveCatalogRow,
  toPublicItem,
  type CatalogStatus,
} from '../lib/catalogStore.js';

const router = Router();

function handle(err: unknown, res: Response) {
  const status =
    typeof err === 'object' && err && 'status' in err
      ? Number((err as { status: number }).status) || 500
      : 500;
  const message = err instanceof Error ? err.message : 'Item meta update failed';
  res.status(status).json({ error: message });
}

function paramTag(req: Request): string {
  const raw = req.params.tag;
  return decodeURIComponent(Array.isArray(raw) ? String(raw[0] || '') : String(raw || ''));
}

/** GET /api/upload/jewellery/item-meta/:tag */
router.get('/:tag', async (req, res) => {
  try {
    const meta = await getWebsiteItemMeta(paramTag(req));
    res.json({ data: meta });
  } catch (err) {
    handle(err, res);
  }
});

/** PUT /api/upload/jewellery/item-meta/:tag — body { description } (website CMS only) */
router.put('/:tag', async (req, res) => {
  try {
    if (typeof req.body?.description !== 'string') {
      res.status(400).json({ error: 'description string is required' });
      return;
    }
    const tag = paramTag(req);
    const meta = await setWebsiteItemDescription(tag, req.body.description);
    const existing = await getCatalogRow(tag);
    if (existing) {
      const data = buildItemData({ description: req.body.description, tag_number: tag }, toPublicItem(existing));
      await saveCatalogRow(data, {
        origin: 'website',
        status: existing.status as CatalogStatus,
        soldAt: existing.soldAt,
      });
    }
    res.json({ data: meta });
  } catch (err) {
    handle(err, res);
  }
});

export default router;
