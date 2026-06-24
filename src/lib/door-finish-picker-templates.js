const DOOR_FINISH_PICKER_TEMPLATE_MODAL_GRID_TABS = "modal-grid-tabs";
const DOOR_FINISH_PICKER_TEMPLATE_INLINE_BELOW_CARD = "inline-below-card";

const DOOR_FINISH_PICKER_TEMPLATES = [
  {
    id: DOOR_FINISH_PICKER_TEMPLATE_MODAL_GRID_TABS,
    title: "Модалка: вкладки и сетка",
    description:
      "Кнопка в блоке товара, палитра открывается в модальном окне: вкладки по группам и сетка карточек.",
    placement: "sidebar",
  },
  {
    id: DOOR_FINISH_PICKER_TEMPLATE_INLINE_BELOW_CARD,
    title: "Панель под карточкой",
    description:
      "Полноширинная панель под фото и описанием товара, над таблицей погонажа: вкладки и сетка покрытий.",
    placement: "below-card",
  },
];

const DEFAULT_DOOR_FINISH_PICKER_TEMPLATE_ID = DOOR_FINISH_PICKER_TEMPLATE_MODAL_GRID_TABS;

const isDoorFinishPickerTemplateId = (value) =>
  DOOR_FINISH_PICKER_TEMPLATES.some((template) => template.id === value);

const getDoorFinishPickerTemplate = (id) =>
  DOOR_FINISH_PICKER_TEMPLATES.find((template) => template.id === id);

const getFinishPickerPlacement = (id) => getDoorFinishPickerTemplate(id)?.placement || "sidebar";

module.exports = {
  DOOR_FINISH_PICKER_TEMPLATE_MODAL_GRID_TABS,
  DOOR_FINISH_PICKER_TEMPLATE_INLINE_BELOW_CARD,
  DOOR_FINISH_PICKER_TEMPLATES,
  DEFAULT_DOOR_FINISH_PICKER_TEMPLATE_ID,
  isDoorFinishPickerTemplateId,
  getDoorFinishPickerTemplate,
  getFinishPickerPlacement,
};
