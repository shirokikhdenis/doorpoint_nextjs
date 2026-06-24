"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CatalogSearchApi = {
  searchInput: string;
  setSearchInput: (value: string) => void;
};

type CatalogSearchRegistryValue = {
  api: CatalogSearchApi | null;
  register: (api: CatalogSearchApi | null) => void;
};

const CatalogSearchRegistryContext = createContext<CatalogSearchRegistryValue | null>(null);

export function CatalogSearchRegistry({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<CatalogSearchApi | null>(null);
  const value = useMemo(() => ({ api, register: setApi }), [api]);

  return (
    <CatalogSearchRegistryContext.Provider value={value}>{children}</CatalogSearchRegistryContext.Provider>
  );
}

export function useCatalogSearchRegistry() {
  return useContext(CatalogSearchRegistryContext);
}

export function CatalogSearchRegistrar({ api }: { api: CatalogSearchApi }) {
  const registry = useCatalogSearchRegistry();

  useEffect(() => {
    if (!registry) return;
    registry.register(api);
    return () => registry.register(null);
  }, [registry, api]);

  return null;
}
