import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { placeOrder } from "@/lib/orders.functions";
import { useCart } from "@/lib/cart";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-catalog";
import { cedis } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Review your order — BookMarket Ghana" },
      { name: "description", content: "Check the books you selected before you pay." },
      { property: "og:title", content: "Review your order — BookMarket Ghana" },
      { property: "og:description", content: "Check the books you selected before you pay." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const submitOrder = useServerFn(placeOrder);
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const [details, setDetails] = useState({ buyerName: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDetails((current) => ({
      buyerName: current.buyerName || profile.full_name || profile.username || "",
      phone: current.phone || profile.phone || "",
      email: current.email || profile.email || "",
    }));
  }, [profile]);

  async function handlePlaceOrder() {
    setBusy(true);
    try {
      const result = await submitOrder({
        data: {
          items: cart.items.map((line) => ({ bookId: line.bookId, quantity: line.quantity })),
          ...details,
        },
      });
      cart.clear();
      toast.success(`Order ${result.orderRef} created. Now make payment.`);
      navigate({ to: "/payment/$orderId", params: { orderId: result.orderId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not place your order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paper-grain min-h-[70vh]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/books"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to books
        </Link>

        <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">Review your order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.username ? `${profile.username} · ` : ""}
          {profile?.level ? `Level ${profile.level}` : ""}
        </p>

        {cart.items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
            <h2 className="font-display text-xl font-semibold">Your order is empty</h2>
            <p className="mt-2 text-sm text-muted-foreground">Pick the books you need from your shelf.</p>
            <Link to="/books" className="mt-6 inline-block">
              <Button>Browse books</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
              {cart.items.map((line) => (
                <div key={line.bookId} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold leading-snug">{line.title}</h2>
                    <p className="text-sm text-muted-foreground">{line.author}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{cedis(line.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label="Reduce quantity"
                      onClick={() => cart.setQuantity(line.bookId, line.quantity - 1)}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold">{line.quantity}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label="Increase quantity"
                      onClick={() => cart.setQuantity(line.bookId, line.quantity + 1)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <div className="w-24 text-right font-display text-lg font-semibold">
                    {cedis(line.price * line.quantity)}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${line.title}`}
                    onClick={() => cart.remove(line.bookId)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-display text-xl font-semibold">Summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Books</dt>
                  <dd>{cart.count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery</dt>
                  <dd>Campus pickup</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3 font-display text-lg font-semibold">
                  <dt>Total</dt>
                  <dd className="text-primary">{cedis(cart.total)}</dd>
                </div>
              </dl>

              <div className="mt-5 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="buyerName">Full name</Label>
                  <Input
                    id="buyerName"
                    value={details.buyerName}
                    onChange={(event) => setDetails({ ...details, buyerName: event.target.value })}
                    placeholder="Ama Mensah"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderPhone">Phone number</Label>
                  <Input
                    id="orderPhone"
                    value={details.phone}
                    onChange={(event) => setDetails({ ...details, phone: event.target.value })}
                    placeholder="0551234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderEmail">Email for the receipt</Label>
                  <Input
                    id="orderEmail"
                    type="email"
                    value={details.email}
                    onChange={(event) => setDetails({ ...details, email: event.target.value })}
                    placeholder="ama@example.com"
                  />
                </div>
              </div>

              <Button className="mt-5 w-full" disabled={busy} onClick={handlePlaceOrder}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Place order &amp; pay
              </Button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
