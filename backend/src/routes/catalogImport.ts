import { Router } from 'express';
import { getCatalogImportProgress, startCatalogImportFromErp } from '../lib/syncCatalog.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({ data: getCatalogImportProgress() });
});

router.post('/reimport', (_req, res) => {
  const { started, progress } = startCatalogImportFromErp();
  res.status(202).json({
    data: {
      ...progress,
      started,
      message: started ? progress.message : 'Import already in progress',
    },
  });
});

export default router;
