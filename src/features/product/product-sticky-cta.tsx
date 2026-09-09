"use client";

import { useEffect, useState, type RefObject } from "react";
import {
  ProductAddToCart,
  type ProductCartLineInput,
} from "@/features/product/product-add-to-cart";
import { ProductPricingBlock } from "@/features/product/product-pricing-block";
import type { KitPricing } from "@/lib/client/normalizers";

type ProductStickyCtaProps = ProductCartLineInput & {
  targetRef: RefObject<HTMLDivElement | null>;
  compareAtPrice?: number | null;
  isOnSale?: boolean;
  kitPrice?: number | null;
  kitPricing?: KitPricing | null;
};

const STICKY_CTA_HEIGHT = "5.75rem";

export function ProductStickyCta({
  targetRef,
  compareAtPrice,
  isOnSale,
  kitPrice,
  kitPricing,
  ...cartLineProps
}: ProductStickyCtaProps) {
  const [inlineVisible, setInlineVisible] = useState(true);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInlineVisible(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [targetRef]);

  const visible = !inlineVisible;

  useEffect(() => {
    if (!visible) {
      document.documentElement.style.removeProperty("--storefront-sticky-cta-height");
      return undefined;
    }
    document.documentElement.style.setProperty("--storefront-sticky-cta-height", STICKY_CTA_HEIGHT);
    return () => {
      document.documentElement.style.removeProperty("--storefront-sticky-cta-height");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 pt-3 shadow-[0_-4px_12px_rgb(0_0_0/0.08)] backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] print:hidden lg:hidden">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3">
        <ProductPricingBlock
          price={cartLineProps.price}
          compareAtPrice={compareAtPrice}
          isOnSale={isOnSale}
          kitPrice={kitPrice}
          kitPricing={kitPricing}
          variant="compact"
          className="min-w-0 flex-1"
        />
        <ProductAddToCart {...cartLineProps} className="shrink-0 [&>button]:w-auto [&>button]:min-w-[9rem]" />
      </div>
    </div>
  );
}
