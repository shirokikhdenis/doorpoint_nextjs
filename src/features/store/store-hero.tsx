import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Блок 400px над навбаром витрин: градиентный фон, кратко о магазине, CTA.
 */
export function StoreHero() {
  return (
    <section
      className="relative h-[400px] w-full overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-indigo-950 via-brand to-violet-700 print:hidden"
      aria-label="О магазине"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(255,255,255,0.14),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(0,0,0,0.22),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center gap-6 px-4 text-center text-white">
        <div className="space-y-2">
          
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Салон входных и межкомнатных дверей
          </h1>
          <p className="max-w-2xl text-sm text-white/90 sm:text-base">
            Подбор по параметрам, замер, доставка и монтаж. Приезжайте в наш шоурум в ТЦ Новосёл — поможем выбрать модель под ваш
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
            variant="outline"
            className="border-white/50 bg-white/10 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 md:text-base"
          >
            <a href="#zamer-form">Записаться на замер</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
