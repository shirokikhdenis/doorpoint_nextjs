const NO_PANEL_ID = -1;

const WIDTH_MIN = 800;
const WIDTH_MAX = 1050;
const HEIGHT_MIN = 1800;
const HEIGHT_MAX = 2300;
const SIZE_STEP = 10;
const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 2050;

const CONSTRUCTIVES = [
  {
    value: "Comfort",
    label: "Comfort",
    description:
      "Короб: 1,2 мм (открытый). Уплотнитель на полотне: 2 шт. (Шлегель). Уплотнитель на коробе: D-образный. Заполнитель двери: нет (полая).",
  },
  {
    value: "Absolut",
    label: "Absolut",
    description:
      "Короб: 1,4 мм (открытый). Уплотнитель на полотне: 2 шт. (Шлегель). Уплотнитель на коробе: D-образный. Заполнитель двери: минеральная вата.",
  },
];

const BOX_DESIGNS = [
  { value: "Opened", label: "Открытый" },
  { value: "Closed", label: "Закрытый" },
];

const HANDLE_SIDES = [
  { value: "Left", label: "Левая" },
  { value: "Right", label: "Правая" },
];

const HANDLE_TYPES = [
  { value: "push", label: "Нажимная" },
  { value: "bugel", label: "Бугельная" },
  { value: "electronic", label: "Электронная" },
];

const FURNITURE_COLORS = [
  { value: "black", label: "Матовый чёрный", swatch: "#1a1a1a" },
  { value: "chrome", label: "Хром", swatch: "#c5c8cc" },
  { value: "matte-chrome", label: "Матовый хром", swatch: "#9aa0a6" },
  { value: "gold", label: "Золотой", swatch: "#c4a35a" },
  { value: "bronze", label: "Бронзовый", swatch: "#8a5a32" },
];

const FURNITURE_SHAPES = [
  { value: "rectangular", label: "Прямоугольная" },
  { value: "oval", label: "Овальная" },
  { value: "other", label: "Другая" },
];

const PEEPHOLE_POSITIONS = [
  { value: "None", label: "Нет" },
  { value: "center", label: "По центру" },
  { value: "side", label: "Сбоку" },
];

const CYLINDRICAL_MECHANISM = "Цилиндровый";

const MARKUP_PRESETS = [0, 50, 70, 100];
const DEFAULT_MARKUP_PERCENT = 70;
const MARKUP_MIN = 0;
const MARKUP_MAX = 300;

const SKIP_MODEL_NAMES = new Set(["ВС-68"]);
const DEFAULT_PRIMARY_LOCK_CODE = "3211";
const DEFAULT_SECONDARY_LOCK_CODE = "3001";

module.exports = {
  NO_PANEL_ID,
  WIDTH_MIN,
  WIDTH_MAX,
  HEIGHT_MIN,
  HEIGHT_MAX,
  SIZE_STEP,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  CONSTRUCTIVES,
  BOX_DESIGNS,
  HANDLE_SIDES,
  HANDLE_TYPES,
  FURNITURE_COLORS,
  FURNITURE_SHAPES,
  PEEPHOLE_POSITIONS,
  CYLINDRICAL_MECHANISM,
  MARKUP_PRESETS,
  DEFAULT_MARKUP_PERCENT,
  MARKUP_MIN,
  MARKUP_MAX,
  SKIP_MODEL_NAMES,
  DEFAULT_PRIMARY_LOCK_CODE,
  DEFAULT_SECONDARY_LOCK_CODE,
};
