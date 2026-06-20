"use client";

import { useEffect, useState } from "react";
import { buildCatalogReturnHref } from "@/features/catalog/catalog-scroll-storage";

const DEFAULT_CATALOG_HREF = "/catalog";

/** Стабилен для SSR: после mount — полный href витрины из catalogScroll. */
export function useCatalogBackHref() {
  const [href, setHref] = useState(DEFAULT_CATALOG_HREF);

  useEffect(() => {
    setHref(buildCatalogReturnHref());
  }, []);

  return href;
}
