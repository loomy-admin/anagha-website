import { Router } from 'express';
import { getContent, setContent } from '../lib/content.js';
import { upload, safeUnlink } from '../lib/upload.js';
import { storeCmsUpload } from '../lib/objectStorage.js';

const router = Router();

router.get('/', async (_req, res) => {
  res.json({
    images: await getContent<(string | null)[]>('testimonialsImages', new Array(8).fill(null)),
    names: await getContent<(string | null)[]>('testimonialsNames', new Array(8).fill(null)),
    texts: await getContent<(string | null)[]>('testimonialsTexts', new Array(8).fill(null)),
  });
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    const index = req.body.index as string | undefined;
    const name = req.body.name as string | undefined;
    const text = req.body.text as string | undefined;

    if (index === undefined || Number.isNaN(Number(index))) {
      return res.status(400).json({ error: 'Missing index' });
    }

    const idx = Number(index);
    const images = [
      ...(await getContent<(string | null)[]>('testimonialsImages', new Array(8).fill(null))),
    ];
    const names = [
      ...(await getContent<(string | null)[]>('testimonialsNames', new Array(8).fill(null))),
    ];
    const texts = [
      ...(await getContent<(string | null)[]>('testimonialsTexts', new Array(8).fill(null))),
    ];

    while (images.length <= idx) images.push(null);
    while (names.length <= idx) names.push(null);
    while (texts.length <= idx) texts.push(null);

    if (name !== undefined) names[idx] = name;
    if (text !== undefined) texts[idx] = text;

    if (req.file) {
      if (images[idx]) safeUnlink(images[idx]);
      const stored = await storeCmsUpload(req.file, `testimonial_${idx}_${Date.now()}`);
      images[idx] = stored.url;
    }

    await setContent('testimonialsImages', images);
    await setContent('testimonialsNames', names);
    await setContent('testimonialsTexts', texts);
    res.json({ success: true });
  } catch (err) {
    console.error('[testimonials] POST', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.delete('/', async (req, res) => {
  const index = req.query.index as string | undefined;
  const mode = req.query.mode as string | undefined;

  if (index !== undefined) {
    const idx = Number(index);
    const images = [
      ...(await getContent<(string | null)[]>('testimonialsImages', new Array(8).fill(null))),
    ];
    const names = [
      ...(await getContent<(string | null)[]>('testimonialsNames', new Array(8).fill(null))),
    ];
    const texts = [
      ...(await getContent<(string | null)[]>('testimonialsTexts', new Array(8).fill(null))),
    ];

    if (images[idx]) safeUnlink(images[idx]);

    if (mode === 'delete') {
      images.splice(idx, 1);
      names.splice(idx, 1);
      texts.splice(idx, 1);
    } else {
      images[idx] = null;
      names[idx] = null;
      texts[idx] = null;
    }

    await setContent('testimonialsImages', images);
    await setContent('testimonialsNames', names);
    await setContent('testimonialsTexts', texts);
  } else {
    const images = await getContent<(string | null)[]>('testimonialsImages', []);
    for (const f of images) if (f) safeUnlink(f);
    await setContent('testimonialsImages', new Array(8).fill(null));
    await setContent('testimonialsNames', new Array(8).fill(null));
    await setContent('testimonialsTexts', new Array(8).fill(null));
  }

  res.json({ success: true });
});

export default router;
