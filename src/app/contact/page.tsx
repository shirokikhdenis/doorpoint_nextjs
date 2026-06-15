import type { Metadata } from "next";
import { SiteSocialLinks } from "@/features/store/site-social-links";
import {
  SITE_ADDRESS,
  SITE_EMAIL,
  SITE_HOURS,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_TEL,
} from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Контакты — Салон дверей",
  description: "Адрес салона, телефон, e-mail и режим работы",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Контакты</h1>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-semibold">Салон дверей</h2>
          <dl className="mt-4 space-y-3 text-sm text-zinc-700">
            <div>
              <dt className="font-medium text-zinc-900">Адрес</dt>
              <dd>{SITE_ADDRESS}</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900">Телефон</dt>
              <dd>
                <a className="hover:underline" href={`tel:${SITE_PHONE_TEL}`}>
                  {SITE_PHONE_DISPLAY}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900">E-mail</dt>
              <dd>
                <a className="hover:underline" href={`mailto:${SITE_EMAIL}`}>
                  {SITE_EMAIL}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900">Режим работы</dt>
              <dd>{SITE_HOURS}</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900">Мессенджеры и соцсети</dt>
              <dd className="mt-2">
                <SiteSocialLinks variant="light" />
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl bg-white p-3">
          <h2 className="px-3 pb-3 text-xl font-semibold">Мы на карте</h2>
          <div className="overflow-hidden rounded-lg">
            <iframe
              title="Карта салона"
              src="https://yandex.ru/map-widget/v1/?text=%D0%90%D1%80%D1%85%D0%B0%D0%BD%D0%B3%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%2C%20%D0%9C%D0%BE%D1%81%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82%2025&z=16"
              className="h-[300px] w-full sm:h-[360px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
