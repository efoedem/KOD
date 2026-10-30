// Paystack helpers. Server-only. Inactive until PAYSTACK_SECRET_KEY is set.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const API = "https://api.paystack.co";

export function paystackSecret(): string | null {
  const key = process.env["PAYSTACK_SECRET_KEY"]?.trim();
  return key ? key : null;
}

export function paystackLive(): boolean {
  return Boolean(paystackSecret() && process.env["PAYSTACK_PUBLIC_KEY"]?.trim());
}

export type VerifiedTx = {
  status: string;
  amount: number; // pesewas
  currency: string;
  reference: string;
  channel: string | null;
  metadata: { order_id?: string } | null;
};

export async function initializeTransaction(input: {
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl: string;
  orderId: string;
}): Promise<string> {
  const secret = paystackSecret();
  if (!secret) throw new Error("Online payment is not active yet.");
  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountPesewas,
      currency: "GHS",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["mobile_money", "card"],
      metadata: { order_id: input.orderId },
    }),
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; data?: { authorization_url?: string }; message?: string } | null;
  if (!res.ok || !json?.status || !json.data?.authorization_url) {
    console.error("Paystack initialize failed", res.status, json?.message);
    throw new Error("We could not start the payment. Please try again.");
  }
  return json.data.authorization_url;
}

export async function verifyTransaction(reference: string): Promise<VerifiedTx | null> {
  const secret = paystackSecret();
  if (!secret) return null;
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; data?: VerifiedTx } | null;
  if (!res.ok || !json?.status || !json.data) {
    console.error("Paystack verify failed", res.status);
    return null;
  }
  return json.data;
}

/** Constant-time check of the x-paystack-signature header (HMAC SHA512 of raw body). */
export async function validSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = paystackSecret();
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  const given = signature.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

/**
 * Marks an order paid only when the verified transaction matches it:
 * success status, GHS, metadata order id and amount >= order total.
 */
export async function applyVerifiedPayment(
  client: SupabaseClient<Database>,
  tx: VerifiedTx,
): Promise<{ ok: boolean; orderId: string | null; reason?: string }> {
  const orderId = tx.metadata?.order_id ?? null;
  if (tx.status !== "success") return { ok: false, orderId, reason: "Payment was not successful." };
  if (!orderId) return { ok: false, orderId, reason: "Payment is not linked to an order." };
  if (tx.currency !== "GHS") return { ok: false, orderId, reason: "Unexpected currency." };

  const { data: order } = await client
    .from("orders")
    .select("id, order_ref, buyer_name, email, phone, total, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, orderId, reason: "Order not found." };
  if (order.payment_status === "PAID") return { ok: true, orderId };
  if (tx.amount < Math.round(Number(order.total) * 100)) return { ok: false, orderId, reason: "Amount paid does not match the order." };

  const paymentMethod = tx.channel === "mobile_money" ? "Mobile Money (Paystack)" : "Card (Paystack)";
  const { error } = await client
    .from("orders")
    .update({ payment_status: "PAID", status: "CONFIRMED", payment_method: paymentMethod, paid_at: new Date().toISOString() })
    .eq("id", order.id)
    .neq("payment_status", "PAID");
  if (error) {
    console.error("applyVerifiedPayment update failed", error);
    return { ok: false, orderId, reason: "Could not confirm the payment." };
  }

  try {
    const { sendOrderEmail, sendOrderSms } = await import("@/lib/notify.server");
    const { data: items } = await client.from("order_items").select("title, author, quantity, unit_price").eq("order_id", order.id);
    const payload = {
      orderRef: order.order_ref,
      buyerName: order.buyer_name,
      email: order.email,
      phone: order.phone,
      total: Number(order.total),
      paymentMethod,
      receiptUrl: `${process.env["SITE_URL"] ?? ""}/receipt/${order.id}`,
      items: (items ?? []).map((i) => ({ title: i.title, author: i.author, quantity: i.quantity, unitPrice: Number(i.unit_price) })),
    };
    const [emailSent, smsSent] = await Promise.all([sendOrderEmail(payload), sendOrderSms(payload)]);
    await client.from("orders").update({ notified_email: emailSent, notified_sms: smsSent }).eq("id", order.id);
  } catch (e) {
    console.error("payment notification failed", e);
  }
  return { ok: true, orderId };
}
