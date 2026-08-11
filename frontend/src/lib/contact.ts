import { useState, useEffect } from 'react';

export interface ContactInfo {
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

const DEFAULT_CONTACT: ContactInfo = {
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
  ],
};

// Global cache to avoid refetching multiple times on client
let cachedContactInfo: ContactInfo | null = null;
let fetchPromise: Promise<ContactInfo> | null = null;

export function useContactInfo() {
  const [contact, setContact] = useState<ContactInfo>(cachedContactInfo || DEFAULT_CONTACT);

  useEffect(() => {
    if (cachedContactInfo) {
      setContact(cachedContactInfo);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetch('/api/site/contact')
        .then((res) => (res.ok ? res.json() : DEFAULT_CONTACT))
        .catch(() => DEFAULT_CONTACT);
    }

    fetchPromise.then((data) => {
      cachedContactInfo = data;
      setContact(data);
    });
  }, []);

  return contact;
}
