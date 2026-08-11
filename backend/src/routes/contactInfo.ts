import { Router, type Request, type Response } from 'express';
import { getContactInfo, setContactInfo } from '../lib/contactInfo.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await getContactInfo();
    res.json(config);
  } catch (error) {
    console.error('Error getting contact info:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const { whatsapp, email, phone, corporateEmail, salesEmail, instagram, youtube, address1, address2, addresses } = req.body;
    
    await setContactInfo({ 
      whatsapp: String(whatsapp || '').trim(), 
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      corporateEmail: String(corporateEmail || '').trim(),
      salesEmail: String(salesEmail || '').trim(),
      address1: String(address1 || '').trim(),
      address2: String(address2 || '').trim(),
      instagram: String(instagram || '').trim(),
      youtube: String(youtube || '').trim(),
      addresses: Array.isArray(addresses) ? addresses.map(String) : [],
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving contact info:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
