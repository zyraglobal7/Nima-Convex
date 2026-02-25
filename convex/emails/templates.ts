/**
 * Email templates for Nima
 * Pure functions returning { subject, html } — no framework, just template literals.
 * Amounts are whole KES values (prices are NOT stored in cents).
 */

export interface OrderItem {
  name: string;
  brand?: string;
  quantity: number;
  price: number;      // whole KES value
  lineTotal: number;  // whole KES value
  imageUrl?: string;
  size?: string;
  color?: string;
}

export interface SellerNewOrderEmailData {
  sellerName: string;
  orderNumber: string;
  orderDate: number;   // timestamp ms
  items: OrderItem[];
  subtotal: number;    // whole KES value
  total: number;       // whole KES value
  currency: string;
  buyerCity: string;
  buyerCountry: string;
  dashboardUrl: string;
}

function fmt(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('`en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function sellerNewOrderEmail(data: SellerNewOrderEmailData): { subject: string; html: string } {
  const subject = `New order ${data.orderNumber} — ${fmt(data.total, data.currency)}`;

  const itemRows = data.items
    .map((item) => {
      const variantParts: string[] = [];
      if (item.size) variantParts.push(item.size);
      if (item.color) variantParts.push(item.color);
      const variant = variantParts.length > 0 ? `<br><span style="color:#888;font-size:12px;">${variantParts.join(', ')}</span>` : '';
      const brand = item.brand ? `<span style="color:#888;font-size:12px;">${item.brand}</span><br>` : '';

      const imageCell = item.imageUrl
        ? `<td style="width:56px;padding:8px 12px 8px 0;vertical-align:top;">
            <img src="${item.imageUrl}" alt="${item.name}" width="56" height="56"
              style="border-radius:6px;object-fit:cover;display:block;" />
          </td>`
        : `<td style="width:56px;padding:8px 12px 8px 0;vertical-align:top;">
            <div style="width:56px;height:56px;background:#f3f3f3;border-radius:6px;"></div>
          </td>`;

      return `
        <tr>
          ${imageCell}
          <td style="padding:8px 0;vertical-align:top;">
            ${brand}
            <span style="font-size:14px;color:#111;font-weight:500;">${item.name}</span>${variant}
          </td>
          <td style="padding:8px 0 8px 12px;vertical-align:top;text-align:right;white-space:nowrap;">
            <span style="font-size:13px;color:#555;">×${item.quantity}</span><br>
            <span style="font-size:14px;color:#111;font-weight:500;">${fmt(item.lineTotal, data.currency)}</span>
          </td>
        </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:#111;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#fff;letter-spacing:0.5px;">Nima</span>
              <p style="margin:6px 0 0;color:#aaa;font-size:13px;">Seller Notifications</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#fff;padding:32px;">

              <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111;">You have a new order!</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#666;">
                Hi ${data.sellerName}, a customer just paid for items from your store.
              </p>

              <!-- Order meta -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:13px;color:#888;">Order number</td>
                  <td style="font-size:13px;color:#111;font-weight:600;text-align:right;">${data.orderNumber}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#888;padding-top:6px;">Order date</td>
                  <td style="font-size:13px;color:#111;text-align:right;padding-top:6px;">${formatDate(data.orderDate)}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#888;padding-top:6px;">Ship to</td>
                  <td style="font-size:13px;color:#111;text-align:right;padding-top:6px;">${data.buyerCity}, ${data.buyerCountry}</td>
                </tr>
              </table>

              <!-- Items -->
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Your items</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;">
                ${itemRows}
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:2px solid #111;padding-top:12px;">
                <tr>
                  <td style="font-size:15px;font-weight:700;color:#111;">Total</td>
                  <td style="font-size:15px;font-weight:700;color:#111;text-align:right;">${fmt(data.total, data.currency)}</td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin:32px 0 8px;">
                <a href="${data.dashboardUrl}"
                  style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                  View Order in Dashboard
                </a>
              </div>
              <p style="text-align:center;font-size:12px;color:#aaa;margin:12px 0 0;">
                Please fulfill this order promptly. Buyers expect updates within 24 hours.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f5f5;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">
                You're receiving this because you're a seller on Nima.<br>
                &copy; ${new Date().getFullYear()} Nima AI. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
