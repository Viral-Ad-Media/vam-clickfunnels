import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { fetchOrders } from "@/lib/clickfunnels/fetch";
import { AlertCircle, Boxes, ClipboardList, RefreshCcw, Settings } from "lucide-react";

export default async function Page() {
  let count = 0;
  let status: number | null = null;
  let error: string | null = null;

  try {
    const res = await fetchOrders({ page: 1, per_page: 5 });
    status = res.status;
    if (res.ok && Array.isArray(res.data?.data)) {
      count = res.data.data.length;
    } else {
      error = res.error ?? "Failed to fetch orders";
    }
  } catch (errorValue: unknown) {
    error = errorValue instanceof Error ? errorValue.message : "Failed";
  }

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex-1 space-y-7 py-10 sm:space-y-9 sm:py-12">
        <section className="surface-panel reveal p-7 sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <span className="info-chip">Integration Overview</span>
              <h1 className="text-3xl font-semibold sm:text-4xl">ClickFunnels Dashboard</h1>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Monitor connectivity, inspect order activity, and jump straight to order or fulfillment workflows.
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/80 bg-white/78 px-5 text-sm font-semibold transition-colors hover:bg-white"
            >
              <Settings className="h-4 w-4" />
              Integration Settings
            </Link>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <article className="surface-panel reveal reveal-delay-1 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">API Status</p>
            <p className="mt-2 text-3xl font-semibold">{status ?? "--"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {status === 200 ? "Connected" : "Awaiting successful response"}
            </p>
          </article>
          <article className="surface-panel reveal reveal-delay-2 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent Orders</p>
            <p className="mt-2 text-3xl font-semibold">{count}</p>
            <p className="mt-1 text-xs text-muted-foreground">Pulled from latest fetch</p>
          </article>
          <article className="surface-panel reveal reveal-delay-2 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sync Mode</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
              <RefreshCcw className="h-4 w-4 text-secondary" />
              Manual Trigger
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Refresh by revisiting dashboard</p>
          </article>
          <article className="surface-panel reveal reveal-delay-3 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</p>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
              <Boxes className="h-4 w-4 text-primary" />
              Active
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Credentials loaded for current user</p>
          </article>
        </section>

        {error && (
          <section className="reveal reveal-delay-2 rounded-3xl border border-red-300/70 bg-red-50/90 p-5 text-red-900">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <h2 className="text-sm font-semibold">Connection error</h2>
                <p className="mt-1 text-xs sm:text-sm">{error}</p>
                <Link href="/settings" className="mt-2 inline-flex text-xs font-semibold underline">
                  Update configuration
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/clickfunnels/orders"
            className="surface-panel reveal reveal-delay-2 group block p-6"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/20 p-2 text-primary">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold">Orders</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Browse order IDs, customer emails, and totals with quick links into detail pages.
            </p>
            <p className="mt-4 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              View Orders {"->"}
            </p>
          </Link>

          <Link
            href="/clickfunnels/fulfillments"
            className="surface-panel reveal reveal-delay-3 group block p-6"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-secondary/20 p-2 text-secondary-foreground">
                <Boxes className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold">Fulfillments</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Track shipment lifecycle and statuses for each order directly from the workspace.
            </p>
            <p className="mt-4 text-sm font-semibold text-secondary-foreground transition-transform group-hover:translate-x-0.5">
              View Fulfillments {"->"}
            </p>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
