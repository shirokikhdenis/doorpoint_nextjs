import Link from "next/link";
import { SiteSocialLinks } from "@/features/store/site-social-links";
import { TrackedPhoneLink } from "@/features/store/tracked-phone-link";
import {
  SITE_ADDRESS,
  SITE_EMAIL,
  SITE_HOURS,
  SITE_PHONE_DISPLAY,
} from "@/lib/site-contact";

const footerNavLinks = [
  { href: "/catalog", label: "Каталог" },
  { href: "/contact", label: "Контакты" },
  { href: "/uslugi", label: "Доставка и монтаж" },
  { href: "/portfolio", label: "Наши работы" },
  { href: "/cart", label: "Корзина" },
] as const;

export function StoreFooter() {
  return (
    <footer
      data-nosnippet
      className="border-t border-zinc-200 bg-zinc-900 text-zinc-100 print:hidden"
      aria-label="Подвал сайта"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Дверная Точка</p>
            <p className="text-sm leading-relaxed text-zinc-300">
              Входные и межкомнатные двери в Архангельске. Подбор, доставка и монтаж под ключ.
            </p>
            <div>
              <p className="text-xs text-zinc-500">Мессенджеры и соцсети</p>
              <div className="mt-3">
                <SiteSocialLinks variant="footer" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Разделы</h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              {footerNavLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} prefetch={false} className="hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Контакты</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              <li>
                <span className="block text-xs text-zinc-500">Телефон:</span>
                <TrackedPhoneLink className="font-medium text-white hover:underline">
                  {SITE_PHONE_DISPLAY}
                </TrackedPhoneLink>
              </li>
              <li>
                <span className="block text-xs text-zinc-500">E-mail:</span>
                <a href={`mailto:${SITE_EMAIL}`} className="hover:text-white hover:underline">
                  {SITE_EMAIL}
                </a>
              </li>
              <li>
                <span className="block text-xs text-zinc-500">Адрес:</span>
                <span>{SITE_ADDRESS}</span>
              </li>
              <li>
                <span className="block text-xs text-zinc-500">Режим работы:</span>
                <span>{SITE_HOURS}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-zinc-800 pt-8 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} ИП Широких Денис Сергеевич ИНН 290109641301</p>
          <p className="mt-2">
            <Link href="/privacy" prefetch={false} className="hover:text-zinc-300 hover:underline">
              Политика конфиденциальности
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
