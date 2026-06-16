import { PRODUCT_BADGE_HIT } from "@/lib/client/product-badges";
import type { BulkAction, ProductRow } from "./types";

const BATCH_SIZE = 8;

export async function runBulkProductAction(
  rows: ProductRow[],
  action: BulkAction,
): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (row) => {
        try {
          if (action === "setHit" || action === "clearHit") {
            const badges = action === "setHit" ? [PRODUCT_BADGE_HIT] : [];
            const res = await fetch(`/api/admin/products/${row.id}/badges`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ badges }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return true;
          }

          if (action === "setSale") {
            const res = await fetch(`/api/admin/products/${row.id}/sale`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ isOnSale: true, applySaleRules: true }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return true;
          }

          const res = await fetch(`/api/admin/products/${row.id}/sale`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ isOnSale: false, applySaleRules: true }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return true;
        } catch {
          return false;
        }
      }),
    );

    results.forEach((ok) => {
      if (ok) updated += 1;
      else failed += 1;
    });
  }

  return { updated, failed };
}
