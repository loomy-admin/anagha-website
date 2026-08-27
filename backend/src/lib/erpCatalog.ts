/**
 * ERP public catalog client — used only by Re-import ERP (syncCatalog).
 * After import, listing/search/filters/PDP/checkout/images use Neon + our storage only.
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
