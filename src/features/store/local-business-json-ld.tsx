import {
  SITE_ADDRESS,
  SITE_EMAIL,
  SITE_HOURS,
  SITE_PHONE_TEL,
  SITE_SOCIAL_LINKS,
} from "@/lib/site-contact";
import { absoluteUrl, SITE_NAME, SITE_OG_IMAGE_PATH } from "@/lib/site-seo";

export function LocalBusinessJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: SITE_NAME,
    image: absoluteUrl(SITE_OG_IMAGE_PATH),
    url: absoluteUrl("/"),
    telephone: SITE_PHONE_TEL,
    email: SITE_EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_ADDRESS,
      addressLocality: "Архангельск",
      addressCountry: "RU",
    },
    openingHours: "Mo-Fr 11:00-19:00, Sa-Su 11:00-17:00",
    description: SITE_HOURS,
    sameAs: SITE_SOCIAL_LINKS.map((link) => link.href),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
