import { AdminRelatedFittingsPageView } from "@/features/admin/related-fittings/admin-related-fittings-page-view";
import { AdminDoorFactoryFittingBrands } from "@/features/admin/related-fittings/admin-door-factory-fitting-brands";
import { getRelatedFittingsAdminSnapshot } from "@/lib/server/related-fittings-admin-snapshot";

export const dynamic = "force-dynamic";

export default async function AdminRelatedFittingsPage() {
  const snapshot = await getRelatedFittingsAdminSnapshot();
  return (
    <AdminRelatedFittingsPageView snapshot={snapshot} extra={<AdminDoorFactoryFittingBrands />} />
  );
}
