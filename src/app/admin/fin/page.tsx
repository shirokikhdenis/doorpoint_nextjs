import { Suspense } from "react";
import AdminFinPage from "./page.client";

export default function AdminFinRoute() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl p-6">
          <p className="text-sm text-zinc-500">Загрузка финучёта…</p>
        </main>
      }
    >
      <AdminFinPage />
    </Suspense>
  );
}
