export type InstallBrigade = {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
};

export type CalendarEntryKind = "install" | "delivery";

export type InteriorInstallation = {
  id: number;
  kind: CalendarEntryKind;
  installDate: string;
  installEndDate: string;
  leadId: number | null;
  orderNumber: string;
  doorsSummary: string;
  specification: string;
  brigadeId: number | null;
  doorsOnSite: boolean;
  customerName: string;
  phone: string;
  address: string;
  notes: string;
  brigadeName: string;
  brigadeColor: string;
  brigadeIsActive: boolean;
};

export type LeadSearchHit = {
  id: number;
  customerName: string;
  phone: string;
  contractNumber: string;
  address?: string;
};

export type InstallFormState = {
  kind: CalendarEntryKind;
  installDate: string;
  installEndDate: string;
  leadId: number | null;
  leadLabel: string;
  orderNumber: string;
  doorsSummary: string;
  specification: string;
  brigadeId: string;
  doorsOnSite: boolean;
  customerName: string;
  phone: string;
  address: string;
  notes: string;
};

export const emptyInstallForm = (
  installDate = "",
  extras: Partial<InstallFormState> = {},
): InstallFormState => ({
  kind: extras.kind ?? "install",
  installDate,
  installEndDate: extras.installEndDate ?? installDate,
  leadId: null,
  leadLabel: "",
  orderNumber: "",
  doorsSummary: "",
  specification: "",
  brigadeId: "",
  doorsOnSite: false,
  customerName: "",
  phone: "",
  address: "",
  notes: "",
  ...extras,
});

export const formFromInstallation = (item: InteriorInstallation): InstallFormState => ({
  kind: item.kind === "delivery" ? "delivery" : "install",
  installDate: item.installDate,
  installEndDate: item.installEndDate || item.installDate,
  leadId: item.leadId,
  leadLabel: item.leadId
    ? [item.orderNumber, item.customerName].filter(Boolean).join(" · ")
    : "",
  orderNumber: item.orderNumber,
  doorsSummary: item.doorsSummary,
  specification: item.specification || "",
  brigadeId: item.brigadeId ? String(item.brigadeId) : "",
  doorsOnSite: item.doorsOnSite,
  customerName: item.customerName,
  phone: item.phone,
  address: item.address,
  notes: item.notes,
});
