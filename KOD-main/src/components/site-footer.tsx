import { Link } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/format";

export function SiteFooter() {
  return (
    <footer className="no-print mt-20 border-t border-border/70 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
        {/* Col 1: About */}
        <div>
          <h2 className="font-display text-xl font-semibold">About BookMarket</h2>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
            BookMarket is Ghana's student textbook store. Pick your school, department and level,
            and see exactly the books on your course list — no guessing, no queueing at the
            bookshop.
          </p>
        </div>

        {/* Col 2: Quick Links (Paystack Compliance) */}
        <div>
          <h2 className="font-display text-xl font-semibold">Quick Links</h2>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
            <li>
              <Link to="/about" className="hover:text-primary-foreground transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-primary-foreground transition-colors">
                Frequently Asked Questions
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-primary-foreground transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-primary-foreground transition-colors">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Need Help / Contact */}
        <div>
          <h2 className="font-display text-xl font-semibold">Need help?</h2>
          <p className="mt-3 text-sm text-primary-foreground/75">Questions about an order?</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-primary-foreground/80" />
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-primary-foreground/80" />
              <a href={`tel:${SUPPORT_PHONE}`} className="hover:underline">
                {SUPPORT_PHONE}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15 py-5 text-center text-xs text-primary-foreground/60">
        &copy; {new Date().getFullYear()} BookMarket Ghana. All rights reserved.
      </div>
    </footer>
  );
}
