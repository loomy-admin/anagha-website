import { Router } from 'express';
import { invalidateCatalogFilters } from './catalog.js';
import {
  createCatalogGroup,
  createCatalogTaxonomyValue,
  deleteCatalogGroup,
  deleteTaxonomyValue,
  getExtraGroups,
  moveItemsToGroup,
  renameTaxonomy,
  type TaxonomyKind,
} from '../lib/catalogTaxonomy.js';

const router = Router();

function handle(err: unknown, res: import('express').Response) {
  const status =
    typeof err === 'object' && err && 'status' in err
      ? Number((err as { status: number }).status) || 500
      : 500;
  const message = err instanceof Error ? err.message : 'Taxonomy update failed';
  res.status(status).json({ error: message });
}

router.get('/', async (_req, res) => {
  try {
    res.json({ data: { groups: await getExtraGroups() } });
  } catch (err) {
    handle(err, res);
  }
});

router.post('/groups', async (req, res) => {
  try {
    const group = await createCatalogGroup(String(req.body?.name || ''));
    invalidateCatalogFilters();
    res.status(201).json({ data: group });
  } catch (err) {
    handle(err, res);
  }
});

router.delete('/groups', async (req, res) => {
  try {
    const result = await deleteCatalogGroup(String(req.body?.from_slug || req.query.from_slug || ''));
    invalidateCatalogFilters();
    res.json({ data: result });
  } catch (err) {
    handle(err, res);
  }
});

router.patch('/', async (req, res) => {
  try {
    const kind = String(req.body?.kind || '').trim() as TaxonomyKind;
    if (!['group', 'type', 'article', 'metal', 'purity'].includes(kind)) {
      res.status(400).json({ error: 'kind must be group, type, article, metal, or purity' });
      return;
    }
    const result = await renameTaxonomy(kind, String(req.body?.from_slug || ''), String(req.body?.name || ''));
    invalidateCatalogFilters();
    res.json({ data: result });
  } catch (err) {
    handle(err, res);
  }
});

router.post('/values', async (req, res) => {
  try {
    const kind = String(req.body?.kind || '').trim();
    if (kind !== 'type' && kind !== 'article' && kind !== 'metal' && kind !== 'purity') {
      res.status(400).json({ error: 'kind must be type, article, metal, or purity' });
      return;
    }
    const value = await createCatalogTaxonomyValue(kind, String(req.body?.name || ''));
    invalidateCatalogFilters();
    res.status(201).json({ data: value });
  } catch (err) {
    handle(err, res);
  }
});

router.delete('/values', async (req, res) => {
  try {
    const kind = String(req.body?.kind || '').trim();
    if (kind !== 'type' && kind !== 'article' && kind !== 'metal' && kind !== 'purity') {
      res.status(400).json({ error: 'kind must be type, article, metal, or purity' });
      return;
    }
    const result = await deleteTaxonomyValue(kind, String(req.body?.from_slug || ''));
    invalidateCatalogFilters();
    res.json({ data: result });
  } catch (err) {
    handle(err, res);
  }
});

router.patch('/move', async (req, res) => {
  try {
    const tags = Array.isArray(req.body?.tags) ? req.body.tags.map((t: unknown) => String(t || '')) : [];
    const result = await moveItemsToGroup(tags, String(req.body?.group || ''));
    invalidateCatalogFilters();
    res.json({ data: result });
  } catch (err) {
    handle(err, res);
  }
});

export default router;
