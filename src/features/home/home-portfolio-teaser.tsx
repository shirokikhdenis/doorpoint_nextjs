import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StorefrontImage } from "@/features/store/storefront-image";
import { toPublicImageSrc } from "@/lib/client/image-src";

export type HomePortfolioPreviewItem = {
  id: number;
  title: string;
  coverImage: string;
};

type HomePortfolioTeaserProps = {
  items: HomePortfolioPreviewItem[];
};

export function HomePortfolioTeaser({ items }: HomePortfolioTeaserProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-portfolio-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-portfolio-title" className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          Наши работы
        </h2>
        <Button variant="outline" asChild>
          <Link href="/portfolio" prefetch={false}>
            Все работы →
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item) => {
          const imageSrc = toPublicImageSrc(item.coverImage);
          return (
            <Link
              key={item.id}
              href="/portfolio"
              prefetch={false}
              className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-brand/25 hover:shadow-md"
            >
              <div className="relative aspect-[9/16] bg-zinc-100">
                {imageSrc ? (
                  <StorefrontImage
                    src={imageSrc}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                ) : null}
              </div>
              <p className="truncate px-3 py-2 text-sm font-medium text-zinc-900">{item.title}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
