import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/55 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between gap-4">
        <Link href="/" className="group inline-flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-400/35 transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">ClickFunnels VAM</p>
            <p className="text-xs text-muted-foreground">Order Intelligence Hub</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3 text-sm font-medium">
          <Link
            href="/clickfunnels"
            className="rounded-full border border-white/70 bg-white/72 px-4 py-2 transition-colors hover:bg-white"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="rounded-full border border-primary/35 bg-primary/14 px-4 py-2 text-foreground transition-colors hover:bg-primary/22"
          >
            Settings
          </Link>
          <Link
            href="https://developers.myclickfunnels.com/docs/intro"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full border border-secondary/30 bg-secondary/16 px-4 py-2 text-secondary-foreground transition-colors hover:bg-secondary/24 sm:inline-flex"
          >
            API Docs
          </Link>
        </nav>
      </div>
    </header>
  );
}
