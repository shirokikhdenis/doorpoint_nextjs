import { useEffect, useMemo, useState } from "react";
import type { CartItem } from "@/lib/client/cart-store";
import { fetchCartManufacturerArticles, resolveCartManufacturerArticle } from "@/lib/client/cart-csv-export";

export function useCartManufacturerArticles(items: CartItem[], enabled: boolean) {
  const [lookup, setLookup] = useState<Map<number, string>>(() => new Map());
  const itemsKey = useMemo(
    () =>
      items
        .map((item) => `${item.id}:${item.manufacturerId ?? ""}:${item.sku ?? ""}`)
        .join("|"),
    [items],
  );

  useEffect(() => {
    if (!enabled || items.length === 0) {
      setLookup(new Map());
      return;
    }

    let cancelled = false;
    void fetchCartManufacturerArticles(items).then((map) => {
      if (!cancelled) setLookup(map);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, items, itemsKey]);

  return lookup;
}

export { resolveCartManufacturerArticle };
