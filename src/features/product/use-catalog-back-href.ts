"use client";

import { useSyncExternalStore } from "react";
import { buildCatalogReturnHref } from "@/features/catalog/session/catalog-return-storage";

const DEFAULT_CATALOG_HREF = "/catalog";

const subscribeCatalogReturn = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
};

const getCatalogBackHrefSnapshot = () => buildCatalogReturnHref();
const getCatalogBackHrefServerSnapshot = () => DEFAULT_CATALOG_HREF;

/** Стабилен для SSR: на клиенте читает полный href витрины из catalogReturn. */
export function useCatalogBackHref() {
  return useSyncExternalStore(
    subscribeCatalogReturn,
    getCatalogBackHrefSnapshot,
    getCatalogBackHrefServerSnapshot,
  );
}
