"use client";

import { useLayoutEffect } from "react";
import {
  isProductScrollResetSuppressed,
  scrollToTopInstant,
} from "@/lib/client/page-scroll";

/** Template remounts on each product navigation — сбрасываем прокрутку после перехода. */
export default function ProductTemplate({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    if (isProductScrollResetSuppressed()) return;
    scrollToTopInstant();
  }, []);

  return children;
}
