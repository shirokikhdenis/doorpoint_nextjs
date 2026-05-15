const productRepository = require("../repositories/productRepository");
const categoryRepository = require("../repositories/categoryRepository");
const subcategoryRepository = require("../repositories/subcategoryRepository");
const attributeRepository = require("../repositories/attributeRepository");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const requiredColumns = ["sku"];

const hasNonEmpty = (row, key) => {
  if (!Object.prototype.hasOwnProperty.call(row, key)) return false;
  const value = row[key];
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
};
const uploadsDir = path.join(process.cwd(), "public", "uploads", "products");
const localUploadsPrefix = "/uploads/products/";
const storeImagesLocally =
  process.env.STORE_IMAGES_LOCALLY !== undefined
    ? String(process.env.STORE_IMAGES_LOCALLY).toLowerCase() === "true"
    : !process.env.RENDER;

const extractImageUrls = (value) => {
  const text = String(value || "").trim();
  if (!text) return [];

  const urlMatches = text.match(/https?:\/\/[^\s,;]+/gi);
  if (urlMatches && urlMatches.length > 0) {
    return [...new Set(urlMatches.map((url) => url.trim()).filter(Boolean))];
  }

  const fallback = text.split(/\s+/)[0] || "";
  return fallback ? [fallback] : [];
};

const validateCsvRows = (rows) => {
  const errors = [];
  rows.forEach((row, index) => {
    requiredColumns.forEach((column) => {
      if (!row[column]) {
        errors.push(`Row ${index + 1}: missing "${column}"`);
      }
    });
  });
  return errors;
};

const buildLookupMaps = async () => {
  const [categories, subcategories] = await Promise.all([
    categoryRepository.listCategories(),
    subcategoryRepository.listSubcategories()
  ]);

  const categoryByName = new Map(categories.map((item) => [item.name, item]));
  const subcategoryByName = new Map(
    subcategories.map((item) => [`${item.categoryId}:${item.name}`, item])
  );

  return { categoryByName, subcategoryByName };
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();

const isSizeAttribute = (attr) => {
  const code = String(attr?.code || "").trim().toLowerCase();
  if (["size", "razmer"].includes(code)) return true;
  const name = normalizeText(attr?.name);
  return name === "размер" || name.startsWith("размер ");
};

const normalizeSizeValue = (rawValue) => {
  const text = String(rawValue || "").trim();
  if (!text) return "";
  const compact = text.replace(/\s+/g, " ");
  const unified = compact.replace(/[хХ*]/g, "x");
  const normalized = unified.replace(/(\d)\s+(?=\d)/g, "$1x").replace(/\s*x\s*/gi, "x");
  return normalized;
};

const parseNumericValue = (rawValue) => {
  const text = String(rawValue || "").trim();
  if (!text) return Number.NaN;
  // Extract the first numeric token from mixed strings like "80 мм", "1,4mm", "40-100 мм".
  const tokenMatch = text.replace(/\s+/g, "").match(/-?\d+(?:[.,]\d+)?/);
  if (!tokenMatch) {
    return Number.NaN;
  }
  const normalized = tokenMatch[0].replace(",", ".");
  return Number(normalized);
};

const parseCharacteristicNameFromKey = (key) => {
  const raw = String(key || "").trim();
  if (!raw) return "";
  if (raw.startsWith("attr_name:")) return raw.slice("attr_name:".length).trim();

  const normalized = raw.toLowerCase();
  if (normalized.startsWith("characteristics:") || normalized.startsWith("характеристики:")) {
    return raw.slice(raw.indexOf(":") + 1).trim();
  }
  return "";
};

const mapAttributeInput = (attr, rawValue, attributeOptionLookup) => {
  const sourceValue = String(rawValue || "").trim();
  const value = isSizeAttribute(attr) ? normalizeSizeValue(sourceValue) : sourceValue;
  if (!value) return null;

  if (attr.type === "number") {
    const num = parseNumericValue(value);
    if (Number.isNaN(num)) return null;
    return { attributeId: Number(attr.id), valueNumber: num, valueText: null, valueOptionId: null };
  }

  if (attr.type === "option") {
    const normalized = attributeOptionLookup.get(`${attr.code}:${value.toLowerCase()}`) || value;
    return { attributeId: Number(attr.id), valueText: normalized, valueNumber: null, valueOptionId: null };
  }

  if (attr.type === "boolean") {
    const boolValue = ["yes", "да", "true", "1"].includes(value.toLowerCase())
      ? "Да"
      : ["no", "нет", "false", "0"].includes(value.toLowerCase())
        ? "Нет"
        : value;
    return { attributeId: Number(attr.id), valueText: boolValue, valueNumber: null, valueOptionId: null };
  }

  return { attributeId: Number(attr.id), valueText: value, valueNumber: null, valueOptionId: null };
};

const parseVariantAttributesText = (raw, attributeByCode, attributeByName, attributeOptionLookup) => {
  const text = String(raw || "").trim();
  if (!text) return [];
  return text
    .split(";")
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf(":");
      if (separatorIndex <= 0) return null;
      const attrName = part.slice(0, separatorIndex).trim();
      const attrValue = part.slice(separatorIndex + 1).trim();
      if (!attrName || !attrValue) return null;
      const attr =
        attributeByCode.get(attrName.toLowerCase()) ||
        attributeByName.get(normalizeText(attrName)) ||
        null;
      if (!attr) return null;
      return mapAttributeInput(attr, attrValue, attributeOptionLookup);
    })
    .filter(Boolean);
};

const variantValueForSignature = (attribute) => {
  if (attribute.valueNumber !== null && attribute.valueNumber !== undefined) {
    return `num:${attribute.valueNumber}`;
  }
  return `txt:${String(attribute.valueText || "").trim()}`;
};

const buildVariantSku = (baseSku, variantAttributes) => {
  const normalizedBase = String(baseSku || "").trim() || "CSV-VAR";
  if (!Array.isArray(variantAttributes) || variantAttributes.length === 0) {
    return normalizedBase;
  }
  const signature = variantAttributes
    .slice()
    .sort((a, b) => Number(a.attributeId) - Number(b.attributeId))
    .map((attribute) => `${attribute.attributeId}:${variantValueForSignature(attribute)}`)
    .join("|");
  const hash = crypto.createHash("sha1").update(`${normalizedBase}|${signature}`).digest("hex").slice(0, 10);
  return `${normalizedBase}--${hash}`;
};

const parseCategoryExpression = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return {
      categoryName: "",
      subcategoryName: "",
      allCategoryNames: []
    };
  }

  const parts = raw
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  let categoryName = "";
  let subcategoryName = "";
  const allCategoryNames = [];

  for (const part of parts) {
    if (part.includes(">>>")) {
      const [parent, child] = part.split(">>>").map((item) => String(item || "").trim());
      if (parent) {
        allCategoryNames.push(parent);
      }
      if (!categoryName && parent) {
        categoryName = parent;
      }
      if (!subcategoryName && child) {
        subcategoryName = child;
      }
      continue;
    }

    allCategoryNames.push(part);
    if (!categoryName && part) {
      categoryName = part;
    }
  }

  return {
    categoryName,
    subcategoryName,
    allCategoryNames: [...new Set(allCategoryNames)]
  };
};

const ensureUploadsDir = async () => {
  await fs.mkdir(uploadsDir, { recursive: true });
};

const getExtFromUrl = (urlValue, contentType = "") => {
  const clean = String(urlValue || "").split("?")[0].split("#")[0];
  const ext = path.extname(clean).toLowerCase();
  if (ext && ext.length <= 6) {
    return ext;
  }
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/webp")) return ".webp";
  if (contentType.includes("image/gif")) return ".gif";
  return ".jpg";
};

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());

const downloadImageToLocal = async (urlValue, urlCache) => {
  const rawUrl = String(urlValue || "").trim();
  if (!rawUrl) return "";
  if (!isHttpUrl(rawUrl)) return rawUrl;
  if (!storeImagesLocally) return rawUrl;
  if (urlCache.has(rawUrl)) return urlCache.get(rawUrl);

  const response = await fetch(rawUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`image download failed (${response.status})`);
  }
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error(`invalid image content-type: ${contentType || "unknown"}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const hash = crypto.createHash("sha1").update(rawUrl).digest("hex");
  const ext = getExtFromUrl(rawUrl, contentType);
  const fileName = `${hash}${ext}`;
  const fullPath = path.join(uploadsDir, fileName);
  await fs.writeFile(fullPath, buffer);
  const localUrl = `${localUploadsPrefix}${fileName}`;
  urlCache.set(rawUrl, localUrl);
  return localUrl;
};

const resolveImagesToLocal = async (imageUrls, rowIndex, importErrors, urlCache) => {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    return [];
  }
  const resolved = [];
  for (const sourceUrl of imageUrls) {
    try {
      const localOrOriginal = await downloadImageToLocal(sourceUrl, urlCache);
      if (localOrOriginal) resolved.push(localOrOriginal);
    } catch (error) {
      importErrors.push(`Row ${rowIndex + 1}: ${error.message} for ${sourceUrl}`);
      resolved.push(sourceUrl);
    }
  }
  return resolved;
};

const importRows = async (rows) => {
  const errors = validateCsvRows(rows);
  if (errors.length > 0) {
    return { ok: false, imported: 0, errors };
  }

  const { categoryByName, subcategoryByName } = await buildLookupMaps();
  const attributes = await productRepository.listProductsTable({ page: 1, limit: 1 }).then((data) => data.attributes || []);
  const attributeByCode = new Map(attributes.map((item) => [item.code, item]));
  const attributeByName = new Map(attributes.map((item) => [normalizeText(item.name), item]));
  const attributeOptionLookup = new Map();
  attributes.forEach((attr) => {
    (attr.options || []).forEach((optionValue) => {
      attributeOptionLookup.set(`${attr.code}:${String(optionValue).toLowerCase()}`, optionValue);
    });
  });
  const importErrors = [];
  let imported = 0;
  const imageUrlCache = new Map();
  const imagesBySku = new Map();
  await ensureUploadsDir();

  const ensureAttributeByName = async (name) => {
    const normalizedName = String(name || "").trim();
    if (!normalizedName) return null;
    const normalizedLookup = normalizeText(normalizedName);
    const existingByName = attributeByName.get(normalizedLookup);
    if (existingByName) return existingByName;

    const ensured = await attributeRepository.findOrCreateTextAttributeByName(normalizedName);
    if (!ensured) return null;
    attributeByName.set(normalizedLookup, ensured);
    attributeByCode.set(ensured.code, ensured);
    return ensured;
  };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const sku = String(row.sku || "").trim();
    if (!sku) {
      importErrors.push(`Row ${i + 1}: missing "sku"`);
      continue;
    }

    let category = null;
    let subcategory = null;
    let categoryInfo = null;

    if (hasNonEmpty(row, "category")) {
      categoryInfo = parseCategoryExpression(row.category);
      category = categoryByName.get(categoryInfo.categoryName);
      if (!category) {
        importErrors.push(`Row ${i + 1}: unknown category "${row.category}"`);
        continue;
      }
      const rawSubcategory = String(row.subcategory || "").trim() || categoryInfo.subcategoryName;
      subcategory = rawSubcategory
        ? subcategoryByName.get(`${category.id}:${rawSubcategory}`)
        : null;
      if (rawSubcategory && !subcategory) {
        importErrors.push(`Row ${i + 1}: unknown subcategory "${row.subcategory}"`);
        continue;
      }
      if (categoryInfo.allCategoryNames.length > 1) {
        importErrors.push(
          `Row ${i + 1}: multiple categories detected (${categoryInfo.allCategoryNames.join(
            ", "
          )}), saved to primary category "${categoryInfo.categoryName}" only`
        );
      }
    }

    const mappedAttributes = [];
    for (const [key, value] of Object.entries(row)) {
      if (!key.startsWith("attr:") || !String(value || "").trim()) continue;
      const code = key.replace("attr:", "");
      const attr = attributeByCode.get(code);
      if (!attr) continue;
      const mapped = mapAttributeInput(attr, value, attributeOptionLookup);
      if (!mapped && attr.type === "number") {
        importErrors.push(
          `Row ${i + 1}: invalid numeric value "${String(value)}" for attribute "${attr.name}"`
        );
        continue;
      }
      if (mapped) mappedAttributes.push(mapped);
    }
    const dynamicCharacteristicAttributes = [];
    for (const [key, value] of Object.entries(row)) {
      if (!String(value || "").trim()) continue;
      const characteristicName = parseCharacteristicNameFromKey(key);
      if (!characteristicName) continue;
      const attr = await ensureAttributeByName(characteristicName);
      if (!attr) continue;
      const mapped = mapAttributeInput(attr, value, attributeOptionLookup);
      if (mapped) dynamicCharacteristicAttributes.push(mapped);
    }
    const allMappedAttributes = [...mappedAttributes];
    dynamicCharacteristicAttributes.forEach((attribute) => {
      const existingIndex = allMappedAttributes.findIndex(
        (item) => Number(item.attributeId) === Number(attribute.attributeId)
      );
      if (existingIndex >= 0) allMappedAttributes[existingIndex] = attribute;
      else allMappedAttributes.push(attribute);
    });
    const mappedVariantAttributes = Object.entries(row)
      .filter(([key, value]) => key.startsWith("variant_attr:") && String(value || "").trim())
      .map(([key, value]) => {
        const code = key.replace("variant_attr:", "");
        const attr = attributeByCode.get(code);
        if (!attr) return null;
        return mapAttributeInput(attr, value, attributeOptionLookup);
      })
      .filter(Boolean);
    const mappedVariantAttributesFromText = hasNonEmpty(row, "variantAttributes")
      ? parseVariantAttributesText(
          row.variantAttributes,
          attributeByCode,
          attributeByName,
          attributeOptionLookup
        )
      : [];
    const finalVariantAttributes = [
      ...mappedVariantAttributes,
      ...mappedVariantAttributesFromText
    ];
    const generatedVariantSku = buildVariantSku(sku, finalVariantAttributes);

    const imageUrls = extractImageUrls(row.imageUrl);
    const presentImagesInRow = imageUrls.length > 0;
    const resolvedImages = presentImagesInRow
      ? await resolveImagesToLocal(imageUrls, i, importErrors, imageUrlCache)
      : [];
    const previousSkuImages = imagesBySku.get(sku) || [];
    const mergedSkuImages = [...new Set([
      ...previousSkuImages,
      ...resolvedImages.map((item) => String(item || "").trim()).filter(Boolean),
    ])];
    if (mergedSkuImages.length > 0) {
      imagesBySku.set(sku, mergedSkuImages);
    }
    const primaryImageUrl = mergedSkuImages[0] || null;
    const resolvedVariantImage =
      hasNonEmpty(row, "variantImageUrl") && row.variantImageUrl
        ? await resolveImagesToLocal([row.variantImageUrl], i, importErrors, imageUrlCache).then(
            (items) => items[0] || row.variantImageUrl
          )
        : null;

    const modelKeyValue =
      String(row.model_key || row.modelKey || "").trim() || null;

    const present = {
      name: hasNonEmpty(row, "name"),
      category: hasNonEmpty(row, "category"),
      subcategory: hasNonEmpty(row, "subcategory"),
      price: hasNonEmpty(row, "price"),
      imageUrl: hasNonEmpty(row, "imageUrl"),
      images: mergedSkuImages.length > 0,
      variantPrice: hasNonEmpty(row, "variantPrice"),
      variantImageUrl: hasNonEmpty(row, "variantImageUrl"),
      variantSku: hasNonEmpty(row, "variantSku"),
      variantAttributes: hasNonEmpty(row, "variantAttributes"),
      modelKey: modelKeyValue !== null
    };

    // Только явные данные варианта — иначе импорт характеристик товара (SKU + Characteristics)
    // не должен трогать product_variants.
    const applyVariantPatch =
      finalVariantAttributes.length > 0 ||
      present.variantPrice ||
      present.variantImageUrl ||
      present.variantSku;

    let rowPrice;
    if (present.price) {
      rowPrice = Number(row.price);
      if (Number.isNaN(rowPrice)) {
        importErrors.push(`Row ${i + 1}: invalid price`);
        continue;
      }
    }

    let variantPricePayload;
    if (present.variantPrice) {
      variantPricePayload = Number(row.variantPrice);
      if (Number.isNaN(variantPricePayload)) {
        importErrors.push(`Row ${i + 1}: invalid variant price`);
        continue;
      }
    }

    try {
      await productRepository.upsertProductBySku({
        sku,
        present,
        name: row.name,
        categoryId: category ? category.id : undefined,
        subcategoryId: subcategory ? subcategory.id : null,
        modelKey: modelKeyValue,
        price: rowPrice,
        imageUrl: primaryImageUrl,
        images: mergedSkuImages.length > 0 ? mergedSkuImages : undefined,
        isActive: true,
        attributes: allMappedAttributes,
        variantSku: generatedVariantSku,
        variantPrice: variantPricePayload,
        variantImageUrl: resolvedVariantImage,
        variantAttributes: finalVariantAttributes,
        applyVariantPatch
      });
    } catch (error) {
      if (error && error.message === "category is required for new product") {
        importErrors.push(`Row ${i + 1}: для нового товара укажите категорию в CSV`);
        continue;
      }
      throw error;
    }
    imported += 1;
  }

  return { ok: importErrors.length === 0, imported, errors: importErrors };
};

module.exports = {
  requiredColumns,
  validateCsvRows,
  importRows
};
