"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    client_id: "",
    client_secret: "",
    workspace_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setMessage({ type: "success", text: "Configuration saved successfully!" });
      setFormData({ client_id: "", client_secret: "", workspace_url: "" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 container max-w-screen-2xl py-12">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Configure your ClickFunnels API credentials and workspace settings.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="rounded-lg border border-border p-6 space-y-4 sticky top-20">
                <h3 className="font-semibold">Configuration Steps</h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      1
                    </span>
                    <span className="text-muted-foreground">
                      Get credentials from ClickFunnels API dashboard
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      2
                    </span>
                    <span className="text-muted-foreground">
                      Fill in your client ID and secret
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      3
                    </span>
                    <span className="text-muted-foreground">
                      Enter your workspace URL
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      4
                    </span>
                    <span className="text-muted-foreground">
                      Save and authorize the connection
                    </span>
                  </li>
                </ol>

                <div className="pt-4 border-t border-border">
                  <a
                    href="https://developers.myclickfunnels.com/docs/intro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View API Documentation →
                  </a>
                </div>
              </div>
            </div>

            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-border p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">ClickFunnels Configuration</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add your ClickFunnels OAuth credentials to enable API access.
                  </p>
                </div>

                {message && (
                  <div
                    className={`rounded-lg p-4 flex gap-3 ${
                      message.type === "success"
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <p
                      className={`text-sm ${
                        message.type === "success"
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      {message.text}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Client ID */}
                  <div className="space-y-2">
                    <label htmlFor="client_id" className="text-sm font-medium">
                      Client ID *
                    </label>
                    <input
                      id="client_id"
                      name="client_id"
                      type="text"
                      placeholder="Your ClickFunnels OAuth Client ID"
                      value={formData.client_id}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Found in your ClickFunnels API dashboard under OAuth applications.
                    </p>
                  </div>

                  {/* Client Secret */}
                  <div className="space-y-2">
                    <label htmlFor="client_secret" className="text-sm font-medium">
                      Client Secret *
                    </label>
                    <input
                      id="client_secret"
                      name="client_secret"
                      type="password"
                      placeholder="Your ClickFunnels OAuth Client Secret"
                      value={formData.client_secret}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Keep this secure. Never share your client secret publicly.
                    </p>
                  </div>

                  {/* Workspace URL */}
                  <div className="space-y-2">
                    <label htmlFor="workspace_url" className="text-sm font-medium">
                      Workspace URL *
                    </label>
                    <input
                      id="workspace_url"
                      name="workspace_url"
                      type="url"
                      placeholder="https://api.myclickfunnels.com/v1"
                      value={formData.workspace_url}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      The base URL for your ClickFunnels API workspace (typically provided in your dashboard).
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? "Saving..." : "Save Configuration"}
                  </button>
                </form>

                {/* Info Box */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h4 className="font-semibold text-sm text-blue-900 mb-2">
                    Next Steps
                  </h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Save your configuration above</li>
                    <li>• Go to the Dashboard to connect your ClickFunnels account</li>
                    <li>• You'll be redirected to authorize the connection</li>
                    <li>• Once approved, you can view orders and fulfillments</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
