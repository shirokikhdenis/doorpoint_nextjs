import { Suspense } from "react";
import AdminLoginPage from "./page.client";

export default function AdminLoginRoute() {
  return (
    <Suspense
      fallback={
        <main className="admin-panel mx-auto w-full max-w-md p-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-600">Загрузка...</p>
          </div>
        </main>
      }
    >
      <AdminLoginPage />
    </Suspense>
  );
}
