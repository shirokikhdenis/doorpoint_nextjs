import { PortfolioGallery } from "@/features/portfolio/portfolio-gallery";
import { StorefrontBreadcrumbs } from "@/features/store/storefront-breadcrumbs";
import { getCachedPortfolio } from "@/lib/server/cache/storefront-cache";

export default async function PortfolioPage() {
  const items = await getCachedPortfolio();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <StorefrontBreadcrumbs
        items={[
          { name: "Главная", href: "/" },
          { name: "Портфолио", href: "/portfolio" },
        ]}
      />
      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Портфолио</h1>
      <p className="mt-2 text-sm text-zinc-600">Фото наших работ</p>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">Пока нет опубликованных работ.</p>
      ) : (
        <PortfolioGallery items={items} />
      )}
    </main>
  );
}
