import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  real,
  index,
} from 'drizzle-orm/pg-core';

/** Key/value CMS blobs (hero, header, offers, plans, etc.) */
export const siteContent = pgTable('site_content', {
  key: text('key').primaryKey(),
  data: jsonb('data').default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const jewelleryCategories = pgTable('jewellery_categories', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  image: text('image'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  name: text('name').notNull(),
  price: text('price').notNull(),
  originalPrice: text('original_price'),
  image: text('image'),
  description: text('description'),
  offer: text('offer'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Website shoppers (email/password). Separate from ERP POS staff auth. */
export const websiteCustomers = pgTable('website_customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  mobile: text('mobile').notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  shippingAddress: jsonb('shipping_address').default({}),
  cart: jsonb('cart').default([]),
  wishlist: jsonb('wishlist').default([]),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Website checkout sessions (Razorpay). erp_bill_* store website invoice ids. */
export const checkoutSessions = pgTable('checkout_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: text('status').notNull().default('pending'),
  tagNumber: text('tag_number').notNull(),
  inventoryId: text('inventory_id'),
  amount: text('amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  websiteCustomerId: uuid('website_customer_id'),
  customerName: text('customer_name'),
  customerMobile: text('customer_mobile'),
  customerEmail: text('customer_email'),
  razorpayOrderId: text('razorpay_order_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
  erpBillId: text('erp_bill_id'),
  erpBillNumber: text('erp_bill_number'),
  paymentPayload: jsonb('payment_payload').default({}),
  shippingAddress: jsonb('shipping_address').default({}),
  itemsAmount: text('items_amount'),
  shippingAmount: text('shipping_amount').default('0'),
  shippingMethodId: text('shipping_method_id'),
  shippingMethodName: text('shipping_method_name'),
  shippingEta: text('shipping_eta'),
  courierName: text('courier_name'),
  trackingNumber: text('tracking_number'),
  trackingUrl: text('tracking_url'),
  packedAt: timestamp('packed_at', { withTimezone: true }),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Background synced ERP catalog for fast sorted queries */
export const cachedCatalogItems = pgTable('cached_catalog_items', {
  tagNumber: text('tag_number').primaryKey(),
  id: text('id'),
  groupSlug: text('group_slug'),
  typeSlug: text('type_slug'),
  articleSlug: text('article_slug'),
  metalType: text('metal_type'),
  purity: text('purity'),
  displayPrice: real('display_price'),
  hasImage: boolean('has_image').default(false),
  erpCreatedAt: timestamp('erp_created_at', { withTimezone: true }),
  data: jsonb('data').notNull(), // Full item JSON (imported from ERP or created on website)
  origin: text('origin').notNull().default('erp'),
  status: text('status').notNull().default('available'),
  soldAt: timestamp('sold_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('group_price_idx').on(t.groupSlug, t.displayPrice),
  index('type_price_idx').on(t.typeSlug, t.displayPrice),
  index('article_price_idx').on(t.articleSlug, t.displayPrice),
  index('group_date_idx').on(t.groupSlug, t.erpCreatedAt),
  index('type_date_idx').on(t.typeSlug, t.erpCreatedAt),
  index('article_date_idx').on(t.articleSlug, t.erpCreatedAt),
  index('catalog_status_idx').on(t.status),
]);
