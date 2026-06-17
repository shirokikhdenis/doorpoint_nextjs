import type { Metadata } from "next";
import { createRequire } from "node:module";
import { ServiceTable } from "@/features/services/service-table";
import { absoluteUrl, buildPageTitle, defaultOpenGraph } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: buildPageTitle("Услуги"),
  description:
    "Доставка, подъём, монтаж межкомнатных и входных дверей в Архангельске — прайс и условия",
  alternates: {
    canonical: absoluteUrl("/uslugi"),
  },
  openGraph: {
    ...defaultOpenGraph(),
    title: buildPageTitle("Услуги"),
    description:
      "Доставка, подъём, монтаж межкомнатных и входных дверей в Архангельске — прайс и условия",
    url: absoluteUrl("/uslugi"),
  },
};

export default async function UslugiPage() {
  const require = createRequire(import.meta.url);
  const servicesService = require("@/lib/server/services/servicesService") as {
    listPublicServices: () => Promise<
      Array<{
        id: number;
        title: string;
        rows: Array<{ id: number; name: string; price: string; notes: string }>;
      }>
    >;
  };

  const sections = await servicesService.listPublicServices();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Услуги</h1>
      {sections.map((section) => (
        <ServiceTable
          key={section.id}
          title={section.title}
          rows={section.rows.map((row) => ({
            id: row.id,
            name: row.name,
            price: row.price,
            notes: row.notes,
          }))}
        />
      ))}
    </main>
  );
}
