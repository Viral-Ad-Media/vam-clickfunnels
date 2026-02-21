export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50">
      <div className="container max-w-screen-2xl py-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold">ClickFunnels VAM</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Seamless integration with ClickFunnels API for order and fulfillment management.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Resources</h4>
            <ul className="mt-2 space-y-1 text-xs">
              <li>
                <a
                  href="https://developers.myclickfunnels.com/docs/intro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  API Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://myclickfunnels.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  ClickFunnels
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Legal</h4>
            <ul className="mt-2 space-y-1 text-xs">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ClickFunnels VAM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
