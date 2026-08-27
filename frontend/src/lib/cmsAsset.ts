/** Resolve CMS-stored image values: bare filename, /uploads path, or GCS URL. */
export function cmsSrc(value?: string | null): string {
  const v = String(value || '').trim();
  if (!v) return '';
  if (
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('//') ||
    v.startsWith('/') ||
    v.startsWith('data:') ||
    v.startsWith('blob:')
  ) {
    return v;
  }
  return `/uploads/${v}`;
}
