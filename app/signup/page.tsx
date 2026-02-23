"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2, UserPlus } from "lucide-react";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/clickfunnels";
  return value;
}

export default function SignupPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createBrowserClient(url, anonKey);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nextPath, setNextPath] = useState("/clickfunnels");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(safeNextPath(params.get("next")));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!supabase) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo,
        },
      });

      if (error) throw new Error(error.message);

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setMessage({
        type: "success",
        text: "Account created. Check your email to verify your account and complete sign-in.",
      });
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to create account",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex flex-1 items-center justify-center py-12">
        <section className="surface-panel w-full max-w-md p-7 sm:p-8">
          <div className="space-y-2">
            <p className="info-chip w-fit">New Workspace</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">Create account</h1>
            <p className="text-sm text-muted-foreground">
              Register your team account to start managing ClickFunnels operations.
            </p>
          </div>

          {message && (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-red-300 bg-red-50 text-red-900"
              }`}
            >
              {message.text}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-lg border border-border/80 bg-white/85 px-3 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-border/80 bg-white/85 px-3 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm_password" className="text-sm font-medium">
                Confirm password
              </label>
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-border/80 bg-white/85 px-3 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Re-enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/92 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <p className="mt-5 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
