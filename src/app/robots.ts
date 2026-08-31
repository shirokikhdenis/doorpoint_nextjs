import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/cart"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
