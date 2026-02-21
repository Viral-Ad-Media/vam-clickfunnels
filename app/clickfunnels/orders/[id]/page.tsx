import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { fetchOrderDetails, fetchFulfillments } from "@/lib/clickfunnels/fetch";
import { Boxes, FileJson2 } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  const [details, fulfillments] = await Promise.all([
    fetchOrderDetails(id),
    fetchFulfillments(id),
  ]);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex-1 space-y-6 py-10 sm:py-12">
        <section className="surface-panel reveal p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="info-chip w-fit">
                <FileJson2 className="h-3.5 w-3.5" />
                Order Snapshot
              </span>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Order {id}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Details status: {details.status} • Fulfillments status: {fulfillments.status}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/clickfunnels/orders"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/80 bg-white/80 px-4 text-sm font-semibold hover:bg-white"
              >
                Orders
              </Link>
              <Link
                href={`/clickfunnels/fulfillments?order=${id}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                <Boxes className="h-4 w-4" />
                Fulfillments
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="surface-panel-dark reveal reveal-delay-1 overflow-hidden p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Order Details JSON</h2>
            <pre className="max-h-[30rem] overflow-x-auto overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/55 p-4 text-xs leading-relaxed text-slate-100">
              {JSON.stringify(details.data, null, 2)}
            </pre>
          </article>

          <article className="surface-panel-dark reveal reveal-delay-2 overflow-hidden p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">Fulfillments JSON</h2>
            <pre className="max-h-[30rem] overflow-x-auto overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/55 p-4 text-xs leading-relaxed text-slate-100">
              {JSON.stringify(fulfillments.data, null, 2)}
            </pre>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
}
