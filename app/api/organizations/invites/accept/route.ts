import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/clickfunnels/server";
import { acceptInviteToken } from "@/lib/orgs/invites";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function statusFromErrorMessage(message: string) {
  const lowered = message.toLowerCase();
  if (lowered.includes("not authenticated")) return 401;
  if (lowered.includes("different email")) return 403;
  if (lowered.includes("seat limit reached")) return 409;
  if (lowered.includes("expired") || lowered.includes("revoked") || lowered.includes("invalid")) return 400;
  return 400;
}

export async function POST(req: Request) {
  try {
    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = asObject(rawBody);
    const token = String(body.token ?? "").trim();

    if (!token) {
      return NextResponse.json({ ok: false, error: "token is required" }, { status: 400 });
    }

    const sb = await getServerSupabase();
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();

    if (error) {
      throw new Error(`Failed to load authenticated user: ${error.message}`);
    }

    if (!user?.id) {
      throw new Error("Not authenticated. Sign in to continue.");
    }

    const result = await acceptInviteToken({
      token,
      userId: user.id,
      userEmail: user.email ?? "",
    });

    return NextResponse.json({
      ok: true,
      organization: result.organization,
      seatSummary: result.seatSummary,
    });
  } catch (errorValue: unknown) {
    const message = errorValue instanceof Error ? errorValue.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: statusFromErrorMessage(message) });
  }
}
