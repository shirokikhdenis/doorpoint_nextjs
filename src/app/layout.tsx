import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { geometria } from "@/fonts/geometria-font";
import { AppTopBar } from "@/features/navigation/app-top-bar";
import { AppNav } from "@/features/navigation/app-nav";
import { AppCatalogNav } from "@/features/navigation/app-catalog-nav";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Door Catalog Next.js",
  description: "Migrated storefront/admin application on Next.js + PostgreSQL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geometria.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900">
        <AppTopBar />
        <AppNav />
        <AppCatalogNav />
        {children}
      </body>
    </html>
  );
}
