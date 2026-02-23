"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Loader2, LogIn } from "lucide-react";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/clickfunnels";
  return value;
}

export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createBrowserClient(url, anonKey);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/clickfunnels");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw new Error(error.message);

      router.replace(nextPath);
      router.refresh();
    } catch (errorValue: unknown) {
      setMessage(errorValue instanceof Error ? errorValue.message : "Failed to log in");
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
            <p className="info-chip w-fit">Account Access</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">Log in</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your ClickFunnels integration and workspace data.
            </p>
          </div>

          {message && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
              {message}
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-border/80 bg-white/85 px-3 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/92 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>

          <p className="mt-5 text-sm text-muted-foreground">
            Need an account?{" "}
            <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-primary hover:underline">
              Create one
            </Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
