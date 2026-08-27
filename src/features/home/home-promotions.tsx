import Link from "next/link";
import { cn } from "@/lib/utils";
import { HomePromotionSlider } from "@/features/home/home-promotion-slider";
import type { PromotionBanner } from "@/lib/client/normalizers";
const promoCardClass =
  "rounded-lg border border-zinc-200 bg-white shadow-md transition hover:border-brand/25 hover:shadow-lg";

function PromoIconBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand",
        className,
      )}
    >
      {children}
    </span>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M20 12l-8.5 8.5a2 2 0 0 1-2.83 0L3 14.83V4h10.83L20 10.17a2 2 0 0 1 0 2.83z" />
      <circle cx="7.5" cy="7.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DoorCatalogIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M7 3h10a1 1 0 0 1 1 1v17H6V4a1 1 0 0 1 1-1z" />
      <circle cx="15" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 8.5 8.5 4 20 15.5 15.5 20 4 8.5z" />
      <path d="M9 9l1.5 1.5M12.5 12.5 14 14M16 16l1.5 1.5" />
    </svg>
  );
}

type InfoCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  variant?: "default" | "offer";
};

const infoCardCtaClass =
  "mt-2 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold shadow-sm";

function InfoCard({ title, description, icon, href, variant = "default" }: InfoCardProps) {
  const isOffer = variant === "offer";
  const body = (
    <>
      <PromoIconBadge className={isOffer ? "bg-white/15 text-white" : undefined}>{icon}</PromoIconBadge>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold leading-5", isOffer ? "text-white" : "text-zinc-900")}>
          {title}
        </p>
        {href ? (
          <span
            className={cn(
              infoCardCtaClass,
              isOffer
                ? "bg-white text-brand"
                : "border border-brand bg-white text-brand",
            )}
          >
            {description}
          </span>
        ) : (
          <p className="mt-2 text-sm leading-5 text-zinc-600">{description}</p>
        )}
      </div>
    </>
  );

  const className = cn(
    "flex h-full items-center gap-3 p-4",
    isOffer
      ? "rounded-lg border border-brand bg-brand text-white shadow-md transition hover:bg-brand-hover hover:shadow-lg"
      : promoCardClass,
  );

  if (href) {
    if (href === "/catalog") {
      return (
        <a href={href} className={className}>
          {body}
        </a>
      );
    }

    return (
      <Link href={href} prefetch={false} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

export type HomePromoCard = {
  icon: "price" | "catalog" | "measure";
  title: string;
  description: string;
  href: string | null;
  variant: "default" | "offer";
};

const DEFAULT_PROMO_CARDS: HomePromoCard[] = [
  {
    icon: "price",
    title: "Гарантия лучшей цены",
    description: "Найдете дешевле - сделаем скидку!",
    href: null,
    variant: "default",
  },
  {
    icon: "catalog",
    title: "Двери на любой вкус от ведущих фабрик РФ",
    description: "Перейти в каталог",
    href: "/catalog",
    variant: "default",
  },
  {
    icon: "measure",
    title: "Бесплатный замер",
    description: "Оставить заявку",
    href: "/#zamer-form",
    variant: "offer",
  },
];

const PROMO_ICONS = {
  price: <TagIcon />,
  catalog: <DoorCatalogIcon />,
  measure: <RulerIcon />,
} as const;

export function HomePromotions({
  banners,
  cards = DEFAULT_PROMO_CARDS,
}: {
  banners: PromotionBanner[];
  cards?: HomePromoCard[];
}) {
  const promoCards = cards.length === 3 ? cards : DEFAULT_PROMO_CARDS;
  return (
    <section aria-labelledby="home-promotions-title" className="space-y-4">
      <h2 id="home-promotions-title" className="sr-only">
        Акции и скидки
      </h2>

      <HomePromotionSlider banners={banners} />

      <div className="grid items-stretch gap-4 sm:grid-cols-3">
        {promoCards.map((card, index) => (
          <InfoCard
            key={`${card.icon}-${index}`}
            title={card.title}
            description={card.description}
            icon={PROMO_ICONS[card.icon] ?? PROMO_ICONS.price}
            href={card.href || undefined}
            variant={card.variant}
          />
        ))}
      </div>
    </section>
  );
}
