export type CatalogItem = {
  id: string;
  tag_number: string;
  name: string;
  description?: string | null;
  /** Primary storefront image (gallery[0] or POS fallback). */
  image_url?: string | null;
  /** POS stock photo — never overwritten by website gallery. */
  pos_image_url?: string | null;
  /** Ordered website gallery URLs (empty = use pos_image_url / image_url). */
  website_images?: string[] | null;
  gross_weight?: number | string | null;
  net_weight?: number | string | null;
  stone_weight?: number | string | null;
  stone_charges?: number | null;
  mrp?: number | null;
  display_price?: number | null;
  metal_type?: string | null;
  purity?: string | null;
  status?: string | null;
  type?: string | null;
  type_id?: string | null;
  type_slug?: string | null;
  group?: string | null;
  group_id?: string | null;
  group_slug?: string | null;
  article?: string | null;
  article_id?: string | null;
  article_slug?: string | null;
};

export type CatalogFilterOption = {
  id?: string | null;
  name: string;
  slug?: string | null;
  count?: number;
};

export type CatalogFilters = {
  type: CatalogFilterOption[];
  group: CatalogFilterOption[];
  article: CatalogFilterOption[];
  purity: CatalogFilterOption[];
  metal_type: CatalogFilterOption[];
};

function toQuery(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') qs.set(key, String(value));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function formatDisplayPrice(price: number | null | undefined) {
  if (price === null || price === undefined || Number.isNaN(Number(price))) {
    return 'Price on request';
  }
  return `₹${Number(price).toLocaleString('en-IN')}`;
}

export function itemHref(item: CatalogItem) {
  // Routes are group-based (ERP inventory_groups), not type (MEN/WOMEN).
  const groupSlug = item.group_slug || item.type_slug || 'item';
  return `/jewellery/${encodeURIComponent(groupSlug)}/${encodeURIComponent(item.tag_number)}`;
}

const GROUP_IMAGE_BY_SLUG: Record<string, string> = {
  anklets: '/images/category/silver_anklet.png',
  bangles: '/images/category/silver_bangle.png',
  bracelet: '/images/category/silver_bracelet.png',
  brooches: '/images/category/silver_image.png',
  chains: '/images/category/silver_chain.png',
  'chains-locket': '/images/category/silver_chain.png',
  choker: '/images/category/silver_neckalce.png',
  'ear-rings': '/images/category/silver_earrings.png',
  earrings: '/images/category/silver_earrings.png',
  'hand-bag': '/images/category/silver_image.png',
  haram: '/images/category/silver_neckalce.png',
  jhumki: '/images/category/silver_earrings.png',
  kada: '/images/category/silver_kada.png',
  kante: '/images/category/silver_neckalce.png',
  locket: '/images/category/silver_image.png',
  malla: '/images/category/silver_neckalce.png',
  'mang-tikka': '/images/category/silver_image.png',
  nallapusalu: '/images/category/mangalsutra_silver.png',
  necklace: '/images/category/silver_neckalce.png',
  pendent: '/images/category/silver_image.png',
  pendant: '/images/category/silver_image.png',
  ring: '/images/category/silver_ring.png',
  rings: '/images/category/silver_ring.png',
  'side-bits': '/images/category/silver_image.png',
  'thali-chain': '/images/category/mangalsutra_silver.png',
  tikka: '/images/category/silver_image.png',
  vaddanam: '/images/header/silver-vaddanam.png',
};

export function groupImageForSlug(
  slug: string | null | undefined,
  overrides?: Record<string, string> | null,
) {
  if (!slug) return '/images/category/silver_image.png';
  const key = slug.toLowerCase();
  const custom = overrides?.[key]?.trim();
  if (custom) return custom;
  return GROUP_IMAGE_BY_SLUG[key] || '/images/category/silver_image.png';
}

/** Admin / storefront overrides for ERP group tile images. */
export async function fetchGroupImages() {
  const res = await fetch('/api/site/group-images', { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to load group images');
  }
  const images =
    body?.images && typeof body.images === 'object'
      ? (body.images as Record<string, string>)
      : {};
  return images;
}

export async function uploadGroupImage(slug: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(
    `/api/upload/group-images?slug=${encodeURIComponent(slug)}`,
    { method: 'POST', body: fd, credentials: 'include' },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Upload failed');
  }
  return body as { success: boolean; slug: string; image: string; images: Record<string, string> };
}

export async function resetGroupImage(slug: string) {
  const res = await fetch(
    `/api/upload/group-images?slug=${encodeURIComponent(slug)}`,
    { method: 'DELETE', credentials: 'include' },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Reset failed');
  }
  return body as { success: boolean; slug: string; images: Record<string, string> };
}

export function slugifyName(name: string) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

import { PRODUCTS } from './data';

function mapLocalProduct(p: (typeof PRODUCTS)[number]): CatalogItem {
  const cleanPrice = Number(String(p.price || '0').replace(/[^0-9.]/g, '')) || 0;
  const cleanMrp = Number(String(p.originalPrice || p.price || '0').replace(/[^0-9.]/g, '')) || cleanPrice;
  const tagNumber = String(p.id || '').replace(/-/g, '').substring(0, 8).toUpperCase();
  const subcategory = 'subcategory' in p && typeof p.subcategory === 'string' ? p.subcategory : undefined;
  return {
    id: p.id,
    tag_number: tagNumber,
    name: p.name,
    description: `${p.name} - handcrafted jewellery with exquisite craftsmanship and purity.`,
    image_url: p.image,
    pos_image_url: p.image,
    website_images: [p.image],
    display_price: cleanPrice,
    mrp: cleanMrp,
    group: p.category,
    group_slug: slugifyName(p.category),
    article: subcategory ? subcategory.replace(/-/g, ' ').toUpperCase() : p.name,
    article_slug: subcategory || slugifyName(p.name),
    status: 'AVAILABLE',
    type: p.category.includes('mens') ? 'MEN' : p.category.includes('kids') ? 'KIDS' : 'WOMEN',
    type_slug: p.category.includes('mens') ? 'men' : p.category.includes('kids') ? 'kids' : 'women',
    metal_type: p.name.toLowerCase().includes('silver') || p.category.includes('silver') ? 'Silver' : 'Gold',
    purity: p.name.toLowerCase().includes('silver') ? '92.5 Sterling' : '22K (916)',
  };
}

function normalizeStem(word: string): string {
  const w = word.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 2) return w.slice(0, -1);
  return w;
}

const SEARCH_ALIASES: Record<string, string[]> = {
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

function getLocalCatalog(params: Record<string, string | number | undefined> = {}) {
  let list = PRODUCTS.map(mapLocalProduct);
  const search = String(params.search || '').trim().toLowerCase();
  const group = String(params.group || '').trim().toLowerCase();
  const article = String(params.article || '').trim().toLowerCase();
  const articleId = String(params.article_id || '').trim().toLowerCase();
  const type = String(params.type || '').trim().toUpperCase();
  const purity = String(params.purity || '').trim().toLowerCase();

  if (search) {
    const terms = search.split(/\s+/).filter(Boolean);
    const stems = terms.map(normalizeStem);
    list = list.filter((item) => {
      const targetName = (item.name || '').toLowerCase();
      const targetGroup = (item.group || '').toLowerCase();
      const targetGroupSlug = (item.group_slug || '').toLowerCase();
      const targetArticle = (item.article || '').toLowerCase();
      const targetWords = `${targetName} ${targetGroup} ${targetGroupSlug} ${targetArticle} ${item.tag_number || ''} ${item.metal_type || ''} ${item.type || ''}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
      const targetStems = targetWords.map(normalizeStem);

      return terms.every((term, idx) => {
        const stem = stems[idx];
        const aliases = SEARCH_ALIASES[term] || SEARCH_ALIASES[stem] || [];

        // Exact word or stem match in name, group, or article
        if (targetWords.includes(term) || targetStems.includes(stem)) return true;
        // Group or category slug match
        if (targetGroupSlug === term || targetGroupSlug === stem || aliases.includes(targetGroupSlug)) return true;
        if (targetGroup === term || targetGroup === stem || aliases.includes(targetGroup)) return true;
        // Category alias match
        if (aliases.some((a) => targetWords.includes(a) || targetStems.includes(normalizeStem(a)))) return true;

        return false;
      });
    });
  }

  if (group) {
    list = list.filter((item) => item.group_slug === group || (item.group && item.group.toLowerCase().includes(group)));
  }

  if (type) {
    list = list.filter((item) => item.type === type || (item.type_slug && item.type_slug.toUpperCase() === type));
  }

  if (article || articleId) {
    list = list.filter((item) => {
      if (article && item.article && item.article.toLowerCase().includes(article)) return true;
      if (articleId && item.article_slug && item.article_slug.toLowerCase().includes(articleId)) return true;
      return false;
    });
  }

  if (purity) {
    list = list.filter((item) => item.purity && item.purity.toLowerCase().includes(purity));
  }

  const priceMin = Number(params.price_min);
  const priceMax = Number(params.price_max);
  if (priceMin || priceMax) {
    list = list.filter((item) => {
      const price = item.display_price || 0;
      if (priceMin && price < priceMin) return false;
      if (priceMax && price > priceMax) return false;
      return true;
    });
  }

  if (params.has_image === 'true') {
    list = list.filter((item) => !!item.image_url || !!item.pos_image_url || (item.website_images && item.website_images.length > 0));
  }

  const sort = String(params.sort || '').trim().toLowerCase();
  if (sort === 'price_asc') {
    list.sort((a, b) => (a.display_price || 0) - (b.display_price || 0));
  } else if (sort === 'price_desc') {
    list.sort((a, b) => (b.display_price || 0) - (a.display_price || 0));
  } else if (sort === 'name_asc') {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sort === 'name_desc') {
    list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
  } else if (sort === 'newest') {
    list.sort((a, b) => (b.tag_number || '').localeCompare(a.tag_number || ''));
  } else if (sort === 'image_first') {
    list.sort((a, b) => {
      const aHasImg = !!a.image_url || !!a.pos_image_url || (a.website_images && a.website_images.length > 0) ? 1 : 0;
      const bHasImg = !!b.image_url || !!b.pos_image_url || (b.website_images && b.website_images.length > 0) ? 1 : 0;
      return bHasImg - aHasImg;
    });
  }

  const offset = Number(params.offset) || 0;
  const limit = Number(params.limit) || 48;
  const paged = list.slice(offset, offset + limit);

  return {
    store: { name: 'Anagha' },
    items: paged,
    total: list.length,
    limit,
    offset,
  };
}

function getLocalCatalogFilters(params: Record<string, string | undefined> = {}): { store: unknown; filters: CatalogFilters } {
  const local = getLocalCatalog(params);
  const items = local.items;
  
  const groupMap = new Map<string, number>();
  const typeMap = new Map<string, number>();
  const articleMap = new Map<string, number>();
  const purityMap = new Map<string, number>();

  PRODUCTS.forEach((p) => {
    const item = mapLocalProduct(p);
    if (item.group) groupMap.set(item.group, (groupMap.get(item.group) || 0) + 1);
    if (item.type) typeMap.set(item.type, (typeMap.get(item.type) || 0) + 1);
    if (item.article) articleMap.set(item.article, (articleMap.get(item.article) || 0) + 1);
    if (item.purity) purityMap.set(item.purity, (purityMap.get(item.purity) || 0) + 1);
  });

  return {
    store: { name: 'Anagha' },
    filters: {
      group: Array.from(groupMap.entries()).map(([name, count]) => ({ name, slug: slugifyName(name), count })),
      type: Array.from(typeMap.entries()).map(([name, count]) => ({ name, slug: slugifyName(name), count })),
      article: Array.from(articleMap.entries()).map(([name, count]) => ({ name, slug: slugifyName(name), count })),
      purity: Array.from(purityMap.entries()).map(([name, count]) => ({ name, slug: slugifyName(name), count })),
      metal_type: [
        { name: 'Gold', slug: 'gold', count: PRODUCTS.filter((p) => !p.name.toLowerCase().includes('silver') && !p.category.includes('silver')).length },
        { name: 'Silver', slug: 'silver', count: PRODUCTS.filter((p) => p.name.toLowerCase().includes('silver') || p.category.includes('silver')).length },
      ],
    },
  };
}

export async function fetchCatalog(params: Record<string, string | number | undefined> = {}) {
  try {
    const res = await fetch(`/api/catalog${toQuery(params)}`, { cache: 'no-store' });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body?.data?.items) {
        return body.data as {
          store: unknown;
          items: CatalogItem[];
          total: number;
          limit: number;
          offset: number;
        };
      }
    }
  } catch {
    /* fallback */
  }
  return getLocalCatalog(params);
}

export async function fetchCatalogFilters(params: Record<string, string | undefined> = {}) {
  try {
    const res = await fetch(`/api/catalog/filters${toQuery(params)}`, { cache: 'no-store' });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body?.data?.filters) {
        return body.data as { store: unknown; filters: CatalogFilters };
      }
    }
  } catch {
    /* fallback */
  }
  return getLocalCatalogFilters(params);
}

export async function fetchCatalogItem(tag: string) {
  try {
    const res = await fetch(`/api/catalog/items/${encodeURIComponent(tag)}`, { cache: 'no-store' });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body?.data) {
        return body.data as CatalogItem;
      }
    }
  } catch {
    /* fallback */
  }
  const cleanTag = tag.trim().toUpperCase();
  const found = PRODUCTS.find((p) => {
    const t = String(p.id || '').replace(/-/g, '').substring(0, 8).toUpperCase();
    return t === cleanTag || p.id === tag;
  });
  if (found) {
    return mapLocalProduct(found);
  }
  throw new Error('Item not found');
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/** Append one image to ERP website gallery (BFF → WEBSTORE_SECRET). */
export async function uploadWebsiteImage(tag: string, file: File) {
  const dataUrl = await fileToDataUrl(file);
  const res = await fetch(`/api/upload/jewellery/website-images/${encodeURIComponent(tag)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: dataUrl, fileName: file.name }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to upload website image');
  }
  return body.data as CatalogItem;
}

/** Replace / reorder / clear website gallery. */
export async function setWebsiteImages(tag: string, websiteImages: string[]) {
  const res = await fetch(`/api/upload/jewellery/website-images/${encodeURIComponent(tag)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website_images: websiteImages }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to update website gallery');
  }
  return body.data as CatalogItem;
}

/** Save website-only description (CMS; does not write ERP). */
export async function saveItemDescription(tag: string, description: string) {
  const res = await fetch(`/api/upload/jewellery/item-meta/${encodeURIComponent(tag)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to save description');
  }
  return body.data as { description?: string };
}

/* ── Instant Search Suggestions ─────────────────────────────── */

export type SearchSuggestionProduct = {
  tag_number: string;
  name: string;
  image_url?: string | null;
  display_price?: number | null;
  group_slug?: string | null;
};

export type SearchSuggestionCategory = {
  name: string;
  slug: string;
  type: string; // 'group' | 'article'
};

export type SearchSuggestions = {
  products: SearchSuggestionProduct[];
  categories: SearchSuggestionCategory[];
};

function getLocalSuggestions(query: string): SearchSuggestions {
  const q = query.trim().toLowerCase();
  
  if (q.length < 2) {
    const categories: SearchSuggestionCategory[] = Object.keys(GROUP_IMAGE_BY_SLUG).slice(0, 4).map(slug => ({
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      slug,
      type: 'group',
    }));
    const products: SearchSuggestionProduct[] = PRODUCTS.slice(0, 3).map(p => {
      const item = mapLocalProduct(p);
      return {
        tag_number: item.tag_number,
        name: item.name,
        image_url: item.image_url,
        display_price: item.display_price,
        group_slug: item.group_slug,
      };
    });
    return { products, categories };
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const stems = tokens.map(normalizeStem);
  const aliases = tokens.flatMap(
    (t) => SEARCH_ALIASES[t] || SEARCH_ALIASES[normalizeStem(t)] || [],
  );

  // Category matches from GROUP_IMAGE_BY_SLUG keys
  const groupSlugs = Object.keys(GROUP_IMAGE_BY_SLUG);
  const categories: SearchSuggestionCategory[] = [];
  for (const slug of groupSlugs) {
    if (categories.length >= 4) break;
    const slugStem = normalizeStem(slug);
    if (
      slug.includes(q) ||
      stems.some((s) => slugStem.includes(s)) ||
      aliases.some((a) => slug === a || slugStem === normalizeStem(a))
    ) {
      categories.push({
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        slug,
        type: 'group',
      });
    }
  }

  // Product matches from local PRODUCTS
  const matched = PRODUCTS.filter((p) => {
    const pName = p.name.toLowerCase();
    const pCat = (p.category || '').toLowerCase();
    return (
      pName.includes(q) ||
      pCat.includes(q) ||
      tokens.some((t) => pName.includes(t) || pCat.includes(t)) ||
      aliases.some((a) => pName.includes(a) || pCat.includes(a))
    );
  }).slice(0, 5);

  const products: SearchSuggestionProduct[] = matched.map((p) => {
    const item = mapLocalProduct(p);
    return {
      tag_number: item.tag_number,
      name: item.name,
      image_url: item.image_url,
      display_price: item.display_price,
      group_slug: item.group_slug,
    };
  });

  return { products, categories };
}

export async function fetchSearchSuggestions(query: string): Promise<SearchSuggestions> {
  const q = query.trim();

  try {
    const res = await fetch(
      `/api/catalog/suggestions?q=${encodeURIComponent(q)}`,
      { cache: 'no-store' },
    );
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body && (Array.isArray(body.products) || Array.isArray(body.categories))) {
        return {
          products: body.products || [],
          categories: body.categories || [],
        };
      }
    }
  } catch {
    /* fallback */
  }
  return getLocalSuggestions(q);
}

