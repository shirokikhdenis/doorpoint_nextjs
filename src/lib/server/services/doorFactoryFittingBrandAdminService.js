const doorFactoryFittingBrandRepository = require("../repositories/doorFactoryFittingBrandRepository");
const { buildAdminRows, normalizeSaveItems } = require("../domain/doorFactoryFittingBrands");

const listAdminDoorFactoryFittingBrands = async () => {
  const [doorManufacturers, fittingsManufacturers, mappings] = await Promise.all([
    doorFactoryFittingBrandRepository.listDoorManufacturers(),
    doorFactoryFittingBrandRepository.listFittingsManufacturers(),
    doorFactoryFittingBrandRepository.listMappings(),
  ]);

  return {
    ok: true,
    doorManufacturers,
    fittingsManufacturers,
    rows: buildAdminRows({ doorManufacturers, mappings }),
  };
};

const saveAdminDoorFactoryFittingBrands = async (body) => {
  const [doorManufacturers, fittingsManufacturers] = await Promise.all([
    doorFactoryFittingBrandRepository.listDoorManufacturers(),
    doorFactoryFittingBrandRepository.listFittingsManufacturers(),
  ]);

  const items = normalizeSaveItems({
    items: body?.items,
    doorManufacturers,
    fittingsManufacturers,
  });

  await doorFactoryFittingBrandRepository.replaceAll(items);
  const listed = await listAdminDoorFactoryFittingBrands();
  return { ok: true, ...listed };
};

module.exports = {
  listAdminDoorFactoryFittingBrands,
  saveAdminDoorFactoryFittingBrands,
};
