const installationInteriorRows = [
  { service: "Установка коробки и полотна", price: "от 3 500 ₽", notes: "Без доборов и фурнитуры" },
  { service: "Врезка замка и ручки", price: "от 1 200 ₽", notes: "За комплект" },
  { service: "Монтаж доборов и наличников", price: "от 1 800 ₽", notes: "За дверной проем" },
];

const installationEntranceRows = [
  { service: "Демонтаж старой двери", price: "от 1 500 ₽", notes: "По согласованию" },
  { service: "Установка входной двери", price: "от 4 500 ₽", notes: "С выравниванием по уровню" },
  { service: "Запенивание и герметизация швов", price: "от 900 ₽", notes: "Материалы включены" },
];

const deliveryRows = [
  { service: "Доставка по Архангельску", price: "от 1 000 ₽", notes: "До подъезда" },
  { service: "Подъем на этаж", price: "от 300 ₽", notes: "За этаж, без лифта" },
  { service: "Вывоз упаковки", price: "от 500 ₽", notes: "По предварительной заявке" },
];

type Row = { service: string; price: string; notes: string };

function ServiceTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="rounded-xl bg-white p-4">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full table-auto text-[13px] leading-tight sm:text-sm md:table-fixed">
          <thead>
            <tr className="bg-zinc-100 text-left">
              <th className="w-[45%] px-2 py-2 sm:px-3">Услуга</th>
              <th className="w-[22%] px-2 py-2 sm:px-3">Цена</th>
              <th className="w-[33%] px-2 py-2 sm:px-3">Примечание</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {rows.map((row) => (
              <tr key={row.service}>
                <td className="px-2 py-2 align-top sm:px-3">{row.service}</td>
                <td className="whitespace-nowrap px-2 py-2 align-top font-medium sm:px-3">{row.price}</td>
                <td className="px-2 py-2 align-top whitespace-normal break-words sm:px-3">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function UslugiPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Услуги</h1>
      <ServiceTable title="Монтаж межкомнатных дверей" rows={installationInteriorRows} />
      <ServiceTable title="Монтаж входных дверей" rows={installationEntranceRows} />
      <ServiceTable title="Доставка" rows={deliveryRows} />
    </main>
  );
}
