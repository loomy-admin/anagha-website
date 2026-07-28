import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import heroRoutes from './routes/hero.js';
import headerRoutes, { getHeaderSelection } from './routes/header.js';
import groupImagesRoutes, { getGroupImages } from './routes/groupImages.js';
import siteInvoiceRoutes from './routes/siteInvoice.js';
import categoriesRoutes from './routes/categories.js';
import offerPlanRoutes from './routes/offerPlan.js';
import offersRoutes from './routes/offers.js';
import collectionsRoutes from './routes/collections.js';
import curatedRoutes from './routes/curated.js';
import designLedRoutes from './routes/designLed.js';
import testimonialsRoutes from './routes/testimonials.js';
import standaloneBannerRoutes from './routes/standaloneBanner.js';
import jewelleryCategoriesRoutes from './routes/jewelleryCategories.js';
import jewelleryProductsRoutes from './routes/jewelleryProducts.js';
import websiteImagesRoutes from './routes/websiteImages.js';
import itemMetaRoutes from './routes/itemMeta.js';
import catalogRoutes from './routes/catalog.js';
import checkoutRoutes from './routes/checkout.js';
import authRoutes from './routes/auth.js';
import { requireAdmin } from './lib/customerAuth.js';
import { UPLOADS_DIR } from './lib/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(
  cors({
    origin: CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'anagha-backend' });
});

/** Public storefront header tabs (admin-picked ERP groups). */
app.get('/api/site/header', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await getHeaderSelection());
  } catch (err) {
    console.error('[site/header]', err);
    res.status(500).json({ error: 'Failed to load header' });
  }
});

/** Public ERP group tile images (admin overrides). */
app.get('/api/site/group-images', async (_req, res) => {
  try {
    res.json(await getGroupImages());
  } catch (err) {
    console.error('[site/group-images]', err);
    res.status(500).json({ error: 'Failed to load group images' });
  }
});

/** Public bill PDF iframe — same ERP host as checkout (ERP_API_URL). */
app.use('/api/site/invoice', siteInvoiceRoutes);

app.use('/api/upload', requireAdmin);
app.use('/api/upload/hero', heroRoutes);
app.use('/api/upload/header', headerRoutes);
app.use('/api/upload/group-images', groupImagesRoutes);
app.use('/api/upload/categories', categoriesRoutes);
app.use('/api/upload/offer-plan', offerPlanRoutes);
app.use('/api/upload/offers', offersRoutes);
app.use('/api/upload/collections', collectionsRoutes);
app.use('/api/upload/curated', curatedRoutes);
app.use('/api/upload/design-led', designLedRoutes);
app.use('/api/upload/testimonials', testimonialsRoutes);
app.use('/api/upload/standalone-banner', standaloneBannerRoutes);
app.use('/api/upload/jewellery/categories', jewelleryCategoriesRoutes);
app.use('/api/upload/jewellery/products', jewelleryProductsRoutes);
app.use('/api/upload/jewellery/website-images', websiteImagesRoutes);
app.use('/api/upload/jewellery/item-meta', itemMetaRoutes);

// Live ERP inventory catalog (BFF) — multi-client via ERP_STORE_SLUG
app.use('/api/catalog', catalogRoutes);
// Customer email/password auth (website shoppers)
app.use('/api/auth', authRoutes);
// Checkout: reserve → Razorpay → ERP bill on success
app.use('/api/checkout', checkoutRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('[express]', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  },
);

app.listen(PORT, () => {
  console.log(`Anagha API listening on http://localhost:${PORT}`);
  console.log(`Uploads directory: ${path.resolve(__dirname, '..', 'uploads')}`);
});
