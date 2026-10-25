import { Router } from 'express';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';
import { getContent, setContent } from '../lib/content.js';
import { upload } from '../lib/upload.js';
import { storeCmsUpload } from '../lib/objectStorage.js';

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
  logoUrl?: string;
  logoIconUrl?: string;
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

const DEFAULT_ARTICLES_CACHE_MS = 60 * 1000;
let defaultArticlesCache: { key: string; at: number; byGroup: Map<string, HeaderArticle[]> } | null = null;

/** Top articles per category by available pieces, used when admin has not picked any. */
async function defaultArticlesFor(groupSlugs: string[]) {
  const key = [...groupSlugs].sort().join('|');
  if (defaultArticlesCache && defaultArticlesCache.key === key && Date.now() - defaultArticlesCache.at < DEFAULT_ARTICLES_CACHE_MS) {
    return defaultArticlesCache.byGroup;
  }
  const byGroup = new Map<string, HeaderArticle[]>();
  if (groupSlugs.length) {
    const rows = await db
      .select({
        group: cachedCatalogItems.groupSlug,
        slug: cachedCatalogItems.articleSlug,
        name: sql<string>`min(${cachedCatalogItems.data}->>'article')`,
        count: sql<number>`count(*)::int`,
      })
      .from(cachedCatalogItems)
      .where(
        and(
          inArray(cachedCatalogItems.groupSlug, groupSlugs),
          eq(cachedCatalogItems.status, 'available'),
          sql`coalesce(${cachedCatalogItems.data}->>'article', '') <> ''`,
        ),
      )
      .groupBy(cachedCatalogItems.groupSlug, cachedCatalogItems.articleSlug)
      .orderBy(sql`count(*) desc`);
    for (const row of rows) {
      const group = String(row.group || '');
      const list = byGroup.get(group) || [];
      if (list.length >= MAX_DROPDOWN_ARTICLES) continue;
      list.push({ name: String(row.name).trim(), slug: row.slug || undefined });
      byGroup.set(group, list);
    }
  }
  defaultArticlesCache = { key, at: Date.now(), byGroup };
  return byGroup;
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

  const needDefaults = out.filter((g) => !g.dropdown.articles.length).map((g) => g.slug);
  if (needDefaults.length) {
    try {
      const defaults = await defaultArticlesFor(needDefaults);
      out = out.map((g) =>
        g.dropdown.articles.length
          ? g
          : { ...g, dropdown: { ...g.dropdown, articles: defaults.get(g.slug) || [] } },
      );
    } catch (err) {
      console.error('[header] default articles failed', err);
    }
  }

  return { 
    selectedGroups: out,
    logoUrl: header.logoUrl,
    logoIconUrl: header.logoIconUrl
  };
}

router.get('/', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await getHeaderSelection());
});

router.post(
  '/',
  (req, res, next) => {
    const action = String(req.query.action || '');
    if (action === 'upload-callout-image' || action === 'upload-logo' || action === 'upload-logo-icon') {
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

      const stored = await storeCmsUpload(req.file, `header_callout_${slug.replace(/[^a-z0-9_-]/g, '_')}_${Date.now()}`);
      return res.json({ success: true, filename: stored.filename, image: stored.url, url: stored.url });
    }

    if (action === 'upload-logo' || action === 'upload-logo-icon') {
      if (!req.file) return res.status(400).json({ error: 'No file' });
      const prefix = action === 'upload-logo' ? 'brand_logo' : 'logo_icon';
      const stored = await storeCmsUpload(req.file, `${prefix}_${Date.now()}`);
      const url = stored.url;
      
      const current = await getContent<HeaderContent>('header', { selectedGroups: [] });
      if (action === 'upload-logo') current.logoUrl = url;
      else current.logoIconUrl = url;
      await setContent('header', current);
      
      return res.json({ success: true, image: url });
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
    const current = await getContent<HeaderContent>('header', { selectedGroups: [] });
    await setContent('header', { ...current, selectedGroups });
    res.json({ success: true, selectedGroups });
  } catch (err) {
    console.error('[header] POST', err);
    res.status(500).json({ error: 'Save failed' });
  }
  },
);

router.delete('/', async (_req, res) => {
  try {
    const current = await getContent<HeaderContent>('header', { selectedGroups: [] });
    await setContent('header', { ...current, selectedGroups: [] });
    res.json({ success: true, selectedGroups: [] });
  } catch {
    res.status(500).json({ error: 'Reset failed' });
  }
});

export default router;
