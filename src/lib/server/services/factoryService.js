const factoryStorefrontService = require("./factoryStorefrontService");

module.exports = {
  listPublicFactorySections: factoryStorefrontService.listPublicFactorySections,
  listPublicFactories: async () => {
    const sections = await factoryStorefrontService.listPublicFactorySections();
    return sections.flatMap((section) => section.factories);
  },
};
