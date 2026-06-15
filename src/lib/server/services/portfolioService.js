const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const portfolioRepository = require("../repositories/portfolioRepository");

const portfolioUploadsRoot = path.join(process.cwd(), "public", "uploads", "portfolio");
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const listPublicPortfolio = async () => {
  const projects = await portfolioRepository.listProjects();
  return projects
    .filter((project) => project.images.length > 0)
    .map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      sortOrder: project.sortOrder,
      coverImage: project.images[0]?.imageUrl || "",
      images: project.images.map((img) => img.imageUrl),
    }));
};

const listAdminPortfolio = () => portfolioRepository.listProjects();

const createProject = async (payload) =>
  portfolioRepository.createProject({
    title: payload.title,
    description: payload.description,
    sortOrder: payload.sortOrder,
  });

const updateProject = async (id, payload) =>
  portfolioRepository.updateProject(id, {
    title: payload.title,
    description: payload.description,
    sortOrder: payload.sortOrder,
  });

const saveUploadedFiles = async (projectId, fileEntries) => {
  const numericId = Number(projectId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error("Некорректный проект");
  }

  const project = await portfolioRepository.getProjectById(numericId);
  if (!project) throw new Error("Проект не найден");

  const dir = path.join(portfolioUploadsRoot, String(numericId));
  await fs.mkdir(dir, { recursive: true });

  const savedUrls = [];
  for (const file of fileEntries) {
    if (!file || typeof file.arrayBuffer !== "function") continue;
    const originalName = String(file.name || "image.jpg");
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`Недопустимый формат файла: ${originalName}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) continue;
    if (buffer.length > MAX_FILE_BYTES) {
      throw new Error(`Файл слишком большой (макс. ${MAX_FILE_BYTES / (1024 * 1024)} МБ): ${originalName}`);
    }

    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    await fs.writeFile(path.join(dir, fileName), buffer);
    savedUrls.push(`/uploads/portfolio/${numericId}/${fileName}`);
  }

  if (savedUrls.length === 0) {
    throw new Error("Не выбраны подходящие изображения");
  }

  return portfolioRepository.addImages(numericId, savedUrls);
};

const deleteProject = async (id) => {
  const deleted = await portfolioRepository.deleteProject(id);
  if (!deleted) return null;

  const dir = path.join(portfolioUploadsRoot, String(deleted.id));
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});

  for (const imageUrl of deleted.imageUrls) {
    await deleteFileByPublicUrl(imageUrl);
  }

  return { id: deleted.id };
};

const reorderProjectImages = async (projectId, imageIds) =>
  portfolioRepository.reorderImages(projectId, imageIds);

const deleteImage = async (imageId) => {
  const image = await portfolioRepository.getImageById(imageId);
  if (!image) return null;

  const deleted = await portfolioRepository.deleteImage(imageId);
  if (!deleted) return null;

  await deleteFileByPublicUrl(deleted.imageUrl);

  const remaining = await portfolioRepository.getProjectById(image.projectId);
  return { imageId: Number(deleted.id), project: remaining };
};

const deleteFileByPublicUrl = async (imageUrl) => {
  const raw = String(imageUrl || "").trim();
  if (!raw.startsWith("/uploads/portfolio/")) return;
  const relative = raw.replace(/^\/+/, "");
  const fullPath = path.join(process.cwd(), "public", relative);
  await fs.unlink(fullPath).catch(() => {});
};

module.exports = {
  listPublicPortfolio,
  listAdminPortfolio,
  createProject,
  updateProject,
  saveUploadedFiles,
  reorderProjectImages,
  deleteProject,
  deleteImage,
};
