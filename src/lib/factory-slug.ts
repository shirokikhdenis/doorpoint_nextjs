import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { slugifyPart } = require("@/lib/server/domain/productSlug") as {
  slugifyPart: (value: string) => string;
};

/** URL-slug производителя для маршрутов `/fabriki/...`. */
export function manufacturerSlug(name: string): string {
  return slugifyPart(name) || "factory";
}
