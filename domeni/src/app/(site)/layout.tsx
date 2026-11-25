import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
