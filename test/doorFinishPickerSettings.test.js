const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeDoorFinishPickerSettings,
  resolveFinishPickerTemplateId,
} = require("../src/lib/server/domain/doorFinishPickerSettings");

test("normalizeDoorFinishPickerSettings defaults to modal grid tabs", () => {
  const settings = normalizeDoorFinishPickerSettings({});
  assert.equal(settings.activeTemplateId, "modal-grid-tabs");
  assert.deepEqual(settings.enabledTemplateIds, ["modal-grid-tabs"]);
});

test("resolveFinishPickerTemplateId returns null when all templates disabled", () => {
  const settings = normalizeDoorFinishPickerSettings({
    activeTemplateId: "modal-grid-tabs",
    enabledTemplateIds: [],
  });
  assert.equal(resolveFinishPickerTemplateId(settings), null);
});

test("resolveFinishPickerTemplateId uses active enabled template", () => {
  const settings = normalizeDoorFinishPickerSettings({
    activeTemplateId: "modal-grid-tabs",
    enabledTemplateIds: ["modal-grid-tabs"],
  });
  assert.equal(resolveFinishPickerTemplateId(settings), "modal-grid-tabs");
});

test("normalizeDoorFinishPickerSettings keeps disabled state from database row", () => {
  const settings = normalizeDoorFinishPickerSettings({
    activeTemplateId: null,
    enabledTemplateIds: [],
  });
  assert.equal(settings.activeTemplateId, null);
  assert.deepEqual(settings.enabledTemplateIds, []);
  assert.equal(resolveFinishPickerTemplateId(settings), null);
});

test("inline below card template is registered", () => {
  const {
    isDoorFinishPickerTemplateId,
    getFinishPickerPlacement,
    DOOR_FINISH_PICKER_TEMPLATE_INLINE_BELOW_CARD,
  } = require("../src/lib/door-finish-picker-templates.js");
  assert.equal(isDoorFinishPickerTemplateId(DOOR_FINISH_PICKER_TEMPLATE_INLINE_BELOW_CARD), true);
  assert.equal(getFinishPickerPlacement(DOOR_FINISH_PICKER_TEMPLATE_INLINE_BELOW_CARD), "below-card");
});
