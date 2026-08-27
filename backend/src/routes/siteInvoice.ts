import { Router, type Request, type Response } from 'express';
import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { checkoutSessions } from '../db/schema.js';
import {
  invoiceBillNo,
  invoiceItemsFromSession,
  renderInvoicePdf,
} from '../lib/salesInvoice.js';

const router = Router();

const PAID_STATUSES = ['paid', 'packed', 'shipped', 'delivered'] as const;

function billIdParam(req: Request) {
  const raw = req.params.id;
  return (Array.isArray(raw) ? String(raw[0] || '') : String(raw || '')).trim();
}

/**
 * GET /api/site/invoice/:id
 * Website sales invoice PDF (same content as the invoice email).
 * `:id` is checkout session id or erp_bill_id (website UUID).
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = billIdParam(req);
    if (!id) return res.status(400).json({ error: 'Bill id required' });

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const idMatch = isUuid
      ? or(eq(checkoutSessions.id, id), eq(checkoutSessions.erpBillId, id))
      : eq(checkoutSessions.erpBillId, id);

    const rows = await db
      .select()
      .from(checkoutSessions)
      .where(and(inArray(checkoutSessions.status, [...PAID_STATUSES]), idMatch))
      .limit(1);

    const session = rows[0];
    if (!session) return res.status(404).json({ error: 'Bill not found' });

    const items = invoiceItemsFromSession(session);
    const buf = await renderInvoicePdf(session, items);
    const billNo = invoiceBillNo(session);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${billNo}.pdf"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buf);
  } catch (err) {
    console.error('[site/invoice]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load bill' });
  }
});

export default router;
