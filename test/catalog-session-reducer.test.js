const test = require("node:test");
const assert = require("node:assert/strict");
const {
  catalogSessionReducer,
  createInitialCatalogSessionState,
  shouldIgnoreRestore,
} = require("../src/features/catalog/session/catalog-session-reducer.js");

const baseState = () => createInitialCatalogSessionState("all", "catalogPage=all&sort=popularity");

test("USER_FILTER_CHANGE resets pagination and products", () => {
  let state = {
    ...baseState(),
    products: [{ id: 1, name: "A" }],
    total: 10,
    page: 3,
    status: "idle",
  };
  state = catalogSessionReducer(state, {
    type: "USER_FILTER_CHANGE",
    searchKey: "catalogPage=all&sort=price-asc",
  });
  assert.equal(state.page, 1);
  assert.equal(state.products.length, 0);
  assert.equal(state.status, "loading");
  assert.equal(state.searchKey, "catalogPage=all&sort=price-asc");
});

test("USER_FILTER_CHANGE is noop when searchKey unchanged", () => {
  const state = { ...baseState(), status: "idle", products: [{ id: 1 }] };
  const next = catalogSessionReducer(state, {
    type: "USER_FILTER_CHANGE",
    searchKey: state.searchKey,
  });
  assert.equal(next, state);
});

test("RESTORE_BEGIN ignored when searchKey mismatches", () => {
  const state = baseState();
  const next = catalogSessionReducer(state, {
    type: "RESTORE_BEGIN",
    restore: {
      catalogPage: "all",
      scrollY: 500,
      loadedPages: 2,
      searchKey: "other",
    },
  });
  assert.equal(next.restore, null);
  assert.equal(next.status, "loading");
});

test("RESTORE_BEGIN accepted when keys match", () => {
  const state = baseState();
  const restore = {
    catalogPage: "all",
    scrollY: 500,
    loadedPages: 2,
    searchKey: state.searchKey,
  };
  const next = catalogSessionReducer(state, {
    type: "RESTORE_BEGIN",
    restore,
  });
  assert.deepEqual(next.restore, restore);
  assert.equal(next.status, "restoring");
});

test("LOAD_MORE increments page", () => {
  const state = { ...baseState(), status: "idle", page: 1 };
  const next = catalogSessionReducer(state, { type: "LOAD_MORE" });
  assert.equal(next.page, 2);
  assert.equal(next.status, "loading_more");
});

test("LOAD_MORE is noop while loading_more", () => {
  const state = { ...baseState(), status: "loading_more", page: 2 };
  const next = catalogSessionReducer(state, { type: "LOAD_MORE" });
  assert.equal(next, state);
});

test("FETCH_SUCCESS appends on load more", () => {
  const state = {
    ...baseState(),
    status: "loading_more",
    page: 2,
    products: [{ id: 1, name: "A" }],
    total: 5,
  };
  const next = catalogSessionReducer(state, {
    type: "FETCH_SUCCESS",
    page: 2,
    searchKey: state.searchKey,
    products: [{ id: 2, name: "B" }],
    total: 5,
    append: true,
  });
  assert.equal(next.products.length, 2);
  assert.equal(next.products[0].id, 1);
  assert.equal(next.products[1].id, 2);
});

test("FETCH_SUCCESS append keeps higher total when response total is stale", () => {
  const state = {
    ...baseState(),
    status: "loading_more",
    page: 2,
    products: Array.from({ length: 20 }, (_, index) => ({ id: index + 1 })),
    total: 500,
  };
  const next = catalogSessionReducer(state, {
    type: "FETCH_SUCCESS",
    page: 2,
    searchKey: state.searchKey,
    products: Array.from({ length: 20 }, (_, index) => ({ id: index + 21 })),
    total: 4,
    append: true,
  });
  assert.equal(next.products.length, 40);
  assert.equal(next.total, 500);
});

test("shouldIgnoreRestore when catalogPage or searchKey differ", () => {
  assert.equal(
    shouldIgnoreRestore(
      { catalogPage: "all", searchKey: "a" },
      "furnitura",
      "a",
    ),
    true,
  );
  assert.equal(
    shouldIgnoreRestore(
      { catalogPage: "all", searchKey: "a" },
      "all",
      "b",
    ),
    true,
  );
  assert.equal(
    shouldIgnoreRestore(
      { catalogPage: "all", searchKey: "a" },
      "all",
      "a",
    ),
    false,
  );
});
