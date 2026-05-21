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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
