const { query, withTransaction } = require("../db/postgres");
const { ensurePortfolioTables } = require("../db/schemaPatches");

const mapImageRow = (row) => ({
  id: Number(row.id),
  projectId: Number(row.projectId),
  imageUrl: String(row.imageUrl || ""),
  sortOrder: Number(row.sortOrder) || 0,
});

const mapProjectRow = (row, images = []) => ({
  id: Number(row.id),
  title: String(row.title || ""),
  description: String(row.description || ""),
  sortOrder: Number(row.sortOrder) || 0,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  images: images.map(mapImageRow),
});

const listProjects = async () => {
  await ensurePortfolioTables();
  const projectsRes = await query(
    `
    SELECT
      id,
      title,
      description,
      sort_order AS "sortOrder",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM portfolio_projects
    ORDER BY sort_order ASC, id ASC
    `,
  );
  if (projectsRes.rows.length === 0) return [];

  const imagesRes = await query(
    `
    SELECT
      id,
      project_id AS "projectId",
      image_url AS "imageUrl",
      sort_order AS "sortOrder"
    FROM portfolio_images
    ORDER BY sort_order ASC, id ASC
    `,
  );
  const imagesByProject = new Map();
  for (const row of imagesRes.rows) {
    const pid = Number(row.projectId);
    if (!imagesByProject.has(pid)) imagesByProject.set(pid, []);
    imagesByProject.get(pid).push(row);
  }

  return projectsRes.rows.map((row) =>
    mapProjectRow(row, imagesByProject.get(Number(row.id)) || []),
  );
};

const getProjectById = async (id) => {
  await ensurePortfolioTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const projectRes = await query(
    `
    SELECT
      id,
      title,
      description,
      sort_order AS "sortOrder",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM portfolio_projects
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  if (projectRes.rows.length === 0) return null;

  const imagesRes = await query(
    `
    SELECT
      id,
      project_id AS "projectId",
      image_url AS "imageUrl",
      sort_order AS "sortOrder"
    FROM portfolio_images
    WHERE project_id = $1
    ORDER BY sort_order ASC, id ASC
    `,
    [numericId],
  );

  return mapProjectRow(projectRes.rows[0], imagesRes.rows);
};

const createProject = async ({ title, description, sortOrder }) => {
  await ensurePortfolioTables();
  const safeTitle = String(title || "").trim();
  if (!safeTitle) throw new Error("Укажите заголовок");

  const res = await query(
    `
    INSERT INTO portfolio_projects(title, description, sort_order)
    VALUES ($1, $2, $3)
    RETURNING
      id,
      title,
      description,
      sort_order AS "sortOrder",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [safeTitle, String(description || "").trim(), Number(sortOrder) || 0],
  );
  return mapProjectRow(res.rows[0], []);
};

const updateProject = async (id, { title, description, sortOrder }) => {
  await ensurePortfolioTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const safeTitle = title !== undefined ? String(title || "").trim() : undefined;
  if (safeTitle !== undefined && !safeTitle) throw new Error("Заголовок не может быть пустым");

  const res = await query(
    `
    UPDATE portfolio_projects
    SET
      title = COALESCE($2, title),
      description = COALESCE($3, description),
      sort_order = COALESCE($4, sort_order),
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      title,
      description,
      sort_order AS "sortOrder",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [
      numericId,
      safeTitle ?? null,
      description !== undefined ? String(description || "").trim() : null,
      sortOrder !== undefined ? Number(sortOrder) || 0 : null,
    ],
  );
  if (res.rows.length === 0) return null;
  return getProjectById(numericId);
};

const addImages = async (projectId, imageUrls) => {
  await ensurePortfolioTables();
  const numericId = Number(projectId);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const urls = Array.isArray(imageUrls)
    ? imageUrls.map((u) => String(u || "").trim()).filter(Boolean)
    : [];
  if (urls.length === 0) return getProjectById(numericId);

  await withTransaction(async (client) => {
    const maxRes = await client.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM portfolio_images WHERE project_id = $1`,
      [numericId],
    );
    let nextSort = Number(maxRes.rows[0]?.max_sort) + 1;
    for (const imageUrl of urls) {
      await client.query(
        `
        INSERT INTO portfolio_images(project_id, image_url, sort_order)
        VALUES ($1, $2, $3)
        ON CONFLICT (project_id, image_url) DO UPDATE
        SET sort_order = EXCLUDED.sort_order
        `,
        [numericId, imageUrl, nextSort],
      );
      nextSort += 1;
    }
  });

  return getProjectById(numericId);
};

const getImageById = async (imageId) => {
  await ensurePortfolioTables();
  const numericId = Number(imageId);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(
    `
    SELECT
      id,
      project_id AS "projectId",
      image_url AS "imageUrl",
      sort_order AS "sortOrder"
    FROM portfolio_images
    WHERE id = $1
    LIMIT 1
    `,
    [numericId],
  );
  return res.rows[0] ? mapImageRow(res.rows[0]) : null;
};

const reorderImages = async (projectId, imageIds) => {
  await ensurePortfolioTables();
  const numericId = Number(projectId);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const ids = Array.isArray(imageIds)
    ? imageIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  if (ids.length === 0) throw new Error("Укажите порядок фото");

  const existingRes = await query(
    `SELECT id FROM portfolio_images WHERE project_id = $1 ORDER BY sort_order ASC, id ASC`,
    [numericId],
  );
  const existingIds = existingRes.rows.map((row) => Number(row.id));
  if (existingIds.length === 0) return getProjectById(numericId);

  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length !== existingIds.length) {
    throw new Error("Список фото не совпадает с карточкой");
  }
  const existingSet = new Set(existingIds);
  if (!uniqueIds.every((id) => existingSet.has(id))) {
    throw new Error("Некорректный порядок фото");
  }

  await withTransaction(async (client) => {
    for (let index = 0; index < uniqueIds.length; index += 1) {
      await client.query(
        `UPDATE portfolio_images SET sort_order = $1 WHERE id = $2 AND project_id = $3`,
        [index * 10, uniqueIds[index], numericId],
      );
    }
  });

  return getProjectById(numericId);
};

const deleteImage = async (imageId) => {
  await ensurePortfolioTables();
  const numericId = Number(imageId);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  const res = await query(
    `DELETE FROM portfolio_images WHERE id = $1 RETURNING id, image_url AS "imageUrl"`,
    [numericId],
  );
  return res.rows[0] || null;
};

const deleteProject = async (id) => {
  await ensurePortfolioTables();
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const imagesRes = await query(
    `SELECT image_url AS "imageUrl" FROM portfolio_images WHERE project_id = $1`,
    [numericId],
  );
  const res = await query(`DELETE FROM portfolio_projects WHERE id = $1 RETURNING id`, [numericId]);
  if (res.rows.length === 0) return null;

  return {
    id: numericId,
    imageUrls: imagesRes.rows.map((row) => String(row.imageUrl || "")),
  };
};

module.exports = {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  addImages,
  reorderImages,
  getImageById,
  deleteImage,
  deleteProject,
};
