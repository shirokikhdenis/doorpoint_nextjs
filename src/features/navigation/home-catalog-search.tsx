"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const inputClass =
  "min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 lg:py-1.5 lg:text-sm";

type HomeCatalogSearchProps = {
  className?: string;
};

export function HomeCatalogSearch({ className }: HomeCatalogSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/catalog?search=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={onSubmit} className={cn("min-w-0", className)}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск"
        aria-label="Поиск по каталогу"
        className={cn("w-full", inputClass)}
      />
    </form>
  );
}
