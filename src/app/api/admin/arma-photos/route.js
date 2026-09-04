import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const armaPhotosService = require("@/lib/server/services/armaPhotosService");
const { invalidateStorefrontCache } = require("@/lib/server/cache/invalidate-storefront");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

const requireAdmin = (request) => {
  if (!requestHasAdminSession(request)) {
    return json({ message: "Unauthorized" }, 401);
  }
  return null;
};

export const GET = (request) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const data = await armaPhotosService.listAdminArmaGallery();
    return json(data);
  });

export const POST = (request) =>
  withErrorHandling(async () => {
    const denied = requireAdmin(request);
    if (denied) return denied;

    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      return json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Не удалось прочитать загруженные файлы (проверьте размер и лимит nginx client_max_body_size)",
        },
        400,
      );
    }

    const files = formData
      .getAll("files")
      .filter((entry) => entry && typeof entry.arrayBuffer === "function");
    if (files.length === 0) {
      return json({ message: "Выберите хотя бы один файл (jpg, png или webp)" }, 400);
    }

    try {
      const data = await armaPhotosService.uploadArmaPhotos(files);
      await invalidateStorefrontCache("arma-photos");
      return json(data, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить файлы";
      const status = message.includes("Нет прав на запись") ? 507 : 400;
      return json({ message }, status);
    }
  });
