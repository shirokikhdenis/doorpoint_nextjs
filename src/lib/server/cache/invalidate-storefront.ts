import { revalidatePath, revalidateTag } from "next/cache";

export type StorefrontCacheScope = "products" | "catalog-pages" | "promotions" | "all";

const expireTag = (tag: string) => {
  revalidateTag(tag, { expire: 0 });
};

export async function invalidateStorefrontCache(scope: StorefrontCacheScope = "all") {
  if (scope === "all" || scope === "products") {
    expireTag("catalog-products");
    expireTag("catalog-meta");
    expireTag("home-hits");
  }

  if (scope === "all" || scope === "catalog-pages") {
    expireTag("catalog-pages");
    expireTag("catalog-meta");
  }

  if (scope === "all" || scope === "promotions") {
    expireTag("promotions");
  }

  if (scope === "all" || scope === "products" || scope === "promotions") {
    revalidatePath("/");
  }

  if (scope === "all" || scope === "products" || scope === "catalog-pages") {
    revalidatePath("/catalog");
  }
}
