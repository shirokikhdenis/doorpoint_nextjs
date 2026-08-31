"use client";

import { useSyncExternalStore } from "react";
import {
  buildCatalogReturnHref,
  CATALOG_RETURN_CHANGE_EVENT,
} from "@/features/catalog/session/catalog-return-storage";

const DEFAULT_CATALOG_HREF = "/catalog";

const subscribeCatalogReturn = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CATALOG_RETURN_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CATALOG_RETURN_CHANGE_EVENT, onStoreChange);
  };
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
