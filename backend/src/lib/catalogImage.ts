import sharp from 'sharp';
import { putPublicObject } from './objectStorage.js';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 88;

export const MAX_PRODUCT_IMAGES = 10;

function decodeDataUrl(dataUrl: string) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw Object.assign(new Error('Expected a data URL image'), { status: 400 });
  }
  if (!match[1].startsWith('image/')) {
    throw Object.assign(new Error('File must be an image'), { status: 415 });
  }
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

export async function compressCatalogImage(buffer: Buffer) {
  const meta = await sharp(buffer).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (meta.format === 'jpeg' && w <= MAX_EDGE && h <= MAX_EDGE) {
    return buffer;
  }
  return sharp(buffer)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

export async function storeCatalogImage(tag: string, dataUrl: string, fileName?: string) {
  const { buffer } = decodeDataUrl(dataUrl);
  const jpeg = await compressCatalogImage(buffer);
  const safeTag = tag.replace(/[^A-Z0-9_-]/gi, '_');
  const base =
    String(fileName || 'photo')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40) || 'photo';
  const rel = `catalog/${safeTag}/${Date.now()}_${base}.jpg`;
  const url = await putPublicObject(rel, jpeg, 'image/jpeg');
  return { url, name: `${base}.jpg`, path: rel };
}
