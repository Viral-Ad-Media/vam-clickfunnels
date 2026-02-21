import Link from "next/link";
import { Building2 } from "lucide-react";

export function Header() {
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
            href="https://developers.myclickfunnels.com/docs/intro"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-md border border-border/80 bg-white/70 px-4 py-2 transition-colors hover:bg-white sm:inline-flex"
          >
            API Docs
          </Link>
        </nav>
      </div>
    </header>
  );
}
