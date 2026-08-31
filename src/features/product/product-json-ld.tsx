import type { ProductData } from "@/lib/client/normalizers";
import { toPublicImageSrc } from "@/lib/client/image-src";
import { formatProductDisplayName } from "@/lib/product-display-name";
import { resolveProductVariantLabels } from "@/lib/product-variant-labels";
import { buildProductSeoDescription } from "@/lib/seo-copy";
import { absoluteUrl } from "@/lib/site-seo";

type ProductJsonLdProps = {
  product: ProductData;
};

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const labels = resolveProductVariantLabels(product);
  const displayName = formatProductDisplayName({
    name: product.name,
    color: labels.color,
    glass: labels.glass,
    manufacturer: labels.manufacturer,
    categorySlug: product.categorySlug,
    category: product.category,
  });
  const imageRaw =
    product.images.find(Boolean) ||
    product.image ||
    product.variants.find((variant) => variant.image)?.image ||
    "";
  const imageSrc = toPublicImageSrc(imageRaw);
  const image = imageSrc ? absoluteUrl(imageSrc) : undefined;
  const price = product.variants[0]?.price ?? product.price;
  const slug = product.slug?.trim();
  const url = slug ? absoluteUrl(`/product/${encodeURIComponent(slug)}`) : undefined;
  const description = buildProductSeoDescription({
    name: displayName,
    price,
    category: product.category,
    subcategory: product.subcategory,
  });
  const brand = labels.manufacturer || product.manufacturerName;
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    priceCurrency: "RUB",
    price: Number.isFinite(price) ? price : undefined,
    availability: "https://schema.org/InStock",
    url,
  };
  if (product.isOnSale && product.compareAtPrice && product.compareAtPrice > price) {
    offer.priceValidUntil = `${new Date().getFullYear()}-12-31`;
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayName,
    sku: product.sku || undefined,
    description,
    image,
    url,
    category: [product.category, product.subcategory].filter(Boolean).join(" / ") || undefined,
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    offers: offer,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
