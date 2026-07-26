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

export async function fetchCatalog(params: Record<string, string | number | undefined> = {}) {
  const res = await fetch(`/api/catalog${toQuery(params)}`, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to load catalog');
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
  const res = await fetch(`/api/catalog/filters${toQuery(params)}`, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to load filters');
  }
  return body.data as { store: unknown; filters: CatalogFilters };
}

export async function fetchCatalogItem(tag: string) {
  const res = await fetch(`/api/catalog/items/${encodeURIComponent(tag)}`, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Item not found');
  }
  return body.data as CatalogItem;
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
