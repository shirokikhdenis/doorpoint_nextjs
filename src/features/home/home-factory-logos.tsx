import { HomeFactoryLogosSlider } from "@/features/home/home-factory-logos-slider";

export type HomeFactoryLogoItem = {
  name: string;
  logoImage: string | null;
  href: string;
};

type HomeFactoryLogosProps = {
  items: HomeFactoryLogoItem[];
};

export function HomeFactoryLogos({ items }: HomeFactoryLogosProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-factories-title" className="space-y-4">
      <h2 id="home-factories-title" className="text-xl font-bold text-zinc-900 sm:text-2xl">
        Работаем с ведущими фабриками
      </h2>
      <HomeFactoryLogosSlider items={items} />
    </section>
  );
}
