import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { jewelleryCategories, products } from '../db/schema.js';
import { DEFAULT_JEWELLERY_CATEGORIES } from '../lib/defaults.js';
import { upload, safeUnlink } from '../lib/upload.js';
import { storeCmsUpload } from '../lib/objectStorage.js';

const router = Router();

async function listCategories() {
  const rows = await db
    .select()
    .from(jewelleryCategories)
    .orderBy(asc(jewelleryCategories.sortOrder), asc(jewelleryCategories.id));

  if (rows.length === 0) {
    return DEFAULT_JEWELLERY_CATEGORIES;
  }

  return rows.map((r) => ({ name: r.name, image: r.image }));
}

async function ensureSeeded() {
  const existing = await db.select().from(jewelleryCategories).limit(1);
  if (existing.length > 0) return;

  for (let i = 0; i < DEFAULT_JEWELLERY_CATEGORIES.length; i++) {
    const cat = DEFAULT_JEWELLERY_CATEGORIES[i];
    await db.insert(jewelleryCategories).values({
      name: cat.name,
      image: cat.image,
      sortOrder: i,
    });
  }
}

router.get('/', async (_req, res) => {
  try {
    await ensureSeeded();
    res.json(await listCategories());
  } catch (err) {
    console.error('[jewellery/categories] GET', err);
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    await ensureSeeded();
    const name = req.body.name as string | undefined;
    const indexStr = req.body.index as string | undefined;

    const rows = await db
      .select()
      .from(jewelleryCategories)
      .orderBy(asc(jewelleryCategories.sortOrder), asc(jewelleryCategories.id));

    if (indexStr !== undefined && indexStr !== null && indexStr !== '') {
      const idx = Number(indexStr);
      const row = rows[idx];
      if (!row) return res.status(404).json({ error: 'Not found' });

      const updates: { name?: string; image?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (name) {
        const oldSlug = row.name.toLowerCase().replace(/ /g, '-');
        const newSlug = name.toLowerCase().replace(/ /g, '-');
        updates.name = name;

        if (oldSlug !== newSlug) {
          await db
            .update(products)
            .set({ category: newSlug, updatedAt: new Date() })
            .where(eq(products.category, oldSlug));
        }
      }

      if (req.file) {
        if (row.image) safeUnlink(row.image);
        const stored = await storeCmsUpload(req.file, `jewel_cat_${idx}_${Date.now()}`);
        updates.image = stored.url;
      }

      await db
        .update(jewelleryCategories)
        .set(updates)
        .where(eq(jewelleryCategories.id, row.id));
    } else if (name) {
      await db.insert(jewelleryCategories).values({
        name,
        image: null,
        sortOrder: rows.length,
      });
    } else {
      return res.status(400).json({ error: 'Missing data' });
    }

    res.json({ success: true, categories: await listCategories() });
  } catch (err) {
    console.error('[jewellery/categories] POST', err);
    res.status(500).json({ error: 'Failed' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const name = req.query.name as string | undefined;
    if (!name) return res.status(400).json({ error: 'name required' });

    const rows = await db
      .select()
      .from(jewelleryCategories)
      .where(eq(jewelleryCategories.name, name));

    for (const row of rows) {
      if (row.image) safeUnlink(row.image);
      await db.delete(jewelleryCategories).where(eq(jewelleryCategories.id, row.id));
    }

    res.json({ success: true, categories: await listCategories() });
  } catch (err) {
    console.error('[jewellery/categories] DELETE', err);
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
