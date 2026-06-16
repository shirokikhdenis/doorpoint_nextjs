import type { ProductData } from "@/lib/client/normalizers";

type ProductJsonLdProps = {
  product: ProductData;
};

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const image =
    product.images.find(Boolean) ||
    product.image ||
    product.variants.find((variant) => variant.image)?.image ||
    undefined;
  const price = product.variants[0]?.price ?? product.price;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku || undefined,
    image: image || undefined,
    category: [product.category, product.subcategory].filter(Boolean).join(" / ") || undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: Number.isFinite(price) ? price : undefined,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
