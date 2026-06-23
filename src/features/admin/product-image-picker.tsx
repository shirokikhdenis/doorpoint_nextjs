"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { uploadAdminStorefrontImage } from "@/features/admin/admin-image-upload";

type ProductSearchRow = {
  id: number;
  name: string;
  sku: string;
  primaryImageUrl: string;
};

type ProductImagePickerProps = {
  value: string;
  onChange: (url: string) => void;
  allowUpload?: boolean;
  uploadSubdir?: string;
  allowSvg?: boolean;
  accept?: string;
  clearLabel?: string;
  emptyHint?: string;
};

export function ProductImagePicker({
  value,
  onChange,
  allowUpload = true,
  uploadSubdir = "storefront",
  allowSvg = false,
  accept = "image/jpeg,image/png,image/webp,image/svg+xml,.svg",
  clearLabel = "Убрать фото (будет из каталога)",
  emptyHint = "Своё фото не задано — на витрине берётся обложка из каталога.",
}: ProductImagePickerProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProductSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      const run = async () => {
        setSearching(true);
        try {
          const params = new URLSearchParams({ search: q, limit: "8", page: "1" });
          const response = await fetch(`/api/admin/products-table?${params.toString()}`);
          if (!response.ok) throw new Error("search failed");
          const json = (await response.json()) as { rows?: ProductSearchRow[] };
          setResults(
            Array.isArray(json.rows) ? json.rows.filter((row) => row.primaryImageUrl) : [],
          );
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      };
      void run();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const url = await uploadAdminStorefrontImage(file, uploadSubdir, { allowSvg });
      onChange(url);
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
  };

  return (
    <div className="space-y-2">
      {allowUpload ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Загрузка…" : "Загрузить с компьютера"}
          </button>
          <span className="text-xs text-zinc-500">или выберите из каталога:</span>
        </div>
      ) : null}
      {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск товара по названию или артикулу…"
        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm"
      />
      {searching ? <p className="text-xs text-zinc-500">Поиск…</p> : null}
      {results.length > 0 ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-zinc-100 bg-zinc-50 p-1">
          {results.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-white"
                onClick={() => {
                  onChange(row.primaryImageUrl);
                  setSearch("");
                  setResults([]);
                }}
              >
                {row.primaryImageUrl ? (
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-zinc-200 bg-white">
                    <Image src={row.primaryImageUrl} alt="" fill className="object-cover" sizes="40px" />
                  </span>
                ) : null}
                <span className="min-w-0">
                  <span className="block truncate font-medium text-zinc-900">{row.name}</span>
                  <span className="text-xs text-zinc-500">{row.sku}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {value ? (
        <div className="flex items-start gap-3">
          <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
            <Image src={value} alt="" fill className="object-contain object-center p-1" sizes="112px" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-xs text-zinc-500">{value}</p>
            <button
              type="button"
              className="text-xs text-red-700 hover:underline"
              onClick={() => onChange("")}
            >
              {clearLabel}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">{emptyHint}</p>
      )}
    </div>
  );
}
