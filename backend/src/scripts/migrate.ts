import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      data JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Allow null CMS values (e.g. standaloneBanner)
  await sql`ALTER TABLE site_content ALTER COLUMN data DROP NOT NULL`;

  await sql`
    CREATE TABLE IF NOT EXISTS jewellery_categories (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL,
      image TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category TEXT NOT NULL,
      subcategory TEXT,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      original_price TEXT,
      image TEXT,
      description TEXT,
      offer TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS products_category_idx ON products (category)`;

  await sql`
    CREATE TABLE IF NOT EXISTS website_customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      shipping_address JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE website_customers ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE website_customers ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE website_customers ADD COLUMN IF NOT EXISTS cart JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE website_customers ADD COLUMN IF NOT EXISTS wishlist JSONB DEFAULT '[]'::jsonb`;

  await sql`CREATE INDEX IF NOT EXISTS website_customers_email_idx ON website_customers (email)`;

  const adminEmail = 'admin@anagha.com';
  const adminHash = await bcrypt.hash('admin123', 10);
  await sql`
    INSERT INTO website_customers (email, password_hash, name, mobile, is_admin)
    VALUES (${adminEmail}, ${adminHash}, ${'Anagha Admin'}, ${'9999999999'}, ${true})
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      is_admin = TRUE,
      name = EXCLUDED.name,
      updated_at = NOW()
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status TEXT NOT NULL DEFAULT 'pending',
      tag_number TEXT NOT NULL,
      inventory_id TEXT,
      amount TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      website_customer_id UUID,
      customer_name TEXT,
      customer_mobile TEXT,
      customer_email TEXT,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      erp_bill_id TEXT,
      erp_bill_number TEXT,
      payment_payload JSONB DEFAULT '{}'::jsonb,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS website_customer_id UUID`;
  await sql`ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT`;
  await sql`ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT`;

  // Migrate legacy PhonePe columns → Razorpay (idempotent; Neon-safe single statements)
  const legacyCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'checkout_sessions'
      AND column_name IN ('phonepe_merchant_txn_id', 'phonepe_txn_id')
  `;
  const legacyNames = new Set(
    (legacyCols as Array<{ column_name: string }>).map((r) => r.column_name),
  );

  if (legacyNames.has('phonepe_merchant_txn_id')) {
    await sql`
      UPDATE checkout_sessions
      SET razorpay_order_id = COALESCE(razorpay_order_id, phonepe_merchant_txn_id)
      WHERE phonepe_merchant_txn_id IS NOT NULL
    `;
    await sql`ALTER TABLE checkout_sessions DROP COLUMN phonepe_merchant_txn_id`;
  }
  if (legacyNames.has('phonepe_txn_id')) {
    await sql`
      UPDATE checkout_sessions
      SET razorpay_payment_id = COALESCE(razorpay_payment_id, phonepe_txn_id)
      WHERE phonepe_txn_id IS NOT NULL
    `;
    await sql`ALTER TABLE checkout_sessions DROP COLUMN phonepe_txn_id`;
  }

  await sql`CREATE INDEX IF NOT EXISTS checkout_sessions_status_idx ON checkout_sessions (status)`;
  await sql`CREATE INDEX IF NOT EXISTS checkout_sessions_razorpay_order_idx ON checkout_sessions (razorpay_order_id)`;
  await sql`CREATE INDEX IF NOT EXISTS checkout_sessions_customer_idx ON checkout_sessions (website_customer_id)`;

  await sql`ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT '{}'::jsonb`;

  console.log('Migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
