import type { Metadata, Viewport } from "next";
import { APPEARANCE_BOOT_SCRIPT } from "@/lib/settings";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Domeni",
  description: "Sua central de estudos da faculdade: cadernos, agenda, notas, faltas, biblioteca e um personagem que te acompanha.",
  applicationName: "Domeni",
  appleWebApp: { capable: true, title: "Domeni", statusBarStyle: "default" },
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
    { media: "(prefers-color-scheme: light)", color: "#fbf3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1317" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={fontVariables} data-bg="quadriculado" data-tone="rosado" data-accent="rosa" data-font="nunito" data-font-title="pacifico" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
