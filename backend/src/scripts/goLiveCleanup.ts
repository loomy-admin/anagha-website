/**
 * One-time cleanup before switching from the test ERP to production.
 *
 *   npm run db:go-live-cleanup                          # dry run: shows what would be removed
 *   npm run db:go-live-cleanup -- --confirm             # removes test orders, descriptions, catalog copy
 *   npm run db:go-live-cleanup -- --confirm --customers # also removes customer accounts
 *
 * Banners, homepage, policies, shipping methods, contact info, and other CMS settings are kept.
 * Take a database backup first. Run the ERP sync right after so the store is filled again.
 */
import { inArray, sql } from 'drizzle-orm';
import { db, pool } from '../db/index.js';
import { cachedCatalogItems, checkoutSessions, siteContent, websiteCustomers } from '../db/schema.js';
import { ERP_SOURCE_KEY } from '../lib/syncCatalog.js';

const confirm = process.argv.includes('--confirm');
const withCustomers = process.argv.includes('--customers');
const CONTENT_KEYS = ['website_item_meta', ERP_SOURCE_KEY];

function databaseLabel() {
  try {
    const url = new URL(String(process.env.DATABASE_URL || ''));
    const host = url.searchParams.get('host') || url.host || 'unknown host';
    return `${host}${url.pathname}`;
  } catch {
    return 'unknown database';
  }
}

async function count(table: typeof checkoutSessions | typeof cachedCatalogItems | typeof websiteCustomers) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
  return Number(n);
}

const orders = await count(checkoutSessions);
const catalogRows = await count(cachedCatalogItems);
const customers = await count(websiteCustomers);
const contentRows = await db
  .select({ key: siteContent.key })
  .from(siteContent)
  .where(inArray(siteContent.key, CONTENT_KEYS));

console.log(`Database: ${databaseLabel()}`);
console.log(`- Orders and checkouts:       ${orders}`);
console.log(`- Catalog copy (pieces):      ${catalogRows}`);
console.log(`- Website descriptions + ERP source marker: ${contentRows.map((r) => r.key).join(', ') || 'none'}`);
console.log(`- Customer accounts:          ${customers} ${withCustomers ? '(will be removed)' : '(kept; add --customers to remove)'}`);

if (!confirm) {
  console.log('\nDry run only. Nothing was changed. Re-run with --confirm to remove the items above.');
  await pool.end();
  process.exit(0);
}

await db.transaction(async (tx) => {
  await tx.delete(checkoutSessions);
  await tx.delete(cachedCatalogItems);
  await tx.delete(siteContent).where(inArray(siteContent.key, CONTENT_KEYS));
  if (withCustomers) await tx.delete(websiteCustomers);
});

console.log('\nDone. Now run the ERP sync (admin "Sync from ERP" or the Cloud Scheduler job) to load the store.');
await pool.end();
process.exit(0);
