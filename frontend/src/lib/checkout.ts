export type CheckoutCartItem = {
  tag_number: string;
  name: string;
  display_price?: number | null;
  image_url?: string | null;
  type_slug?: string | null;
};

export type CheckoutSession = {
  id: string;
  status: string;
  tag_number: string;
  tag_numbers?: string[];
  /** Article / product names for the purchased lines. */
  item_names?: string[];
  amount: number;
  currency: string;
  customer_name?: string | null;
  customer_mobile?: string | null;
  customer_email?: string | null;
  erp_bill_id?: string | null;
  erp_bill_number?: string | null;
  /** Public ERP invoice URL for iframe / open-in-tab */
  bill_url?: string | null;
  expires_at?: string | null;
  payment_provider?: 'razorpay';
  created_at?: string | null;
};

export type CheckoutPayment = {
  mode: 'razorpay';
  provider: 'razorpay';
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  merchantTransactionId: string;
  displayName: string;
  redirectUrl: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

const CART_KEY = 'anagha_cart_v2';
const LEGACY_CART_KEY = 'anagha_checkout_cart_v1';
export const CART_CHANGED_EVENT = 'anagha-cart-changed';

function emitCartChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

function normalizeCart(raw: unknown): CheckoutCartItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is CheckoutCartItem => Boolean(item?.tag_number))
      .map((item) => ({
        ...item,
        tag_number: String(item.tag_number).trim().toUpperCase(),
      }));
  }
  if (typeof raw === 'object' && raw && 'tag_number' in raw) {
    const item = raw as CheckoutCartItem;
    return [
      {
        ...item,
        tag_number: String(item.tag_number).trim().toUpperCase(),
      },
    ];
  }
  return [];
}

export function loadCart(): CheckoutCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) return normalizeCart(JSON.parse(raw));

    const legacy = localStorage.getItem(LEGACY_CART_KEY);
    if (legacy) {
      const migrated = normalizeCart(JSON.parse(legacy));
      if (migrated.length) {
        localStorage.setItem(CART_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_CART_KEY);
      }
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

function persistCart(items: CheckoutCartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  emitCartChanged();
}

export function getCartCount(): number {
  return loadCart().length;
}

export function addToCart(item: CheckoutCartItem): { added: boolean; cart: CheckoutCartItem[] } {
  const tag = String(item.tag_number || '').trim().toUpperCase();
  if (!tag) return { added: false, cart: loadCart() };
  const cart = loadCart();
  if (cart.some((row) => row.tag_number === tag)) {
    return { added: false, cart };
  }
  const next = [
    ...cart,
    {
      ...item,
      tag_number: tag,
    },
  ];
  persistCart(next);
  return { added: true, cart: next };
}

export function removeFromCart(tagNumber: string): CheckoutCartItem[] {
  const tag = String(tagNumber || '').trim().toUpperCase();
  const next = loadCart().filter((row) => row.tag_number !== tag);
  persistCart(next);
  return next;
}

export function removeCartTags(tagNumbers: string[]): CheckoutCartItem[] {
  const remove = new Set(
    tagNumbers.map((t) => String(t || '').trim().toUpperCase()).filter(Boolean),
  );
  const next = loadCart().filter((row) => !remove.has(row.tag_number));
  persistCart(next);
  return next;
}

export function clearCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(LEGACY_CART_KEY);
  emitCartChanged();
}

/** @deprecated Use addToCart / loadCart. Kept for older call sites. */
export function saveCartItem(item: CheckoutCartItem) {
  addToCart(item);
}

/** @deprecated Use loadCart. */
export function loadCartItem(): CheckoutCartItem | null {
  return loadCart()[0] || null;
}

/** @deprecated Use clearCart / removeCartTags. */
export function clearCartItem() {
  clearCart();
}

export async function createCheckoutSession(input: {
  tag_number?: string;
  tag_numbers?: string[];
}) {
  const tags = (input.tag_numbers?.length
    ? input.tag_numbers
    : input.tag_number
      ? [input.tag_number]
      : []
  )
    .map((t) => String(t || '').trim().toUpperCase())
    .filter(Boolean);

  const res = await fetch('/api/checkout/session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      tags.length === 1 ? { tag_number: tags[0] } : { tag_numbers: tags },
    ),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Could not start checkout');
  }
  return body.data as { session: CheckoutSession; payment: CheckoutPayment };
}

export async function fetchMyOrders() {
  const res = await fetch('/api/checkout/my-orders', {
    credentials: 'include',
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw Object.assign(new Error('Sign in required'), { status: 401 });
  }
  if (!res.ok) {
    throw new Error(body.error || 'Could not load orders');
  }
  return (body.data || []) as CheckoutSession[];
}

export async function fetchCheckoutSession(id: string) {
  const res = await fetch(`/api/checkout/session/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Session not found');
  }
  return body.data as CheckoutSession;
}

export async function fetchCheckoutPayment(sessionId: string) {
  const res = await fetch(`/api/checkout/session/${encodeURIComponent(sessionId)}/payment`, {
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Payment details not found');
  }
  return body.data as { session: CheckoutSession; payment: CheckoutPayment | null };
}

export async function cancelCheckoutSession(sessionId: string) {
  const res = await fetch(`/api/checkout/session/${encodeURIComponent(sessionId)}/cancel`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Could not cancel checkout');
  }
  return body.data as CheckoutSession;
}

export async function confirmRazorpayCheckout(
  sessionId: string,
  input: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
) {
  const res = await fetch(`/api/checkout/session/${encodeURIComponent(sessionId)}/confirm-razorpay`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Razorpay confirmation failed');
  }
  return body.data as CheckoutSession;
}
