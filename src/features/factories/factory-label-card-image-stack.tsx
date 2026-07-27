import { StorefrontImage } from "@/features/store/storefront-image";
import {
  factoryLabelCardImageClass,
  factoryLabelCardImageFrameClass,
  factoryLabelCardImageSizes,
} from "@/features/store/storefront-ui";
import { toPublicImageSrc } from "@/lib/client/image-src";

type FactoryLabelCardImageStackProps = {
  /** [backLeft, backRight, front] */
  images: string[];
};

const backLayerClass =
  "absolute top-1/2 z-0 h-[78%] w-[38%] -translate-y-1/2 opacity-85";

function DoorLayer({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  return (
    <div className={className}>
      <div className="relative h-full w-full">
        <StorefrontImage
          src={src}
          alt=""
          fill
          sizes={factoryLabelCardImageSizes}
          className={factoryLabelCardImageClass}
        />
      </div>
    </div>
  );
}

export function FactoryLabelCardImageStack({ images }: FactoryLabelCardImageStackProps) {
  const normalized = images
    .map((image) => toPublicImageSrc(image))
    .filter((image): image is string => Boolean(image));

  if (!normalized.length) {
    return (
      <div
        className={`${factoryLabelCardImageFrameClass} bg-gradient-to-br from-zinc-100 to-zinc-200`}
        aria-hidden
      />
    );
  }

  const [backLeft, backRight, front] =
    normalized.length >= 3
      ? normalized
      : [normalized[0], normalized[1] ?? normalized[0], normalized[0]];

  return (
    <div className={factoryLabelCardImageFrameClass}>
      <DoorLayer src={backLeft} className={`${backLayerClass} left-[2%]`} />
      <DoorLayer src={backRight} className={`${backLayerClass} right-[2%]`} />
      <DoorLayer
        src={front}
        className="absolute left-1/2 top-1/2 z-10 h-full w-[52%] -translate-x-1/2 -translate-y-1/2 drop-shadow-sm"
      />
    </div>
  );
}
