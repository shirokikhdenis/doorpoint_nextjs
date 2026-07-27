"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { addProductToExhibition } from "@/lib/client/admin-exhibition";
import { useAdminSession } from "@/lib/client/use-admin-session";
import { cn } from "@/lib/utils";

const EXHIBITION_CATEGORY_SLUGS = new Set(["entry-doors", "interior-doors"]);

type ProductAddToExhibitionProps = {
  productId: number;
  categorySlug?: string;
  coatingColor?: string;
  productSku?: string;
  price: number;
  kitPrice?: number | null;
};

type ButtonState = "idle" | "loading" | "success" | "error";

export function ProductAddToExhibition({
  productId,
  categorySlug,
  coatingColor,
  productSku,
  price,
  kitPrice,
}: ProductAddToExhibitionProps) {
  const { isAdmin, loading: sessionLoading } = useAdminSession();
  const [state, setState] = useState<ButtonState>("idle");
  const [message, setMessage] = useState("");

  const isExhibitionProduct = Boolean(categorySlug && EXHIBITION_CATEGORY_SLUGS.has(categorySlug));

  useEffect(() => {
    if (state !== "success") return undefined;
    const timer = window.setTimeout(() => {
      setState("idle");
      setMessage("");
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [state]);

  if (sessionLoading || !isAdmin || !isExhibitionProduct || !productId) {
    return null;
  }

  const handleClick = async () => {
    setState("loading");
    setMessage("");
    try {
      await addProductToExhibition({
        productId,
        coatingColor: coatingColor?.trim() || undefined,
        productSku: productSku?.trim() || undefined,
        price: Number.isFinite(price) ? Math.round(price) : undefined,
        kitPrice:
          categorySlug === "interior-doors" && kitPrice != null && Number.isFinite(kitPrice)
            ? Math.round(kitPrice)
            : undefined,
      });
      setState("success");
      setMessage("Добавлено на выставку");
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "Не удалось добавить на выставку");
    }
  };

  const isDisabled = state === "loading" || state === "success";

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-amber-900">
          Учёт выставки
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isDisabled}
          onClick={() => void handleClick()}
          className={cn(
            "border-amber-300 bg-white text-amber-950 hover:bg-amber-100",
            state === "success" && "border-emerald-400 text-emerald-800",
          )}
        >
          {state === "loading"
            ? "Добавление…"
            : state === "success"
              ? "Добавлено"
              : "Добавить на выставку"}
        </Button>
      </div>
      {message ? (
        <p
          className={cn(
            "mt-1.5 text-sm",
            state === "error" ? "text-red-700" : "text-emerald-800",
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
