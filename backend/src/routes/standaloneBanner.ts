import { Router } from 'express';
import { getContent, setContent } from '../lib/content.js';
import { upload, safeUnlink } from '../lib/upload.js';
import { storeCmsUpload } from '../lib/objectStorage.js';

const router = Router();

router.get('/', async (_req, res) => {
  const banner = await getContent<string | null>('standaloneBanner', null);
  res.json({ banner });
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file' });

    const old = await getContent<string | null>('standaloneBanner', null);
    if (old) safeUnlink(old);

    const stored = await storeCmsUpload(req.file, `standalone_banner_${Date.now()}`);
    await setContent('standaloneBanner', stored.url);
    res.json({ success: true, filename: stored.filename, url: stored.url });
  } catch (err) {
    console.error('[standalone-banner] POST', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.delete('/', async (_req, res) => {
  const old = await getContent<string | null>('standaloneBanner', null);
  if (old) safeUnlink(old);
  await setContent('standaloneBanner', null);
  res.json({ success: true });
});

export default router;
