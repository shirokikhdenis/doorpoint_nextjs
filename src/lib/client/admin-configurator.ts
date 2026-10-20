import type { ApartmentCatalog } from "@/lib/configurator/apartment-types";

const readErrorMessage = async (response: Response) => {
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  return typeof payload.message === "string" ? payload.message : `Ошибка (${response.status})`;
};

export const fetchApartmentCatalog = async (): Promise<ApartmentCatalog> => {
  const response = await fetch("/api/admin/configurator/apartment", { cache: "no-store" });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return (await response.json()) as ApartmentCatalog;
};
