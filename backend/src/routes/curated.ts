import { Router } from 'express';
import { getContent, setContent } from '../lib/content.js';
import { upload, safeUnlink } from '../lib/upload.js';
import { storeCmsUpload } from '../lib/objectStorage.js';

const router = Router();

router.get('/', async (_req, res) => {
  const slots = await getContent<(string | null)[]>('curatedSlots', new Array(12).fill(null));
  const titles = await getContent<string[]>('curatedTitles', []);
  res.json({ slots, titles });
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const indexStr = req.body.index as string | undefined;
    const title = req.body.title as string | undefined;
    const titleIndexStr = req.body.titleIndex as string | undefined;

    if (req.file && indexStr !== undefined) {
      const index = Number(indexStr);
      const slots = [
        ...(await getContent<(string | null)[]>('curatedSlots', new Array(12).fill(null))),
      ];
      if (slots[index]) safeUnlink(slots[index]);
      const stored = await storeCmsUpload(req.file, `curated_${index}`);
      slots[index] = stored.url;
      await setContent('curatedSlots', slots);
    }

    if (title !== undefined && titleIndexStr !== undefined) {
      const tIdx = Number(titleIndexStr);
      const titles = [...(await getContent<string[]>('curatedTitles', []))];
      titles[tIdx] = title;
      await setContent('curatedTitles', titles);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[curated] POST', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const indexStr = req.query.index as string | undefined;
    const titleIndexStr = req.query.titleIndex as string | undefined;

    if (indexStr !== undefined) {
      const index = Number(indexStr);
      const slots = [
        ...(await getContent<(string | null)[]>('curatedSlots', new Array(12).fill(null))),
      ];
      if (slots[index]) safeUnlink(slots[index]);
      slots[index] = null;
      await setContent('curatedSlots', slots);
    }

    if (titleIndexStr !== undefined) {
      const titles = [...(await getContent<string[]>('curatedTitles', []))];
      titles[Number(titleIndexStr)] = '';
      await setContent('curatedTitles', titles);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[curated] DELETE', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
