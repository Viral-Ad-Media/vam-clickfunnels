// lib/clickfunnels/fetch.ts
import "server-only";
import { getValidTokenForCurrentUser } from "./oauth";
import type { CfApiResponse, CfOrder, CfFulfillment, ApiErrorResponse } from "./types";

function withWorkspace(base: string, path: string) {
  return base.replace(/\/+$/, "") + (path.startsWith("/") ? path : `/${path}`);
}

interface FetchResponse<T> {
  ok: boolean;
  status: number;
  url: string;
  data: T | null;
  error?: string;
}

export async function cfGET<T = unknown>(
  path: string,
  params?: Record<string, string | number>
): Promise<FetchResponse<T>> {
  try {
    const { token, workspace_url } = await getValidTokenForCurrentUser();
    const url = new URL(withWorkspace(workspace_url, path));
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token.access_token}`,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    return { ok: res.ok, status: res.status, url: url.toString(), data: res.ok ? (data as T) : null, error: !res.ok ? JSON.stringify(data) : undefined };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, status: 0, url: path, data: null, error };
  }
}

// Focused endpoints
export async function fetchOrders(p: { page?: number; per_page?: number } = {}): Promise<FetchResponse<CfApiResponse<CfOrder[]>>> {
  return cfGET("/orders", { page: p.page ?? 1, per_page: p.per_page ?? 25 });
}

export async function fetchOrderDetails(orderId: string): Promise<FetchResponse<CfApiResponse<CfOrder>>> {
  return cfGET(`/orders/${orderId}`);
}

export async function fetchFulfillments(orderId: string): Promise<FetchResponse<CfApiResponse<CfFulfillment[]>>> {
  return cfGET(`/orders/${orderId}/fulfillments`);
}
