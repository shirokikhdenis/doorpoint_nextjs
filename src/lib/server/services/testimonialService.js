const testimonialRepository = require("../repositories/testimonialRepository");

const normalizeRating = (value) => {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
    return { ok: false, message: "Рейтинг должен быть от 1 до 5" };
  }
  return { ok: true, value: numeric };
};

const validatePayload = (payload, { partial = false } = {}) => {
  const authorName = String(payload.authorName ?? "").trim();
  const body = String(payload.body ?? "").trim();

  if (!partial || payload.authorName !== undefined) {
    if (authorName.length < 2) {
      return { ok: false, message: "Имя автора должно быть не короче 2 символов" };
    }
  }

  if (!partial || payload.body !== undefined) {
    if (body.length < 10) {
      return { ok: false, message: "Текст отзыва должен быть не короче 10 символов" };
    }
  }

  let rating = null;
  if (payload.rating !== undefined) {
    const ratingResult = normalizeRating(payload.rating);
    if (!ratingResult.ok) return ratingResult;
    rating = ratingResult.value;
  }

  return {
    ok: true,
    value: {
      authorName,
      body,
      rating,
      sortOrder: Number(payload.sortOrder) || 0,
      isActive: payload.isActive !== false,
    },
  };
};

const listPublicTestimonials = async (limit = 6) => testimonialRepository.listActive(limit);

const listAdminTestimonials = async () => testimonialRepository.listAll();

const createTestimonial = async (payload) => {
  const validated = validatePayload(payload);
  if (!validated.ok) return validated;
  const item = await testimonialRepository.create(validated.value);
  return { ok: true, item };
};

const updateTestimonial = async (id, payload) => {
  const existing = await testimonialRepository.getById(id);
  if (!existing) return { ok: false, message: "Отзыв не найден", status: 404 };

  const merged = {
    authorName: payload.authorName ?? existing.authorName,
    body: payload.body ?? existing.body,
    rating: payload.rating !== undefined ? payload.rating : existing.rating,
    sortOrder: payload.sortOrder !== undefined ? payload.sortOrder : existing.sortOrder,
    isActive: payload.isActive !== undefined ? payload.isActive : existing.isActive,
  };

  const validated = validatePayload(merged);
  if (!validated.ok) return validated;

  const item = await testimonialRepository.update(id, validated.value);
  if (!item) return { ok: false, message: "Отзыв не найден", status: 404 };
  return { ok: true, item };
};

const deleteTestimonial = async (id) => {
  const deleted = await testimonialRepository.remove(id);
  if (!deleted) return { ok: false, message: "Отзыв не найден", status: 404 };
  return { ok: true };
};

module.exports = {
  listPublicTestimonials,
  listAdminTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  validatePayload,
};
