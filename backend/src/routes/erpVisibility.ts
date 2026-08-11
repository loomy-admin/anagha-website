import { Router, type Request, type Response } from 'express';
import { getErpVisibility, setErpVisibility } from '../lib/erpVisibility.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await getErpVisibility();
    res.json(config);
  } catch (err) {
    console.error('[erp-visibility] GET error', err);
    res.status(500).json({ error: 'Failed to load ERP visibility config' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const { visibleCategories, visibleProducts } = req.body;
    
    // Validate inputs
    const updates: any = {};
    if (Array.isArray(visibleCategories)) {
      updates.visibleCategories = visibleCategories.map(String);
    }
    if (Array.isArray(visibleProducts)) {
      updates.visibleProducts = visibleProducts.map(String);
    }

    const config = await setErpVisibility(updates);
    res.json(config);
  } catch (err) {
    console.error('[erp-visibility] PUT error', err);
    res.status(500).json({ error: 'Failed to save ERP visibility config' });
  }
});

export default router;
