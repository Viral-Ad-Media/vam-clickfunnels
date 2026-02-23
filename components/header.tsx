"use client";

import Link from "next/link";
import { Building2, Loader2, LogOut } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createBrowserClient(url, anonKey);
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(() => Boolean(supabase));
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setInitializing(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase || signingOut) return;

    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
    setSigningOut(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/88 backdrop-blur-md">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between gap-4">
        <Link href="/" className="group inline-flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">ClickFunnels VAM</p>
            <p className="text-xs text-muted-foreground">Operations Console</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3 text-sm font-medium">
          {user ? (
            <>
              <Link
                href="/clickfunnels"
                className="rounded-md border border-border/80 bg-white/70 px-4 py-2 transition-colors hover:bg-white"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-foreground transition-colors hover:bg-primary/16"
              >
                Settings
              </Link>
              <Link
                href="/settings/organization"
                className="rounded-md border border-border/80 bg-white/70 px-4 py-2 transition-colors hover:bg-white"
              >
                Organization
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center gap-2 rounded-md border border-border/80 bg-white/70 px-4 py-2 transition-colors hover:bg-white disabled:opacity-60"
              >
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-border/80 bg-white/70 px-4 py-2 transition-colors hover:bg-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md border border-primary/40 bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/92"
              >
                Sign up
              </Link>
            </>
          )}

          <Link
            href="https://developers.myclickfunnels.com/docs/intro"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-md border border-border/80 bg-white/70 px-4 py-2 transition-colors hover:bg-white sm:inline-flex"
          >
            API Docs
          </Link>

          {initializing && <span className="hidden text-xs text-muted-foreground sm:inline">Checking session...</span>}
        </nav>
      </div>
    </header>
  );
}
