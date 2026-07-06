"use client";

import { useCallback, useState } from "react";
import type { PrometStockResponse } from "./types";

type UsePrometStockResult = {
  raw: PrometStockResponse | null;
  loading: boolean;
  error: string;
  load: () => Promise<void>;
};

export function usePrometStock(): UsePrometStockResult {
  const [raw, setRaw] = useState<PrometStockResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/promet/stock");
      const data = (await res.json()) as PrometStockResponse & { message?: string };

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
