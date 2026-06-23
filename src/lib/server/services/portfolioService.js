const fs = require("fs/promises");
const path = require("path");
const portfolioRepository = require("../repositories/portfolioRepository");
const { getUploadsRoot } = require("../uploadsPath");
const { saveFilesToSubdir } = require("./imageUploadService");

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

  const savedUrls = await saveFilesToSubdir(`portfolio/${numericId}`, fileEntries);
  return portfolioRepository.addImages(numericId, savedUrls);
};

const deleteProject = async (id) => {
  const deleted = await portfolioRepository.deleteProject(id);
  if (!deleted) return null;

  const dir = path.join(getUploadsRoot(), "portfolio", String(deleted.id));
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
