// src/routes/terms.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-slate-800">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Terms of Service</h1>
      <p className="text-sm text-slate-500 mb-8">Last Updated: October 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using BookMarket-Ghana (shellbooks.app), you agree to comply with and be
            bound by these Terms of Service. If you do not agree, please do not use our platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            2. Marketplace Conduct & Listings
          </h2>
          <p>
            Sellers are solely responsible for providing accurate descriptions, condition reports,
            and pricing for all listed textbooks and academic materials. Misleading listings,
            fraudulent offers, or counterfeit course materials are strictly prohibited.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">3. Payments & Transactions</h2>
          <p>
            All online payments are securely processed by Paystack. Upon checkout completion, an
            automated receipt is issued to the buyer’s registered email address from{" "}
            <code>orders@shellbooks.app</code> as proof of purchase.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-2">4. Refunds & Disputes</h2>
          <p>
            Buyers must inspect physical books during campus hand-off. Refund requests for
            non-delivery or inaccurate item condition must be lodged within 48 hours of purchase by
            contacting <code>support@shellbooks.app</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
