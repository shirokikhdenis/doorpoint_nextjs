import type { Metadata } from "next";
import Link from "next/link";
import { SITE_EMAIL } from "@/lib/site-contact";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";
import { SEO_COPY } from "@/lib/seo-copy";

export const metadata: Metadata = {
  title: SEO_COPY.privacy.title,
  description: SEO_COPY.privacy.description,
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: absoluteUrl("/privacy"),
  },
  openGraph: {
    ...defaultOpenGraph(),
    title: SEO_COPY.privacy.title,
    description: SEO_COPY.privacy.description,
    url: absoluteUrl("/privacy"),
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Политика конфиденциальности</h1>
      <div className="prose prose-zinc mt-6 max-w-none text-sm leading-relaxed text-zinc-700">
        <p>
          Настоящая политика определяет порядок обработки и защиты персональных данных
          пользователей сайта салона дверей «Дверная Точка» (далее — Оператор).
        </p>

        <h2 className="mt-6 text-lg font-semibold text-zinc-900">1. Оператор</h2>
        <p>
          ИП Широких Денис Сергеевич, ИНН 290109641301. Контакт для обращений по персональным
          данным:{" "}
          <a href={`mailto:${SITE_EMAIL}`} className="text-brand hover:underline">
            {SITE_EMAIL}
          </a>
          .
        </p>

        <h2 className="mt-6 text-lg font-semibold text-zinc-900">2. Какие данные собираем</h2>
        <p>
          При заполнении форм на сайте (заявка на замер, заявка из корзины) мы можем получить:
          имя, номер телефона, комментарий к заявке, сведения о выбранных товарах.
        </p>
        <p>
          Технические данные (IP-адрес, cookie, данные браузера) могут обрабатываться системами
          веб-аналитики (Яндекс Метрика) для улучшения работы сайта.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-zinc-900">3. Цели обработки</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>обратная связь и консультация по заказу;</li>
          <li>расчёт стоимости, замер и организация доставки/монтажа;</li>
          <li>улучшение качества сервиса и сайта.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-zinc-900">4. Правовые основания</h2>
        <p>
          Обработка осуществляется на основании согласия пользователя, выраженного при отправке
          формы, а также в случаях, предусмотренных законодательством РФ.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-zinc-900">5. Передача третьим лицам</h2>
        <p>
          Данные не передаются третьим лицам, за исключением случаев, необходимых для исполнения
          заказа (доставка, монтаж) или требуемых законом.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-zinc-900">6. Срок хранения</h2>
        <p>
          Персональные данные хранятся не дольше, чем это необходимо для целей обработки, либо
          до отзыва согласия, если иное не установлено законом.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-zinc-900">7. Права пользователя</h2>
        <p>
          Вы вправе запросить уточнение, блокирование или удаление персональных данных, отозвать
          согласие, направив обращение на{" "}
          <a href={`mailto:${SITE_EMAIL}`} className="text-brand hover:underline">
            {SITE_EMAIL}
          </a>
          .
        </p>

        <h2 className="mt-6 text-lg font-semibold text-zinc-900">8. Защита данных</h2>
        <p>
          Оператор принимает необходимые организационные и технические меры для защиты
          персональных данных от неправомерного доступа и распространения.
        </p>

        <p className="mt-8 text-xs text-zinc-500">Дата публикации: 9 июня 2026 г.</p>
        <p className="mt-4">
          <Link href="/" className="text-brand hover:underline">
            На главную
          </Link>
        </p>
      </div>
    </main>
  );
}
