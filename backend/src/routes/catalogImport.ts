import crypto from 'node:crypto';
import { Router } from 'express';
import { getCatalogSyncProgress, startCatalogSync, syncCatalogFromErp } from '../lib/syncCatalog.js';
import { invalidateCatalogFilters } from './catalog.js';

/** Admin: GET /api/upload/catalog/status, POST /api/upload/catalog/reimport */
const router = Router();

router.get('/status', (_req, res) => {
  res.json({ data: getCatalogSyncProgress() });
});

router.post('/reimport', (_req, res) => {
  const { started, progress } = startCatalogSync();
  res.status(202).json({
    data: {
      ...progress,
      started,
      message: started ? progress.message : 'A catalog sync is already running',
    },
  });
});

export default router;

function secretMatches(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Cloud Scheduler (every 15 minutes): POST /api/internal/catalog-sync with header x-sync-secret.
 * Waits for the sync to finish so Cloud Run keeps CPU allocated.
 */
export const scheduledSyncRouter = Router();

scheduledSyncRouter.post('/', async (req, res) => {
  const expected = String(process.env.CATALOG_SYNC_SECRET || '').trim();
  if (!expected) {
    res.status(503).json({ error: 'CATALOG_SYNC_SECRET is not configured' });
    return;
  }
  const given = String(req.get('x-sync-secret') || '').trim();
  if (!given || !secretMatches(given, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const result = await syncCatalogFromErp();
  invalidateCatalogFilters();
  res.status(result.ok ? 200 : 500).json({ data: result });
});
