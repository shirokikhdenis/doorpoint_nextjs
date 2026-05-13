-- Однократно для уже развёрнутой БД (до этого поля не было в схеме).
ALTER TABLE attribute_definitions
  ADD COLUMN IF NOT EXISTS is_visible_on_product BOOLEAN NOT NULL DEFAULT TRUE;
