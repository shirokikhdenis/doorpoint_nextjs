import Link from "next/link";
import { StorefrontImage } from "@/features/store/storefront-image";
import { toPublicImageSrc } from "@/lib/client/image-src";

export type LabelCardProps = {
  href: string;
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  coverImage: string | null;
};

export function LabelCard({ href, badge, title, subtitle, cta, coverImage }: LabelCardProps) {
  const imageSrc = toPublicImageSrc(coverImage);

  return (
    <Link
      href={href}
      prefetch={false}
      className="group relative flex min-h-[180px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md transition hover:border-brand/25 hover:shadow-lg sm:min-h-[200px]"
    >
      {imageSrc ? (
        <StorefrontImage
          src={imageSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover object-center transition duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200" aria-hidden />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" aria-hidden />
      <div className="relative z-10 flex w-full flex-col justify-between gap-3 p-5 sm:p-6">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">{badge}</p>
          <h3 className="text-xl font-bold text-white sm:text-2xl">{title}</h3>
          <p className="text-sm text-white/85">{subtitle}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition group-hover:border-white group-hover:bg-white/20">
          {cta}
        </span>
      </div>
    </Link>
  );
}
