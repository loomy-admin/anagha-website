export type ShippingMethod = {
  id: string;
  name: string;
  charge: number;
  eta: string;
  enabled: boolean;
};

export async function fetchShippingMethods(): Promise<ShippingMethod[]> {
  const res = await fetch('/api/site/shipping', { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not load shipping methods');
  const list = Array.isArray(body.methods) ? body.methods : [];
  return list.filter((m: ShippingMethod) => m?.id && m.enabled !== false);
}

export async function fetchAllShippingMethods(): Promise<ShippingMethod[]> {
  const res = await fetch('/api/upload/shipping', {
    credentials: 'include',
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not load shipping methods');
  if (Array.isArray(body.all)) return body.all;
  if (Array.isArray(body.methods)) return body.methods;
  return [];
}

export async function saveShippingMethods(methods: ShippingMethod[]) {
  const res = await fetch('/api/upload/shipping', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ methods }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not save shipping methods');
  return (body.methods || methods) as ShippingMethod[];
}

export async function fetchAdminOrders() {
  const res = await fetch('/api/checkout/admin/orders', {
    credentials: 'include',
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not load orders');
  return body.data || [];
}

export async function updateAdminOrder(
  id: string,
  input: {
    status: string;
    courier_name?: string;
    tracking_number?: string;
    tracking_url?: string;
  },
) {
  const res = await fetch(`/api/checkout/admin/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not update order');
  return body.data;
}
