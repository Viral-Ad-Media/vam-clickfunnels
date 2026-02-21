// app/clickfunnels/page.tsx
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { fetchOrders } from "@/lib/clickfunnels/fetch";
import { AlertCircle, Settings } from "lucide-react";

export default async function Page() {
  let count = 0,
    status: number | null = null,
    error: string | null = null;

  try {
    const res = await fetchOrders({ page: 1, per_page: 5 });
    status = res.status;
    if (res.ok && Array.isArray(res.data?.data)) count = res.data.data.length;
    else error = res.error ?? "Failed to fetch orders";
  } catch (errorValue: unknown) {
    error = errorValue instanceof Error ? errorValue.message : "Failed";
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 container max-w-screen-2xl py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Overview of your ClickFunnels integration
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-input hover:bg-accent transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>

          {/* Status Cards */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-6 space-y-2">
              <p className="text-sm text-muted-foreground">API Status</p>
              <p className="text-2xl font-bold">{status ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {status === 200 ? "✓ Connected" : "Checking connection..."}
              </p>
            </div>
            <div className="rounded-lg border border-border p-6 space-y-2">
              <p className="text-sm text-muted-foreground">Recent Orders</p>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">From last fetch</p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Connection Error</p>
                <p className="text-xs mt-1">{error}</p>
                <Link href="/settings" className="text-red-700 underline text-xs mt-2 inline-block">
                  Update configuration →
                </Link>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/clickfunnels/orders"
              className="rounded-lg border border-border p-6 hover:border-primary hover:bg-card transition-colors"
            >
              <h3 className="font-semibold">Orders</h3>
              <p className="text-sm text-muted-foreground mt-2">
                View and manage your ClickFunnels orders
              </p>
              <p className="text-xs text-primary mt-4">View Orders →</p>
            </Link>
            <Link
              href="/clickfunnels/fulfillments"
              className="rounded-lg border border-border p-6 hover:border-primary hover:bg-card transition-colors"
            >
              <h3 className="font-semibold">Fulfillments</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Track fulfillment status for your orders
              </p>
              <p className="text-xs text-primary mt-4">View Fulfillments →</p>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
