"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollToTopInstant } from "@/lib/client/page-scroll";

/** Сбрасывает прокрутку после входа на /product/* (не до клика по ссылке). */
export function ProductRouteScrollReset() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!pathname?.startsWith("/product/")) return;
    scrollToTopInstant();
    requestAnimationFrame(scrollToTopInstant);
  }, [pathname]);

  return null;
}
