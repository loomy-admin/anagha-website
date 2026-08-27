import { Router } from 'express';
import { getContent, setContent } from '../lib/content.js';
import { upload, safeUnlink } from '../lib/upload.js';
import { storeCmsUpload } from '../lib/objectStorage.js';

const router = Router();

type CatSlot = {
  name?: string;
  filename?: string | null;
  url?: string | null;
  uploadedAt?: string;
} | null;

function keyFor(type: string | null | undefined) {
  return type === 'silver' ? 'silverCategories' : 'goldCategories';
}

router.get('/', async (req, res) => {
  const key = keyFor(req.query.type as string);
  const cats = await getContent<CatSlot[]>(key, []);
  res.json(cats);
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const type = req.query.type as string;
    const key = keyFor(type);
    const index = parseInt(String(req.body.index), 10);
    const name = req.body.name as string;

    if (Number.isNaN(index)) {
      return res.status(400).json({ error: 'Missing index' });
    }

    const cats = [...(await getContent<CatSlot[]>(key, []))];
    while (cats.length <= index) cats.push(null);

    let filename = cats[index]?.filename ?? null;
    let url = cats[index]?.url ?? null;

    if (req.file) {
      if (url) safeUnlink(url);
      else if (filename) safeUnlink(filename);
      const stored = await storeCmsUpload(req.file, `cat_${type || 'gold'}_${index}`);
      filename = stored.filename;
      url = stored.url;
    }

    cats[index] = {
      ...(cats[index] ?? {}),
      name,
      filename,
      url,
      uploadedAt: new Date().toISOString(),
    };

    await setContent(key, cats);
    res.json({ success: true, filename, url });
  } catch (err) {
    console.error('[categories] POST', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const type = req.query.type as string;
    const key = keyFor(type);
    const index = req.query.index as string | undefined;
    const mode = req.query.mode as string | undefined;
    const cats = [...(await getContent<CatSlot[]>(key, []))];

    if (index !== undefined) {
      const idx = parseInt(index, 10);
      if (mode === 'delete') cats.splice(idx, 1);
      else cats[idx] = null;
      await setContent(key, cats);
    } else {
      await setContent(key, []);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[categories] DELETE', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

export default router;
