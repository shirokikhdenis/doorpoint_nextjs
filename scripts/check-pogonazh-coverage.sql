-- Покрытие погонажом межкомнатных дверей (одна карточка на модель).
-- Связь: пересечение токенов attrs->>'pogonazh_id' с товарами категории «Погонаж».
-- Коробка: подстрока «коробк» в name (без учёта регистра).
--
-- Запуск: node scripts/check-pogonazh-coverage.js

-- ---------------------------------------------------------------------------
-- 1. Двери С pogonazh_id: у двери id — N коробок, M наличников
-- ---------------------------------------------------------------------------
WITH interior_doors_raw AS (
  SELECT
    p.id,
    p.sku,
    p.name,
    p.model_key,
    NULLIF(TRIM(p.attrs->>'pogonazh_id'), '') AS pogonazh_id_raw
  FROM products p
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories parent ON parent.id = c.parent_id
  WHERE p.is_active = TRUE
    AND COALESCE(parent.slug, c.slug) = 'interior-doors'
),
-- Одна представительная карточка на модель (model_key + name; без model_key — по id)
interior_doors AS (
  SELECT DISTINCT ON (
    COALESCE(NULLIF(TRIM(model_key), ''), '__id_' || id::text),
    name
  )
    id,
    sku,
    name,
    model_key,
    pogonazh_id_raw
  FROM interior_doors_raw
  ORDER BY
    COALESCE(NULLIF(TRIM(model_key), ''), '__id_' || id::text),
    name,
    id ASC
),
doors_with_pogonazh AS (
  SELECT *
  FROM interior_doors
  WHERE pogonazh_id_raw IS NOT NULL
),
door_tokens AS (
  SELECT
    d.id AS door_id,
    token.value AS pogonazh_token
  FROM doors_with_pogonazh d
  CROSS JOIN LATERAL regexp_split_to_table(d.pogonazh_id_raw, E'[\\s,;]+') AS token(value)
  WHERE NULLIF(TRIM(token.value), '') IS NOT NULL
),
pogonazh_products AS (
  SELECT
    p.id,
    p.name,
    token.value AS pogonazh_token
  FROM products p
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories parent ON parent.id = c.parent_id
  CROSS JOIN LATERAL regexp_split_to_table(
    COALESCE(NULLIF(TRIM(p.attrs->>'pogonazh_id'), ''), ''),
    E'[\\s,;]+'
  ) AS token(value)
  WHERE p.is_active = TRUE
    AND NULLIF(TRIM(token.value), '') IS NOT NULL
    AND (
      c.name ILIKE '%погонаж%'
      OR COALESCE(parent.name, c.name) ILIKE '%погонаж%'
      OR COALESCE(parent.slug, c.slug) ILIKE '%pogonazh%'
    )
),
door_accessories AS (
  SELECT DISTINCT
    d.id AS door_id,
    d.sku AS door_sku,
    d.name AS door_name,
    d.model_key,
    pg.id AS accessory_id,
    pg.name AS accessory_name
  FROM doors_with_pogonazh d
  JOIN door_tokens dt ON dt.door_id = d.id
  JOIN pogonazh_products pg ON pg.pogonazh_token = dt.pogonazh_token
)
SELECT
  d.id AS door_id,
  d.sku AS door_sku,
  d.name AS door_name,
  d.model_key,
  d.pogonazh_id_raw AS pogonazh_id,
  COUNT(da.accessory_id) FILTER (WHERE da.accessory_name ILIKE '%коробк%')::int AS korobka_count,
  COUNT(da.accessory_id) FILTER (WHERE da.accessory_name ILIKE '%наличник%')::int AS nalichnik_count,
  COALESCE(
    array_agg(DISTINCT da.accessory_name ORDER BY da.accessory_name)
      FILTER (WHERE da.accessory_name ILIKE '%коробк%'),
    '{}'::text[]
  ) AS korobka_names,
  COALESCE(
    array_agg(DISTINCT da.accessory_name ORDER BY da.accessory_name)
      FILTER (WHERE da.accessory_name ILIKE '%наличник%'),
    '{}'::text[]
  ) AS nalichnik_names
FROM doors_with_pogonazh d
LEFT JOIN door_accessories da ON da.door_id = d.id
GROUP BY d.id, d.sku, d.name, d.model_key, d.pogonazh_id_raw
ORDER BY d.name, d.id;

-- ---------------------------------------------------------------------------
-- 2. Двери БЕЗ pogonazh_id (отдельная группа)
-- ---------------------------------------------------------------------------
WITH interior_doors_raw AS (
  SELECT
    p.id,
    p.sku,
    p.name,
    p.model_key,
    NULLIF(TRIM(p.attrs->>'pogonazh_id'), '') AS pogonazh_id_raw
  FROM products p
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories parent ON parent.id = c.parent_id
  WHERE p.is_active = TRUE
    AND COALESCE(parent.slug, c.slug) = 'interior-doors'
),
interior_doors AS (
  SELECT DISTINCT ON (
    COALESCE(NULLIF(TRIM(model_key), ''), '__id_' || id::text),
    name
  )
    id,
    sku,
    name,
    model_key,
    pogonazh_id_raw
  FROM interior_doors_raw
  ORDER BY
    COALESCE(NULLIF(TRIM(model_key), ''), '__id_' || id::text),
    name,
    id ASC
)
SELECT
  id AS door_id,
  sku AS door_sku,
  name AS door_name,
  model_key
FROM interior_doors
WHERE pogonazh_id_raw IS NULL
ORDER BY name, id;

-- ---------------------------------------------------------------------------
-- 3. Сводка
-- ---------------------------------------------------------------------------
WITH interior_doors_raw AS (
  SELECT
    p.id,
    p.name,
    p.model_key,
    NULLIF(TRIM(p.attrs->>'pogonazh_id'), '') AS pogonazh_id_raw
  FROM products p
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories parent ON parent.id = c.parent_id
  WHERE p.is_active = TRUE
    AND COALESCE(parent.slug, c.slug) = 'interior-doors'
),
interior_doors AS (
  SELECT DISTINCT ON (
    COALESCE(NULLIF(TRIM(model_key), ''), '__id_' || id::text),
    name
  )
    id,
    name,
    model_key,
    pogonazh_id_raw
  FROM interior_doors_raw
  ORDER BY
    COALESCE(NULLIF(TRIM(model_key), ''), '__id_' || id::text),
    name,
    id ASC
),
doors_with_pogonazh AS (
  SELECT * FROM interior_doors WHERE pogonazh_id_raw IS NOT NULL
),
door_tokens AS (
  SELECT d.id AS door_id, token.value AS pogonazh_token
  FROM doors_with_pogonazh d
  CROSS JOIN LATERAL regexp_split_to_table(d.pogonazh_id_raw, E'[\\s,;]+') AS token(value)
  WHERE NULLIF(TRIM(token.value), '') IS NOT NULL
),
pogonazh_products AS (
  SELECT p.id, p.name, token.value AS pogonazh_token
  FROM products p
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories parent ON parent.id = c.parent_id
  CROSS JOIN LATERAL regexp_split_to_table(
    COALESCE(NULLIF(TRIM(p.attrs->>'pogonazh_id'), ''), ''),
    E'[\\s,;]+'
  ) AS token(value)
  WHERE p.is_active = TRUE
    AND NULLIF(TRIM(token.value), '') IS NOT NULL
    AND (
      c.name ILIKE '%погонаж%'
      OR COALESCE(parent.name, c.name) ILIKE '%погонаж%'
      OR COALESCE(parent.slug, c.slug) ILIKE '%pogonazh%'
    )
),
door_counts AS (
  SELECT
    d.id,
    COUNT(DISTINCT pg.id) FILTER (WHERE pg.name ILIKE '%коробк%')::int AS korobka_count,
    COUNT(DISTINCT pg.id) FILTER (WHERE pg.name ILIKE '%наличник%')::int AS nalichnik_count
  FROM doors_with_pogonazh d
  LEFT JOIN door_tokens dt ON dt.door_id = d.id
  LEFT JOIN pogonazh_products pg ON pg.pogonazh_token = dt.pogonazh_token
  GROUP BY d.id
)
SELECT
  (SELECT COUNT(*)::int FROM interior_doors) AS models_total,
  (SELECT COUNT(*)::int FROM doors_with_pogonazh) AS models_with_pogonazh_id,
  (SELECT COUNT(*)::int FROM interior_doors WHERE pogonazh_id_raw IS NULL) AS models_without_pogonazh_id,
  (SELECT COUNT(*)::int FROM door_counts WHERE korobka_count > 0) AS models_with_korobka,
  (SELECT COUNT(*)::int FROM door_counts WHERE nalichnik_count > 0) AS models_with_nalichnik,
  (SELECT COUNT(*)::int FROM door_counts WHERE korobka_count > 0 AND nalichnik_count > 0) AS models_with_both,
  (SELECT COUNT(*)::int FROM door_counts WHERE korobka_count = 0 OR nalichnik_count = 0) AS models_missing_korobka_or_nalichnik;
