import { CatalogPageClient } from "@/features/catalog/catalog-page-client";
import { getCatalogShell } from "@/lib/server/catalog-shell";

export const dynamic = "force-dynamic";

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const initial = await getCatalogShell(await searchParams);
  return <CatalogPageClient initial={initial} />;
}
