import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Корзина — Салон дверей",
  description: "Ваша корзина заказа дверей",
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
