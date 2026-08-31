import Link from "next/link";
import { absoluteUrl } from "@/lib/site-seo";

export type BreadcrumbItem = {
  name: string;
  href?: string;
};

type StorefrontBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function StorefrontBreadcrumbs({ items }: StorefrontBreadcrumbsProps) {
  const visible = items.filter((item) => item.name.trim());
  if (visible.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: visible.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };

  return (
    <nav aria-label="Хлебные крошки" className="text-sm text-zinc-500">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ol className="flex flex-wrap items-center gap-1.5">
        {visible.map((item, index) => {
          const last = index === visible.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href && !last ? (
                <Link href={item.href} prefetch={false} className="transition hover:text-brand hover:underline">
                  {item.name}
                </Link>
              ) : (
                <span className={last ? "font-medium text-zinc-900" : ""}>{item.name}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
