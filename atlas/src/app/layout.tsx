import type { Metadata, Viewport } from "next";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/settings";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas",
  description: "Central de estudos para a faculdade: aulas, anotações e revisão espaçada.",
  applicationName: "Atlas",
  appleWebApp: { capable: true, title: "Atlas", statusBarStyle: "default" },
  formatDetection: { telephone: false, date: false, address: false, email: false },
  robots: { index: false, follow: false },
  // iPadOS antigos só abrem em tela cheia com esta marcação
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={fontVariables} data-bg="aurora" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
