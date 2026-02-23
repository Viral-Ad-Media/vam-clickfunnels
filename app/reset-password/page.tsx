"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function ResetPasswordPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createBrowserClient(url, anonKey);
  }, []);

  const [checkingSession, setCheckingSession] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        if (!supabase) {
          throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!active) return;
        setCanReset(Boolean(data.session));
      } catch (errorValue: unknown) {
        if (!active) return;
        setMessage({
          type: "error",
          text: errorValue instanceof Error ? errorValue.message : "Failed to validate reset session",
        });
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!supabase) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
      }

      if (!canReset) {
        throw new Error("Reset session is missing. Request a new password reset link.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);

      setMessage({ type: "success", text: "Password updated successfully. Redirecting to dashboard..." });
      setTimeout(() => {
        router.replace("/clickfunnels");
        router.refresh();
      }, 1200);
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "Failed to reset password",
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
            <p className="info-chip w-fit">Password Update</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">Choose a new password</h1>
            <p className="text-sm text-muted-foreground">Set a secure password to complete your recovery flow.</p>
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

          {checkingSession ? (
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating reset session...
            </div>
          ) : canReset ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  New password
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
                  Confirm new password
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11 w-full rounded-lg border border-border/80 bg-white/85 px-3 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Re-enter your new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/92 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {loading ? "Updating password..." : "Update password"}
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              Reset session is missing or expired. Request a fresh reset link to continue.
              <div className="mt-2">
                <Link href="/forgot-password" className="font-semibold underline">
                  Request new link
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
