import { Router } from 'express';
import path from 'node:path';
import { getContent, setContent } from '../lib/content.js';
import { upload, safeUnlink } from '../lib/upload.js';
import { storeCmsUpload } from '../lib/objectStorage.js';

const router = Router();

type HeroMeta = {
  filename: string | null;
  url?: string | null;
  type: 'image' | 'video' | 'gif' | null;
  originalName: string | null;
  uploadedAt: string | null;
};

const emptyHero: HeroMeta = {
  filename: null,
  url: null,
  type: null,
  originalName: null,
  uploadedAt: null,
};

function mediaType(mime: string): HeroMeta['type'] {
  if (mime === 'image/gif') return 'gif';
  if (mime.startsWith('video/')) return 'video';
  return 'image';
}

router.get('/', async (_req, res) => {
  const hero = await getContent<HeroMeta>('hero', emptyHero);
  res.json(hero);
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
      'video/ogg',
    ];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(415).json({ error: 'Unsupported file type' });
    }

    const prev = await getContent<HeroMeta>('hero', emptyHero);
    if (prev.url) safeUnlink(prev.url);
    else if (prev.filename) safeUnlink(prev.filename);

    const ext = path.extname(req.file.originalname) || '.bin';
    const stored = await storeCmsUpload(req.file, `hero${ext}`);

    const hero: HeroMeta = {
      filename: stored.filename,
      url: stored.url,
      type: mediaType(req.file.mimetype),
      originalName: req.file.originalname,
      uploadedAt: new Date().toISOString(),
    };
    await setContent('hero', hero);
    res.json({ success: true, ...hero });
  } catch (err) {
    console.error('[hero] POST', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.delete('/', async (_req, res) => {
  const prev = await getContent<HeroMeta>('hero', emptyHero);
  if (prev.url) safeUnlink(prev.url);
  else if (prev.filename) safeUnlink(prev.filename);
  await setContent('hero', emptyHero);
  res.json({ success: true });
});

export default router;
