// src/routes/privacy.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-slate-800">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last Updated: October 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">1. Data We Collect</h2>
          <p>
            When you use BookMarket-Ghana, we collect essential user information including your full
            name, student email address, telephone number, and order details necessary to generate
            receipts and facilitate item delivery.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">2. Payment Security</h2>
          <p>
            BookMarket-Ghana does not store, process, or transmit sensitive card details or Mobile
            Money PINs on our servers. All monetary transactions are processed directly via PCI-DSS
            compliant infrastructure provided by Paystack.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">3. Use of Information</h2>
          <p>
            We use your contact details solely to send transactional order receipts via{" "}
            <code>orders@shellbooks.app</code>, facilitate communication between buyers and sellers,
            and provide customer support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">4. Contact Us</h2>
          <p>
            For questions regarding your privacy or data deletion requests, email us at{" "}
            <code>support@shellbooks.app</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
