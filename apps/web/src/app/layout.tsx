import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  applicationName: "Pistar",
  authors: [{ name: "Pistar" }],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F7F4" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1A2F" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The actual <html> element is rendered by app/[locale]/layout.tsx so the
  // `lang` attribute reflects the negotiated locale. This wrapper exists so
  // Next.js can satisfy its requirement that a root layout is present.
  return children;
}
