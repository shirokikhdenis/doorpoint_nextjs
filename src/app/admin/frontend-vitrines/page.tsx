import { redirect } from "next/navigation";

export default function LegacyFrontendVitrinesRedirect() {
  redirect("/admin/frontend-cards");
}
