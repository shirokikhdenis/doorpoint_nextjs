const PROMETAD_URL = "https://toapi.prometad.ru/api/data?mode=stock";
const CACHE_TTL_MS = 10 * 60_000;
const DEFAULT_WAREHOUSE_COL = "Факт_Архангельск";

/** @type {{ data: object; fetchedAt: number } | null} */
let cache = null;

const warehouseLabel = (col) => col.replace(/^Факт_/, "");

const getWarehouses = (columns) => (columns ?? []).filter((c) => c.startsWith("Факт_"));

const findRowByArticle = (data, article) => {
  const key = String(article || "").trim();
  if (!key || !Array.isArray(data)) return null;
  return data.find((row) => String(row["Артикул"] ?? "").trim() === key) ?? null;
};

const buildWarehouseBreakdown = (row, columns) => {
  const warehouses = getWarehouses(columns);
  return warehouses
    .map((col) => ({
      name: warehouseLabel(col),
      col,
      stock: Number(row[col] ?? 0),
    }))
    .sort((a, b) => {
      if (a.stock !== b.stock) return b.stock - a.stock;
      return a.name.localeCompare(b.name, "ru");
    });
};

const getStock = async () => {
  const token = process.env.PROMETAD_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      status: 503,
      message: "PROMETAD_TOKEN не задан на сервере",
      error: "PROMETAD_TOKEN не задан на сервере",
    };
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return {
      ok: true,
      data: {
        ...cache.data,
        cached: true,
        fetchedAt: new Date(cache.fetchedAt).toISOString(),
      },
    };
  }

  try {
    const upstream = await fetch(PROMETAD_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await upstream.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch {
      return {
        ok: false,
        status: 502,
        message: "Некорректный ответ API поставщика",
        error: "Некорректный ответ API поставщика",
      };
    }

    if (!upstream.ok) {
      const message =
        payload.message || payload.error || `Ошибка API (${upstream.status})`;

      if (upstream.status === 429) {
        return {
          ok: false,
          status: 429,
          message: "Превышен лимит запросов (2 в минуту). Подождите и повторите.",
          error: "Превышен лимит запросов (2 в минуту). Подождите и повторите.",
        };
      }

      if (upstream.status === 401 || upstream.status === 403) {
        return {
          ok: false,
          status: upstream.status,
          message: "Неверный или просроченный токен",
          error: "Неверный или просроченный токен",
        };
      }

      return {
        ok: false,
        status: upstream.status,
        message,
        error: message,
      };
    }

    if (payload.error) {
      return {
        ok: false,
        status: 502,
        message: payload.error,
        error: payload.error,
      };
    }

    cache = { data: payload, fetchedAt: Date.now() };
    return {
      ok: true,
      data: {
        ...payload,
        cached: false,
        fetchedAt: new Date(cache.fetchedAt).toISOString(),
      },
    };
  } catch (err) {
    console.error("Prometad proxy error:", err);
    return {
      ok: false,
      status: 502,
      message: "Не удалось связаться с API поставщика",
      error: "Не удалось связаться с API поставщика",
    };
  }
};

const getStockByArticle = async (article) => {
  const stockResult = await getStock();
  if (!stockResult.ok) {
    return stockResult;
  }

  const payload = stockResult.data;
  const row = findRowByArticle(payload.data, article);
  if (!row) {
    return {
      ok: true,
      found: false,
      article: String(article || "").trim(),
      actualAt: payload.generatedAt || payload.fetchedAt || null,
      cached: Boolean(payload.cached),
    };
  }

  const columns = payload.columns || [];
  const warehouses = buildWarehouseBreakdown(row, columns);
  const defaultWarehouseCol = columns.includes(DEFAULT_WAREHOUSE_COL)
    ? DEFAULT_WAREHOUSE_COL
    : warehouses[0]?.col || "";
  const defaultWarehouse = defaultWarehouseCol ? warehouseLabel(defaultWarehouseCol) : null;
  const defaultStock = defaultWarehouseCol ? Number(row[defaultWarehouseCol] ?? 0) : null;

  return {
    ok: true,
    found: true,
    article: String(row["Артикул"] ?? article).trim(),
    total: Number(row["Факт"] ?? 0),
    defaultWarehouse,
    defaultStock,
    warehouses: warehouses.map(({ name, stock }) => ({ name, stock })),
    status: row["Статус"] != null ? String(row["Статус"]) : null,
    actualAt: payload.generatedAt || payload.fetchedAt || null,
    cached: Boolean(payload.cached),
  };
};

module.exports = {
  getStock,
  getStockByArticle,
};
