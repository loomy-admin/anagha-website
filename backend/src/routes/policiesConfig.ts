import { Router } from 'express';
import { getContent, setContent } from '../lib/content.js';

const router = Router();

export interface PolicySection {
  title: string;
  body: string;
}

export interface PoliciesConfig {
  privacyPolicy: PolicySection[];
  termsConditions: PolicySection[];
}

const defaultConfig: PoliciesConfig = {
  privacyPolicy: [],
  termsConditions: [],
};

router.get('/', async (_req, res) => {
  try {
    const config = await getContent<PoliciesConfig>('policies', defaultConfig);
    res.json(config);
  } catch (err) {
    console.error('Error fetching policies config:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const data = req.body;
    await setContent('policies', data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving policies config:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
