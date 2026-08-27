import { Router } from 'express';
import { getContent, setContent, getAllContent } from '../lib/content.js';

const router = Router();

export interface LandingVisibilityConfig {
  hideHero: boolean;
  hideCategories: boolean;
  hideOffers: boolean;
  hideCollections: boolean;
  hideCurated: boolean;
  hideDesignLed: boolean;
  hideBanner: boolean;
  hideTestimonials: boolean;
  hideAbout: boolean;
  hidePromise: boolean;
  hideGoldPlan: boolean;
  hideSilverPlan: boolean;
}

const defaultConfig: LandingVisibilityConfig = {
  hideHero: false,
  hideCategories: false,
  hideOffers: false,
  hideCollections: false,
  hideCurated: false,
  hideDesignLed: false,
  hideBanner: false,
  hideTestimonials: false,
  hideAbout: false,
  hidePromise: false,
  hideGoldPlan: false,
  hideSilverPlan: false,
};

// GET config
router.get('/config', async (_req, res) => {
  try {
    const config = await getContent<LandingVisibilityConfig>('landing_visibility', defaultConfig);
    res.json(config);
  } catch (err) {
    console.error('[landingConfig] GET Error:', err);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// PUT config (we will mount this under /api/upload so it requires admin)
router.put('/config', async (req, res) => {
  try {
    const newConfig = { ...defaultConfig, ...req.body };
    await setContent('landing_visibility', newConfig);
    res.json({ success: true, config: newConfig });
  } catch (err) {
    console.error('[landingConfig] PUT config Error:', err);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// PUT about
router.put('/about', async (req, res) => {
  try {
    await setContent('about', req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('[landingConfig] PUT about Error:', err);
    res.status(500).json({ error: 'Failed to update about' });
  }
});

// PUT promise
router.put('/promise', async (req, res) => {
  try {
    await setContent('promise', req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('[landingConfig] PUT promise Error:', err);
    res.status(500).json({ error: 'Failed to update promise' });
  }
});

// GET all content (for the public home page, we mount under /api/site)
router.get('/content', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    let all: Record<string, unknown>;
    try {
      all = await getAllContent();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 400));
      all = await getAllContent();
    }
    if (!all.landing_visibility) {
      all.landing_visibility = defaultConfig;
    }
    res.json(all);
  } catch (err) {
    console.error('[landingConfig] GET content Error:', err);
    res.json({ landing_visibility: defaultConfig });
  }
});

export default router;
