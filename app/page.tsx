import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ArrowRight, Zap, Lock, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container max-w-screen-2xl py-24 sm:py-32">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                ClickFunnels Order Management
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Connect your ClickFunnels account and manage orders, fulfillments, and customer data all in one place.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="https://developers.myclickfunnels.com/docs/intro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg border border-input bg-background hover:bg-accent transition-colors"
              >
                View API Docs
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container max-w-screen-2xl py-24 sm:py-32 border-t border-border">
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold">Why Choose VAM?</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Powerful features to streamline your ClickFunnels workflow
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Real-time Sync</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically sync your orders and fulfillments with real-time data updates.
                </p>
              </div>

              <div className="rounded-lg border border-border p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Secure Auth</h3>
                <p className="text-sm text-muted-foreground">
                  Enterprise-grade OAuth2 authentication with token refresh and secure storage.
                </p>
              </div>

              <div className="rounded-lg border border-border p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  View detailed order metrics and fulfillment status at a glance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container max-w-screen-2xl py-24 sm:py-32 border-t border-border">
          <div className="rounded-lg border border-border bg-card p-8 sm:p-12 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">Ready to get started?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Set up your ClickFunnels integration in minutes and start managing orders instantly.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Configure Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
