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
              "'Avenir Next', 'Futura', 'Trebuchet MS', 'Segoe UI', sans-serif",
            "--font-geist-mono":
              "'IBM Plex Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
