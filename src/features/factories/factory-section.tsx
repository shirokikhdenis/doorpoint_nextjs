import { FactoryLabelCard, type FactoryLabelItem } from "@/features/factories/factory-label-card";
import { factoryLabelCardGridClass } from "@/features/store/storefront-ui";

export type FactorySectionData = {
  id: string;
  title: string;
  factories: FactoryLabelItem[];
};

type FactorySectionProps = {
  section: FactorySectionData;
};

export function FactorySection({ section }: FactorySectionProps) {
  return (
    <section className="space-y-4" aria-labelledby={`factory-section-${section.id}`}>
      <h2 id={`factory-section-${section.id}`} className="text-xl font-semibold text-zinc-900 sm:text-2xl">
        {section.title}
      </h2>
      <div className={factoryLabelCardGridClass}>
        {section.factories.map((factory) => (
          <FactoryLabelCard key={`${section.id}-${factory.name}`} item={factory} />
        ))}
      </div>
    </section>
  );
}
