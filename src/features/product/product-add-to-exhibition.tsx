"use client";

import { useEffect, useState } from "react";
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
    if (state !== "success" && state !== "error") return undefined;
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
  const title =
    state === "loading"
      ? "Добавление на выставку…"
      : state === "success"
        ? "Добавлено на выставку"
        : state === "error"
          ? message || "Ошибка"
          : "Добавить на выставку";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => void handleClick()}
        title={title}
        aria-label={title}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition disabled:opacity-60",
          state === "success"
            ? "border-emerald-400 bg-emerald-50 text-emerald-800"
            : state === "error"
              ? "border-rose-300 bg-rose-50 text-rose-800"
              : "border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100",
        )}
      >
        {state === "loading" ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-300 border-t-sky-700" />
        ) : state === "success" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M4 10h16" />
            <path d="M6 10V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
            <path d="M4 10v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M9 14h6" />
          </svg>
        )}
      </button>
      {message ? (
        <span
          role="status"
          className={cn(
            "absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-white px-2 py-1 text-xs shadow-sm",
            state === "error" ? "text-rose-700" : "text-emerald-800",
          )}
        >
          {message}
        </span>
      ) : null}
    </span>
  );
}
