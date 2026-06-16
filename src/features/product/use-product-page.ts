"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { productHref } from "@/lib/client/product-url";
import { serializeVariantAxes } from "@/features/product/product-utils";
import { ProductData, Variant, normalizeProductData } from "@/lib/client/normalizers";

const seedProductCache = (
  cache: Map<string, ProductData>,
  data: ProductData,
  ref: string,
) => {
  cache.set(ref, data);
  if (data.slug) cache.set(data.slug, data);
};

export function useProductPage(
  params: Promise<{ slug: string }>,
  initialProduct?: ProductData | null,
) {
  const initialRef =
    initialProduct?.slug?.trim() ||
    (initialProduct?.id ? String(initialProduct.id) : null);

  const [selectedRef, setSelectedRef] = useState<string | null>(initialRef);
  const [product, setProduct] = useState<ProductData | null>(initialProduct ?? null);
  const [variantSku, setVariantSku] = useState(
    () => initialProduct?.variants[0]?.sku || "",
  );
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState("");
  const [displayedImage, setDisplayedImage] = useState("");
  const [isManualImageSelection, setIsManualImageSelection] = useState(false);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);

  const cacheRef = useRef<Map<string, ProductData>>(new Map());
  const cacheSeededRef = useRef(false);
  const inFlightRef = useRef<Set<string>>(new Set());

  if (initialProduct && initialRef && !cacheSeededRef.current) {
    cacheSeededRef.current = true;
    seedProductCache(cacheRef.current, initialProduct, initialRef);
  }
  const productRef = useRef<ProductData | null>(null);
  const variantSkuRef = useRef("");

  useEffect(() => {
    productRef.current = product;
  }, [product]);
  useEffect(() => {
    variantSkuRef.current = variantSku;
  }, [variantSku]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { slug } = await params;
      if (cancelled) return;
      setSelectedRef((prev) => prev ?? slug);
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const applyProduct = useCallback((data: ProductData) => {
    const prev = productRef.current;
    const prevSku = variantSkuRef.current;
    let nextSku = data.variants[0]?.sku || "";
    if (prev && prevSku) {
      const prevAxes = serializeVariantAxes(prev.variants.find((v) => v.sku === prevSku));
      if (prevAxes) {
        const match = data.variants.find((v) => serializeVariantAxes(v) === prevAxes);
        if (match) nextSku = match.sku;
      }
    }
    setProduct(data);
    setVariantSku(nextSku);
    setLoading(false);
    setError("");
  }, []);

  useEffect(() => {
    if (!selectedRef) return;
    const cached = cacheRef.current.get(selectedRef);
    if (cached) {
      if (productRef.current?.id !== cached.id) {
        applyProduct(cached);
      } else {
        setLoading(false);
        setError("");
      }
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(selectedRef)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setError("Товар не найден");
          setLoading(false);
          return;
        }
        const data = normalizeProductData(await response.json());
        cacheRef.current.set(selectedRef, data);
        if (data.slug) cacheRef.current.set(data.slug, data);
        applyProduct(data);
        if (data.slug && /^\d+$/.test(selectedRef) && selectedRef !== data.slug) {
          setSelectedRef(data.slug);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError("Ошибка загрузки товара");
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedRef, applyProduct]);

  useEffect(() => {
    if (!product?.slug || typeof window === "undefined") return;
    if (selectedRef !== product.slug) return;
    const target = productHref(product);
    if (window.location.pathname !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [product, selectedRef]);

  const prefetchProduct = useCallback((ref: string) => {
    const key = String(ref || "").trim();
    if (!key || cacheRef.current.has(key) || inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);
    fetch(`/api/products/${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        const data = normalizeProductData(j);
        cacheRef.current.set(key, data);
        if (data.slug) cacheRef.current.set(data.slug, data);
      })
      .catch(() => {})
      .finally(() => inFlightRef.current.delete(key));
  }, []);

  const switchToSlug = useCallback((slug: string) => {
    const next = String(slug || "").trim();
    if (!next) return;
    setSelectedRef((prev) => {
      if (prev === next) return prev;
      if (!cacheRef.current.has(next)) setLoading(true);
      return next;
    });
  }, []);

  const selectedVariant = useMemo(
    () => product?.variants.find((item) => item.sku === variantSku) || null,
    [product?.variants, variantSku],
  );

  const variantAxes = useMemo(() => {
    if (!product) return [] as Array<{ code: string; name: string; options: string[] }>;
    const order: string[] = [];
    const byCode = new Map<string, { code: string; name: string; options: string[] }>();
    for (const variant of product.variants) {
      for (const attribute of variant.attributes) {
        if (!attribute.isVariantAxis) continue;
        let axis = byCode.get(attribute.code);
        if (!axis) {
          axis = { code: attribute.code, name: attribute.name, options: [] };
          byCode.set(attribute.code, axis);
          order.push(attribute.code);
        }
        if (!axis.options.includes(attribute.value)) axis.options.push(attribute.value);
      }
    }
    return order.map((code) => byCode.get(code)!).filter((axis) => axis.options.length > 0);
  }, [product]);

  const currentAxisValues = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    if (!selectedVariant) return out;
    for (const attribute of selectedVariant.attributes) {
      if (attribute.isVariantAxis) out[attribute.code] = attribute.value;
    }
    return out;
  }, [selectedVariant]);

  const selectedNumericId = product?.id ?? 0;

  const cartColorLabel = useMemo(() => {
    if (!product) return "";
    const fromChip = product.colorVariants.find((e) => e.id === product.id);
    if (fromChip?.color?.trim()) return fromChip.color.trim();
    const fromAttr = product.attributes.find((a) => a.code === "color")?.value;
    return fromAttr?.trim() || "";
  }, [product]);

  const selectAxisValue = useCallback(
    (code: string, value: string) => {
      if (!product) return;
      const desired = { ...currentAxisValues, [code]: value };
      const matchesAll = (variant: Variant) =>
        variant.attributes.every(
          (attribute) => !attribute.isVariantAxis || desired[attribute.code] === attribute.value,
        );
      const exact = product.variants.find(matchesAll);
      const fallback =
        exact ||
        product.variants.find((variant) =>
          variant.attributes.some(
            (attribute) =>
              attribute.isVariantAxis && attribute.code === code && attribute.value === value,
          ),
        );
      if (fallback) setVariantSku(fallback.sku);
    },
    [product, currentAxisValues],
  );

  const targetImage = selectedVariant?.image || product?.images[0] || product?.image || "";

  useEffect(() => {
    setIsManualImageSelection(false);
  }, [selectedRef, variantSku]);

  useEffect(() => {
    if (!targetImage) return;
    if (isManualImageSelection && displayedImage) return;
    if (!displayedImage) {
      setDisplayedImage(targetImage);
      return;
    }
    if (targetImage === displayedImage) return;
    const preload = new window.Image();
    const swap = () => setDisplayedImage(targetImage);
    preload.onload = swap;
    preload.onerror = swap;
    preload.src = targetImage;
  }, [targetImage, displayedImage, isManualImageSelection]);

  return {
    product,
    loading,
    error,
    selectedRef,
    selectedNumericId,
    variantSku,
    setVariantSku,
    selectedVariant,
    variantAxes,
    currentAxisValues,
    cartColorLabel,
    displayedImage,
    setDisplayedImage,
    setIsManualImageSelection,
    imageLightboxOpen,
    setImageLightboxOpen,
    targetImage,
    prefetchProduct,
    switchToSlug,
    selectAxisValue,
  };
}
