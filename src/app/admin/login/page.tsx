import { Suspense } from "react";
import AdminLoginPage from "./page.client";

export default function AdminLoginRoute() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-md p-6">
          <div className="border border-admin-border bg-admin-surface p-5 shadow-sm">
            <p className="text-sm text-admin-text-secondary">Загрузка...</p>
          </div>
        </main>
      }
    >
      <AdminLoginPage />
    </Suspense>
  );
}
