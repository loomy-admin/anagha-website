import fs from 'node:fs';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';
import { publicUploadPath, UPLOADS_DIR } from './upload.js';

function trimSlash(url: string) {
  return url.replace(/\/+$/, '');
}

export function gcsBucketName() {
  return String(process.env.GCS_BUCKET || '').trim();
}

export function gcsConfigured() {
  return Boolean(gcsBucketName());
}

export function publicAssetBase() {
  const explicit = String(process.env.GCS_PUBLIC_BASE_URL || '').trim();
  if (explicit) return trimSlash(explicit);
  const bucket = gcsBucketName();
  if (bucket) return `https://storage.googleapis.com/${bucket}`;
  return '';
}

function gcsClient() {
  const json = String(process.env.GCS_SERVICE_ACCOUNT_JSON || '').trim();
  if (json) {
    const credentials = JSON.parse(json) as { project_id?: string };
    return new Storage({
      credentials,
      projectId: String(process.env.GCS_PROJECT_ID || credentials.project_id || '').trim() || undefined,
    });
  }
  const email = String(process.env.GCS_CLIENT_EMAIL || '').trim();
  const key = String(process.env.GCS_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  if (email && key) {
    return new Storage({
      projectId: String(process.env.GCS_PROJECT_ID || '').trim() || undefined,
      credentials: { client_email: email, private_key: key },
    });
  }
  return new Storage({
    projectId: String(process.env.GCS_PROJECT_ID || '').trim() || undefined,
  });
}

/** Store a public CMS file (banners, tiles). Production uses GCS; local/dev can use /uploads. */
export async function putPublicObject(relPath: string, buffer: Buffer, contentType = 'image/jpeg') {
  const rel = relPath.replace(/^\/+/, '').replace(/\\/g, '/');
  if (gcsConfigured()) {
    const bucketName = gcsBucketName();
    const file = gcsClient().bucket(bucketName).file(rel);
    await file.save(buffer, {
      resumable: false,
      contentType,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    });
    if (process.env.GCS_MAKE_PUBLIC === 'true') {
      await file.makePublic().catch(() => undefined);
    }
    return `${publicAssetBase()}/${rel}`;
  }

  const full = path.join(UPLOADS_DIR, ...rel.split('/'));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buffer);
  return publicUploadPath(rel);
}

export async function storeCmsUpload(file: Express.Multer.File, objectName: string) {
  const origExt = path.extname(file.originalname || '') || path.extname(objectName) || '.bin';
  const ext = origExt.startsWith('.') ? origExt : `.${origExt}`;
  const filename = `${objectName.replace(/\.[^/.]+$/, '')}${ext}`.replace(/^\/+/, '');
  const buffer = file.buffer;
  if (!buffer?.length) {
    throw new Error('Empty upload');
  }
  const url = await putPublicObject(filename, buffer, file.mimetype || 'application/octet-stream');
  return { filename, url };
}
