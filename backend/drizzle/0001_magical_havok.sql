CREATE TABLE "cached_catalog_items" (
	"tag_number" text PRIMARY KEY NOT NULL,
	"id" text,
	"group_slug" text,
	"type_slug" text,
	"article_slug" text,
	"metal_type" text,
	"purity" text,
	"display_price" real,
	"has_image" boolean DEFAULT false,
	"erp_created_at" timestamp with time zone,
	"data" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "shipping_address" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "website_customers" ADD COLUMN "cart" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "website_customers" ADD COLUMN "wishlist" jsonb DEFAULT '[]'::jsonb;