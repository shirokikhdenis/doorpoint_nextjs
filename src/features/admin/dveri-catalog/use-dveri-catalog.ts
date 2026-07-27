"use client";

import { useCallback, useState } from "react";
import type { DveriCatalogResponse } from "./types";

type UseDveriCatalogResult = {
  raw: DveriCatalogResponse | null;
  loading: boolean;
  error: string;
  load: (refresh?: boolean) => Promise<void>;
};

export function useDveriCatalog(): UseDveriCatalogResult {
  const [raw, setRaw] = useState<DveriCatalogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError("");

    try {
      const url = refresh ? "/api/admin/dveri/catalog?refresh=1" : "/api/admin/dveri/catalog";
      const res = await fetch(url);
      const data = (await res.json()) as DveriCatalogResponse & { message?: string };

      if (!res.ok) {
        setError(data.error || data.message || "Ошибка загрузки");
        return;
      }

      setRaw(data);
    } catch {
      setError("Сетевая ошибка при загрузке");
    } finally {
      setLoading(false);
    }
  }, []);

  return { raw, loading, error, load };
}
