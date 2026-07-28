import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { getContent, setContent } from '../lib/content.js';
import { upload, UPLOADS_DIR, publicUploadPath } from '../lib/upload.js';

const router = Router();

const MAX_HEADER_GROUPS = 8;
const MAX_DROPDOWN_ARTICLES = 5;

export type HeaderArticle = {
  name: string;
  slug?: string;
};

export type HeaderCallout = {
  title: string;
  desc: string;
  image: string;
};

export type HeaderSelectedGroup = {
  slug: string;
  label: string;
  dropdown: {
    articles: HeaderArticle[];
    callout: HeaderCallout;
  };
};

type HeaderContent = {
  selectedGroups: HeaderSelectedGroup[];
};

function emptyDropdown(): HeaderSelectedGroup['dropdown'] {
  return {
    articles: [],
    callout: { title: '', desc: '', image: '' },
  };
}

function legacyArticlesFromDropdown(dropdownRaw: Record<string, unknown>): unknown[] {
  if (Array.isArray(dropdownRaw.articles)) return dropdownRaw.articles;
  // Legacy seed shape: dropdown.categories.items[{ name, link }]
  const categories =
    dropdownRaw.categories && typeof dropdownRaw.categories === 'object'
      ? (dropdownRaw.categories as Record<string, unknown>)
      : null;
  if (categories && Array.isArray(categories.items)) return categories.items;
  return [];
}

function normalizeGroup(raw: unknown): HeaderSelectedGroup | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const slug = String(row.slug || '')
    .trim()
    .toLowerCase();
  const label = String(row.label || row.name || slug)
    .trim()
    .toUpperCase();
  if (!slug || slug === 'all-jewellery') return null;

  const dropdownRaw =
    row.dropdown && typeof row.dropdown === 'object'
      ? (row.dropdown as Record<string, unknown>)
      : {};
  const articlesRaw = legacyArticlesFromDropdown(dropdownRaw);
  const calloutRaw =
    dropdownRaw.callout && typeof dropdownRaw.callout === 'object'
      ? (dropdownRaw.callout as Record<string, unknown>)
      : {};

  const articles: HeaderArticle[] = [];
  const seen = new Set<string>();
  for (const a of articlesRaw) {
    if (!a || typeof a !== 'object') continue;
    const name = String((a as { name?: string }).name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    articles.push({
      name,
      slug: String((a as { slug?: string }).slug || '')
        .trim()
        .toLowerCase() || undefined,
    });
    if (articles.length >= MAX_DROPDOWN_ARTICLES) break;
  }

  return {
    slug,
    label,
    dropdown: {
      articles,
      callout: {
        title: String(calloutRaw.title || '').trim(),
        desc: String(calloutRaw.desc || '').trim(),
        image: String(calloutRaw.image || '').trim(),
      },
    },
  };
}

function collectGroups(rows: unknown[]): HeaderSelectedGroup[] {
  const out: HeaderSelectedGroup[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const g = normalizeGroup(row);
    if (!g || seen.has(g.slug)) continue;
    seen.add(g.slug);
    out.push(g);
    if (out.length >= MAX_HEADER_GROUPS) break;
  }
  return out;
}

export async function getHeaderSelection(): Promise<HeaderContent> {
  const header = await getContent<HeaderContent & { navItems?: unknown }>('header', {
    selectedGroups: [],
  });
  const selected = Array.isArray(header.selectedGroups) ? header.selectedGroups : [];
  let out = collectGroups(selected);

  // Legacy DB/seed used { navItems } with categories.items — map when selectedGroups is empty.
  if (!out.length && Array.isArray(header.navItems)) {
    out = collectGroups(header.navItems);
  }

  return { selectedGroups: out };
}

router.get('/', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await getHeaderSelection());
});

router.post(
  '/',
  (req, res, next) => {
    if (String(req.query.action || '') === 'upload-callout-image') {
      return upload.single('file')(req, res, next);
    }
    return next();
  },
  async (req, res) => {
  try {
    const action = String(req.query.action || '').trim();

    if (action === 'upload-callout-image') {
      const slug = String(req.query.slug || '')
        .trim()
        .toLowerCase() || 'tab';
      if (!req.file) return res.status(400).json({ error: 'No file' });

      const ext = path.extname(req.file.originalname) || `.${req.file.mimetype.split('/')[1] || 'png'}`;
      const filename = `header_callout_${slug.replace(/[^a-z0-9_-]/g, '_')}_${Date.now()}${ext}`;
      fs.renameSync(req.file.path, path.join(UPLOADS_DIR, filename));
      return res.json({ success: true, image: publicUploadPath(filename) });
    }

    const raw = Array.isArray(req.body?.selectedGroups)
      ? req.body.selectedGroups
      : typeof req.body?.selectedGroups === 'string'
        ? JSON.parse(req.body.selectedGroups)
        : Array.isArray(req.body)
          ? req.body
          : null;

    if (!Array.isArray(raw)) {
      return res.status(400).json({ error: 'Expected selectedGroups array' });
    }

    const selectedGroups = collectGroups(raw);
    await setContent('header', { selectedGroups });
    res.json({ success: true, selectedGroups });
  } catch (err) {
    console.error('[header] POST', err);
    res.status(500).json({ error: 'Save failed' });
  }
  },
);

router.delete('/', async (_req, res) => {
  try {
    await setContent('header', { selectedGroups: [] });
    res.json({ success: true, selectedGroups: [] });
  } catch {
    res.status(500).json({ error: 'Reset failed' });
  }
});

export default router;
