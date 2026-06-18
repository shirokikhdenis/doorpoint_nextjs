import type { Metadata } from "next";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";
import { SEO_COPY } from "@/lib/seo-copy";

export const metadata: Metadata = {
  title: SEO_COPY.portfolio.title,
  description: SEO_COPY.portfolio.description,
  alternates: {
    canonical: absoluteUrl("/portfolio"),
  },
  openGraph: {
    ...defaultOpenGraph(),
    title: SEO_COPY.portfolio.title,
    description: SEO_COPY.portfolio.description,
    url: absoluteUrl("/portfolio"),
  },
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
