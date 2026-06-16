export function ProductPageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-4 w-28 animate-pulse rounded bg-zinc-100" />
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="aspect-[4/5] animate-pulse rounded-lg bg-zinc-100" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-zinc-100" />
          <div className="h-6 w-1/4 animate-pulse rounded bg-zinc-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100" />
          <div className="h-10 w-full animate-pulse rounded bg-zinc-100" />
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-zinc-50" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
