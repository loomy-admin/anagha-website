import { Router, type Request, type Response } from 'express';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { checkoutSessions } from '../db/schema.js';
import { reserveWebsiteTags, releaseWebsiteTags, markWebsiteTagsSold } from '../lib/websiteInventory.js';
import { requireCustomer, requireAdmin } from '../lib/customerAuth.js';
import { resolveShippingMethod, getShippingConfig } from './shippingConfig.js';
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  fetchRazorpayPayment,
} from '../lib/razorpay.js';
import { sendOrderInvoice, sendOrderConfirmationEmail, sendOrderTrackingEmail } from '../lib/mailer.js';

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
        row.name || row.product_name || row.article || row.description || '',
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
  return `/api/site/invoice/${encodeURIComponent(id)}`;
}

function orderIdFor(row: typeof checkoutSessions.$inferSelect) {
  return String(row.erpBillNumber || `AJ-${String(row.id).slice(0, 8).toUpperCase()}`);
}

function publicLineItems(row: typeof checkoutSessions.$inferSelect) {
  const tagNumbers = parseTagNumbers(row.tagNumber);
  const names = itemNamesFromPayload(row.paymentPayload);
  const payload =
    row.paymentPayload && typeof row.paymentPayload === 'object'
      ? (row.paymentPayload as { items?: unknown })
      : {};
  const fromCart = Array.isArray(payload.items) ? payload.items : [];
  if (fromCart.length) {
    return fromCart.map((line, idx) => {
      const item = line && typeof line === 'object' ? (line as Record<string, unknown>) : {};
      const tag = String(item.tag_number || tagNumbers[idx] || '').trim().toUpperCase();
      const name = String(
        item.name || item.product_name || item.article || item.description || names[idx] || 'Jewellery',
      ).trim();
      return { name, tag_number: tag };
    });
  }
  return tagNumbers.map((tag, idx) => ({
    name: names[idx] || 'Jewellery',
    tag_number: tag,
  }));
}

const FULFILLMENT_STATUSES = ['paid', 'packed', 'shipped', 'delivered'] as const;

function asAddressObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const rows = raw.filter((row) => row && typeof row === 'object') as Record<string, unknown>[];
    const preferred = rows.find((row) => row.isDefault) || rows[0];
    return preferred ? { ...preferred } : {};
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.addresses)) return asAddressObject(obj.addresses);
    return { ...obj };
  }
  return {};
}

function publicSession(row: typeof checkoutSessions.$inferSelect) {
  const tagNumbers = parseTagNumbers(row.tagNumber);
  const items = publicLineItems(row);
  const itemNames = items.map((item) => item.name).filter(Boolean);
  const itemsAmount = Number(row.itemsAmount ?? row.amount);
  const shippingAmount = Number(row.shippingAmount || 0);
  const orderId = orderIdFor(row);
  return {
    id: row.id,
    order_id: orderId,
    status: row.status,
    tag_number: tagNumbers[0] || row.tagNumber,
    tag_numbers: tagNumbers,
    item_names: itemNames,
    items,
    amount: Number(row.amount),
    items_amount: Number.isFinite(itemsAmount) ? itemsAmount : Number(row.amount),
    shipping_amount: Number.isFinite(shippingAmount) ? shippingAmount : 0,
    shipping_method_id: row.shippingMethodId,
    shipping_method_name: row.shippingMethodName,
    shipping_eta: row.shippingEta || null,
    currency: row.currency,
    customer_name: row.customerName,
    customer_mobile: row.customerMobile,
    customer_email: row.customerEmail,
    erp_bill_id: row.erpBillId || row.id,
    erp_bill_number: orderId,
    bill_url: billUrlFor(row.erpBillId || row.id),
    shipping_address: asAddressObject(row.shippingAddress),
    courier_name: row.courierName,
    tracking_number: row.trackingNumber,
    tracking_url: row.trackingUrl,
    packed_at: row.packedAt,
    shipped_at: row.shippedAt,
    delivered_at: row.deliveredAt,
    expires_at: row.expiresAt,
    created_at: row.createdAt,
    payment_provider: 'razorpay' as const,
  };
}

async function withDeliveryEta(row: typeof checkoutSessions.$inferSelect) {
  const pub = publicSession(row);
  if (pub.shipping_eta) return pub;
  const methodId = String(row.shippingMethodId || '').trim();
  if (!methodId) return pub;
  try {
    const { methods } = await getShippingConfig();
    const match = methods.find((m) => m.id === methodId);
    return { ...pub, shipping_eta: match?.eta || null };
  } catch {
    return pub;
  }
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

  const complete = {
    bill: {
      id: session.id,
      bill_number: session.erpBillNumber || `AJ-${String(session.id).slice(0, 8).toUpperCase()}`,
    },
  };

  await markWebsiteTagsSold(parseTagNumbers(session.tagNumber));

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
      erpBillId: complete.bill.id,
      erpBillNumber: complete.bill.bill_number,
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

/** POST /api/checkout/session — reserve website catalog tags + Razorpay order (auth required). */
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

    const reserved = await reserveWebsiteTags(uniqueTags);

    const itemsAmount = Number(reserved.total_amount);
    if (!Number.isFinite(itemsAmount) || itemsAmount < 0) {
      await releaseWebsiteTags(uniqueTags).catch(() => undefined);
      return res.status(400).json({ error: 'Reserved item has invalid amount' });
    }

    let shipping;
    try {
      shipping = await resolveShippingMethod(req.body.shipping_method_id);
    } catch (shipErr) {
      await releaseWebsiteTags(uniqueTags).catch(() => undefined);
      throw shipErr;
    }
    const shippingAmount = Number(shipping.charge) || 0;
    const amount = itemsAmount + shippingAmount;
    if (!Number.isFinite(amount) || amount < 1) {
      await releaseWebsiteTags(uniqueTags).catch(() => undefined);
      return res.status(400).json({ error: 'Order total must be at least ₹1 after offers' });
    }

    const selectedAddress = asAddressObject(
      req.body.shippingAddress || customer.shippingAddress,
    );

    const lines = Array.isArray(reserved.items) ? reserved.items : [];
    const line = lines[0];
    const expiresAt = reserved.expires_at ? new Date(reserved.expires_at) : null;
    const tagKey = uniqueTags.join('|');
    const addressJson = JSON.stringify(selectedAddress);

    try {
      await db.insert(checkoutSessions).values({
        id: sessionId,
        status: 'pending',
        tagNumber: tagKey,
        inventoryId: line?.inventory_id || null,
        amount: String(amount),
        itemsAmount: String(itemsAmount),
        shippingAmount: String(shippingAmount),
        shippingMethodId: shipping.id,
        shippingMethodName: shipping.name,
        shippingEta: shipping.eta || null,
        currency: 'INR',
        websiteCustomerId: customer.id,
        customerName: name,
        customerMobile: mobile,
        customerEmail: email || null,
        shippingAddress: sql`${addressJson}::jsonb`,
        paymentPayload: {
          cart_tags: uniqueTags,
          items: lines,
          offer: reserved.offer || null,
          items_subtotal: reserved.items_subtotal,
        },
        erpBillId: sessionId,
        erpBillNumber: `AJ-${sessionId.slice(0, 8).toUpperCase()}`,
        expiresAt,
      });

      const rzp = await createRazorpayOrder({
        amountInr: amount,
        receipt: receipt.slice(0, 40),
        sessionId,
        notes: {
          tag_number: uniqueTags[0],
          tag_count: String(uniqueTags.length),
          shipping_method: shipping.id,
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
        offer: reserved.offer || null,
        items_subtotal: reserved.items_subtotal,
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
          session: await withDeliveryEta(rows[0]),
          payment,
        },
      });
    } catch (inner) {
      await releaseWebsiteTags(uniqueTags).catch(() => undefined);
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
          inArray(checkoutSessions.status, [...FULFILLMENT_STATUSES]),
        ),
      )
      .orderBy(desc(checkoutSessions.createdAt))
      .limit(50);

    res.json({ data: await Promise.all(rows.map(withDeliveryEta)) });
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
    res.json({ data: await withDeliveryEta(rows[0]) });
  } catch (err) {
    handle(err, res);
  }
});

/** POST /api/checkout/session/:id/cancel — release website catalog hold */
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

    await releaseWebsiteTags(parseTagNumbers(session.tagNumber)).catch(() => undefined);
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
      return res.json({ data: await withDeliveryEta(session) });
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
      await releaseWebsiteTags(parseTagNumbers(session.tagNumber)).catch(() => undefined);
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

    const wasUnpaid = session.status !== 'paid';
    const updated = await finalizePaidSession(session.id, paymentId);

    if (wasUnpaid) queuePaidEmails(updated);

    res.json({ data: await withDeliveryEta(updated) });
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
      return res.json({ data: { session: await withDeliveryEta(session), payment: null } });
    }
    if (session.status !== 'pending' && session.status !== 'payment_initiated') {
      return res.status(409).json({ error: `Session is ${session.status}` });
    }
    const payment =
      session.paymentPayload && typeof session.paymentPayload === 'object'
        ? session.paymentPayload
        : null;
    res.json({ data: { session: await withDeliveryEta(session), payment } });
  } catch (err) {
    handle(err, res);
  }
});

const STATUS_RANK: Record<string, number> = {
  paid: 0,
  packed: 1,
  shipped: 2,
  delivered: 3,
};

function itemsFromSession(session: typeof checkoutSessions.$inferSelect) {
  const payload = session.paymentPayload && typeof session.paymentPayload === 'object'
    ? (session.paymentPayload as Record<string, unknown>)
    : {};
  return Array.isArray(payload.items) ? payload.items : [];
}

function queuePaidEmails(session: typeof checkoutSessions.$inferSelect | undefined) {
  if (!session?.customerEmail) {
    console.warn('[checkout] skip paid emails — no customer email', session?.id);
    return;
  }
  const items = itemsFromSession(session);
  console.log('[checkout] sending invoice + confirmation to', session.customerEmail, 'order', session.id);
  sendOrderInvoice(session, items)
    .then(() => sendOrderConfirmationEmail(session, items))
    .catch((err) => {
      console.error('[checkout] paid emails failed', err);
    });
}

function queueTrackingEmail(session: typeof checkoutSessions.$inferSelect | undefined) {
  if (!session?.customerEmail) {
    console.warn('[checkout] skip tracking email — no customer email', session?.id);
    return;
  }
  console.log('[checkout] sending tracking email to', session.customerEmail, 'status', session.status, 'order', session.id);
  sendOrderTrackingEmail(session, itemsFromSession(session)).catch((err) => {
    console.error('[checkout] tracking email failed', err);
  });
}

/** GET /api/checkout/admin/orders — paid + fulfillment queue */
router.get('/admin/orders', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(checkoutSessions)
      .where(inArray(checkoutSessions.status, [...FULFILLMENT_STATUSES]))
      .orderBy(desc(checkoutSessions.createdAt))
      .limit(200);
    res.json({ data: await Promise.all(rows.map(withDeliveryEta)) });
  } catch (err) {
    handle(err, res);
  }
});

/** PATCH /api/checkout/admin/orders/:id — pack / ship / deliver + tracking */
router.patch('/admin/orders/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, paramId(req)))
      .limit(1);
    const session = rows[0];
    if (!session) return res.status(404).json({ error: 'Order not found' });
    if (!FULFILLMENT_STATUSES.includes(session.status as (typeof FULFILLMENT_STATUSES)[number])) {
      return res.status(409).json({ error: `Order cannot be fulfilled from status ${session.status}` });
    }

    const nextStatus = String(req.body.status || session.status).trim();
    if (!FULFILLMENT_STATUSES.includes(nextStatus as (typeof FULFILLMENT_STATUSES)[number])) {
      return res.status(400).json({ error: 'Invalid fulfillment status' });
    }
    if ((STATUS_RANK[nextStatus] ?? -1) < (STATUS_RANK[session.status] ?? 0)) {
      return res.status(400).json({ error: 'Cannot move an order backward' });
    }

    const courierName =
      req.body.courier_name !== undefined
        ? String(req.body.courier_name || '').trim() || null
        : session.courierName;
    const trackingNumber =
      req.body.tracking_number !== undefined
        ? String(req.body.tracking_number || '').trim() || null
        : session.trackingNumber;
    const trackingUrl =
      req.body.tracking_url !== undefined
        ? String(req.body.tracking_url || '').trim() || null
        : session.trackingUrl;

    const now = new Date();
    const [updated] = await db
      .update(checkoutSessions)
      .set({
        status: nextStatus,
        courierName,
        trackingNumber,
        trackingUrl,
        packedAt: (STATUS_RANK[nextStatus] ?? 0) >= 1 ? session.packedAt || now : session.packedAt,
        shippedAt: (STATUS_RANK[nextStatus] ?? 0) >= 2 ? session.shippedAt || now : session.shippedAt,
        deliveredAt: (STATUS_RANK[nextStatus] ?? 0) >= 3 ? session.deliveredAt || now : session.deliveredAt,
        updatedAt: now,
      })
      .where(eq(checkoutSessions.id, session.id))
      .returning();

    const statusChanged = nextStatus !== session.status;
    const trackingChanged =
      courierName !== session.courierName ||
      trackingNumber !== session.trackingNumber ||
      trackingUrl !== session.trackingUrl;
    if (statusChanged || trackingChanged) queueTrackingEmail(updated);

    res.json({ data: await withDeliveryEta(updated) });
  } catch (err) {
    handle(err, res);
  }
});

export default router;
