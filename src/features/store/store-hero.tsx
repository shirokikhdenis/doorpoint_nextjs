import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const HERO_BG =
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1920&q=80";

/**
 * Блок 400px над навбаром витрин: фон, кратко о магазине, три CTA.
 */
export function StoreHero() {
  return (
    <section
      className="relative h-[400px] w-full overflow-hidden border-b border-zinc-200 print:hidden"
      aria-label="О магазине"
    >
      <Image
        src={HERO_BG}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30" aria-hidden />
      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-6 px-4 text-center text-white">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">Двери в Архангельске</p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Салон входных и межкомнатных дверей
          </h1>
          <p className="max-w-2xl text-sm text-white/90 sm:text-base">
            Подбор по параметрам, доставка и монтаж. Приезжайте в шоурум — поможем выбрать модель под ваш
            интерьер и бюджет.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-white text-sm font-medium text-zinc-900 shadow-md hover:bg-zinc-100 md:text-base"
          >
            <Link href="/catalog#catalog-vitrines">Перейти в каталог</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="bg-[#2C2CB7] text-sm font-medium text-white hover:bg-[#252599] md:text-base"
          >
            <a href="#zamer-form">Записаться на замер</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
