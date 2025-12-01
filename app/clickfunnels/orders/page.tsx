// app/dashboard/clickfunnels/orders/page.tsx
import Link from "next/link";
import { fetchOrders } from "@/lib/clickfunnels/fetch";

export default async function Page() {
  const res = await fetchOrders({ page: 1, per_page: 25 });
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-4">
      <h1 className="text-xl font-semibold">ClickFunnels • Orders</h1>
      <div className="text-sm text-slate-600">Status: {res.status} • URL: {res.url}</div>
      <div className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Total</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-left">Fulfillments</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">
                  <Link href={`/dashboard/clickfunnels/orders/${r.id}`} className="text-indigo-700 underline">{r.id}</Link>
                </td>
                <td className="p-2">{r.customer_email ?? "—"}</td>
                <td className="p-2">{r.total_amount ?? "—"}</td>
                <td className="p-2">{r.created_at ?? "—"}</td>
                <td className="p-2">
                  <Link href={`/dashboard/clickfunnels/fulfillments?order=${r.id}`} className="underline">View</Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="p-3 text-slate-500" colSpan={5}>No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
