import Image from "next/image";
import Link from "next/link";
import { SiteSocialLinks } from "@/features/store/site-social-links";
import { storefrontHeaderTripleGridClass } from "@/features/store/storefront-ui";
import {
  SITE_ADDRESS_SHORT,
  SITE_EMAIL,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_TEL,
} from "@/lib/site-contact";

const contactLinkClass =
  "font-medium text-zinc-900 transition hover:text-brand hover:underline";

export function AppTopBar() {
  return (
    <div className="bg-white print:hidden">
      <div className="mx-auto w-full max-w-[1920px] px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
        <div
          className={`grid items-center gap-4 lg:gap-8 lg:grid ${storefrontHeaderTripleGridClass}`}
        >
          <div className="order-2 space-y-2 text-center lg:order-1 lg:text-left">
            <p className="text-xs leading-snug text-zinc-500 sm:text-sm">{SITE_ADDRESS_SHORT}</p>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:justify-start">
              <a href={`tel:${SITE_PHONE_TEL}`} className={`text-sm ${contactLinkClass}`}>
                {SITE_PHONE_DISPLAY}
              </a>
              <span className="text-zinc-300" aria-hidden="true">
                ·
              </span>
              <a
                href={`mailto:${SITE_EMAIL}`}
                className={`text-xs sm:text-sm ${contactLinkClass}`}
              >
                {SITE_EMAIL}
              </a>
            </div>
            <div className="flex justify-center lg:justify-start">
              <SiteSocialLinks variant="header" />
            </div>
          </div>

          <div className="order-1 flex justify-center lg:order-2">
            <Link
              href="/"
              className="inline-flex rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              aria-label="На главную"
            >
              <Image
                src="/uploads/Logo-01.png"
                alt=""
                width={220}
                height={62}
                className="h-14 w-auto max-w-[min(100%,12.5rem)] object-contain sm:h-16 sm:max-w-[14rem]"
                priority
              />
            </Link>
          </div>

          <p className="order-3 hidden min-w-0 text-right text-sm leading-snug text-zinc-600 lg:block">
            Входные и межкомнатные двери под ключ в Архангельске, Новодвинске и Северодвинске
          </p>
        </div>
      </div>
    </div>
  );
}
