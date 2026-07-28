import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { DEFAULT_JEWELLERY_CATEGORIES, DEFAULT_PLANS } from '../lib/defaults.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  const metaPath = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'frontend',
    'public',
    'uploads',
    'metadata.json',
  );

  let meta: Record<string, unknown> = {};
  if (fs.existsSync(metaPath)) {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    console.log(`Loaded metadata from ${metaPath}`);
  } else {
    console.warn('metadata.json not found — seeding defaults only');
  }

  const contentEntries: Array<[string, unknown]> = [
    ['hero', meta.hero ?? { filename: null, type: null, originalName: null, uploadedAt: null }],
    ['goldCategories', meta.goldCategories ?? []],
    ['silverCategories', meta.silverCategories ?? []],
    ['goldPlan', meta.goldPlan ?? DEFAULT_PLANS.gold],
    ['silverPlan', meta.silverPlan ?? DEFAULT_PLANS.silver],
    ['designLedLabels', meta.designLedLabels ?? ['Earrings', 'Bangles', 'Necklace']],
    ['designLedImages', meta.designLedImages ?? new Array(6).fill(null)],
    // Canonical shape is selectedGroups; empty ⇒ storefront falls back to top ERP groups.
    ['header', meta.header ?? { selectedGroups: [] }],
    ['offers', meta.offers ?? []],
    ['collections', meta.collections ?? [null, null, null]],
    ['collectionsBtnLink', meta.collectionsBtnLink ?? '#'],
    ['curatedSlots', meta.curatedSlots ?? new Array(12).fill(null)],
    ['curatedTitles', meta.curatedTitles ?? []],
    ['testimonialsImages', meta.testimonialsImages ?? new Array(8).fill(null)],
    ['testimonialsNames', meta.testimonialsNames ?? new Array(8).fill(null)],
    ['testimonialsTexts', meta.testimonialsTexts ?? new Array(8).fill(null)],
    ['standaloneBanner', meta.standaloneBanner ?? null],
  ];

  for (const [key, data] of contentEntries) {
    await db
      .insert(schema.siteContent)
      .values({ key, data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.siteContent.key,
        set: { data, updatedAt: new Date() },
      });
  }
  console.log(`Seeded ${contentEntries.length} site_content keys`);

  const existingCats = await db.select().from(schema.jewelleryCategories).limit(1);
  if (existingCats.length === 0) {
    const cats =
      (meta.jewelleryCategories as Array<{ name: string; image: string | null }> | undefined) ??
      DEFAULT_JEWELLERY_CATEGORIES;

    for (let i = 0; i < cats.length; i++) {
      await db.insert(schema.jewelleryCategories).values({
        name: cats[i].name,
        image: cats[i].image,
        sortOrder: i,
      });
    }
    console.log(`Seeded ${cats.length} jewellery categories`);
  } else {
    console.log('jewellery_categories already populated — skipped');
  }

  const existingProducts = await db.select().from(schema.products).limit(1);
  if (existingProducts.length === 0) {
    const productList =
      (meta.jewelleryProducts as Array<{
        id: string;
        category: string;
        subcategory?: string;
        name: string;
        price: string;
        originalPrice?: string;
        image?: string;
        description?: string;
        offer?: string;
      }> | undefined) ?? [];

    for (const p of productList) {
      await db
        .insert(schema.products)
        .values({
          id: p.id,
          category: p.category,
          subcategory: p.subcategory ?? null,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice ?? p.price,
          image: p.image ?? null,
          description: p.description ?? null,
          offer: p.offer ?? null,
        })
        .onConflictDoNothing({ target: schema.products.id });
    }
    console.log(`Seeded ${productList.length} products`);
  } else {
    console.log('products already populated — skipped');
  }

  // Touch a known key so health of Neon write path is obvious
  const check = await db
    .select()
    .from(schema.siteContent)
    .where(eq(schema.siteContent.key, 'hero'))
    .limit(1);
  console.log('Seed complete. hero present:', Boolean(check[0]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
