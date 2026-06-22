const normalizeQueryKey = (query) => new URLSearchParams(String(query || "")).toString();

const dedupeProductsById = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const id = Number(item.id);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const createInitialCatalogSessionState = (catalogPage, searchKey) => ({
  catalogPage,
  searchKey,
  products: [],
  total: 0,
  page: 1,
  status: "loading",
  error: "",
  restore: null,
  restoreScrollApplied: false,
});

const catalogSessionReducer = (state, action) => {
  switch (action.type) {
    case "INIT_FROM_SHELL":
      return {
        ...state,
        catalogPage: action.catalogPage,
        searchKey: action.searchKey,
        products: action.products,
        total: action.total,
        page: 1,
        status: state.restore ? "restoring" : "idle",
        error: "",
        restoreScrollApplied: false,
      };

    case "USER_FILTER_CHANGE":
      if (action.searchKey === state.searchKey && state.status !== "restoring") {
        return state;
      }
      return {
        ...createInitialCatalogSessionState(state.catalogPage, action.searchKey),
        status: "loading",
      };

    case "VITRINE_CHANGE":
      return {
        ...createInitialCatalogSessionState(action.catalogPage, action.searchKey),
        status: "loading",
      };

    case "LOAD_MORE":
      if (
        state.status === "loading" ||
        state.status === "restoring" ||
        state.status === "loading_more"
      ) {
        return state;
      }
      return {
        ...state,
        page: state.page + 1,
        status: "loading_more",
        error: "",
      };

    case "FETCH_START": {
      const nextStatus = action.page === 1 ? "loading" : "loading_more";
      if (state.status === nextStatus && state.error === "") return state;
      return {
        ...state,
        status: nextStatus,
        error: "",
      };
    }

    case "FETCH_SUCCESS": {
      const nextTotal = action.append
        ? Math.max(state.total, action.total)
        : action.total;
      return {
        ...state,
        searchKey: action.searchKey,
        products: action.append
          ? dedupeProductsById([...state.products, ...action.products])
          : dedupeProductsById(action.products),
        total: nextTotal,
        page: action.page,
        status: state.restore && !state.restoreScrollApplied ? "restoring" : "idle",
        error: "",
      };
    }

    case "FETCH_ERROR":
      return {
        ...state,
        status: "error",
        error: action.message,
      };

    case "RESTORE_BEGIN":
      if (
        action.restore.catalogPage !== state.catalogPage ||
        normalizeQueryKey(action.restore.searchKey) !== normalizeQueryKey(state.searchKey)
      ) {
        return state;
      }
      return {
        ...state,
        restore: action.restore,
        restoreScrollApplied: false,
        status: "restoring",
      };

    case "RESTORE_PAGES_LOADED":
      return {
        ...state,
        products: dedupeProductsById(action.products),
        total: Math.max(state.total, action.total),
        page: action.page,
        searchKey: action.searchKey,
        status: "restoring",
        error: "",
      };

    case "RESTORE_SCROLL_APPLIED":
      return {
        ...state,
        restore: null,
        restoreScrollApplied: true,
        status: "idle",
      };

    default:
      return state;
  }
};

const shouldIgnoreRestore = (restore, catalogPage, searchKey) =>
  restore.catalogPage !== catalogPage || restore.searchKey !== searchKey;

module.exports = {
  catalogSessionReducer,
  createInitialCatalogSessionState,
  shouldIgnoreRestore,
};
