import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2 } from "lucide-react";
import { signInStudent, signUpStudent } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments, useSchools } from "@/hooks/use-catalog";
import { LEVELS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteFooter } from "@/components/site-footer";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode: Mode } => ({
    mode: search['mode'] === "signup" ? "signup" : "signin",
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in or create an account — BookMarket Ghana" },
      {
        name: "description",
        content:
          "Create your BookMarket account with your school, department and level, or sign in with your username, email or phone number.",
      },
      { property: "og:title", content: "Sign in or create an account — BookMarket Ghana" },
      {
        property: "og:description",
        content: "Access the textbooks set for your department and level at BookMarket Ghana.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void signedInDestination().then(to=>navigate({to,replace:true}));
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="paper-grain flex-1">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_minmax(0,460px)] lg:py-16">
          <aside className="hidden flex-col justify-center lg:flex">
            <Link to="/" className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <BookOpen className="size-5" />
              </span>
              <span className="font-display text-xl font-semibold">BookMarket Ghana</span>
            </Link>
            <h1 className="mt-8 font-display text-4xl font-semibold leading-tight">
              Your course books, already sorted by department and level.
            </h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Tell us where you study once. From then on your shelf shows only the books set for your
              class — order, pay and print your receipt in minutes.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "No searching through books that aren't on your list",
                "Mobile Money or card at checkout",
                "Printable receipt for every order",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                  <span className="text-muted-foreground">{line}</span>
                </li>
              ))}
            </ul>
          </aside>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                replace
                className={`rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
                  mode === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                replace
                className={`rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
                  mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
              >
                Create account
              </Link>
            </div>

            {mode === "signup" ? <SignUpForm /> : <SignInForm />}
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

async function signedInDestination(): Promise<'/admin' | '/books'> {
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) return '/books';
  const {data} = await supabase.from('user_roles').select('role').eq('user_id',user.id).in('role',['admin','super_admin']);
  return data?.length ? '/admin' : '/books';
}

async function applySession(session: { access_token: string; refresh_token: string }) {
  const { error } = await supabase.auth.setSession(session);
  if (error) throw new Error("We signed you in but could not start your session. Please try again.");
}

function SignInForm() {
  const signIn = useServerFn(signInStudent);
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await signIn({ data: { identifier, password } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await applySession(result.session);
      toast.success("Welcome back!");
      navigate({ to: await signedInDestination() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use your username, email address or phone number.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="identifier">Username, email or phone</Label>
        <Input
          id="identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="ama.mensah / ama@mail.com / 0551234567"
          autoComplete="username"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Sign in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/auth" search={{ mode: "signup" }} replace className="font-medium text-primary underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

function SignUpForm() {
  const signUp = useServerFn(signUpStudent);
  const navigate = useNavigate();
  const { data: schools } = useSchools();
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    schoolId: "",
    departmentId: "",
    level: "",
  });
  const { data: departments, isLoading: departmentsLoading } = useDepartments(form.schoolId || undefined);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "schoolId" ? { departmentId: "" } : {}),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await signUp({ data: form });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await applySession(result.session);
      toast.success("Account created. Here are your books.");
      navigate({ to: await signedInDestination() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">Create your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your school, department and level decide which books you see.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={form.username}
            onChange={(event) => update("username", event.target.value)}
            placeholder="ama.mensah"
            autoComplete="username"
            required
          />
          <p className="text-xs text-muted-foreground">
            3–30 characters: letters, numbers, dot or underscore. No spaces.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="0551234567"
            autoComplete="tel"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          placeholder="ama@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">Password</Label>
        <Input
          id="new-password"
          type="password"
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>School</Label>
        <Select value={form.schoolId} onValueChange={(value) => update("schoolId", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your school" />
          </SelectTrigger>
          <SelectContent>
            {(schools ?? []).map((school) => (
              <SelectItem key={school.id} value={school.id}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Department</Label>
          <Select
            value={form.departmentId}
            onValueChange={(value) => update("departmentId", value)}
            disabled={!form.schoolId || departmentsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={form.schoolId ? "Select department" : "Pick a school first"} />
            </SelectTrigger>
            <SelectContent>
              {(departments ?? []).map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Level</Label>
          <Select value={form.level} onValueChange={(value) => update("level", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  Level {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/auth" search={{ mode: "signin" }} replace className="font-medium text-primary underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
