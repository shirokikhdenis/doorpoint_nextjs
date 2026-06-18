import type { Metadata } from "next";
import { SiteSocialLinks } from "@/features/store/site-social-links";
import { LocalBusinessJsonLd } from "@/features/store/local-business-json-ld";
import { TrackedPhoneLink } from "@/features/store/tracked-phone-link";
import {
  SITE_ADDRESS,
  SITE_EMAIL,
  SITE_HOURS,
  SITE_PHONE_DISPLAY,
} from "@/lib/site-contact";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";
import { SEO_COPY } from "@/lib/seo-copy";

export const metadata: Metadata = {
  title: SEO_COPY.contact.title,
  description: SEO_COPY.contact.description,
  alternates: {
    canonical: absoluteUrl("/contact"),
  },
  openGraph: {
    ...defaultOpenGraph(),
    title: SEO_COPY.contact.title,
    description: SEO_COPY.contact.description,
    url: absoluteUrl("/contact"),
  },
};

export default function ContactPage() {
  return (
    <>
      <LocalBusinessJsonLd />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Контакты</h1>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-semibold">Салон дверей</h2>
          <dl className="mt-4 space-y-3 text-sm text-zinc-700">
            <div>
              <dt className="font-medium text-zinc-900">Адрес:</dt>
              <dd>{SITE_ADDRESS}</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900">Телефон:</dt>
              <dd>
                <TrackedPhoneLink className="hover:underline">
                  {SITE_PHONE_DISPLAY}
                </TrackedPhoneLink>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900">E-mail:</dt>
              <dd>
                <a className="hover:underline" href={`mailto:${SITE_EMAIL}`}>
                  {SITE_EMAIL}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900">Режим работы:</dt>
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
              src="https://yandex.ru/map-widget/v1/?z=12&ol=biz&oid=51203620234"
              className="h-[300px] w-full sm:h-[360px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      </div>
    </main>
    </>
  );
}
