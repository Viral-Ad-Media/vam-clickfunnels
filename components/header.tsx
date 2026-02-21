import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              CF
            </div>
            <span className="hidden sm:inline">ClickFunnels VAM</span>
          </Link>
        </div>

        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/clickfunnels"
            className="transition-colors hover:text-foreground/80"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="transition-colors hover:text-foreground/80"
          >
            Settings
          </Link>
          <Link
            href="https://developers.myclickfunnels.com/docs/intro"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground/80"
          >
            API Docs
          </Link>
        </nav>
      </div>
    </header>
  );
}
