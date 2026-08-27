import PDFDocument from 'pdfkit';

export const INVOICE_HSN = '7113';

function firstPositive(...values: unknown[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function lineQty(item: Record<string, unknown>) {
  const qty = Number(item.quantity ?? item.qty ?? item.pcs ?? 1);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

export function lineAmount(item: Record<string, unknown>) {
  if (item.item_total != null && item.item_total !== '') {
    const discounted = Number(item.item_total);
    if (Number.isFinite(discounted)) return Math.max(0, discounted);
  }
  const qty = lineQty(item);
  const total = firstPositive(
    item.item_total,
    item.itemTotal,
    item.mrp,
    item.net_amount,
    item.netAmount,
    item.line_total,
    item.total_amount,
    item.display_price,
    item.displayPrice,
    item.price,
    item.sale_price,
    item.salePrice,
    item.amount,
  );
  if (total) return total;
  const unit = firstPositive(item.rate, item.unit_price, item.unitPrice);
  return unit * qty;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function invoiceBillNo(session: {
  id?: string;
  erpBillNumber?: string | null;
  erpBillId?: string | null;
}) {
  return String(
    session.erpBillNumber ||
      (session.id ? session.id.slice(0, 8).toUpperCase() : '') ||
      'INVOICE',
  );
}

export function invoiceDateLabel(session: { createdAt?: Date | string | null }) {
  const raw = session.createdAt ? new Date(session.createdAt) : new Date();
  const d = Number.isNaN(raw.getTime()) ? new Date() : raw;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function publicApiBase() {
  return String(
    process.env.PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://anaghajewellers.com',
  ).replace(/\/+$/, '');
}

export function websiteInvoicePdfUrl(session: { id?: string; erpBillId?: string | null }) {
  const id = String(session.id || session.erpBillId || '').trim();
  if (!id) return '#';
  return `${publicApiBase()}/api/site/invoice/${encodeURIComponent(id)}`;
}

export function invoiceItemsFromSession(session: {
  tagNumber?: string | null;
  amount?: string | number | null;
  paymentPayload?: unknown;
}): Record<string, unknown>[] {
  const payload =
    session.paymentPayload && typeof session.paymentPayload === 'object'
      ? (session.paymentPayload as Record<string, unknown>)
      : {};
  if (Array.isArray(payload.items) && payload.items.length) {
    return payload.items.filter((row) => row && typeof row === 'object') as Record<
      string,
      unknown
    >[];
  }

  const tags = String(session.tagNumber || '')
    .split('|')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const names = Array.isArray(payload.item_names)
    ? payload.item_names.map((n) => String(n || '').trim())
    : [];
  const total = Number(session.amount) || 0;
  const each = tags.length ? total / tags.length : total;
  if (!tags.length) {
    return [{ name: 'Jewellery Item', quantity: 1, display_price: total }];
  }
  return tags.map((tag, i) => ({
    name: names[i] || 'Jewellery Item',
    tag_number: tag,
    quantity: 1,
    display_price: each,
  }));
}

export function buildInvoiceHtml(
  session: {
    id?: string;
    amount?: string | number | null;
    customerName?: string | null;
    customerMobile?: string | null;
    customerEmail?: string | null;
    erpBillNumber?: string | null;
    erpBillId?: string | null;
    createdAt?: Date | string | null;
    shippingMethodName?: string | null;
    shipping_method_name?: string | null;
    shippingEta?: string | null;
    shipping_eta?: string | null;
  },
  items: Record<string, unknown>[],
) {
  const billNo = invoiceBillNo(session);
  const date = invoiceDateLabel(session);
  const logoUrl = `${publicApiBase()}/images/logo.png`;
  const pdfLink = websiteInvoicePdfUrl(session);
  const lineItems = Array.isArray(items) ? items : [];

  const itemsHtml = lineItems
    .map((item) => {
      const amount = lineAmount(item).toLocaleString('en-IN');
      const name = escapeHtml(item.name || 'Jewellery Item');
      const tag = escapeHtml(item.tag_number || '');
      return `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; font-size: 11px;">
        <strong>${name}</strong><br/>
        <span style="color: #666; font-size: 9px;">${tag ? `Tag ${tag}` : ''}</span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-align: center; font-size: 11px;">${lineQty(item)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-align: center; font-size: 11px;">${INVOICE_HSN}</td>
      <td style="padding: 8px; border-bottom: 1px solid #000; border-right: 1px solid #000; text-align: right; font-size: 11px;">₹${amount}</td>
      <td style="padding: 8px; border-bottom: 1px solid #000; text-align: right; font-size: 11px;">₹${amount}</td>
    </tr>`;
    })
    .join('');

  const totalAmount = Number(session.amount);
  const totalAmountStr = Number.isFinite(totalAmount) ? totalAmount.toLocaleString('en-IN') : '0';
  const pcsTotal = lineItems.reduce((sum, item) => sum + lineQty(item), 0);
  const customerName = escapeHtml(session.customerName?.toUpperCase() || 'N/A');
  const customerMobile = escapeHtml(session.customerMobile || 'N/A');
  const customerEmail = escapeHtml(session.customerEmail || '');
  const shipName = String(session.shippingMethodName || session.shipping_method_name || 'Online delivery').trim();
  const shipEta = String(session.shippingEta || session.shipping_eta || '').trim();

  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 20px; border: 1px solid #ddd;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${logoUrl}" alt="Anagha Jewellers Logo" style="max-height: 60px;" />
        </div>
        <div style="border: 1px solid #000;">
          <table width="100%" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #000;">
            <tr>
              <td style="padding: 10px; font-weight: bold; font-size: 16px;">SALES INVOICE</td>
              <td style="padding: 10px; text-align: right; font-size: 11px; line-height: 1.4;">
                <strong>Bill No:</strong> ${escapeHtml(billNo)}<br/>
                <strong>Date:</strong> ${escapeHtml(date)}
              </td>
            </tr>
          </table>
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
                <strong>${customerName}</strong><br/>
                Phone: ${customerMobile}<br/>
                Email: <a href="mailto:${customerEmail}" style="color: #032C5E;">${customerEmail}</a>
              </td>
            </tr>
          </table>
          <table width="100%" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #000;">
            <tr>
              <td style="padding: 10px; font-size: 10px; line-height: 1.4;">
                <strong>DELIVERY</strong> · Online<br/>
                ${escapeHtml(shipName)}${shipEta ? ` · Expected: ${escapeHtml(shipEta)}` : ''}
              </td>
            </tr>
          </table>
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
          <table width="100%" cellspacing="0" cellpadding="0" style="border-bottom: 1px solid #000;">
            <tr>
              <td style="padding: 8px; border-right: 1px solid #000; font-size: 10px; font-weight: bold;">TOTAL</td>
              <td width="50" style="padding: 8px; border-right: 1px solid #000; text-align: center; font-size: 10px;">${pcsTotal}</td>
              <td width="50" style="padding: 8px; border-right: 1px solid #000;"></td>
              <td width="80" style="padding: 8px; border-right: 1px solid #000;"></td>
              <td width="100" style="padding: 8px; text-align: right; font-size: 11px; font-weight: bold;">₹${totalAmountStr}</td>
            </tr>
          </table>
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
        <div style="text-align: center; margin-top: 30px;">
          <a href="${pdfLink}" style="display: inline-block; background-color: #8B4513; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 4px; border: 1px solid #5a2e0c;">
            Download PDF — Sales Invoice
          </a>
        </div>
      </div>
    </div>
  `;
}

function inr(n: number) {
  return `INR ${n.toLocaleString('en-IN')}`;
}

export function renderInvoicePdf(
  session: {
    id?: string;
    amount?: string | number | null;
    customerName?: string | null;
    customerMobile?: string | null;
    customerEmail?: string | null;
    erpBillNumber?: string | null;
    erpBillId?: string | null;
    createdAt?: Date | string | null;
    shippingMethodName?: string | null;
    shipping_method_name?: string | null;
    shippingEta?: string | null;
    shipping_eta?: string | null;
  },
  items: Record<string, unknown>[],
): Promise<Buffer> {
  const billNo = invoiceBillNo(session);
  const date = invoiceDateLabel(session);
  const lineItems = Array.isArray(items) ? items : [];
  const totalAmount = Number(session.amount);
  const total = Number.isFinite(totalAmount) ? totalAmount : 0;
  const totalStr = total.toLocaleString('en-IN');
  const pcsTotal = lineItems.reduce((sum, item) => sum + lineQty(item), 0);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const navy = '#032C5E';
    const pageWidth = doc.page.width - 80;
    let y = 40;

    doc.fontSize(11).fillColor(navy).font('Helvetica-Bold').text('ANAGHA JEWELLERS', 40, y, {
      width: pageWidth,
      align: 'center',
    });
    y += 22;
    doc.fontSize(16).fillColor('#000').text('SALES INVOICE', 40, y, { width: pageWidth, align: 'left' });
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`Bill No: ${billNo}\nDate: ${date}`, 40, y, { width: pageWidth, align: 'right' });
    y += 36;

    doc.moveTo(40, y).lineTo(40 + pageWidth, y).strokeColor('#000').stroke();
    y += 10;

    doc.font('Helvetica-Bold').fontSize(9).text('ANAGHA JEWELLERS', 40, y);
    doc
      .font('Helvetica')
      .fontSize(8)
      .text(
        'Resala LIC Building,\nApsara Road, Rajagopalachari St,\nGovernor Peta, VIJAYAWADA - 520002\nPhone: +91 9988225888\nState Code: Andhra Pradesh',
        40,
        y + 12,
        { width: pageWidth / 2 - 10 },
      );
    doc.font('Helvetica').fillColor('#666').text('CUSTOMER DETAILS:', 40 + pageWidth / 2, y);
    doc
      .fillColor('#000')
      .font('Helvetica-Bold')
      .text(String(session.customerName || 'N/A').toUpperCase(), 40 + pageWidth / 2, y + 12, {
        width: pageWidth / 2,
      });
    doc
      .font('Helvetica')
      .fontSize(8)
      .text(
        `Phone: ${session.customerMobile || 'N/A'}\nEmail: ${session.customerEmail || ''}`,
        40 + pageWidth / 2,
        y + 26,
        { width: pageWidth / 2 },
      );
    y += 90;
    const shipName = String(session.shippingMethodName || session.shipping_method_name || 'Online delivery').trim();
    const shipEta = String(session.shippingEta || session.shipping_eta || '').trim();
    doc.font('Helvetica').fontSize(8).fillColor('#000').text(
      `Delivery: Online · ${shipName}${shipEta ? ` · Expected: ${shipEta}` : ''}`,
      40,
      y,
      { width: pageWidth },
    );
    y += 16;
    doc.moveTo(40, y).lineTo(40 + pageWidth, y).stroke();
    y += 8;

    const cols = {
      desc: 40,
      pcs: 40 + pageWidth * 0.48,
      hsn: 40 + pageWidth * 0.58,
      rate: 40 + pageWidth * 0.7,
      amt: 40 + pageWidth * 0.85,
    };
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('DESCRIPTION', cols.desc, y);
    doc.text('PCS', cols.pcs, y);
    doc.text('HSN', cols.hsn, y);
    doc.text('Rate', cols.rate, y, { width: 70, align: 'right' });
    doc.text('Amount', cols.amt, y, { width: 70, align: 'right' });
    y += 14;
    doc.moveTo(40, y).lineTo(40 + pageWidth, y).stroke();
    y += 8;

    doc.font('Helvetica').fontSize(8);
    for (const item of lineItems) {
      const amount = lineAmount(item);
      const name = String(item.name || 'Jewellery Item');
      const tag = String(item.tag_number || '');
      const desc = tag ? `${name}\n${tag}` : name;
      const descHeight = doc.heightOfString(desc, { width: pageWidth * 0.46 });
      if (y + descHeight > doc.page.height - 80) {
        doc.addPage();
        y = 40;
      }
      doc.font('Helvetica-Bold').text(name, cols.desc, y, { width: pageWidth * 0.46 });
      if (tag) {
        doc.font('Helvetica').fillColor('#666').text(tag, cols.desc, y + 11, { width: pageWidth * 0.46 });
        doc.fillColor('#000');
      }
      doc.font('Helvetica').text(String(lineQty(item)), cols.pcs, y);
      doc.text(INVOICE_HSN, cols.hsn, y);
      doc.text(inr(amount), cols.rate, y, { width: 70, align: 'right' });
      doc.text(inr(amount), cols.amt, y, { width: 70, align: 'right' });
      y += Math.max(descHeight, 22) + 6;
    }

    y += 4;
    doc.moveTo(40, y).lineTo(40 + pageWidth, y).stroke();
    y += 8;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('TOTAL', cols.desc, y);
    doc.text(String(pcsTotal), cols.pcs, y);
    doc.text(inr(total), cols.amt, y, { width: 70, align: 'right' });
    y += 20;
    doc.moveTo(40, y).lineTo(40 + pageWidth, y).stroke();
    y += 12;

    doc.font('Helvetica-Bold').fontSize(8).text('AMOUNT IN WORDS', 40, y);
    doc.font('Helvetica').text(`INR ${totalStr} Only`, 40, y + 12);
    doc.font('Helvetica-Bold').text('Payment Mode: ', 40, y + 28, { continued: true });
    doc.font('Helvetica').text('Online / Razorpay');

    const rightX = 40 + pageWidth * 0.55;
    doc.font('Helvetica').fontSize(8);
    doc.text('Items Subtotal', rightX, y);
    doc.text(inr(total), rightX + 90, y, { width: 80, align: 'right' });
    doc.font('Helvetica-Bold').text('TOTAL', rightX, y + 14);
    doc.text(inr(total), rightX + 90, y + 14, { width: 80, align: 'right' });
    doc.font('Helvetica').text('Online Transfer', rightX, y + 28);
    doc.text(inr(total), rightX + 90, y + 28, { width: 80, align: 'right' });
    doc.font('Helvetica-Bold').text('Balance Due', rightX, y + 42);
    doc.text('INR 0', rightX + 90, y + 42, { width: 80, align: 'right' });

    y += 70;
    doc.font('Helvetica-Bold').fontSize(8).text('OUR BANK DETAILS', 40, y);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#555')
      .text('Bank & Branch:\nA/c No:\nIFSC:', 40, y + 12);
    doc
      .fillColor('#777')
      .fontSize(7)
      .text('E.&O.E :: For Terms & Conditions SEE Overleaf.', 40, y + 12, {
        width: pageWidth,
        align: 'right',
      });
    y += 60;
    doc.moveTo(40, y).lineTo(40 + pageWidth, y).strokeColor('#000').stroke();
    doc
      .fillColor('#000')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('PREMIUM 92.5 SILVER JEWELLERY', 40, y + 10, { width: pageWidth, align: 'center' });

    doc.end();
  });
}
