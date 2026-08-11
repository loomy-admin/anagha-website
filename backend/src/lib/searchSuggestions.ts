import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { siteContent } from '../db/schema.js';

export interface SearchSuggestionsConfig {
  trendingCategories: string[];
  whatsNewTags: string[];
}

const SEARCH_SUGGESTIONS_KEY = 'search_suggestions';
const DEFAULT_CONFIG: SearchSuggestionsConfig = {
  trendingCategories: [],
  whatsNewTags: [],
};

export async function getSearchSuggestionsConfig(): Promise<SearchSuggestionsConfig> {
  try {
    const res = await db
      .select({ data: siteContent.data })
      .from(siteContent)
      .where(eq(siteContent.key, SEARCH_SUGGESTIONS_KEY))
      .limit(1);

    if (res.length > 0 && res[0].data) {
      return {
        ...DEFAULT_CONFIG,
        ...(res[0].data as Record<string, unknown>),
      };
    }
    return DEFAULT_CONFIG;
  } catch (err) {
    console.error('Error fetching search suggestions config:', err);
    return DEFAULT_CONFIG;
  }
}

export async function setSearchSuggestionsConfig(config: SearchSuggestionsConfig): Promise<void> {
  try {
    await db
      .insert(siteContent)
      .values({
        key: SEARCH_SUGGESTIONS_KEY,
        data: config,
      })
      .onConflictDoUpdate({
        target: siteContent.key,
        set: { data: config },
      });
  } catch (err) {
    console.error('Error saving search suggestions config:', err);
    throw new Error('Failed to save config');
  }
}
