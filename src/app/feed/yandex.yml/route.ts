import { unstable_cache } from "next/cache";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ymlFeedService = require("@/lib/server/services/ymlFeedService") as {
  buildYandexYml: () => Promise<string>;
};

const getCachedYml = unstable_cache(
  () => ymlFeedService.buildYandexYml(),
  ["storefront", "yml-feed"],
  { tags: ["catalog-products"], revalidate: 300 },
);

export async function GET() {
  const xml = await getCachedYml();
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
