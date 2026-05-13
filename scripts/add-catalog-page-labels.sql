-- Ярлыки витрин: быстрые фильтры по атрибутам (подвитрины).
-- Выполнить на существующей БД, если initSchema уже применялся без этой таблицы.

CREATE TABLE IF NOT EXISTS catalog_page_labels (
  id BIGSERIAL PRIMARY KEY,
  catalog_page_id BIGINT NOT NULL REFERENCES catalog_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  filters JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_catalog_page_labels_catalog_page_id ON catalog_page_labels(catalog_page_id);
