import { Router } from 'express';
import { getContent, setContent } from '../lib/content.js';
import { upload, safeUnlink } from '../lib/upload.js';
import { storeCmsUpload } from '../lib/objectStorage.js';

const router = Router();

router.get('/', async (_req, res) => {
  const offers = await getContent<(string | null)[]>('offers', []);
  res.json(offers);
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const index = Number(req.body.index);
    if (!req.file || Number.isNaN(index)) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const offers = [...(await getContent<(string | null)[]>('offers', new Array(4).fill(null)))];
    while (offers.length <= index) offers.push(null);

    if (offers[index]) safeUnlink(offers[index]);

    const stored = await storeCmsUpload(req.file, `offer_${index}`);
    offers[index] = stored.url;
    await setContent('offers', offers);
    res.json({ success: true, filename: stored.filename, url: stored.url });
  } catch (err) {
    console.error('[offers] POST', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.delete('/', async (req, res) => {
  const indexParam = req.query.index as string | undefined;
  const mode = req.query.mode as string | undefined;
  let offers = [...(await getContent<(string | null)[]>('offers', new Array(4).fill(null)))];

  if (indexParam !== undefined) {
    const index = Number(indexParam);
    const old = offers[index];
    if (old) safeUnlink(old);
    if (mode === 'delete') offers.splice(index, 1);
    else offers[index] = null;
  } else {
    for (const f of offers) if (f) safeUnlink(f);
    offers = [];
  }

  await setContent('offers', offers);
  res.json({ success: true });
});

export default router;
