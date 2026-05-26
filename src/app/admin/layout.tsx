import { AdminLayoutChrome } from "@/features/admin/admin-layout-chrome";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutChrome>{children}</AdminLayoutChrome>;
}
