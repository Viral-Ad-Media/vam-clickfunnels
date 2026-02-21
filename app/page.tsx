import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ArrowRight, ShieldCheck, Sparkles, Workflow, CheckCircle2 } from "lucide-react";

const features = [
  {
    title: "Live Sync Layer",
    copy: "Pull current orders and fulfillment records without waiting on manual exports.",
    icon: Workflow,
    accent: "from-orange-400/22 to-orange-300/5",
  },
  {
    title: "OAuth Guardrails",
    copy: "Hardened token refresh, CSRF validation, and scoped credentials per user.",
    icon: ShieldCheck,
    accent: "from-emerald-400/22 to-emerald-300/5",
  },
  {
    title: "Ops Visibility",
    copy: "See integration health and key order activity from one command center.",
    icon: Sparkles,
    accent: "from-sky-400/22 to-sky-300/5",
  },
];

export default function Home() {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />

      <main className="container max-w-screen-2xl flex-1 space-y-8 py-10 sm:space-y-10 sm:py-14">
        <section className="surface-panel reveal relative overflow-hidden p-7 sm:p-12">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-secondary/25 blur-3xl" />
          <div className="absolute -bottom-20 left-8 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative space-y-8">
            <div className="space-y-4">
              <span className="info-chip w-fit">
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                Built for ClickFunnels Operations
              </span>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Replace the bland dashboard with a
                <span className="gradient-text"> vivid order command center.</span>
              </h1>
              <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
                Connect your ClickFunnels workspace, monitor API health, and move from order lookup to fulfillment status in a few clicks.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/settings"
                className="glow-pulse inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                Configure Integration
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/clickfunnels"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-7 text-sm font-semibold text-foreground transition-colors hover:bg-white"
              >
                Open Dashboard
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/72 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Flows</p>
                <p className="mt-1 text-2xl font-semibold">3 Core</p>
                <p className="text-xs text-muted-foreground">Config, Auth, Data Fetching</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/72 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Endpoints</p>
                <p className="mt-1 text-2xl font-semibold">7 Active</p>
                <p className="text-xs text-muted-foreground">OAuth, Config, Health, Orders</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/72 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Experience</p>
                <p className="mt-1 text-2xl font-semibold">Color-First</p>
                <p className="text-xs text-muted-foreground">Readable across desktop and mobile</p>
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
                className={`surface-panel reveal reveal-delay-${index + 1} relative overflow-hidden p-6`}
              >
                <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-r ${feature.accent}`} />
                <div className="relative space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/80 bg-white/85 text-foreground">
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
              <p className="info-chip border-primary/40 bg-primary/20 text-primary-foreground/95">Launch in minutes</p>
              <h2 className="text-2xl font-semibold sm:text-3xl">Ready to operate ClickFunnels with confidence?</h2>
              <p className="text-sm text-slate-300 sm:text-base">
                Save your credentials, authorize access, and start managing orders without switching tools.
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-7 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Start Setup
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
