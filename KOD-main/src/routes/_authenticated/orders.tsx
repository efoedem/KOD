import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { cedis, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "My orders — BookMarket Ghana" },
      { name: "description", content: "Every order you have placed, with printable receipts." },
      { property: "og:title", content: "My orders — BookMarket Ghana" },
      { property: "og:description", content: "Every order you have placed, with printable receipts." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useSession();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_ref, total, status, payment_status, payment_method, created_at, order_items(id, title, quantity)",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="paper-grain min-h-[70vh]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">My orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Open any order to print its receipt.</p>

        {isLoading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (orders ?? []).length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
            <Receipt className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-4 font-display text-xl font-semibold">No orders yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your first order will show up here.</p>
            <Link to="/books" className="mt-6 inline-block">
              <Button>Browse books</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {(orders ?? []).map((order) => (
              <article
                key={order.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{order.order_ref}</h2>
                    <Badge variant={order.payment_status === "PAID" ? "default" : "secondary"}>
                      {order.payment_status === "PAID" ? "Paid" : "Awaiting payment"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(order.created_at)} ·{" "}
                    {order.order_items.reduce((sum, item) => sum + item.quantity, 0)} book(s)
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {order.order_items.map((item) => item.title).join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-semibold text-primary">{cedis(order.total)}</p>
                  {order.payment_status === "PAID" ? (
                    <Link to="/receipt/$orderId" params={{ orderId: order.id }}>
                      <Button variant="outline" size="sm" className="mt-2 gap-1.5">
                        <FileText className="size-4" /> Receipt
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/payment/$orderId" params={{ orderId: order.id }}>
                      <Button size="sm" className="mt-2">
                        Pay now
                      </Button>
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
