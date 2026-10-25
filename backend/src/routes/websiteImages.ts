import { Router, type Request, type Response } from 'express';
import { invalidateCatalogFilters } from './catalog.js';
import { getCatalogRow, patchCatalogRowData, toPublicItem } from '../lib/catalogStore.js';
import { applyWebsiteDescription, getAllWebsiteItemMeta } from '../lib/websiteItemMeta.js';
import { setWebsiteImagesOnErp, uploadWebsiteImageOnErp } from '../lib/erpWebstore.js';

/** Website gallery photos are stored in ERP; we mirror ERP's list onto the website copy. */
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

function incomingFiles(body: Record<string, unknown>) {
  if (Array.isArray(body.files)) {
    return body.files.map((row) => ({
      file: String((row as { file?: string })?.file || ''),
      fileName: String(
        (row as { fileName?: string; file_name?: string })?.fileName ||
          (row as { file_name?: string })?.file_name ||
          'photo.jpg',
      ),
    }));
  }
  if (body.file) {
    return [{ file: String(body.file), fileName: String(body.fileName || body.file_name || 'photo.jpg') }];
  }
  return [];
}

function galleryFromErp(erpItem: unknown, fallback: string[]) {
  const list = (erpItem as { website_images?: unknown } | null)?.website_images;
  if (!Array.isArray(list)) return fallback;
  return list.map((url) => String(url || '').trim()).filter(Boolean);
}

async function mirrorGallery(tag: string, websiteImages: string[]) {
  const row = await patchCatalogRowData(tag, { website_images: websiteImages });
  if (!row) throw Object.assign(new Error('Item not found'), { status: 404 });
  invalidateCatalogFilters();
  const metaMap = await getAllWebsiteItemMeta();
  return applyWebsiteDescription(toPublicItem(row), metaMap);
}

/** POST /api/upload/jewellery/website-images/:tag — body { files: [{ file, fileName }] } */
router.post('/:tag', async (req, res) => {
  try {
    const tag = paramTag(req);
    const existing = await getCatalogRow(tag);
    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    const files = incomingFiles(req.body || {});
    if (!files.length) {
      res.status(400).json({ error: 'files array is required' });
      return;
    }
    let gallery = toPublicItem(existing).website_images || [];
    for (const item of files) {
      const erpItem = await uploadWebsiteImageOnErp({
        tagNumber: tag,
        file: item.file,
        fileName: item.fileName,
      });
      gallery = galleryFromErp(erpItem, gallery);
    }
    res.json({ data: await mirrorGallery(tag, gallery) });
  } catch (err) {
    handle(err, res);
  }
});

/** PUT /api/upload/jewellery/website-images/:tag — replace / reorder / clear gallery */
router.put('/:tag', async (req, res) => {
  try {
    const tag = paramTag(req);
    const images = Array.isArray(req.body?.website_images) ? req.body.website_images : null;
    if (!images) {
      res.status(400).json({ error: 'website_images array is required' });
      return;
    }
    const next = images.map((u: unknown) => String(u || '').trim()).filter(Boolean);
    const erpItem = await setWebsiteImagesOnErp({ tagNumber: tag, websiteImages: next });
    res.json({ data: await mirrorGallery(tag, galleryFromErp(erpItem, next)) });
  } catch (err) {
    handle(err, res);
  }
});

export default router;
