import { AdminSeoPageView } from "@/features/admin/seo/admin-seo-page-view";
import { getSeoAdminSnapshot } from "@/lib/server/seo-admin-snapshot";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const snapshot = await getSeoAdminSnapshot();
  return <AdminSeoPageView snapshot={snapshot} />;
}
