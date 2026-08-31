const fs = require("fs/promises");
const path = require("path");

const getUploadsRoot = () => {
  const fromEnv = String(process.env.UPLOADS_ROOT || "").trim();
  if (fromEnv) return path.resolve(/*turbopackIgnore: true*/ fromEnv);
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");
};

const joinUploads = (...segments) =>
  path.join(/*turbopackIgnore: true*/ getUploadsRoot(), ...segments.filter(Boolean));

const ensureWritableSubdir = async (subdir) => {
  const dir = joinUploads(subdir);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.access(dir, fs.constants.W_OK);
  } catch (error) {
    if (error?.code === "EACCES" || error?.code === "EPERM") {
      throw new Error(
        `Нет прав на запись в ${dir}. На VPS: sudo mkdir -p public/uploads/${subdir} && sudo chown -R www-data:www-data public/uploads`,
      );
    }
    throw error;
  }
  return dir;
};

module.exports = {
  getUploadsRoot,
  joinUploads,
  ensureWritableSubdir,
};
