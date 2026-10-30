import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORT_EMAIL, SUPPORT_PHONE, cedis, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/receipt/$orderId")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Your receipt — BookMarket Ghana" },
      { name: "description", content: "Your printable electronic receipt for this textbook order." },
      { property: "og:title", content: "Your receipt — BookMarket Ghana" },
      { property: "og:description", content: "Your printable electronic receipt for this textbook order." },
    ],
  }),
  component: ReceiptPage,
});

function ReceiptPage() {
  const { orderId } = Route.useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_ref, buyer_name, phone, email, school_name, department_name, level, total, status, payment_status, payment_method, paid_at, created_at, order_items(id, title, author, quantity, unit_price)",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Receipt not found</h1>
        <Link to="/orders" className="mt-6 inline-block">
          <Button>My orders</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="paper-grain min-h-[70vh]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/books"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to books
          </Link>
          <div className="flex gap-2">
            <Link to="/orders">
              <Button variant="outline" size="sm">
                My orders
              </Button>
            </Link>
            <Button size="sm" className="gap-2" onClick={() => window.print()}>
              <Printer className="size-4" /> Print receipt
            </Button>
          </div>
        </div>

        <div className="no-print mt-6 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Payment successful</p>
            <p className="text-sm text-muted-foreground">
              Your receipt is below — print it or keep it in your orders. A copy goes to {order.email} as
              soon as your sending domain is verified.
            </p>
          </div>
        </div>

        <article className="print-sheet mt-6 rounded-xl border border-border bg-card p-6 shadow-card sm:p-9">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <h1 className="font-display text-2xl font-semibold">BookMarket Ghana</h1>
              <p className="mt-1 text-sm text-muted-foreground">Student textbook store</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {SUPPORT_EMAIL} · {SUPPORT_PHONE}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Receipt
              </p>
              <p className="font-display text-lg font-semibold">{order.order_ref}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(order.paid_at ?? order.created_at)}
              </p>
            </div>
          </header>

          <section className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Student
              </h2>
              <p className="mt-2 font-medium">{order.buyer_name}</p>
              <p className="text-sm text-muted-foreground">{order.email}</p>
              <p className="text-sm text-muted-foreground">{order.phone}</p>
            </div>
            <div className="sm:text-right">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Programme
              </h2>
              <p className="mt-2 font-medium">{order.school_name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{order.department_name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">
                {order.level ? `Level ${order.level}` : "—"}
              </p>
            </div>
          </section>

          <table className="w-full border-t border-border text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="py-3">Book</th>
                <th className="py-3 text-center">Qty</th>
                <th className="py-3 text-right">Price</th>
                <th className="py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.order_items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-3">
                    <span className="block font-medium">{item.title}</span>
                    <span className="text-muted-foreground">{item.author}</span>
                  </td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">{cedis(item.unit_price)}</td>
                  <td className="py-3 text-right font-medium">
                    {cedis(Number(item.unit_price) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex flex-col items-end gap-1 border-t border-border pt-5">
            <p className="text-sm text-muted-foreground">
              Payment method: {order.payment_method ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              Status: {order.payment_status === "PAID" ? "Paid in full" : "Awaiting payment"}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-primary">
              Total {cedis(order.total)}
            </p>
          </div>

          <p className="mt-8 border-t border-border pt-5 text-center text-xs text-muted-foreground">
            Thank you for buying from BookMarket Ghana. Present this receipt at your campus pickup point.
          </p>
        </article>
      </div>
    </div>
  );
}
