"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email",
  "email_change",
]);

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/clickfunnels";
  return value;
}

export default function AuthCallbackPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createBrowserClient(url, anonKey);
  }, []);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function completeAuthFlow() {
      try {
        if (!supabase) {
          throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        const type = params.get("type");

        const fallbackNext = type === "recovery" ? "/reset-password" : "/clickfunnels";
        const nextPath = safeNextPath(params.get("next") ?? fallbackNext);

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type && OTP_TYPES.has(type as EmailOtpType)) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as EmailOtpType,
          });
          if (verifyError) throw verifyError;
        }

        if (!active) return;

        router.replace(nextPath);
        router.refresh();
      } catch (errorValue: unknown) {
        if (!active) return;
        setError(errorValue instanceof Error ? errorValue.message : "Authentication callback failed");
      }
    }

    void completeAuthFlow();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex flex-1 items-center justify-center py-12">
        <section className="surface-panel w-full max-w-lg p-7 sm:p-8">
          <h1 className="text-2xl font-semibold sm:text-3xl">Completing authentication</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifying your email link and creating your secure session.
          </p>

          {error ? (
            <p className="mt-5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
          ) : (
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting...
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
