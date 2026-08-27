import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  applyWebsiteDescription,
  getAllWebsiteItemMeta,
} from '../lib/websiteItemMeta.js';
import { getSearchSuggestionsConfig } from '../lib/searchSuggestions.js';
import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';
import { slugifyName, toPublicItem } from '../lib/catalogStore.js';
import { getExtraGroups, getExtraTaxonomy } from '../lib/catalogTaxonomy.js';
import { sql, and, eq, ilike, or, desc, asc, gte, lte, inArray } from 'drizzle-orm';

const router = Router();

function mergeExtraTaxonomy(
  filters: {
    group: Array<{ slug: string | null; name: string; count: number }>;
    type: Array<{ slug: string | null; name: string; count: number }>;
    article: Array<{ slug: string | null; name: string; count: number }>;
    purity: Array<{ name: string | null; count: number }>;
    metal_type: Array<{ name: string | null; count: number }>;
  },
  extraGroups: Awaited<ReturnType<typeof getExtraGroups>>,
  extra: Awaited<ReturnType<typeof getExtraTaxonomy>>,
) {
  const groupSeen = new Set((filters.group || []).map((g) => g.slug));
  extraGroups.forEach((g) => {
    if (!groupSeen.has(g.slug)) {
      filters.group.push({ slug: g.slug, name: g.name, count: 0 });
      groupSeen.add(g.slug);
    } else {
      const row = filters.group.find((x) => x.slug === g.slug);
      if (row && g.name) row.name = g.name;
    }
  });
  const typeSeen = new Set((filters.type || []).map((g) => g.slug));
  extra.types.forEach((g) => {
    if (!typeSeen.has(g.slug)) {
      filters.type.push({ slug: g.slug, name: g.name, count: 0 });
      typeSeen.add(g.slug);
    } else {
      const row = filters.type.find((x) => x.slug === g.slug);
      if (row && g.name) row.name = g.name;
    }
  });
  const articleSeen = new Set((filters.article || []).map((g) => g.slug));
  extra.articles.forEach((g) => {
    if (!articleSeen.has(g.slug)) {
      filters.article.push({ slug: g.slug, name: g.name, count: 0 });
      articleSeen.add(g.slug);
    } else {
      const row = filters.article.find((x) => x.slug === g.slug);
      if (row && g.name) row.name = g.name;
    }
  });
  const metalSeen = new Set((filters.metal_type || []).map((g) => String(g.name || '').toLowerCase()));
  extra.metals.forEach((name) => {
    if (!metalSeen.has(name.toLowerCase())) {
      filters.metal_type.push({ name, count: 0 });
      metalSeen.add(name.toLowerCase());
    }
  });
  const puritySeen = new Set((filters.purity || []).map((g) => String(g.name || '').toLowerCase()));
  extra.purities.forEach((name) => {
    if (!puritySeen.has(name.toLowerCase())) {
      filters.purity.push({ name, count: 0 });
      puritySeen.add(name.toLowerCase());
    }
  });
  return filters;
}

function splitList(value?: string) {
  return String(value || '')
    .split(/[|,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchSlugOrName(
  slugCol: typeof cachedCatalogItems.groupSlug,
  raw: string,
  nameExpr: ReturnType<typeof sql>,
) {
  const slug = slugifyName(raw) || raw.toLowerCase();
  return or(eq(slugCol, raw), eq(slugCol, slug), ilike(nameExpr, raw));
}

type CatalogScope = {
  group?: string;
  type?: string;
  article?: string;
  article_id?: string;
  purity?: string;
  metal_type?: string;
  search?: string;
  hasImage?: boolean;
  priceMin?: number;
  priceMax?: number;
  adminBypass?: boolean;
  status?: string;
};

type FacetOmit = 'group' | 'type' | 'article' | 'purity' | 'metal';

function articleMatch(raw: string) {
  const ids = splitList(raw);
  if (!ids.length) return undefined;
  const parts = ids.map((part) =>
    or(
      matchSlugOrName(cachedCatalogItems.articleSlug, part, sql`data->>'article'`),
      sql`lower(coalesce(data->>'article_id', '')) = ${part.toLowerCase()}`,
    ),
  );
  return parts.length === 1 ? parts[0] : or(...parts);
}

async function buildCatalogConditions(scope: CatalogScope, omit?: FacetOmit) {
  const conditions = [];
  const statusFilter = String(scope.status || '').trim().toLowerCase();
  if (scope.adminBypass && ['sold', 'available', 'hidden', 'reserved'].includes(statusFilter)) {
    conditions.push(eq(cachedCatalogItems.status, statusFilter));
  } else if (!scope.adminBypass) {
    conditions.push(eq(cachedCatalogItems.status, 'available'));
  }

  if (omit !== 'group' && scope.group) {
    conditions.push(matchSlugOrName(cachedCatalogItems.groupSlug, scope.group, sql`data->>'group'`));
  }
  if (omit !== 'type' && scope.type) {
    conditions.push(matchSlugOrName(cachedCatalogItems.typeSlug, scope.type, sql`data->>'type'`));
  }
  if (omit !== 'article' && (scope.article || scope.article_id)) {
    const match = articleMatch(scope.article_id || scope.article || '');
    if (match) conditions.push(match);
  }
  if (omit !== 'metal' && scope.metal_type) {
    conditions.push(ilike(cachedCatalogItems.metalType, `%${scope.metal_type}%`));
  }
  if (omit !== 'purity' && scope.purity) {
    conditions.push(ilike(cachedCatalogItems.purity, `%${scope.purity}%`));
  }
  if (scope.hasImage) conditions.push(eq(cachedCatalogItems.hasImage, true));
  if (scope.priceMin && !isNaN(scope.priceMin) && scope.priceMin > 0) {
    conditions.push(gte(cachedCatalogItems.displayPrice, scope.priceMin));
  }
  if (scope.priceMax && !isNaN(scope.priceMax) && scope.priceMax > 0) {
    conditions.push(lte(cachedCatalogItems.displayPrice, scope.priceMax));
  }
  if (scope.search) {
    const searchTerm = scope.search.toLowerCase();
    conditions.push(
      or(
        ilike(sql`data->>'name'`, `%${searchTerm}%`),
        ilike(cachedCatalogItems.tagNumber, `%${searchTerm}%`),
      ),
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}

function pickQuery(req: Request, keys: string[]) {
  const out: Record<string, string | undefined> = {};
  keys.forEach((key) => {
    const raw = req.query[key];
    if (typeof raw === 'string') out[key] = raw;
    else if (Array.isArray(raw) && typeof raw[0] === 'string') out[key] = raw[0];
  });
  return out;
}

function handleErpError(err: unknown, res: Response) {
  const status = typeof err === 'object' && err && 'status' in err
    ? Number((err as { status: number }).status) || 500
    : 500;
  const message = err instanceof Error ? err.message : 'Catalog request failed';
  res.status(status).json({ error: message });
}

let cachedFilters: {
  data: {
    filters: {
      group?: Array<{ name: string; slug?: string }>;
      article?: Array<{ name: string; slug?: string; id?: string }>;
      type?: Array<{ name: string; slug?: string }>;
    };
  };
  at: number;
} | null = null;

export function invalidateCatalogFilters() {
  cachedFilters = null;
}

const TAXONOMY_ALIASES: Record<string, string[]> = {
  bangle: ['bangles', 'bangle', 'kada', 'kadas', 'valayal'],
  bangles: ['bangles', 'bangle', 'kada', 'kadas', 'valayal'],
  kada: ['kada', 'kadas', 'bangle', 'bangles'],
  kadas: ['kada', 'kadas', 'bangle', 'bangles'],
  earring: ['earrings', 'ear-rings', 'earring', 'jhumki', 'stud', 'studs'],
  earrings: ['earrings', 'ear-rings', 'earring', 'jhumki', 'stud', 'studs'],
  ring: ['rings', 'ring', 'solitaire', 'solitaires'],
  rings: ['rings', 'ring', 'solitaire', 'solitaires'],
  necklace: ['necklace', 'necklaces', 'haram', 'choker', 'kante', 'malla'],
  necklaces: ['necklace', 'necklaces', 'haram', 'choker', 'kante', 'malla'],
  haram: ['haram', 'necklace', 'necklaces', 'gundla', 'nakshi', 'kasulaperu', 'guttapusala', 'pachala'],
  anklet: ['anklet', 'anklets', 'payal', 'golusu'],
  anklets: ['anklet', 'anklets', 'payal', 'golusu'],
  chain: ['chain', 'chains', 'nallapusalu', 'mangalsutra', 'thali'],
  chains: ['chain', 'chains', 'nallapusalu', 'mangalsutra', 'thali'],
  pendant: ['pendant', 'pendants', 'locket', 'lockets'],
  pendants: ['pendant', 'pendants', 'locket', 'lockets'],
  bracelet: ['bracelet', 'bracelets', 'kada'],
  bracelets: ['bracelet', 'bracelets', 'kada'],
};

async function queryFilters(scope: CatalogScope) {
  const slugOk = (col: typeof cachedCatalogItems.groupSlug) =>
    sql`${col} is not null and ${col} <> ''`;

  const [groupWhere, typeWhere, articleWhere, purityWhere, metalWhere] = await Promise.all([
    buildCatalogConditions(scope, 'group'),
    buildCatalogConditions(scope, 'type'),
    buildCatalogConditions(scope, 'article'),
    buildCatalogConditions(scope, 'purity'),
    buildCatalogConditions(scope, 'metal'),
  ]);

  const [groups, types, articles, purities, metals] = await Promise.all([
    db
      .select({
        slug: cachedCatalogItems.groupSlug,
        name: sql<string>`min(${cachedCatalogItems.data}->>'group')`,
        count: sql<number>`count(*)::int`,
      })
      .from(cachedCatalogItems)
      .where(groupWhere ? and(groupWhere, slugOk(cachedCatalogItems.groupSlug)) : slugOk(cachedCatalogItems.groupSlug))
      .groupBy(cachedCatalogItems.groupSlug),
    db
      .select({
        slug: cachedCatalogItems.typeSlug,
        name: sql<string>`min(${cachedCatalogItems.data}->>'type')`,
        count: sql<number>`count(*)::int`,
      })
      .from(cachedCatalogItems)
      .where(typeWhere ? and(typeWhere, slugOk(cachedCatalogItems.typeSlug)) : slugOk(cachedCatalogItems.typeSlug))
      .groupBy(cachedCatalogItems.typeSlug),
    db
      .select({
        slug: cachedCatalogItems.articleSlug,
        name: sql<string>`min(${cachedCatalogItems.data}->>'article')`,
        id: sql<string>`min(${cachedCatalogItems.data}->>'article_id')`,
        count: sql<number>`count(*)::int`,
      })
      .from(cachedCatalogItems)
      .where(articleWhere ? and(articleWhere, slugOk(cachedCatalogItems.articleSlug)) : slugOk(cachedCatalogItems.articleSlug))
      .groupBy(cachedCatalogItems.articleSlug),
    db
      .select({
        name: cachedCatalogItems.purity,
        count: sql<number>`count(*)::int`,
      })
      .from(cachedCatalogItems)
      .where(
        purityWhere
          ? and(purityWhere, sql`${cachedCatalogItems.purity} is not null and ${cachedCatalogItems.purity} <> ''`)
          : sql`${cachedCatalogItems.purity} is not null and ${cachedCatalogItems.purity} <> ''`,
      )
      .groupBy(cachedCatalogItems.purity),
    db
      .select({
        name: cachedCatalogItems.metalType,
        count: sql<number>`count(*)::int`,
      })
      .from(cachedCatalogItems)
      .where(
        metalWhere
          ? and(metalWhere, sql`${cachedCatalogItems.metalType} is not null and ${cachedCatalogItems.metalType} <> ''`)
          : sql`${cachedCatalogItems.metalType} is not null and ${cachedCatalogItems.metalType} <> ''`,
      )
      .groupBy(cachedCatalogItems.metalType),
  ]);

  return {
    group: groups.map((g) => ({ slug: g.slug, name: g.name || g.slug, count: Number(g.count || 0) })),
    type: types.map((g) => ({ slug: g.slug, name: g.name || g.slug, count: Number(g.count || 0) })),
    article: articles.map((g) => ({
      slug: g.slug,
      name: g.name || g.slug,
      id: g.id || undefined,
      count: Number(g.count || 0),
    })),
    purity: purities.map((g) => ({ name: g.name, count: Number(g.count || 0) })),
    metal_type: metals.map((g) => ({ name: g.name, count: Number(g.count || 0) })),
  };
}

async function getCachedFilters() {
  if (cachedFilters && Date.now() - cachedFilters.at < 15 * 1000) {
    return cachedFilters.data;
  }
  const filters = await queryFilters({ adminBypass: false });
  cachedFilters = { data: { filters }, at: Date.now() };
  return cachedFilters.data;
}

function normalizeStem(word: string): string {
  const w = word.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 2) return w.slice(0, -1);
  return w;
}

/** GET /api/catalog — Neon cached_catalog_items only (ERP is import-only). */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = pickQuery(req, [
      'limit',
      'offset',
      'search',
      'type',
      'group',
      'article',
      'type_id',
      'group_id',
      'article_id',
      'purity',
      'metal_type',
      'sort',
      'status',
    ]);

    const searchTerm = String(query.search || '').trim().toLowerCase();
    const originalLimit = Number(query.limit) || 48;
    const originalOffset = Number(query.offset) || 0;
    const sort = String(query.sort || '').trim().toLowerCase();
    const priceMin = Number(req.query.price_min);
    const priceMax = Number(req.query.price_max);
    const adminBypass = req.query.admin_bypass === 'true';
    const statusFilter = String(req.query.status || query.status || '').trim().toLowerCase();

    const whereExpr = await buildCatalogConditions({
      group: query.group,
      type: query.type,
      article: query.article,
      article_id: query.article_id,
      purity: query.purity,
      metal_type: query.metal_type,
      search: searchTerm,
      hasImage: req.query.has_image === 'true',
      priceMin,
      priceMax,
      adminBypass,
      status: statusFilter,
    });

    let orderBy = desc(cachedCatalogItems.erpCreatedAt);
    if (statusFilter === 'sold') orderBy = desc(cachedCatalogItems.soldAt);
    if (sort === 'price_asc') orderBy = asc(cachedCatalogItems.displayPrice);
    else if (sort === 'price_desc') orderBy = desc(cachedCatalogItems.displayPrice);
    else if (sort === 'newest' && statusFilter !== 'sold') orderBy = desc(cachedCatalogItems.erpCreatedAt);
    else if (sort === 'name_asc') orderBy = sql`data->>'name' ASC`;
    else if (sort === 'name_desc') orderBy = sql`data->>'name' DESC`;
    else if (sort === 'image_first') orderBy = desc(cachedCatalogItems.hasImage);

    const itemsQuery = db
      .select()
      .from(cachedCatalogItems)
      .where(whereExpr)
      .orderBy(orderBy)
      .limit(originalLimit)
      .offset(originalOffset);

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(cachedCatalogItems)
      .where(whereExpr);

    const [itemsRes, countRes] = await Promise.all([itemsQuery, countQuery]);
    const metaMap = await getAllWebsiteItemMeta();
    return res.json({
      data: {
        items: itemsRes.map((row) =>
          applyWebsiteDescription(toPublicItem(row), metaMap),
        ),
        total: Number(countRes[0]?.count || 0),
      },
    });
  } catch (err) {
    handleErpError(err, res);
  }
});

/** GET /api/catalog/filters — taxonomy facets (scoped like ERP /filters) */
router.get('/filters', async (req: Request, res: Response) => {
  try {
    const q = pickQuery(req, [
      'type',
      'group',
      'article',
      'article_id',
      'purity',
      'metal_type',
      'search',
    ]);
    const adminBypass = req.query.admin_bypass === 'true';
    const scope: CatalogScope = {
      group: q.group,
      type: q.type,
      article: q.article,
      article_id: q.article_id,
      purity: q.purity,
      metal_type: q.metal_type,
      search: q.search,
      hasImage: req.query.has_image === 'true',
      adminBypass,
    };
    const scoped = Boolean(
      scope.group ||
        scope.type ||
        scope.article ||
        scope.article_id ||
        scope.purity ||
        scope.metal_type ||
        scope.search ||
        scope.hasImage,
    );

    let filters;
    if (adminBypass && !scoped) {
      filters = await queryFilters({ adminBypass: true });
      const [extraGroups, extraTaxonomy] = await Promise.all([getExtraGroups(), getExtraTaxonomy()]);
      mergeExtraTaxonomy(filters, extraGroups, extraTaxonomy);
    } else if (!adminBypass && !scoped) {
      const body = await getCachedFilters();
      filters = body.filters;
    } else {
      filters = await queryFilters(scope);
      if (adminBypass) {
        const [extraGroups, extraTaxonomy] = await Promise.all([getExtraGroups(), getExtraTaxonomy()]);
        mergeExtraTaxonomy(filters, extraGroups, extraTaxonomy);
      }
    }

    res.json({ data: { filters } });
  } catch (err) {
    handleErpError(err, res);
  }
});

/** GET /api/catalog/items/:tag — single website catalog item */
router.get('/items/:tag', async (req: Request, res: Response) => {
  try {
    const tag = String(req.params.tag || '').trim().toUpperCase();
    const adminBypass = req.query.admin_bypass === 'true';
    const rows = await db
      .select()
      .from(cachedCatalogItems)
      .where(eq(cachedCatalogItems.tagNumber, tag))
      .limit(1);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Item not found' });
    if (!adminBypass && row.status !== 'available') {
      return res.status(404).json({ error: 'Item not found' });
    }
    const metaMap = await getAllWebsiteItemMeta();
    const data = applyWebsiteDescription(toPublicItem(row), metaMap);
    res.json({ data });
  } catch (err) {
    handleErpError(err, res);
  }
});

/** GET /api/catalog/suggestions?q= — lightweight instant search suggestions */
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (q.length < 2) {
      const config = await getSearchSuggestionsConfig();
      const defaultCategories: Array<{ name: string; slug: string; type: string }> = [];
      try {
        const filtersRes = await getCachedFilters();
        const groups = (filtersRes?.filters?.group || []) as Array<{ name: string; slug?: string }>;
        
        let selectedGroups: any[] = [];
        if (config.trendingCategories && config.trendingCategories.length > 0) {
          selectedGroups = groups.filter(g => {
            const catSlug = g.slug || g.name.replace(/[^a-z0-9]+/g, '-').toLowerCase().replace(/^-|-$/g, '');
            return config.trendingCategories.includes(catSlug);
          });
        }
        if (selectedGroups.length === 0) {
          selectedGroups = groups.slice(0, 4);
        }

        for (const g of selectedGroups) {
          const catSlug = g.slug || g.name.replace(/[^a-z0-9]+/g, '-').toLowerCase().replace(/^-|-$/g, '');
          defaultCategories.push({ name: g.name, slug: catSlug, type: 'group' });
        }
      } catch {}

      let defaultProducts: any[] = [];
      try {
        if (config.whatsNewTags && config.whatsNewTags.length > 0) {
          const rawTags = config.whatsNewTags.map(t => t.trim()).filter(Boolean);
          const tags = Array.from(new Set(rawTags));
          const rows = await db
            .select()
            .from(cachedCatalogItems)
            .where(
              and(
                eq(cachedCatalogItems.status, 'available'),
                inArray(
                  cachedCatalogItems.tagNumber,
                  tags.map((t) => t.toUpperCase()),
                ),
              ),
            );
          defaultProducts = rows.map((row) => {
            const item = toPublicItem(row);
            return {
              tag_number: row.tagNumber,
              name: String(item.name || ''),
              image_url: item.image_url || null,
              display_price: item.display_price != null ? Number(item.display_price) : null,
              group_slug: item.group_slug || row.groupSlug,
            };
          });
        }

        if (defaultProducts.length === 0) {
          const newest = await db
            .select()
            .from(cachedCatalogItems)
            .where(eq(cachedCatalogItems.status, 'available'))
            .orderBy(desc(cachedCatalogItems.erpCreatedAt))
            .limit(3);
          defaultProducts = newest.map((row) => {
            const item = toPublicItem(row);
            return {
              tag_number: row.tagNumber,
              name: String(item.name || ''),
              image_url: item.image_url || null,
              display_price: item.display_price != null ? Number(item.display_price) : null,
              group_slug: item.group_slug || row.groupSlug,
            };
          });
        }
      } catch {}

      res.json({ products: defaultProducts, categories: defaultCategories });
      return;
    }

    const tokens = q.split(/\s+/).filter(Boolean);
    const stems = tokens.map(normalizeStem);
    const searchAliases = tokens.flatMap(
      (t) => TAXONOMY_ALIASES[t] || TAXONOMY_ALIASES[normalizeStem(t)] || [],
    );

    // --- Category suggestions from cached filters ---
    const categories: Array<{ name: string; slug: string; type: string }> = [];
    const seenSlugs = new Set<string>();
    try {
      const filtersRes = await getCachedFilters();
      const groups = (filtersRes?.filters?.group || []) as Array<{
        name: string;
        slug?: string;
      }>;
      const articles = (filtersRes?.filters?.article || []) as Array<{
        name: string;
        slug?: string;
      }>;

      for (const g of groups) {
        if (categories.length >= 4) break;
        const gName = String(g.name || '').toLowerCase();
        const gSlug = String(g.slug || '').toLowerCase();
        const gStem = normalizeStem(gName);
        const slugStem = normalizeStem(gSlug);
        const match =
          gName.includes(q) ||
          gSlug.includes(q) ||
          stems.some((s) => gStem.includes(s) || slugStem.includes(s)) ||
          searchAliases.some(
            (a) => gSlug === a || gName === a || gStem === normalizeStem(a) || slugStem === normalizeStem(a),
          );
        if (match) {
          const catSlug = g.slug || gName.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          if (!seenSlugs.has(catSlug)) {
            seenSlugs.add(catSlug);
            categories.push({
              name: g.name,
              slug: catSlug,
              type: 'group',
            });
          }
        }
      }
      for (const a of articles) {
        if (categories.length >= 4) break;
        const aName = String(a.name || '').toLowerCase();
        const aStem = normalizeStem(aName);
        const match =
          aName.includes(q) ||
          stems.some((s) => aStem.includes(s)) ||
          searchAliases.some((al) => aName === al || aStem === normalizeStem(al));
        if (match) {
          const catSlug = a.slug || aName.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          if (!seenSlugs.has(catSlug)) {
            seenSlugs.add(catSlug);
            categories.push({
              name: a.name,
              slug: catSlug,
              type: 'article',
            });
          }
        }
      }
    } catch {
      /* filters unavailable — continue with products only */
    }

    // --- Product suggestions from ERP catalog ---
    type SuggestionProduct = {
      tag_number: string;
      name: string;
      image_url?: string | null;
      display_price?: number | null;
      group_slug?: string | null;
    };
    let products: SuggestionProduct[] = [];
    try {
      const rows = await db
        .select()
        .from(cachedCatalogItems)
        .where(
          and(
            eq(cachedCatalogItems.status, 'available'),
            or(
              ilike(cachedCatalogItems.tagNumber, `%${q}%`),
              ilike(sql`data->>'name'`, `%${q}%`),
              ilike(cachedCatalogItems.groupSlug, `%${q}%`),
              ilike(cachedCatalogItems.articleSlug, `%${q}%`),
            ),
          ),
        )
        .limit(5);
      products = rows.map((row) => {
        const item = toPublicItem(row);
        return {
          tag_number: row.tagNumber,
          name: String(item.name || ''),
          image_url: item.image_url || null,
          display_price: item.display_price != null ? Number(item.display_price) : null,
          group_slug: item.group_slug || row.groupSlug,
        };
      });
    } catch {
      /* catalog unavailable — return categories only */
    }

    res.json({ products, categories });
  } catch (err) {
    handleErpError(err, res);
  }
});

router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  handleErpError(err, res);
});

export default router;
