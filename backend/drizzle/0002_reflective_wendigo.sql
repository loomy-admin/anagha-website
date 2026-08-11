CREATE INDEX "group_price_idx" ON "cached_catalog_items" USING btree ("group_slug","display_price");--> statement-breakpoint
CREATE INDEX "type_price_idx" ON "cached_catalog_items" USING btree ("type_slug","display_price");--> statement-breakpoint
CREATE INDEX "article_price_idx" ON "cached_catalog_items" USING btree ("article_slug","display_price");--> statement-breakpoint
CREATE INDEX "group_date_idx" ON "cached_catalog_items" USING btree ("group_slug","erp_created_at");--> statement-breakpoint
CREATE INDEX "type_date_idx" ON "cached_catalog_items" USING btree ("type_slug","erp_created_at");--> statement-breakpoint
CREATE INDEX "article_date_idx" ON "cached_catalog_items" USING btree ("article_slug","erp_created_at");