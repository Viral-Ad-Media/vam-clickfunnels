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
          <span className="info-chip">Configuration Studio</span>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Connect your ClickFunnels workspace</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Save OAuth credentials, validate workspace URL, and authorize your account to unlock orders and fulfillment views.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.45fr]">
          <aside className="surface-panel reveal reveal-delay-1 p-6">
            <h2 className="text-base font-semibold">Setup Path</h2>
            <ol className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3 rounded-xl border border-white/70 bg-white/70 p-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary">1</span>
                <span className="text-muted-foreground">Create an OAuth app in your ClickFunnels developer dashboard.</span>
              </li>
              <li className="flex gap-3 rounded-xl border border-white/70 bg-white/70 p-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary">2</span>
                <span className="text-muted-foreground">Paste the Client ID and Client Secret below.</span>
              </li>
              <li className="flex gap-3 rounded-xl border border-white/70 bg-white/70 p-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary">3</span>
                <span className="text-muted-foreground">Provide the workspace API URL and save.</span>
              </li>
              <li className="flex gap-3 rounded-xl border border-white/70 bg-white/70 p-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary">4</span>
                <span className="text-muted-foreground">Authorize the OAuth connection and verify dashboard status.</span>
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
              <h2 className="text-2xl font-semibold">OAuth Credentials</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                These values are saved server-side and used only for token exchange and refresh.
              </p>
            </div>

            {message && (
              <div
                className={`mb-5 rounded-2xl border p-4 text-sm ${
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
                  className="h-11 w-full rounded-xl border border-white/80 bg-white/80 px-4 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  className="h-11 w-full rounded-xl border border-white/80 bg-white/80 px-4 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  className="h-11 w-full rounded-xl border border-white/80 bg-white/80 px-4 text-sm placeholder:text-muted-foreground focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Saving..." : "Save Configuration"}
                </button>

                <a
                  href="/api/clickfunnels/auth"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/80 bg-white/80 px-5 text-sm font-semibold transition-colors hover:bg-white"
                >
                  <PlugZap className="h-4 w-4 text-primary" />
                  Connect ClickFunnels
                </a>
              </div>
            </form>

            <div className="mt-6 rounded-2xl border border-secondary/30 bg-secondary/12 p-4">
              <h3 className="text-sm font-semibold">After connecting</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>Go to dashboard to verify API status is 200.</li>
                <li>Open orders to inspect current records.</li>
                <li>Use fulfillment view from any order row.</li>
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
