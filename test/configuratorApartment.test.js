const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createDefaultDoorConfig,
  isCylindricalLock,
  patchFinish,
  randomizeDoorConfig,
  setExteriorModel,
  setInteriorModel,
} = require("../src/lib/configurator/apartment-door-config");
const { NO_PANEL_ID } = require("../src/lib/configurator/apartment-constants");
const { calculateApartmentPrice } = require("../src/lib/configurator/apartment-price");
const { resolveBaseLayer, resolveVisualizerLayers, PEEPHOLE_SIDE_SHIFT } = require("../src/lib/configurator/apartment-visual");

const catalog = {
  models: [
    {
      id: 38,
      name: "ВС-13",
      type: "exterior",
      classification: null,
      imageUrl: "/uploads/configurator/apartment/exterior/ВС-13 Дуб бодега коричневый.webp",
      hasPrimaryFilmColor: true,
      hasSecondaryFilmColor: true,
      hasCasingFilmColor: true,
      hasPrimaryPaint: true,
      hasSecondaryPaint: false,
      hasCasingPaint: false,
      defaultPrimaryFilmColorId: 284,
      defaultSecondaryFilmColorId: 367,
      defaultCasingFilmColorId: 284,
      defaultPrimaryPaintId: 198,
      defaultSecondaryPaintId: null,
      defaultCasingPaintId: null,
      filmColorSource: "primary-to-casing",
      paintColorSource: null,
      peepholePosition: "anywhere",
      markupAbs: 0,
    },
    {
      id: 2,
      name: "Ф-11",
      type: "interior",
      classification: null,
      imageUrl: "/uploads/configurator/apartment/models/interior/Ф-11.jpg",
      hasPrimaryFilmColor: true,
      hasSecondaryFilmColor: false,
      hasCasingFilmColor: false,
      hasPrimaryPaint: false,
      hasSecondaryPaint: false,
      hasCasingPaint: false,
      defaultPrimaryFilmColorId: 279,
      defaultSecondaryFilmColorId: null,
      defaultCasingFilmColorId: null,
      defaultPrimaryPaintId: null,
      defaultSecondaryPaintId: null,
      defaultCasingPaintId: null,
      filmColorSource: null,
      paintColorSource: null,
      peepholePosition: "anywhere",
      markupAbs: 0,
    },
  ],
  films: [
    { id: 284, name: "Дуб бодега коричневый", imageUrl: "", basePrice: 242 },
    { id: 367, name: "Черный матовый", imageUrl: "", basePrice: 145 },
    { id: 279, name: "Бетон снежный", imageUrl: "", basePrice: 110 },
  ],
  paints: [{ id: 198, name: "Муар 1019", imageUrl: "", basePrice: 400 }],
  handles: [{ id: 240, name: "Ручка 093", imageUrl: "", basePrice: 225 }],
  cylinders: [{ id: 227, name: "DWF Profi", imageUrl: "", basePrice: 240 }],
  locks: {
    primary: [
      {
        id: 368,
        name: "Galeon 816",
        imageUrl: "",
        basePrice: 365,
        properties: { Механизм: "Цилиндровый" },
      },
      {
        id: 369,
        name: "Гардиан 32.11",
        imageUrl: "",
        basePrice: 817,
        properties: { Механизм: "Цилиндровый" },
      },
    ],
    secondary: [
      {
        id: 371,
        name: "Galeon 818",
        imageUrl: "",
        basePrice: 470,
        properties: { Механизм: "Сувальдный" },
      },
      {
        id: 378,
        name: "Гардиан 30.01",
        imageUrl: "",
        basePrice: 1015,
        properties: { Механизм: "Сувальдный" },
      },
    ],
  },
  furnitures: [
    {
      id: 20,
      title: "093",
      type: "push",
      shape: "oval",
      color: "chrome",
      previewUrl: "/f.png",
      interiorPreviewUrl: "",
      overlays: {
        handleExterior: "/h-ext.png",
        handleInterior: "/h-int.png",
        primaryExteriorCylindrical: "/cyl.png",
        primaryExteriorLever: "/lever.png",
        cylinderRod: "/rod.png",
        peepholeExterior: "/eye-ext.png",
        peepholeInterior: "/eye-int.png",
        kit: {
          handle: { base_price: 225 },
          cylindrical_lock: { base_price: 48 },
          peephole: { base_price: 73 },
        },
      },
      handleId: 240,
    },
  ],
  priceOptions: [
    { code: "base", name: "База", delta: 56500, category: "База", comment: "" },
    { code: "Absolut", name: "Absolut", delta: 1700, category: "Конструкция", comment: "" },
    { code: "Closed", name: "Закрытый", delta: 2000, category: "Тип короба", comment: "" },
    { code: "innerPanel", name: "Панель", delta: 6100, category: "Опция", comment: "" },
    { code: "peephole", name: "Глазок", delta: 200, category: "Опция", comment: "" },
  ],
  composites: {
    exterior: ["ВС-13|Дуб бодега коричневый"],
    interior: ["Ф-11|Бетон снежный"],
  },
  layerUrls: {
    casing: {
      "ВС-13|Дуб бодега коричневый": "/uploads/configurator/apartment/layers/casing/ВС-13 Дуб бодега коричневый.webp",
    },
    casingPaint: {
      "Муар 1019": "/uploads/configurator/apartment/layers/casing-paint/Муар 1019.webp",
    },
    insert: {
      "ВС-13|Дуб бодега коричневый": "/uploads/configurator/apartment/layers/inserts/ВС-13 Дуб бодега коричневый.png",
    },
    leafInsert: {
      "ВС-13|Черный матовый": "/uploads/configurator/apartment/layers/leaf-inserts/ВС-13 Черный матовый.webp",
      "ВС-13|Дуб бодега коричневый": "/uploads/configurator/apartment/layers/leaf-inserts/ВС-13 Дуб бодега коричневый.webp",
    },
    hinge: {
      "Муар 1019": "/uploads/configurator/apartment/layers/hinges/Муар 1019.webp",
    },
    threshold: {
      exterior: "/uploads/configurator/apartment/layers/threshold/exterior.webp",
      interior: "/uploads/configurator/apartment/layers/threshold/interior.webp",
      ui: "/uploads/configurator/apartment/layers/threshold/ui.png",
    },
    box: {
      Opened: "/uploads/configurator/apartment/layers/box/Opened.webp",
      Closed: "/uploads/configurator/apartment/layers/box/Closed.webp",
    },
  },
  thresholdImageUrl: "/porog.png",
};

test("default config uses Comfort sizes and model film defaults", () => {
  const config = createDefaultDoorConfig(catalog);
  assert.equal(config.doorConstructive, "Comfort");
  assert.equal(config.doorWidth, 960);
  assert.equal(config.doorHeight, 2050);
  assert.equal(config.exterior.panelModel, 38);
  assert.equal(config.exterior.primaryTexture, 284);
  assert.equal(config.exterior.casingTexture, 284);
  assert.equal(config.interior.panelModel, 2);
  assert.equal(config.secondaryLock, true);
  assert.equal(config.primaryLockId, 369);
  assert.equal(config.secondaryLockId, 378);
  assert.equal(isCylindricalLock(catalog.locks.primary[0]), true);
});

test("syncs casing film when primary changes", () => {
  const config = createDefaultDoorConfig(catalog);
  const next = patchFinish(config, catalog, "exterior", { primaryTexture: 367 });
  assert.equal(next.exterior.primaryTexture, 367);
  assert.equal(next.exterior.casingTexture, 367);
});

test("price uses wholesale factory formula without dealer 70% markup", () => {
  const config = {
    ...createDefaultDoorConfig(catalog),
    doorConstructive: "Absolut",
    peepholePosition: "center",
  };
  const { total, lines } = calculateApartmentPrice(config, catalog);
  assert.ok(lines.some((line) => line.label === "Наценка производства 32%"));
  assert.ok(lines.some((line) => line.label === "НДС 5,5%"));
  assert.ok(lines.some((line) => line.label === "Внутренняя панель"));
  const comfort = calculateApartmentPrice(
    { ...createDefaultDoorConfig(catalog), peepholePosition: "center" },
    catalog,
  ).total;
  assert.ok(total > comfort);
  assert.ok(total < 45000);
  assert.ok(comfort < 40000);
});

test("dealer markup 70% is applied on top of wholesale", () => {
  const config = createDefaultDoorConfig(catalog);
  const wholesale = calculateApartmentPrice(config, catalog, 0);
  const sale = calculateApartmentPrice(config, catalog, 70);
  assert.equal(wholesale.total, wholesale.wholesale);
  assert.equal(sale.wholesale, wholesale.wholesale);
  assert.equal(sale.sale, Math.round(wholesale.wholesale * 1.7));
  assert.ok(sale.lines.some((line) => line.label === "Наценка 70%"));
});

test("no inner panel skips that delta", () => {
  const config = setInteriorModel(createDefaultDoorConfig(catalog), catalog, NO_PANEL_ID);
  const { total } = calculateApartmentPrice(config, catalog);
  const withPanel = calculateApartmentPrice(createDefaultDoorConfig(catalog), catalog).total;
  assert.ok(withPanel > total);
});

test("exterior design catalog thumbs with furniture are not used as the panel layer", () => {
  const config = createDefaultDoorConfig(catalog);
  const withoutComposite = {
    ...catalog,
    composites: { ...catalog.composites, exterior: [] },
    models: catalog.models.map((model) =>
      model.id === 38
        ? { ...model, imageUrl: "/uploads/configurator/apartment/models/exterior/ВС-13.jpg" }
        : model,
    ),
  };
  const base = resolveBaseLayer("exterior", config, withoutComposite);
  assert.equal(base.kind, "empty");
  assert.equal(base.src, "");
});

test("metal panel uses paint hires as a baked thumb without extra overlays", () => {
  const metalCatalog = {
    ...catalog,
    models: [
      {
        ...catalog.models[0],
        id: 87,
        name: "City",
        classification: "apartment_metal-panel",
        imageUrl: "/uploads/configurator/apartment/models/metal/City.jpg",
        hasPrimaryFilmColor: false,
        hasSecondaryFilmColor: false,
        hasCasingFilmColor: false,
        hasPrimaryPaint: true,
        hasSecondaryPaint: false,
        hasCasingPaint: true,
        defaultPrimaryFilmColorId: null,
        defaultSecondaryFilmColorId: null,
        defaultCasingFilmColorId: null,
        defaultPrimaryPaintId: 193,
        defaultCasingPaintId: 193,
        filmColorSource: null,
        paintColorSource: "primary-to-casing",
      },
      catalog.models[1],
    ],
    paints: [...catalog.paints, { id: 193, name: "Антик серебро", imageUrl: "", basePrice: 450 }],
    composites: {
      ...catalog.composites,
      exterior: ["City|Антик серебро"],
    },
  };
  const config = setExteriorModel(createDefaultDoorConfig(metalCatalog), metalCatalog, 87);
  const base = resolveBaseLayer("exterior", config, metalCatalog);
  assert.equal(base.kind, "thumb");
  assert.ok(base.src.includes("City Антик серебро.webp"));
  const { layers } = resolveVisualizerLayers(config, metalCatalog, "exterior");
  assert.equal(
    layers.some((layer) => layer.id === "handle"),
    false,
  );
  assert.equal(
    layers.some((layer) => layer.kind === "composite"),
    false,
  );
});

test("visualizer stacks film casing, insert, composite and lock overlay", () => {
  const config = createDefaultDoorConfig(catalog);
  const { layers, mirror } = resolveVisualizerLayers(config, catalog, "exterior");
  assert.equal(mirror, false);
  assert.equal(layers[0].id, "casing");
  assert.equal(layers[1].id, "insert");
  assert.equal(layers[2].kind, "composite");
  const leafInsert = layers.find((layer) => layer.id === "leaf-insert");
  assert.ok(leafInsert?.src.includes("Черный матовый"));
  assert.ok(layers.indexOf(leafInsert) > 2);
  assert.equal(
    layers.some((layer) => layer.id === "casing-paint"),
    false,
  );
  assert.ok(layers.some((layer) => layer.id === "hinge" && layer.src.includes("Муар 1019")));
  assert.ok(layers.some((layer) => layer.id === "lock-primary" && layer.src === "/cyl.png"));
  assert.ok(layers.some((layer) => layer.id === "handle"));
});

test("interior cylindrical lock uses the cylinder rod cover", () => {
  const config = createDefaultDoorConfig(catalog);
  const interior = resolveVisualizerLayers(config, catalog, "interior").layers;
  const exterior = resolveVisualizerLayers(config, catalog, "exterior").layers;
  assert.ok(interior.some((layer) => layer.id === "lock-primary" && layer.src === "/rod.png"));
  assert.equal(
    exterior.some((layer) => layer.src === "/rod.png"),
    false,
  );
});

test("interior without casing film uses metal paint casing and hides hinges", () => {
  const config = createDefaultDoorConfig(catalog);
  const { layers } = resolveVisualizerLayers(config, catalog, "interior");
  assert.ok(layers.some((layer) => layer.id === "casing-paint" && layer.src.includes("Муар 1019")));
  assert.ok(!layers.some((layer) => layer.id === "casing"));
  assert.ok(!layers.some((layer) => layer.id === "hinge"));
  assert.ok(!layers.some((layer) => layer.id === "leaf-insert"));
  assert.ok(layers.some((layer) => layer.kind === "composite"));
});

test("leaf insert falls back to primary film when secondary overlay is missing", () => {
  const config = patchFinish(createDefaultDoorConfig(catalog), catalog, "exterior", { secondaryTexture: 279 });
  const { layers } = resolveVisualizerLayers(config, catalog, "exterior");
  const leafInsert = layers.find((layer) => layer.id === "leaf-insert");
  assert.ok(leafInsert?.src.includes("Дуб бодега коричневый"));
});

test("stainless threshold uses side-specific overlay", () => {
  const config = { ...createDefaultDoorConfig(catalog), stainlessSteelDoorsill: true };
  const exterior = resolveVisualizerLayers(config, catalog, "exterior").layers;
  const interior = resolveVisualizerLayers(config, catalog, "interior").layers;
  assert.ok(exterior.some((layer) => layer.id === "threshold" && layer.src.endsWith("exterior.webp")));
  assert.ok(interior.some((layer) => layer.id === "threshold" && layer.src.endsWith("interior.webp")));
});

test("side peephole shifts toward the furniture column", () => {
  const config = { ...createDefaultDoorConfig(catalog), peepholePosition: "side" };
  const exterior = resolveVisualizerLayers(config, catalog, "exterior").layers.find((layer) => layer.id === "peephole");
  const interior = resolveVisualizerLayers(config, catalog, "interior").layers.find((layer) => layer.id === "peephole");
  const centered = resolveVisualizerLayers(
    { ...config, peepholePosition: "center" },
    catalog,
    "exterior",
  ).layers.find((layer) => layer.id === "peephole");
  assert.equal(exterior?.src, "/eye-ext.png");
  assert.equal(exterior?.shiftX, PEEPHOLE_SIDE_SHIFT);
  assert.equal(interior?.shiftX, -PEEPHOLE_SIDE_SHIFT);
  assert.equal(centered?.shiftX, 0);
});

test("night latch turner is interior-only", () => {
  const catalogWithTurner = {
    ...catalog,
    furnitures: catalog.furnitures.map((item) => ({
      ...item,
      overlays: { ...item.overlays, nightLatchTurner: "/turner.png" },
    })),
  };
  const config = { ...createDefaultDoorConfig(catalogWithTurner), nightLatch: true };
  const exterior = resolveVisualizerLayers(config, catalogWithTurner, "exterior").layers;
  const interior = resolveVisualizerLayers(config, catalogWithTurner, "interior").layers;
  assert.equal(
    exterior.some((layer) => layer.id === "night-latch"),
    false,
  );
  assert.ok(interior.some((layer) => layer.id === "night-latch" && layer.src === "/turner.png"));
});

test("randomize stays within size bounds", () => {
  let seed = 1;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const config = randomizeDoorConfig(catalog, rng);
  assert.ok(config.doorWidth >= 800 && config.doorWidth <= 1050);
  assert.equal(config.doorWidth % 10, 0);
  assert.ok(config.doorHeight >= 1800 && config.doorHeight <= 2300);
});

test("randomize keeps constructive, box design and size", () => {
  let seed = 1;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const current = {
    ...createDefaultDoorConfig(catalog),
    doorConstructive: "Absolut",
    doorBoxDesign: "Closed",
    doorWidth: 900,
    doorHeight: 2100,
  };
  const config = randomizeDoorConfig(catalog, rng, current);
  assert.equal(config.doorConstructive, "Absolut");
  assert.equal(config.doorBoxDesign, "Closed");
  assert.equal(config.doorWidth, 900);
  assert.equal(config.doorHeight, 2100);
});
