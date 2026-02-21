import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { fetchOrders } from "@/lib/clickfunnels/fetch";
import { ArrowUpRight, ListOrdered } from "lucide-react";

export default async function Page() {
  const res = await fetchOrders({ page: 1, per_page: 25 });
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex-1 space-y-6 py-10 sm:py-12">
        <section className="surface-panel reveal p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <span className="info-chip">
                <ListOrdered className="h-3.5 w-3.5" />
                Orders Ledger
              </span>
              <h1 className="text-3xl font-semibold sm:text-4xl">ClickFunnels Orders</h1>
              <p className="text-sm text-muted-foreground">Status: {res.status} • Source: {res.url}</p>
            </div>
            <Link
              href="/clickfunnels"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border/80 bg-white/80 px-4 text-sm font-semibold hover:bg-white"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>

        <section className="surface-panel reveal reveal-delay-1 overflow-hidden p-2 sm:p-3">
          <div className="overflow-x-auto rounded-xl">
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Total</th>
                  <th>Created</th>
                  <th>Fulfillments</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium text-foreground">
                      <Link
                        href={`/clickfunnels/orders/${row.id}`}
                        className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
                      >
                        {row.id}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                    <td>{row.customer_email ?? "--"}</td>
                    <td>{row.total_amount ?? "--"}</td>
                    <td>{row.created_at ?? "--"}</td>
                    <td>
                      <Link
                        href={`/clickfunnels/fulfillments?order=${row.id}`}
                        className="text-sm font-semibold text-secondary-foreground underline-offset-4 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-7 text-center text-sm text-muted-foreground">
                      No orders found for this account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
