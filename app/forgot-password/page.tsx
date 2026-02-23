"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createBrowserClient(url, anonKey);
  }, []);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!supabase) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw new Error(error.message);

      setMessage({
        type: "success",
        text: "Password reset email sent. Check your inbox for a secure link.",
      });
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to request password reset",
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
            <p className="info-chip w-fit">Account Recovery</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">Reset your password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your account email and we will send a one-time reset link.
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

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/92 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
              {loading ? "Sending reset link..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-5 text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
