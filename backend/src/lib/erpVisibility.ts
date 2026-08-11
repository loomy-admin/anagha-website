import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { siteContent } from '../db/schema.js';

export interface ErpVisibilityConfig {
  visibleCategories: string[]; // Slugs of visible groups/articles
  visibleProducts: string[];   // Tag numbers of visible products
}

const VISIBILITY_KEY = 'erp_visibility';

export async function getErpVisibility(): Promise<ErpVisibilityConfig> {
  const rows = await db
    .select({ data: siteContent.data })
    .from(siteContent)
    .where(eq(siteContent.key, VISIBILITY_KEY))
    .limit(1);

  const data = (rows[0]?.data as Partial<ErpVisibilityConfig>) || {};
  return {
    visibleCategories: Array.isArray(data.visibleCategories) ? data.visibleCategories : [],
    visibleProducts: Array.isArray(data.visibleProducts) ? data.visibleProducts : [],
  };
}

export async function setErpVisibility(config: Partial<ErpVisibilityConfig>): Promise<ErpVisibilityConfig> {
  const existing = await getErpVisibility();
  const merged = {
    visibleCategories: config.visibleCategories ?? existing.visibleCategories,
    visibleProducts: config.visibleProducts ?? existing.visibleProducts,
  };

  await db
    .insert(siteContent)
    .values({
      key: VISIBILITY_KEY,
      data: merged,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteContent.key,
      set: {
        data: merged,
        updatedAt: new Date(),
      },
    });

  return merged;
}
