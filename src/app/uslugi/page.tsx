import type { Metadata } from "next";
import { createRequire } from "node:module";
import { ServiceTable } from "@/features/services/service-table";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";
import { SEO_COPY } from "@/lib/seo-copy";

export const metadata: Metadata = {
  title: SEO_COPY.uslugi.title,
  description: SEO_COPY.uslugi.description,
  alternates: {
    canonical: absoluteUrl("/uslugi"),
  },
  openGraph: {
    ...defaultOpenGraph(),
    title: SEO_COPY.uslugi.title,
    description: SEO_COPY.uslugi.description,
    url: absoluteUrl("/uslugi"),
  },
};

export const revalidate = 3600;

export default async function UslugiPage() {
  const require = createRequire(import.meta.url);
  const servicesService = require("@/lib/server/services/servicesService") as {
    listPublicServices: () => Promise<
      Array<{
        id: number;
        title: string;
        rows: Array<{ id: number; name: string; price: string }>;
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
          }))}
        />
      ))}
    </main>
  );
}
