"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/features/navigation/app-nav";
import { AppTopBar } from "@/features/navigation/app-top-bar";
import { PublicStorefrontChrome } from "@/features/store/public-storefront-chrome";

export function StorefrontLayoutGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <AppTopBar />
      <AppNav />
      <PublicStorefrontChrome>{children}</PublicStorefrontChrome>
    </>
  );
}
