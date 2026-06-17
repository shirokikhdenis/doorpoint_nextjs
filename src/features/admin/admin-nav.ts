export type AdminNavItem = {
  href: string;
  label: string;
  /** Exact match only (e.g. /admin dashboard) */
  exact?: boolean;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Работа",
    items: [{ href: "/admin/leads", label: "Заявки" }],
  },
  {
    label: "Каталог",
    items: [
      { href: "/admin/products", label: "Товары" },
      { href: "/admin/import", label: "Импорт CSV" },
    ],
  },
  {
    label: "Витрина",
    items: [
      { href: "/admin/catalog-pages", label: "Витрины каталога" },
      { href: "/admin/catalog-labels", label: "Ярлыки витрин" },
      { href: "/admin/promotions", label: "Акции на главной" },
    ],
  },
  {
    label: "Контент",
    items: [{ href: "/admin/portfolio", label: "Портфолио" }],
  },
  {
    label: "Структура",
    items: [
      { href: "/admin", label: "Категории", exact: true },
      { href: "/admin/attributes", label: "Атрибуты" },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Категории",
  "/admin/leads": "Заявки",
  "/admin/products": "Товары",
  "/admin/import": "Импорт CSV",
  "/admin/catalog-pages": "Витрины каталога",
  "/admin/catalog-labels": "Ярлыки витрин",
  "/admin/promotions": "Акции на главной",
  "/admin/portfolio": "Портфолио",
  "/admin/attributes": "Атрибуты",
};

export const isAdminNavItemActive = (item: AdminNavItem, pathname: string) => {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
};

export const getAdminPageTitle = (pathname: string): string => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/admin/leads/")) return "Заявка";
  return "Админка";
};

export const getAdminBreadcrumbs = (
  pathname: string,
): Array<{ href?: string; label: string }> => {
  const crumbs: Array<{ href?: string; label: string }> = [{ href: "/admin", label: "Админка" }];

  if (pathname === "/admin") return crumbs;

  if (pathname.startsWith("/admin/leads/")) {
    crumbs.push({ href: "/admin/leads", label: "Заявки" });
    crumbs.push({ label: "Детали" });
    return crumbs;
  }

  const title = getAdminPageTitle(pathname);
  if (title !== "Админка") {
    crumbs.push({ label: title });
  }
  return crumbs;
};
