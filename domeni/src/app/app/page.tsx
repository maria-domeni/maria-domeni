import type { Metadata } from "next";
import { DomeniApp } from "@/components/DomeniApp";

export const metadata: Metadata = {
  title: "Domeni",
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <DomeniApp />;
}
