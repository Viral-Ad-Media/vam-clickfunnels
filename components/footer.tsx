import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-white/70 backdrop-blur-md">
      <div className="container max-w-screen-2xl py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide">ClickFunnels VAM</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Enterprise operations layer for ClickFunnels order and fulfillment workflows.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Resources</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <a
                  href="https://developers.myclickfunnels.com/docs/intro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  API Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://myclickfunnels.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  ClickFunnels Platform
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Navigate</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/settings" className="text-muted-foreground transition-colors hover:text-foreground">
                  Integration Settings
                </Link>
              </li>
              <li>
                <Link href="/clickfunnels" className="text-muted-foreground transition-colors hover:text-foreground">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/70 pt-4 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ClickFunnels VAM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
