import { getContent, setContent } from './content.js';

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

export type CartOffersConfig = {
  offers: BuyGetOffer[];
};

export type OfferLine = Record<string, unknown> & {
  tag_number?: string;
  display_price?: unknown;
  item_total?: unknown;
  item_net_total?: unknown;
  offer_amount?: unknown;
  metal_type?: unknown;
  group?: unknown;
  group_slug?: unknown;
  article?: unknown;
  article_slug?: unknown;
};

export type AppliedOffer = {
  offer_id: string;
  name: string;
  buy: number;
  get: number;
  eligible_count: number;
  discount: number;
  free_tags: string[];
};

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value) {
    const name = String(raw || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function asTier(raw: unknown): BuyGetTier | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as { buy?: unknown; get?: unknown };
  const buy = Math.floor(Number(row.buy));
  const get = Math.floor(Number(row.get));
  if (!Number.isFinite(buy) || !Number.isFinite(get) || buy < 1 || get < 1) return null;
  return { buy, get };
}

export function normalizeOffer(raw: unknown, idx = 0): BuyGetOffer | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const tiers = (Array.isArray(row.tiers) ? row.tiers : [])
    .map(asTier)
    .filter((tier): tier is BuyGetTier => Boolean(tier));
  if (!tiers.length) return null;
  const max = row.max_discount == null || row.max_discount === '' ? null : Number(row.max_discount);
  return {
    id: String(row.id || `offer-${idx + 1}`).trim() || `offer-${idx + 1}`,
    name: String(row.name || 'Buy X Get Y').trim() || 'Buy X Get Y',
    type: 'buy_x_get_y',
    active: row.active !== false,
    starts_at: row.starts_at ? String(row.starts_at).trim() : null,
    ends_at: row.ends_at ? String(row.ends_at).trim() : null,
    tiers,
    metal_types: asList(row.metal_types),
    groups: asList(row.groups),
    articles: asList(row.articles),
    max_discount: Number.isFinite(max) && max > 0 ? max : null,
  };
}

export function normalizeCartOffers(raw: unknown): CartOffersConfig {
  const offers = Array.isArray((raw as { offers?: unknown })?.offers)
    ? ((raw as { offers: unknown[] }).offers || [])
    : Array.isArray(raw)
      ? raw
      : [];
  return {
    offers: offers
      .map((row, idx) => normalizeOffer(row, idx))
      .filter((row): row is BuyGetOffer => Boolean(row)),
  };
}

export async function getCartOffersConfig(): Promise<CartOffersConfig> {
  const stored = await getContent<unknown>('cartOffers', { offers: [] });
  return normalizeCartOffers(stored);
}

export async function saveCartOffersConfig(raw: unknown): Promise<CartOffersConfig> {
  const config = normalizeCartOffers(raw);
  await setContent('cartOffers', config);
  return config;
}

function dateStart(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date(value);
}

function dateEnd(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T23:59:59.999`);
  return new Date(value);
}

export function offerIsLive(offer: BuyGetOffer, now = new Date()) {
  if (!offer.active) return false;
  if (offer.starts_at) {
    const start = dateStart(offer.starts_at);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (offer.ends_at) {
    const end = dateEnd(offer.ends_at);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

function norm(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function matchesAny(value: string, allowed: string[]) {
  if (!allowed.length) return true;
  if (!value) return false;
  return allowed.some((entry) => {
    const want = norm(entry);
    return value === want || value.includes(want) || want.includes(value);
  });
}

export function lineIsEligible(line: OfferLine, offer: BuyGetOffer) {
  const metal = norm(line.metal_type);
  const group = norm(line.group_slug || line.group);
  const article = norm(line.article_slug || line.article);
  return (
    matchesAny(metal, offer.metal_types) &&
    matchesAny(group, offer.groups) &&
    matchesAny(article, offer.articles)
  );
}

/** Line net used for free amount — selling price, not a rounded POS card total. */
export function lineNet(line: OfferLine) {
  const n = Number(line.item_net_total ?? line.display_price ?? line.item_total ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function pickTier(tiers: BuyGetTier[], eligibleCount: number): BuyGetTier | null {
  const ranked = [...tiers].sort((a, b) => {
    const needA = a.buy + a.get;
    const needB = b.buy + b.get;
    if (needB !== needA) return needB - needA;
    if (b.buy !== a.buy) return b.buy - a.buy;
    return b.get - a.get;
  });
  return ranked.find((tier) => eligibleCount >= tier.buy + tier.get) || null;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function applyOfferToLines(
  lines: OfferLine[],
  offer: BuyGetOffer,
): { lines: OfferLine[]; applied: AppliedOffer | null } {
  const eligibleIdx = lines
    .map((line, idx) => ({ idx, net: lineNet(line), tag: String(line.tag_number || '').toUpperCase() }))
    .filter((row) => lineIsEligible(lines[row.idx], offer) && row.net > 0);

  const tier = pickTier(offer.tiers, eligibleIdx.length);
  if (!tier) {
    return {
      lines: lines.map((line) => ({
        ...line,
        item_net_total: lineNet(line),
        offer_amount: 0,
        item_total: lineNet(line),
      })),
      applied: null,
    };
  }

  const cheapest = [...eligibleIdx].sort((a, b) => {
    if (a.net !== b.net) return a.net - b.net;
    return a.tag.localeCompare(b.tag);
  });
  const freeRows = cheapest.slice(0, tier.get);
  const freeSet = new Set(freeRows.map((row) => row.idx));
  const rawDiscount = freeRows.reduce((sum, row) => sum + row.net, 0);
  const discount =
    offer.max_discount != null ? Math.min(rawDiscount, offer.max_discount) : rawDiscount;
  const scale = rawDiscount > 0 ? discount / rawDiscount : 0;

  const next = lines.map((line, idx) => {
    const net = lineNet(line);
    const offerAmount = freeSet.has(idx) ? money(net * scale) : 0;
    return {
      ...line,
      item_net_total: net,
      offer_amount: offerAmount,
      item_total: money(Math.max(0, net - offerAmount)),
    };
  });

  return {
    lines: next,
    applied: {
      offer_id: offer.id,
      name: offer.name,
      buy: tier.buy,
      get: tier.get,
      eligible_count: eligibleIdx.length,
      discount: money(next.reduce((sum, line) => sum + Number(line.offer_amount || 0), 0)),
      free_tags: next
        .filter((line) => Number(line.offer_amount || 0) > 0)
        .map((line) => String(line.tag_number || '').toUpperCase())
        .filter(Boolean),
    },
  };
}

export function applyBestBuyGetOffer(
  lines: OfferLine[],
  offers: BuyGetOffer[],
  now = new Date(),
): { lines: OfferLine[]; applied: AppliedOffer | null } {
  const live = offers.filter((offer) => offerIsLive(offer, now));
  let best: { lines: OfferLine[]; applied: AppliedOffer | null } = {
    lines: lines.map((line) => {
      const net = lineNet(line);
      return { ...line, item_net_total: net, offer_amount: 0, item_total: net };
    }),
    applied: null,
  };

  for (const offer of live) {
    const result = applyOfferToLines(lines, offer);
    if (!result.applied) continue;
    if (!best.applied || result.applied.discount > best.applied.discount) {
      best = result;
    }
  }
  return best;
}

export async function quoteBuyGetOffer(lines: OfferLine[]) {
  const { offers } = await getCartOffersConfig();
  const result = applyBestBuyGetOffer(lines, offers);
  const itemsAmount = money(
    result.lines.reduce((sum, line) => sum + Number(line.item_total || 0), 0),
  );
  return {
    ...result,
    items_amount: itemsAmount,
    items_subtotal: money(result.lines.reduce((sum, line) => sum + lineNet(line), 0)),
  };
}
