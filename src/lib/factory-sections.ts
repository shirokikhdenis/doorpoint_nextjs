import {
  FACTORY_SECTIONS,
  type FactorySectionConfig,
} from "@/lib/factory-sections-config";
import { manufacturerSlug } from "@/lib/factory-slug";

export { FACTORY_SECTIONS, type FactorySectionConfig };

export function getFactorySectionById(sectionId: string): FactorySectionConfig | undefined {
  const id = String(sectionId || "").trim();
  return FACTORY_SECTIONS.find((section) => section.id === id);
}

export function findFactoryInSection(
  sectionId: string,
  manufacturerSlugValue: string,
): { section: FactorySectionConfig; manufacturer: string } | null {
  const section = getFactorySectionById(sectionId);
  if (!section) return null;
  const slug = String(manufacturerSlugValue || "").trim().toLowerCase();
  if (!slug) return null;
  const manufacturer = section.manufacturers.find(
    (name) => manufacturerSlug(name).toLowerCase() === slug,
  );
  if (!manufacturer) return null;
  return { section, manufacturer };
}

export function manufacturerCollectionsPath(sectionId: string, manufacturerName: string): string {
  return `/fabriki/${encodeURIComponent(sectionId)}/${encodeURIComponent(manufacturerSlug(manufacturerName))}/kollektsii`;
}
