"use client";

import { useEffect, useState } from "react";
import { catalogBackHrefFromPageSlug } from "@/features/product/product-utils";

const DEFAULT_CATALOG_HREF = "/catalog";

/** Стабилен для SSR: сначала /catalog, после mount — lastCatalogPage из sessionStorage. */
export function useCatalogBackHref() {
  const [href, setHref] = useState(DEFAULT_CATALOG_HREF);

  useEffect(() => {
    const slug = window.sessionStorage.getItem("lastCatalogPage");
    setHref(catalogBackHrefFromPageSlug(slug));
  }, []);

  return href;
}
