-- Фильтры производитель / коллекция у баннеров акций
ALTER TABLE promotion_banners ADD COLUMN IF NOT EXISTS filter_manufacturer TEXT;
ALTER TABLE promotion_banners ADD COLUMN IF NOT EXISTS filter_collection TEXT;
