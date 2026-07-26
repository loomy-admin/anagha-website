import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { getContent, setContent } from '../lib/content.js';
import { upload, UPLOADS_DIR, safeUnlink, publicUploadPath } from '../lib/upload.js';

const router = Router();

const CONTENT_KEY = 'groupImages';

export type GroupImagesContent = {
  images: Record<string, string>;
};

function normalizeSlug(raw: unknown) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getGroupImages(): Promise<GroupImagesContent> {
  const data = await getContent<GroupImagesContent>(CONTENT_KEY, { images: {} });
  const images =
    data && typeof data === 'object' && data.images && typeof data.images === 'object'
      ? data.images
      : {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(images)) {
    const slug = normalizeSlug(k);
    const url = String(v || '').trim();
    if (slug && url) out[slug] = url;
  }
  return { images: out };
}

router.get('/', async (_req, res) => {
  try {
    res.json(await getGroupImages());
  } catch (err) {
    console.error('[group-images] GET', err);
    res.status(500).json({ error: 'Failed to load group images' });
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const slug = normalizeSlug(req.query.slug || req.body?.slug);
    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const current = await getGroupImages();
    const prev = current.images[slug];
    if (prev) safeUnlink(prev);

    const ext = path.extname(req.file.originalname) || `.${req.file.mimetype.split('/')[1] || 'png'}`;
    const filename = `group_tile_${slug}_${Date.now()}${ext}`;
    fs.renameSync(req.file.path, path.join(UPLOADS_DIR, filename));
    const image = publicUploadPath(filename);

    current.images[slug] = image;
    await setContent(CONTENT_KEY, current);
    res.json({ success: true, slug, image, images: current.images });
  } catch (err) {
    console.error('[group-images] POST', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const slug = normalizeSlug(req.query.slug);
    if (!slug) return res.status(400).json({ error: 'Missing slug' });

    const current = await getGroupImages();
    const prev = current.images[slug];
    if (prev) {
      safeUnlink(prev);
      delete current.images[slug];
      await setContent(CONTENT_KEY, current);
    }
    res.json({ success: true, slug, images: current.images });
  } catch (err) {
    console.error('[group-images] DELETE', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

export default router;
