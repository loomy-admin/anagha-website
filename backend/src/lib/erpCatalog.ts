/**
 * ERP public catalog client: the scheduled sync (syncCatalog) and the live
 * per-piece availability check (liveAvailability).
 */

function trimSlash(url: string) {
  return url.replace(/\/+$/, '');
}

export function getErpConfig() {
  const apiUrl = trimSlash(process.env.ERP_API_URL || '');
  const storeSlug = String(process.env.ERP_STORE_SLUG || '').trim().toLowerCase();
  const branchId = String(process.env.ERP_BRANCH_ID || '').trim();

  if (!apiUrl) {
    throw Object.assign(new Error('ERP_API_URL is not configured'), { status: 503 });
  }
  if (!storeSlug) {
    throw Object.assign(new Error('ERP_STORE_SLUG is not configured'), { status: 503 });
  }

  // Accept either https://host or https://host/api
  const base = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
  return { base, storeSlug, branchId };
}

export async function fetchErpPublic(
  path: string,
  query: Record<string, string | undefined> = {},
) {
  const { base, storeSlug, branchId } = getErpConfig();
  const url = new URL(`${base}/public/store/${encodeURIComponent(storeSlug)}${path}`);

  if (branchId && !query.branch_id) {
    url.searchParams.set('branch_id', branchId);
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body && body.error) || `ERP request failed (${res.status})`;
    throw Object.assign(new Error(message), { status: res.status });
  }
  return body;
}

export type ErpItemStatus = 'available' | 'reserved' | 'sold' | 'missing' | 'unknown';

/**
 * Current stock status of one tag from ERP's public item lookup.
 * `unknown` means ERP could not be reached or answered for another store; callers must not act on it.
 */
export async function fetchErpItemStatus(tag: string, timeoutMs = 5000): Promise<ErpItemStatus> {
  const { base, storeSlug } = getErpConfig();
  try {
    const res = await fetch(`${base}/public/item/${encodeURIComponent(tag)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 404) return 'missing';
    if (!res.ok) return 'unknown';
    const body = (await res.json().catch(() => ({}))) as {
      data?: { status?: unknown; store?: { slug?: unknown } | unknown; store_slug?: unknown };
    };
    const data = body.data || {};
    const store = data.store && typeof data.store === 'object' ? (data.store as { slug?: unknown }) : null;
    const itemStore = String(store?.slug || data.store_slug || '').trim().toLowerCase();
    if (itemStore && itemStore !== storeSlug) return 'unknown';
    const status = String(data.status || '').trim().toLowerCase();
    if (status === 'available' || status === 'reserved' || status === 'sold') return status;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
