import { Router } from 'express';
import { getContent, setContent } from '../lib/content.js';

export type ShippingMethod = {
  id: string;
  name: string;
  charge: number;
  eta: string;
  enabled: boolean;
};

export type ShippingConfig = {
  methods: ShippingMethod[];
};

export const defaultShippingConfig: ShippingConfig = {
  methods: [
    {
      id: 'standard',
      name: 'Standard Delivery',
      charge: 0,
      eta: '5–7 business days',
      enabled: true,
    },
    {
      id: 'express',
      name: 'Express Delivery',
      charge: 499,
      eta: '2–3 business days',
      enabled: true,
    },
  ],
};

export async function getShippingConfig(): Promise<ShippingConfig> {
  const stored = await getContent<ShippingConfig>('shipping', defaultShippingConfig);
  const methods = Array.isArray(stored?.methods) ? stored.methods : defaultShippingConfig.methods;
  return {
    methods: methods.map((m) => ({
      id: String(m.id || '').trim(),
      name: String(m.name || 'Delivery').trim() || 'Delivery',
      charge: Number.isFinite(Number(m.charge)) ? Math.max(0, Number(m.charge)) : 0,
      eta: String(m.eta || '').trim(),
      enabled: m.enabled !== false,
    })).filter((m) => m.id),
  };
}

export async function resolveShippingMethod(id?: string | null): Promise<ShippingMethod> {
  const { methods } = await getShippingConfig();
  const enabled = methods.filter((m) => m.enabled);
  if (!enabled.length) {
    return defaultShippingConfig.methods[0];
  }
  const wanted = String(id || '').trim();
  const match = enabled.find((m) => m.id === wanted);
  if (match) return match;
  if (!wanted && enabled.length === 1) return enabled[0];
  if (!wanted) return enabled[0];
  throw Object.assign(new Error('Invalid shipping method'), { status: 400 });
}

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const config = await getShippingConfig();
    res.json({
      methods: config.methods.filter((m) => m.enabled),
      all: config.methods,
    });
  } catch (err) {
    console.error('[shipping] GET', err);
    res.status(500).json({ error: 'Failed to load shipping methods' });
  }
});

router.put('/', async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.methods) ? req.body.methods : [];
    const methods: ShippingMethod[] = incoming
      .map((m: ShippingMethod, idx: number) => ({
        id: String(m.id || `method-${idx + 1}`).trim() || `method-${idx + 1}`,
        name: String(m.name || 'Delivery').trim() || 'Delivery',
        charge: Number.isFinite(Number(m.charge)) ? Math.max(0, Number(m.charge)) : 0,
        eta: String(m.eta || '').trim(),
        enabled: m.enabled !== false,
      }))
      .filter((m: ShippingMethod) => m.id);
    await setContent('shipping', { methods });
    res.json({ success: true, methods });
  } catch (err) {
    console.error('[shipping] PUT', err);
    res.status(500).json({ error: 'Failed to save shipping methods' });
  }
});

export default router;
