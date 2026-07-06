"use client";

import { useEffect, useState } from "react";
import { useAdminSession } from "@/lib/client/use-admin-session";
import { formatDate, formatNum, stockToneClass } from "@/lib/promet-stock-utils";
import { cn } from "@/lib/utils";

const PROMET_MANUFACTURER = "Промет";

type PrometStockPayload = {
  found: boolean;
  reason?: string;
  message?: string;
  defaultStock?: number | null;
  actualAt?: string | null;
};

type ProductPrometStockProps = {
  slug?: string;
  manufacturerName?: string;
  manufacturerId?: string | null;
  variantSku?: string;
};

export function ProductPrometStock({
  slug,
  manufacturerName,
  manufacturerId,
  variantSku,
}: ProductPrometStockProps) {
  const { isAdmin, loading: sessionLoading } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PrometStockPayload | null>(null);

  const isPromet = manufacturerName === PROMET_MANUFACTURER;
  const article = manufacturerId?.trim() || "";

  useEffect(() => {
    if (sessionLoading || !isAdmin || !isPromet || !slug) {
      setData(null);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    void fetch(
      `/api/products/${encodeURIComponent(slug)}/promet-stock${
        variantSku ? `?variantSku=${encodeURIComponent(variantSku)}` : ""
      }`,
      { credentials: "include" },
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as PrometStockPayload | null;
        if (cancelled) return;
        if (!response.ok) {
          setError(payload?.message || "Не удалось загрузить остатки");
          setData(null);
          return;
        }
        setData(payload);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Сетевая ошибка при загрузке остатков");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, isAdmin, isPromet, slug, article, variantSku]);

  if (sessionLoading || !isAdmin || !isPromet) {
    return null;
  }

  if (!article) {
    return (
      <p className="text-sm text-zinc-500">
        Остаток (Архангельск): не задан артикул Promet для варианта
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">Остаток (Архангельск): загрузка…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data?.found) {
    return (
      <p className="text-sm text-zinc-500">
        {data?.message || "Остаток (Архангельск): не найден в Promet"}
      </p>
    );
  }

  const stock = data.defaultStock ?? 0;

  return (
    <div className="space-y-1 text-sm">
      <p className="text-zinc-700">
        <span className="text-zinc-600">Остаток (Архангельск): </span>
        <strong className={cn("tabular-nums", stockToneClass(stock))}>{formatNum(stock)}</strong>
      </p>
      {data.actualAt ? (
        <p className="text-xs text-zinc-500">Данные актуальны на {formatDate(data.actualAt)}</p>
      ) : null}
    </div>
  );
}
