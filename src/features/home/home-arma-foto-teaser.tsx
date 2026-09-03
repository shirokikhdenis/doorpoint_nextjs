import Link from "next/link";
import { Button } from "@/components/ui/button";
import { catalogGridClass } from "@/features/catalog/catalog-constants";
import { StorefrontImage } from "@/features/store/storefront-image";
import { ARMA_CUSTOM_PHOTOS_PATH } from "@/lib/arma-foto-url";
import { toPublicImageSrc } from "@/lib/client/image-src";

export type HomeArmaFotoPreviewItem = {
  id: string;
  name: string;
  previewUrl: string;
};

type HomeArmaFotoTeaserProps = {
  items: HomeArmaFotoPreviewItem[];
  cardsPerRow?: number;
};

export function HomeArmaFotoTeaser({ items, cardsPerRow = 4 }: HomeArmaFotoTeaserProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-arma-foto-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-arma-foto-title" className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          Входные двери Арма под заказ
        </h2>
        <Button
          variant="outline"
          size="lg"
          className="shrink-0 border-brand/35 text-brand hover:bg-brand/5"
          asChild
        >
          <Link href={ARMA_CUSTOM_PHOTOS_PATH} prefetch={false}>
            Все фото →
          </Link>
        </Button>
      </div>

      <div className={catalogGridClass(cardsPerRow)}>
        {items.map((item) => {
          const imageSrc = toPublicImageSrc(item.previewUrl);
          return (
            <Link
              key={item.id}
              href={ARMA_CUSTOM_PHOTOS_PATH}
              prefetch={false}
              className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-brand/25 hover:shadow-md"
            >
              <div className="relative aspect-[3/4] bg-zinc-100">
                {imageSrc ? (
                  <StorefrontImage
                    src={imageSrc}
                    alt={item.name || "Дверь Арма под заказ"}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
