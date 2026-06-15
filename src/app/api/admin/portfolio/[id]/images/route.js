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
    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry) => entry && typeof entry.arrayBuffer === "function");
    if (files.length === 0) {
      return json({ message: "Выберите хотя бы один файл" }, 400);
    }

    const project = await portfolioService.saveUploadedFiles(Number(params.id), files);
    return json(project, 201);
  });
