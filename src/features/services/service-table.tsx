export type ServiceRow = {
  id?: number;
  name: string;
  price: string;
  notes: string;
};

export type ServiceSection = {
  id: number;
  title: string;
  rows: ServiceRow[];
};

type ServiceTableProps = {
  title: string;
  rows: ServiceRow[];
};

export function ServiceTable({ title, rows }: ServiceTableProps) {
  return (
    <section className="rounded-xl bg-white p-4">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Прайс пока пуст.</p>
      ) : (
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
                <tr key={row.id ?? row.name}>
                  <td className="px-2 py-2 align-top sm:px-3">{row.name}</td>
                  <td className="whitespace-nowrap px-2 py-2 align-top font-medium sm:px-3">
                    {row.price}
                  </td>
                  <td className="px-2 py-2 align-top whitespace-normal break-words sm:px-3">
                    {row.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
