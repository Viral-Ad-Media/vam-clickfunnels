// app/clickfunnels/orders/[id]/page.tsx
import { fetchOrderDetails, fetchFulfillments } from "@/lib/clickfunnels/fetch";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const [details, fulf] = await Promise.all([
    fetchOrderDetails(id),
    fetchFulfillments(id),
  ]);

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-4">
      <h1 className="text-xl font-semibold">Order {id}</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <pre className="text-xs bg-slate-50 p-3 rounded border overflow-x-auto">{JSON.stringify(details.data, null, 2)}</pre>
        <pre className="text-xs bg-slate-50 p-3 rounded border overflow-x-auto">{JSON.stringify(fulf.data, null, 2)}</pre>
      </div>
    </div>
  );
}
