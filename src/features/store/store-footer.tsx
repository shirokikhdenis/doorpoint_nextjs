import Link from "next/link";

/**
 * Макет футера витрины: контакты, соцсети, типовые колонки — тексты и href заглушки.
 */
export function StoreFooter() {
  return (
    <footer
      className="border-t border-zinc-200 bg-zinc-900 text-zinc-100 print:hidden"
      aria-label="Подвал сайта"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Салон дверей</p>
            <p className="text-sm leading-relaxed text-zinc-300">
              Входные и межкомнатные двери в Архангельске. Подбор, доставка и монтаж — макетный текст для
              вёрстки блока.
            </p>
            <p className="text-xs text-zinc-500">Реквизиты и юр. информация — появятся на проде.</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Покупателям</h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              <li>
                <Link href="/catalog" className="hover:text-white hover:underline">
                  Каталог
                </Link>
              </li>
              <li>
                <span className="text-zinc-500">Доставка и монтаж</span>
                <span className="ml-1 text-xs text-zinc-600">(макет)</span>
              </li>
              <li>
                <span className="text-zinc-500">Оплата и рассрочка</span>
                <span className="ml-1 text-xs text-zinc-600">(макет)</span>
              </li>
              <li>
                <span className="text-zinc-500">Гарантия</span>
                <span className="ml-1 text-xs text-zinc-600">(макет)</span>
              </li>
              <li>
                <Link href="/cart" className="hover:text-white hover:underline">
                  Корзина
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Контакты</h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              <li>
                <span className="block text-xs text-zinc-500">Телефон</span>
                <a href="tel:+78000000000" className="font-medium text-white hover:underline">
                  +7 (800) 000-00-00
                </a>
                <span className="ml-1 text-xs text-zinc-600">макет</span>
              </li>
              <li>
                <span className="block text-xs text-zinc-500">Email</span>
                <a href="mailto:shop@example.com" className="hover:text-white hover:underline">
                  shop@example.com
                </a>
              </li>
              <li>
                <span className="block text-xs text-zinc-500">Адрес шоурума</span>
                <span>г. Архангельск, ул. Примерная, д. 1</span>
                <span className="ml-1 text-xs text-zinc-600">макет</span>
              </li>
              <li>
                <span className="block text-xs text-zinc-500">Режим</span>
                <span>Пн–Сб 10:00–19:00</span>
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-white">Соцсети</h2>
              <p className="mt-2 text-xs text-zinc-500">Ссылки-заглушки для вёрстки.</p>
              <ul className="mt-4 flex flex-wrap gap-3">
                <SocialPlaceholder label="ВКонтакте" />
                <SocialPlaceholder label="Telegram" />
                <SocialPlaceholder label="WhatsApp" />
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Принимаем к оплате</h2>
              <p className="mt-2 text-xs text-zinc-400">
                Мир · Visa · Mastercard · наличные — блок-макет, без реальных виджетов.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-zinc-800 pt-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Салон дверей. Все права защищены. Макет.</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span className="cursor-default hover:text-zinc-400">Политика конфиденциальности</span>
            <span className="cursor-default hover:text-zinc-400">Пользовательское соглашение</span>
            <span className="cursor-default hover:text-zinc-400">Реквизиты</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialPlaceholder({ label }: { label: string }) {
  return (
    <li>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-400 hover:text-white"
        aria-label={`${label} (макет, ссылка не настроена)`}
      >
        {label}
      </button>
    </li>
  );
}
