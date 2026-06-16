import type { Metadata } from "next";
import { absoluteUrl, buildPageTitle } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: buildPageTitle("Корзина"),
  description: "Ваша корзина заказа дверей",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: absoluteUrl("/cart"),
  },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
