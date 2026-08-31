import type { NextConfig } from "next";

/** LAN IPs when opening dev via http://192.168.x.x:PORT (not only localhost). */
const allowedDevOrigins = [
  "192.168.0.*",
  "192.168.1.*",
  "10.0.*",
  "172.16.*",
  ...(process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  // pdfkit/fontkit — нативные Node-модули; при бандлинге ломается `new PDFDocument()`.
  serverExternalPackages: [
    "pdfkit",
    "fontkit",
    "linebreak",
    "png-js",
    "@noble/hashes",
    "@noble/ciphers",
  ],
  // Загрузки лежат на диске и отдаются nginx; не тащить десятки тысяч JPEG в file tracing.
  outputFileTracingExcludes: {
    "*": ["./public/uploads/**/*"],
  },
  experimental: {
    // Совпадает с nginx client_max_body_size; иначе proxy обрезает multipart-загрузки.
    proxyClientMaxBodySize: "25mb",
    // Новый scroll-handler: корректнее сбрасывает прокрутку при client navigation (Next.js 16).
    appNewScrollHandler: true,
  },
  turbopack: {
    ignoreIssue: [
      {
        path: "**/uploadsPath.js",
        title: /Overly broad patterns/,
      },
      {
        path: "**/resolveImageBuffer.js",
        title: /Overly broad patterns/,
      },
      {
        path: "**/portfolioService.js",
        title: /Overly broad patterns/,
      },
      {
        path: "**/csvImportService.js",
        title: /Overly broad patterns/,
      },
      {
        path: "**/imageOptimize.js",
        title: /Overly broad patterns/,
      },
      {
        path: "**/imageUploadService.js",
        title: /Overly broad patterns/,
      },
      {
        path: "**/next.config.ts",
        title: /Encountered unexpected file in NFT list/,
      },
    ],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
