import crypto from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { cachedCatalogItems } from '../db/schema.js';
import { compressCatalogImage } from './catalogImage.js';
import {
  isForeignAssetUrl,
  isForeignImageUrl,
  isManagedAssetUrl,
  putPublicObject,
  publicAssetBase,
  gcsConfigured,
} from './objectStorage.js';
import { publicUploadPath } from './upload.js';
import {
  inventoryPhotoUrls,
  scrubForeignImages,
  websitePhotoUrls,
} from './catalogStore.js';

const MAX_BYTES = 12 * 1024 * 1024;

function safeTag(tag: string) {
  return tag.replace(/[^A-Z0-9_-]/gi, '_');
}

function sourceHash(url: string) {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0, 20);
}

export function inventorySourceUrls(item: Record<string, unknown>) {
  return inventoryPhotoUrls(item);
}

function expectedUrl(rel: string) {
  if (gcsConfigured()) return `${publicAssetBase()}/${rel}`;
  return publicUploadPath(rel);
}

async function downloadRemote(url: string) {
  const res = await fetch(url, {
    headers: { Accept: 'image/*,*/*' },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`Image download failed (${res.status})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    throw new Error('Image too large');
  }
  return buf;
}

export function hasForeignAssetUrls(data: Record<string, unknown>) {
  const urls = [
    ...inventoryPhotoUrls(data),
    ...websitePhotoUrls(data),
    typeof data.image_url === 'string' ? data.image_url : '',
  ];
  return urls.some((url) => isForeignImageUrl(url) || isForeignAssetUrl(url));
}

export async function copyRemoteImageToStorage(tag: string, sourceUrl: string, existingUrls: string[] = []) {
  const src = String(sourceUrl || '').trim();
  if (!src) return null;
  if (isManagedAssetUrl(src)) return src;

  const rel = `catalog/${safeTag(tag)}/inv_${sourceHash(src)}.jpg`;
  const already = expectedUrl(rel);
  if (existingUrls.includes(already)) return already;

  try {
    const raw = await downloadRemote(src);
    const jpeg = await compressCatalogImage(raw);
    const stored = await putPublicObject(rel, jpeg, 'image/jpeg');
    return isManagedAssetUrl(stored) ? stored : null;
  } catch (err) {
    console.warn('[catalog-images] copy failed', tag, src, err instanceof Error ? err.message : err);
    return null;
  }
}

async function copyList(tag: string, sources: string[], keep: string[]) {
  const out = [...keep];
  for (const src of sources) {
    const url = await copyRemoteImageToStorage(tag, src, out);
    if (url && isManagedAssetUrl(url) && !out.includes(url)) out.push(url);
  }
  return out;
}

/** Copy remote/ERP photos into our storage and drop any URL we do not host. */
export async function relocateItemMedia(
  tag: string,
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | null,
) {
  const existingData = existing || {};
  const incomingSources = inventorySourceUrls(incoming);
  const copied = incomingSources.length
    ? await copyList(tag, incomingSources, [])
    : await copyList(
        tag,
        inventoryPhotoUrls(existingData).filter((url) => isForeignAssetUrl(url)),
        inventoryPhotoUrls(existingData).filter((url) => isManagedAssetUrl(url)),
      );

  const website = await copyList(tag, websitePhotoUrls(existingData), []);

  const pos = copied[0] || null;
  return scrubForeignImages({
    ...incoming,
    images: copied,
    pos_image_url: pos,
    image_url: website[0] || pos,
    website_images: website.filter((url) => isManagedAssetUrl(url)),
  });
}

export async function relocateAllCatalogImages() {
  const foreignWhere = sql`(
    coalesce(${cachedCatalogItems.data}->>'pos_image_url', '') ~ '^https?://'
    or coalesce(${cachedCatalogItems.data}->>'image_url', '') ~ '^https?://'
    or coalesce(${cachedCatalogItems.data}::text, '') ~* 'supabase\\.co|octis\\.|inventory-images|gold-develop'
  )`;

  let updated = 0;
  let scanned = 0;
  for (;;) {
    const rows = await db
      .select({
        tagNumber: cachedCatalogItems.tagNumber,
        data: cachedCatalogItems.data,
      })
      .from(cachedCatalogItems)
      .where(foreignWhere)
      .limit(25);
    if (!rows.length) break;

    for (const row of rows) {
      scanned += 1;
      const data =
        row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
      let next: Record<string, unknown>;
      try {
        next = await relocateItemMedia(row.tagNumber, data, data);
      } catch (err) {
        console.warn(
          '[catalog-images] relocate failed',
          row.tagNumber,
          err instanceof Error ? err.message : err,
        );
        next = scrubForeignImages(data);
      }
      await db
        .update(cachedCatalogItems)
        .set({
          data: next,
          hasImage: Boolean(
            (typeof next.image_url === 'string' && isManagedAssetUrl(next.image_url)) ||
              (Array.isArray(next.images) && next.images.length) ||
              (Array.isArray(next.website_images) && next.website_images.length),
          ),
          syncedAt: new Date(),
        })
        .where(eq(cachedCatalogItems.tagNumber, row.tagNumber));
      updated += 1;
      if (updated % 10 === 0) {
        console.log(`[catalog-images] relocated ${updated} (batch scanned ${scanned})`);
      }
    }
  }
  return { scanned, updated };
}
