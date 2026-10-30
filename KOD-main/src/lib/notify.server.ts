import { Resend } from "resend";

/**
 * Order notifications (email + SMS).
 * Switch EMAIL_MODE and SMS_MODE to "live" when ready to dispatch real messages.
 */
const EMAIL_MODE: "simulated" | "live" = "live";
const SMS_MODE: "simulated" | "live" = "live";

export type OrderNotification = {
  orderRef: string;
  buyerName: string;
  email: string;
  phone: string;
  total: number;
  paymentMethod: string;
  receiptUrl: string;
  items: { title: string; author: string | null; quantity: number; unitPrice: number }[];
};

const cedis = (amount: number) => `GH\u20B5 ${Number(amount ?? 0).toFixed(2)}`;

export function buildOrderEmail(order: OrderNotification) {
  const plainTextLines = order.items
    .map(
      (i) =>
        `- ${i.title}${i.author ? ` by ${i.author}` : ""} x${i.quantity} —${cedis(i.unitPrice * i.quantity)}`,
    )
    .join("\n");

  const htmlItemsRows = order.items
    .map(
      (i) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b;">
            <strong style="color: #0f172a;">${i.title}</strong><br>
            <span style="color: #64748b; font-size: 12px;">Qty: ${i.quantity}${i.author ? ` · ${i.author}` : ""}</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right; vertical-align: top;">
            ${cedis(i.unitPrice * i.quantity)}
          </td>
        </tr>
      `,
    )
    .join("");

  return {
    subject: `Your BookMarket Ghana receipt — ${order.orderRef}`,
    text: [
      `Hi ${order.buyerName},`,
      ``,
      `We received your payment. Here is your receipt.`,
      ``,
      `Order: ${order.orderRef}`,
      `Payment method: ${order.paymentMethod}`,
      plainTextLines,
      `Total paid: ${cedis(order.total)}`,
      ``,
      `View or print your receipt: ${order.receiptUrl}`,
      ``,
      `Thank you for buying with BookMarket Ghana.`,
    ].join("\n"),
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
          .container { max-width: 520px; background: #ffffff; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .brand { text-align: center; font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .brand-accent { color: #059669; }
          .subtitle { text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; margin-bottom: 24px; }
          .greeting { font-size: 15px; color: #334155; margin-bottom: 12px; }
          .box { background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0; }
          .box-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin: 0 0 2px 0; }
          .box-value { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th { font-size: 11px; text-transform: uppercase; color: #64748b; text-align: left; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
          .btn-container { text-align: center; margin: 28px 0 20px 0; }
          .btn { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; }
          .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">BookMarket <span class="brand-accent">Ghana</span></div>
          <div class="subtitle">Official Payment Receipt</div>
          
          <p class="greeting">Hi <strong>${order.buyerName}</strong>,</p>
          <p style="color: #475569; font-size: 14px; margin-top: 0;">We received your payment! Here is your official order breakdown:</p>
          
          <div class="box">
            <div class="box-title">Order Reference</div>
            <div class="box-value">${order.orderRef}</div>
            <div class="box-title">Payment Method</div>
            <div class="box-value" style="margin-bottom: 0;">${order.paymentMethod}</div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Book Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${htmlItemsRows}
              <tr>
                <td style="padding-top: 16px; font-size: 16px; font-weight: 700; color: #0f172a;">Total Paid</td>
                <td style="padding-top: 16px; font-size: 16px; font-weight: 700; color: #059669; text-align: right;">${cedis(order.total)}</td>
              </tr>
            </tbody>
          </table>

          <div class="btn-container">
            <a href="${order.receiptUrl}" class="btn" target="_blank">View & Print Official Receipt</a>
          </div>

          <div class="footer">
            Questions about your order? Email us at <a href="mailto:support@shellbooks.app" style="color: #059669;">support@shellbooks.app</a><br>
            © ${new Date().getFullYear()} BookMarket Ghana. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function buildOrderSms(order: OrderNotification) {
  return `BookMarket Ghana: payment received for ${order.orderRef}. Total ${cedis(order.total)}. Receipt: ${order.receiptUrl}`;
}

export async function sendOrderEmail(order: OrderNotification): Promise<boolean> {
  const message = buildOrderEmail(order);

  if (EMAIL_MODE === "simulated") {
    console.info(
      `[SIMULATED EMAIL] to=${order.email}\nsubject=${message.subject}\n${message.text}`,
    );
    return true;
  }

  // ── REAL EMAIL USING RESEND ──────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY missing in environment variables.");
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || "BookMarket Ghana <orders@shellbooks.app>",
      to: [order.email],
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    if (response.error) {
      console.error("[RESEND EMAIL ERROR]", response.error);
      return false;
    }

    console.info(`[REAL EMAIL SENT] to=${order.email}`);
    return true;
  } catch (error) {
    console.error("[REAL EMAIL FAILED]", error);
    return false;
  }
}

export async function sendOrderSms(order: OrderNotification): Promise<boolean> {
  const message = buildOrderSms(order);

  if (SMS_MODE === "simulated") {
    console.info(`[SIMULATED SMS] to=${order.phone}\n${message}`);
    return true;
  }

  // ── REAL SMS USING HUBTEL GHANA ──────────────────────────────────────────
  const clientId = process.env.HUBTEL_CLIENT_ID;
  const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
  const senderId = process.env.HUBTEL_SENDER_ID || "BookMarket";

  if (!clientId || !clientSecret) {
    console.warn("HUBTEL credentials missing in environment variables.");
    return false;
  }

  try {
    // Format recipient phone number to international format (233xxxxxxxxx)
    let formattedPhone = order.phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "233" + formattedPhone.slice(1);
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const res = await fetch("https://smsc.hubtel.com/v1/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        From: senderId,
        To: formattedPhone,
        Content: message,
        RegisteredDelivery: true,
      }),
    });

    const data = await res.json();
    if (res.ok && (data.status === 0 || data.status === "0" || data.status === "Success")) {
      console.info(`[REAL SMS SENT] to=${formattedPhone}`);
      return true;
    }

    console.error("[HUBTEL SMS ERROR]", data);
    return false;
  } catch (error) {
    console.error("[REAL SMS FAILED]", error);
    return false;
  }
}
