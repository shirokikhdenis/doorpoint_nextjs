"use client";

import { useEffect, useRef, useState } from "react";
import { PRODUCT_BADGE_HIT } from "@/lib/client/product-badges";

export function SaleToggle({
  productId,
  checked,
  onSaved,
}: {
  productId: number;
  checked: boolean;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (saving) return;
    setSaving(true);
    const nextSale = !checked;
    const body: Record<string, unknown> = { isOnSale: nextSale, applySaleRules: true };
    try {
      const res = await fetch(`/api/admin/products/${productId}/sale`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || `HTTP ${res.status}`);
      }
      onSaved();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Акция"
      disabled={saving}
      onClick={() => void toggle()}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:cursor-wait ${
        checked ? "bg-amber-500" : "bg-zinc-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function SalePriceInput({
  productId,
  field,
  value,
  isOnSale,
  price,
  compareAtPrice,
  onSaved,
  compact,
}: {
  productId: number;
  field: "price" | "compareAtPrice";
  value: number | null;
  isOnSale: boolean;
  price?: number;
  compareAtPrice?: number | null;
  onSaved: () => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = value == null ? "" : String(value);

  const commit = async () => {
    const el = inputRef.current;
    if (!el) return;
    const raw = el.value.trim();
    if (raw === "") {
      el.value = display;
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      el.value = display;
      return;
    }
    const safe = Math.round(n);
    if (safe === (value ?? 0)) return;

    const body: Record<string, unknown> = {};

    if (field === "price") {
      body.price = safe;
      body.isOnSale = isOnSale;
      if (isOnSale && compareAtPrice != null) body.compareAtPrice = compareAtPrice;
    } else {
      const currentPrice = price ?? 0;
      if (safe <= currentPrice) {
        window.alert("Старая цена должна быть больше текущей");
        el.value = display;
        return;
      }
      body.compareAtPrice = safe;
      body.price = currentPrice;
      body.isOnSale = true;
    }

    try {
      const res = await fetch(`/api/admin/products/${productId}/sale`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || `HTTP ${res.status}`);
      }
      onSaved();
    } catch {
      el.value = display;
    }
  };

  return (
    <input
      ref={inputRef}
      key={`${productId}-${field}-${display}-${isOnSale ? "1" : "0"}`}
      type="number"
      min={0}
      step={1}
      defaultValue={display}
      placeholder={field === "compareAtPrice" && !isOnSale ? "—" : undefined}
      className={`rounded border border-zinc-200 px-1 py-0.5 text-right font-mono text-zinc-800 focus:border-zinc-400 focus:outline-none ${
        compact ? "w-16 text-[10px]" : "w-20 text-[11px]"
      }`}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function HitBadgeToggle({
  productId,
  checked,
  onSaved,
}: {
  productId: number;
  checked: boolean;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (saving) return;
    setSaving(true);
    const nextBadges = checked ? [] : [PRODUCT_BADGE_HIT];
    try {
      const res = await fetch(`/api/admin/products/${productId}/badges`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ badges: nextBadges }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      onSaved();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Бейдж «Хит»"
      disabled={saving}
      onClick={() => void toggle()}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:cursor-wait ${
        checked ? "bg-orange-500" : "bg-zinc-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function DisplayOrderInput({
  productId,
  displayOrder,
  onSaved,
  compact,
}: {
  productId: number;
  displayOrder: number;
  onSaved: () => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = async () => {
    const el = inputRef.current;
    if (!el) return;
    const n = Number(el.value);
    const safe = Number.isFinite(n) ? Math.trunc(n) : 0;
    if (safe === displayOrder) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}/display-order`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayOrder: safe }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      onSaved();
    } catch {
      el.value = String(displayOrder);
    }
  };

  return (
    <input
      ref={inputRef}
      key={`${productId}-${displayOrder}`}
      type="number"
      defaultValue={String(displayOrder)}
      className={`rounded border border-zinc-200 px-1 py-0.5 text-right font-mono text-zinc-800 focus:border-zinc-400 focus:outline-none ${
        compact ? "w-12 text-[10px]" : "w-14 text-[11px]"
      }`}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export function ActiveStatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
      да
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
      нет
    </span>
  );
}
