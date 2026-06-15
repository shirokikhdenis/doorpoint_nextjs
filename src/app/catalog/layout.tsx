import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Каталог — Салон дверей",
  description: "Каталог межкомнатных и входных дверей с фильтрами по параметрам",
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
