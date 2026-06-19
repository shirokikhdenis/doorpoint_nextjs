import Image, { type ImageProps } from "next/image";
import {
  isValidImageSrc,
  shouldBypassImageOptimizer,
  toPublicImageSrc,
} from "@/lib/client/image-src";

type StorefrontImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

/** next/image для витрины: uploads и public/ без оптимизатора Node (nginx отдаёт напрямую). */
export function StorefrontImage({ src, unoptimized, ...props }: StorefrontImageProps) {
  const normalized = toPublicImageSrc(src) || src;
  if (!isValidImageSrc(normalized)) return null;

  return (
    <Image
      src={normalized}
      unoptimized={unoptimized ?? shouldBypassImageOptimizer(normalized)}
      {...props}
    />
  );
}
