import { Router, type Request, type Response, type NextFunction } from 'express';
import { fetchErpPublic } from '../lib/erpCatalog.js';
import {
  applyWebsiteDescription,
  getAllWebsiteItemMeta,
} from '../lib/websiteItemMeta.js';
import { getErpVisibility } from '../lib/erpVisibility.js';
import { getSearchSuggestionsConfig } from '../lib/searchSuggestions.js';

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

    // We MUST fetch all items from ERP to apply visibility filtering in Node before pagination
    erpQuery.limit = '1000000'; // Set artificially high to avoid ERP default caps
    erpQuery.offset = '0';
    delete erpQuery.sort;
    delete erpQuery.price_min;
    delete erpQuery.price_max;

    if (searchTerm) {
      const tokens = searchTerm.split(/\s+/).filter(Boolean);
      const stems = tokens.map(normalizeStem);

      // Check metal type keywords
      if (!erpQuery.metal_type) {
        if (tokens.some((t) => t === 'silver' || t === '92.5' || t === '925' || t === 'sterling')) {
          erpQuery.metal_type = 'silver';
        } else if (tokens.some((t) => t === 'gold' || t === '22k' || t === '916' || t === '24k' || t === '18k')) {
          erpQuery.metal_type = 'gold';
        }
      }

      // Check audience keywords
      if (!erpQuery.type) {
        if (tokens.some((t) => t === 'men' || t === 'mens' || t === 'male' || t === 'gents')) {
          erpQuery.type = 'MEN';
        } else if (tokens.some((t) => t === 'kids' || t === 'kid' || t === 'children' || t === 'child' || t === 'baby')) {
          erpQuery.type = 'KIDS';
        } else if (tokens.some((t) => t === 'women' || t === 'womens' || t === 'ladies' || t === 'female')) {
          erpQuery.type = 'WOMEN';
        }
      }

      // Check taxonomy groups and articles if not already explicitly provided
      if (!erpQuery.group && !erpQuery.article) {
        const filtersRes = await getCachedFilters(erpQuery.branch_id);
        const groups = (filtersRes?.group || filtersRes?.data?.filters?.group || []) as Array<{ name: string; slug?: string; id?: string }>;
        const articles = (filtersRes?.article || filtersRes?.data?.filters?.article || []) as Array<{ name: string; slug?: string; id?: string }>;

        const searchAliases = tokens.flatMap((t) => TAXONOMY_ALIASES[t] || TAXONOMY_ALIASES[normalizeStem(t)] || []);

        const matchedGroup = groups.find((g) => {
          const gName = String(g.name || '').toLowerCase().trim();
          const gSlug = String(g.slug || '').toLowerCase().trim();
          const gStem = normalizeStem(gName);
          const slugStem = normalizeStem(gSlug);
          
          // Direct exact name or slug match
          if (gSlug === searchTerm || gName === searchTerm || slugStem === stems[0] || gStem === stems[0]) {
            return true;
          }
          // Check known taxonomy synonyms (e.g. bangles -> bangles, kada, valayal)
          if (searchAliases.some((alias) => gSlug === alias || gName === alias || slugStem === normalizeStem(alias))) {
            return true;
          }
          return false;
        });

        const matchedArticle = articles.find((a) => {
          const aName = String(a.name || '').toLowerCase().trim();
          const aSlug = String(a.slug || a.name || '').toLowerCase().trim();
          const aStem = normalizeStem(aName);
          return (
            aName === searchTerm ||
            aStem === stems[0] ||
            searchAliases.some((alias) => aName === alias || aStem === normalizeStem(alias))
          );
        });

        if (matchedGroup) {
          erpQuery.group = matchedGroup.slug || matchedGroup.name.toLowerCase();
          if (matchedGroup.id) {
            erpQuery.group_id = matchedGroup.id;
          }
          delete erpQuery.search;
        } else if (matchedArticle) {
          erpQuery.article = matchedArticle.name;
          if (matchedArticle.id) {
            erpQuery.article_id = matchedArticle.id;
          }
          delete erpQuery.search;
        } else if (erpQuery.metal_type || erpQuery.type) {
          // If metal or audience was identified and no remaining specific keyword, remove raw search
          const remainingTokens = tokens.filter(
            (t) =>
              !['gold', 'silver', '916', '22k', '24k', '18k', '92.5', '925', 'sterling', 'men', 'mens', 'women', 'womens', 'ladies', 'kids', 'kid'].includes(t)
          );
          if (remainingTokens.length === 0) {
            delete erpQuery.search;
          }
        }
      }
    }

    let body;
    
    // If we requested all items for sorting, try cache first
    let cacheKey = '';
    if (erpQuery.limit === undefined) {
      cacheKey = getFullCatalogCacheKey(erpQuery);
      const hit = fullCatalogCache.get(cacheKey);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        // Deep clone so we don't sort the cached array in-place
        body = JSON.parse(JSON.stringify(hit.body));
      }
    }

    if (!body) {
      body = await fetchErpPublic('/catalog', erpQuery);
      
      // If we requested a huge limit but the ERP capped it (e.g. returned 50 or 200), we must paginate to get all items
      if (body?.data?.items && body.data.total > body.data.items.length) {
        const erpLimit = body.data.items.length;
        const total = body.data.total;
        for (let offset = erpLimit; offset < total; offset += erpLimit) {
          const nextQuery = { ...erpQuery, offset: String(offset), limit: String(erpLimit) };
          try {
            const res = await fetchErpPublic('/catalog', nextQuery);
            if (res?.data?.items) {
              body.data.items.push(...res.data.items);
            }
          } catch (err) {
            console.error('[catalog] Pagination fetch error for offset', offset, err);
          }
        }
      }

      if (cacheKey && body?.data?.items) {
        fullCatalogCache.set(cacheKey, { body: JSON.parse(JSON.stringify(body)), at: Date.now() });
      }
    }
    
    // Apply visibility filtering unless bypassed by admin
    const adminBypass = req.query.admin_bypass === 'true';
    if (!adminBypass) {
      const visibility = await getErpVisibility();
      if (body?.data?.items && Array.isArray(body.data.items)) {
        body.data.items = body.data.items.filter((item: any) => {
          const groupSlug = String(item.group_slug || '').toLowerCase();
          const tag = String(item.tag_number || '');
          if (visibility.visibleCategories.length > 0 && !visibility.visibleCategories.includes(groupSlug)) return false;
          if (visibility.visibleProducts.length > 0 && !visibility.visibleProducts.includes(tag)) return false;
          return true;
        });
        body.data.total = body.data.items.length;
      }
    }

    // If query with raw search was sent and returned 0 items, try intelligent fallback lookup
    if (searchTerm && (!body?.data?.items || body.data.items.length === 0) && erpQuery.search) {
      const filtersRes = await getCachedFilters(erpQuery.branch_id);
      const groups = (filtersRes?.group || filtersRes?.data?.filters?.group || []) as Array<{ name: string; slug?: string; id?: string }>;
      const articles = (filtersRes?.article || filtersRes?.data?.filters?.article || []) as Array<{ name: string; slug?: string; id?: string }>;

      const tokens = searchTerm.split(/\s+/).filter(Boolean);
      const stems = tokens.map(normalizeStem);
      const searchAliases = tokens.flatMap((t) => TAXONOMY_ALIASES[t] || TAXONOMY_ALIASES[normalizeStem(t)] || []);

      const matchedGroup = groups.find((g) => {
        const gName = String(g.name || '').toLowerCase();
        const gSlug = String(g.slug || '').toLowerCase();
        return (
          stems.some((s) => normalizeStem(gName).includes(s) || normalizeStem(gSlug).includes(s)) ||
          searchAliases.some((alias) => gSlug.includes(alias) || gName.includes(alias))
        );
      });

      const matchedArticle = articles.find((a) => {
        const aName = String(a.name || '').toLowerCase();
        return (
          stems.some((s) => normalizeStem(aName).includes(s)) ||
          searchAliases.some((alias) => aName.includes(alias))
        );
      });

      if (matchedGroup || matchedArticle) {
        const fallbackQuery: Record<string, string | undefined> = { ...erpQuery };
        delete fallbackQuery.search;
        if (matchedGroup) {
          fallbackQuery.group = matchedGroup.slug || matchedGroup.name.toLowerCase();
          if (matchedGroup.id) fallbackQuery.group_id = matchedGroup.id;
        }
        if (matchedArticle) {
          fallbackQuery.article = matchedArticle.name;
          if (matchedArticle.id) fallbackQuery.article_id = matchedArticle.id;
        }
        const fallbackBody = await fetchErpPublic('/catalog', fallbackQuery);
        if (fallbackBody?.data?.items && fallbackBody.data.items.length > 0) {
          body = fallbackBody;
        }
      }
    }

    const metaMap = await getAllWebsiteItemMeta();
    if (body?.data?.items && Array.isArray(body.data.items)) {
      body.data.items = body.data.items.map((item: { tag_number?: string; description?: string | null }) =>
        applyWebsiteDescription(item, metaMap),
      );
      
      if (!isNaN(priceMin) || !isNaN(priceMax)) {
        body.data.items = body.data.items.filter((item: any) => {
          const price = item.display_price || 0;
          if (!isNaN(priceMin) && priceMin > 0 && price < priceMin) return false;
          if (!isNaN(priceMax) && priceMax > 0 && price > priceMax) return false;
          return true;
        });
      }

      if (sort) {
        if (sort === 'price_asc') {
          body.data.items.sort((a: any, b: any) => (a.display_price || 0) - (b.display_price || 0));
        } else if (sort === 'price_desc') {
          body.data.items.sort((a: any, b: any) => (b.display_price || 0) - (a.display_price || 0));
        } else if (sort === 'name_asc') {
          body.data.items.sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));
        } else if (sort === 'name_desc') {
          body.data.items.sort((a: any, b: any) => String(b.name || '').localeCompare(String(a.name || '')));
        } else if (sort === 'newest') {
          body.data.items.sort((a: any, b: any) => {
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            if (timeB !== timeA && timeB && timeA) return timeB - timeA;
            return String(b.id || b.tag_number || '').localeCompare(String(a.id || a.tag_number || ''));
          });
        }
      }

      // Apply pagination in Node since we deleted limit/offset to do visibility filtering
      body.data.items = body.data.items.slice(originalOffset, originalOffset + originalLimit);
    }
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
      if (visibility.visibleCategories.length > 0) {
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
        
        let selectedGroups = [];
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
