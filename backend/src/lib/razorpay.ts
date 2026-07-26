/**
 * Razorpay Orders + Standard Checkout (opened on our /checkout/pay page).
 * Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
 */

import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Razorpay = require('razorpay') as new (opts: { key_id: string; key_secret: string }) => {
  orders: {
    create: (opts: {
      amount: number;
      currency: string;
      receipt?: string;
      notes?: Record<string, string>;
    }) => Promise<{ id?: string; amount?: number; currency?: string }>;
  };
  payments: {
    fetch: (id: string) => Promise<Record<string, unknown>>;
  };
};

export type RazorpayCheckoutResult = {
  mode: 'razorpay';
  provider: 'razorpay';
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  merchantTransactionId: string;
  displayName: string;
  /** Our site page that opens Razorpay Checkout (single clean payment screen). */
  redirectUrl: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

function keyId() {
  return String(process.env.RAZORPAY_KEY_ID || '').trim();
}

function keySecret() {
  return String(process.env.RAZORPAY_KEY_SECRET || '').trim();
}

export function razorpayConfigured() {
  return Boolean(keyId() && keySecret());
}

export function razorpayDisplayName() {
  return String(process.env.RAZORPAY_DISPLAY_NAME || 'Octis').trim() || 'Octis';
}

function publicBase() {
  return String(process.env.PUBLIC_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')[0]
    .trim()
    .replace(/\/+$/, '');
}

function client() {
  const id = keyId();
  const secret = keySecret();
  if (!id || !secret) {
    throw Object.assign(new Error('Razorpay keys not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)'), {
      status: 500,
    });
  }
  return new Razorpay({ key_id: id, key_secret: secret });
}

function razorpayError(err: unknown, fallback: string) {
  const obj = typeof err === 'object' && err ? (err as Record<string, unknown>) : null;
  const nested =
    obj?.error && typeof obj.error === 'object' ? (obj.error as Record<string, unknown>) : null;
  const description = String(
    nested?.description || nested?.message || (err instanceof Error ? err.message : '') || fallback,
  );
  const statusCode = Number(obj?.statusCode || nested?.status || 502) || 502;
  return Object.assign(new Error(description), { status: statusCode, raw: err });
}

export function inrToPaise(amountInr: number) {
  const paise = Math.round(Number(amountInr) * 100);
  if (!Number.isFinite(paise) || paise < 100) {
    throw Object.assign(new Error('Amount must be at least ₹1.00 for Razorpay'), { status: 400 });
  }
  return paise;
}

function sanitizeContact(contact?: string) {
  const raw = String(contact || '').replace(/\D/g, '');
  if (raw.length < 10 || raw.length > 15) return undefined;
  if (/(.)\1{5,}/.test(raw)) return undefined; // e.g. 9999999999
  return raw.slice(-10);
}

/** Create Order; frontend opens Standard Checkout on /checkout/pay. */
export async function createRazorpayOrder(input: {
  amountInr: number;
  receipt: string;
  sessionId: string;
  notes?: Record<string, string>;
  customer?: { name?: string; email?: string; contact?: string };
}): Promise<RazorpayCheckoutResult> {
  const amountPaise = inrToPaise(input.amountInr);
  const receipt = String(input.receipt || '').slice(0, 40);
  const rzp = client();

  let order: { id?: string; amount?: number; currency?: string };
  try {
    order = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        session_id: input.sessionId,
        ...(input.notes || {}),
      },
    });
  } catch (err) {
    throw razorpayError(err, 'Razorpay order create failed');
  }

  const orderId = String(order.id || '');
  if (!orderId) {
    throw Object.assign(new Error('Razorpay did not return an order id'), { status: 502 });
  }

  const contact = sanitizeContact(input.customer?.contact);

  return {
    mode: 'razorpay',
    provider: 'razorpay',
    keyId: keyId(),
    orderId,
    amountPaise,
    currency: 'INR',
    merchantTransactionId: receipt,
    displayName: razorpayDisplayName(),
    redirectUrl: `${publicBase()}/checkout/pay?session=${encodeURIComponent(input.sessionId)}`,
    prefill: {
      name: input.customer?.name,
      email: input.customer?.email,
      contact,
    },
  };
}

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = keySecret();
  if (!secret) return false;
  const body = `${input.orderId}|${input.paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(input.signature || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function fetchRazorpayPayment(paymentId: string) {
  try {
    return await client().payments.fetch(paymentId);
  } catch (err) {
    throw razorpayError(err, 'Razorpay payment fetch failed');
  }
}
