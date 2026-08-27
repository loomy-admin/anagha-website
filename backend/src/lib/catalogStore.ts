import { eq } from 'drizzle-orm';
import { isForeignImageUrl, isManagedAssetUrl } from './objectStorage.js';
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

function asNumber(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asString(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

export function websitePhotoUrls(data: { website_images?: unknown }): string[] {
  if (!Array.isArray(data.website_images)) return [];
  return data.website_images
    .filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
    .map((url) => url.trim());
}

export function managedWebsitePhotoUrls(data: { website_images?: unknown }): string[] {
  return websitePhotoUrls(data).filter((url) => isManagedAssetUrl(url));
}

export function managedInventoryPhotoUrls(data: { images?: unknown; pos_image_url?: unknown }): string[] {
  return inventoryPhotoUrls(data).filter((url) => isManagedAssetUrl(url));
}

export function scrubForeignImages(data: Record<string, unknown>): Record<string, unknown> {
  return stripForeignImageValues(data) as Record<string, unknown>;
}

function stripForeignImageValues(value: unknown): unknown {
  if (typeof value === 'string') {
    return isForeignImageUrl(value) ? null : value;
  }
  if (Array.isArray(value)) {
    return value
      .map(stripForeignImageValues)
      .filter((entry) => entry != null && entry !== '');
  }
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      next[key] = stripForeignImageValues(child);
    }
    return next;
  }
  return value;
}

/** Inventory photos we host (copied off ERP at import, plus POS URL). */
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

export function primaryCatalogImageUrl(data: CatalogItemData): string | null {
  return (
    managedWebsitePhotoUrls(data)[0] ||
    managedInventoryPhotoUrls(data)[0] ||
    (typeof data.image_url === 'string' && isManagedAssetUrl(data.image_url) ? data.image_url : null)
  );
}

export function toPublicItem(
  row: typeof cachedCatalogItems.$inferSelect,
  extra: Partial<CatalogItemData> = {},
): CatalogItemData {
  const data =
    row.data && typeof row.data === 'object' ? (row.data as CatalogItemData) : {};
  const scrubbed = scrubForeignImages(data) as CatalogItemData;
  const gallery = managedWebsitePhotoUrls(scrubbed);
  const photos = managedInventoryPhotoUrls(scrubbed);
  const pos = photos[0] || null;
  const image_url = gallery[0] || pos || null;
  return {
    ...scrubbed,
    ...extra,
    id: row.id || scrubbed.id || row.tagNumber,
    tag_number: row.tagNumber,
    images: photos,
    pos_image_url: pos,
    image_url,
    website_images: gallery,
    origin: row.origin,
    status: row.status,
    sold_at: row.soldAt ? row.soldAt.toISOString() : null,
    group_slug: row.groupSlug || scrubbed.group_slug || null,
    type_slug: row.typeSlug || scrubbed.type_slug || null,
    article_slug: row.articleSlug || scrubbed.article_slug || null,
  };
}

export function buildItemData(
  input: Record<string, unknown>,
  existing: CatalogItemData = {},
): CatalogItemData {
  const tag = asString(input.tag_number ?? existing.tag_number).toUpperCase();
  const group = asString(input.group ?? existing.group);
  const type = asString(input.type ?? existing.type);
  const article = asString(input.article ?? existing.article);
  const name = asString(input.name ?? existing.name) || tag;
  const display_price = asNumber(input.display_price ?? existing.display_price);
  const mrp = asNumber(input.mrp ?? existing.mrp) ?? display_price;
  const website_images = (
    Array.isArray(input.website_images)
      ? (input.website_images as unknown[]).map((u) => String(u || '').trim()).filter(Boolean)
      : Array.isArray(existing.website_images)
        ? existing.website_images.filter((u) => typeof u === 'string' && u.trim())
        : []
  ).filter((url) => isManagedAssetUrl(url));
  const rawPos =
    input.pos_image_url === undefined ? existing.pos_image_url || null : asString(input.pos_image_url) || null;
  const pos_image_url = rawPos && isManagedAssetUrl(rawPos) ? rawPos : null;
  const image_url = website_images[0] || pos_image_url || null;
  const group_slug = slugifyName(group) || asString(existing.group_slug) || null;
  const type_slug = slugifyName(type) || asString(existing.type_slug) || null;
  const article_slug = slugifyName(article) || asString(existing.article_slug) || null;

  return {
    ...existing,
    id: asString(existing.id) || tag,
    tag_number: tag,
    name,
    description:
      input.description === undefined
        ? existing.description || ''
        : String(input.description ?? ''),
    image_url,
    pos_image_url,
    website_images,
    gross_weight: asNumber(input.gross_weight ?? existing.gross_weight),
    net_weight: asNumber(input.net_weight ?? existing.net_weight),
    total_weight: asNumber(input.total_weight ?? existing.total_weight),
    stone_weight: asNumber(input.stone_weight ?? existing.stone_weight),
    stone_charges: asNumber(input.stone_charges ?? existing.stone_charges),
    mrp,
    display_price,
    metal_type: asString(input.metal_type ?? existing.metal_type) || null,
    purity: asString(input.purity ?? existing.purity) || null,
    type: type || null,
    type_slug,
    group: group || null,
    group_slug,
    article: article || null,
    article_slug,
    created_at: existing.created_at || new Date().toISOString(),
  };
}

export function rowFromItem(
  data: CatalogItemData,
  extras: { origin: CatalogOrigin; status: CatalogStatus; soldAt?: Date | null },
) {
  const tag = String(data.tag_number || '').trim().toUpperCase();
  const gallery = Array.isArray(data.website_images) ? data.website_images : [];
  return {
    tagNumber: tag,
    id: String(data.id || tag),
    groupSlug: data.group_slug || null,
    typeSlug: data.type_slug || null,
    articleSlug: data.article_slug || null,
    metalType: data.metal_type || null,
    purity: data.purity || null,
    displayPrice: data.display_price != null ? Number(data.display_price) : null,
    hasImage: !!(
      (data.image_url && isManagedAssetUrl(String(data.image_url))) ||
      (data.pos_image_url && isManagedAssetUrl(String(data.pos_image_url))) ||
      gallery.some((url) => isManagedAssetUrl(url)) ||
      managedInventoryPhotoUrls(data).length
    ),
    erpCreatedAt: data.created_at ? new Date(String(data.created_at)) : new Date(),
    data: scrubForeignImages(data as Record<string, unknown>),
    origin: extras.origin,
    status: extras.status,
    soldAt: extras.soldAt ?? null,
    syncedAt: new Date(),
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

export async function saveCatalogRow(
  data: CatalogItemData,
  extras: { origin: CatalogOrigin; status: CatalogStatus; soldAt?: Date | null },
) {
  const values = rowFromItem(data, extras);
  const [row] = await db
    .insert(cachedCatalogItems)
    .values(values)
    .onConflictDoUpdate({
      target: cachedCatalogItems.tagNumber,
      set: {
        id: values.id,
        groupSlug: values.groupSlug,
        typeSlug: values.typeSlug,
        articleSlug: values.articleSlug,
        metalType: values.metalType,
        purity: values.purity,
        displayPrice: values.displayPrice,
        hasImage: values.hasImage,
        erpCreatedAt: values.erpCreatedAt,
        data: values.data,
        origin: values.origin,
        status: values.status,
        soldAt: values.soldAt,
        syncedAt: values.syncedAt,
      },
    })
    .returning();
  return row;
}
