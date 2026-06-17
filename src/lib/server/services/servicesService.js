const servicesRepository = require("../repositories/servicesRepository");

const listPublicServices = async () => {
  const sections = await servicesRepository.listSections();
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    sortOrder: section.sortOrder,
    rows: section.rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      notes: row.notes,
      sortOrder: row.sortOrder,
    })),
  }));
};

const listAdminServices = () => servicesRepository.listSections();

const createSection = async (payload) =>
  servicesRepository.createSection({
    title: payload.title,
    sortOrder: payload.sortOrder,
  });

const updateSection = async (id, payload) =>
  servicesRepository.updateSection(id, {
    title: payload.title,
    sortOrder: payload.sortOrder,
  });

const deleteSection = async (id) => servicesRepository.deleteSection(id);

const createRow = async (sectionId, payload) =>
  servicesRepository.createRow({
    sectionId,
    name: payload.name,
    price: payload.price,
    notes: payload.notes,
    sortOrder: payload.sortOrder,
  });

const updateRow = async (id, payload) =>
  servicesRepository.updateRow(id, {
    name: payload.name,
    price: payload.price,
    notes: payload.notes,
    sortOrder: payload.sortOrder,
  });

const deleteRow = async (id) => servicesRepository.deleteRow(id);

module.exports = {
  listPublicServices,
  listAdminServices,
  createSection,
  updateSection,
  deleteSection,
  createRow,
  updateRow,
  deleteRow,
};
