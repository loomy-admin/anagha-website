import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error('[uploads] could not create directory', UPLOADS_DIR, err);
  }
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export function safeUnlink(stored: string | null | undefined) {
  if (!stored) return;
  const value = stored.trim();
  if (!value) return;
  if (/^https?:\/\//i.test(value) || value.startsWith('//')) return;
  const name = value.replace(/^\/uploads\//, '');
  const full = path.join(UPLOADS_DIR, name);
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    /* ignore */
  }
}

export function publicUploadPath(filename: string) {
  return `/uploads/${filename.replace(/^\/+/, '')}`;
}
