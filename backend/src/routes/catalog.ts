import { Router, type Request, type Response, type NextFunction } from 'express';
import { fetchErpPublic } from '../lib/erpCatalog.js';
import {
  applyWebsiteDescription,
  getAllWebsiteItemMeta,
} from '../lib/websiteItemMeta.js';
import { getErpVisibility } from '../lib/erpVisibility.js';
import { getSearchSuggestionsConfig } from '../lib/searchSuggestions.js';
import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';
import { sql, and, eq, ilike, or, desc, asc, gte, lte } from 'drizzle-orm';

const router = Router();

const fullCatalogCache = new Map<string, { body: any; at: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getFullCatalogCacheKey(query: Record<string, string | undefined>) {
  return JSON.stringify({
    group: query.group || '',
    type: query.type || '',
    article: query.article || '',
    group_id: query.group_id || '',
    type_id: query.type_id || '',
    article_id: query.article_id || '',
    purity: query.purity || '',
    metal_type: query.metal_type || '',
    branch_id: query.branch_id || ''
  });
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

async function getCachedFilters(branchId?: string) {
  if (cachedFilters && Date.now() - cachedFilters.at < 5 * 60 * 1000) {
    return cachedFilters.data;
  }
  try {
    const res = await fetchErpPublic('/filters', branchId ? { branch_id: branchId } : {});
    const filters = res?.data?.filters || res?.filters;
    if (filters) {
      cachedFilters = { data: filters, at: Date.now() };
      return filters;
    }
  } catch (err) {
    console.warn('[filters/cache-error]', err);
  }
  return cachedFilters?.data || null;
}

function normalizeStem(word: string): string {
  const w = word.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 2) return w.slice(0, -1);
  return w;
}

/** GET /api/catalog — live ERP available inventory for this store instance */
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
      'branch_id',
      'sort',
    ]);

    const searchTerm = String(query.search || '').trim().toLowerCase();
    
    const originalLimit = Number(query.limit) || 48;
    const originalOffset = Number(query.offset) || 0;
    
    const erpQuery: Record<string, string | undefined> = { ...query };
    const sort = req.query.sort as string;
    const priceMin = Number(req.query.price_min);
    const priceMax = Number(req.query.price_max);

    // PATH B: Sorted Browsing (Read from Postgres DB)
    if (sort) {
      const conditions = [];
      if (erpQuery.group) conditions.push(eq(cachedCatalogItems.groupSlug, erpQuery.group));
      if (erpQuery.type) conditions.push(eq(cachedCatalogItems.typeSlug, erpQuery.type.toLowerCase()));
      if (erpQuery.article) conditions.push(ilike(cachedCatalogItems.articleSlug, `%${erpQuery.article}%`));
      if (erpQuery.metal_type) conditions.push(ilike(cachedCatalogItems.metalType, `%${erpQuery.metal_type}%`));
      if (erpQuery.purity) conditions.push(ilike(cachedCatalogItems.purity, `%${erpQuery.purity}%`));
      if (req.query.has_image === 'true') conditions.push(eq(cachedCatalogItems.hasImage, true));
      if (!isNaN(priceMin) && priceMin > 0) conditions.push(gte(cachedCatalogItems.displayPrice, priceMin));
      if (!isNaN(priceMax) && priceMax > 0) conditions.push(lte(cachedCatalogItems.displayPrice, priceMax));
      if (searchTerm) {
        conditions.push(
          or(
            ilike(sql`data->>'name'`, `%${searchTerm}%`),
            ilike(cachedCatalogItems.tagNumber, `%${searchTerm}%`)
          )
        );
      }

      let orderBy = asc(cachedCatalogItems.erpCreatedAt);
      if (sort === 'price_asc') orderBy = asc(cachedCatalogItems.displayPrice);
      else if (sort === 'price_desc') orderBy = desc(cachedCatalogItems.displayPrice);
      else if (sort === 'newest') orderBy = desc(cachedCatalogItems.erpCreatedAt);
      else if (sort === 'name_asc') orderBy = sql`data->>'name' ASC`;
      else if (sort === 'name_desc') orderBy = sql`data->>'name' DESC`;
      else if (sort === 'image_first') orderBy = desc(cachedCatalogItems.hasImage);

      const itemsQuery = db.select({ data: cachedCatalogItems.data })
        .from(cachedCatalogItems)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(originalLimit)
        .offset(originalOffset);
        
      const countQuery = db.select({ count: sql<number>`count(*)` })
        .from(cachedCatalogItems)
        .where(and(...conditions));
        
      const [itemsRes, countRes] = await Promise.all([itemsQuery, countQuery]);
      return res.json({
        data: {
          items: itemsRes.map((r: any) => r.data),
          total: Number(countRes[0]?.count || 0)
        }
      });
    }

    // PATH A: Unsorted Browsing (Real-Time Batched Over-fetching from ERP)
    const cacheKey = getFullCatalogCacheKey(erpQuery) + `&limit=${originalLimit}&offset=${originalOffset}&has_image=${req.query.has_image}&priceMin=${priceMin}&priceMax=${priceMax}`;
    const hit = fullCatalogCache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return res.json(hit.body);
    }

    const visibility = await getErpVisibility();
    const metaMap = await getAllWebsiteItemMeta();

    const adminBypass = req.query.admin_bypass === 'true';

    const collectedVisibleItems: any[] = [];
    let erpOffset = 0;
    const batchLimit = 50;
    let erpTotal = 0;
    const targetCount = originalOffset + originalLimit; // e.g. for page 2 (offset 24, limit 24), we need 48 visible items total, then slice last 24

    while (collectedVisibleItems.length < targetCount) {
      const batchQuery = { ...erpQuery, limit: String(batchLimit), offset: String(erpOffset) };
      const batchRes = await fetchErpPublic('/catalog', batchQuery);
      
      if (!batchRes?.data?.items || batchRes.data.items.length === 0) break;
      erpTotal = batchRes.data.total;

      const filtered = batchRes.data.items.filter((item: any) => {
        if (!adminBypass) {
          const groupSlug = String(item.group_slug || '').toLowerCase();
          const tag = String(item.tag_number || '');
          const hasCat = visibility.visibleCategories.length > 0;
          const hasProd = visibility.visibleProducts.length > 0;
          
          if (hasCat || hasProd) {
            const catVisible = visibility.visibleCategories.includes(groupSlug);
            const prodVisible = visibility.visibleProducts.includes(tag);
            if (!catVisible && !prodVisible) return false;
          }
        }
        if (req.query.has_image === 'true' && !item.image_url && !item.pos_image_url && !(Array.isArray(item.website_images) && item.website_images.length > 0)) return false;
        const price = item.display_price || 0;
        if (!isNaN(priceMin) && priceMin > 0 && price < priceMin) return false;
        if (!isNaN(priceMax) && priceMax > 0 && price > priceMax) return false;
        return true;
      });

      collectedVisibleItems.push(...filtered.map((item: any) => applyWebsiteDescription(item, metaMap)));
      
      erpOffset += batchLimit;
      if (batchRes.data.items.length < batchLimit) break; // Reached end
    }

    const finalItems = collectedVisibleItems.slice(originalOffset, originalOffset + originalLimit);
    const body = {
      data: {
        items: finalItems,
        total: erpTotal // Return raw total for stable pagination
      }
    };

    fullCatalogCache.set(cacheKey, { body: JSON.parse(JSON.stringify(body)), at: Date.now() });
    res.json(body);
  } catch (err) {
    handleErpError(err, res);
  }
});

/** GET /api/catalog/filters — ERP taxonomy facets from live stock */
router.get('/filters', async (req: Request, res: Response) => {
  try {
    const body = await fetchErpPublic(
      '/filters',
      pickQuery(req, [
        'type',
        'group',
        'article',
        'type_id',
        'group_id',
        'article_id',
        'branch_id',
      ]),
    );
    
    // Filter out categories not marked as visible unless bypassed by admin
    const adminBypass = req.query.admin_bypass === 'true';
    if (!adminBypass) {
      const visibility = await getErpVisibility();
      const hasCat = visibility.visibleCategories.length > 0;
      const hasProd = visibility.visibleProducts.length > 0;
      
      // If they only use visibleCategories, we can filter the sidebar. 
      // If they use visibleProducts, we don't filter the sidebar so they can still click categories that have specific products visible.
      if (hasCat && !hasProd) {
        if (body?.data?.filters?.group) {
          body.data.filters.group = body.data.filters.group.filter((g: any) => {
            const slug = g.slug || String(g.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            return visibility.visibleCategories.includes(slug);
          });
        }
        if (body?.filters?.group) {
          body.filters.group = body.filters.group.filter((g: any) => {
            const slug = g.slug || String(g.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            return visibility.visibleCategories.includes(slug);
          });
        }
      }
    }
    
    res.json(body);
  } catch (err) {
    handleErpError(err, res);
  }
});

/** GET /api/catalog/items/:tag — single available item PDP */
router.get('/items/:tag', async (req: Request, res: Response) => {
  try {
    const tag = String(req.params.tag || '').trim();
    const body = await fetchErpPublic(
      `/items/${encodeURIComponent(tag)}`,
      pickQuery(req, ['branch_id']),
    );
    const metaMap = await getAllWebsiteItemMeta();
    if (body?.data) {
      body.data = applyWebsiteDescription(body.data, metaMap);
    }
    res.json(body);
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
        const branchId = typeof req.query.branch_id === 'string' ? req.query.branch_id : undefined;
        const filtersRes = await getCachedFilters(branchId);
        const groups = (filtersRes?.group || filtersRes?.data?.filters?.group || []) as Array<{ name: string; slug?: string }>;
        
        let selectedGroups: Array<{ name: string; slug?: string }> = [];
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
          const itemPromises = tags.map(tag => fetchErpPublic(`/items/${encodeURIComponent(tag)}`, { branch_id: typeof req.query.branch_id === 'string' ? req.query.branch_id : undefined }).catch(() => null));
          const itemsResponses = await Promise.all(itemPromises);
          
          defaultProducts = itemsResponses.filter(res => res && res.data).map(res => {
            const item = res.data;
            return {
              tag_number: String(item.tag_number || ''),
              name: String(item.name || ''),
              image_url: item.image_url || item.pos_image_url || null,
              display_price: item.display_price != null ? Number(item.display_price) : null,
              group_slug: item.group_slug || null,
            };
          });
        }

        if (defaultProducts.length === 0) {
          const body = await fetchErpPublic('/catalog', { limit: '20' });
          if (body?.data?.items && Array.isArray(body.data.items)) {
            const items = [...body.data.items];
            items.sort((a: any, b: any) => String(b.id || b.tag_number).localeCompare(String(a.id || a.tag_number)));
            defaultProducts = items.slice(0, 3).map((item: any) => ({
              tag_number: String(item.tag_number || ''),
              name: String(item.name || ''),
              image_url: item.image_url || item.pos_image_url || null,
              display_price: item.display_price != null ? Number(item.display_price) : null,
              group_slug: item.group_slug || null,
            }));
          }
        }
      } catch {}

      res.json({ products: defaultProducts, categories: defaultCategories });
      return;
    }

    const branchId = typeof req.query.branch_id === 'string' ? req.query.branch_id : undefined;
    const tokens = q.split(/\s+/).filter(Boolean);
    const stems = tokens.map(normalizeStem);
    const searchAliases = tokens.flatMap(
      (t) => TAXONOMY_ALIASES[t] || TAXONOMY_ALIASES[normalizeStem(t)] || [],
    );

    // --- Category suggestions from cached filters ---
    const categories: Array<{ name: string; slug: string; type: string }> = [];
    const seenSlugs = new Set<string>();
    try {
      const filtersRes = await getCachedFilters(branchId);
      const groups = (filtersRes?.group || filtersRes?.data?.filters?.group || []) as Array<{
        name: string;
        slug?: string;
      }>;
      const articles = (filtersRes?.article || filtersRes?.data?.filters?.article || []) as Array<{
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
      const erpQuery: Record<string, string | undefined> = {
        search: q,
        limit: '5',
        branch_id: branchId,
      };
      const body = await fetchErpPublic('/catalog', erpQuery);
      if (body?.data?.items && Array.isArray(body.data.items)) {
        products = body.data.items.slice(0, 5).map(
          (item: Record<string, unknown>) => ({
            tag_number: String(item.tag_number || ''),
            name: String(item.name || ''),
            image_url: item.image_url || item.pos_image_url || null,
            display_price: item.display_price != null ? Number(item.display_price) : null,
            group_slug: item.group_slug || null,
          }),
        );
      }
    } catch {
      /* ERP unavailable — return categories only */
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
