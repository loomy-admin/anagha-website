CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tag_number" text NOT NULL,
	"inventory_id" text,
	"amount" text NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"website_customer_id" uuid,
	"customer_name" text,
	"customer_mobile" text,
	"customer_email" text,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"erp_bill_id" text,
	"erp_bill_number" text,
	"payment_payload" jsonb DEFAULT '{}'::jsonb,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jewellery_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "jewellery_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"image" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"name" text NOT NULL,
	"price" text NOT NULL,
	"original_price" text,
	"image" text,
	"description" text,
	"offer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_content" (
	"key" text PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"mobile" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"shipping_address" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "website_customers_email_unique" UNIQUE("email")
);
