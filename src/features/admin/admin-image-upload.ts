type UploadAdminImagesOptions = {
  url: string;
  files: File[];
  fieldName?: string;
  extraFields?: Record<string, string>;
};

export async function uploadAdminImages({
  url,
  files,
  fieldName = "files",
  extraFields,
}: UploadAdminImagesOptions): Promise<void> {
  if (files.length === 0) return;

  const formData = new FormData();
  files.forEach((file) => formData.append(fieldName, file));
  if (extraFields) {
    Object.entries(extraFields).forEach(([key, value]) => formData.append(key, value));
  }

  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || "Не удалось загрузить фото");
  }
}

export async function uploadAdminStorefrontImage(
  file: File,
  subdir: string,
  options?: { allowSvg?: boolean },
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("subdir", subdir);
  if (options?.allowSvg) {
    formData.append("allowSvg", "1");
  }

  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  const payload = (await response.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!response.ok) {
    throw new Error(payload.message || "Не удалось загрузить файл");
  }
  if (!payload.url) {
    throw new Error("Сервер не вернул URL файла");
  }
  return payload.url;
}
