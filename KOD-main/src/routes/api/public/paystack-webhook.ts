import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { paystackSecret, validSignature, verifyTransaction, applyVerifiedPayment } = await import("@/lib/paystack.server");
        if (!paystackSecret()) return new Response("Payments not active", { status: 503 });

        const raw = await request.text();
        if (!(await validSignature(raw, request.headers.get("x-paystack-signature")))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: { event?: string; data?: { reference?: string } };
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }
        if (event.event !== "charge.success" || typeof event.data?.reference !== "string") {
          return new Response("ignored", { status: 200 });
        }

        // Re-verify with Paystack rather than trusting the event body.
        const tx = await verifyTransaction(event.data.reference.slice(0, 100));
        if (!tx) return new Response("Could not verify", { status: 502 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const result = await applyVerifiedPayment(supabaseAdmin, tx);
        if (!result.ok) console.error("Paystack webhook not applied", result.reason);
        return new Response("ok", { status: 200 });
      },
    },
  },
});
