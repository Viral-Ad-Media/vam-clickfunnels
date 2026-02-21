// app/clickfunnels/fulfillments/page.tsx
import Link from "next/link";
import { fetchFulfillments } from "@/lib/clickfunnels/fetch";

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
      <div className="max-w-3xl mx-auto py-8">
        <h1 className="text-xl font-semibold">Fulfillments</h1>
        <div className="text-sm text-slate-600">Open an order to view fulfillments.</div>
        <Link href="/clickfunnels/orders" className="underline text-indigo-700 mt-2 inline-block">Go to Orders</Link>
      </div>
    );
  }
  const res = await fetchFulfillments(orderId);
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-4">
      <h1 className="text-xl font-semibold">Fulfillments for Order {orderId}</h1>
      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.status ?? "—"}</td>
                <td className="p-2">{r.created_at ?? "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="p-3 text-slate-500" colSpan={3}>No fulfillments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Link href={`/clickfunnels/orders/${orderId}`} className="underline text-indigo-700">Back to Order</Link>
    </div>
  );
}
