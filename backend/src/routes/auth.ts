import { Router, type Request, type Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { websiteCustomers } from '../db/schema.js';
import {
  clearSessionCookie,
  hashPassword,
  loadCustomerFromRequest,
  publicCustomer,
  setSessionCookie,
  verifyPassword,
  requireCustomer,
} from '../lib/customerAuth.js';

const router = Router();

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function handle(err: unknown, res: Response) {
  const status =
    typeof err === 'object' && err && 'status' in err
      ? Number((err as { status: number }).status) || 500
      : 500;
  const message = err instanceof Error ? err.message : 'Auth failed';
  res.status(status).json({ error: message });
}

/** POST /api/auth/signup */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = normalizeEmail(req.body?.email || '');
    const mobile = String(req.body?.mobile || '').replace(/\D/g, '').slice(0, 10);
    const password = String(req.body?.password || '');

    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: '10-digit mobile is required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await db
      .select({ id: websiteCustomers.id })
      .from(websiteCustomers)
      .where(eq(websiteCustomers.email, email))
      .limit(1);
    if (existing[0]) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const [row] = await db
      .insert(websiteCustomers)
      .values({
        name,
        email,
        mobile,
        passwordHash,
        isAdmin: false,
      })
      .returning();

    setSessionCookie(res, row.id);
    res.status(201).json({ data: publicCustomer(row) });
  } catch (err) {
    handle(err, res);
  }
});

/** POST /api/auth/login */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email || '');
    const password = String(req.body?.password || '');
    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const rows = await db
      .select()
      .from(websiteCustomers)
      .where(eq(websiteCustomers.email, email))
      .limit(1);
    const row = rows[0];
    if (!row || !(await verifyPassword(password, row.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    setSessionCookie(res, row.id);
    res.json({ data: publicCustomer(row) });
  } catch (err) {
    handle(err, res);
  }
});

/** POST /api/auth/logout */
router.post('/logout', async (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ data: { ok: true } });
});

/** GET /api/auth/me */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const customer = await loadCustomerFromRequest(req);
    if (!customer) return res.status(401).json({ error: 'Sign in required' });
    res.json({ data: publicCustomer(customer) });
  } catch (err) {
    handle(err, res);
  }
});

/** PUT /api/auth/me */
router.put('/me', async (req: Request, res: Response) => {
  try {
    const customer = await loadCustomerFromRequest(req);
    if (!customer) return res.status(401).json({ error: 'Sign in required' });

    const name = String(req.body?.name || customer.name).trim();
    const mobile = String(req.body?.mobile || customer.mobile).replace(/\D/g, '').slice(0, 10);
    const shippingAddress = req.body?.shippingAddress || customer.shippingAddress;

    console.log('PUT /api/auth/me called with body:', JSON.stringify(req.body, null, 2));
    console.log('Setting shippingAddress to:', JSON.stringify(shippingAddress, null, 2));

    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: '10-digit mobile is required' });
    }

    let [updatedRow] = await db
      .update(websiteCustomers)
      .set({
        name,
        mobile,
        updatedAt: new Date(),
      })
      .where(eq(websiteCustomers.id, customer.id))
      .returning();

    // Workaround for Neon HTTP + Drizzle ORM JSONB array silent failure/stringification issue
    if (req.body?.shippingAddress !== undefined) {
      const addressJson = JSON.stringify(req.body.shippingAddress);
      const [rowWithAddress] = await db
        .update(websiteCustomers)
        .set({
          shippingAddress: sql`${addressJson}::jsonb`,
        })
        .where(eq(websiteCustomers.id, customer.id))
        .returning();
      
      updatedRow = rowWithAddress;
    }

    res.json({ data: publicCustomer(updatedRow) });
  } catch (err) {
    handle(err, res);
  }
});

router.put('/me/sync', requireCustomer, async (req, res) => {
  try {
    const customer = (req as any).customer;
    let updatedRow = customer;
    
    // Use the sql helper for arrays to avoid Neon HTTP stringification bugs
    if (req.body?.cart !== undefined) {
      const cartJson = JSON.stringify(req.body.cart || []);
      const [row] = await db
        .update(websiteCustomers)
        .set({ cart: sql`${cartJson}::jsonb` })
        .where(eq(websiteCustomers.id, customer.id))
        .returning();
      updatedRow = row;
    }
    
    if (req.body?.wishlist !== undefined) {
      const wishlistJson = JSON.stringify(req.body.wishlist || []);
      const [row] = await db
        .update(websiteCustomers)
        .set({ wishlist: sql`${wishlistJson}::jsonb` })
        .where(eq(websiteCustomers.id, customer.id))
        .returning();
      updatedRow = row;
    }

    res.json({ data: publicCustomer(updatedRow) });
  } catch (err) {
    handle(err, res);
  }
});

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential, accessToken } = req.body as {
      credential?: string;
      accessToken?: string;
    };

    let email = '';
    let name = 'Google User';

    if (credential) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error('GOOGLE_CLIENT_ID not configured on server');

      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload?.email) {
        return res.status(400).json({ error: 'Invalid Google token payload' });
      }
      email = normalizeEmail(payload.email);
      name = payload.name || 'Google User';
    } else if (accessToken) {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!profileRes.ok) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }
      const profile = (await profileRes.json()) as { email?: string; name?: string };
      if (!profile.email) {
        return res.status(400).json({ error: 'Invalid Google token payload' });
      }
      email = normalizeEmail(profile.email);
      name = profile.name || 'Google User';
    } else {
      return res.status(400).json({ error: 'Google credential missing' });
    }

    let [customer] = await db
      .select()
      .from(websiteCustomers)
      .where(eq(websiteCustomers.email, email))
      .limit(1);

    if (!customer) {
      const dummyPasswordHash = await hashPassword(Math.random().toString(36).slice(-10) + 'A1!');
      const [newCustomer] = await db
        .insert(websiteCustomers)
        .values({
          email,
          name,
          passwordHash: dummyPasswordHash,
          mobile: '', 
        })
        .returning();
      customer = newCustomer;
    }

    setSessionCookie(res, customer.id);
    res.json({ data: publicCustomer(customer) });
  } catch (err) {
    handle(err, res);
  }
});

export default router;
