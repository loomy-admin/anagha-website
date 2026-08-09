import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { websiteCustomers } from '../db/schema.js';

export const SESSION_COOKIE = 'anagha_customer';
const SESSION_DAYS = 30;

export type PublicCustomer = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  is_admin: boolean;
  shippingAddress?: unknown;
};

type SessionPayload = {
  sub: string;
  exp: number;
};

function sessionSecret() {
  const secret = String(process.env.SESSION_SECRET || '').trim();
  if (!secret || secret.length < 16) {
    throw Object.assign(
      new Error('SESSION_SECRET is not configured (min 16 characters)'),
      { status: 503 },
    );
  }
  return secret;
}

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf.toString('base64url');
}

function signPayload(payload: SessionPayload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload?.sub || !payload?.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function setSessionCookie(res: Response, customerId: string) {
  const token = signPayload({
    sub: customerId,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
  const secure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  const secure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true';
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  });
}

export function publicCustomer(
  row: typeof websiteCustomers.$inferSelect,
): PublicCustomer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    is_admin: Boolean(row.isAdmin),
    shippingAddress: row.shippingAddress,
  };
}

export async function loadCustomerFromRequest(req: Request) {
  const token = String(req.cookies?.[SESSION_COOKIE] || '').trim();
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const rows = await db
    .select()
    .from(websiteCustomers)
    .where(eq(websiteCustomers.id, payload.sub))
    .limit(1);
  return rows[0] || null;
}

/** Attaches req.customer when session valid; otherwise 401. */
export async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await loadCustomerFromRequest(req);
    if (!customer) {
      return res.status(401).json({ error: 'Sign in required' });
    }
    (req as Request & { customer: typeof customer }).customer = customer;
    next();
  } catch (err) {
    const status =
      typeof err === 'object' && err && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500;
    const message = err instanceof Error ? err.message : 'Auth failed';
    res.status(status).json({ error: message });
  }
}

/** Admin CMS / upload APIs only. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await loadCustomerFromRequest(req);
    if (!customer) {
      return res.status(401).json({ error: 'Sign in required' });
    }
    if (!customer.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    (req as Request & { customer: typeof customer }).customer = customer;
    next();
  } catch (err) {
    const status =
      typeof err === 'object' && err && 'status' in err
        ? Number((err as { status: number }).status) || 500
        : 500;
    const message = err instanceof Error ? err.message : 'Auth failed';
    res.status(status).json({ error: message });
  }
}

declare global {
  namespace Express {
    interface Request {
      customer?: typeof websiteCustomers.$inferSelect;
    }
  }
}
