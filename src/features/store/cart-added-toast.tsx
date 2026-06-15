"use client";

import { useEffect, useRef, useState } from "react";
import { cartToast } from "@/lib/client/cart-toast";

const TOAST_VISIBLE_MS = 2500;
const TOAST_EXIT_MS = 300;

export function CartAddedToast() {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
  };

  useEffect(() => {
    return cartToast.subscribe((message) => {
      clearTimers();
      setIsExiting(false);
      setToast({ message, id: Date.now() });
      hideTimerRef.current = setTimeout(() => {
        setIsExiting(true);
        exitTimerRef.current = setTimeout(() => {
          setToast(null);
          setIsExiting(false);
        }, TOAST_EXIT_MS);
      }, TOAST_VISIBLE_MS);
    });
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className={`cart-added-toast fixed bottom-4 right-4 z-50 max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-brand bg-white px-4 py-3 text-sm font-medium text-brand shadow-lg print:hidden ${
        isExiting ? "cart-added-toast--exit" : "cart-added-toast--enter"
      }`}
    >
      {toast.message}
    </div>
  );
}
