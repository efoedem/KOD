import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, LogOut, Menu, ShoppingBag, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useIsAdmin } from "@/hooks/use-catalog";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { user, loading } = useSession();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { count } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  const links = user
    ? [
        { to: "/books" as const, label: "Books" },
        { to: "/orders" as const, label: "My orders" },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:flex sm:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold leading-none">
              BookMarket
            </span>
            <span className="text-xs text-muted-foreground">Ghana</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link
              to="/admin"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4" /> Admin
              </span>
            </Link>
          ) : null}

          {user ? (
            <>
              <Link to="/checkout" className="relative ml-1">
                <Button variant="outline" size="sm" className="gap-2">
                  <ShoppingBag className="size-4" />
                  Cart
                  {count > 0 ? (
                    <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {count}
                    </span>
                  ) : null}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleSignOut}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </>
          ) : loading ? null : (
            <div className="ml-1 flex items-center gap-2">
              <Link to="/auth" search={{ mode: "signin" }}>
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="sm">Create account</Button>
              </Link>
            </div>
          )}
        </nav>

        <Button
          variant="outline"
          size="icon"
          className="sm:hidden"
          aria-label="Open menu"
          onClick={() => setOpen((value) => !value)}
        >
          <Menu className="size-4" />
        </Button>
      </div>

      <div className={cn("border-t border-border/70 px-4 pb-3 pt-2 sm:hidden", open ? "block" : "hidden")}>
        <div className="flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <Link to="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium">
              Admin
            </Link>
          ) : null}
          {user ? (
            <>
              <Link to="/checkout" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium">
                Cart ({count})
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
