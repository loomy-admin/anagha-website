import nodemailer from 'nodemailer';
import { getErpConfig } from './erpCatalog.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOrderInvoice(session: any, items: any[]) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] SMTP credentials missing, skipping invoice email');
    return;
  }
  if (!session.customerEmail) {
    console.warn('[mailer] No customer email provided for session', session.id);
    return;
  }

  const billNo = session.erpBillNumber || session.id.slice(0, 8).toUpperCase();
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://anaghajewellers.com';
  const { base } = getErpConfig();
  const pdfLink = session.erpBillId 
    ? `${base}/public/bills/${encodeURIComponent(session.erpBillId)}/pdf` 
    : '#';

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; font-size: 11px;">
        <strong>${item.name || 'Jewellery Item'}</strong><br/>
        <span style="color: #666; font-size: 9px;">${item.tag_number || ''}</span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-align: center; font-size: 11px;">${item.quantity || 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-align: center; font-size: 11px;">7113</td>
      <td style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-align: right; font-size: 11px;">₹${Number(item.price || item.display_price || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 8px; border-bottom: 1px solid #000; text-align: right; font-size: 11px;">₹${Number((item.price || item.display_price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</td>
    </tr>
  `
    )
    .join('');

  const totalAmount = Number(session.amount);
  const totalAmountStr = totalAmount.toLocaleString('en-IN');

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 20px; border: 1px solid #ddd;">
        
        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${apiUrl}/images/logo.png" alt="Anagha Jewellers Logo" style="max-height: 60px;" />
        </div>

        <!-- Invoice Box -->
        <div style="border: 1px solid #000;">
          
          <!-- Header Row -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #000;">
            <tr>
              <td style="padding: 10px; font-weight: bold; font-size: 16px;">SALES INVOICE</td>
              <td style="padding: 10px; text-align: right; font-size: 11px; line-height: 1.4;">
                <strong>Bill No:</strong> ${billNo}<br/>
                <strong>Date:</strong> ${date}
              </td>
            </tr>
          </table>

          <!-- Addresses Row -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #000;">
            <tr>
              <td width="50%" style="padding: 10px; border-right: 1px solid #000; font-size: 10px; line-height: 1.4; vertical-align: top;">
                <strong>ANAGHA JEWELLERS</strong><br/>
                Resala LIC Building,<br/>
                Apsara Road, Rajagopalachari St,<br/>
                Governor Peta, VIJAYAWADA - 520002<br/>
                Phone: +91 9988225888<br/>
                State Code: Andhra Pradesh
              </td>
              <td width="50%" style="padding: 10px; font-size: 10px; line-height: 1.4; vertical-align: top;">
                <span style="color: #666;">CUSTOMER DETAILS:</span><br/>
                <strong>${session.customerName?.toUpperCase() || 'N/A'}</strong><br/>
                Phone: ${session.customerMobile || 'N/A'}<br/>
                Email: <a href="mailto:${session.customerEmail}" style="color: #032C5E;">${session.customerEmail}</a>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <table width="100%" cellspacing="0" cellpadding="0">
            <thead>
              <tr>
                <th style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-align: left; font-size: 10px;">DESCRIPTION</th>
                <th style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-align: center; font-size: 10px;">PCS</th>
                <th style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-align: center; font-size: 10px;">HSN</th>
                <th style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-align: right; font-size: 10px;">Rate</th>
                <th style="padding: 8px; border-bottom: 1px solid #000; text-align: right; font-size: 10px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals Row -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #000;">
            <tr>
              <td style="padding: 8px; border-right: 1px solid #000; font-size: 10px; font-weight: bold;">TOTAL</td>
              <td width="50" style="padding: 8px; border-right: 1px solid #000; text-align: center; font-size: 10px;">${items.reduce((sum, item) => sum + (item.quantity || 1), 0)}</td>
              <td width="50" style="padding: 8px; border-right: 1px solid #000;"></td>
              <td width="80" style="padding: 8px; border-right: 1px solid #000;"></td>
              <td width="100" style="padding: 8px; text-align: right; font-size: 11px; font-weight: bold;">₹${totalAmountStr}</td>
            </tr>
          </table>

          <!-- Footer Details -->
          <table width="100%" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #000;">
            <tr>
              <td width="60%" style="padding: 10px; border-right: 1px solid #000; font-size: 10px; line-height: 1.4; vertical-align: top;">
                <strong>AMOUNT IN WORDS</strong><br/>
                <span style="color: #444;">INR ${totalAmountStr} Only</span><br/><br/>
                <strong>Payment Mode:</strong> Online / Razorpay
              </td>
              <td width="40%" style="padding: 0; vertical-align: top;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 6px 10px; font-size: 10px; border-bottom: 1px solid #ddd;">Items Subtotal</td>
                    <td style="padding: 6px 10px; font-size: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${totalAmountStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 10px; font-size: 10px; border-bottom: 1px solid #000; font-weight: bold;">TOTAL</td>
                    <td style="padding: 6px 10px; font-size: 11px; border-bottom: 1px solid #000; text-align: right; font-weight: bold;">₹${totalAmountStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 10px; font-size: 10px; border-bottom: 1px solid #ddd;">Online Transfer</td>
                    <td style="padding: 6px 10px; font-size: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${totalAmountStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 10px; font-size: 10px; font-weight: bold;">Balance Due</td>
                    <td style="padding: 6px 10px; font-size: 10px; text-align: right; font-weight: bold;">₹0</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Bank & Terms -->
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 10px; font-size: 9px; line-height: 1.4; color: #555; vertical-align: top;">
                <strong>OUR BANK DETAILS</strong><br/>
                Bank & Branch: <br/>
                A/c No: <br/>
                IFSC: 
              </td>
              <td style="padding: 10px; text-align: right; font-size: 8px; color: #777; vertical-align: bottom;">
                E.&O.E :: For Terms & Conditions SEE Overleaf.
              </td>
            </tr>
          </table>
          
          <div style="text-align: center; padding: 8px; font-size: 10px; font-weight: bold; border-top: 1px solid #000;">
            PREMIUM 92.5 SILVER JEWELLERY
          </div>
        </div>

        <!-- Download Button -->
        <div style="text-align: center; margin-top: 30px;">
          <a href="${pdfLink}" style="display: inline-block; background-color: #8B4513; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 4px; border: 1px solid #5a2e0c;">
            📥 Download PDF — Sales Invoice
          </a>
        </div>

      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || '"Anagha Jewellers" <invoices@anaghajewellers.com>',
      to: session.customerEmail,
      subject: `Order Invoice from Anagha Jewellers (#${billNo})`,
      html,
    });
    console.log('[mailer] Successfully sent invoice to', session.customerEmail);
  } catch (err) {
    console.error('[mailer] Failed to send invoice email:', err);
  }
}
