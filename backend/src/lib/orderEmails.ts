function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rupees(value: unknown) {
  const n = Number(value);
  return `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN')}`;
}

function siteBase() {
  const fromCors = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .find((s) => s.startsWith('http') && !s.includes('localhost'));
  return String(fromCors || process.env.PUBLIC_BASE_URL || 'https://anaghajewellers.com')
    .trim()
    .replace(/\/+$/, '');
}

type LineItem = Record<string, unknown>;

export function orderNumber(session: Record<string, unknown>) {
  return String(
    session.erpBillNumber ||
      session.erp_bill_number ||
      session.order_id ||
      `AJ-${String(session.id || '').slice(0, 8).toUpperCase()}`,
  );
}

function firstPositive(...values: unknown[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function lineQty(item: LineItem) {
  const qty = Number(item.quantity ?? item.qty ?? item.pcs ?? 1);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function lineAmount(item: LineItem) {
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
    item.line_total,
    item.display_price,
    item.price,
    item.sale_price,
  );
  if (total) return total;
  return firstPositive(item.rate, item.unit_price) * qty;
}

function asLineItems(value: unknown): LineItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is LineItem => Boolean(row) && typeof row === 'object' && !Array.isArray(row),
  );
}

function itemsFromSession(session: Record<string, unknown>, fallback: LineItem[] = []) {
  const payload =
    session.paymentPayload && typeof session.paymentPayload === 'object'
      ? (session.paymentPayload as Record<string, unknown>)
      : {};
  const fromCart = asLineItems(payload.items);
  if (fromCart.length) return fromCart;
  if (Array.isArray(payload.item_names) && payload.item_names.length) {
    return payload.item_names.map((name) => ({ name: String(name || '') }));
  }
  const fromFallback = asLineItems(fallback);
  return fromFallback.length ? fromFallback : fallback;
}

function fieldText(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).replace(/^string:/, '').trim();
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.string === 'string') return obj.string.trim();
  }
  return '';
}

function addressHtml(raw: unknown) {
  if (!raw || typeof raw !== 'object') return '<span style="color:#888;">Not provided</span>';
  const addr = Array.isArray(raw)
    ? (raw.find((row) => row?.isDefault) || raw[0] || {})
    : (raw as Record<string, unknown>);
  const lines = [
    fieldText(addr.recipientName || addr.recipient_name),
    fieldText(addr.addressLine || addr.address_line),
    fieldText(addr.street),
    [fieldText(addr.locality), fieldText(addr.landmark)].filter(Boolean).join(', '),
    [fieldText(addr.city), fieldText(addr.state), fieldText(addr.pincode)].filter(Boolean).join(', '),
    fieldText(addr.mobile) ? `Mobile: ${fieldText(addr.mobile)}` : '',
  ]
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => escapeHtml(line));
  if (!lines.length) return '<span style="color:#888;">Not provided</span>';
  return lines.join('<br/>');
}

type OrderView = {
  session: Record<string, unknown>;
  billNo: string;
  date: string;
  name: string;
  logoUrl: string;
  ordersUrl: string;
  itemsHtml: string;
  itemsAmount: number;
  shippingAmount: number;
  shippingName: string;
  shippingEta: string;
  totalAmount: number;
  address: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
};

function sessionText(session: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = session[key];
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
  }
  return '';
}

function orderView(session: Record<string, unknown>, items: LineItem[] = []): OrderView {
  const billNo = orderNumber(session);
  const created = session.createdAt || session.created_at;
  const createdDate =
    created instanceof Date
      ? created
      : typeof created === 'string' || typeof created === 'number'
        ? new Date(created)
        : new Date();
  const date = (Number.isNaN(createdDate.getTime()) ? new Date() : createdDate).toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
  const shippingAmount = Number(session.shippingAmount ?? session.shipping_amount ?? 0);
  const totalAmount = Number(session.amount);
  const storedItemsAmount = Number(session.itemsAmount ?? session.items_amount);
  const fallbackItemsTotal = firstPositive(
    storedItemsAmount,
    Number.isFinite(totalAmount) ? totalAmount - (Number.isFinite(shippingAmount) ? shippingAmount : 0) : 0,
    totalAmount,
  );
  const pricedLines = itemsFromSession(session, items).map((item) => ({
    item,
    qty: lineQty(item),
    amount: lineAmount(item),
  }));
  const pricedSum = pricedLines.reduce((sum, row) => sum + row.amount, 0);
  if (pricedLines.length === 1 && pricedLines[0].amount <= 0 && fallbackItemsTotal > 0) {
    pricedLines[0].amount = fallbackItemsTotal;
  } else if (pricedLines.length > 1 && pricedLines.every((row) => row.amount <= 0) && fallbackItemsTotal > 0) {
    pricedLines[0].amount = fallbackItemsTotal;
  }
  const itemsAmount = pricedSum > 0 ? pricedSum : fallbackItemsTotal;
  const itemsHtml = pricedLines.length
    ? pricedLines
        .map(
          ({ item, qty, amount }: { item: LineItem; qty: number; amount: number }) => `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;color:#222;">
                <strong>${escapeHtml(item.name || item.product_name || item.article || item.description || 'Jewellery')}</strong>
                ${item.tag_number ? `<div style="color:#888;font-size:12px;margin-top:2px;">Tag ${escapeHtml(item.tag_number)}</div>` : ''}
              </td>
              <td style="padding:12px 0;border-bottom:1px solid #eee;font-size:13px;color:#555;text-align:center;">${qty}</td>
              <td style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;color:#222;text-align:right;">${rupees(amount)}</td>
            </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" style="padding:12px 0;color:#888;font-size:14px;">Jewellery purchase</td></tr>`;

  return {
    session,
    billNo,
    date,
    name: sessionText(session, 'customerName', 'customer_name') || 'there',
    logoUrl: `${siteBase()}/images/brand_logo.png`,
    ordersUrl: `${siteBase()}/account/orders`,
    itemsHtml,
    itemsAmount,
    shippingAmount,
    shippingName: sessionText(session, 'shippingMethodName', 'shipping_method_name'),
    shippingEta: sessionText(session, 'shippingEta', 'shipping_eta').trim(),
    totalAmount,
    address: addressHtml(session.shippingAddress || session.shipping_address),
    courierName: sessionText(session, 'courierName', 'courier_name'),
    trackingNumber: sessionText(session, 'trackingNumber', 'tracking_number'),
    trackingUrl: sessionText(session, 'trackingUrl', 'tracking_url'),
  };
}

function shell(opts: { headerColor: string; accentBar: string; logoUrl: string; body: string; footer: string }) {
  return `
  <div style="margin:0;padding:0;background:#f6f3f0;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3f0;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #efe8e2;">
            <tr>
              <td style="background:${opts.headerColor};padding:22px 28px;text-align:center;border-bottom:4px solid ${opts.accentBar};">
                <img src="${escapeHtml(opts.logoUrl)}" alt="Anagha Jewellers" style="max-height:48px;max-width:220px;" />
              </td>
            </tr>
            ${opts.body}
            <tr>
              <td style="padding:16px 28px 24px;text-align:center;color:#999;font-size:12px;line-height:1.6;border-top:1px solid #f0eae4;">
                ${opts.footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
}

function orderBox(view: OrderView) {
  return `
    <tr>
      <td style="padding:20px 28px 8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7f4;border-radius:12px;">
          <tr>
            <td style="padding:16px;width:50%;font-size:13px;color:#555;">
              Order no.<br/><strong style="color:#032C5E;font-size:15px;">${escapeHtml(view.billNo)}</strong>
            </td>
            <td style="padding:16px;width:50%;font-size:13px;color:#555;text-align:right;">
              Date<br/><strong style="color:#032C5E;font-size:15px;">${escapeHtml(view.date)}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function itemsBlock(view: OrderView) {
  return `
    <tr>
      <td style="padding:8px 28px 4px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#888;font-weight:bold;">Your jewellery</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding-bottom:6px;font-size:11px;color:#999;text-transform:uppercase;">Description</td>
            <td style="padding-bottom:6px;font-size:11px;color:#999;text-transform:uppercase;text-align:center;">Qty</td>
            <td style="padding-bottom:6px;font-size:11px;color:#999;text-transform:uppercase;text-align:right;">Amount</td>
          </tr>
          ${view.itemsHtml}
        </table>
      </td>
    </tr>`;
}

function paidTotal(view: OrderView) {
  return `
    <tr>
      <td style="padding:4px 28px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#555;">
          <tr>
            <td style="padding:6px 0;">Shipping${view.shippingName ? ` · ${escapeHtml(view.shippingName)}` : ''}</td>
            <td style="padding:6px 0;text-align:right;">${view.shippingAmount > 0 ? rupees(view.shippingAmount) : 'Free'}</td>
          </tr>
          <tr>
            <td style="padding:10px 0 0;border-top:1px solid #eee;font-weight:bold;color:#032C5E;">Total paid</td>
            <td style="padding:10px 0 0;border-top:1px solid #eee;text-align:right;font-weight:bold;color:#032C5E;">${rupees(view.totalAmount)}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function cta(href: string, label: string, color: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px;font-weight:bold;margin:0 6px 10px;">${escapeHtml(label)}</a>`;
}

/** After payment — order placed, invoice already sent separately. */
export function confirmationHtml(session: Record<string, unknown>, items: LineItem[] = []) {
  const view = orderView(session, items);
  const body = `
    <tr>
      <td style="padding:28px 28px 8px;">
        <div style="display:inline-block;background:#c2410c;color:#fff;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:bold;padding:6px 12px;border-radius:999px;">Order confirmed</div>
        <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.3;color:#032C5E;">Thank you. We have received your order.</h1>
        <p style="margin:0;color:#666;font-size:14px;line-height:1.6;">
          Hello ${escapeHtml(view.name)}, your payment is complete. A sales invoice was emailed separately.
          This is an online delivery order. Our team will now prepare your jewellery.
        </p>
      </td>
    </tr>
    ${orderBox(view)}
    ${itemsBlock(view)}
    ${paidTotal(view)}
    <tr>
      <td style="padding:0 28px 20px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#888;font-weight:bold;">Deliver to</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#333;">${view.address}</p>
        <p style="margin:16px 0 0;padding:12px 14px;background:#fff7ed;border-radius:10px;font-size:13px;color:#9a3412;line-height:1.5;">
          Expected delivery${view.shippingName ? ` · ${escapeHtml(view.shippingName)}` : ''}${view.shippingEta ? `: <strong>${escapeHtml(view.shippingEta)}</strong>` : '. You will get another email when your order is packed.'}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 28px;text-align:center;">
        ${cta(view.ordersUrl, 'View your order', '#032C5E')}
      </td>
    </tr>`;
  return shell({
    headerColor: '#032C5E',
    accentBar: '#f1592a',
    logoUrl: view.logoUrl,
    body,
    footer: `Anagha Jewellers · Vijayawada<br/>Order confirmation for ${escapeHtml(view.billNo)}.`,
  });
}

/** Packed — ready for courier, no AWB yet. */
export function packedHtml(session: Record<string, unknown>, items: LineItem[] = []) {
  const view = orderView(session, items);
  const body = `
    <tr>
      <td style="padding:28px 28px 8px;">
        <div style="display:inline-block;background:#1d4ed8;color:#fff;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:bold;padding:6px 12px;border-radius:999px;">Packed</div>
        <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.3;color:#032C5E;">Your jewellery is packed and ready to leave.</h1>
        <p style="margin:0;color:#666;font-size:14px;line-height:1.6;">
          Hello ${escapeHtml(view.name)}, order ${escapeHtml(view.billNo)} has been packed at our workshop.
          We will email courier tracking as soon as it is handed over.
        </p>
      </td>
    </tr>
    ${orderBox(view)}
    ${itemsBlock(view)}
    <tr>
      <td style="padding:8px 28px 20px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#888;font-weight:bold;">Deliver to</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#333;">${view.address}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 28px;text-align:center;">
        ${cta(view.ordersUrl, 'View order status', '#1d4ed8')}
      </td>
    </tr>`;
  return shell({
    headerColor: '#1e3a8a',
    accentBar: '#3b82f6',
    logoUrl: view.logoUrl,
    body,
    footer: `Anagha Jewellers · Vijayawada<br/>Packed update for ${escapeHtml(view.billNo)}.`,
  });
}

/** Shipped — tracking is the main content. */
export function shippedHtml(session: Record<string, unknown>, items: LineItem[] = []) {
  const view = orderView(session, items);
  const hasTrack = Boolean(view.trackingNumber || view.trackingUrl || view.courierName);
  const trackPanel = hasTrack
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#032C5E;border-radius:12px;color:#fff;">
        <tr>
          <td style="padding:20px;">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.7;">Shipment tracking</p>
            ${view.courierName ? `<p style="margin:0 0 8px;font-size:18px;font-weight:bold;">${escapeHtml(view.courierName)}</p>` : ''}
            ${view.trackingNumber ? `<p style="margin:0;font-size:14px;">AWB / tracking no. <strong>${escapeHtml(view.trackingNumber)}</strong></p>` : ''}
            ${
              view.trackingUrl
                ? `<p style="margin:16px 0 0;">${cta(view.trackingUrl, 'Track shipment', '#f1592a')}</p>`
                : ''
            }
          </td>
        </tr>
      </table>`
    : `
      <p style="margin:0;padding:14px 16px;background:#eef2ff;border-radius:10px;font-size:13px;color:#1e3a8a;line-height:1.5;">
        Your parcel has left our workshop. The courier tracking number will appear on your order page shortly.
      </p>`;

  const body = `
    <tr>
      <td style="padding:28px 28px 8px;">
        <div style="display:inline-block;background:#032C5E;color:#fff;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:bold;padding:6px 12px;border-radius:999px;">Shipped</div>
        <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.3;color:#032C5E;">Your order is on the way.</h1>
        <p style="margin:0 0 18px;color:#666;font-size:14px;line-height:1.6;">
          Hello ${escapeHtml(view.name)}, order ${escapeHtml(view.billNo)} has been shipped.
        </p>
        ${trackPanel}
      </td>
    </tr>
    ${orderBox(view)}
    ${itemsBlock(view)}
    <tr>
      <td style="padding:8px 28px 20px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#888;font-weight:bold;">Deliver to</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#333;">${view.address}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 28px;text-align:center;">
        ${cta(view.ordersUrl, 'View order status', '#032C5E')}
      </td>
    </tr>`;
  return shell({
    headerColor: '#032C5E',
    accentBar: '#f1592a',
    logoUrl: view.logoUrl,
    body,
    footer: `Anagha Jewellers · Vijayawada<br/>Shipping update for ${escapeHtml(view.billNo)}.`,
  });
}

/** Delivered — thank you, no tracking placeholder. */
export function deliveredHtml(session: Record<string, unknown>, items: LineItem[] = []) {
  const view = orderView(session, items);
  const body = `
    <tr>
      <td style="padding:28px 28px 8px;">
        <div style="display:inline-block;background:#047857;color:#fff;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:bold;padding:6px 12px;border-radius:999px;">Delivered</div>
        <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.3;color:#047857;">Your order has been delivered.</h1>
        <p style="margin:0;color:#666;font-size:14px;line-height:1.6;">
          Hello ${escapeHtml(view.name)}, we hope you love your Anagha jewellery.
          Thank you for shopping with us.
        </p>
      </td>
    </tr>
    ${orderBox(view)}
    ${itemsBlock(view)}
    ${paidTotal(view)}
    <tr>
      <td style="padding:0 28px 20px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#888;font-weight:bold;">Delivered to</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#333;">${view.address}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 28px;text-align:center;">
        ${cta(view.ordersUrl, 'View order', '#047857')}
      </td>
    </tr>`;
  return shell({
    headerColor: '#064e3b',
    accentBar: '#10b981',
    logoUrl: view.logoUrl,
    body,
    footer: `Anagha Jewellers · Vijayawada<br/>Delivery confirmation for ${escapeHtml(view.billNo)}.`,
  });
}

export function htmlForFulfillment(session: Record<string, unknown>, items: LineItem[] = []) {
  const status = sessionText(session, 'status');
  if (status === 'delivered') return { kind: 'delivered', html: deliveredHtml(session, items), subject: `Order ${orderNumber(session)} has been delivered` };
  if (status === 'shipped') return { kind: 'shipped', html: shippedHtml(session, items), subject: `Order ${orderNumber(session)} has been shipped` };
  if (status === 'packed') return { kind: 'packed', html: packedHtml(session, items), subject: `Order ${orderNumber(session)} has been packed` };
  if (
    sessionText(session, 'trackingNumber', 'tracking_number') ||
    sessionText(session, 'trackingUrl', 'tracking_url') ||
    sessionText(session, 'courierName', 'courier_name')
  ) {
    return { kind: 'shipped', html: shippedHtml(session, items), subject: `Tracking update for order ${orderNumber(session)}` };
  }
  return { kind: 'packed', html: packedHtml(session, items), subject: `Order ${orderNumber(session)} update` };
}
