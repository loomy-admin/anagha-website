import { Router, type Request, type Response } from 'express';
import { getContactInfo, setContactInfo } from '../lib/contactInfo.js';
import { sendSupportQueryEmail } from '../lib/mailer.js';

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

router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, query } = req.body;
    
    if (!name || !email || !query) {
      return res.status(400).json({ error: 'Name, email, and query are required.' });
    }

    const config = await getContactInfo();
    const targetEmail = config.supportEmail || 'support@anagha.com';

    await sendSupportQueryEmail({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: String(phone || '').trim(),
      query: String(query).trim(),
    }, targetEmail);

    res.json({ success: true, message: 'Query submitted successfully' });
  } catch (error) {
    console.error('Error submitting contact query:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const { whatsapp, email, phone, corporateEmail, salesEmail, supportEmail, instagram, youtube, address1, address2, addresses } = req.body;
    
    await setContactInfo({ 
      whatsapp: String(whatsapp || '').trim(), 
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      corporateEmail: String(corporateEmail || '').trim(),
      salesEmail: String(salesEmail || '').trim(),
      supportEmail: String(supportEmail || '').trim(),
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
