import { CATALOG_PAGE_SLUG } from "@/lib/catalog-page-slugs";

export type FactorySectionConfig = {
  id: string;
  title: string;
  catalogPageSlug: string;
  /** Корневой slug категории в `categories` (scope товаров). */
  categoryRootSlug: string;
  manufacturers: readonly string[];
};

/** Порядок и состав фабрик на странице `/fabriki`. */
export const FACTORY_SECTIONS: readonly FactorySectionConfig[] = [
  {
    id: "interior",
    title: "Межкомнатные двери",
    catalogPageSlug: CATALOG_PAGE_SLUG.interiorDoors,
    categoryRootSlug: "interior-doors",
    manufacturers: ["Браво", "Двери Регионов", "Двери Регионов Эмаль", "Убертюре", "Аэлита"],
  },
  {
    id: "entry",
    title: "Входные двери",
    catalogPageSlug: CATALOG_PAGE_SLUG.entryDoors,
    categoryRootSlug: "entry-doors",
    manufacturers: ["Арма", "Браво", "Промет", "Люксор", "Феррони"],
  },
  {
    id: "fittings",
    title: "Фурнитура",
    catalogPageSlug: CATALOG_PAGE_SLUG.fittings,
    categoryRootSlug: "fittings",
    manufacturers: ["Addenbau", "Bussare", "Morelli"],
  },
] as const;
