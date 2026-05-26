import Image from "next/image";
import Link from "next/link";

export function AppTopBar() {
  return (
    <div className="border-b border-zinc-200 bg-white print:hidden">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-2 px-4 py-3 md:h-[100px] md:grid-cols-3 md:gap-4 md:py-0">
        <div className="order-1 flex justify-center md:order-2">
          <Link
            href="/catalog"
            className="inline-flex rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
            aria-label="На главную"
          >
            <Image
              src="/uploads/Logo-01.png"
              alt=""
              width={200}
              height={56}
              className="h-14 w-auto max-w-[min(100%,12rem)] object-contain"
              priority
            />
          </Link>
        </div>
        <p className="order-2 text-center text-xs leading-snug text-zinc-700 md:order-1 md:text-left md:text-sm">
          Архангельск, ТЦ Новосёл, пр. Московский, д. 25, к. 4, стр. 1
        </p>
        <p className="order-3 text-center text-xs leading-snug text-zinc-700 md:text-right md:text-sm">
          Входные и межкомнатные двери под ключ в Архангельске, Новодвинске, Северодвинске
        </p>
      </div>
    </div>
  );
}
