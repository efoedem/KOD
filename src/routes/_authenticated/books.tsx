import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Check, Plus, Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { useBooks, useDepartments, useProfile, useSchools } from "@/hooks/use-catalog";
import { cedis } from "@/lib/format";
import { shelfSelection } from "@/lib/student-account";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/books")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Your books — BookMarket Ghana" },
      {
        name: "description",
        content: "The textbooks set for your department and level, ready to order.",
      },
      { property: "og:title", content: "Your books — BookMarket Ghana" },
      {
        property: "og:description",
        content: "The textbooks set for your department and level, ready to order.",
      },
    ],
  }),
  component: BooksPage,
});

function BooksPage() {
  const { user, loading } = useSession();
  if (loading || !user) return <Skeleton className="mx-auto my-8 h-64 max-w-6xl" />;
  return <StudentShelf key={user.id} userId={user.id} />;
}

function StudentShelf({ userId }: { userId: string }) {
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch,
  } = useProfile(userId);
  const { data: schools } = useSchools();
  const cart = useCart();

  const [query, setQuery] = useState("");

  // Get student program selection directly from their saved profile
  const { schoolId, departmentId, level } = shelfSelection(profile, {});

  const { data: departments } = useDepartments(schoolId);
  const { data: books, isLoading: booksLoading } = useBooks(departmentId, level);

  const schoolName = schools?.find((school) => school.id === schoolId)?.name ?? "";
  const departmentName =
    departments?.find((department) => department.id === departmentId)?.name ?? "";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return books ?? [];
    return (books ?? []).filter((book) =>
      [book.title, book.author, book.course_code ?? ""].join(" ").toLowerCase().includes(needle),
    );
  }, [books, query]);

  return (
    <div className="paper-grain">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your shelf
            </p>
            <h1 className="mt-1 truncate font-display text-3xl font-semibold sm:text-4xl">
              {departmentName || "Your books"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {schoolName ? `${schoolName} · ` : ""}
              {level ? `Level ${level}` : ""}
            </p>
          </div>
          <Link to="/checkout">
            <Button variant="outline" className="gap-2">
              <ShoppingBag className="size-4" />
              Cart
              {cart.count > 0 ? (
                <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {cart.count}
                </span>
              ) : null}
            </Button>
          </Link>
        </header>

        {/* Filter bar displaying search input only */}
        <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="space-y-2">
            <Label htmlFor="search">Search your textbooks</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Title, author or course code..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {profileError ? (
          <div role="alert" className="mt-8 flex flex-wrap items-center gap-4">
            <p>We could not load your saved school, department and level.</p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : profileLoading || booksLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
            <BookOpen className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-4 font-display text-xl font-semibold">No books found</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Nothing matches your search criteria for your current department and level.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((book) => {
              const inCart = cart.has(book.id);
              return (
                <article
                  key={book.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-lift"
                >
                  <div className="relative h-40 overflow-hidden bg-primary">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={`Cover of ${book.title}`}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full flex-col justify-between p-4 text-primary-foreground">
                        <span className="text-[11px] font-semibold uppercase tracking-widest opacity-70">
                          {book.course_code ?? "Course text"}
                        </span>
                        <span className="font-display text-lg leading-tight">{book.title}</span>
                      </div>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold text-gold-foreground">
                      Level {book.level}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="font-display text-lg font-semibold leading-snug">
                      {book.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                    {book.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {book.description}
                      </p>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between gap-3 pt-1">
                      <span className="font-display text-xl font-semibold text-primary">
                        {cedis(book.price)}
                      </span>
                      <Button
                        size="sm"
                        variant={inCart ? "secondary" : "default"}
                        className="gap-1.5"
                        onClick={() => {
                          cart.add({
                            bookId: book.id,
                            title: book.title,
                            author: book.author,
                            price: Number(book.price),
                          });
                          toast.success(`${book.title} added to your order`);
                        }}
                      >
                        {inCart ? <Check className="size-4" /> : <Plus className="size-4" />}
                        {inCart ? "Added" : "Select"}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {cart.count > 0 ? (
          <div className="no-print sticky bottom-4 z-30 mt-8">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-3 shadow-lift">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {cart.count} {cart.count === 1 ? "book" : "books"} selected
                </p>
                <p className="text-sm text-muted-foreground">{cedis(cart.total)}</p>
              </div>
              <Link to="/checkout">
                <Button className="gap-2">
                  Place order <ShoppingBag className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
