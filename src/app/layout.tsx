import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { geometria } from "@/fonts/geometria-font";
import { YandexMetrika } from "@/features/analytics/yandex-metrika";
import { AppTopBar } from "@/features/navigation/app-top-bar";
import { AppNav } from "@/features/navigation/app-nav";
import { PublicStorefrontChrome } from "@/features/store/public-storefront-chrome";
import {
  defaultOpenGraph,
  getMetadataBase,
  SITE_DEFAULT_DESCRIPTION,
  SITE_TITLE,
} from "@/lib/site-seo";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: SITE_TITLE,
  description: SITE_DEFAULT_DESCRIPTION,
  openGraph: {
    ...defaultOpenGraph(),
    title: SITE_TITLE,
    description: SITE_DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DEFAULT_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geometria.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-hidden bg-zinc-50 font-sans text-zinc-900">
        <YandexMetrika />
        <AppTopBar />
        <AppNav />
        <PublicStorefrontChrome>{children}</PublicStorefrontChrome>
      </body>
    </html>
  );
}
