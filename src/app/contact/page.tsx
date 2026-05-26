export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      <h1 className="text-3xl font-semibold">Контакты</h1>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-6">
          <h2 className="text-xl font-semibold">Салон дверей</h2>
          <dl className="mt-4 space-y-3 text-sm text-zinc-700">
            <div>
              <dt className="font-medium text-zinc-900">Адрес</dt>
              <dd>Архангельск, ТЦ Новосёл, пр. Московский, д. 25, к. 4, стр. 1, 1 этаж, направо до конца</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900">Телефон</dt>
              <dd>
                <a className="hover:underline" href="tel:+79000000000">
                  +7 (921) 290-59-99
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900">E-mail</dt>
              <dd>
                <a className="hover:underline" href="mailto:info@example.local">
                  doorpoint29@yandex.ru
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-900">Режим работы</dt>
              <dd>Пн-Пт: 11:00-19:00, Сб-Вс: 11:00-17:00</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl bg-white p-3">
          <h2 className="px-3 pb-3 text-xl font-semibold">Мы на карте</h2>
          <div className="overflow-hidden rounded-lg">
            <iframe
              title="Карта салона"
              src="https://yandex.ru/map-widget/v1/?text=%D0%90%D1%80%D1%85%D0%B0%D0%BD%D0%B3%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%2C%20%D0%9C%D0%BE%D1%81%D0%BA%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82%2025&z=16"
              className="h-[360px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
