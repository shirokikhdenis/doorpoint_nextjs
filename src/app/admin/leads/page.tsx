import { Suspense } from "react";
import AdminLeadsPage from "./page.client";

export default function AdminLeadsRoute() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl p-6">
          <p className="text-sm text-zinc-500">Загрузка заявок…</p>
        </main>
      }
    >
      <AdminLeadsPage />
    </Suspense>
  );
}
