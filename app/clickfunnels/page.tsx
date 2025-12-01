// app/dashboard/clickfunnels/page.tsx
import Link from "next/link";
import { fetchOrders } from "@/lib/clickfunnels/fetch";

export default async function Page() {
  let count = 0, status: number | null = null, error: string | null = null;
  try {
    const res = await fetchOrders({ page: 1, per_page: 5 });
    status = res.status;
    if (res.ok && Array.isArray(res.data?.data)) count = res.data.data.length;
    else error = JSON.stringify(res.data);
  } catch (e: any) {
    error = e?.message || "Failed";
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-3">
      <h1 className="text-xl font-semibold">ClickFunnels • Overview</h1>
      <div className="text-sm">Test Orders status: {status ?? "—"} (showing first 5)</div>
      {error && <div className="text-xs text-red-600">Error: {error}</div>}
      <div className="flex gap-2">
        <Link className="underline text-indigo-700" href="/dashboard/clickfunnels/orders">View Orders</Link>
        <Link className="underline text-indigo-700" href="/dashboard/clickfunnels/fulfillments">View Fulfillments</Link>
      </div>
    </div>
  );
}
  