import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ArrowRight, ShieldCheck, Workflow, LineChart, CheckCircle2 } from "lucide-react";

const features = [
  {
    title: "Operational Sync",
    copy: "Maintain a current view of orders and fulfillment records from a centralized interface.",
    icon: Workflow,
  },
  {
    title: "Access Governance",
    copy: "Use scoped OAuth credentials with token refresh and CSRF protections enforced server-side.",
    icon: ShieldCheck,
  },
  {
    title: "Execution Visibility",
    copy: "Track integration readiness and move quickly from dashboard summary to order-level context.",
    icon: LineChart,
  },
];

export default function Home() {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex-1 space-y-8 py-10 sm:space-y-10 sm:py-14">
        <section className="surface-panel reveal p-7 sm:p-10">
          <div className="space-y-7">
            <div className="space-y-4">
              <span className="info-chip w-fit">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Enterprise Operations Workspace
              </span>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                ClickFunnels order operations,
                <span className="gradient-text"> managed with enterprise clarity.</span>
              </h1>
              <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
                Configure your integration once, enforce secure access patterns, and give operations teams one place to monitor and act.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/settings"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/92"
              >
                Configure Integration
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/clickfunnels"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border/80 bg-white/80 px-7 text-sm font-semibold text-foreground transition-colors hover:bg-white"
              >
                Open Dashboard
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border/80 bg-white/78 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Coverage</p>
                <p className="mt-1 text-2xl font-semibold">3 Core Flows</p>
                <p className="text-xs text-muted-foreground">Config, OAuth, Data Access</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-white/78 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Runtime</p>
                <p className="mt-1 text-2xl font-semibold">Server-Rendered</p>
                <p className="text-xs text-muted-foreground">Operational pages stay current</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-white/78 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Experience</p>
                <p className="mt-1 text-2xl font-semibold">Desktop + Mobile</p>
                <p className="text-xs text-muted-foreground">Consistent UI across form factors</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className={`surface-panel reveal reveal-delay-${index + 1} p-6`}
              >
                <div className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-semibold">{feature.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.copy}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="surface-panel-dark reveal reveal-delay-3 p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="info-chip border-slate-600 bg-slate-800 text-slate-200">Deployment Ready</p>
              <h2 className="text-2xl font-semibold sm:text-3xl">Ready to operationalize your ClickFunnels workflow?</h2>
              <p className="text-sm text-slate-300 sm:text-base">
                Save credentials, authorize access, and begin processing orders with a structured interface.
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-7 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Begin Setup
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
