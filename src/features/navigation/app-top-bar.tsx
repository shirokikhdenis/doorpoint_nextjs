import Image from "next/image";
import Link from "next/link";

export function AppTopBar() {
  return (
    <div className="h-[100px] border-b border-zinc-200 bg-white">
      <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-3 items-center gap-4 px-4">
        <p className="text-left text-sm text-zinc-700">Архангельск, ТЦ Новосёл, пр. Московский, д. 25, к. 4, стр. 1</p>
        <div className="flex justify-center">
          <Link
            href="/"
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
        <p className="text-right text-sm text-zinc-700">
          Входные и межкомнатные двери под ключ в Архангельске, Новодвинске, Северодвинске
        </p>
      </div>
    </div>
  );
}
