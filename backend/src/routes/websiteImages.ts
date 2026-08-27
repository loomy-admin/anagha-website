import { Router, type Request, type Response } from 'express';
import { invalidateCatalogFilters } from './catalog.js';
import {
  buildItemData,
  getCatalogRow,
  inventoryPhotoUrls,
  saveCatalogRow,
  toPublicItem,
  type CatalogOrigin,
  type CatalogStatus,
} from '../lib/catalogStore.js';
import { applyWebsiteDescription, getAllWebsiteItemMeta } from '../lib/websiteItemMeta.js';
import { safeUnlink } from '../lib/upload.js';
import { MAX_PRODUCT_IMAGES, storeCatalogImage } from '../lib/catalogImage.js';

const router = Router();

function handle(err: unknown, res: Response) {
  const status =
    typeof err === 'object' && err && 'status' in err
      ? Number((err as { status: number }).status) || 500
      : 500;
  const message = err instanceof Error ? err.message : 'Website images update failed';
  res.status(status).json({ error: message });
}

function paramTag(req: Request): string {
  const raw = req.params.tag;
  return decodeURIComponent(Array.isArray(raw) ? String(raw[0] || '') : String(raw || '')).trim().toUpperCase();
}

async function asClientItem(row: NonNullable<Awaited<ReturnType<typeof getCatalogRow>>>) {
  const metaMap = await getAllWebsiteItemMeta();
  return applyWebsiteDescription(toPublicItem(row), metaMap);
}

async function persistGallery(tag: string, websiteImages: string[]) {
  const existing = await getCatalogRow(tag);
  if (!existing) {
    throw Object.assign(new Error('Item not found'), { status: 404 });
  }
  const current = toPublicItem(existing);
  const data = buildItemData({ website_images: websiteImages, tag_number: tag }, current);
  data.image_url = websiteImages[0] || data.pos_image_url || null;
  data.images = inventoryPhotoUrls(current);
  const row = await saveCatalogRow(data, {
    origin: (existing.origin as CatalogOrigin) || 'website',
    status: existing.status as CatalogStatus,
    soldAt: existing.soldAt,
  });
  invalidateCatalogFilters();
  return asClientItem(row);
}

function incomingFiles(body: Record<string, unknown>) {
  if (Array.isArray(body.files)) {
    return body.files.map((row) => ({
      file: String((row as { file?: string })?.file || ''),
      fileName: String((row as { fileName?: string; file_name?: string })?.fileName || (row as { file_name?: string })?.file_name || 'photo.jpg'),
    }));
  }
  if (body.file) {
    return [{ file: String(body.file), fileName: String(body.fileName || body.file_name || 'photo.jpg') }];
  }
  return [];
}

/** POST /api/upload/jewellery/website-images/:tag */
router.post('/:tag', async (req, res) => {
  try {
    const tag = paramTag(req);
    const existing = await getCatalogRow(tag);
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const current = toPublicItem(existing);
    const gallery = Array.isArray(current.website_images) ? [...current.website_images] : [];
    const files = incomingFiles(req.body || {});
    if (!files.length) {
      res.status(400).json({ error: 'files array is required' });
      return;
    }
    if (gallery.length + files.length > MAX_PRODUCT_IMAGES) {
      res.status(400).json({ error: `Maximum ${MAX_PRODUCT_IMAGES} website images` });
      return;
    }
    for (const item of files) {
      const stored = await storeCatalogImage(tag, item.file, item.fileName);
      gallery.push(stored.url);
    }
    const data = await persistGallery(tag, gallery);
    res.json({ data });
  } catch (err) {
    handle(err, res);
  }
});

/** PUT /api/upload/jewellery/website-images/:tag */
router.put('/:tag', async (req, res) => {
  try {
    const tag = paramTag(req);
    const images = Array.isArray(req.body?.website_images) ? req.body.website_images : null;
    if (!images) {
      res.status(400).json({ error: 'website_images array is required' });
      return;
    }
    const existing = await getCatalogRow(tag);
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const next = images.map((u: unknown) => String(u || '').trim()).filter(Boolean);
    if (next.length > MAX_PRODUCT_IMAGES) {
      res.status(400).json({ error: `Maximum ${MAX_PRODUCT_IMAGES} website images` });
      return;
    }
    const prev = Array.isArray((existing.data as { website_images?: string[] })?.website_images)
      ? (existing.data as { website_images: string[] }).website_images
      : [];
    prev.filter((url) => url.startsWith('/uploads/') && !next.includes(url)).forEach((url) => safeUnlink(url));
    const data = await persistGallery(tag, next);
    res.json({ data });
  } catch (err) {
    handle(err, res);
  }
});

export default router;
