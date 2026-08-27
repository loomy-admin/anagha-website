export type BuyGetTier = {
  buy: number;
  get: number;
};

export type BuyGetOffer = {
  id: string;
  name: string;
  type: 'buy_x_get_y';
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  tiers: BuyGetTier[];
  metal_types: string[];
  groups: string[];
  articles: string[];
  max_discount: number | null;
};

export type OfferQuote = {
  items_subtotal: number;
  discount: number;
  items_amount: number;
  applied: {
    offer_id: string;
    name: string;
    buy: number;
    get: number;
    eligible_count: number;
    discount: number;
    free_tags: string[];
  } | null;
  lines: Array<{
    tag_number: string;
    name?: string;
    item_net_total: number;
    offer_amount: number;
    item_total: number;
  }>;
};

export function blankOffer(): BuyGetOffer {
  return {
    id: `offer-${Date.now()}`,
    name: 'Buy X Get Y',
    type: 'buy_x_get_y',
    active: true,
    starts_at: null,
    ends_at: null,
    tiers: [{ buy: 2, get: 1 }],
    metal_types: [],
    groups: [],
    articles: [],
    max_discount: null,
  };
}

export async function fetchAdminCartOffers(): Promise<BuyGetOffer[]> {
  const res = await fetch('/api/upload/cart-offers', {
    credentials: 'include',
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not load offers');
  return Array.isArray(body.data?.offers) ? body.data.offers : [];
}

export async function saveAdminCartOffers(offers: BuyGetOffer[]) {
  const res = await fetch('/api/upload/cart-offers', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offers }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not save offers');
  return (body.data?.offers || offers) as BuyGetOffer[];
}

export async function quoteCartOffer(tagNumbers: string[]): Promise<OfferQuote | null> {
  const tags = [...new Set(tagNumbers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  if (!tags.length) return null;
  const res = await fetch('/api/site/cart-offers/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_numbers: tags }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return body.data as OfferQuote;
}
