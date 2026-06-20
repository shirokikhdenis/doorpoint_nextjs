"use client";

import { useLayoutEffect } from "react";
import { scrollToTopInstant } from "@/lib/client/page-scroll";

/** Template remounts on each product navigation — сбрасываем прокрутку после перехода. */
export default function ProductTemplate({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    scrollToTopInstant();
  }, []);

  return children;
}
