import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CreditCard,
  GraduationCap,
  Printer,
  Search,
  ShieldCheck,
} from "lucide-react";
import heroImage from "@/assets/hero-students.jpg";
import { useFeaturedBooks, useSchools } from "@/hooks/use-catalog";
import { cedis } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "BookMarket Ghana — Buy your course textbooks online" },
      {
        name: "description",
        content:
          "Pick your school, department and level and see only the textbooks set for your class. Order, pay with Mobile Money or card, and print your receipt.",
      },
      { property: "og:title", content: "BookMarket Ghana — Buy your course textbooks online" },
      {
        property: "og:description",
        content:
          "The student bookshop that already knows your course list. Order in minutes and print your receipt.",
      },
    ],
  }),
  component: LandingPage,
});

const steps = [
  {
    icon: GraduationCap,
    title: "Tell us where you study",
    body: "Create an account with your school, department and level. That's all we need.",
  },
  {
    icon: Search,
    title: "See only your books",
    body: "Your shelf shows the textbooks set for your class — nothing you don't need.",
  },
  {
    icon: Printer,
    title: "Pay and print your receipt",
    body: "Pay with Mobile Money or card, then print or save your electronic receipt.",
  },
];

const benefits = [
  { icon: BadgeCheck, title: "Course-accurate lists", body: "Books are grouped by department and level, the way your lecturers set them." },
  { icon: CreditCard, title: "Mobile Money or card", body: "Pay the way you already pay — checkout takes less than a minute." },
  { icon: ShieldCheck, title: "Receipt for every order", body: "A printable receipt with your order number, ready for campus pickup." },
];

const faqs = [
  {
    q: "How do I know the books are for my class?",
    a: "When you sign up you choose your school, department and level. Your shelf then shows only the books set for that class. You can switch level any time if you're repeating or reading ahead.",
  },
  {
    q: "How do I pay?",
    a: "At checkout you choose Mobile Money (MTN, Telecel, AirtelTigo) or a card. Payments are in test mode for now, so nothing is charged while we finish setting up the payment partner.",
  },
  {
    q: "Where do I collect my books?",
    a: "Bring your printed or saved receipt to the campus pickup point. Your order number is on it.",
  },
  {
    q: "Can I order for a friend?",
    a: "Yes. Put their name and phone number on the order at checkout and give them the receipt.",
  },
];

function LandingPage() {
  const { data: books } = useFeaturedBooks();
  const { data: schools } = useSchools();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="paper-grain border-b border-border/70">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                <BookOpen className="size-3.5" /> Student bookshop
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Your course books, without the queue.
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                Choose your school, department and level once. BookMarket shows you only the textbooks
                set for your class — order, pay and print your receipt in minutes.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <Button size="lg" className="gap-2">
                    Create your account <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link to="/auth" search={{ mode: "signin" }}>
                  <Button size="lg" variant="outline">
                    I already have an account
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                {schools && schools.length > 0
                  ? `Serving ${schools.length} universities including ${schools
                      .slice(0, 3)
                      .map((school) => school.code ?? school.name)
                      .join(", ")}.`
                  : "Serving universities across Ghana."}
              </p>
            </div>

            <div className="relative">
              <img
                src={heroImage}
                alt="Ghanaian university students carrying their textbooks on campus"
                width={1600}
                height={1200}
                className="aspect-[4/3] w-full rounded-xl border border-border object-cover shadow-lift"
              />
              <div className="absolute -bottom-5 left-5 rounded-xl border border-border bg-card px-5 py-4 shadow-lift">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Average checkout</p>
                <p className="font-display text-2xl font-semibold text-primary">Under 2 minutes</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-lift"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-display text-3xl font-semibold text-gold">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border/70 bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Books on the shelves</h2>
                <p className="mt-2 text-muted-foreground">A taste of what students are ordering now.</p>
              </div>
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button variant="outline" className="gap-2">
                  See your department's list <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {(books ?? []).map((book) => (
                <article
                  key={book.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-lift"
                >
                  <div className="flex h-32 flex-col justify-between bg-primary p-4 text-primary-foreground">
                    <span className="text-[11px] font-semibold uppercase tracking-widest opacity-70">
                      {book.course_code ?? `Level ${book.level}`}
                    </span>
                    <span className="font-display text-base leading-tight">{book.title}</span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <p className="mt-3 font-display text-lg font-semibold text-primary">
                      {cedis(book.price)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Why students use BookMarket</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-lift">
                <benefit.icon className="size-6 text-primary" />
                <h3 className="mt-4 font-display text-xl font-semibold">{benefit.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{benefit.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-20">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Questions students ask</h2>
          <Accordion type="single" collapsible className="mt-6">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left font-medium">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 rounded-xl bg-primary px-6 py-12 text-center text-primary-foreground">
            <h2 className="font-display text-3xl font-semibold">Ready to get your books?</h2>
            <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">
              Create your account, pick your books and pay in a couple of minutes.
            </p>
            <Link to="/auth" search={{ mode: "signup" }} className="mt-6 inline-block">
              <Button size="lg" variant="secondary" className="gap-2">
                Get started <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
