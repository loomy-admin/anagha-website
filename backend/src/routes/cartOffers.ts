import { Router } from 'express';
import { getCatalogRowsByTags } from '../lib/websiteInventory.js';
import {
  getCartOffersConfig,
  saveCartOffersConfig,
  quoteBuyGetOffer,
  offerIsLive,
  type OfferLine,
} from '../lib/buyGetOffer.js';

function payloadFromRow(row: Awaited<ReturnType<typeof getCatalogRowsByTags>>[number]): OfferLine {
  const data = row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
  const price = Number(data.display_price ?? data.mrp ?? row.displayPrice ?? 0);
  return {
    ...data,
    tag_number: row.tagNumber,
    metal_type: data.metal_type || row.metalType,
    group: data.group,
    group_slug: data.group_slug || row.groupSlug,
    article: data.article,
    article_slug: data.article_slug || row.articleSlug,
    display_price: price,
    item_net_total: price,
    item_total: price,
  };
}

async function quoteHandler(req: import('express').Request, res: import('express').Response) {
  try {
    const tags = Array.isArray(req.body?.tag_numbers)
      ? req.body.tag_numbers.map((t: unknown) => String(t || '').trim().toUpperCase()).filter(Boolean)
      : [];
    const unique = [...new Set(tags)];
    const rows = await getCatalogRowsByTags(unique);
    const lines = rows.filter((row) => row.status === 'available').map(payloadFromRow);
    const quote = await quoteBuyGetOffer(lines);
    res.json({
      data: {
        items_subtotal: quote.items_subtotal,
        discount: quote.applied?.discount || 0,
        items_amount: quote.items_amount,
        applied: quote.applied,
        lines: quote.lines.map((line) => ({
          tag_number: line.tag_number,
          name: line.name,
          item_net_total: line.item_net_total,
          offer_amount: line.offer_amount,
          item_total: line.item_total,
        })),
      },
    });
  } catch (err) {
    console.error('[cart-offers] quote', err);
    res.status(500).json({ error: 'Failed to quote offer' });
  }
}

export const publicCartOffersRouter = Router();

publicCartOffersRouter.get('/', async (_req, res) => {
  try {
    const config = await getCartOffersConfig();
    res.json({
      data: {
        offers: config.offers.filter((offer) => offerIsLive(offer)).map((offer) => ({
          id: offer.id,
          name: offer.name,
          type: offer.type,
          tiers: offer.tiers,
        })),
      },
    });
  } catch (err) {
    console.error('[cart-offers] GET public', err);
    res.status(500).json({ error: 'Failed to load offers' });
  }
});

publicCartOffersRouter.post('/quote', quoteHandler);

export const adminCartOffersRouter = Router();

adminCartOffersRouter.get('/', async (_req, res) => {
  try {
    const config = await getCartOffersConfig();
    res.json({ data: config });
  } catch (err) {
    console.error('[cart-offers] GET admin', err);
    res.status(500).json({ error: 'Failed to load offers' });
  }
});

adminCartOffersRouter.put('/', async (req, res) => {
  try {
    const config = await saveCartOffersConfig({ offers: req.body?.offers || [] });
    res.json({ success: true, data: config });
  } catch (err) {
    console.error('[cart-offers] PUT', err);
    res.status(500).json({ error: 'Failed to save offers' });
  }
});
