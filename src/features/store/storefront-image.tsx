"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { isValidImageSrc, toCardImageSrc, toPublicImageSrc } from "@/lib/client/image-src";

type StorefrontImageProps = Omit<ImageProps, "src"> & {
  src: string;
  /** Превью `.card.jpg` для сеток; если файла нет — откат на оригинал. */
  variant?: "full" | "card";
};

/** Витрина: файлы из public/uploads отдаёт nginx, без /_next/image. */
export function StorefrontImage({
  src,
  variant = "full",
  unoptimized = true,
  className,
  fill,
  onError,
  ...props
}: StorefrontImageProps) {
  const original = toPublicImageSrc(src) || src;
  const cardSrc = variant === "card" ? toCardImageSrc(original) : "";
  const [prevOriginal, setPrevOriginal] = useState(original);
  const [useOriginal, setUseOriginal] = useState(false);

  if (original !== prevOriginal) {
    setPrevOriginal(original);
    setUseOriginal(false);
  }

  if (!isValidImageSrc(original)) return null;

  const displaySrc =
    variant === "card" && cardSrc && !useOriginal ? cardSrc : original;

  return (
    <Image
      src={displaySrc}
      unoptimized={unoptimized}
      className={className}
      fill={fill}
      onError={(event) => {
        if (variant === "card" && !useOriginal && cardSrc && cardSrc !== original) {
          setUseOriginal(true);
        }
        onError?.(event);
      }}
      {...props}
    />
  );
}
