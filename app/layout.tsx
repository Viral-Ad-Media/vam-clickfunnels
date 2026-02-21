import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClickFunnels VAM",
  description: "Manage ClickFunnels orders and fulfillments from one dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        style={
          {
            "--font-geist-sans":
              "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            "--font-geist-mono":
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
