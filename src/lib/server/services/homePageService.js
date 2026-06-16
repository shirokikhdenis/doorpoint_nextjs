const catalogService = require("./catalogService");

const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickTopHits = async (catalogPage, count = 8) => {
  const result = await catalogService.getProducts({
    catalogPage,
    limit: count,
    page: 1,
    sort: "popularity",
  });
  return result.items;
};

const pickRandomHits = async (catalogPage, { excludeIds = [], count = 8 } = {}) => {
  const exclude = new Set(excludeIds.map((id) => Number(id)).filter((id) => id > 0));
  const result = await catalogService.getProducts({
    catalogPage,
    limit: 64,
    page: 1,
    sort: "popularity",
  });
  const pool = result.items.filter((item) => !exclude.has(Number(item.id)));
  return shuffle(pool).slice(0, count);
};

const getHomePageData = async () => {
  const [interiorHits, entryHits] = await Promise.all([
    pickTopHits("interior-doors"),
    pickTopHits("entry-doors"),
  ]);

  return {
    interiorHits,
    entryHits,
    interiorCoverImage: interiorHits.find((item) => item.image)?.image || "",
    entryCoverImage: entryHits.find((item) => item.image)?.image || "",
  };
};

module.exports = {
  getHomePageData,
  pickRandomHits,
};
