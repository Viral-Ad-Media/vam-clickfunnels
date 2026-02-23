"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  KeyRound,
  Loader2,
  PlugZap,
  ShieldCheck,
} from "lucide-react";

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    client_id: "",
    client_secret: "",
    workspace_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/integrations/clickfunnels/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        if (res.status === 401) {
          throw new Error("Your session expired. Please log in again.");
        }
        if (res.status === 403) {
          throw new Error("Organization admin access is required to update credentials.");
        }
        throw new Error(error.error || "Failed to save configuration");
      }

      setMessage({ type: "success", text: "Configuration saved successfully." });
      setFormData({ client_id: "", client_secret: "", workspace_url: "" });
    } catch (errorValue: unknown) {
      setMessage({
        type: "error",
        text: errorValue instanceof Error ? errorValue.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex-1 space-y-6 py-10 sm:space-y-8 sm:py-12">
        <section className="surface-panel reveal p-7 sm:p-9">
          <span className="info-chip">Integration Administration</span>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Configure ClickFunnels access</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Register OAuth credentials, define the workspace endpoint, and establish authorized API access.
          </p>
          <div className="mt-4">
            <Link
              href="/settings/organization"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border/80 bg-white/82 px-4 text-sm font-semibold transition-colors hover:bg-white"
            >
              Open Organization & Billing
            </Link>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.45fr]">
          <aside className="surface-panel reveal reveal-delay-1 p-6">
            <h2 className="text-base font-semibold">Implementation Checklist</h2>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3 rounded-lg border border-border/80 bg-white/74 p-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 font-semibold text-primary">1</span>
                <span className="text-muted-foreground">Create an OAuth application in the ClickFunnels developer console.</span>
              </li>
              <li className="flex gap-3 rounded-lg border border-border/80 bg-white/74 p-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 font-semibold text-primary">2</span>
                <span className="text-muted-foreground">Enter your client credentials in this settings form.</span>
              </li>
              <li className="flex gap-3 rounded-lg border border-border/80 bg-white/74 p-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 font-semibold text-primary">3</span>
                <span className="text-muted-foreground">Provide your workspace API URL and save configuration.</span>
              </li>
              <li className="flex gap-3 rounded-lg border border-border/80 bg-white/74 p-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 font-semibold text-primary">4</span>
                <span className="text-muted-foreground">Authorize the connection and verify dashboard status.</span>
              </li>
            </ol>

            <a
              href="https://developers.myclickfunnels.com/docs/intro"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              Open API Documentation
            </a>
          </aside>

          <div className="surface-panel reveal reveal-delay-2 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">Credential Management</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Values are stored server-side and used for token exchange and refresh workflows.
              </p>
            </div>

            {message && (
              <div
                className={`mb-5 rounded-xl border p-4 text-sm ${
                  message.type === "success"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-red-300 bg-red-50 text-red-900"
                }`}
              >
                <div className="flex items-start gap-3">
                  {message.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  )}
                  <p>{message.text}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="client_id" className="inline-flex items-center gap-2 text-sm font-semibold">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Client ID
                </label>
                <input
                  id="client_id"
                  name="client_id"
                  type="text"
                  placeholder="Your ClickFunnels OAuth Client ID"
                  value={formData.client_id}
                  onChange={handleChange}
                  required
                  className="h-11 w-full rounded-lg border border-border/80 bg-white/82 px-4 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="client_secret" className="inline-flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Client Secret
                </label>
                <input
                  id="client_secret"
                  name="client_secret"
                  type="password"
                  placeholder="Your ClickFunnels OAuth Client Secret"
                  value={formData.client_secret}
                  onChange={handleChange}
                  required
                  className="h-11 w-full rounded-lg border border-border/80 bg-white/82 px-4 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="workspace_url" className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Globe className="h-4 w-4 text-primary" />
                  Workspace URL
                </label>
                <input
                  id="workspace_url"
                  name="workspace_url"
                  type="url"
                  placeholder="https://api.myclickfunnels.com/v1"
                  value={formData.workspace_url}
                  onChange={handleChange}
                  required
                  className="h-11 w-full rounded-lg border border-border/80 bg-white/82 px-4 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Saving..." : "Save Configuration"}
                </button>

                <a
                  href="/api/clickfunnels/auth"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border/80 bg-white/82 px-5 text-sm font-semibold transition-colors hover:bg-white"
                >
                  <PlugZap className="h-4 w-4 text-primary" />
                  Authorize Connection
                </a>
              </div>
            </form>

            <div className="mt-6 rounded-lg border border-border/80 bg-accent/60 p-4">
              <h3 className="text-sm font-semibold">Post-configuration checks</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>Confirm dashboard API status is 200.</li>
                <li>Open orders and verify record visibility.</li>
                <li>Use an order to validate fulfillment retrieval.</li>
              </ul>
              <Link
                href="/clickfunnels"
                className="mt-3 inline-flex text-xs font-semibold text-secondary-foreground underline-offset-4 hover:underline"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
