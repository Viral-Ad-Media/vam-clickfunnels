import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { fetchFulfillments } from "@/lib/clickfunnels/fetch";
import { Boxes, PackageSearch } from "lucide-react";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const orderId = Array.isArray(resolvedSearchParams.order)
    ? resolvedSearchParams.order[0]
    : resolvedSearchParams.order;

  if (!orderId) {
    return (
      <div className="page-shell flex min-h-screen flex-col">
        <Header />

        <main className="container max-w-screen-2xl flex-1 py-12">
          <section className="surface-panel reveal mx-auto max-w-3xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/14 text-primary">
              <PackageSearch className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold">Select an order</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Open an order record before viewing fulfillment data.
            </p>
            <Link
              href="/clickfunnels/orders"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground"
            >
              Go to Orders
            </Link>
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  const res = await fetchFulfillments(orderId);
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex-1 space-y-6 py-10 sm:py-12">
        <section className="surface-panel reveal p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="info-chip w-fit">
                <Boxes className="h-3.5 w-3.5" />
                Fulfillment Tracking
              </span>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Order {orderId}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Status: {res.status}</p>
            </div>
            <Link
              href={`/clickfunnels/orders/${orderId}`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border/80 bg-white/80 px-4 text-sm font-semibold hover:bg-white"
            >
              Back to Order
            </Link>
          </div>
        </section>

        <section className="surface-panel reveal reveal-delay-1 overflow-hidden p-2 sm:p-3">
          <div className="overflow-x-auto rounded-xl">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.id}</td>
                    <td>{row.status ?? "--"}</td>
                    <td>{row.created_at ?? "--"}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={3} className="px-4 py-7 text-center text-sm text-muted-foreground">
                      No fulfillments found for this order.
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
