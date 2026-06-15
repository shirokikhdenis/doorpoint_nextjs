import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Наши работы — Салон дверей",
  description: "Фото выполненных проектов: установка входных и межкомнатных дверей",
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
