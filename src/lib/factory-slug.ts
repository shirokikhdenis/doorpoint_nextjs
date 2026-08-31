import { slugifyPart } from "./slugify-part.js";

/** URL-slug производителя для маршрутов `/fabriki/...`. */
export function manufacturerSlug(name: string): string {
  return slugifyPart(name) || "factory";
}
