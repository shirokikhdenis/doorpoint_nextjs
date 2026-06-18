import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const portfolioService = require("@/lib/server/services/portfolioService");
const { withErrorHandling, json, readBody } = require("@/lib/server/http/handlers");
const { requestHasAdminSession } = require("@/lib/server/auth/adminAuth");

export const runtime = "nodejs";

export const PATCH = (request, context) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }

    const params = await context.params;
    const body = await readBody(request);
    const project = await portfolioService.reorderProjectImages(
      Number(params.id),
      body.imageIds,
    );
    return project ? json(project) : json({ message: "Проект не найден" }, 404);
  });

export const POST = (request, context) =>
  withErrorHandling(async () => {
    if (!requestHasAdminSession(request)) {
      return json({ message: "Unauthorized" }, 401);
    }

    const params = await context.params;
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
    const files = formData.getAll("files").filter((entry) => entry && typeof entry.arrayBuffer === "function");
    if (files.length === 0) {
      return json({ message: "Выберите хотя бы один файл (jpg, png или webp)" }, 400);
    }

    try {
      const project = await portfolioService.saveUploadedFiles(Number(params.id), files);
      return json(project, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить файлы";
      const status = message.includes("Нет прав на запись") ? 507 : 400;
      return json({ message }, status);
    }
  });
