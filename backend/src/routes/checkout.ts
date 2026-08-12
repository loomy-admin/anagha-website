import { Router, type Request, type Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { checkoutSessions } from '../db/schema.js';
import { reserveOnErp, releaseOnErp, completeOnErp } from '../lib/erpWebstore.js';
import { requireCustomer } from '../lib/customerAuth.js';
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  fetchRazorpayPayment,
} from '../lib/razorpay.js';
import { sendOrderInvoice } from '../lib/mailer.js';

const router = Router();

/** Express 5 types params as string | string[]; Drizzle eq() needs a string. */
function paramId(req: Request, name = 'id'): string {
  const raw = req.params[name];
  return Array.isArray(raw) ? String(raw[0] || '') : String(raw || '');
}

function handle(err: unknown, res: Response) {
  const obj = typeof err === 'object' && err ? (err as Record<string, unknown>) : null;
  const status =
    obj && ('status' in obj || 'statusCode' in obj)
      ? Number(obj.status || obj.statusCode) || 500
      : 500;

  let message = 'Checkout failed';
  if (err instanceof Error && err.message) {
    message = err.message;
  } else if (obj?.error && typeof obj.error === 'object') {
    const nested = obj.error as Record<string, unknown>;
    message = String(nested.description || nested.message || nested.code || message);
  } else if (obj && typeof obj.message === 'string') {
    message = obj.message;
  } else if (typeof err === 'string') {
    message = err;
  }

  console.error('[checkout]', status, message, err);
  res.status(status).json({ error: message });
}

function parseTagNumbers(tagNumber: string): string[] {
  return String(tagNumber || '')
    .split('|')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

function namesFromLines(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((line) => {
      if (!line || typeof line !== 'object') return '';
      const row = line as {
        description?: unknown;
        name?: unknown;
        article?: unknown;
        product_name?: unknown;
      };
      return String(
        row.description || row.name || row.article || row.product_name || '',
      ).trim();
    })
    .filter(Boolean);
}

function itemNamesFromPayload(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as {
    items?: unknown;
    item_names?: unknown;
    complete?: { bill?: { items?: unknown }; items?: unknown };
  };

  if (Array.isArray(root.item_names)) {
    const named = root.item_names
      .map((n) => String(n || '').trim())
      .filter(Boolean);
    if (named.length) return named;
  }

  const fromCart = namesFromLines(root.items);
  if (fromCart.length) return fromCart;

  const fromBill = namesFromLines(root.complete?.bill?.items);
  if (fromBill.length) return fromBill;

  return namesFromLines(root.complete?.items);
}

/** Website bill page (header/footer + embed). */
function billUrlFor(billId: string | null | undefined) {
  const id = String(billId || '').trim();
  if (!id) return null;
  return `/bill/${encodeURIComponent(id)}`;
}

function publicSession(row: typeof checkoutSessions.$inferSelect) {
  const tagNumbers = parseTagNumbers(row.tagNumber);
  const itemNames = itemNamesFromPayload(row.paymentPayload);
  return {
    id: row.id,
    status: row.status,
    tag_number: tagNumbers[0] || row.tagNumber,
    tag_numbers: tagNumbers,
    item_names: itemNames,
    amount: Number(row.amount),
    currency: row.currency,
    customer_name: row.customerName,
    customer_mobile: row.customerMobile,
    customer_email: row.customerEmail,
    erp_bill_id: row.erpBillId,
    erp_bill_number: row.erpBillNumber,
    bill_url: billUrlFor(row.erpBillId),
    expires_at: row.expiresAt,
    created_at: row.createdAt,
    payment_provider: 'razorpay' as const,
  };
}

async function finalizePaidSession(sessionId: string, paymentRef: string) {
  const rows = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, sessionId))
    .limit(1);
  const session = rows[0];
  if (!session) {
    throw Object.assign(new Error('Checkout session not found'), { status: 404 });
  }
  if (session.status === 'paid') {
    return session;
  }
  if (session.status !== 'pending' && session.status !== 'payment_initiated') {
    throw Object.assign(new Error(`Session cannot be completed from status ${session.status}`), {
      status: 409,
    });
  }
  if (!session.customerName || !session.customerMobile) {
    throw Object.assign(new Error('Customer details missing on session'), { status: 400 });
  }

  const complete = await completeOnErp({
    checkoutSessionId: session.id,
    paymentRef,
    paidAmount: Number(session.amount),
    customer: {
      name: session.customerName,
      mobile: session.customerMobile,
      email: session.customerEmail || undefined,
    },
  });

  const prevPayload =
    session.paymentPayload && typeof session.paymentPayload === 'object'
      ? (session.paymentPayload as Record<string, unknown>)
      : {};

  const billItems = Array.isArray(complete?.bill?.items) ? complete.bill.items : [];
  const cartItems = Array.isArray(prevPayload.items) ? prevPayload.items : [];
  const itemNames = namesFromLines(billItems.length ? billItems : cartItems);

  const [updated] = await db
    .update(checkoutSessions)
    .set({
      status: 'paid',
      razorpayPaymentId: paymentRef,
      erpBillId: complete.bill?.id || null,
      erpBillNumber: complete.bill?.bill_number || null,
      paymentPayload: {
        ...prevPayload,
        items: cartItems.length ? cartItems : billItems,
        item_names: itemNames,
        complete,
        paymentRef,
      },
      updatedAt: new Date(),
    })
    .where(eq(checkoutSessions.id, session.id))
    .returning();

  return updated;
}

/** POST /api/checkout/session — reserve ERP item(s) + Razorpay order (auth required). */
router.post('/session', requireCustomer, async (req: Request, res: Response) => {
  try {
    const customer = req.customer!;
    const fromList = Array.isArray(req.body.tag_numbers) ? req.body.tag_numbers : [];
    const tags = [
      ...fromList.map((t: unknown) => String(t || '').trim().toUpperCase()),
      String(req.body.tag_number || '').trim().toUpperCase(),
    ].filter(Boolean);
    const uniqueTags = [...new Set(tags)];
    const name = customer.name;
    const mobile = customer.mobile;
    const email = customer.email;

    if (!uniqueTags.length) {
      return res.status(400).json({ error: 'tag_number or tag_numbers is required' });
    }
    if (uniqueTags.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 items per checkout' });
    }
    if (!name || !mobile) {
      return res.status(400).json({ error: 'Account is missing name or mobile' });
    }

    const sessionId = uuidv4();
    const receipt = `ANAGHA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const reserved = await reserveOnErp({
      checkoutSessionId: sessionId,
      tags: uniqueTags,
    });

    const amount = Number(reserved.total_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      await releaseOnErp(sessionId).catch(() => undefined);
      return res.status(400).json({ error: 'Reserved item has invalid amount' });
    }

    const lines = Array.isArray(reserved.items) ? reserved.items : [];
    const line = lines[0];
    const expiresAt = reserved.expires_at ? new Date(reserved.expires_at) : null;
    const tagKey = uniqueTags.join('|');

    try {
      await db.insert(checkoutSessions).values({
        id: sessionId,
        status: 'pending',
        tagNumber: tagKey,
        inventoryId: line?.inventory_id || null,
        amount: String(amount),
        currency: 'INR',
        websiteCustomerId: customer.id,
        customerName: name,
        customerMobile: mobile,
        customerEmail: email || null,
        shippingAddress: customer.shippingAddress || {},
        paymentPayload: { cart_tags: uniqueTags, items: lines },
        expiresAt,
      });

      const rzp = await createRazorpayOrder({
        amountInr: amount,
        receipt: receipt.slice(0, 40),
        sessionId,
        notes: {
          tag_number: uniqueTags[0],
          tag_count: String(uniqueTags.length),
        },
        customer: {
          name,
          email: email || undefined,
          contact: mobile,
        },
      });

      const payment = {
        ...(rzp as unknown as Record<string, unknown>),
        cart_tags: uniqueTags,
        items: lines,
      };

      await db
        .update(checkoutSessions)
        .set({
          status: 'payment_initiated',
          razorpayOrderId: rzp.orderId,
          paymentPayload: payment,
          updatedAt: new Date(),
        })
        .where(eq(checkoutSessions.id, sessionId));

      const rows = await db
        .select()
        .from(checkoutSessions)
        .where(eq(checkoutSessions.id, sessionId))
        .limit(1);

      res.json({
        data: {
          session: publicSession(rows[0]),
          payment,
        },
      });
    } catch (inner) {
      await releaseOnErp(sessionId).catch(() => undefined);
      await db
        .update(checkoutSessions)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(checkoutSessions.id, sessionId))
        .catch(() => undefined);
      throw inner;
    }
  } catch (err) {
    handle(err, res);
  }
});

/** GET /api/checkout/my-orders — purchase history for signed-in customer */
router.get('/my-orders', requireCustomer, async (req: Request, res: Response) => {
  try {
    const customer = req.customer!;
    const rows = await db
      .select()
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.websiteCustomerId, customer.id),
          eq(checkoutSessions.status, 'paid'),
        ),
      )
      .orderBy(desc(checkoutSessions.createdAt))
      .limit(50);

    res.json({ data: rows.map(publicSession) });
  } catch (err) {
    handle(err, res);
  }
});

/** GET /api/checkout/session/:id */
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, paramId(req)))
      .limit(1);
    if (!rows[0]) return res.status(404).json({ error: 'Session not found' });
    res.json({ data: publicSession(rows[0]) });
  } catch (err) {
    handle(err, res);
  }
});

/** POST /api/checkout/session/:id/cancel — release ERP hold */
router.post('/session/:id/cancel', async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, paramId(req)))
      .limit(1);
    const session = rows[0];
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'paid') {
      return res.status(409).json({ error: 'Paid session cannot be cancelled' });
    }

    await releaseOnErp(session.id).catch(() => undefined);
    const [updated] = await db
      .update(checkoutSessions)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(checkoutSessions.id, session.id))
      .returning();

    res.json({ data: publicSession(updated) });
  } catch (err) {
    handle(err, res);
  }
});

/**
 * POST /api/checkout/session/:id/confirm-razorpay
 * After Standard Checkout success handler.
 * Body: razorpay_order_id, razorpay_payment_id, razorpay_signature
 */
router.post('/session/:id/confirm-razorpay', async (req: Request, res: Response) => {
  try {
    const sessionId = paramId(req);
    const orderId = String(req.body.razorpay_order_id || '').trim();
    const paymentId = String(req.body.razorpay_payment_id || '').trim();
    const signature = String(req.body.razorpay_signature || '').trim();

    const rows = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, sessionId))
      .limit(1);
    const session = rows[0];
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'paid') {
      return res.json({ data: publicSession(session) });
    }

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        error: 'razorpay_order_id, razorpay_payment_id and razorpay_signature are required',
      });
    }

    const expectedOrderId = String(session.razorpayOrderId || '');
    if (expectedOrderId && expectedOrderId !== orderId) {
      return res.status(400).json({ error: 'Order id does not match this checkout session' });
    }

    const ok = verifyRazorpayPaymentSignature({ orderId, paymentId, signature });
    if (!ok) {
      await releaseOnErp(session.id).catch(() => undefined);
      await db
        .update(checkoutSessions)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(checkoutSessions.id, session.id));
      return res.status(402).json({ error: 'Invalid Razorpay payment signature' });
    }

    try {
      const payment = await fetchRazorpayPayment(paymentId);
      const payStatus = String(payment.status || '').toLowerCase();
      const payOrder = String(payment.order_id || '');
      if (payOrder && payOrder !== orderId) {
        return res.status(400).json({ error: 'Payment does not belong to this order' });
      }
      if (payStatus && payStatus !== 'captured' && payStatus !== 'authorized') {
        return res.status(402).json({
          error: `Payment status is ${payStatus}`,
          data: { session: publicSession(session) },
        });
      }
    } catch (fetchErr) {
      console.warn('[razorpay] payment fetch failed after signature ok', fetchErr);
    }

    const updated = await finalizePaidSession(session.id, paymentId);
    
    if (updated.customerEmail) {
      const prevPayload = typeof updated.paymentPayload === 'object' ? (updated.paymentPayload as any) : {};
      const items = Array.isArray(prevPayload.items) ? prevPayload.items : [];
      sendOrderInvoice(updated, items).catch(err => {
        console.error('[checkout] Error triggering invoice email', err);
      });
    }

    res.json({ data: publicSession(updated) });
  } catch (err) {
    handle(err, res);
  }
});

/** GET /api/checkout/session/:id/payment — payload for /checkout/pay */
router.get('/session/:id/payment', async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, paramId(req)))
      .limit(1);
    const session = rows[0];
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'paid') {
      return res.json({ data: { session: publicSession(session), payment: null } });
    }
    if (session.status !== 'pending' && session.status !== 'payment_initiated') {
      return res.status(409).json({ error: `Session is ${session.status}` });
    }
    const payment =
      session.paymentPayload && typeof session.paymentPayload === 'object'
        ? session.paymentPayload
        : null;
    res.json({ data: { session: publicSession(session), payment } });
  } catch (err) {
    handle(err, res);
  }
});

export default router;
