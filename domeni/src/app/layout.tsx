import type { Metadata, Viewport } from "next";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/settings";
import { SITE } from "@/lib/site";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `Domeni · ${SITE.tagline}`, template: "%s · Domeni" },
  description: SITE.description,
  applicationName: "Domeni",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Domeni", url: SITE.url },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Domeni", statusBarStyle: "default" },
  formatDetection: { telephone: false, date: false, address: false, email: false },
  // iPadOS antigos só abrem em tela cheia com esta marcação
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={fontVariables} data-tone="neutro" data-accent="rosa" data-font="sistema" data-font-title="igual" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
