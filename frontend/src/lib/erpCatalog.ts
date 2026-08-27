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
  total_weight?: number | string | null;
  stone_weight?: number | string | null;
  stone_charges?: number | null;
  mrp?: number | null;
  display_price?: number | null;
  metal_type?: string | null;
  purity?: string | null;
  status?: string | null;
  sold_at?: string | null;
  origin?: string | null;
  images?: Array<string | { url?: string | null }> | null;
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

function photoUrl(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object' && 'url' in value) {
    const url = (value as { url?: string }).url;
    return typeof url === 'string' && url.trim() ? url.trim() : null;
  }
  return null;
}

export function isOwnedImageUrl(url: string) {
  const value = String(url || '').trim();
  if (!value) return false;
  if (value.startsWith('/uploads/') || value.startsWith('/images/')) return true;
  if (value.startsWith('data:') || value.startsWith('blob:')) return true;
  try {
    const parsed = new URL(value, 'https://anaghajewellers.com');
    if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/images/')) return true;
    if (parsed.hostname === 'storage.googleapis.com') return true;
  } catch {
    return false;
  }
  return false;
}

export function itemGalleryUrls(item: Partial<CatalogItem>): string[] {
  const urls: string[] = [];
  const add = (value: unknown) => {
    const url = photoUrl(value);
    if (url && isOwnedImageUrl(url) && !urls.includes(url)) urls.push(url);
  };
  if (Array.isArray(item.website_images)) item.website_images.forEach(add);
  if (Array.isArray(item.images)) item.images.forEach(add);
  add(item.pos_image_url);
  add(item.image_url);
  return urls;
}

export function getPrimaryImage(item: Partial<CatalogItem>): string | null {
  return itemGalleryUrls(item)[0] || null;
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

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/** Admin / storefront overrides for ERP group tile images. */
export async function fetchGroupImages() {
  const res = await fetch(`${getBaseUrl()}/api/site/group-images`, { cache: 'no-store' });
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

export async function fetchCatalog(params: Record<string, string | number | undefined> = {}) {
  const res = await fetch(`${getBaseUrl()}/api/catalog${toQuery(params)}`, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to load catalog');
  }
  if (!Array.isArray(body?.data?.items)) {
    throw new Error('Invalid catalog response');
  }
  return body.data as {
    store: unknown;
    items: CatalogItem[];
    total: number;
    limit: number;
    offset: number;
  };
}

export async function fetchCatalogFilters(params: Record<string, string | undefined> = {}) {
  const res = await fetch(`${getBaseUrl()}/api/catalog/filters${toQuery(params)}`, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to load filters');
  }
  if (!body?.data?.filters) {
    throw new Error('Invalid filters response');
  }
  return body.data as { store: unknown; filters: CatalogFilters };
}

export async function fetchCatalogItem(tag: string, opts?: { adminBypass?: boolean }) {
  const qs = opts?.adminBypass ? '?admin_bypass=true' : '';
  const res = await fetch(`${getBaseUrl()}/api/catalog/items/${encodeURIComponent(tag)}${qs}`, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Item not found');
  }
  if (!body?.data) {
    throw new Error('Item not found');
  }
  return body.data as CatalogItem;
}

export async function uploadWebsiteImage(
  tag: string,
  input: File | { dataUrl: string; fileName: string },
) {
  const files =
    input instanceof File
      ? [await compressAndPack(input)]
      : [{ file: input.dataUrl, fileName: input.fileName }];
  const res = await fetch(`/api/upload/jewellery/website-images/${encodeURIComponent(tag)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ files }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to upload website image');
  }
  return body.data as CatalogItem;
}

async function compressAndPack(file: File) {
  const { compressImageFile } = await import('./imageCapture');
  const packed = await compressImageFile(file);
  return { file: packed.dataUrl, fileName: packed.fileName };
}

/** Replace / reorder / clear website gallery. */
export async function setWebsiteImages(tag: string, websiteImages: string[]) {
  const res = await fetch(`/api/upload/jewellery/website-images/${encodeURIComponent(tag)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ website_images: websiteImages }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to update website gallery');
  }
  return body.data as CatalogItem;
}

/** Save website-only description (also writes catalog JSON). */
export async function saveItemDescription(tag: string, description: string) {
  const res = await fetch(`/api/upload/jewellery/item-meta/${encodeURIComponent(tag)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ description }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to save description');
  }
  return body.data as { description?: string };
}

export async function importCatalogSpreadsheet(
  file: File,
  opts: { defaultCategory?: string; forceCategory?: boolean } = {},
) {
  const form = new FormData();
  form.append('file', file);
  if (opts.defaultCategory) form.append('defaultCategory', opts.defaultCategory);
  if (opts.forceCategory) form.append('forceCategory', 'true');
  const res = await fetch('/api/upload/catalog/items/import', {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Spreadsheet import failed');
  return body.data as { created: number; skipped: number; errors: string[]; message: string };
}

export async function downloadCatalogTemplate(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  const res = await fetch(`/api/upload/catalog/items/template.xlsx${qs}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to download template');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = category
    ? `anagha-catalog-template-${category.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 40)}.xlsx`
    : 'anagha-catalog-template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export async function createCatalogItem(payload: Record<string, unknown>) {
  const res = await fetch('/api/upload/catalog/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to create item');
  }
  return body.data as CatalogItem;
}

export async function updateCatalogItem(tag: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/upload/catalog/items/${encodeURIComponent(tag)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to update item');
  }
  return body.data as CatalogItem;
}

export async function restockCatalogItem(tag: string) {
  const res = await fetch(`/api/upload/catalog/items/${encodeURIComponent(tag)}/restock`, {
    method: 'POST',
    credentials: 'include',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to add item back to stock');
  }
  return body.data as CatalogItem;
}

export async function setCatalogItemStatus(tag: string, status: 'available' | 'hidden') {
  const res = await fetch(`/api/upload/catalog/items/${encodeURIComponent(tag)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to update status');
  }
  return body.data as CatalogItem;
}

export async function deleteCatalogGroup(fromSlug: string) {
  const res = await fetch('/api/upload/catalog/taxonomy/groups', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ from_slug: fromSlug }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to delete category');
  return body.data as { slug: string; deleted: boolean; deleted_items: number };
}

export async function createCatalogGroup(name: string) {
  const res = await fetch('/api/upload/catalog/taxonomy/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to create category');
  return body.data as { name: string; slug: string };
}

export async function createCatalogTaxonomyValue(
  kind: 'type' | 'article' | 'metal' | 'purity',
  name: string,
) {
  const res = await fetch('/api/upload/catalog/taxonomy/values', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ kind, name }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to save option');
  return body.data as { kind: string; name: string; slug: string };
}

export async function renameCatalogTaxonomy(
  kind: 'group' | 'type' | 'article' | 'metal' | 'purity',
  fromSlug: string,
  name: string,
) {
  const res = await fetch('/api/upload/catalog/taxonomy', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ kind, from_slug: fromSlug, name }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to rename');
  return body.data as { kind: string; from_slug: string; name: string; slug: string };
}

export async function deleteCatalogTaxonomyValue(
  kind: 'type' | 'article' | 'metal' | 'purity',
  fromSlug: string,
) {
  const res = await fetch('/api/upload/catalog/taxonomy/values', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ kind, from_slug: fromSlug }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to delete');
  return body.data as { kind: string; from_slug: string; deleted: boolean };
}

export async function moveCatalogItems(tags: string[], group: string) {
  const res = await fetch('/api/upload/catalog/taxonomy/move', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ tags, group }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Failed to move items');
  return body.data as { count: number; group: string; slug: string };
}

export async function bulkSetCatalogItemStatus(tags: string[], status: 'available' | 'hidden') {
  const res = await fetch('/api/upload/catalog/items/bulk-status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ tags, status }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to update status');
  }
  return body.data as { ok: boolean; status: string; count: number };
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

export async function fetchSearchSuggestions(query: string): Promise<SearchSuggestions> {
  const q = query.trim();
  const res = await fetch(
    `${getBaseUrl()}/api/catalog/suggestions?q=${encodeURIComponent(q)}`,
    { cache: 'no-store' },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to load suggestions');
  }
  return {
    products: Array.isArray(body.products) ? body.products : [],
    categories: Array.isArray(body.categories) ? body.categories : [],
  };
}

