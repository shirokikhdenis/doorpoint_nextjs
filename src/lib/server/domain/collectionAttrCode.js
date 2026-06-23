const { query } = require("../db/postgres");

let collectionAttrCodeCache = null;

const resolveCollectionAttrCode = async () => {
  if (collectionAttrCodeCache) return collectionAttrCodeCache;
  const res = await query(
    `
    SELECT code
    FROM attribute_definitions
    WHERE code = 'collection' OR name ILIKE '%коллек%'
    ORDER BY CASE WHEN code = 'collection' THEN 0 ELSE 1 END, sort_order ASC, id ASC
    LIMIT 1
    `,
  );
  collectionAttrCodeCache = res.rows[0]?.code ? String(res.rows[0].code) : "collection";
  return collectionAttrCodeCache;
};

module.exports = {
  resolveCollectionAttrCode,
};
