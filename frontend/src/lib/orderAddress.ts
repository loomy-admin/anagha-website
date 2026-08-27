import type { ShippingAddress } from '@/lib/auth';

export function normalizeOrderAddress(raw: unknown): ShippingAddress | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const rows = raw.filter((row) => row && typeof row === 'object') as ShippingAddress[];
    return rows.find((row) => row.isDefault) || rows[0] || null;
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.addresses)) return normalizeOrderAddress(obj.addresses);
    if (!Object.keys(obj).length) return null;
    return obj as ShippingAddress;
  }
  return null;
}

export function formatOrderAddressLines(raw: unknown): string[] {
  const addr = normalizeOrderAddress(raw);
  if (!addr) return [];
  const pick = (...keys: (keyof ShippingAddress | string)[]) => {
    const record = addr as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key as string];
      if (value != null && String(value).trim()) return String(value).trim();
    }
    return '';
  };
  return [
    pick('recipientName', 'recipient_name', 'name'),
    pick('addressLine', 'address_line'),
    pick('street'),
    [pick('locality'), pick('landmark')].filter(Boolean).join(', '),
    [pick('city'), pick('state'), pick('pincode', 'pin')].filter(Boolean).join(', '),
    pick('mobile', 'phone') ? `Mobile: ${pick('mobile', 'phone')}` : '',
  ].filter(Boolean);
}
