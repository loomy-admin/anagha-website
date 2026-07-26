import { Router, type Request, type Response } from 'express';
import { getErpConfig } from '../lib/erpCatalog.js';

const router = Router();

function billIdParam(req: Request) {
  const raw = req.params.id;
  return (Array.isArray(raw) ? String(raw[0] || '') : String(raw || '')).trim();
}

/**
 * GET /api/site/invoice/:id
 * Proxies the ERP public bill PDF (inline) from the same ERP_API_URL used for checkout.
 * This is the official ERP bill document — not a re-rendered copy.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = billIdParam(req);
    if (!id) return res.status(400).json({ error: 'Bill id required' });

    const { base } = getErpConfig();
    const upstream = `${base}/public/bills/${encodeURIComponent(id)}/pdf`;
    const erpRes = await fetch(upstream, { headers: { Accept: 'application/pdf' } });

    if (!erpRes.ok) {
      const body = await erpRes.json().catch(() => ({}));
      return res.status(erpRes.status).json({
        error: (body as { error?: string }).error || 'Bill not found',
      });
    }

    const buf = Buffer.from(await erpRes.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="bill-${id}.pdf"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buf);
  } catch (err) {
    console.error('[site/invoice]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load bill' });
  }
});

export default router;
