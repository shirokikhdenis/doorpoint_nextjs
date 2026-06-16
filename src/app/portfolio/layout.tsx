import type { Metadata } from "next";
import { absoluteUrl, buildPageTitle, defaultOpenGraph } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: buildPageTitle("Портфолио"),
  description:
    "Фото выполненных работ: установка входных и межкомнатных дверей в Архангельске и области",
  alternates: {
    canonical: absoluteUrl("/portfolio"),
  },
  openGraph: {
    ...defaultOpenGraph(),
    title: buildPageTitle("Портфолио"),
    description:
      "Фото выполненных работ: установка входных и межкомнатных дверей в Архангельске и области",
    url: absoluteUrl("/portfolio"),
  },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
