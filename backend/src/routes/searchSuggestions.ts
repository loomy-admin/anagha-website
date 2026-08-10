import { Router, type Request, type Response } from 'express';
import { getSearchSuggestionsConfig, setSearchSuggestionsConfig } from '../lib/searchSuggestions.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await getSearchSuggestionsConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting search config:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const { trendingCategories, whatsNewTags } = req.body;
    
    await setSearchSuggestionsConfig({
      trendingCategories: Array.isArray(trendingCategories) ? trendingCategories : [],
      whatsNewTags: Array.isArray(whatsNewTags) ? whatsNewTags : [],
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving search config:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
