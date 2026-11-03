/**
 * Remove all checkout/order rows (test orders). Catalog and customers are kept.
 *
 *   npm run db:clear-orders                          # dry run
 *   npm run db:clear-orders -- --confirm             # delete
 *
 * Point DATABASE_URL at the target DB first (production via Cloud SQL Auth Proxy).
 */
import { sql } from 'drizzle-orm';
import { db, pool } from '../db/index.js';
import { checkoutSessions } from '../db/schema.js';

const confirm = process.argv.includes('--confirm');

function databaseLabel() {
  try {
    const url = new URL(String(process.env.DATABASE_URL || ''));
    const host = url.searchParams.get('host') || url.host || 'unknown host';
    return `${host}${url.pathname}`;
  } catch {
    return 'unknown database';
  }
}

const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(checkoutSessions);
const orders = Number(n);

console.log(`Database: ${databaseLabel()}`);
console.log(`- Orders / checkouts to remove: ${orders}`);

if (!confirm) {
  console.log('\nDry run only. Nothing was changed. Re-run with --confirm to delete these orders.');
  await pool.end();
  process.exit(0);
}

await db.delete(checkoutSessions);
console.log(`\nDone. Removed ${orders} order/checkout row(s). Catalog and customers were not touched.`);
await pool.end();
process.exit(0);
