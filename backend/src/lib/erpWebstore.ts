import { getErpConfig } from './erpCatalog.js';

function webstoreSecret() {
  const secret = String(process.env.WEBSTORE_SECRET || '').trim();
  if (!secret) {
    throw Object.assign(new Error('WEBSTORE_SECRET is not configured'), { status: 503 });
  }
  return secret;
}

async function erpWebstore(
  path: string,
  body: Record<string, unknown>,
  method: 'POST' | 'PUT' = 'POST',
) {
  const { base, storeSlug, branchId } = getErpConfig();
  const url = `${base}/webstore/${encodeURIComponent(storeSlug)}${path}`;
  const payload = {
    ...body,
    ...(branchId && !body.branch_id ? { branch_id: branchId } : {}),
  };

  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-webstore-secret': webstoreSecret(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `ERP webstore failed (${res.status})`), {
      status: res.status,
    });
  }
  return data.data;
}

export function reserveOnErp(input: {
  checkoutSessionId: string;
  tags: string[];
  ttlMinutes?: number;
}) {
  return erpWebstore('/reserve', {
    checkout_session_id: input.checkoutSessionId,
    tags: input.tags,
    ttl_minutes: input.ttlMinutes,
  });
}

export function releaseOnErp(checkoutSessionId: string) {
  return erpWebstore('/release', { checkout_session_id: checkoutSessionId });
}

export function completeOnErp(input: {
  checkoutSessionId: string;
  paymentRef: string;
  paidAmount: number;
  customer: { name: string; mobile: string; email?: string };
}) {
  return erpWebstore('/complete', {
    checkout_session_id: input.checkoutSessionId,
    payment_ref: input.paymentRef,
    paid_amount: input.paidAmount,
    customer: input.customer,
  });
}

export function uploadWebsiteImageOnErp(input: {
  tagNumber: string;
  file: string;
  fileName?: string;
}) {
  const tag = encodeURIComponent(String(input.tagNumber || '').trim());
  return erpWebstore(`/items/${tag}/website-images/upload`, {
    file: input.file,
    fileName: input.fileName,
  });
}

export function setWebsiteImagesOnErp(input: {
  tagNumber: string;
  websiteImages: string[];
}) {
  const tag = encodeURIComponent(String(input.tagNumber || '').trim());
  return erpWebstore(
    `/items/${tag}/website-images`,
    { website_images: input.websiteImages },
    'PUT',
  );
}
