import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { siteContent } from '../db/schema.js';

export interface ContactInfoConfig {
  whatsapp: string;
  email: string;
  phone: string;
  corporateEmail: string;
  salesEmail: string;
  instagram?: string;
  youtube?: string;
  address1?: string;
  address2?: string;
  addresses?: string[];
}

const CONTACT_INFO_KEY = 'contact_info';
const DEFAULT_CONFIG: ContactInfoConfig = {
  whatsapp: '+918074811800',
  email: 'an@anagha.com',
  phone: '18004190066',
  corporateEmail: 'corporate.sales@anagha.com',
  salesEmail: 'sales@anagha.com',
  instagram: 'https://www.instagram.com/anaghasilver_92.5?igsh=dnRiOTY4YWlzb2oy',
  youtube: 'https://www.youtube.com',
  address1: '',
  address2: '',
  addresses: [
    'Anagha Jewellery and Lifestyle Limited\nNo. 8-2-293/82/A/270, Road No. 36,\nJubilee Hills, Hyderabad – 500033\nTelangana, India',
    'Anagha Jewellery and Lifestyle Limited\n302, Dhantak Plaza, Makwana Road,\nMarol, Andheri (East)\nMumbai-59\nMaharashtra, India'
  ]
};

export async function getContactInfo(): Promise<ContactInfoConfig> {
  try {
    const res = await db
      .select({ data: siteContent.data })
      .from(siteContent)
      .where(eq(siteContent.key, CONTACT_INFO_KEY))
      .limit(1);

    if (res.length > 0 && res[0].data) {
      const data = res[0].data as Record<string, any>;
      let addresses = data.addresses || [];
      if (addresses.length === 0 && (data.address1 || data.address2)) {
        addresses = [data.address1, data.address2].filter(Boolean);
      }
      return {
        ...DEFAULT_CONFIG,
        ...data,
        addresses,
      };
    }
    return DEFAULT_CONFIG;
  } catch (err) {
    console.error('Error fetching contact info:', err);
    return DEFAULT_CONFIG;
  }
}

export async function setContactInfo(config: ContactInfoConfig): Promise<void> {
  try {
    await db
      .insert(siteContent)
      .values({
        key: CONTACT_INFO_KEY,
        data: config,
      })
      .onConflictDoUpdate({
        target: siteContent.key,
        set: { data: config },
      });
  } catch (err) {
    console.error('Error saving contact info:', err);
    throw new Error('Failed to save contact info');
  }
}
