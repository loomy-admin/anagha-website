import nodemailer from 'nodemailer';
import { confirmationHtml, htmlForFulfillment, orderNumber } from './orderEmails.js';
import {
  buildInvoiceHtml,
  invoiceBillNo,
  invoiceItemsFromSession,
  renderInvoicePdf,
} from './salesInvoice.js';

const smtpPort = Number(process.env.SMTP_PORT) || 465;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendHtmlMail(to: string, subject: string, html: string, kind: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] SMTP credentials missing, skipping', kind, 'email');
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || '"Anagha Jewellers" <invoices@anaghajewellers.com>',
      to,
      subject,
      html,
    });
    console.log('[mailer] Sent', kind, 'email to', to);
  } catch (err) {
    console.error('[mailer] Failed to send', kind, 'email:', err);
  }
}

/** Sales invoice after Razorpay payment. PDF is generated on the website, not ERP. */
export async function sendOrderInvoice(session: any, items: any[]) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] SMTP credentials missing, skipping invoice email');
    return;
  }
  if (!session.customerEmail) {
    console.warn('[mailer] No customer email provided for session', session.id);
    return;
  }

  const lineItems =
    Array.isArray(items) && items.length ? items : invoiceItemsFromSession(session);
  const billNo = invoiceBillNo(session);
  const html = buildInvoiceHtml(session, lineItems);
  const pdf = await renderInvoicePdf(session, lineItems);

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || '"Anagha Jewellers" <invoices@anaghajewellers.com>',
      to: session.customerEmail,
      subject: `Order Invoice from Anagha Jewellers (#${billNo})`,
      html,
      attachments: [
        {
          filename: `Invoice-${billNo}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });
    console.log('[mailer] Successfully sent invoice to', session.customerEmail);
  } catch (err) {
    console.error('[mailer] Failed to send invoice email:', err);
  }
}

export async function sendOrderConfirmationEmail(session: any, items: any[] = []) {
  if (!session.customerEmail) {
    console.warn('[mailer] No customer email for confirmation', session.id);
    return;
  }
  await sendHtmlMail(
    session.customerEmail,
    `Order confirmed — ${orderNumber(session)}`,
    confirmationHtml(session, items),
    'confirmation',
  );
}

export async function sendOrderTrackingEmail(session: any, items: any[] = []) {
  if (!session.customerEmail) {
    console.warn('[mailer] No customer email for tracking', session.id);
    return;
  }
  const mail = htmlForFulfillment(session, items);
  await sendHtmlMail(session.customerEmail, mail.subject, mail.html, mail.kind);
}

export async function sendSupportQueryEmail(payload: { name: string; email: string; phone: string; query: string }, targetEmail: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[mailer] SMTP credentials missing, skipping support email');
    return;
  }

  const date = new Date().toLocaleString('en-IN');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://anaghajewellers.com';

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-top: 4px solid #f1592a; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${apiUrl}/images/logo.png" alt="Anagha Jewellers Logo" style="max-height: 50px;" />
        </div>

        <h2 style="color: #032C5E; border-bottom: 1px solid #eee; padding-bottom: 10px;">New Contact Form Query</h2>
        
        <p style="color: #555; font-size: 14px; margin-bottom: 20px;">
          You have received a new query from the website contact form on <strong>${date}</strong>.
        </p>

        <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
          <tr>
            <td width="120" style="font-weight: bold; color: #333; border-bottom: 1px solid #ddd;">Name:</td>
            <td style="border-bottom: 1px solid #ddd; color: #222;">${payload.name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #333; border-bottom: 1px solid #ddd;">Email:</td>
            <td style="border-bottom: 1px solid #ddd;">
              <a href="mailto:${payload.email}" style="color: #f1592a;">${payload.email || 'N/A'}</a>
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #333; border-bottom: 1px solid #ddd;">Phone:</td>
            <td style="border-bottom: 1px solid #ddd; color: #222;">${payload.phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #333; vertical-align: top;">Query:</td>
            <td style="color: #222; white-space: pre-wrap;">${payload.query || 'No query provided.'}</td>
          </tr>
        </table>
        
        <div style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">
          This is an automated notification from Anagha Jewellers Website.
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || '"Anagha Jewellers" <invoices@anaghajewellers.com>',
      to: targetEmail,
      replyTo: payload.email,
      subject: `New Contact Form Query from ${payload.name || 'Customer'}`,
      html,
    });
    console.log('[mailer] Successfully sent contact query to', targetEmail);
  } catch (err) {
    console.error('[mailer] Failed to send contact query email:', err);
    throw err;
  }
}
