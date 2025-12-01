// lib/clickfunnels/fetch.ts
import "server-only";
import { getValidTokenForCurrentUser } from "./oauth";

function withWorkspace(base: string, path: string) {
  return base.replace(/\/+$/, "") + (path.startsWith("/") ? path : `/${path}`);
}

export async function cfGET(path: string, params?: Record<string, string | number>) {
  const { token, workspace_url } = await getValidTokenForCurrentUser();
  const url = new URL(withWorkspace(workspace_url, path));
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, url: url.toString(), data };
}

// Focused endpoints
export async function fetchOrders(p: { page?: number; per_page?: number } = {}) {
  return cfGET("/orders", { page: p.page ?? 1, per_page: p.per_page ?? 25 });
}
export async function fetchOrderDetails(orderId: string) {
  return cfGET(`/orders/${orderId}`);
}
export async function fetchFulfillments(orderId: string) {
  return cfGET(`/orders/${orderId}/fulfillments`);
}
