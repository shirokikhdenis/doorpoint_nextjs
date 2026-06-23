import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { saveFilesToSubdir } = require("@/lib/server/services/imageUploadService");
const { withErrorHandling, json } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

export const POST = (request) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }

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

    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ message: "Выберите файл (jpg, png или webp)" }, 400);
    }

    const subdir = String(formData.get("subdir") || "storefront").trim() || "storefront";
    const allowSvg = String(formData.get("allowSvg") || "").trim() === "1";

    try {
      const [url] = await saveFilesToSubdir(subdir, [file], { allowSvg });
      return json({ url }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить файлы";
      const status = message.includes("Нет прав на запись") ? 507 : 400;
      return json({ message }, status);
    }
  });
