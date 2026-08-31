import Image, { type ImageProps } from "next/image";
import { isValidImageSrc, toPublicImageSrc } from "@/lib/client/image-src";

type StorefrontImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

/** Витрина: файлы из public/uploads отдаёт nginx, без /_next/image. */
export function StorefrontImage({ src, unoptimized = true, className, fill, ...props }: StorefrontImageProps) {
  const normalized = toPublicImageSrc(src) || src;
  if (!isValidImageSrc(normalized)) return null;

  return (
    <Image
      src={normalized}
      unoptimized={unoptimized}
      className={className}
      fill={fill}
      {...props}
    />
  );
}
