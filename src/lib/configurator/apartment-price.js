const { MARKUP_MAX, MARKUP_MIN, NO_PANEL_ID } = require("./apartment-constants");
const { getModel, isCylindricalLock, isMetalExteriorModel } = require("./apartment-door-config");
const CELLS = require("./apartment-excel-cells.json");

const OVERALL = 1.32;
const TAX = 1.055;
const DOORSILL_ABS = 500;
const UNDERCOAT_ABS = 1000;
const E_LOCK_ABS = 0;

const n = (key) => Number(CELLS[key] ?? 0) || 0;

const isStandardSize = (width, height) => Number(width) <= 960 && Number(height) <= 2050;

const modelName = (catalog, side, id) => getModel(catalog, side, id)?.name || "";

const byId = (items, id) => (items || []).find((item) => item.id === id) || null;

const kitPrice = (item) => Number(item?.base_price ?? item?.basePrice ?? 0) || 0;

const kitPair = (left, right, fallback) => (left || right ? kitPrice(left) + kitPrice(right) : kitPrice(fallback));

const isLeverLock = (lock) =>
  String(lock?.properties?.["Механизм"] || "") === "Сувальдный" ||
  Boolean(
    (lock?.nomenclature_properties || []).some(
      (prop) => prop.property_name === "Механизм" && prop.property_value === "Сувальдный",
    ),
  );

const isMetalDoor = (config, catalog) => isMetalExteriorModel(getModel(catalog, "exterior", config.exterior?.panelModel));

const furnitureKitTotal = (furniture, options) => {
  if (!furniture) return 0;
  const kit = furniture.overlays?.kit || furniture;
  let total = 0;
  if (options.isPrimaryLever) {
    total += kitPair(kit.primary_exterior_lever_lock_cover, kit.primary_interior_lever_lock_cover, kit.lever_lock);
  } else {
    total += kitPair(
      kit.primary_exterior_cylindrical_lock_cover,
      kit.primary_interior_cylindrical_lock_cover,
      kit.cylindrical_lock,
    );
  }
  if (options.hasSecondaryLock) {
    if (options.isSecondaryLever) {
      total += kitPair(
        kit.secondary_exterior_lever_lock_cover,
        kit.secondary_interior_lever_lock_cover,
        kit.secondary_lever_lock,
      );
    } else {
      total += kitPair(
        kit.secondary_exterior_cylindrical_lock_cover,
        kit.secondary_interior_cylindrical_lock_cover,
        kit.secondary_cylindrical_lock,
      );
    }
  }
  const rod = kitPrice(kit.cylinder_rod);
  if (rod) total += rod * (options.hasSecondaryLock ? 2 : 1);
  if (options.hasPeephole) total += kitPrice(kit.peephole);
  if (options.hasNightLatchTurner) {
    total += kit.night_latch || kit.thumbturn ? kitPrice(kit.night_latch) + kitPrice(kit.thumbturn) : kitPrice(kit.night_latch_turner);
  }
  total += kitPrice(kit.handle);
  return total;
};

const paintQty = (paintId, standard, metal) => {
  const spec = {
    192: { std: 2, nonStd: 2.2, subtract: 0.6 },
    193: { std: 2.2, nonStd: 2.42, subtract: 0.6 },
    194: { std: 1.9, nonStd: 2.1, subtract: 0.5 },
    195: { std: 2, nonStd: 2.2, subtract: 0.5 },
    196: { std: 1.8, nonStd: 2, subtract: 0.5 },
    197: { std: 1.8, nonStd: 2, subtract: 0.4 },
    198: { std: 1.8, nonStd: 2, subtract: 0.4 },
    199: { std: 1.8, nonStd: 2, subtract: 0.4 },
    200: { std: 1.8, nonStd: 2, subtract: 0.4 },
    201: { std: 1.8, nonStd: 2, subtract: 0.4 },
    202: { std: 1.8, nonStd: 2, subtract: 0.4 },
    205: { std: 2, nonStd: 2.5, subtract: 0 },
    385: { std: 2, nonStd: 2.5, subtract: 0 },
    208: { std: 2, nonStd: 2.5, subtract: 0 },
    209: { std: 2, nonStd: 2.5, subtract: 0 },
    210: { std: 2, nonStd: 2.5, subtract: 0 },
    211: { std: 2, nonStd: 2.5, subtract: 0 },
    212: { std: 2, nonStd: 2.5, subtract: 0 },
  }[paintId];
  if (!spec) return 0;
  return (standard ? spec.std : spec.nonStd) - (metal ? 0 : spec.subtract);
};

const exteriorMdfSurcharge = (name) => {
  if (["ВС-19", "ВС-38", "ВС-42", "ВС-6", "ВС-22"].includes(name)) return 800;
  if (["ВС-17", "ВС-13", "ВС-24", "ВС-45", "ВС-49", "ВС-50", "ВС-43", "ВС-52", "ВС-34"].includes(name)) return 1000;
  if (["ВС-44", "ВС-41", "ВС-47", "ВС-30"].includes(name)) return 600;
  return 0;
};

const exteriorPanelBase = (config, catalog, includeBoard) => {
  const std = isStandardSize(config.doorWidth, config.doorHeight);
  const name = modelName(catalog, "exterior", config.exterior.panelModel);
  let total = 0;
  if (includeBoard) total += (std ? 1.932 : 2.89) * n("E64");
  total += 0.15 * n("G65") + 0.005 * n("E66") + 0.05 * n("E67") + 0.018 * n("D68") + n("B69") + n("B70") + n("B71");
  total += exteriorMdfSurcharge(name);
  const film = byId(catalog.films, config.exterior.primaryTexture)?.basePrice || 0;
  total += (std ? 3.5 : 4.55) * film;
  return total;
};

const comfortExteriorPanel = (config, catalog) => {
  const name = modelName(catalog, "exterior", config.exterior.panelModel);
  const std = isStandardSize(config.doorWidth, config.doorHeight);
  const secondary = byId(catalog.films, config.exterior.secondaryTexture)?.basePrice || 0;
  const primary = byId(catalog.films, config.exterior.primaryTexture)?.basePrice || 0;
  const special = ["ВС-6", "ВС-13", "ВС-17", "ВС-19", "ВС-22", "ВС-24", "ВС-38", "ВС-44", "ВС-45", "Kombi", "Forta", "Verso", "Stark"];
  if (!special.includes(name) && name) return exteriorPanelBase(config, catalog, true);

  let total = 0;
  switch (name) {
    case "ВС-6":
      total += exteriorPanelBase(config, catalog, true);
      total += 0.645 * n("E63") + (std ? 0.0612 : 0.0669) * n("E80") + (std ? 4.14 : 4.52) * n("C88");
      total += (std ? 3.5 : 4.9) * secondary + 0.1 * n("D79") + 2.1;
      break;
    case "ВС-13":
      total += exteriorPanelBase(config, catalog, true);
      total += 0.966 * n("E63") + n("B71") + 0.1 * n("D79") + (std ? 3.5 : 4.9) * secondary;
      break;
    case "ВС-17":
      total += exteriorPanelBase(config, catalog, true);
      total += (std ? 0.153 : 0.16725) * n("E80") + 0.3 * n("D79") + (std ? 12.39 : 13.53) * n("C88");
      break;
    case "ВС-19":
      total += exteriorPanelBase(config, catalog, true);
      total += (std ? 0.07344 : 0.08028) * n("E80") + 0.1 * n("D79") + (std ? 4.152 : 4.532) * n("C88");
      break;
    case "ВС-22":
      total += exteriorPanelBase(config, catalog, true);
      total += (std ? 1.932 : 2.89) * n("E78") + (std ? 0.29 : 0) * n("E63") + (std ? 3.5 : 4.9) * primary;
      total += 0.05 * n("D79") + 13.1 + 2.5 + 25;
      break;
    case "ВС-24":
      total += exteriorPanelBase(config, catalog, false);
      total += (std ? 1.932 : 2.89) * n("E78") + (std ? 0.29 : 0) * n("E63") + (std ? 3.5 : 4.9) * primary + 25;
      break;
    case "ВС-38":
      total += exteriorPanelBase(config, catalog, true);
      total += (std ? 0.0612 : 0.0669) * n("E80") + 0.1 * n("D79") + (std ? 4.14 : 4.52) * n("C88");
      break;
    case "ВС-44":
      total += exteriorPanelBase(config, catalog, true);
      total += (std ? 0.102 : 0.1115) * n("E80") + 0.1 * n("D79") + (std ? 4.18 : 4.56) * n("C88");
      break;
    case "ВС-45":
      total += exteriorPanelBase(config, catalog, true);
      total += 0.64 * n("E63") + 25 + (std ? 3.5 : 4.9) * primary;
      break;
    default:
      total += 0;
  }
  return total;
};

const absolutExteriorPanel = (config, catalog) => {
  const name = modelName(catalog, "exterior", config.exterior.panelModel);
  const std = isStandardSize(config.doorWidth, config.doorHeight);
  const secondary = byId(catalog.films, config.exterior.secondaryTexture)?.basePrice || 0;
  const special = ["ВС-6", "ВС-13", "ВС-17", "ВС-19", "ВС-22", "ВС-24", "ВС-38", "ВС-44", "ВС-45", "Kombi", "Forta", "Verso", "Stark"];
  if (!special.includes(name) && name) return exteriorPanelBase(config, catalog, true);

  let total = 0;
  switch (name) {
    case "ВС-6":
      total += exteriorPanelBase(config, catalog, true);
      total += 0.645 * n("E63") + (std ? 0.0612 : 0.0669) * n("E80") + (std ? 4.14 : 4.52) * n("C88");
      total += (std ? 3.5 : 4.9) * secondary + 0.1 * n("D79") + 2.1;
      break;
    case "ВС-13":
      total += exteriorPanelBase(config, catalog, true);
      total += 0.966 * n("E63") + 25 + 0.1 * n("D79");
      break;
    case "ВС-17":
      total += exteriorPanelBase(config, catalog, true);
      total += (std ? 0.153 : 0.16725) * n("E80") + 0.3 * n("D79") + (std ? 12.39 : 13.53) * n("C89");
      break;
    case "ВС-19":
      total += exteriorPanelBase(config, catalog, true);
      total += (std ? 0.07344 : 0.08028) * n("E80") + 0.1 * n("D79") + (std ? 4.152 : 4.532) * n("C88");
      break;
    case "ВС-22":
      total += exteriorPanelBase(config, catalog, false);
      total += (std ? 1.932 : 2.89) * n("E64") + (std ? 0.29 : 0) * n("E66") + (std ? 3.5 : 4.9) * secondary;
      total += 0.05 * n("D79") + 13.1 + 2.5 + 25;
      break;
    case "ВС-24":
      total += exteriorPanelBase(config, catalog, false);
      total += 0.64 * n("E63") + 25 + (std ? 3.5 : 4.9) * secondary + (std ? 1.932 : 2.89) * n("E64");
      break;
    case "ВС-38":
      total += exteriorPanelBase(config, catalog, true);
      total += (std ? 0.0612 : 0.0669) * n("E80") + 0.1 * n("D79") + (std ? 4.14 : 4.52) * n("C88");
      break;
    case "ВС-44":
      total += exteriorPanelBase(config, catalog, true);
      total += (std ? 0.102 : 0.1115) * n("E80") + 0.3 * n("D79") + (std ? 4.18 : 4.56) * n("C88");
      break;
    case "ВС-45":
      total += exteriorPanelBase(config, catalog, true) + 25;
      total += (std ? 0.64 : 0) * n("E66") + (std ? 3.5 : 4.55) * secondary;
      break;
    default:
      total += 0;
  }
  return total;
};

const interiorPanel = (config, catalog) => {
  if (!config.interior?.panelModel || config.interior.panelModel === NO_PANEL_ID) return 0;
  const compact = !(config.doorHeight > 2052);
  const name = modelName(catalog, "interior", config.interior.panelModel);
  const board = (() => {
    if (["ФЗ-1", "ФЗ-6", "ФЗ-7", "ФЗ-8"].includes(name)) return n("E78");
    if (name === "Ф-62") return n("B159");
    if (!name || name === "Без панели") return 0;
    return n("E64");
  })();
  let total = (compact ? 1.932 : 2.89) * board;
  total += 0.15 * n("G65") + 0.005 * n("E66") + 0.05 * n("E67") + 0.018 * n("D68") + 20 + n("B70") + n("B71");
  if (["Ф-3", "Ф-11", "Ф-20", "Ф-31", "Ф-37", "Ф-88", "Ф-95", "Ф-99", "Ф-26", "Ф-42", "Ф-24", "Ф-79"].includes(name)) {
    total += 700;
  } else if (["Ф-36", "Ф-48", "Ф-64", "Ф-21", "Ф-22", "Ф-23", "Ф-30", "ГЛ-1", "Ф-62"].includes(name)) {
    total += 500;
  } else if (["Ф-76", "ФЗ-1", "ФЗ-6", "ФЗ-7", "ФЗ-8"].includes(name)) {
    total += 900;
  }
  const film = byId(catalog.films, config.interior.primaryTexture)?.basePrice || 0;
  total += (compact ? 3.5 : 4.55) * film;
  const extra = name === "Ф-24" || name === "Ф-30" ? 2 : name === "Ф-32" ? 1.5 : name === "Ф-79" ? 1 : 0;
  total += extra * (compact ? 315 : 366);
  const glue =
    name === "Ф-24" || name === "Ф-30"
      ? 0.1
      : name === "Ф-32"
        ? 0.15
        : name === "Ф-79"
          ? 0.05
          : ["ФЗ-1", "ФЗ-6", "ФЗ-7", "ФЗ-8"].includes(name)
            ? 0.4
            : 0;
  total += glue * n("D79");
  if (name === "Ф-30") total += (compact ? 0.12084 : 0.12864) * n("E80");
  return total;
};

const casingModule = (config, catalog) => {
  if (isMetalDoor(config, catalog)) return 0;
  const std = isStandardSize(config.doorWidth, config.doorHeight);
  const name = modelName(catalog, "exterior", config.exterior.panelModel);
  let total = (std ? 0.82 : 1) * n("E64");
  const film = byId(catalog.films, config.exterior.casingTexture)?.basePrice || 0;
  total += (std ? 3.5 : 4.55) * film;
  total += 0.15 * n("G65") + 0.005 * n("E66") + 0.05 * n("E67") + 0.018 * n("D68") + 20 + n("B70") + 75;
  total +=
    {
      "ВС-45": 500,
      "ВС-24": 400,
      "ВС-13": 400,
    }[name] || (name.startsWith("ВС-") || name === "НФ-6" ? 300 : 0);
  return total;
};

const locksAndCylinders = (config, catalog) => {
  let total = 0;
  total += byId(catalog.locks?.primary, config.primaryLockId)?.basePrice || 0;
  if (config.secondaryLock) total += byId(catalog.locks?.secondary, config.secondaryLockId)?.basePrice || 0;
  const primary = byId(catalog.locks?.primary, config.primaryLockId);
  const secondary = byId(catalog.locks?.secondary, config.secondaryLockId);
  if (isCylindricalLock(primary)) total += byId(catalog.cylinders, config.primaryCylinderId)?.basePrice || 0;
  if (config.secondaryLock && isCylindricalLock(secondary)) {
    total += byId(catalog.cylinders, config.secondaryCylinderId)?.basePrice || 0;
  }
  return total;
};

const furnitureSet = (config, catalog) => {
  const furniture = byId(catalog.furnitures, config.furnitureId);
  if (!furniture) return 0;
  return furnitureKitTotal(furniture, {
    isPrimaryLever: isLeverLock(byId(catalog.locks?.primary, config.primaryLockId)),
    isSecondaryLever: isLeverLock(byId(catalog.locks?.secondary, config.secondaryLockId)),
    hasSecondaryLock: Boolean(config.secondaryLock),
    hasPeephole: Boolean(config.peepholePosition && config.peepholePosition !== "None"),
    hasNightLatchTurner: Boolean(config.nightLatch),
  });
};

const comfortStandard = (config) => {
  const extraLock = Boolean(config.secondaryLock);
  const undercoat = Boolean(config.metalPainting?.undercoat || config.exterior?.undercoat);
  let total = 0;
  total += 3 * n("G4") + 4 * n("B5") + 0.4 * n("G6") + 3 * n("B7");
  total +=
    n("B8") +
    0.13 * n("D9") +
    12 * n("C11") +
    6 * n("C12") +
    4 * n("B17") +
    n("J28") +
    n("B18") +
    2 * n("B19") +
    n("B20") +
    2 * n("B21");
  total +=
    6 * n("B22") +
    (extraLock ? 6 : 3) * n("B24") +
    n("B27") +
    n("D55") +
    n("B41") +
    0.0045 * n("F42") +
    0.6 * n("C43") +
    1.5 * n("B44");
  total +=
    n("B45") +
    10 * n("B47") +
    4 * n("B48") +
    8 * n("C49") +
    0.39 * n("C50") +
    0.16 * n("E51") +
    n("B52") +
    n("B53");
  total += 2 * n("B56") + 0.165 * n("G57") + n("F58") + (undercoat ? 2 : 1) * n("B60");
  return total;
};

const absolutStandard = (config) => {
  const extraLock = Boolean(config.secondaryLock);
  const undercoat = Boolean(config.metalPainting?.undercoat || config.exterior?.undercoat);
  let total = 0;
  total += 3 * n("G4") + 4 * n("B5") + 0.4 * n("G6") + 3 * n("B7");
  total +=
    n("B8") +
    0.13 * n("D9") +
    12 * n("C11") +
    2 * n("C12") +
    8 * n("B17") +
    n("J28") +
    n("B18") +
    2 * n("B19") +
    n("B20") +
    2 * n("B21");
  total +=
    6 * n("B22") +
    (extraLock ? 6 : 3) * n("B24") +
    n("B27") +
    n("B41") +
    0.0045 * n("F42") +
    0.6 * n("C43") +
    1.5 * n("B44");
  total +=
    16 * n("B47") +
    4 * n("B48") +
    13 * n("C49") +
    n("B46") +
    0.387 * n("C50") +
    0.13 * n("E51") +
    1.5 * n("B52") +
    n("B53");
  total += 2 * n("B56") + 0.165 * n("G57") + n("F58") + (undercoat ? 2 : 1) * n("B60");
  return total;
};

const comfortUnique = (config) => {
  let steel = 0;
  if (config.doorHeight <= 2050 && config.doorWidth <= 960) steel = 43.175;
  else if (
    (config.doorHeight <= 2050 && config.doorWidth > 960 && config.doorWidth <= 1050) ||
    (config.doorHeight > 2050 && config.doorHeight <= 2130 && config.doorWidth <= 1050)
  ) {
    steel = 47.4925;
  } else if (config.doorHeight > 2130) steel = 49.06;
  let total = steel * n("G3");
  total += (config.doorWidth >= 2120 ? 6.91 : 4.8) * n("G3");
  const area = ((config.doorHeight - 127) / 1000) * ((config.doorWidth - 128) / 1000);
  total += area * 0.05 * n("F13") + area * 0.03 * n("F16");
  total += (config.nightLatch ? 1 : 0) * n("J27");
  total += (config.doorHeight <= 2050 ? 4 : config.doorHeight <= 2100 ? 6 : 9) * n("B45");
  return total;
};

const absolutUnique = (config) => {
  let steel = 0;
  if (config.doorHeight <= 2050 && config.doorWidth <= 960) steel = 51.81;
  else if (config.doorHeight <= 2050 && config.doorWidth > 960 && config.doorWidth <= 1050) steel = 56.991;
  else if (config.doorHeight > 2050 && config.doorHeight <= 2130 && config.doorWidth <= 1050) steel = 56.991;
  else if (config.doorHeight > 2130) steel = 58.875;
  let total = steel * n("G3");
  total += (config.doorHeight >= 2120 ? 6.91 : 4.8) * n("G3");
  total += config.doorHeight >= 2120 ? 140 : 123;
  total += n("B25");
  const area = ((config.doorHeight - 127) / 1000) * ((config.doorWidth - 128) / 1000);
  total += area * 0.05 * n("F15") + area * 0.03 * n("F16");
  total += config.nightLatch ? 64 : 0;
  total += (config.doorHeight <= 2050 ? 4 : config.doorHeight <= 2100 ? 6 : 9) * n("B45");
  return total;
};

const powder = (config, catalog, constructive) => {
  const name = modelName(catalog, "exterior", config.exterior.panelModel);
  if (constructive === "Absolut" && name === "Verso") return 0;
  const standard = isStandardSize(config.doorWidth, config.doorHeight);
  const metal = isMetalDoor(config, catalog);
  const paint = byId(catalog.paints, config.exterior?.primaryColor);
  const undercoat = Boolean(config.metalPainting?.undercoat || config.exterior?.undercoat);
  let total = paintQty(paint?.id, standard, metal) * (paint?.basePrice || 0);
  if (constructive === "Absolut" && [7, 8, 9, 10, 11, 12, 18, 19, 20, 21, 22].includes(paint?.id)) total += 50;
  if (undercoat) total += (standard ? 1 : 1.1) * n("J3");
  return total;
};

const closedBox = (config, constructive) => {
  if (config.doorBoxDesign !== "Closed") return 0;
  return constructive === "Absolut" ? 9.067 * n("G3") + 0.035 * n("F15") : 7.56 * n("G3") + 0.035 * n("F13");
};

const extraFinish = (config, catalog) => {
  const name = modelName(catalog, "interior", config.interior.panelModel);
  const primary = byId(catalog.paints, config.exterior?.primaryColor)?.basePrice || 0;
  const secondary = byId(catalog.paints, config.exterior?.secondaryColor)?.basePrice || 0;
  if (name === "Verso") {
    return (config.doorHeight > 2250 ? 6.86875 : 6.0445) * n("G3") + primary + secondary + 25 * n("B86");
  }
  if (name === "Forta") {
    return 1.82 * n("G82") + 2.15875 * n("G3") + 0.1 * secondary + 12 * (n("B85") + n("B83") + n("B84"));
  }
  if (name === "Stark") {
    return 6.04 * n("G3") + 0.1 * secondary + 38 * n("B87");
  }
  return 0;
};

const factoryPack = (config, catalog, constructive) => {
  const metal = isMetalDoor(config, catalog);
  const compact = config.doorHeight <= 2110 && config.doorWidth <= 1010;
  let total = 0;
  if (constructive === "Absolut") total += metal ? 2076 : 2435;
  else total += metal ? n("J142") : n("J143");
  if (config.metalPainting?.undercoat || config.exterior?.undercoat) total += n("J146");
  if (config.stainlessSteelDoorsill) total += n("J147");
  if (config.doorBoxDesign === "Closed") total += constructive === "Absolut" ? n("J149") : n("J148");
  const extras = { 97: n("J150"), 96: n("J151"), 88: n("J152") }[config.exterior?.panelModel];
  if (extras) total += extras;
  return compact ? total : total * 1.05;
};

const threshold = (config, constructive) =>
  (config.stainlessSteelDoorsill ? (constructive === "Absolut" ? 1.6318 : 1.344) : 0) * n("G82");

const fasteners = (config, catalog) => (isMetalDoor(config, catalog) ? 0 : 100 * n("B38") + 4 * n("B17"));

const versoUndercoat = (config, catalog) => {
  if (modelName(catalog, "exterior", config.exterior.panelModel) !== "Verso") return 0;
  if (!(config.metalPainting?.undercoat || config.exterior?.undercoat)) return 0;
  return (isStandardSize(config.doorWidth, config.doorHeight) ? 1 : 1.1) * n("J3");
};

const addLine = (lines, label, amount) => {
  const value = Number(amount) || 0;
  if (!value) return 0;
  lines.push({ label, amount: Math.round(value) });
  return value;
};

const factoryTotal = (config, catalog, constructive) => {
  const lines = [];
  let total = 0;
  const add = (label, amount) => {
    total += addLine(lines, label, amount);
  };

  add("Каркас", constructive === "Absolut" ? absolutStandard(config) : comfortStandard(config));
  add("Порошок", powder(config, catalog, constructive));
  add("Размер / металл", constructive === "Absolut" ? absolutUnique(config) : comfortUnique(config));
  add("Закрытый короб", closedBox(config, constructive));
  add("Крепёж", fasteners(config, catalog));
  add("Замки и цилиндры", locksAndCylinders(config, catalog));
  add("Фурнитура", furnitureSet(config, catalog));
  add(
    "Наружная панель",
    constructive === "Absolut" ? absolutExteriorPanel(config, catalog) : comfortExteriorPanel(config, catalog),
  );
  add("Внутренняя панель", interiorPanel(config, catalog));
  add("Наличник", casingModule(config, catalog));
  add("Доп. отделка", extraFinish(config, catalog));
  add("Цинкогрунт Verso", versoUndercoat(config, catalog));
  add("Упаковка", factoryPack(config, catalog, constructive));
  add("Порог", threshold(config, constructive));
  return { total, lines };
};

const clampMarkupPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(MARKUP_MAX, Math.max(MARKUP_MIN, Math.round(n)));
};

const applyDealerMarkup = (wholesale, markupPercent = 0) => {
  const base = Math.round(Number(wholesale) || 0);
  const percent = clampMarkupPercent(markupPercent);
  if (percent <= 0) return base;
  return Math.round(base * (1 + percent / 100));
};

const calculateApartmentPrice = (config, catalog = {}, markupPercent = 0) => {
  const constructive = config.doorConstructive === "Absolut" ? "Absolut" : "Comfort";
  const factory = factoryTotal(config, catalog, constructive);
  const lines = factory.lines.map((line) => ({ ...line }));
  let total = factory.total * OVERALL;
  addLine(lines, "Наценка производства 32%", factory.total * 0.32);

  if (config.metalPainting?.undercoat || config.exterior?.undercoat) {
    total += addLine(lines, "Цинкогрунт", UNDERCOAT_ABS);
  }
  if (config.stainlessSteelDoorsill) total += addLine(lines, "Порог из нержавейки", DOORSILL_ABS);
  if (config.furnitureType === "electronic") total += addLine(lines, "Электронный замок", E_LOCK_ABS);

  const exteriorModel = getModel(catalog, "exterior", config.exterior?.panelModel);
  if (exteriorModel?.markupAbs) total += addLine(lines, `Наценка ${exteriorModel.name}`, exteriorModel.markupAbs);
  const interiorModel = getModel(catalog, "interior", config.interior?.panelModel);
  if (interiorModel?.markupAbs) total += addLine(lines, `Наценка ${interiorModel.name}`, interiorModel.markupAbs);

  const taxed = total * TAX;
  addLine(lines, "НДС 5,5%", taxed - total);
  const wholesale = Math.round(taxed);
  const percent = clampMarkupPercent(markupPercent);
  const sale = applyDealerMarkup(wholesale, percent);
  if (percent > 0) addLine(lines, `Наценка ${percent}%`, sale - wholesale);
  return { total: sale, wholesale, sale, markupPercent: percent, lines };
};

const optionDelta = (options, code) => {
  const item = (options || []).find((row) => row.code === code);
  return item ? Number(item.delta) || 0 : 0;
};

module.exports = {
  calculateApartmentPrice,
  applyDealerMarkup,
  clampMarkupPercent,
  optionDelta,
};
