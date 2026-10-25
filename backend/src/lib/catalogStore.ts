import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';

export type CatalogStatus = 'available' | 'reserved' | 'sold' | 'hidden';
export type CatalogOrigin = 'erp' | 'website';

export type CatalogItemData = Record<string, unknown> & {
  id?: string | null;
  tag_number?: string;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  pos_image_url?: string | null;
  website_images?: string[] | null;
  images?: Array<string | { url?: string | null }> | null;
  gross_weight?: number | null;
  net_weight?: number | null;
  total_weight?: number | null;
  stone_weight?: number | null;
  stone_charges?: number | null;
  mrp?: number | null;
  display_price?: number | null;
  metal_type?: string | null;
  purity?: string | null;
  type?: string | null;
  type_slug?: string | null;
  group?: string | null;
  group_slug?: string | null;
  article?: string | null;
  article_slug?: string | null;
  origin?: string | null;
  status?: string | null;
  sold_at?: string | null;
  created_at?: string | null;
};

export function slugifyName(name: string) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Website gallery (uploaded from our admin, stored in ERP). */
export function websitePhotoUrls(data: { website_images?: unknown }): string[] {
  if (!Array.isArray(data.website_images)) return [];
  return data.website_images
    .filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
    .map((url) => url.trim());
}

/** ERP inventory photos: `images` (POS camera/gallery) plus `pos_image_url`. */
export function inventoryPhotoUrls(data: { images?: unknown; pos_image_url?: unknown }): string[] {
  const urls: string[] = [];
  const add = (value: unknown) => {
    const url = typeof value === 'string' ? value.trim() : '';
    if (url && !urls.includes(url)) urls.push(url);
  };
  if (Array.isArray(data.images)) {
    for (const img of data.images) {
      if (typeof img === 'string') add(img);
      else if (img && typeof img === 'object' && 'url' in img) add((img as { url?: string }).url);
    }
  }
  add(data.pos_image_url);
  return urls;
}

export function toPublicItem(
  row: typeof cachedCatalogItems.$inferSelect,
  extra: Partial<CatalogItemData> = {},
): CatalogItemData {
  const data =
    row.data && typeof row.data === 'object' ? (row.data as CatalogItemData) : {};
  const gallery = websitePhotoUrls(data);
  const photos = inventoryPhotoUrls(data);
  const pos = photos[0] || null;
  const image_url =
    gallery[0] || pos || (typeof data.image_url === 'string' && data.image_url.trim()) || null;
  return {
    ...data,
    ...extra,
    id: row.id || data.id || row.tagNumber,
    tag_number: row.tagNumber,
    images: photos,
    pos_image_url: pos,
    image_url,
    website_images: gallery,
    origin: row.origin,
    status: row.status,
    sold_at: row.soldAt ? row.soldAt.toISOString() : null,
    group_slug: row.groupSlug || data.group_slug || null,
    type_slug: row.typeSlug || data.type_slug || null,
    article_slug: row.articleSlug || data.article_slug || null,
  };
}

export async function getCatalogRow(tag: string) {
  const key = tag.trim().toUpperCase();
  if (!key) return null;
  const rows = await db
    .select()
    .from(cachedCatalogItems)
    .where(eq(cachedCatalogItems.tagNumber, key))
    .limit(1);
  return rows[0] || null;
}

/** Merge fields into the website copy without changing its origin or stock status. */
export async function patchCatalogRowData(tag: string, patch: Partial<CatalogItemData>) {
  const existing = await getCatalogRow(tag);
  if (!existing) return null;
  const data =
    existing.data && typeof existing.data === 'object' ? (existing.data as CatalogItemData) : {};
  const next = { ...data, ...patch };
  const [row] = await db
    .update(cachedCatalogItems)
    .set({
      data: next,
      hasImage: Boolean(
        websitePhotoUrls(next).length || inventoryPhotoUrls(next).length || next.image_url,
      ),
      syncedAt: new Date(),
    })
    .where(eq(cachedCatalogItems.tagNumber, existing.tagNumber))
    .returning();
  return row || null;
}
