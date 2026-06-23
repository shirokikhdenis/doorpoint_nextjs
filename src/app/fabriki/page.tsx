import type { Metadata } from "next";
import { createRequire } from "node:module";
import { FactorySection, type FactorySectionData } from "@/features/factories/factory-section";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";

export const revalidate = 120;

const require = createRequire(import.meta.url);
const factoryService = require("@/lib/server/services/factoryService") as {
  listPublicFactorySections: () => Promise<FactorySectionData[]>;
};

const PAGE_TITLE = "Фабрики";
const PAGE_DESCRIPTION =
  "Производители дверей и фурнитуры в нашем каталоге — выберите фабрику и перейдите к моделям.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/fabriki"),
  },
  openGraph: {
    ...defaultOpenGraph(),
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl("/fabriki"),
  },
};

export default async function FactoriesPage() {
  const sections = await factoryService.listPublicFactorySections();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">{PAGE_TITLE}</h1>
      <p className="mt-2 text-sm text-zinc-600">{PAGE_DESCRIPTION}</p>

      <div className="mt-8 space-y-10 sm:space-y-12">
        {sections.map((section) => (
          <FactorySection key={section.id} section={section} />
        ))}
      </div>
    </main>
  );
}
