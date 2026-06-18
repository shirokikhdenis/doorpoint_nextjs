import type { Metadata } from "next";
import { AdminLayoutChrome } from "@/features/admin/admin-layout-chrome";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutChrome>{children}</AdminLayoutChrome>;
}
