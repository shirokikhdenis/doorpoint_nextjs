import {
  ARMA_FOTO_HERO,
  ARMA_FOTO_STEPS,
  ARMA_FOTO_TRUST,
} from "@/features/arma-photos/arma-foto-copy";

export function ArmaFotoHero() {
  return (
    <section className="mt-4 space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl lg:text-4xl">
          {ARMA_FOTO_HERO.title}
        </h1>
        <p className="text-base leading-relaxed text-zinc-600 sm:text-lg">{ARMA_FOTO_HERO.subtitle}</p>
        <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">{ARMA_FOTO_HERO.note}</p>
      </div>
    </section>
  );
}

export function ArmaFotoTrustCards() {
  return (
    <section className="mt-10 grid gap-4 md:grid-cols-3">
      {ARMA_FOTO_TRUST.map((item) => (
        <article
          key={item.title}
          className="rounded-xl border border-brand bg-brand p-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-white">{item.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/90">{item.text}</p>
        </article>
      ))}
    </section>
  );
}

export function ArmaFotoHowToOrder() {
  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl">Как заказать</h2>
      <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ARMA_FOTO_STEPS.map((item) => (
          <li key={item.step} className="space-y-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {item.step}
            </span>
            <h3 className="font-semibold text-zinc-900">{item.title}</h3>
            <p className="text-sm leading-relaxed text-zinc-600">{item.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
