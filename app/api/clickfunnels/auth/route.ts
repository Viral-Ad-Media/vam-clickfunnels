// app/api/clickfunnels/auth/route.ts
import { NextResponse } from "next/server";

const CF_AUTHORIZE = "https://accounts.myclickfunnels.com/oauth/authorize";

// a tiny helper that guarantees an absolute base URL in every env
function getBaseUrl(req: Request) {
  // Prefer explicit env (works on Vercel + local)
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Fallback: derive from the incoming request (works in dev)
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  const base = getBaseUrl(req);
  const redirect = `${base}/api/clickfunnels/auth/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CF_CLIENT_ID!,
    redirect_uri: redirect, // do NOT pre-encode; URLSearchParams will handle it
    scope: [
      "offline_access",
      "orders:read",
      "fulfillments:read", // remove if your app doesn’t have this scope approved
    ].join(" "),
  });

  // Optional: include &state= to protect against CSRF (store in cookie if you add this)
  // params.set("state", someRandomString)

  return NextResponse.redirect(`${CF_AUTHORIZE}?${params.toString()}`);
}
